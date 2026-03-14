let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

let pendingImportedPdf = null;

const AUTO_BACKUP_DAYS = 7;

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");
const searchInput = document.getElementById("search");
const fileInput = document.getElementById("fileInput");

const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const restoreInput = document.getElementById("restoreInput");
const headerActions = document.getElementById("headerActions");

const actionSheet = document.getElementById("actionSheet");
const actionSheetBackdrop = document.getElementById("actionSheetBackdrop");
const moveActionBtn = document.getElementById("moveActionBtn");
const editActionBtn = document.getElementById("editActionBtn");
const deleteActionBtn = document.getElementById("deleteActionBtn");
const cancelActionBtn = document.getElementById("cancelActionBtn");

const pdfViewer = document.getElementById("pdfViewer");
const pdfFrame = document.getElementById("pdfFrame");
const pdfTitle = document.getElementById("pdfTitle");
const closePdfBtn = document.getElementById("closePdfBtn");
const sharePdfBtn = document.getElementById("sharePdfBtn");
const printPdfBtn = document.getElementById("printPdfBtn");

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

const moveModal = document.getElementById("moveModal");
const moveBackdrop = document.getElementById("moveBackdrop");
const closeMoveBtn = document.getElementById("closeMoveBtn");
const moveCurrentFile = document.getElementById("moveCurrentFile");
const moveFolderList = document.getElementById("moveFolderList");

const folderModal = document.getElementById("folderModal");
const folderBackdrop = document.getElementById("folderBackdrop");
const folderNameInput = document.getElementById("folderNameInput");
const folderConfirmBtn = document.getElementById("folderConfirmBtn");
const folderCancelBtn = document.getElementById("folderCancelBtn");

let currentActionTarget = null;
let currentPdfUrl = null;
let currentDeadlineFolder = null;
let currentRenameFile = null;
let currentMoveFile = null;
let currentMoveSourceFiles = null;
let currentOpenedFile = null;
let missingCountMap = new Map();
let searchTimer = null;

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
    tx.objectStore(STORE_NAME).put(pdfRecord);

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
    const request = tx.objectStore(STORE_NAME).get(id);

    request.onsuccess = function () {
      resolve(request.result || null);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function getAllPdfsFromDB() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();

    request.onsuccess = function () {
      resolve(request.result || []);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

async function clearAllPdfsFromDB() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).clear();

    request.onsuccess = function () {
      resolve();
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
    tx.objectStore(STORE_NAME).delete(id);

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

/* -------------------- BACKUP / RIPRISTINO -------------------- */

// Funzioni di backup e ripristino...

/* -------------------- CONTROLLO SCADENZE E PDF -------------------- */

function checkPdfStatus(file) {
    const fileName = file.name.toLowerCase();

    // Estrai la data di addebito dal nome del PDF (esempio: "30-03-2026 Luce 01.pdf")
    const addebitoRegex = /(\d{2}-\d{2}-\d{4})/;
    const match = fileName.match(addebitoRegex);
    if (!match) return "No Addebito Date";

    const addebitoDate = new Date(match[0].split('-').reverse().join('-')); // Converte "30-03-2026" in una data

    // Verifica la data corrente e l'addebito
    const today = new Date();
    if (today < addebitoDate) {
        return "Bollette Caricata, Addebito non Scaduto";
    } else if (today >= addebitoDate && !hasAddebitoFile(file)) {
        return "Addebito Mancante";
    } else {
        return "Bollette Caricata, Addebito Non Mancante";
    }
}

function hasAddebitoFile(file) {
    // Verifica se esiste un file con addebito associato
    const addebitoFileName = file.name.replace("Luce", "Addebito");
    return data.some(file => file.name === addebitoFileName);
}

function renderFileRow(file) {
    const status = checkPdfStatus(file);

    let label = file.name;
    if (status === "Addebito Mancante") {
        label += " (1)";
    }

    const row = createSwipeRow(
        "fileItem",
        "fileName",
        label,
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
        },
        function () {
            openMoveModal(file, files);
        }
    );

    list.appendChild(row);
}

function render() {
    backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
    pathBox.textContent = getPathNames();
    list.innerHTML = "";

    const items = getCurrentLevel();
    const files = getCurrentFiles();
    const searchText = searchInput.value.toLowerCase().trim();

    sortFolders(items);
    sortFiles(files);

    addFileBtn.style.display = currentPath.length === 0 ? "none" : "block";

    if (headerActions) {
        headerActions.style.display = currentPath.length === 0 ? "flex" : "none";
    }

    computeMissingCounts();

    renderFolders(items, searchText);
    files.forEach(renderFileRow);
}
