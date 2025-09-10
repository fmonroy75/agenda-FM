# Guía Definitiva de la Base de Datos en Firestore

Este documento explica cómo tu aplicación guarda y organiza la información en Firebase, usando un modelo de **clientes anónimos** y un **administrador autenticado con Email/Contraseña**.

### El Modelo: Clientes vs. Administrador

1.  **El Cliente (o Paciente)**: Cualquier visitante de tu web. **No necesita iniciar sesión** para agendar una cita.
2.  **El Administrador (Tú)**: Para acceder al panel (`admin.html`), **debes iniciar sesión con un usuario (email y contraseña) que crearás previamente**. Tu identificador de usuario (UID) en Firebase te da permisos para gestionar **todas** las citas.

---

## Desglose Detallado de las Colecciones

Aquí se especifica qué información (campos) contiene un documento dentro de cada colección.

### 1. Colección `settings`

*   **ID del Documento**: **Personalizado y Fijo** systemSettings(ej: `global_config`).
*   **Propósito**: Contiene la configuración global de la agenda.

| Campo | Tipo de Dato | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `appointmentDuration` | Número | `30` | Duración de cada cita en minutos. |
| `workingDays` | Array (lista) | `["Monday", "Friday"]` | Los días de la semana en que se trabaja. |
| `workingHours` | Mapa (objeto) | `{start: "09:00", end: "18:00"}` | Hora de inicio y fin de la jornada. |
| `blockedDates` | Array (lista) | `["2025-12-25"]` | Fechas específicas no disponibles. |

appointmentDuration | 30 | (número)
blockedDates | (array)
  0  | "2025-09-18" | (cadena)
blockedHours | (array)
  0 | (mapa)
    date | "2025-09-08" | (cadena)
    time | "10:00" | (cadena)
updatedAt | 9 de septiembre de 2025, 9:00:00 a.m. UTC-4 | (marca de tiempo)
workingDays | (array)
  0 | "Monday" | (cadena)
  1 | "Tuesday" | (cadena)
  2 | "Wednesday" | (cadena)
  3 | "Thursday" | (cadena)
  4 | "Friday" | (cadena)
workingHours | (mapa)
  end | "18:00" | (cadena)
  start | "09:00" | (cadena)



### 2. Colección `appointments`

*   **ID del Documento**: **Automático**.
*   **Propósito**: Guarda los detalles completos y privados de cada cita.

| Campo | Tipo de Dato | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `appointmentDate` | Timestamp | `August 19, 2025 at 11:00:00 AM` | La fecha y hora exactas de la cita. |
| `status` | Cadena | `"scheduled"` | El estado actual de la cita. |
| `customerName` | Cadena | `"Francisco Colomer"` | Nombre completo del paciente. |
| `patientRut` | Cadena | `"13829630-k"` | RUT del paciente. |
| `email` | Cadena | `"email@email.com"` | Correo electrónico del paciente. |
| `phone` | Cadena | `"+56978098228"` | Teléfono de contacto del paciente. |
| `createdAt` | Timestamp | `August 18, 2025 at 4:53:40 PM` | Cuándo se creó el registro de la cita. |

### 3. Colección `publicBookedSlots`

*   **ID del Documento**: **Automático**.
*   **Propósito**: Muestra públicamente los horarios ocupados, sin datos sensibles.

| Campo | Tipo de Dato | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `appointmentDate` | Timestamp | `August 19, 2025 at 11:00:00 AM` | La misma fecha y hora que en la cita original. |

### 4. Colecciones de Seguridad (Uso Avanzado)

*   **ID de los Documentos**: **Automático**.
*   **Propósito**: Proteger la aplicación. Su gestión es a través de un backend (servidor), no desde la web directamente.

**Colección `securityLogs`**

| Campo | Tipo de Dato | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `ipAddress` | Cadena | `"192.168.0.1"` | IP desde donde se originó el evento. |
| `eventType` | Cadena | `"booking_attempt"` | Tipo de evento registrado. |
| `timestamp` | Timestamp | `August 18, 2025 at 12:00:00 AM` | Cuándo ocurrió el evento. |

**Colección `rateLimits`**

| Campo | Tipo de Dato | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `ipAddress` | Cadena | `"192.168.0.1"` | IP que se está limitando. |
| `attemptCount` | Número | `5` | Número de intentos realizados. |
| `blockedUntil` | Timestamp | `August 18, 2025 at 12:05:00 AM` | Hasta cuándo está bloqueada la acción. |

---

## ¡Paso Crítico! Configurar tu Usuario Administrador

(Esta sección no cambia, contiene los pasos para crear tu usuario y configurar tu UID).

### Paso 1: Habilitar Autenticación por Email/Contraseña

1.  Ve a la **Consola de Firebase** > **Authentication** > **Sign-in method**.
2.  Busca **Email/Contraseña** y habilítalo.

### Paso 2: Crear tu Usuario Administrador

1.  Ve a la pestaña **Users** y haz clic en **Add user**.
2.  Ingresa el **correo electrónico** y una **contraseña segura**.

### Paso 3: Configurar tu UID en las Reglas de Seguridad

1.  En la lista de usuarios, **Copia el UID** del usuario que creaste.
2.  Abre el archivo `firestore.rules`.
3.  Pega tu UID en la función `isAdmin()`:
    ```javascript
    function isAdmin() {
      return request.auth.uid == "TU_UID_AQUI";
    }
    ```
4.  Despliega las reglas: `firebase deploy --only firestore:rules`

---

## Anexo: Creación Manual de Colecciones

Si las colecciones no existen, puedes crearlas desde la **Consola de Firebase** > **Firestore Database** > **+ Iniciar colección**. Firestore te guiará para crear el primer documento de ejemplo.