import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCpUP6xwDmGacJlZEBZ8GkYLUhxEMQI5mA",
    authDomain: "expense-59e81.firebaseapp.com",
    projectId: "expense-59e81",
    storageBucket: "expense-59e81.firebasestorage.app",
    messagingSenderId: "760044376645",
    appId: "1:760044376645:web:0e2463ea6efcfc8754892c",
    measurementId: "G-5VSG6VN8MP"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("Firebase initialized");
