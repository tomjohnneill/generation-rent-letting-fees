import firebase from "firebase/app";
import 'firebase/auth';
import "firebase/firestore";
import "firebase/functions"

var config = {
  apiKey: "AIzaSyA5uwA5Ve2mY7SiQxQZvFxm14Q_Xmr5KiA",
  authDomain: "generation-rent-fees-checker.firebaseapp.com",
  databaseURL: "https://generation-rent-fees-checker.firebaseio.com",
  projectId: "generation-rent-fees-checker",
  storageBucket: "generation-rent-fees-checker.appspot.com",
  messagingSenderId: "133738952572"
};

export default firebase.initializeApp(config);
