import React, { Component } from 'react';
import './App.css';
import 'antd/dist/antd.css';
import fire from './fire.js'
import { AutoComplete, Card, List, Alert, Form, Input, Icon, Button, InputNumber } from 'antd';

const cheerio = require('cheerio')
let db = fire.firestore()
var functions = fire.functions('europe-west1');
var debounce = require('debounce');

const BUILD_LEVEL = 'prod'
const SITE = 'https://generation-rent-fees-checker.firebaseapp.com'

const { TextArea } = Input;

var lettingGroupData = [
  {
    lat: 51.8959,
    lng: 0.8919,
    name: 'Colchester rental Group',
    address: '213 Lexden Road',
    email: 'rentingincolchester@gmail.com'
  },
  {
    lat: 51.5499,
    lng: -0.0981,
    name: 'Highbury rental group',
    address: 'Mildmay Road',
    email: 'rentinghighbury@gmail.com'
  }
]

class NormalLoginForm extends React.Component {
  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        console.log('Received values of form: ', values);

        if (values.email) {
          var docRef = db.collection("Complaints").doc()
          values.scenario = this.props.scenario
          values.details = this.props.selectedItem
          docRef.set({values})
          if (!this.props.listed) {
            db.collection("LettingAgents").doc().set({
              name: this.props.selectedItem[0],
              address: this.props.selectedItem[1]
            })
          }
          var url
          if (values.postcode) {
            if (BUILD_LEVEL === 'dev') {
              url = `http://localhost:3000?complaintId=${docRef.id}&postcode=${values.postcode}`
            } else {
              url = `${SITE}?complaintId=${docRef.id}&postcode=${values.postcode}`
            }
          } else {
            if (BUILD_LEVEL === 'dev') {
              url = `http://localhost:3000?complaintId=${docRef.id}`
            } else {
              url = `${SITE}?complaintId=${docRef.id}`
            }
          }
          var actionCodeSettings = {
            url: url,
            handleCodeInApp: true
          };

          fire.auth().sendSignInLinkToEmail(values.email, actionCodeSettings)
            .then(() => {
              window.localStorage.setItem('emailForSignIn', values.email);
              this.props.editParentState()
            })
            .catch(function(error) {
              // Some error occurred, you can inspect the code: error.code
            });
        }
      }
    });

  }

  render() {
    const { getFieldDecorator } = this.props.form;
    return (
      <Form style={{width: 400}} onSubmit={this.handleSubmit} className="login-form">
        <Form.Item

          >
          {getFieldDecorator('email', {
            rules: [{ required: true, message: 'Please input your email!' }],
          })(
            <Input prefix={<Icon type="mail" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Email" />
          )}
        </Form.Item>
        <Form.Item

          >
          {getFieldDecorator('complaint', {
            rules: [{ required: true, message: 'Please add a description of your complaint' }],
          })(
            <TextArea rows={4} prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Description of complaint" />
          )}
        </Form.Item>
        <Form.Item
          label='Amount charged (£)'
          >
          {getFieldDecorator('charge', {
            rules: [{ required: true, message: 'Please input your email!' }],
          })(
            <InputNumber prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="How much is being charged?" />
          )}
        </Form.Item>
        <Form.Item
          >
          {getFieldDecorator('purpose', {
            rules: [{ required: true, message: 'Please add a bit of information about the purpose of the charge' }],
          })(
            <Input  placeholder="For what purpose did they claim?" />
          )}
        </Form.Item>
        {
          this.props.scenario !== 'D' || this.props.scenario === 'C' ?
          <Form.Item

            >
            {getFieldDecorator('address', {
              rules: [{ required: true, message: 'Please add your address' }],
            })(
              <Input prefix={<Icon type="home" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Your address (if you're the tenant)" />
            )}
          </Form.Item>
          :
          null
        }
        {
          this.props.scenario !== 'A' ?
          <Form.Item

            >
            {getFieldDecorator('postcode', {
              rules: [{ required: false, message: 'Please add your postcode' }],
            })(
              <Input prefix={<Icon type="home" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Your postcode" />
            )}
          </Form.Item>
          :
          null
        }

        <Form.Item>

          <Button type="primary" htmlType="submit" className="login-form-button">
            Submit
          </Button>

        </Form.Item>
      </Form>
    );
  }
}

const WrappedNormalLoginForm = Form.create({ name: 'normal_login' })(NormalLoginForm);

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

class App extends Component {
  constructor(props) {
    super(props);

    const urlParams = new URLSearchParams(window.location.search);
    const myParam = urlParams.get('complaintId');
    console.log(myParam)
    const postcode = urlParams.get('postcode');

    if (postcode) {
      this.comparePostcodeToAgencies(postcode)
    }

    this.state = {dataSource: [], complaintId: myParam}
  }

  comparePostcodeToAgencies = (postcode) => {
    fetch(`https://api.postcodes.io/postcodes/${postcode}`)
          .then(response =>
            {if (response.status === 200) {
              return response.json()
            } else {
              console.log(response)
            }})
          .then(data => {
            if (data && data.result) {
              var close = []
              console.log('postcode', data.result)
              var center = {
                lat: data.result.latitude,
                lng: data.result.longitude
              }
              lettingGroupData.forEach((agency) => {
                if (getDistanceFromLatLonInKm(agency.lat, agency.lng, center.lat, center.lng) < 10) {
                  close.push(agency)
                }
              })
              console.log(close)
              this.setState({close: close})
            }
          })
  }

  componentDidMount(props) {
    if (this.state.complaintId) {
      if (fire.auth().isSignInWithEmailLink(window.location.href)) {
        // Additional state parameters can also be passed via URL.
        // This can be used to continue the user's intended action before triggering
        // the sign-in operation.
        // Get the email if available. This should be available if the user completes
        // the flow on the same device where they started it.
        var email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          // User opened the link on a different device. To prevent session fixation
          // attacks, ask the user to provide the associated email again. For example:
          email = window.prompt('Please provide your email for confirmation');
        }
        // The client SDK will parse the code from the link for you.
        fire.auth().signInWithEmailLink(email, window.location.href)
          .then((result) => {
            // Clear email from storage.
            window.localStorage.removeItem('emailForSignIn');
            db.collection("Complaints").doc(this.state.complaintId).get()
            .then((doc) => {
              var data = doc.data()
              this.setState({complaint: data})
            })
            // You can access the new user via result.user
            // Additional user info profile not available via:
            // result.additionalUserInfo.profile == null
            // You can check if the user is new or existing:
            // result.additionalUserInfo.isNewUser
          })
          .catch(function(error) {
            console.log(error)
            // Some error occurred, you can inspect the code: error.code
            // Common errors could be invalid email and invalid or expired OTPs.
          });
      }
    }
  }

  onSelect = (value) => {
    this.getAddressDetails(value)
  }

  handleSearch = (value) => {
    this.setState({searchValue: value})

    const getAutoCompleteData = (value) => {
      var wrapCors = functions.httpsCallable('wrapCors')
      wrapCors({
        url: `https://www.reputations.reviews/search/name/${value}?site_id=3`,
        method: 'GET'
      }).then((result) => {
        var rawnames = []
        result.data && result.data.forEach((obj) => {
          rawnames.push(obj.trading_name)
        })
        this.setState({
          dataSource: rawnames
        })
      })
    }

    debounce(getAutoCompleteData(value), 400)

  }

  getAddressDetails = (name) => {
    this.setState({formStage: false, formType: false, results: false})
    console.log(name)
    var getHTML = functions.httpsCallable('getHTML')
    getHTML({
      url: `https://www.reputations.reviews/searchfor/propertyombudsman/search?business_name=${name}`,
    }).then((result) => {
      console.log(result.data)

      var $ = cheerio.load(result.data)
      var list = [];

      $('#search_results_wrapper div.search_result').each(function(i, elm) {
        console.log(i)
        $(elm).children('p').each(function(j, pelem) {
          list[i] ? list[i].push($(pelem).text().trim()) : list[i] = [$(pelem).text().trim()]
        })
      })

      console.log(list)
      this.setState({results: list})


    })
  }



  handleClick = (item) => {
    console.log(item)
    this.setState({formType: true, selectedItem: item})
  }

  handleSubmit = (e) => {
      e.preventDefault();
      this.props.form.validateFields((err, values) => {
        if (!err) {
          console.log('Received values of form: ', values);
        }
      });
    }

  renderForm = (value) => {
    return <WrappedNormalLoginForm
      selectedItem={this.state.selectedItem}
      listed={!this.state.notListed}
      editParentState = {() => this.setState({emailSent: true})}
      scenario={value}/>
  }

  handleSelectAgency = (agency) => {
    var position = this.state.close.indexOf(agency)
    var existing = this.state.close
    var existingSelect = this.state.selectedAgencies ? this.state.selectedAgencies : []
    existingSelect.push(agency)
    existing.splice(position, 1)
    this.setState({selectedAgencies: existingSelect, close: existing})
  }

  render() {
    console.log(this.state)
    var userEmail
    console.log(fire.auth())
    if (fire.auth().currentUser) {
      userEmail = fire.auth().currentUser.email
      console.log(userEmail)
    }

    const { dataSource } = this.state;
    return (
      <div className="App" style={{textAlign: 'left', display: 'flex', justifyContent: 'center', alignItems: ''}}>
        <header className="App-header" style={{width: 600, top: 40, display: 'block', paddingTop: 50}}>
          {
            !this.state.complaintId?
            <div style={{width: '100%', marginBottom: 30}}>
              <p>Generation rent - search for your lettings agent
                </p>
              <AutoComplete
                size='large'
                dataSource={dataSource}
                style={{ width: 400 }}
                onSelect={this.onSelect}
                onSearch={this.handleSearch}
                placeholder="Search by name"
              />
            </div>
            :
            <div>
            <div style={{width: '100%'}}>
              {this.state.close && this.state.close.length > 0 ?
                <div>
                  Add a local renters group to the email
                <List
                  hoverable
                  itemLayout="horizontal"
                  dataSource={this.state.close}
                  renderItem={item => (
                    <List.Item
                      onClick={() => this.handleSelectAgency(item)}
                      style={{backgroundColor: 'white', padding: 10, cursor: 'pointer'}}>
                      <List.Item.Meta
                        style={{backgroundColor: 'white', padding: 10}}
                        title={item.name}
                        description={item.address}
                      />
                    </List.Item>
                  )}
                />
              </div>
              :
              null}
            </div>
            <Input disabled={true}
              addonBefore="To:"
              placeholder='council@emailaddress.com'/>
            <Input disabled={true}
              addonBefore="From:"
              placeholder='noreply@generationrent.com'/>
            {
              this.state.complaint && this.state.complaint.scenario !== 'A' ?
              <Input
                addonBefore="Cc:"
                disabled={true} placeholder={userEmail}/>
              :
              null
            }
              {this.state.selectedAgencies && this.state.selectedAgencies.map((agency) => (
                <Input
                  addonBefore="Cc:"
                  disabled={true} placeholder={agency.email}/>
              ))}
              <TextArea rows={10} placeholder='Complaint description'
                value={this.state.complaint && this.state.complaint.values.complaint}
                />
            <Button type='primary'>
              Send Email
            </Button>
            </div>

          }

        {
          this.state.emailSent ?

          <Alert
            style={{marginTop: 20}}
            message="Your report has been saved"
            description="We've sent you an email - please verify your email address and follow the instructions in the link"
            type="success"
            showIcon
          />
        :
        null
        }
        {
          this.state.formStage && !this.state.emailSent && this.renderForm(this.state.formStage)
        }

        {
          this.state.formType && !this.state.formStage ?
          <div>
            Pick form type
            <Card
              onClick={() => this.setState({formStage: this.state.notListed ? 'B' : 'A'})}
              hoverable
              >
              Make an anonymous report
            </Card>
            <Card
              onClick={() => this.setState({formStage: this.state.notListed ? 'D' : 'C'})}
              hoverable
              >
              Claim for illegal fees
            </Card>

          </div>
          :
          null
        }

        {
          this.state.results && !this.state.formStage && !this.state.formType ?
          <div style={{width: '100%'}}>
            <p style={{marginTop: 20}}>Which branch did you deal with?</p>
            <List
              hoverable
              itemLayout="horizontal"
              dataSource={this.state.results}
              renderItem={item => (
                <List.Item
                  onClick={() => this.handleClick(item)}
                  style={{backgroundColor: 'white', padding: 10, cursor: 'pointer'}}>
                  <List.Item.Meta
                    style={{backgroundColor: 'white', padding: 10}}
                    title={item[1]}
                    description={item[2]}
                  />
                </List.Item>
              )}
            />

          <div style={{color: 'rgba(0, 0, 0, 0.65)'}}>
            <p>Not there? - Add some details manually</p>
            <Input placeholder='Company Name' onChange={(e) => this.setState({companyName: e.target.value})}/>
            <Input placeholder='Address' onChange={(e) => this.setState({companyAddress: e.target.value})}/>
            <Button type='primary'
              onClick={() => this.setState({formType: true,
                notListed: true,
                selectedItem: [this.state.companyName, this.state.companyAddress]})}
              >Save</Button>
          </div>
          </div>
        :
        null
        }


        </header>
      </div>
    );
  }
}

export default App;
