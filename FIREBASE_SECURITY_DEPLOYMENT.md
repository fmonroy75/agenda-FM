# Despliegue de Reglas de Seguridad de Firestore

Las reglas de seguridad son esenciales para proteger los datos de tu aplicación. Este archivo describe la lógica detrás de las reglas definidas en `firestore.rules` y cómo desplegarlas.

## Lógica de las Reglas de Seguridad

Nuestras reglas están diseñadas para implementar un sistema de citas seguro separando datos públicos y privados.

### Colección `appointments` (Privada)

-   **Lectura (`read`)**: Un usuario solo puede leer los documentos de citas donde el `userId` del documento coincida con su propio `uid` de autenticación. Esto evita que un usuario vea las citas de otros.
    
    ```
    allow read: if request.auth.uid == resource.data.userId;
    ```

-   **Creación (`create`)**: Para crear una cita, se deben cumplir varias condiciones:
    1.  El usuario debe estar autenticado (`request.auth != null`).
    2.  El `userId` en el nuevo documento debe ser el del usuario que hace la solicitud.
    3.  Se valida que los campos (`customerName`, `appointmentDate`, etc.) existan y tengan el tipo de dato correcto.
    4.  Se aplica lógica de negocio: la fecha de la cita debe ser en el futuro.
    5.  No se permiten campos adicionales no definidos en la regla.

-   **Actualización y Borrado (`update`, `delete`)**: Solo el usuario que creó la cita puede modificarla o eliminarla.

    ```
    allow update, delete: if request.auth.uid == resource.data.userId;
    ```

### Colección `publicBookedSlots` (Pública)

-   **Lectura (`read`)**: Cualquiera (`if true`) puede leer esta colección. Esto es necesario para que la aplicación pueda mostrar los horarios no disponibles en el calendario a cualquier visitante, sea anónimo o no.

-   **Creación (`create`)**: Solo los usuarios autenticados pueden crear un documento en esta colección. Esto ocurre simultáneamente cuando crean una cita en la colección `appointments`.

-   **Actualización y Borrado (`update`, `delete`)**: Nadie (`if false`) puede modificar o borrar los registros de horarios ocupados. La gestión (por ejemplo, liberar un horario si se cancela la cita) debería manejarse con lógica del lado del servidor (Cloud Functions) para mantener la integridad, aunque en esta versión no se permite para simplificar.

## Cómo Desplegar las Reglas

Para aplicar estas reglas a tu base de datos de Firestore, necesitas tener instalado el **Firebase CLI**.

1.  **Inicia sesión en Firebase CLI** (si no lo has hecho):
    ```bash
    firebase login
    ```

2.  **Selecciona tu proyecto** (si tienes varios):
    ```bash
    firebase use TU_ID_DE_PROYECTO
    ```

3.  **Despliega las reglas**: Desde la raíz de tu proyecto (el directorio que contiene `firebase.json` y `firestore.rules`), ejecuta el siguiente comando:

    ```bash
    firebase deploy --only firestore:rules
    ```

Este comando leerá el archivo `firestore.rules` y lo subirá a tu proyecto de Firebase, aplicando las reglas de seguridad de forma inmediata.
