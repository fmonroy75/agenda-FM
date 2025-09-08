### 1. Crear el archivo `.firebaserc`

Primero, crea un archivo llamado `.firebaserc` en la **raíz de tu proyecto**. Este archivo es fundamental para que las herramientas de Firebase CLI sepan a qué proyecto conectarse.

Copia y pega el siguiente contenido dentro del archivo:

```json
{
  "projects": {
    "default": "<TU-ID-DE-PROYECTO>"
  }
}
```

> **Importante:** No olvides reemplazar `<TU-ID-DE-PROYECTO>` con el ID real de tu proyecto de Firebase.

---

### 2. Modificar el archivo de configuración de Firebase

A continuación, busca el archivo de configuración de Firebase (generalmente llamado `firebase.config.js` o similar) y reemplaza el objeto `firebaseConfig` con las credenciales de tu propia aplicación web de Firebase.

Puedes encontrar este objeto en la consola de Firebase, dentro de **Configuración del proyecto > Tus apps > App web > Configuración**.

```javascript
// Reemplaza este objeto con la configuración de tu propio proyecto de Firebase
const firebaseConfig = {
  apiKey: "<TU-API-KEY>",
  authDomain: "<TU-AUTH-DOMAIN>",
  projectId: "<TU-PROJECT-ID>",
  storageBucket: "<TU-STORAGE-BUCKET>",
  messagingSenderId: "<TU-MESSAGING-SENDER-ID>",
  appId: "<TU-APP-ID>",
  measurementId: "<TU-MEASUREMENT-ID>"
};
```
