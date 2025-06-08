// ====================================================================================
// CONFIGURATION - กรุณาเปลี่ยนค่านี้ให้เป็น URL ของ Apps Script Web App ของคุณ
// ====================================================================================
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyCBK9QgHFaAWMm7DZgnHbp-jDFvDs9XGWyfZOQe1ZmIPPcvsHszGy4oguFVRW8g6tQvQ/exec'; // <<-- ใส่ URL ของ Web App ของคุณที่นี่
// ====================================================================================

// --- Elements ---
const studentIdInput = document.getElementById('studentId');
const studentIdError = document.getElementById('studentIdError');
const applicantForm = document.getElementById('applicantForm');
const submitBtn = document.getElementById('submitBtn');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const clearFormBtn = document.getElementById('clearFormBtn');

const currentApplicantsSpan = document.getElementById('currentApplicants');
const remainingApplicantsSpan = document.getElementById('remainingApplicants');
const maxApplicantsSpan = document.getElementById('maxApplicants');
const fullCapacityAlert = document.getElementById('fullCapacityAlert');
const latestApplicantsList = document.getElementById('latestApplicantsList');
const noLatestApplicants = document.getElementById('noLatestApplicants');

const infoModal = document.getElementById('infoModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalData = document.getElementById('modalData');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalOkBtn = document.getElementById('modalOkBtn');
const closeButton = document.querySelector('.close-button');

let isEditMode = false; // Flag for edit mode

// --- Functions for UX/UI ---

/**
 * แสดง Popup Modal
 * @param {string} title หัวข้อของ Modal
 * @param {string} message ข้อความใน Modal
 * @param {string} type 'alert' | 'confirm' | 'info'
 * @param {object} [data] ข้อมูลที่จะแสดงใน Modal (optional)
 * @returns {Promise<boolean>} สำหรับ type 'confirm' จะ resolve true/false
 */
function showModal(title, message, type, data = null) {
    return new Promise(resolve => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalData.innerHTML = ''; // Clear previous data

        modalConfirmBtn.style.display = 'none';
        modalCancelBtn.style.display = 'none';
        modalOkBtn.style.display = 'none';

        if (data) {
            let dataHtml = '';
            for (const key in data) {
                dataHtml += `<p><strong>${key}:</strong> ${data[key]}</p>`;
            }
            modalData.innerHTML = dataHtml;
        }

        if (type === 'confirm') {
            modalConfirmBtn.style.display = 'inline-block';
            modalCancelBtn.style.display = 'inline-block';
            modalConfirmBtn.onclick = () => {
                infoModal.style.display = 'none';
                resolve(true);
            };
            modalCancelBtn.onclick = () => {
                infoModal.style.display = 'none';
                resolve(false);
            };
        } else { // 'alert' or 'info'
            modalOkBtn.style.display = 'inline-block';
            modalOkBtn.onclick = () => {
                infoModal.style.display = 'none';
                resolve(true); // Always true for alert/info
            };
        }

        closeButton.onclick = () => {
            infoModal.style.display = 'none';
            resolve(false); // If closed without confirmation
        };

        window.onclick = (event) => {
            if (event.target == infoModal) {
                infoModal.style.display = 'none';
                resolve(false); // If clicked outside
            }
        };

        infoModal.style.display = 'flex'; // Use flex to center the modal
    });
}

function disableForm(isDisabled) {
    const formElements = applicantForm.querySelectorAll('input, select, button');
    formElements.forEach(element => {
        if (element.id !== 'editBtn' && element.id !== 'deleteBtn' && element.id !== 'clearFormBtn') {
            element.disabled = isDisabled;
        }
    });
    submitBtn.disabled = isDisabled;
    if (isDisabled) {
        submitBtn.textContent = 'ยอดผู้สมัครเต็มแล้ว';
    } else {
        submitBtn.textContent = 'ยืนยันการสมัคร';
    }
}

function clearForm() {
    applicantForm.reset();
    studentIdError.textContent = '';
    setEditMode(false);
}

function setEditMode(enable) {
    isEditMode = enable;
    if (enable) {
        submitBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        studentIdInput.readOnly = true; // ไม่ให้แก้ไขรหัสนักเรียนในโหมดแก้ไข
    } else {
        submitBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        studentIdInput.readOnly = false;
    }
}

// --- API Calls (Apps Script Backend) ---

