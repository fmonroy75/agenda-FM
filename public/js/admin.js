document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    const loginView = document.getElementById('login-view');
    const adminLoginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-error');
    const loginErrorText = document.getElementById('login-error-text');
    const dashboardContent = document.getElementById('dashboard-content');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const appointmentsTableBody = document.getElementById('appointments-table-body');
    const noAppointmentsMessage = document.getElementById('no-appointments');
    const totalAppointments = document.getElementById('total-appointments');
    const searchInput = document.getElementById('search-appointments');
    const refreshBtn = document.getElementById('refresh-appointments');

    let allAppointments = [];
    let filteredAppointments = [];
    let sortField = 'appointmentDate';
    let sortDirection = 'desc';

    // 1. Escuchar cambios de autenticación
    auth.onAuthStateChanged(user => {
        if (user) {
            loginView.style.display = 'none';
            dashboardContent.style.display = 'block';
            userInfo.style.display = 'flex';
            userEmail.textContent = user.email;
            loadAllAppointments();
        } else {
            loginView.style.display = 'block';
            dashboardContent.style.display = 'none';
            userInfo.style.display = 'none';
        }
    });

    // 2. Iniciar sesión del administrador con Email y Contraseña
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = adminLoginForm['admin-email'].value;
        const password = adminLoginForm['admin-password'].value;

        // Mostrar estado de carga
        const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Iniciando sesión...';
        submitBtn.disabled = true;

        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                console.error("Error al iniciar sesión:", error.code, error.message);
                let errorMessage = "Error: Usuario o contraseña incorrectos.";
                
                switch(error.code) {
                    case 'auth/user-not-found':
                        errorMessage = "No se encontró una cuenta con este correo electrónico.";
                        break;
                    case 'auth/wrong-password':
                        errorMessage = "La contraseña ingresada es incorrecta.";
                        break;
                    case 'auth/invalid-email':
                        errorMessage = "El formato del correo electrónico no es válido.";
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "Demasiados intentos fallidos. Intenta nuevamente más tarde.";
                        break;
                }
                
                loginErrorText.textContent = errorMessage;
                loginError.style.display = 'block';
                
                // Ocultar error después de 5 segundos
                setTimeout(() => {
                    loginError.style.display = 'none';
                }, 5000);
            })
            .finally(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
    });

    // 3. Cerrar sesión
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // 4. Modales
    const editAppointmentModal = new bootstrap.Modal(document.getElementById('editAppointmentModal'));
    const cancelConfirmModal = new bootstrap.Modal(document.getElementById('cancelConfirmModal'));
    const saveChangesBtn = document.getElementById('save-changes-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

    let appointmentToCancel = null;

    // 5. Función para abrir modal de edición y cargar datos
    async function openEditModal(appointmentId) {
        const appointmentRef = db.collection('appointments').doc(appointmentId);
        try {
            const doc = await appointmentRef.get();
            if (!doc.exists) {
                showAdminAlert("Error: La cita no fue encontrada.", "danger");
                return;
            }
            
            const app = doc.data();
            const date = app.appointmentDate.toDate();

            document.getElementById('edit-appointment-id').value = doc.id;
            document.getElementById('edit-customerName').value = app.customerName;
            document.getElementById('edit-patientRut').value = app.patientRut;
            document.getElementById('edit-description').value = app.description;
            document.getElementById('edit-phone').value = app.phone;
            document.getElementById('edit-status').value = app.status || 'Agendado';
            
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const time = date.toTimeString().split(' ')[0].substring(0,5);

            document.getElementById('edit-appointmentDate').value = `${yyyy}-${mm}-${dd}`;
            document.getElementById('edit-appointmentTime').value = time;

            editAppointmentModal.show();
        } catch (error) {
            console.error("Error al obtener la cita para editar:", error);
            showAdminAlert("Hubo un error al cargar los datos de la cita.", "danger");
        }
    }

    // 6. Guardar cambios de la cita
    saveChangesBtn.addEventListener('click', async () => {
        const appointmentId = document.getElementById('edit-appointment-id').value;
        if (!appointmentId) return;

        const appointmentRef = db.collection('appointments').doc(appointmentId);
        const updatedData = {
            customerName: document.getElementById('edit-customerName').value.trim(),
            patientRut: document.getElementById('edit-patientRut').value.trim(),
            description: document.getElementById('edit-description').value.trim(),
            phone: document.getElementById('edit-phone').value.trim(),
            status: document.getElementById('edit-status').value
        };

        // Validaciones
        if (!updatedData.customerName || !updatedData.patientRut || !updatedData.description || !updatedData.phone) {
            showAdminAlert("Por favor, completa todos los campos obligatorios.", "warning");
            return;
        }

        try {
            saveChangesBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Guardando...';
            saveChangesBtn.disabled = true;
            
            await appointmentRef.update(updatedData);
            editAppointmentModal.hide();
            showAdminAlert("Cita actualizada con éxito.", "success");
            
            // Actualizar la lista
            loadAllAppointments();
        } catch (error) {
            console.error("Error al actualizar la cita:", error);
            showAdminAlert("Hubo un error al guardar los cambios.", "danger");
        } finally {
            saveChangesBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Guardar Cambios';
            saveChangesBtn.disabled = false;
        }
    });

    // 7. Función para cancelar una cita
    async function cancelAppointment(appointmentId) {
        if (!confirm("¿Estás seguro de que quieres cancelar esta cita?")) return;

        const appointmentRef = db.collection('appointments').doc(appointmentId);
        try {
            const appointmentDoc = await appointmentRef.get();
            if (!appointmentDoc.exists) throw new Error("La cita no existe.");

            const appointmentData = appointmentDoc.data();
            const publicSlotQuery = db.collection('publicBookedSlots').where('appointmentDate', '==', appointmentData.appointmentDate);
            const publicSlots = await publicSlotQuery.get();

            const batch = db.batch();
            batch.delete(appointmentRef);
            publicSlots.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            showAdminAlert("Cita cancelada con éxito.", "success");
            loadAllAppointments();
        } catch (error) {
            console.error("Error al cancelar la cita: ", error);
            showAdminAlert("Hubo un error al cancelar la cita.", "danger");
        }
    }

    // 8. Cargar TODAS las citas con filtrado
    function loadAllAppointments() {
        db.collection('appointments').orderBy('appointmentDate', 'desc').onSnapshot(snapshot => {
            if (snapshot.empty) {
                noAppointmentsMessage.style.display = 'block';
                appointmentsTableBody.innerHTML = '';
                allAppointments = [];
                filteredAppointments = [];
                updateAppointmentCount(0);
                return;
            }
            
            noAppointmentsMessage.style.display = 'none';
            allAppointments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Aplicar filtro actual si existe
            applySearchFilter();
            
        }, error => {
            console.error("Error al cargar citas: ", error);
            showAdminAlert("Error: No tienes permiso para ver las citas. Asegúrate de que tu UID esté en las reglas de seguridad.", "danger");
        });
    }

    // 9. Función de búsqueda y filtrado
    function applySearchFilter() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            filteredAppointments = [...allAppointments];
        } else {
            filteredAppointments = allAppointments.filter(app => 
                app.customerName.toLowerCase().includes(searchTerm) ||
                app.patientRut.toLowerCase().includes(searchTerm) ||
                app.phone.includes(searchTerm) ||
                app.email.toLowerCase().includes(searchTerm)
            );
        }
        
        renderAppointmentsTable();
        updateAppointmentCount(filteredAppointments.length);
    }

    // 10. Renderizar tabla de citas
    function renderAppointmentsTable() {
        if (filteredAppointments.length === 0) {
            appointmentsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                        <p class="mt-2 mb-0 text-muted">No se encontraron citas que coincidan con la búsqueda</p>
                    </td>
                </tr>
            `;
            return;
        }
        // Ordenar
        let sorted = [...filteredAppointments];
        if (sortField === 'appointmentDate') {
            sorted.sort((a, b) => sortDirection === 'asc' ? a.appointmentDate.toDate() - b.appointmentDate.toDate() : b.appointmentDate.toDate() - a.appointmentDate.toDate());
        } else if (sortField === 'status') {
            const order = ['Agendado', 'Confirmado', 'Realizado'];
            sorted.sort((a, b) => {
                const idxA = order.indexOf(a.status || 'Agendado');
                const idxB = order.indexOf(b.status || 'Agendado');
                return sortDirection === 'asc' ? idxA - idxB : idxB - idxA;
            });
        }
        let html = '';
        sorted.forEach(app => {
            const date = app.appointmentDate.toDate();
            const isToday = date.toDateString() === new Date().toDateString();
            const isPast = date < new Date();
            let rowClass = '';
            if (isToday) rowClass = 'table-warning';
            else if (isPast) rowClass = 'table-light';
            html += `
                <tr data-id="${app.id}" class="${rowClass}">
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-calendar-event me-2 text-primary"></i>
                            <div>
                                <div class="fw-bold">${date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                <small class="text-muted">${date.getFullYear()}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary fs-6">
                            <i class="bi bi-clock me-1"></i>
                            ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </td>
                    <td>
                        <div>
                            <div class="fw-bold">${app.customerName}</div>
                            <small class="text-muted">RUT: ${app.patientRut}</small>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="bi bi-telephone me-2 text-success"></i>
                            <span>${app.phone}</span>
                        </div>
                    </td>
                    <td>
                        <select class="form-select form-select-sm status-select" data-id="${app.id}">
                            <option value="Agendado" ${app.status === 'Agendado' ? 'selected' : ''}>Agendado</option>
                            <option value="Confirmado" ${app.status === 'Confirmado' ? 'selected' : ''}>Confirmado</option>
                            <option value="Realizado" ${app.status === 'Realizado' ? 'selected' : ''}>Realizado</option>
                        </select>
                    </td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-primary btn-sm btn-edit" title="Editar cita">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-danger btn-sm btn-cancel" title="Cancelar cita">
                                <i class="bi bi-x-circle"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        appointmentsTableBody.innerHTML = html;
        // Listeners para edición inline de estado
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = select.getAttribute('data-id');
                const newStatus = select.value;
                await db.collection('appointments').doc(id).update({ status: newStatus });
                showAdminAlert('Estado actualizado', 'success');
            });
        });
    }

    // 11. Actualizar contador de citas
    function updateAppointmentCount(count) {
        totalAppointments.textContent = count;
    }

    // 12. Event listeners para búsqueda y actualización
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applySearchFilter, 300));
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i>';
            loadAllAppointments();
            setTimeout(() => {
                refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Actualizar';
            }, 1000);
        });
    }

    // 13. Event delegation para los botones de la tabla
    appointmentsTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        const appointmentId = row.dataset.id;

        if (target.classList.contains('btn-edit') || target.closest('.btn-edit')) {
            openEditModal(appointmentId);
        }
        if (target.classList.contains('btn-cancel') || target.closest('.btn-cancel')) {
            appointmentToCancel = appointmentId;
            cancelConfirmModal.show();
        }
    });

    // 14. Confirmar cancelación
    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', async () => {
            if (appointmentToCancel) {
                await cancelAppointment(appointmentToCancel);
                appointmentToCancel = null;
                cancelConfirmModal.hide();
            }
        });
    }

    // 15. Funciones de utilidad
    function showAdminAlert(message, type = 'info') {
        // Crear alerta temporal
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        //alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            alertDiv.style.cssText = `
        position: fixed;
        left: 50%;
        top: 80px;
        transform: translateX(-50%);
        z-index: 9999;
        min-width: 350px;
        max-width: 90vw;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    `;

        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- CONFIGURACIÓN DEL SISTEMA ---
    const systemSettingsCard = document.getElementById('system-settings-card');
    const systemSettingsForm = document.getElementById('system-settings-form');
    const workingDaysCheckboxes = document.getElementById('workingDaysCheckboxes');
    const startHourInput = document.getElementById('startHour');
    const endHourInput = document.getElementById('endHour');
    const appointmentDurationInput = document.getElementById('appointmentDuration');
    const blockDateInput = document.getElementById('blockDateInput');
    const addBlockedDateBtn = document.getElementById('addBlockedDate');
    const blockedDatesList = document.getElementById('blockedDatesList');
    const blockHourDate = document.getElementById('blockHourDate');
    const blockHourTime = document.getElementById('blockHourTime');
    const addBlockedHourBtn = document.getElementById('addBlockedHour');
    const blockedHoursList = document.getElementById('blockedHoursList');
    const settingsFeedback = document.getElementById('settingsFeedback');

    const daysOfWeek = [
        { value: "Monday", label: "Lunes" },
        { value: "Tuesday", label: "Martes" },
        { value: "Wednesday", label: "Miércoles" },
        { value: "Thursday", label: "Jueves" },
        { value: "Friday", label: "Viernes" },
        { value: "Saturday", label: "Sábado" },
        { value: "Sunday", label: "Domingo" }
    ];
    let blockedDates = [];
    let blockedHours = [];

    function renderWorkingDays(selectedDays) {
        workingDaysCheckboxes.innerHTML = "";
        daysOfWeek.forEach(day => {
            const id = `day-${day.value}`;
            const checked = selectedDays && selectedDays.includes(day.value) ? "checked" : "";
            workingDaysCheckboxes.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${day.value}" id="${id}" ${checked}>
                    <label class="form-check-label" for="${id}">${day.label}</label>
                </div>
            `;
        });
    }
    function renderBlockedDates() {
        blockedDatesList.innerHTML = "";
        blockedDates.forEach((date, idx) => {
            blockedDatesList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${date}
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeBlockedDate(${idx})"><i class="bi bi-x"></i></button>
                </li>
            `;
        });
    }
    function renderBlockedHours() {
        blockedHoursList.innerHTML = "";
        blockedHours.forEach((item, idx) => {
            blockedHoursList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${item.date} - ${item.time}
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeBlockedHour(${idx})"><i class="bi bi-x"></i></button>
                </li>
            `;
        });
    }
    window.removeBlockedDate = function(idx) {
        blockedDates.splice(idx, 1);
        renderBlockedDates();
    };
    window.removeBlockedHour = function(idx) {
        blockedHours.splice(idx, 1);
        renderBlockedHours();
    };
    if (addBlockedDateBtn) {
        addBlockedDateBtn.addEventListener("click", () => {
            const date = blockDateInput.value;
            if (date && !blockedDates.includes(date)) {
                blockedDates.push(date);
                renderBlockedDates();
            }
        });
    }
    if (addBlockedHourBtn) {
        addBlockedHourBtn.addEventListener("click", () => {
            const date = blockHourDate.value;
            const time = blockHourTime.value;
            if (date && time && !blockedHours.some(item => item.date === date && item.time === time)) {
                blockedHours.push({ date, time });
                renderBlockedHours();
            }
        });
    }
    if (systemSettingsForm) {
        systemSettingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const workingDays = Array.from(workingDaysCheckboxes.querySelectorAll("input:checked")).map(cb => cb.value);
            const startHour = startHourInput.value;
            const endHour = endHourInput.value;
            const appointmentDuration = parseInt(appointmentDurationInput.value, 10);
            if (!workingDays.length || !startHour || !endHour || !appointmentDuration) {
                showSettingsFeedback("Completa todos los campos obligatorios.", "danger");
                return;
            }
            if (startHour >= endHour) {
                showSettingsFeedback("La hora de inicio debe ser menor que la de fin.", "danger");
                return;
            }
            try {
                await db.collection("settings").doc("systemSettings").set({
                    workingDays,
                    workingHours: { start: startHour, end: endHour },
                    appointmentDuration,
                    blockedDates,
                    blockedHours
                }, { merge: true });
                showSettingsFeedback("¡Configuración guardada exitosamente!", "success");
            } catch (err) {
                showSettingsFeedback("Error al guardar: " + err.message, "danger");
            }
        });
    }
    function showSettingsFeedback(msg, type) {
        settingsFeedback.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    }
    function loadSystemSettings() {
        db.collection("settings").doc("systemSettings").get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                renderWorkingDays(data.workingDays || []);
                startHourInput.value = data.workingHours?.start || "09:00";
                endHourInput.value = data.workingHours?.end || "18:00";
                appointmentDurationInput.value = data.appointmentDuration || 30;
                blockedDates = data.blockedDates || [];
                blockedHours = data.blockedHours || [];
                renderBlockedDates();
                renderBlockedHours();
            } else {
                renderWorkingDays([]);
            }
        });
    }
    // Mostrar la tarjeta solo si el usuario está autenticado
    auth.onAuthStateChanged(user => {
        if (user) {
            systemSettingsCard.style.display = 'block';
            loadSystemSettings();
        } else {
            systemSettingsCard.style.display = 'none';
        }
    });

    // 16. Inicialización
    loadAllAppointments();

    // Ordenar por columnas
    document.getElementById('th-status').addEventListener('click', () => {
        if (sortField === 'status') {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = 'status';
            sortDirection = 'asc';
        }
        renderAppointmentsTable();
        updateSortIcons();
    });
    document.querySelector('th[title="Fecha"], th[title=""]:first-child').addEventListener('click', () => {
        if (sortField === 'appointmentDate') {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = 'appointmentDate';
            sortDirection = 'desc';
        }
        renderAppointmentsTable();
        updateSortIcons();
    });
    function updateSortIcons() {
        document.getElementById('sort-status-icon').innerHTML = sortField === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '';
        // Puedes agregar un icono similar para la columna fecha si lo deseas
    }
});