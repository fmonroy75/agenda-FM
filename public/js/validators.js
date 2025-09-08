/**
 * Valida un RUT chileno usando el algoritmo del Módulo 11.
 * @param {string} rut - El RUT a validar (ej. "12345678-9" o "123456789").
 * @returns {boolean} - True si el RUT es válido, false en caso contrario.
 */
function validarRutChileno(rut) {
    if (!rut || typeof rut !== 'string') {
        return false;
    }

    // Limpiar y normalizar el RUT
    const rutLimpio = rut.replace(/[^0-9kK.-]/g, '').replace(/\./g, '').replace('-', '').toUpperCase();
    
    if (rutLimpio.length < 2) {
        return false;
    }

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);

    if (!/^[0-9]+$/.test(cuerpo)) {
        return false;
    }

    // Calcular el dígito verificador esperado usando el algoritmo Módulo 11
    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    const dvEsperadoCalculado = 11 - (suma % 11);
    let dvEsperado;

    if (dvEsperadoCalculado === 11) {
        dvEsperado = '0';
    } else if (dvEsperadoCalculado === 10) {
        dvEsperado = 'K';
    } else {
        dvEsperado = String(dvEsperadoCalculado);
    }

    // Comparar el dígito verificador calculado con el proporcionado
    return dv === dvEsperado;
}

/**
 * Valida si una cadena es un email válido.
 * @param {string} email - El email a validar.
 * @returns {boolean} - True si el email es válido, false en caso contrario.
 */
function isValidEmail(email) {
    // Regex robusta para validación de email
    const emailRegex = new RegExp(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
    return emailRegex.test(String(email).toLowerCase());
}

/**
 * Valida si una cadena es un número de teléfono chileno válido (+56 9 xxxx xxxx).
 * @param {string} phone - El número de teléfono a validar.
 * @returns {boolean} - True si el teléfono es válido, false en caso contrario.
 */
function isValidPhone(phone) {
    // Regex para formato chileno +56 9 xxxx xxxx (o sin espacios)
    const phoneRegex = /^\+569[0-9]{8}$/;
    // Limpiar el teléfono para la validación (ej. eliminar espacios)
    const cleanedPhone = phone.replace(/\s/g, '');
    return phoneRegex.test(cleanedPhone);
}

/**
 * Verifica si una persona es mayor de una edad mínima.
 * @param {string} birthDateString - La fecha de nacimiento en formato YYYY-MM-DD.
 * @param {number} minAge - La edad mínima requerida.
 * @returns {boolean} - True si la persona es mayor o igual a la edad mínima, false en caso contrario.
 */
function isOldEnough(birthDateString, minAge = 18) {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= minAge;
}