async function fetchData() {
    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched Data:', data);
        if (data.status === 'success') {
            updateStats(data.currentApplicants, data.remainingApplicants, data.maxApplicants);
            displayLatestApplicants(data.latestApplicants);
        } else {
            showModal('เกิดข้อผิดพลาด', `ไม่สามารถดึงข้อมูลได้: ${data.message}`, 'alert');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        showModal('เกิดข้อผิดพลาด', `ไม่สามารถเชื่อมต่อกับระบบได้: ${error.message}`, 'alert');
    }
}

async function sendFormData(type, formData) {
    try {
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Important for Apps Script doPost
            },
            body: JSON.stringify({ type, ...formData }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Response from server:', result);
        return result;
    } catch (error) {
        console.error('Error sending form data:', error);
        showModal('เกิดข้อผิดพลาด', `ไม่สามารถเชื่อมต่อกับระบบได้: ${error.message}`, 'alert');
        return { status: 'error', message: 'Network or server error' };
    }
}

// --- Update UI ---

function updateStats(current, remaining, max) {
    currentApplicantsSpan.textContent = current;
    remainingApplicantsSpan.textContent = remaining;
    maxApplicantsSpan.textContent = max;

    if (current >= max) {
        fullCapacityAlert.style.display = 'block';
        disableForm(true);
    } else {
        fullCapacityAlert.style.display = 'none';
        disableForm(false);
    }
}

function displayLatestApplicants(applicants) {
    latestApplicantsList.innerHTML = ''; // Clear previous list
    if (applicants && applicants.length > 0) {
        noLatestApplicants.style.display = 'none';
        applicants.forEach(applicant => {
            const div = document.createElement('div');
            div.className = 'applicant-item';
            div.innerHTML = `
                <div>
                    <strong>รหัส:</strong> ${applicant.studentId} |
                    <strong>ชื่อ:</strong> ${applicant.prefix} ${applicant.firstName} ${applicant.lastName} |
                    <strong>ชั้น:</strong> ${applicant.grade} ห้อง ${applicant.room}
                </div>
            `;
            latestApplicantsList.appendChild(div);
        });
    } else {
        noLatestApplicants.style.display = 'block';
    }
}

// --- Event Handlers ---

studentIdInput.addEventListener('input', function() {
    studentIdError.textContent = ''; // Clear previous error
    if (this.value.length > 5) {
        this.value = this.value.slice(0, 5); // Trim to 5 digits
    }
});

studentIdInput.addEventListener('blur', async function() {
    const studentId = this.value;
    if (studentId.length === 5 && !isEditMode) {
        // Assume checkStudentId is part of sendFormData with type 'check' or direct GET
        // For simplicity, let's use a dummy check or refactor Apps Script to handle this
        // For now, the duplicate check is done during registration in Apps Script itself.
        // If you need real-time UI check, you'd need a dedicated GET endpoint for it.
    }
});


applicantForm.addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission

    const formData = {
        studentId: studentIdInput.value.trim(),
        prefix: document.getElementById('prefix').value,
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        grade: document.getElementById('grade').value,
        room: document.getElementById('room').value
    };

    // Basic client-side validation
    if (formData.studentId.length !== 5 || isNaN(formData.studentId) || parseInt(formData.studentId) < 10000 || parseInt(formData.studentId) > 99999) {
        studentIdError.textContent = 'รหัสนักเรียนต้องเป็นตัวเลข 5 หลักเท่านั้น';
        return;
    }
    if (!formData.prefix || !formData.firstName || !formData.lastName || !formData.grade || !formData.room) {
        showModal('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง', 'alert');
        return;
    }

    if (!isEditMode) { // Register new applicant
        const confirmation = await showModal(
            'ยืนยันการสมัคร',
            'คุณต้องการยืนยันข้อมูลนี้ใช่หรือไม่?',
            'confirm',
            {
                'รหัสนักเรียน': formData.studentId,
                'คำนำหน้า': formData.prefix,
                'ชื่อ': formData.firstName,
                'นามสกุล': formData.lastName,
                'ระดับชั้น': formData.grade,
                'ห้อง': formData.room
            }
        );

        if (confirmation) {
            const result = await sendFormData('register', formData);
            if (result.status === 'success') {
                showModal('สำเร็จ!', 'ลงทะเบียนสำเร็จแล้ว', 'alert');
                clearForm();
                fetchData(); // Refresh stats and latest applicants
            } else if (result.message === 'DUPLICATE_ID') {
                showModal('รหัสซ้ำ', 'รหัสนักเรียนนี้ถูกใช้แล้ว กรุณากรอกรหัสอื่น', 'alert');
                studentIdInput.focus();
                studentIdError.textContent = 'รหัสนักเรียนนี้ถูกใช้แล้ว';
            } else if (result.message === 'FULL') {
                showModal('ยอดเต็ม', 'ขออภัย! ยอดผู้สมัครเต็มแล้ว ไม่สามารถลงทะเบียนได้ในขณะนี้', 'alert');
                disableForm(true);
            } else {
                showModal('เกิดข้อผิดพลาด', `การลงทะเบียนไม่สำเร็จ: ${result.message}`, 'alert');
            }
        }
    } else { // Update existing applicant
        // This part needs a way to load data for editing first
        // For this example, we assume studentId is entered to update
        // In a real app, you'd have a search/select mechanism
        const confirmation = await showModal(
            'ยืนยันการแก้ไขข้อมูล',
            'คุณต้องการแก้ไขข้อมูลผู้สมัครนี้ใช่หรือไม่?',
            'confirm',
            {
                'รหัสนักเรียน': formData.studentId,
                'คำนำหน้า': formData.prefix,
                'ชื่อ': formData.firstName,
                'นามสกุล': formData.lastName,
                'ระดับชั้น': formData.grade,
                'ห้อง': formData.room
            }
        );

        if (confirmation) {
            const result = await sendFormData('update', formData);
            if (result.status === 'success') {
                showModal('สำเร็จ!', 'แก้ไขข้อมูลสำเร็จแล้ว', 'alert');
                clearForm();
                fetchData();
            } else {
                showModal('เกิดข้อผิดพลาด', `การแก้ไขข้อมูลไม่สำเร็จ: ${result.message}`, 'alert');
            }
        }
    }
});

