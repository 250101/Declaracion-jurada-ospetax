// Google API constants
const API_KEY = "AIzaSyAi9C-1OcqGWlAOQVRLWvUrUcdoL-AHZS0";
const CLIENT_ID = "108652054327996794294";
const SPREADSHEET_ID = "1gwK6-S-Ms5rgOJmUOP8NnWEGiJrCzdk2IZ1iZtkSubI";
const DRIVE_FOLDER_ID = "1gcxJbbsiUmQOLbX05xeKH98BTjl_OsKg";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets";

// Global variables
let currentStep = 1;
const totalSteps = 5;
const { jsPDF } = window.jspdf;
let uploadedFiles = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeGoogleAPI();
    setupEventListeners();
    setupSignatureCanvas();
    setupFileUpload();
    updateProgressBar();
});

// Initialize Google APIs
function initializeGoogleAPI() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            scope: SCOPES,
            discoveryDocs: [
                "https://sheets.googleapis.com/$discovery/rest?version=v4",
                "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
            ]
        }).then(() => {
            console.log('Google API initialized');
        }).catch(error => {
            console.error('Error initializing Google API:', error);
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // #titular_fecha_nac: Listens for changes to calculate age and update #titular_edad
    const fechaNacInput = document.getElementById('titular_fecha_nac');
    // #titular_edad: Displays the calculated age based on #titular_fecha_nac
    const edadInput = document.getElementById('titular_edad');
    
    fechaNacInput.addEventListener('change', () => {
        const birthDate = new Date(fechaNacInput.value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        edadInput.value = age;
    });
}

// Update the progress bar
function updateProgressBar() {
    // #progressBar: Updates the width of the progress bar based on the current step
    const progressBar = document.getElementById('progressBar');
    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
}

// Navigation functions
function validateAndNext(step) {
    if (validateSection(step)) {
        if (step < totalSteps) {
            goToNext(step);
        }
    }
}

function goToNext(step) {
    // #section{step}: Hides the current section
    document.getElementById(`section${step}`).classList.remove('active');
    document.querySelector(`.step[data-step="${step}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${step}"]`).classList.add('completed');
    
    currentStep = step + 1;
    // #section{currentStep}: Shows the next section
    document.getElementById(`section${currentStep}`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    updateProgressBar();
}

function goToPrevious(step) {
    // #section{step}: Hides the current section
    document.getElementById(`section${step}`).classList.remove('active');
    document.querySelector(`.step[data-step="${step}"]`).classList.remove('active');
    
    currentStep = step - 1;
    // #section{currentStep}: Shows the previous section
    document.getElementById(`section${currentStep}`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${step}"]`).classList.remove('completed');
    updateProgressBar();
}

// Validate form sections
function validateSection(step) {
    let isValid = true;
    // #section{step}: Targets the current section for validation
    const section = document.getElementById(`section${step}`);
    const requiredFields = section.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        // #field.id_error: Shows/hides the error message for each required field
        const errorElement = document.getElementById(`${field.id}_error`);
        if (!field.value.trim()) {
            field.classList.add('invalid');
            errorElement.style.display = 'block';
            isValid = false;
        } else {
            field.classList.remove('invalid');
            errorElement.style.display = 'none';
        }

        // #titular_email: Specific validation for email format
        if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
            field.classList.add('invalid');
            errorElement.textContent = 'Enter a valid email';
            errorElement.style.display = 'block';
            isValid = false;
        }

        // #titular_cuit: Specific validation for CUIT format
        if (field.id === 'titular_cuit' && field.value && !/^\d{2}-\d{8}-\d{1}$/.test(field.value)) {
            field.classList.add('invalid');
            errorElement.textContent = 'Enter a valid CUIT (XX-XXXXXXXX-X)';
            errorElement.style.display = 'block';
            isValid = false;
        }
    });

    return isValid;
}

// Set up signature canvas
function setupSignatureCanvas() {
    // #signatureCanvas: Canvas element where the user draws their signature
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    function getPosition(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getPosition(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
    }

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const { x, y } = getPosition(e);
        lastX = x;
        lastY = y;
    });

    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        updateSignatureInput();
    });
    canvas.addEventListener('mouseout', () => isDrawing = false);

    canvas.addEventListener('touchstart', (e) => {
        isDrawing = true;
        const { x, y } = getPosition(e);
        lastX = x;
        lastY = y;
    });

    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', () => {
        isDrawing = false;
        updateSignatureInput();
    });
}

