let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const addYearBtn = document.getElementById("addYear");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");
const searchInput = document.getElementById("search");
const fileInput = document.getElementById("fileInput");

const actionSheet = document.getElementById("actionSheet");
const actionSheetBackdrop = document.getElementById("actionSheetBackdrop");
const editActionBtn = document.getElementById("editActionBtn");
const deleteActionBtn = document.getElementById("deleteActionBtn");
const cancelActionBtn = document.getElementById("cancelActionBtn");

const pdfViewer = document.getElementById("pdfViewer");
const pdfFrame = document.getElementById("pdfFrame");
const pdfTitle = document.getElementById("pdfTitle");
const closePdfBtn = document.getElementById("closePdfBtn");

const deadlineEditor = document.getElementById("deadlineEditor");
const deadlineEditorBackdrop = document.getElementById("deadlineEditorBackdrop");
const closeDeadlineEditorBtn = document.getElementById("closeDeadlineEditorBtn");
const deadlineFolderNameInput = document.getElementById("deadlineFolderNameInput");
const deadlineLabelInput = document.getElementById("deadlineLabelInput");
const deadlineFirstDateInput = document.getElementById("deadlineFirstDateInput");
const deadlineIntervalSelect = document.getElementById("deadlineIntervalSelect");
const deadlinePrefixInput = document.getElementById("deadlinePrefixInput");
const deadlineListBox = document.getElementById("deadlineListBox");
const saveDeadlineBtn = document.getElementById("saveDeadlineBtn");
const replaceDeadlinesBtn = document.getElementById("replaceDeadlinesBtn");
const clearDeadlinesBtn = document.getElementById("clearDeadlinesBtn");

const renameModal = document.getElementById("renameModal");
const renameBackdrop = document.getElementById("renameBackdrop");
const renameInput = document.getElementById("renameInput");
const renameConfirm = document.getElementById("renameConfirm");
const renameCancel = document.getElementById("renameCancel");

let currentActionTarget = null;
let currentPdfUrl = null;
let currentDeadlineFolder = null;
let currentRenameFile = null;

/* -------------------- INDEXED DB -------------------- */

const DB_NAME = "ArchivioBolletteDB";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function savePdfToDB(pdfRecord) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(pdfRecord);

    tx.oncomplete = function () {
      resolve();
    };

    tx.onerror = function () {
      reject(tx.error);
    };
  });
}

async function getPdfFromDB(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = function () {
      resolve(request.result || null);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function deletePdfFromDB(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    tx.oncomplete = function () {
      resolve();
    };

    tx.onerror = function () {
      reject(tx.error);
    };
  });
}

function createPdfId() {
  return "pdf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}

/* -------------------- DATI LEGGERI -------------------- */

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
}

function ensureFolderStructure(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
  if (!folder.deadlines) folder.deadlines = [];
}

function isYearName(name) {
  return /^\d{4}$/.test(name);
}

function getFolderYear(folder) {
  if (!folder || !folder.name) return null;

  if (/^\d{4}$/.test(folder.name)) {
    return parseInt(folder.name, 10);
  }

  return null;
}

function sortFolders(items) {
  items.sort((a, b) => {
    const aIsYear = isYearName(a.name);
    const bIsYear = isYearName(b.name);

    if (aIsYear && bIsYear) return Number(b.name) - Number(a.name);
    if (aIsYear && !bIsYear) return -1;
    if (!aIsYear && bIsYear) return 1;

    return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  });
}

function getCurrentFolder() {
  if (currentPath.length === 0) return null;

  let level = data;
  let folder = null;

  for (let i = 0; i < currentPath.length; i++) {
    folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
  }

  return folder;
}

function getCurrentLevel() {
  let level = data;

  for (let i = 0; i < currentPath.length; i++) {
    let folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
  }

  return level;
}

function getCurrentFiles() {
  const folder = getCurrentFolder();
  if (!folder) return [];
  ensureFolderStructure(folder);
  return folder.files;
}

