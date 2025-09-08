// ADVERTENCIA CRÍTICA DE SEGURIDAD:
// La implementación de rate limiting y la obtención de la IP del cliente en el lado del cliente (este archivo)
// NO ES SEGURA para un entorno de producción. Un atacante puede fácilmente manipular o eludir este código.
// La implementación real y robusta de estas medidas de seguridad DEBE realizarse en el lado del servidor,
// preferiblemente utilizando Firebase Functions, donde se puede obtener la IP de forma fiable y la lógica
// no puede ser alterada por el cliente. Este código es solo para fines demostrativos de la estructura.



// Configuración de Rate Limiting (debería ser gestionada en el backend/Firebase Functions)
const rateLimitConfig = {
    booking: { maxAttempts: 3, windowMinutes: 15 },
    adminLogin: { maxAttempts: 5, windowMinutes: 30 },
    formSubmit: { maxAttempts: 10, windowMinutes: 60 },
    rutValidation: { maxAttempts: 20, windowMinutes: 5 }
};

// Simulación de obtención de IP (en producción, esto se obtiene del request del servidor)
function getClientIp() {
    // En un entorno real (Firebase Functions), la IP se obtendría de los headers del request.
    // Por ejemplo: event.ip en Cloud Functions.
    // Para el cliente, es difícil obtener la IP pública de forma fiable sin un servicio externo.
    // Usaremos un valor estático o una simulación para demostración.
    return sessionStorage.getItem('simulatedIp') || '192.168.1.1'; // Placeholder
}

// Función para registrar intentos y verificar rate limiting
async function checkAndRecordAttempt(attemptType, success = true, blockedReason = null) {
    const ipAddress = getClientIp();
    const config = rateLimitConfig[attemptType];

    if (!config) {
        console.warn(`Tipo de intento desconocido: ${attemptType}`);
        return false; // No aplicar rate limit si no está configurado
    }

    const rateLimitDocRef = db.collection('rateLimits').doc(ipAddress + '_' + attemptType);

    try {
        const doc = await rateLimitDocRef.get();
        let data = doc.exists ? doc.data() : {
            attemptCount: 0,
            firstAttempt: null,
            lastAttempt: null,
            blockedUntil: null
        };

        const now = firebase.firestore.Timestamp.now();

        // Si está bloqueado, verificar si el bloqueo ha expirado
        if (data.blockedUntil && data.blockedUntil.toDate() > now.toDate()) {
            logSecurityEvent(ipAddress, navigator.userAgent, attemptType, false, 'Bloqueado por rate limit');
            return true; // Todavía bloqueado
        }

        // Reiniciar si el bloqueo expiró o si es un nuevo período de ventana
        if (!data.firstAttempt || (now.toDate().getTime() - data.firstAttempt.toDate().getTime()) / (1000 * 60) > config.windowMinutes) {
            data.attemptCount = 0;
            data.firstAttempt = now;
            data.blockedUntil = null;
        }

        data.attemptCount++;
        data.lastAttempt = now;

        let isBlocked = false;
        let currentBlockedUntil = null;

        if (data.attemptCount > config.maxAttempts) {
            isBlocked = true;
            let blockDurationMinutes;
            // Lógica de escalamiento de bloqueo (simplificada)
            if (data.attemptCount === config.maxAttempts + 1) { // Primer bloqueo
                blockDurationMinutes = 15;
            } else if (data.attemptCount === config.maxAttempts + 2) { // Segundo bloqueo
                blockDurationMinutes = 60;
            } else if (data.attemptCount === config.maxAttempts + 3) { // Tercer bloqueo
                blockDurationMinutes = 24 * 60;
            } else { // Cuarto bloqueo y subsiguientes
                blockDurationMinutes = 7 * 24 * 60;
            }
            currentBlockedUntil = new Date(now.toDate().getTime() + blockDurationMinutes * 60 * 1000);
            data.blockedUntil = firebase.firestore.Timestamp.fromDate(currentBlockedUntil);
            blockedReason = blockedReason || `Exceso de intentos (${data.attemptCount}). Bloqueado por ${blockDurationMinutes} minutos.`;
        }

        await rateLimitDocRef.set(data, { merge: true });
        logSecurityEvent(ipAddress, navigator.userAgent, attemptType, success, blockedReason);

        return isBlocked;

    } catch (error) {
        console.error('Error en checkAndRecordAttempt:', error);
        logSecurityEvent(ipAddress, navigator.userAgent, attemptType, false, `Error interno de rate limit: ${error.message}`);
        return false; // No bloquear si hay un error en el sistema de rate limit
    }
}

// Función para registrar eventos de seguridad
async function logSecurityEvent(ipAddress, userAgent, attemptType, success, blockedReason = null) {
    try {
        await db.collection('securityLogs').add({
            ipAddress: ipAddress,
            userAgent: userAgent,
            attemptType: attemptType,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            success: success,
            blockedReason: blockedReason,
        });
    } catch (error) {
        console.error('Error al registrar evento de seguridad:', error);
    }
}

// Integración de Honeypot (la detección ya está en app.js, esto es para el log)
function handleHoneypotActivation() {
    const ipAddress = getClientIp();
    logSecurityEvent(ipAddress, navigator.userAgent, 'honeypot_activated', false, 'Campo honeypot rellenado');
}

// --- MANEJO DEL EVENTO DE VALIDACIÓN DEL RUT ---
document.addEventListener('DOMContentLoaded', () => {
    const rutInput = document.getElementById('rut');
    const patientData = document.getElementById('patient-data');
    const submitButton = document.getElementById('submit-button');

    if (rutInput && patientData && submitButton) {
        const fieldsToValidate = Array.from(patientData.querySelectorAll('input'));

        const checkFormValidity = () => {
            const isRutValid = validarRutChileno(rutInput.value);
            
            // Los otros campos solo son válidos si no están vacíos.
            const areOtherFieldsFilled = fieldsToValidate.every(input => input.value.trim() !== '');

            // El botón se activa solo si el RUT es válido y todos los demás campos están llenos.
            submitButton.disabled = !(isRutValid && areOtherFieldsFilled);
        };

        // Listener para el campo RUT
        rutInput.addEventListener('input', () => {
            const isRutValid = validarRutChileno(rutInput.value);
            patientData.disabled = !isRutValid; // Habilita o deshabilita los campos según la validez del RUT

            if (isRutValid) {
                rutInput.classList.remove('is-invalid');
                rutInput.classList.add('is-valid');
            } else {
                rutInput.classList.add('is-invalid');
                rutInput.classList.remove('is-valid');
            }
            
            // Cada vez que el RUT cambia, revisamos la validez de todo el formulario.
            checkFormValidity();
        });

        // Listeners para el resto de los campos del paciente.
        fieldsToValidate.forEach(input => {
            input.addEventListener('input', checkFormValidity);
        });
    }
});