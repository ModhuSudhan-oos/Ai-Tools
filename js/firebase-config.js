// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAFIonE-mcnhxFPDSLFiiIs1-tURXqgGYE",
  authDomain: "modhusudhan-654e7.firebaseapp.com",
  projectId: "modhusudhan-654e7",
  storageBucket: "modhusudhan-654e7.firebasestorage.com", // Corrected storageBucket domain
  messagingSenderId: "221731458319",
  appId: "1:221731458319:web:127f4d6f18abf1451e027a",
  measurementId: "G-S8WE56VM8X"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics(); // Initialize analytics

// Expose these for other modules
export { app, auth, db, analytics };

// Increment site visits counter
db.collection('visits').doc('siteStats').update({
  count: firebase.firestore.FieldValue.increment(1)
}).catch(() => {
  // If document doesn't exist, create it
  db.collection('visits').doc('siteStats').set({
    count: 1
  });
});
