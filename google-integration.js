/**
 * Google Integration Script for OSPETAX Health Declaration Form
 * This script handles saving PDFs to Google Drive and form data to Google Sheets
 */

// Configuration variables
let API_KEY = "AIzaSyDuwHvuFEh3hihBs1lJoy2lcPENPV_Ueso"
let CLIENT_ID = "1019267372633-eae1g3s7kkfmssofl5lc1c0pjnkp6kj2.apps.googleusercontent.com"
let SPREADSHEET_ID = "1gwK6-S-Ms5rgOJmUOP8NnWEGiJrCzdk2IZ1iZtkSubI"
let DRIVE_FOLDER_ID = "1gcxJbbsiUmQOLbX05xeKH98BTjl_OsKg"

// Declare gapi, html2canvas, and validateSection
let gapi
let html2canvas
let validateSection

// Initialize Google APIs
function initGoogleAPIs(config) {
  API_KEY = config.apiKey
  CLIENT_ID = config.clientId
  SPREADSHEET_ID = config.spreadsheetId
  DRIVE_FOLDER_ID = config.driveFolderId

  // Load the Google API client
  gapi.load("client:auth2", startGoogleClient)
}

// Start Google client with proper scopes
function startGoogleClient() {
  gapi.client
    .init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: [
        "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
        "https://sheets.googleapis.com/$discovery/rest?version=v4",
      ],
      scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets",
    })
    .then(() => {
      console.log("Google APIs initialized successfully")
    })
    .catch((error) => {
      console.error("Error initializing Google APIs:", error)
    })
}

// Save form data to Google Sheets
async function saveToGoogleSheets(formData) {
  try {
    // Check if user is authenticated
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      await gapi.auth2.getAuthInstance().signIn()
    }

    // Prepare data for Google Sheets
    const values = [
      [
        formData.get("titular_nombre") || "",
        formData.get("titular_cuit") || "",
        formData.get("titular_fecha_nac") || "",
        formData.get("titular_edad") || "",
        formData.get("titular_email") || "",
        formData.get("celular") || "",
        formData.get("domicilio") || "",
        formData.get("provincia") || "",
        new Date().toISOString(), // Submission date
      ],
    ]

    // Send data to Google Sheets
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Formularios!A2:I", // Adjust according to your sheet structure
      valueInputOption: "USER_ENTERED",
      resource: {
        values: values,
      },
    })

    console.log("Data saved to Google Sheets:", response)
    return response
  } catch (error) {
    console.error("Error saving to Google Sheets:", error)
    throw error
  }
}

// Save PDF to Google Drive
async function savePDFToDrive(pdfBlob, fileName) {
  try {
    // Check if user is authenticated
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      await gapi.auth2.getAuthInstance().signIn()
    }

    // Create a File object from the Blob
    const file = new File([pdfBlob], fileName, { type: "application/pdf" })

    // Create a FormData object for upload
    const metadata = {
      name: fileName,
      mimeType: "application/pdf",
      parents: [DRIVE_FOLDER_ID], // Google Drive folder ID
    }

    const form = new FormData()
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
    form.append("file", file)

    // Get access token
    const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token

    // Upload file to Google Drive
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    })

    const result = await response.json()
    console.log("PDF saved to Google Drive:", result)

    return result
  } catch (error) {
    console.error("Error saving PDF to Google Drive:", error)
    throw error
  }
}

