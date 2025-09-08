// Paso 1: Configura aquí tus credenciales de Firebase
// Obtén este objeto desde la consola de Firebase: 
// Configuración del proyecto > Tus apps > App web > Configuración
// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUyKUdo7Tdvpc2ShKIreUooEMLHsum2vQ",
  authDomain: "agenda-4c291.firebaseapp.com",
  projectId: "agenda-4c291",
  storageBucket: "agenda-4c291.firebasestorage.app",
  messagingSenderId: "472732991565",
  appId: "1:472732991565:web:b42ac9c6048fdc01b89c04"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
//firebase.initializeApp(firebaseConfig);

// Exportar instancias de los servicios de Firebase para usarlas en otros scripts
const db = firebase.firestore();
const auth = firebase.auth();

// (Opcional) Habilitar la persistencia para que los datos se guarden offline
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    // Múltiples pestañas abiertas, la persistencia solo se puede habilitar en una.
    console.warn('La persistencia de Firestore falló: múltiples pestañas abiertas.');
  } else if (err.code == 'unimplemented') {
    // El navegador no soporta la persistencia.
    console.warn('La persistencia de Firestore no es soportada en este navegador.');
  }
});
