/**
 * PDF Generator Script for OSPETAX Health Declaration Form
 * This script handles PDF generation and download with the CUIT number as filename
 */

// Function to generate and download PDF from form data
async function generateAndDownloadPDF() {
  try {
    // Show loading indicator
    document.getElementById("loadingIndicator").style.display = "flex"
    document.getElementById("loadingText").textContent = "Generando PDF, por favor espere..."

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

    // Hide success message in the clone
    const successMessage = clone.querySelector(".success-message")
    if (successMessage) {
      successMessage.style.display = "none"
    }

    // Add title for the PDF
    const title = document.createElement("h1")
    title.textContent = "DECLARACIÓN JURADA DE SALUD - OSPETAX"
    title.style.textAlign = "center"
    title.style.marginBottom = "20px"
    title.style.color = "#0056b3"

    // Add generation date
    const dateInfo = document.createElement("p")
    const today = new Date()
    dateInfo.textContent = `Documento generado el: ${today.toLocaleDateString("es-AR")}`
    dateInfo.style.textAlign = "right"
    dateInfo.style.fontSize = "12px"
    dateInfo.style.marginBottom = "30px"

    // Insert title and date at the beginning of the clone
    clone.insertBefore(dateInfo, clone.firstChild)
    clone.insertBefore(title, clone.firstChild)

    // Make sure the signature shows in the PDF
    const signatureDataURL = document.getElementById("firmaInput").value

    if (signatureDataURL) {
      const signatureSection = clone.querySelector(".signature-container")
      const cloneCanvas = signatureSection.querySelector("canvas")

      // Replace canvas with an image of the signature
      const signatureImg = document.createElement("img")
      signatureImg.src = signatureDataURL
      signatureImg.style.width = "100%"
      signatureImg.style.maxWidth = "400px"
      signatureImg.style.border = "1px solid #dee2e6"
      signatureImg.style.borderRadius = "4px"

      if (cloneCanvas) {
        cloneCanvas.replaceWith(signatureImg)
      } else {
        signatureSection.appendChild(signatureImg)
      }
    }

    // Add the clone to the document to capture it
    document.body.appendChild(clone)

    // Initialize jsPDF
    const { jsPDF } = window.jspdf
    const pdf = new jsPDF("p", "mm", "a4")

    // A4 page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

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

    // Add uploaded images on separate pages
    const imagePreviewContainer = document.getElementById("imagePreviewContainer")
    const imagePreviews = imagePreviewContainer.querySelectorAll(".image-preview")

    if (imagePreviews.length > 0) {
      for (let i = 0; i < imagePreviews.length; i++) {
        const imgElement = imagePreviews[i]
        const imgSrc = imgElement.src
        const imgName = imgElement.getAttribute("data-name") || `Documento ${i + 1}`

        // Add a new page for each image
        pdf.addPage()

        // Add image title
        pdf.setFontSize(14)
        pdf.setTextColor(0, 86, 179)
        pdf.text(`Documento adjunto: ${imgName}`, 10, 20)

        // Create an image to get dimensions
        const img = new Image()
        img.src = imgSrc

        // Wait for the image to load
        await new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve
          // Set crossOrigin to avoid CORS issues
          img.crossOrigin = "anonymous"
        })

        // Calculate dimensions for the image
        const imgWidth = pageWidth - 20
        const imgHeight = (img.height * imgWidth) / img.width

        // Make sure the image is not taller than the page
        let finalImgHeight = imgHeight
        let finalImgWidth = imgWidth

        if (imgHeight > pageHeight - 40) {
          finalImgHeight = pageHeight - 40
          finalImgWidth = (img.width * finalImgHeight) / img.height
        }

        // Center the image horizontally
        const xOffset = (pageWidth - finalImgWidth) / 2

        // Add the image
        pdf.addImage(imgSrc, "PNG", xOffset, 30, finalImgWidth, finalImgHeight)
      }
    }

    // Save the PDF
    pdf.save(fileName)

    // Show success message with email instructions
    const successMessageElement = document.getElementById("successMessage")
    successMessageElement.innerHTML = `
      <h3>¡Formulario completado con éxito!</h3>
      <p>El PDF ha sido descargado a su dispositivo con el nombre <strong>${fileName}</strong>.</p>
      <p>Por favor, envíe este formulario a <strong>afiliaciones@conexionsalud.com.ar</strong> para completar el proceso.</p>
      <p>Gracias por utilizar nuestro servicio.</p>
    `
    successMessageElement.style.display = "block"

    // Hide the form
    document.getElementById("healthForm").style.display = "none"

    // Scroll to the message
    window.scrollTo(0, 0)

    return true
  } catch (error) {
    console.error("Error al generar el PDF:", error)
    document.getElementById("errorMessage").textContent = "Error al generar el PDF. Por favor, intente nuevamente."
    document.getElementById("errorMessage").style.display = "block"
    return false
  } finally {
    // Hide loading indicator
    document.getElementById("loadingIndicator").style.display = "none"
  }
}

// Function to handle form submission for PDF download
function handleFormSubmitForPDF(event) {
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

  // Generate and download PDF
  generateAndDownloadPDF()
}

// Export functions for use in main script
window.pdfGenerator = {
  generateAndDownloadPDF,
  handleFormSubmitForPDF,
}