// Event listener for edit button (placeholder logic)
editBtn.addEventListener('click', async function() {
    const studentIdToEdit = prompt("กรุณากรอกรหัสนักเรียนที่ต้องการแก้ไข:");
    if (!studentIdToEdit || studentIdToEdit.length !== 5 || isNaN(studentIdToEdit)) {
        showModal('รหัสไม่ถูกต้อง', 'กรุณากรอกรหัสนักเรียน 5 หลัก', 'alert');
        return;
    }

    // In a real app, you'd fetch the specific student's data
    // For this example, we'll try to enable edit mode if studentId matches
    // (This is a simplified approach; a full search/load would be better)
    const currentData = await fetch(APPS_SCRIPT_WEB_APP_URL).then(res => res.json());
    if (currentData.status === 'success') {
        const foundApplicant = currentData.latestApplicants.find(app => app.studentId == studentIdToEdit); // simplified search
        if (foundApplicant) {
            // Populate form for editing
            document.getElementById('studentId').value = foundApplicant.studentId;
            document.getElementById('prefix').value = foundApplicant.prefix;
            document.getElementById('firstName').value = foundApplicant.firstName;
            document.getElementById('lastName').value = foundApplicant.lastName;
            document.getElementById('grade').value = foundApplicant.grade;
            document.getElementById('room').value = foundApplicant.room;
            setEditMode(true);
            showModal('โหมดแก้ไข', `กำลังแก้ไขข้อมูลของรหัสนักเรียน ${studentIdToEdit}`, 'info');
        } else {
            showModal('ไม่พบข้อมูล', `ไม่พบรหัสนักเรียน ${studentIdToEdit}`, 'alert');
            setEditMode(false);
            clearForm();
        }
    }
});


// Event listener for delete button (placeholder logic)
deleteBtn.addEventListener('click', async function() {
    const studentIdToDelete = studentIdInput.value.trim(); // Get ID from current form
    if (!studentIdToDelete || studentIdToDelete.length !== 5 || isNaN(studentIdToDelete)) {
        showModal('รหัสไม่ถูกต้อง', 'กรุณากรอกรหัสนักเรียน 5 หลักที่ต้องการลบ', 'alert');
        return;
    }

    const confirmation = await showModal(
        'ยืนยันการลบข้อมูล',
        `คุณต้องการลบข้อมูลของรหัสนักเรียน ${studentIdToDelete} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        'confirm'
    );

    if (confirmation) {
        const result = await sendFormData('delete', { studentId: studentIdToDelete });
        if (result.status === 'success') {
            showModal('สำเร็จ!', 'ลบข้อมูลสำเร็จแล้ว', 'alert');
            clearForm();
            fetchData();
        } else {
            showModal('เกิดข้อผิดพลาด', `การลบข้อมูลไม่สำเร็จ: ${result.message}`, 'alert');
        }
    }
});


clearFormBtn.addEventListener('click', clearForm);

// Initial load
document.addEventListener('DOMContentLoaded', fetchData);