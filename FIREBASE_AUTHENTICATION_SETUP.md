# Configuración de Firebase Authentication

Sigue estos pasos para habilitar Firebase Authentication en tu proyecto y permitir el inicio de sesión con Google, que es el método que usaremos en la aplicación.

## 1. Habilitar Firebase Authentication

1.  Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2.  Selecciona tu proyecto.
3.  En el menú de la izquierda, ve a la sección **Compilación** y haz clic en **Authentication**.
4.  Haz clic en el botón **Comenzar**.

## 2. Habilitar el Proveedor de Google

1.  Dentro de la sección de **Authentication**, ve a la pestaña **Sign-in method** (Método de inicio de sesión).
2.  En la lista de **Proveedores**, busca **Google** y haz clic en el icono del lápiz para editarlo.
3.  **Habilita** el proveedor.
4.  Selecciona un **correo electrónico de asistencia del proyecto**.
5.  Haz clic en **Guardar**.

## 3. (Opcional) Agregar Dominios Autorizados

Firebase Authentication solo permitirá redireccionamientos desde dominios autorizados por seguridad. Tu dominio de Firebase Hosting se agrega automáticamente, pero si planeas probar la aplicación localmente, debes agregar tu dominio local.

1.  En la sección de **Authentication**, ve a la pestaña **Settings** (Configuración).
2.  En la sección **Dominios autorizados**, haz clic en **Agregar dominio**.
3.  Ingresa `localhost` si estás usando `http://localhost` para probar.
4.  Haz clic en **Agregar**.

Con estos pasos, tu proyecto de Firebase estará listo para autenticar usuarios con sus cuentas de Google. La aplicación web que hemos actualizado ya contiene el código necesario para utilizar esta configuración.
