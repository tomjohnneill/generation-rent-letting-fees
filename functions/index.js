const functions = require('firebase-functions');
const fetch = require('node-fetch')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.wrapCors = functions.region('europe-west1').https.onCall((data, context) => {
  if (data.headers) {
    return fetch(data.url, {
      method: data.method,
      headers: data.headers
    })
    .then(response => response.json())
    .then(data => data)
  } else {
    return fetch(data.url)
    .then(response => response.json())
    .then(data => data)
  }

})

exports.getHTML = functions.region('europe-west1').https.onCall((data, context) => {
  return fetch(data.url)
    .then(response => response.text())
    .then(data => data)
})