function clearSignature() {
    // #signatureCanvas: Clears the canvas when the "Clear Signature" button is clicked
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // #firmaInput: Resets the hidden input storing the signature data
    document.getElementById('firmaInput').value = '';
}

function updateSignatureInput() {
    // #signatureCanvas: Converts the canvas drawing to a data URL
    const canvas = document.getElementById('signatureCanvas');
    const dataURL = canvas.toDataURL('image/png');
    // #firmaInput: Stores the signature as a data URL in this hidden input
    document.getElementById('firmaInput').value = dataURL;
}

// Set up file upload
function setupFileUpload() {
    // #fileInput: Hidden input for selecting files, triggered by #fileUploadArea
    const fileInput = document.getElementById('fileInput');
    // #fileUploadArea: Drop zone for dragging files, with event listeners
    const fileUploadArea = document.getElementById('fileUploadArea');
    // #fileList: List where uploaded file names are displayed
    const fileList = document.getElementById('fileList');
    // #imagePreviewContainer: Container for showing previews of uploaded images
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');

    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.backgroundColor = '#e1e1e1';
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.backgroundColor = '#f8f9fa';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.backgroundColor = '#f8f9fa';
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            uploadedFiles.push(file);
            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                ${file.name}
                <span class="file-remove" onclick="removeFile(this, '${file.name}')">X</span>
            `;
            fileList.appendChild(li);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'image-preview';
                    imagePreviewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function removeFile(element, fileName) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
    element.parentElement.remove();
    const previews = document.querySelectorAll('.image-preview');
    previews.forEach(preview => {
        if (preview.src.includes(fileName)) {
            preview.remove();
        }
    });
}

// Collect form data
function collectFormData() {
    // #healthForm: Uses this form to gather all input values via FormData
    const form = document.getElementById('healthForm');
    const formData = new FormData(form);

    return {
        titular: {
            nombre: formData.get('titular_nombre') || '',
            cuit: formData.get('titular_cuit') || '',
            fechaNac: formData.get('titular_fecha_nac') || '',
            edad: formData.get('titular_edad') || '',
            email: formData.get('titular_email') || '',
            celular: formData.get('celular') || '',
            domicilio: `${formData.get('domicilio') || ''} ${formData.get('domicilio_numero') || ''}, ${formData.get('barrio') || ''}, ${formData.get('partido') || ''}, ${formData.get('cod_postal') || ''}, ${formData.get('provincia') || ''}`,
            contactoEmergencia: {
                nombre: formData.get('contacto_nombre') || '',
                relacion: formData.get('contacto_relacion') || '',
                celular: formData.get('contacto_celular') || '',
                domicilio: `${formData.get('contacto_domicilio') || ''} ${formData.get('contacto_numero') || ''}, ${formData.get('contacto_barrio') || ''}`
            }
        },
        salud: {
            titular: {
                edad: formData.get('edad_titular') || '',
                peso: formData.get('peso_titular') || '',
                altura: formData.get('altura_titular') || '',
                fuma: formData.get('fuma_titular') || '',
                cirugiasAnteriores: formData.get('cirugias_ant_titular') || '',
                cirugiasPendientes: formData.get('cirugias_pen_titular') || '',
                tratamientosPendientes: formData.get('trat_pen_titular') || '',
                protesis: formData.get('protesis_titular') || '',
                psico: formData.get('psico_titular') || '',
                nutri: formData.get('nutri_titular') || '',
                peda: formData.get('peda_titular') || '',
                oftalmo: formData.get('oftalmo_titular') || '',
                odonto: formData.get('odonto_titular') || '',
                medicacionCronica: formData.get('med_cronica_titular') || '',
                alergias: formData.get('alergia_titular') || '',
                varices: formData.get('varices_titular') || '',
                presion: formData.get('presion_titular') || '',
                diabetes: formData.get('diabetes_titular') || '',
                embarazo: formData.get('embarazo_titular') || ''
            },
            esposa: {
                edad: formData.get('edad_esposa') || '',
                peso: formData.get('peso_esposa') || '',
                altura: formData.get('altura_esposa') || '',
                fuma: formData.get('fuma_esposa') || '',
                cirugiasAnteriores: formData.get('cirugias_ant_esposa') || '',
                cirugiasPendientes: formData.get('cirugias_pen_esposa') || '',
                tratamientosPendientes: formData.get('trat_pen_esposa') || '',
                protesis: formData.get('protesis_esposa') || '',
                psico: formData.get('psico_esposa') || '',
                nutri: formData.get('nutri_esposa') || '',
                peda: formData.get('peda_esposa') || '',
                oftalmo: formData.get('oftalmo_esposa') || '',
                odonto: formData.get('odonto_esposa') || '',
                medicacionCronica: formData.get('med_cronica_esposa') || '',
                alergias: formData.get('alergia_esposa') || '',
                varices: formData.get('varices_esposa') || '',
                presion: formData.get('presion_esposa') || '',
                diabetes: formData.get('diabetes_esposa') || '',
                embarazo: formData.get('embarazo_esposa') || ''
            },
            hijos: Array.from({ length: 5 }, (_, i) => ({
                edad: formData.get(`edad_hijo${i + 1}`) || '',
                peso: formData.get(`peso_hijo${i + 1}`) || '',
                altura: formData.get(`altura_hijo${i + 1}`) || '',
                fuma: formData.get(`fuma_hijo${i + 1}`) || '',
                cirugiasAnteriores: formData.get(`cirugias_ant_hijo${i + 1}`) || '',
                cirugiasPendientes: formData.get(`cirugias_pen_hijo${i + 1}`) || '',
                tratamientosPendientes: formData.get(`trat_pen_hijo${i + 1}`) || '',
                protesis: formData.get(`protesis_hijo${i + 1}`) || '',
                psico: formData.get(`psico_hijo${i + 1}`) || '',
                nutri: formData.get(`nutri_hijo${i + 1}`) || '',
                peda: formData.get(`peda_hijo${i + 1}`) || '',
                oftalmo: formData.get(`oftalmo_hijo${i + 1}`) || '',
                odonto: formData.get(`odonto_hijo${i + 1}`) || '',
                medicacionCronica: formData.get(`med_cronica_hijo${i + 1}`) || '',
                alergias: formData.get(`alergia_hijo${i + 1}`) || '',
                varices: formData.get(`varices_hijo${i + 1}`) || '',
                presion: formData.get(`presion_hijo${i + 1}`) || '',
                diabetes: formData.get(`diabetes_hijo${i + 1}`) || '',
                embarazo: formData.get(`embarazo_hijo${i + 1}`) || ''
            })),
            observaciones: formData.get('observaciones') || ''
        },
        grupoFamiliar: Array.from({ length: 7 }, (_, i) => ({
            nombre: formData.get(`gf_nombre${i + 1}`) || '',
            parentesco: formData.get(`gf_parentesco${i + 1}`) || '',
            documento: formData.get(`gf_documento${i + 1}`) || '',
            fechaNac: formData.get(`gf_fecha_nac${i + 1}`) || '',
            observaciones: formData.get(`gf_observ${i + 1}`) || ''
        })).filter(f => f.nombre || f.parentesco || f.documento || f.fechaNac || f.observaciones),
        firma: {
            dataURL: formData.get('firma') || '',
            aclaracion: formData.get('aclaracion') || '',
            documento: formData.get('documento') || '',
            fecha: formData.get('fecha') || ''
        }
    };
}

// Generate PDF and upload to Google Drive
async function generatePDFForUpload() {
    // #formContainer: Captures this element to generate the PDF
    const element = document.getElementById('formContainer');
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    return pdf.output('blob');
}

async function savePDFToDrive(pdfBlob) {
    const metadata = {
        name: `Declaracion_Jurada_${new Date().toISOString()}.pdf`,
        parents: [DRIVE_FOLDER_ID],
        mimeType: 'application/pdf'
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', pdfBlob);

    const accessToken = gapi.auth.getToken().access_token;
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form
    });
    return response.json();
}

// Save data to Google Sheets
async function saveToGoogleSheets(formData) {
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        await gapi.auth2.getAuthInstance().signIn();
    }

    const data = collectFormData();
    const titularValues = [
        [
            data.titular.nombre,
            data.titular.cuit,
            data.titular.fechaNac,
            data.titular.edad,
            data.titular.email,
            data.titular.celular,
            data.titular.domicilio,
            data.titular.contactoEmergencia.nombre,
            data.titular.contactoEmergencia.relacion,
            data.titular.contactoEmergencia.celular,
            new Date().toISOString()
        ]
    ];
    const saludValues = [
        ['Titular', data.salud.titular.edad, data.salud.titular.peso, data.salud.titular.altura, data.salud.titular.fuma, data.salud.titular.cirugiasAnteriores, data.salud.titular.cirugiasPendientes, data.salud.titular.tratamientosPendientes, data.salud.titular.medicacionCronica, data.salud.titular.alergias],
        ['Esposa/o', data.salud.esposa.edad, data.salud.esposa.peso, data.salud.esposa.altura, data.salud.esposa.fuma, data.salud.esposa.cirugiasAnteriores, data.salud.esposa.cirugiasPendientes, data.salud.esposa.tratamientosPendientes, data.salud.esposa.medicacionCronica, data.salud.esposa.alergias],
        ...data.salud.hijos.map((hijo, i) => [`Hijo ${i + 1}`, hijo.edad, hijo.peso, hijo.altura, hijo.fuma, hijo.cirugiasAnteriores, hijo.cirugiasPendientes, hijo.tratamientosPendientes, hijo.medicacionCronica, hijo.alergias])
    ];
    const grupoFamiliarValues = data.grupoFamiliar.map(f => [f.nombre, f.parentesco, f.documento, f.fechaNac, f.observaciones]);

    await Promise.all([
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Titulares!A:K',
            valueInputOption: 'RAW',
            resource: { values: titularValues }
        }),
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Salud!A:J',
            valueInputOption: 'RAW',
            resource: { values: saludValues }
        }),
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'GrupoFamiliar!A:E',
            valueInputOption: 'RAW',
            resource: { values: grupoFamiliarValues }
        })
    ]);
}

// Submit the form
async function submitForm() {
    if (!validateSection(5)) return;

    // #loadingIndicator: Shows the loading overlay during submission
    const loadingIndicator = document.getElementById('loadingIndicator');
    // #successMessage: Shows success message if submission succeeds
    const successMessage = document.getElementById('successMessage');
    // #errorMessage: Shows error message if submission fails
    const errorMessage = document.getElementById('errorMessage');

    loadingIndicator.style.display = 'flex';
    try {
        const pdfBlob = await generatePDFForUpload();
        await Promise.all([
            savePDFToDrive(pdfBlob),
            saveToGoogleSheets()
        ]);
        loadingIndicator.style.display = 'none';
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    } catch (error) {
        console.error('Error submitting form:', error);
        loadingIndicator.style.display = 'none';
        successMessage.style.display = 'none';
        errorMessage.style.display = 'block';
    }
}