function getPathNames() {
  let names = ["Home"];
  let level = data;

  for (let i = 0; i < currentPath.length; i++) {
    let folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    names.push(folder.name);
    level = folder.sub;
  }

  return names.join(" / ");
}

function createFolder(name) {
  const items = getCurrentLevel();

  items.push({
    name: name.trim(),
    sub: [],
    files: [],
    deadlines: []
  });

  sortFolders(items);
  save();
  render();
}

/* -------------------- UTILITA TESTO E DATE -------------------- */

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_\-]+/g, "");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatYearMonth(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function formatDateIT(date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parseItalianDate(dateString) {
  if (!dateString) return null;

  const parts = dateString.split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (!day || !month || !year) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateForInput(itDate) {
  const date = parseItalianDate(itDate);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatInputDateToIT(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function addMonths(date, months) {
  const d = new Date(date);
  const originalDay = d.getDate();

  d.setMonth(d.getMonth() + months);

  if (d.getDate() < originalDay) {
    d.setDate(0);
  }

  return d;
}

/* -------------------- CONTROLLO PDF / SCADENZE -------------------- */

function hasRequiredPdf(folder, requiredText, extraRequiredTexts = []) {
  ensureFolderStructure(folder);

  const checks = [requiredText, ...extraRequiredTexts]
    .filter(Boolean)
    .map(text => normalizeText(text));

  if (checks.length === 0) return false;

  const foundInCurrentFolder = folder.files.some(file => {
    const fileName = normalizeText(file.name);
    return checks.some(check => fileName.includes(check));
  });

  if (foundInCurrentFolder) return true;

  for (const subFolder of folder.sub) {
    if (hasRequiredPdf(subFolder, requiredText, extraRequiredTexts)) {
      return true;
    }
  }

  return false;
}

function getDeadlineOccurrences(deadline, folder = null) {
  const result = [];

  if (!deadline) return result;
  if (!deadline.firstDueDate) return result;
  if (!deadline.intervalMonths || deadline.intervalMonths < 1) return result;

  const today = new Date();
  const firstDate = parseItalianDate(deadline.firstDueDate);

  if (!firstDate) return result;

  const folderYear = getFolderYear(folder);
  let current = new Date(firstDate);

  while (current <= today) {
    if (!folderYear || current.getFullYear() === folderYear) {
      const primaryRequiredText =
        `${deadline.requiredPrefix || ""}${formatYearMonth(current)}`;

      const extraRequiredTexts = [];

      if (deadline.intervalMonths === 12) {
        extraRequiredTexts.push(
          `${deadline.requiredPrefix || ""}${current.getFullYear()}`
        );
      }

      result.push({
        dueDate: new Date(current),
        requiredText: primaryRequiredText,
        extraRequiredTexts: extraRequiredTexts,
        label: `${deadline.label || "Scadenza"} ${formatDateIT(current)}`
      });
    }

    current = addMonths(current, deadline.intervalMonths);
  }

  return result;
}

function getMissingDeadlinesCount(folder) {
  ensureFolderStructure(folder);

  const today = new Date();
  let missing = 0;

  folder.deadlines.forEach(deadline => {
    const occurrences = getDeadlineOccurrences(deadline, folder);

    occurrences.forEach(item => {
      const due = new Date(item.dueDate);
      due.setHours(23, 59, 59, 999);

      if (
        today > due &&
        !hasRequiredPdf(folder, item.requiredText, item.extraRequiredTexts || [])
      ) {
        missing++;
      }
    });
  });

  folder.sub.forEach(subFolder => {
    missing += getMissingDeadlinesCount(subFolder);
  });

  return missing;
}

/* -------------------- ACTION SHEET -------------------- */

function openActionSheet(target) {
  currentActionTarget = target;
  actionSheet.classList.add("show");
}

function closeActionSheet() {
  currentActionTarget = null;
  actionSheet.classList.remove("show");
}

/* -------------------- PDF VIEWER -------------------- */

function closePdfViewer() {
  pdfViewer.classList.add("hidden");
  pdfFrame.src = "";
  pdfTitle.textContent = "PDF";

  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = null;
  }
}

async function openFile(file) {
  if (!file.pdfId) return;

  try {
    const pdfRecord = await getPdfFromDB(file.pdfId);

    if (!pdfRecord || !pdfRecord.data) {
      alert("PDF non trovato.");
      return;
    }

    if (currentPdfUrl) {
      URL.revokeObjectURL(currentPdfUrl);
      currentPdfUrl = null;
    }

    const blob = new Blob([pdfRecord.data], { type: "application/pdf" });
    currentPdfUrl = URL.createObjectURL(blob);

    pdfTitle.textContent = file.name || "PDF";
    pdfFrame.src = currentPdfUrl;
    pdfViewer.classList.remove("hidden");
  } catch (error) {
    alert("Errore nell'apertura del PDF.");
  }
}

/* -------------------- EDITOR MODIFICA CARTELLA -------------------- */

function renderDeadlineList(folder) {
  ensureFolderStructure(folder);

  if (folder.deadlines.length === 0) {
    deadlineListBox.innerHTML = `<div class="deadlineEmpty">Nessuna scadenza salvata</div>`;
    return;
  }

  deadlineListBox.innerHTML = folder.deadlines
    .map((d, index) => {
      return `
        <div class="deadlineItem">
          <strong>${index + 1}. ${d.label}</strong><br>
          Prima scadenza: ${d.firstDueDate}<br>
          Ripetizione: ogni ${d.intervalMonths} mese/i<br>
          Prefisso PDF: ${d.requiredPrefix || "-"}
        </div>
      `;
    })
    .join("");
}

function openDeadlineEditor(folder) {
  currentDeadlineFolder = folder;
  ensureFolderStructure(folder);

  deadlineFolderNameInput.value = folder.name || "";

  if (folder.deadlines.length > 0) {
    const firstDeadline = folder.deadlines[0];
    deadlineLabelInput.value = firstDeadline.label || folder.name || "";
    deadlineFirstDateInput.value = formatDateForInput(firstDeadline.firstDueDate);
    deadlineIntervalSelect.value = String(firstDeadline.intervalMonths || 1);
    deadlinePrefixInput.value = firstDeadline.requiredPrefix || "";
  } else {
    deadlineLabelInput.value = folder.name || "";
    deadlineFirstDateInput.value = "";
    deadlineIntervalSelect.value = "1";
    deadlinePrefixInput.value = "";
  }

  renderDeadlineList(folder);
  deadlineEditor.classList.remove("hidden");
}

function closeDeadlineEditor() {
  currentDeadlineFolder = null;
  deadlineEditor.classList.add("hidden");
}

function saveFolderEdit(replaceAll = false) {
  if (!currentDeadlineFolder) return;

  const folderName = deadlineFolderNameInput.value.trim();
  const label = deadlineLabelInput.value.trim();
  const inputDate = deadlineFirstDateInput.value;
  const intervalMonths = parseInt(deadlineIntervalSelect.value, 10);
  const prefix = deadlinePrefixInput.value.trim();

  if (!folderName) {
    alert("Inserisci il nome della cartella.");
    return;
  }

  currentDeadlineFolder.name = folderName;

  if (!inputDate && !label && !prefix) {
    save();
    render();
    renderDeadlineList(currentDeadlineFolder);
    return;
  }

  if (!label) {
    alert("Inserisci il nome della scadenza.");
    return;
  }

  if (!inputDate) {
    alert("Inserisci la prima scadenza.");
    return;
  }

  if (!intervalMonths || intervalMonths < 1) {
    alert("Intervallo mesi non valido.");
    return;
  }

  const firstDueDate = formatInputDateToIT(inputDate);

  if (!parseItalianDate(firstDueDate)) {
    alert("Data non valida.");
    return;
  }

  ensureFolderStructure(currentDeadlineFolder);

  if (replaceAll) {
    currentDeadlineFolder.deadlines = [];
  }

  if (!replaceAll && currentDeadlineFolder.deadlines.length > 0) {
    currentDeadlineFolder.deadlines[0] = {
      label: label,
      firstDueDate: firstDueDate,
      intervalMonths: intervalMonths,
      requiredPrefix: prefix
    };
  } else {
    currentDeadlineFolder.deadlines.push({
      label: label,
      firstDueDate: firstDueDate,
      intervalMonths: intervalMonths,
      requiredPrefix: prefix
    });
  }

  save();
  render();
  renderDeadlineList(currentDeadlineFolder);
}

function clearDeadlinesFromCurrentFolder() {
  if (!currentDeadlineFolder) return;

  ensureFolderStructure(currentDeadlineFolder);

  if (currentDeadlineFolder.deadlines.length === 0) {
    alert("Non ci sono scadenze da eliminare.");
    return;
  }

  const ok = confirm(
    "Vuoi eliminare tutte le scadenze di questa cartella?\nI PDF NON verranno eliminati."
  );

  if (!ok) return;

  currentDeadlineFolder.deadlines = [];
  save();
  render();
  renderDeadlineList(currentDeadlineFolder);
}

/* -------------------- RINOMINA PDF -------------------- */

function openRenameModal(file) {
  currentRenameFile = file;
  renameInput.value = file.name;
  renameModal.classList.remove("hidden");
  renameInput.focus();
}

function closeRenameModal() {
  currentRenameFile = null;
  renameModal.classList.add("hidden");
}

/* -------------------- SWIPE -------------------- */

function attachSwipe(contentEl, onSwipeLeft) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  contentEl.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
  }, { passive: true });

  contentEl.addEventListener("touchmove", function (e) {
    if (!isDragging) return;

    currentX = e.touches[0].clientX;
    let diff = currentX - startX;

    if (diff < 0) {
      diff = Math.max(diff, -80);
      contentEl.style.transform = `translateX(${diff}px)`;
    }
  }, { passive: true });

  contentEl.addEventListener("touchend", function () {
    if (!isDragging) return;

    isDragging = false;
    let diff = currentX - startX;
    contentEl.style.transform = "translateX(0)";

    if (diff < -60) {
      onSwipeLeft();
    }
  });
}

function createSwipeRow(
  mainClass,
  labelClass,
  labelHTML,
  openAction,
  editAction,
  deleteAction
) {
  const row = document.createElement("li");
  row.className = "swipeRow";

  const content = document.createElement("div");
  content.className = mainClass;

  const nameSpan = document.createElement("span");
  nameSpan.className = labelClass;
  nameSpan.innerHTML = labelHTML;
  nameSpan.onclick = function () {
    openAction();
  };

  content.appendChild(nameSpan);
  row.appendChild(content);

  attachSwipe(content, function () {
    openActionSheet({
      editAction,
      deleteAction
    });
  });

  return row;
}

/* -------------------- RENDER -------------------- */

function renderFolders(items, searchText) {
  items.forEach((item, i) => {
    ensureFolderStructure(item);

    if (searchText && !item.name.toLowerCase().includes(searchText)) return;

    let labelHTML = item.name;
    const missingCount = getMissingDeadlinesCount(item);

    if (missingCount > 0) {
      labelHTML += ` (${missingCount} mancanti)`;
    }

    const row = createSwipeRow(
      "folder",
      "folderName",
      labelHTML,
      function () {
        currentPath.push(i);
        render();
      },
      function () {
        openDeadlineEditor(item);
      },
      function () {
        const ok = confirm("Vuoi eliminare la cartella '" + item.name + "'?");
        if (!ok) return;

        items.splice(i, 1);
        save();
        render();
      }
    );

    list.appendChild(row);
  });
}

function renderFiles(files, searchText) {
  files.forEach((file, i) => {
    if (searchText && !file.name.toLowerCase().includes(searchText)) return;

    const row = createSwipeRow(
      "fileItem",
      "fileName",
      "PDF - " + file.name,
      function () {
        openFile(file);
      },
      function () {
        openRenameModal(file);
      },
      async function () {
        const ok = confirm("Vuoi eliminare il PDF '" + file.name + "'?");
        if (!ok) return;

        if (file.pdfId) {
          await deletePdfFromDB(file.pdfId);
        }

        files.splice(i, 1);
        save();
        render();
      }
    );

    list.appendChild(row);
  });
}

function render() {
  backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
  pathBox.textContent = getPathNames();
  list.innerHTML = "";

  const items = getCurrentLevel();
  const files = getCurrentFiles();
  const searchText = searchInput.value.toLowerCase().trim();

  sortFolders(items);

  addYearBtn.style.display = currentPath.length === 0 ? "none" : "block";
  addFileBtn.style.display = currentPath.length === 0 ? "none" : "block";

  renderFolders(items, searchText);
  renderFiles(files, searchText);
}

/* -------------------- EVENTI -------------------- */

addBtn.onclick = function () {
  const name = prompt("Nome cartella");
  if (!name || !name.trim()) return;

  createFolder(name);
};

addYearBtn.onclick = function () {
  if (currentPath.length === 0) {
    alert("Entra prima in una cartella principale.");
    return;
  }

  let year = prompt("Inserisci anno (es. 2026)");
  if (!year || !year.trim()) return;

  year = year.trim();

  if (!isYearName(year)) {
    alert("Inserisci un anno valido.");
    return;
  }

  const items = getCurrentLevel();

  if (items.some(item => item.name === year)) {
    alert("Questo anno esiste già.");
    return;
  }

  createFolder(year);
};

addFileBtn.onclick = function () {
  if (currentPath.length === 0) {
    alert("Entra prima in una cartella.");
    return;
  }

  fileInput.value = "";
  fileInput.click();
};

fileInput.onchange = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    alert("Puoi caricare solo file PDF.");
    fileInput.value = "";
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfId = createPdfId();

    await savePdfToDB({
      id: pdfId,
      data: arrayBuffer
    });

    const files = getCurrentFiles();

    files.push({
      name: file.name,
      type: "application/pdf",
      pdfId: pdfId
    });

    save();
    render();
  } catch (error) {
    alert("Errore nel salvataggio del PDF.");
  }
};

