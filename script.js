// Array to store pinned content
let pinnedContent = [];
let nextId = 1; // Simple ID counter for unique items
let itemToDeleteId = null; // To store the ID of the item to be deleted via modal

// --- DOM Elements ---
const contentTitleInput = document.getElementById("contentTitle");
const contentToPinInput = document.getElementById("contentToPin");
const contentFileInput = document.getElementById("contentFile");
const pinContentBtn = document.getElementById("pinContentBtn");
const searchQueryInput = document.getElementById("searchQuery");
const searchBtn = document.getElementById("searchBtn");
const pinnedContentDisplay = document.getElementById("pinnedContentDisplay");
const searchResultsDisplay = document.getElementById("searchResultsDisplay");
const noContentMessage = document.getElementById("noContentMessage");
const noResultsMessage = document.getElementById("noResultsMessage");
const searchLoadingSpinner = document.getElementById("searchLoading");

// Delete All Pinned Items button
const deleteAllPinnedBtn = document.getElementById("deleteAllPinnedBtn");

// Modal Elements
const confirmDeleteModal = new bootstrap.Modal(
  document.getElementById("confirmDeleteModal")
);
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const confirmDeleteAllModal = new bootstrap.Modal(
  document.getElementById("confirmDeleteAllModal")
); // New modal for delete all
const confirmDeleteAllBtn = document.getElementById("confirmDeleteAllBtn"); // New button for delete all

// --- Helper Functions (Defined FIRST to avoid 'not defined' errors) ---

// Function to save content to local storage
function saveContent() {
  localStorage.setItem("pinnedContent", JSON.stringify(pinnedContent));
  localStorage.setItem("nextId", nextId.toString()); // Ensure nextId is stored as a string
}

// Function to display a pinned item (card)
function createPinnedItemCard(item) {
  const cardCol = document.createElement("div");
  cardCol.className = "col-md-6 col-lg-4 animate__animated animate__fadeInUp"; // Bootstrap columns, responsive CSS will override
  cardCol.setAttribute("data-id", item.id);

  const card = document.createElement("div");
  card.className = "card pinned-item-card h-100"; // h-100 makes cards equal height in a row

  const cardBody = document.createElement("div");
  cardBody.className = "card-body d-flex flex-column";

  const cardTitle = document.createElement("h5");
  cardTitle.className = "card-title";
  cardTitle.textContent = item.title || `Untitled Item #${item.id}`; // Fallback title

  const cardText = document.createElement("p");
  cardText.className = "card-text mb-auto"; // mb-auto pushes delete button to bottom
  // Display full content and allow scrolling, as per the design request
  cardText.textContent = item.content;
  // Ensure content is pre-wrapped to respect newlines from input
  cardText.style.whiteSpace = "pre-wrap";
  cardText.style.maxHeight = "300px"; // Limit height for readability, scroll if more
  cardText.style.overflowY = "auto"; // Enable scrollbar

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-outline-danger btn-sm mt-3 align-self-start"; // align-self-start keeps button to left
  deleteBtn.innerHTML = '<i class="fas fa-trash-alt me-1"></i> Delete';
  deleteBtn.onclick = () => {
    itemToDeleteId = item.id;
    confirmDeleteModal.show();
  };

  cardBody.appendChild(cardTitle);
  cardBody.appendChild(cardText);
  cardBody.appendChild(deleteBtn);
  card.appendChild(cardBody);
  cardCol.appendChild(card);
  return cardCol;
}

// Function to render all pinned content
function renderPinnedContent() {
  pinnedContentDisplay.innerHTML = "";
  if (pinnedContent.length === 0) {
    noContentMessage.style.display = "block";
    deleteAllPinnedBtn.classList.add("d-none"); // Hide delete all button if no content
  } else {
    noContentMessage.style.display = "none";
    deleteAllPinnedBtn.classList.remove("d-none"); // Show delete all button if content exists
    pinnedContent.forEach((item) => {
      pinnedContentDisplay.appendChild(createPinnedItemCard(item));
    });
  }
}

// Function to display search result card
function createSearchResultCard(item, highlightedFullContent) {
  const cardCol = document.createElement("div");
  cardCol.className = "col-md-6 col-lg-4 animate__animated animate__fadeInUp"; // Bootstrap columns, responsive CSS will override
  cardCol.setAttribute("data-id", item.id);

  const card = document.createElement("div");
  card.className = "card pinned-item-card h-100 search-result-card"; // Added search-result-card class

  const cardBody = document.createElement("div");
  cardBody.className = "card-body";

  const cardTitle = document.createElement("h5");
  cardTitle.className = "card-title";
  cardTitle.innerHTML = item.title || `Untitled Item #${item.id}`; // Use innerHTML for highlighted title

  const cardText = document.createElement("p");
  cardText.className = "card-text full-content-display"; // Added full-content-display class
  cardText.innerHTML = highlightedFullContent; // Now contains the full, highlighted content

  cardBody.appendChild(cardTitle);
  cardBody.appendChild(cardText);
  card.appendChild(cardBody);
  cardCol.appendChild(card);
  return cardCol;
}

