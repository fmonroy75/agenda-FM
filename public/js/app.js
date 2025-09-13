document.addEventListener('DOMContentLoaded', async () => {
    const db = firebase.firestore();

    // Elementos del DOM
    const calendarElement = document.getElementById('calendar');
    const timeSlotsElement = document.getElementById('time-slots');
    const bookingForm = document.getElementById('booking-form');
    const loadingSpinner = document.getElementById('loading-spinner');
    const appContent = document.getElementById('app-content');
    const timeSelectionSection = document.getElementById('time-selection');
    const bookingFormSection = document.getElementById('booking-form-section');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const backToTimeBtn = document.getElementById('back-to-time');

    let settings = {};
    let bookedSlots = [];
    let currentDate = new Date();
    let selectedDate = null;
    let selectedTime = null;

    // --- INICIALIZACIÓN ---
    async function initializeApp() {
        showSpinner(true);
        try {
            settings = await fetchSettings();
            bookedSlots = await fetchBookedSlots();
            //console.log('settings:', settings); // <-- aquí
            renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
            updateProgressIndicator(1);
        } catch (error) {
            console.error("Error al inicializar la aplicación:", error);
            showErrorMessage("Error al cargar la configuración. No se puede mostrar el calendario.");
        } finally {
            showSpinner(false);
        }
    }

    // --- OBTENCIÓN DE DATOS ---
    async function fetchSettings() {
        const doc = await db.collection('settings').doc('systemSettings').get();
        if (!doc.exists) throw new Error("No se encontró el documento de configuración.");
        return doc.data();
    }

    async function fetchBookedSlots() {
        const snapshot = await db.collection('publicBookedSlots').get();
        return snapshot.docs.map(doc => doc.data().appointmentDate.toDate());
    }

    // --- MANEJO DE INDICADOR DE PROGRESO ---
    function updateProgressIndicator(step) {
        // Remover clase active de todos los pasos
        document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
            stepEl.classList.remove('active');
            if (index < step) {
                stepEl.classList.add('completed');
            }
        });
        
        // Activar el paso actual
        const currentStep = document.getElementById(`step-${step}`);
        if (currentStep) {
            currentStep.classList.add('active');
        }
    }

    // --- RENDERIZADO DEL UI ---
    function renderCalendar(year, month) {
        calendarElement.innerHTML = ''; // Limpiar calendario
        // Asegura que workingDays es un array
        const workingDays = Array.isArray(settings.workingDays) ? settings.workingDays : [];

        const monthName = new Date(year, month).toLocaleString('es-ES', { month: 'long' });
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center mb-4';
        header.innerHTML = `
            <button id="prev-month" class="btn btn-outline-primary">
                <i class="bi bi-chevron-left"></i>
            </button>
            <h4 class="text-capitalize mb-0">${monthName} ${year}</h4>
            <button id="next-month" class="btn btn-outline-primary">
                <i class="bi bi-chevron-right"></i>
            </button>
        `;
        calendarElement.appendChild(header);

        const daysGrid = document.createElement('div');
        daysGrid.className = 'd-grid gap-2';
        daysGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'text-center fw-bold text-muted py-2';
            dayHeader.textContent = day;
            daysGrid.appendChild(dayHeader);
        });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Días vacíos al inicio
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysGrid.appendChild(document.createElement('div'));
        }

        // Días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayBtn = document.createElement('button');
            dayBtn.className = 'btn btn-light calendar-day';
            dayBtn.textContent = day;
            const fullDate = new Date(year, month, day);
            const dayOfWeek = fullDate.toLocaleString('en-US', { weekday: 'long' });
            //console.log('workingDays:', workingDays, 'dayOfWeek:', dayOfWeek); // <-- agrega esto
            const isoDate = fullDate.toISOString().slice(0, 10);
            // Marcar día actual
            if (fullDate.toDateString() === new Date().toDateString()) {
                dayBtn.classList.add('today');
            }
            // Deshabilitar si no es día laboral o está bloqueado
            const isBlocked = (settings.blockedDates && settings.blockedDates.includes(isoDate));
            //if (settings.workingDays.includes(dayOfWeek) && fullDate >= new Date(new Date().toDateString()) && !isBlocked) {
            if (workingDays.includes(dayOfWeek) && fullDate >= new Date(new Date().toDateString()) && !isBlocked) {
                dayBtn.classList.remove('btn-light');
                dayBtn.classList.add('btn-outline-success');
                dayBtn.onclick = () => selectDate(fullDate);
                if (hasAvailableSlots(fullDate)) {
                    dayBtn.innerHTML += '<div class="availability-indicator"></div>';
                }
            } else {
                dayBtn.disabled = true;
                dayBtn.classList.add('disabled');
            }
            daysGrid.appendChild(dayBtn);
        }
        
        calendarElement.appendChild(daysGrid);

        // Event listeners para navegación del calendario
        document.getElementById('prev-month').onclick = () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        };
        
        document.getElementById('next-month').onclick = () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        };
    }

    function hasAvailableSlots(date) {
        const [startHour, startMinute] = settings.workingHours.start.split(':').map(Number);
        const [endHour, endMinute] = settings.workingHours.end.split(Number);
        const duration = settings.appointmentDuration;

        let currentTime = new Date(date);
        currentTime.setHours(startHour, startMinute, 0, 0);

        while (currentTime.getHours() < endHour || (currentTime.getHours() === endHour && currentTime.getMinutes() < endMinute)) {
            const slotTime = new Date(currentTime);
            const isBooked = bookedSlots.some(booked => booked.getTime() === slotTime.getTime());
            
            if (!isBooked && slotTime > new Date()) {
                return true;
            }
            
            currentTime.setMinutes(currentTime.getMinutes() + duration);
        }
        return false;
    }

    function renderTimeSlots(date) {
        timeSlotsElement.innerHTML = '';
        const [startHour, startMinute] = settings.workingHours.start.split(':').map(Number);
        const [endHour, endMinute] = settings.workingHours.end.split(':').map(Number);
        const duration = settings.appointmentDuration;
        let currentTime = new Date(date);
        currentTime.setHours(startHour, startMinute, 0, 0);
        let availableSlots = 0;
        while (currentTime.getHours() < endHour || (currentTime.getHours() === endHour && currentTime.getMinutes() < endMinute)) {
            const slotTime = new Date(currentTime);
            const timeString = slotTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const isBooked = bookedSlots.some(booked => booked.getTime() === slotTime.getTime());
            // Bloqueo por hora específica
            const isoDate = slotTime.toISOString().slice(0, 10);
            const hourString = slotTime.toTimeString().slice(0,5);
            const isBlockedHour = settings.blockedHours && settings.blockedHours.some(bh => bh.date === isoDate && bh.time === hourString);
            const slotBtn = document.createElement('button');
            slotBtn.className = 'btn time-slot';
            slotBtn.textContent = timeString;
            if (isBooked || slotTime < new Date() || isBlockedHour) {
                slotBtn.disabled = true;
                slotBtn.classList.add('btn-secondary');
                slotBtn.title = isBooked ? 'Horario ocupado' : (isBlockedHour ? 'Horario bloqueado' : 'Horario pasado');
            } else {
                slotBtn.classList.add('btn-outline-primary');
                slotBtn.onclick = () => selectTime(slotTime);
                availableSlots++;
            }
            timeSlotsElement.appendChild(slotBtn);
            currentTime.setMinutes(currentTime.getMinutes() + duration);
        }
        if (availableSlots === 0) {
            const noSlotsMsg = document.createElement('div');
            noSlotsMsg.className = 'text-center text-muted py-4';
            noSlotsMsg.innerHTML = `
                <i class="bi bi-clock text-muted" style="font-size: 2rem;"></i>
                <p class="mt-2 mb-0">No hay horarios disponibles para esta fecha</p>
            `;
            timeSlotsElement.appendChild(noSlotsMsg);
        }
        // Botón volver a selección de fecha
        let backBtn = document.getElementById('back-to-date');
        if (!backBtn) {
            backBtn = document.createElement('button');
            backBtn.id = 'back-to-date';
            backBtn.type = 'button';
            backBtn.className = 'btn btn-outline-secondary mt-3';
            backBtn.innerHTML = '<i class="bi bi-arrow-left me-1"></i> Volver a Selección de Fecha';
            backBtn.onclick = () => {
                showSection(document.getElementById('date-selection'));
                updateProgressIndicator(1);
                document.getElementById('date-selection').scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            timeSlotsElement.parentElement.appendChild(backBtn);
        }
    }

    // --- MANEJO DE EVENTOS ---
    function selectDate(date) {
        selectedDate = date;
        selectedDateDisplay.textContent = date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        renderTimeSlots(date);
        showSection(timeSelectionSection);
        updateProgressIndicator(2);
        
        // Scroll suave a la sección de horarios
        timeSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function selectTime(dateTime) {
        selectedTime = dateTime;
        bookingForm.dataset.selectedDate = dateTime.toISOString();
        showSection(bookingFormSection);
        updateProgressIndicator(3);
        
        // Scroll suave al formulario
        bookingFormSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        //console.log("Hora seleccionada:", dateTime);
    }

    function showSection(section) {
        // Ocultar todas las secciones
        document.querySelectorAll('.step-section').forEach(s => s.style.display = 'none');
        
        // Mostrar la sección seleccionada con animación
        section.style.display = 'block';
        section.classList.add('active');
    }

    // Botón volver
    if (backToTimeBtn) {
        backToTimeBtn.addEventListener('click', () => {
            showSection(timeSelectionSection);
            updateProgressIndicator(2);
            timeSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // --- MANEJO DEL FORMULARIO ---
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedDate || !selectedTime) {
            showErrorMessage("Por favor, selecciona una fecha y hora válida.");
            return;
        }

        const appointmentTimestamp = firebase.firestore.Timestamp.fromDate(selectedTime);
        const customerName = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const patientRut = document.getElementById('rut').value.trim();
        const description = document.getElementById('description').value.trim();
        const email = document.getElementById('email').value.trim();

        // Validaciones adicionales
        if (!customerName || !phone || !patientRut || !description || !email) {
            showErrorMessage("Por favor, completa todos los campos obligatorios.");
            return;
        }

        showSpinner(true);
        
        try {
            const batch = db.batch();
            const appointmentRef = db.collection('appointments').doc();
            
            batch.set(appointmentRef, {
                customerName, 
                phone, 
                patientRut, 
                email,
                description,
                appointmentDate: appointmentTimestamp,
                status: 'Agendado',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            const publicSlotRef = db.collection('publicBookedSlots').doc();
            batch.set(publicSlotRef, { appointmentDate: appointmentTimestamp });

            await batch.commit();
            
            // Mostrar modal de éxito
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
            
            // Recargar después de un delay
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } catch (error) {
            console.error("Error al agendar la cita: ", error);
            showErrorMessage("Hubo un error al agendar tu cita. Por favor, intenta nuevamente.");
        } finally {
            showSpinner(false);
        }
    });

    // --- FUNCIONES DE UTILIDAD ---
    function showSpinner(show) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
        appContent.style.display = show ? 'none' : 'block';
    }

    function showErrorMessage(message) {
        const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
        document.getElementById('error-message-text').textContent = message;
        errorModal.show();
    }

    // --- VALIDACIONES EN TIEMPO REAL ---
    function setupFormValidations() {
        const rutInput = document.getElementById('rut');
        const customerNameInput = document.getElementById('customerName');
        const descriptionInput = document.getElementById('description');
        const phoneInput = document.getElementById('phone');
        const emailInput = document.getElementById('email');
        const submitButton = document.getElementById('submit-button');

        if (rutInput && customerNameInput && descriptionInput && phoneInput && emailInput && submitButton) {
            const validateForm = () => {
                const isRutValid = validarRutChileno(rutInput.value);
                const isNameValid = customerNameInput.value.trim().length > 0;
                const isdescriptionValid = descriptionInput.value.trim().length > 0;
                const isPhoneValid = phoneInput.value.trim().length > 0;
                const isEmailValid = emailInput.value.trim().length > 0 && isValidEmail(emailInput.value);
                
                submitButton.disabled = !(isRutValid && isNameValid && isdescriptionValid && isPhoneValid && isEmailValid);
            };

            // Validar RUT
            rutInput.addEventListener('input', () => {
                const isValid = validarRutChileno(rutInput.value);
                rutInput.classList.toggle('is-valid', isValid);
                rutInput.classList.toggle('is-invalid', !isValid);
                validateForm();
            });

            // Validar otros campos
            [customerNameInput, phoneInput, emailInput].forEach(input => {
                input.addEventListener('input', validateForm);
            });
        }
    }

    // --- INICIAR LA APP ---
    initializeApp();
    setupFormValidations();
});