backBtn.onclick = function () {
  currentPath.pop();
  render();
};

searchInput.addEventListener("input", render);

editActionBtn.onclick = function () {
  if (!currentActionTarget || !currentActionTarget.editAction) return;

  const action = currentActionTarget.editAction;
  closeActionSheet();
  action();
};

deleteActionBtn.onclick = function () {
  if (!currentActionTarget || !currentActionTarget.deleteAction) return;

  const action = currentActionTarget.deleteAction;
  closeActionSheet();
  action();
};

cancelActionBtn.onclick = closeActionSheet;
actionSheetBackdrop.onclick = closeActionSheet;
closePdfBtn.onclick = closePdfViewer;

closeDeadlineEditorBtn.onclick = closeDeadlineEditor;
deadlineEditorBackdrop.onclick = closeDeadlineEditor;

saveDeadlineBtn.onclick = function () {
  saveFolderEdit(false);
};

replaceDeadlinesBtn.onclick = function () {
  const ok = confirm(
    "Vuoi sostituire tutte le scadenze con quella che stai inserendo?\nI PDF NON verranno eliminati."
  );
  if (!ok) return;

  saveFolderEdit(true);
};

clearDeadlinesBtn.onclick = function () {
  clearDeadlinesFromCurrentFolder();
};

renameConfirm.onclick = function () {
  if (!currentRenameFile) return;

  const newName = renameInput.value.trim();
  if (!newName) return;

  currentRenameFile.name = newName;
  save();
  render();
  closeRenameModal();
};

renameCancel.onclick = closeRenameModal;
renameBackdrop.onclick = closeRenameModal;

/* -------------------- AVVIO -------------------- */

render();