// Function to load content from local storage
function loadContent() {
  const storedContent = localStorage.getItem("pinnedContent");
  const storedNextId = localStorage.getItem("nextId");

  if (storedContent) {
    try {
      // Parse the stored content. If it fails, treat as empty.
      pinnedContent = JSON.parse(storedContent);
      // Ensure nextId is correctly parsed as an integer.
      // If storedNextId is null/undefined or invalid, default to 1 or max ID + 1.
      if (storedNextId && !isNaN(parseInt(storedNextId, 10))) {
        nextId = parseInt(storedNextId, 10);
      } else if (pinnedContent.length > 0) {
        // If nextId wasn't stored or was invalid, calculate it from existing items
        nextId = Math.max(...pinnedContent.map((item) => item.id)) + 1;
      } else {
        nextId = 1; // Default if no content and no valid stored nextId
      }
    } catch (e) {
      console.error("Error parsing stored content from localStorage:", e);
      pinnedContent = []; // Clear content if parsing fails
      nextId = 1; // Reset nextId
      localStorage.removeItem("pinnedContent"); // Clear bad data
      localStorage.removeItem("nextId"); // Clear bad data
      showAlert(
        "Corrupted data found in local storage and has been cleared.",
        "danger"
      );
    }
  } else {
    pinnedContent = []; // No stored content
    nextId = 1; // Start from 1
  }
  renderPinnedContent(); // Render content after loading
}

// --- Advanced PDF Text Extraction Function (using PDF.js) ---
async function extractTextFromPdf(file) {
  if (typeof pdfjsLib === "undefined" || !pdfjsLib.getDocument) {
    console.error(
      "PDF.js library is not loaded or pdfjsLib.getDocument is not available. Cannot extract text from PDF."
    );
    showAlert(
      "PDF.js library failed to load. Cannot extract text from PDF.",
      "danger"
    );
    return null;
  }

  try {
    // Ensure the file is a Blob or File object for URL.createObjectURL
    const fileUrl = URL.createObjectURL(file);
    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((s) => s.str).join(" ");
      fullText += pageText + "\n";
    }
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(fileUrl);

    if (fullText.length === 0) {
      console.warn("Extracted text is empty. PDF might be scanned or empty.");
    }
    return fullText;
  } catch (error) {
    console.error("Error during PDF text extraction:", error);
    showAlert(
      "Failed to extract text from PDF. It might be scanned or corrupted.",
      "danger"
    );
    return null;
  }
}

// Function to show an alert message (e.g., success, error)
function showAlert(message, type = "success") {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3 animate__animated animate__fadeInDown`;
  alertDiv.role = "alert";
  let icon = "";
  if (type === "success") icon = '<i class="fas fa-check-circle me-2"></i>';
  else if (type === "danger")
    icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
  else if (type === "info") icon = '<i class="fas fa-info-circle me-2"></i>';
  else if (type === "warning")
    icon = '<i class="fas fa-exclamation-circle me-2"></i>';

  alertDiv.innerHTML = `${icon} ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;

  // Add alert to the main content area (e.g., before the first section)
  document.querySelector("main").prepend(alertDiv);

  setTimeout(() => {
    // Only try to remove if it still exists (might have been dismissed by user)
    if (alertDiv && alertDiv.parentNode) {
      alertDiv.classList.add("animate__fadeOutUp");
      alertDiv.addEventListener("animationend", () => alertDiv.remove());
    }
  }, 3000); // Fade out after 3 seconds
}

// --- Event Handlers (Defined after Helper Functions) ---

// Pin Content Button Click
pinContentBtn.addEventListener("click", async () => {
  let content = contentToPinInput.value.trim();
  let title = contentTitleInput.value.trim();
  const file = contentFileInput.files[0];

  // Clear any previous alerts before showing new ones
  document.querySelectorAll(".alert").forEach((alert) => alert.remove());

  if (!content && !file) {
    showAlert("Please paste some text or select a file to pin.", "warning");
    return;
  }

  if (file) {
    if (file.type === "application/pdf") {
      showAlert("Processing PDF file. Please wait...", "info");

      const pdfText = await extractTextFromPdf(file);

      // Remove previous info alert specifically
      const existingInfoAlert = document.querySelector(".alert-info");
      if (existingInfoAlert) existingInfoAlert.remove(); // This removes the spinner alert

      if (pdfText) {
        content = pdfText;
        title =
          title ||
          file.name.split(".").slice(0, -1).join(".") ||
          `PDF Document (${file.name})`;
        showAlert("PDF text extracted successfully!", "success");
      } else {
        // If PDF extraction fails, use a placeholder content and show warning
        content = `[PDF: ${file.name} - Text extraction failed or file is scanned. Searching will be limited to title.]`;
        title =
          title ||
          file.name.split(".").slice(0, -1).join(".") ||
          `PDF Document`;
        showAlert(
          "Could not extract searchable text from PDF. Searching might be limited.",
          "warning"
        );
      }
    } else if (file.type === "text/plain") {
      try {
        content = await file.text();
        title =
          title ||
          file.name.split(".").slice(0, -1).join(".") ||
          `Text Document`;
        showAlert("Text file loaded successfully!", "success");
      } catch (error) {
        showAlert("Failed to read text file. Please try again.", "danger");
        return;
      }
    } else {
      showAlert(
        "Unsupported file type. Please upload a .txt or .pdf file.",
        "warning"
      );
      return;
    }
  }

  if (!content) {
    showAlert(
      "Could not get content. Please try pasting text or upload a valid file.",
      "danger"
    );
    return;
  }

  const newItem = {
    id: nextId++, // Use and then increment
    title: title,
    content: content,
    type: file ? file.type : "text/plain",
    timestamp: new Date().toISOString(),
  };

  pinnedContent.unshift(newItem); // Add new item to the beginning
  saveContent(); // Save after adding new item
  renderPinnedContent();

  contentToPinInput.value = "";
  contentTitleInput.value = "";
  contentFileInput.value = "";

  showAlert(`Content "${newItem.title}" pinned successfully!`, "success");
});