// Generate PDF and get blob for upload
async function generatePDFForUpload() {
  try {
    // Show loading indicator
    document.getElementById("loadingIndicator").style.display = "flex"
    document.getElementById("loadingText").textContent = "Generando PDF para subir, por favor espere..."

    // Get CUIT for filename
    const cuit = document.getElementById("titular_cuit").value.replace(/[^0-9]/g, "") || "formulario"
    const fileName = `Declaracion_Jurada_OSPETAX_${cuit}.pdf`

    // Create a clone of the form container to not modify the original
    const formContainer = document.getElementById("formContainer")
    const clone = formContainer.cloneNode(true)

    // Apply styles for PDF
    clone.style.background = "white"
    clone.style.padding = "20px"
    clone.style.maxWidth = "100%"
    clone.style.position = "absolute"
    clone.style.left = "-9999px"
    clone.style.top = "0"

    // Make all sections visible in the clone
    const sections = clone.querySelectorAll(".form-section")
    sections.forEach((section) => {
      section.style.display = "block"
      section.classList.add("active")
    })

    // Hide navigation elements and buttons in the clone
    const elementsToHide = clone.querySelectorAll(
      ".form-navigation, .step-indicator, .progress-container, .modal, .file-upload, .file-list, .validation-error",
    )
    elementsToHide.forEach((el) => {
      el.style.display = "none"
    })

    // Add the clone to the document to capture it
    document.body.appendChild(clone)

    // Initialize jsPDF
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF("p", "mm", "a4")

    // Configure options for html2canvas
    const options = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollY: 0,
    }

    // Capture the form
    const canvas = await html2canvas(clone, options)

    // Remove the clone after capturing
    document.body.removeChild(clone)

    const imgData = canvas.toDataURL("image/png")

    // A4 page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Calculate dimensions maintaining proportion
    const imgWidth = pageWidth - 20 // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Add the first page with the form
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight)

    // Add additional pages if the form is very long
    let heightLeft = imgHeight
    let position = 10

    while (heightLeft > pageHeight - 20) {
      position = position - (pageHeight - 20)
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - 20
    }

    // Convert PDF to blob
    const pdfBlob = pdf.output("blob")

    return {
      blob: pdfBlob,
      fileName: fileName,
    }
  } catch (error) {
    console.error("Error generating PDF for upload:", error)
    throw error
  } finally {
    // Hide loading indicator
    document.getElementById("loadingIndicator").style.display = "none"
  }
}

// Handle form submission with Google integration
async function handleFormSubmitWithGoogleIntegration(event) {
  event.preventDefault()

  // Validate all fields
  let isValid = true
  for (let i = 1; i <= 5; i++) {
    if (!validateSection(i)) {
      isValid = false
      // Show section with errors
      document.querySelectorAll(".form-section").forEach((section) => {
        section.classList.remove("active")
      })
      document.getElementById(`section${i}`).classList.add("active")

      // Update step indicators
      document.querySelectorAll(".step").forEach((step) => {
        step.classList.remove("active")
      })
      document.querySelector(`.step[data-step="${i}"]`).classList.add("active")

      // Scroll to first error
      const firstError = document.querySelector(`#section${i} .validation-error[style="display: block"]`)
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" })
      }

      break
    }
  }

  if (!isValid) {
    return
  }

  // Show loading indicator
  document.getElementById("loadingIndicator").style.display = "flex"
  document.getElementById("loadingText").textContent = "Procesando formulario, por favor espere..."

  try {
    // Get form data
    const formData = new FormData(document.getElementById("healthForm"))

    // Generate PDF for upload
    const pdfData = await generatePDFForUpload()

    // Save data to Google Sheets
    await saveToGoogleSheets(formData)

    // Save PDF to Google Drive
    await savePDFToDrive(pdfData.blob, pdfData.fileName)

    // Show success message
    document.getElementById("healthForm").style.display = "none"
    document.getElementById("successMessage").innerHTML = `
      <h3>¡Formulario enviado con éxito!</h3>
      <p>El formulario se ha completado correctamente y se ha guardado en Google Drive.</p>
      <p>Para acceder a la credencial deberá comunicarse con la casilla de <strong>afiliaciones@conexionsalud.com.ar</strong></p>
    `
    document.getElementById("successMessage").style.display = "block"

    // Scroll to message
    window.scrollTo(0, 0)
  } catch (error) {
    console.error("Error processing form:", error)
    document.getElementById("errorMessage").style.display = "block"
    document.getElementById("errorMessage").scrollIntoView({ behavior: "smooth" })
  } finally {
    // Hide loading indicator
    document.getElementById("loadingIndicator").style.display = "none"
  }
}

// Export functions for use in main script
window.googleIntegration = {
  initGoogleAPIs,
  saveToGoogleSheets,
  savePDFToDrive,
  generatePDFForUpload,
  handleFormSubmitWithGoogleIntegration,
}