// Search Button Click
searchBtn.addEventListener("click", () => {
  const query = searchQueryInput.value.trim().toLowerCase();
  searchResultsDisplay.innerHTML = "";
  noResultsMessage.style.display = "none";

  if (query === "") {
    noResultsMessage.textContent = "Please enter a search query.";
    noResultsMessage.style.display = "block";
    return;
  }

  searchLoadingSpinner.classList.remove("d-none");

  setTimeout(() => {
    const results = [];
    // Perform search on the current pinnedContent array
    pinnedContent.forEach((item) => {
      const itemContentLower = item.content.toLowerCase();
      const itemTitleLower = item.title ? item.title.toLowerCase() : "";

      if (itemContentLower.includes(query) || itemTitleLower.includes(query)) {
        let fullHighlightedContent = item.content;

        // Create a regex for global, case-insensitive search
        const queryRegex = new RegExp(query, "gi");
        fullHighlightedContent = fullHighlightedContent.replace(
          queryRegex,
          (match) => `<span class="search-highlight">${match}</span>`
        );

        let itemTitleForDisplay = item.title || `Untitled Item #${item.id}`;
        if (itemTitleLower.includes(query)) {
          itemTitleForDisplay = itemTitleForDisplay.replace(
            queryRegex,
            (match) => `<span class="search-highlight">${match}</span>`
          );
        }

        results.push({
          item: { ...item, title: itemTitleForDisplay }, // Pass item with highlighted title
          highlightedContent: fullHighlightedContent,
        });
      }
    });

    searchLoadingSpinner.classList.add("d-none");

    if (results.length === 0) {
      noResultsMessage.textContent = `No results found for "${query}". Please try a different query.`;
      noResultsMessage.style.display = "block";
      searchResultsDisplay.innerHTML = ""; // Ensure no old results remain
    } else {
      noResultsMessage.style.display = "none"; // Hide "No search results" if results found
      results.forEach((result) => {
        searchResultsDisplay.appendChild(
          createSearchResultCard(result.item, result.highlightedContent)
        );
      });
    }
  }, 800); // Simulate network delay for search
});

// Clear query on search bar when empty
searchQueryInput.addEventListener("input", () => {
  if (searchQueryInput.value.trim() === "") {
    searchResultsDisplay.innerHTML = "";
    noResultsMessage.style.display = "block";
    noResultsMessage.textContent =
      "No search results to display yet. Type your query above!";
  }
});

// Confirm Single Item Delete Button in Modal
confirmDeleteBtn.addEventListener("click", () => {
  if (itemToDeleteId !== null) {
    pinnedContent = pinnedContent.filter((item) => item.id !== itemToDeleteId);
    saveContent(); // Save changes after deletion
    renderPinnedContent(); // Re-render the pinned items display
    searchResultsDisplay.innerHTML = ""; // Clear search results after deletion
    noResultsMessage.style.display = "block"; // Show empty search results message
    noResultsMessage.textContent =
      "No search results to display yet. Type your query above!";
    itemToDeleteId = null; // Reset for next deletion
    confirmDeleteModal.hide(); // Hide the modal
    showAlert("Item deleted successfully!", "success");
  }
});

// Event Listener for Delete All Pinned Items button
deleteAllPinnedBtn.addEventListener("click", () => {
  if (pinnedContent.length === 0) {
    showAlert("There are no items to delete.", "info");
    return;
  }
  confirmDeleteAllModal.show(); // Show the confirmation modal
});

// Confirm Delete ALL Pinned Items Button in Modal
confirmDeleteAllBtn.addEventListener("click", () => {
  pinnedContent = []; // Clear the array
  nextId = 1; // Reset ID counter
  saveContent(); // Save the empty array
  renderPinnedContent(); // Re-render the display (will show 'no content message')
  searchResultsDisplay.innerHTML = ""; // Clear search results
  noResultsMessage.style.display = "block";
  noResultsMessage.textContent =
    "No search results to display yet. Type your query above!";
  confirmDeleteAllModal.hide(); // Hide the modal
  showAlert("All pinned items have been deleted!", "success");
});

// --- Initial Load (Executed Last, after all functions are defined) ---
// This line ensures loadContent() runs as soon as the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", loadContent);
