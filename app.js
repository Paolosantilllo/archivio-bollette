alert("NUOVO FILE CARICATO");

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

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function getLastBackupDate() {
  return localStorage.getItem("lastBackupDate");
}

function setLastBackupDateNow() {
  localStorage.setItem("lastBackupDate", new Date().toISOString());
}

function shouldAskAutoBackup() {
  const lastBackup = getLastBackupDate();

  if (!lastBackup) return true;

  const lastDate = new Date(lastBackup);
  const now = new Date();
  const diffMs = now - lastDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= AUTO_BACKUP_DAYS;
}

function askAutoBackupIfNeeded() {
  if (!shouldAskAutoBackup()) return;

  setTimeout(() => {
    const ok = confirm(
      "Sono passati alcuni giorni dall'ultimo backup.\nVuoi creare un nuovo backup?"
    );
    if (ok) {
      exportBackup(true);
    }
  }, 500);
}

async function exportBackup(skipConfirm = false) {
  if (!skipConfirm) {
    const ok = confirm("Vuoi creare un backup dell'archivio?");
    if (!ok) return;
  }

  try {
    if (backupBtn) backupBtn.disabled = true;

    const pdfs = await getAllPdfsFromDB();

    const backup = {
      version: 1,
      createdAt: new Date().toISOString(),
      archivio: data,
      pdfs: pdfs.map(item => ({
        id: item.id,
        data: arrayBufferToBase64(item.data)
      }))
    };

    const json = JSON.stringify(backup);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const fileName =
      "backup-bollette-" +
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") +
      ".json";

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    setLastBackupDateNow();
    alert("Backup salvato con successo");
  } catch (error) {
    alert("Errore durante il backup.");
  } finally {
    if (backupBtn) backupBtn.disabled = false;
  }
}

function openRestorePicker() {
  if (!restoreInput) return;
  restoreInput.value = "";
  restoreInput.click();
}

async function importBackupFile(file) {
  if (!file) return;

  const ok = confirm(
    "Vuoi ripristinare il backup?\nI dati attuali verranno sostituiti."
  );
  if (!ok) return;

  try {
    if (restoreBtn) restoreBtn.disabled = true;

    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup || !backup.archivio || !Array.isArray(backup.pdfs)) {
      alert("File backup non valido.");
      return;
    }

    await clearAllPdfsFromDB();

    for (const pdf of backup.pdfs) {
      await savePdfToDB({
        id: pdf.id,
        data: base64ToArrayBuffer(pdf.data)
      });
    }

    data = backup.archivio;
    currentPath = [];
    save();
    render();

    alert("Backup ripristinato con successo");
  } catch (error) {
    alert("Errore durante il ripristino del backup.");
  } finally {
    if (restoreBtn) restoreBtn.disabled = false;
  }
}

/* -------------------- CONVERSIONE IMMAGINE -> PDF -------------------- */

function stringToUint8(str) {
  return new TextEncoder().encode(str);
}

function concatUint8Arrays(arrays) {
  let totalLength = 0;

  arrays.forEach(arr => {
    totalLength += arr.length;
  });

  const result = new Uint8Array(totalLength);
  let offset = 0;

  arrays.forEach(arr => {
    result.set(arr, offset);
    offset += arr.length;
  });

  return result;
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function buildPdfFromJpeg(jpegBytes, imgWidth, imgHeight) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  let drawWidth = pageWidth;
  let drawHeight = (imgHeight / imgWidth) * drawWidth;

  if (drawHeight > pageHeight) {
    drawHeight = pageHeight;
    drawWidth = (imgWidth / imgHeight) * drawHeight;
  }

  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  const contentStream =
`q
${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm
/Im0 Do
Q`;

  const contentBytes = stringToUint8(contentStream);
  const objects = [];

  objects.push(stringToUint8(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`));

  objects.push(stringToUint8(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`));

  objects.push(stringToUint8(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`));

  objects.push(
    concatUint8Arrays([
      stringToUint8(`4 0 obj
<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>
stream
`),
      jpegBytes,
      stringToUint8(`
endstream
endobj
`)
    ])
  );

  objects.push(
    concatUint8Arrays([
      stringToUint8(`5 0 obj
<< /Length ${contentBytes.length} >>
stream
`),
      contentBytes,
      stringToUint8(`
endstream
endobj
`)
    ])
  );

  const header = concatUint8Arrays([
    stringToUint8("%PDF-1.4\n"),
    new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])
  ]);

  const parts = [header];
  const offsets = [0];
  let currentOffset = header.length;

  objects.forEach(obj => {
    offsets.push(currentOffset);
    parts.push(obj);
    currentOffset += obj.length;
  });

  let xref = `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n 
`;
  }

  const xrefBytes = stringToUint8(xref);
  const startxref = currentOffset;

  const trailerBytes = stringToUint8(`trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${startxref}
%%EOF`);

  parts.push(xrefBytes);
  parts.push(trailerBytes);

  return concatUint8Arrays(parts);
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function () {
      const img = new Image();

      img.onload = function () {
        resolve(img);
      };

      img.onerror = function () {
        reject(new Error("Immagine non valida"));
      };

      img.src = reader.result;
    };

    reader.onerror = function () {
      reject(new Error("Errore lettura immagine"));
    };

    reader.readAsDataURL(file);
  });
}

async function convertImageFileToPdfArrayBuffer(file) {
  const img = await loadImageFile(file);

  const maxDimension = 2000;
  let width = img.width;
  let height = img.height;

  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  const pdfBytes = buildPdfFromJpeg(jpegBytes, width, height);

  return pdfBytes.buffer;
}

function suggestPdfNameFromPath(originalName = "") {
  const cleanOriginal = originalName.replace(/\.[^/.]+$/, "");
  const pathNames = getPathNames().split(" / ").filter(Boolean);

  let folderName = "";
  let yearName = "";

  if (pathNames.length >= 2) {
    folderName = pathNames[pathNames.length - 1];
  }

  if (pathNames.length >= 3) {
    const last = pathNames[pathNames.length - 1];
    const prev = pathNames[pathNames.length - 2];

    if (/^\d{4}$/.test(last)) {
      yearName = last;
      folderName = prev;
    }
  }

  folderName = (folderName || "documento").toLowerCase().trim();

  if (yearName) return `${folderName} ${yearName}.pdf`;
  if (cleanOriginal) return `${folderName} ${cleanOriginal}.pdf`;

  return `${folderName}.pdf`;
}

/* -------------------- BOLLETTA / ADDEBITO -------------------- */

function parseBillName(fileName) {
  if (!fileName) return null;

  const clean = fileName.replace(/\.pdf$/i, "").trim();

  // accetta: 16-03-2026 Luce 01
  const match = clean.match(/^(\d{2})-(\d{2})-(\d{4})\s+(.+?)\s+(\d{1,2})$/i);

  if (!match) return null;

  return {
    addebitoDay: match[1],
    addebitoMonth: match[2],
    addebitoYear: match[3],
    utilityName: match[4].trim(),
    billNumber: String(match[5]).padStart(2, "0")
  };
}
function buildBillDisplayName(parsed) {
  return `PROVA ${parsed.billNumber}.pdf`;
}

function buildAddebitoDisplayName(parsed) {
  return `addebito ${parsed.billNumber}.pdf`;
}

function findBillEntry(folder, billNumber) {
  ensureFolderStructure(folder);
  return folder.billEntries.find(entry => entry.billNumber === billNumber) || null;
}

function createOrUpdateBillEntry(folder, parsed, pdfId, originalFileName) {
  ensureFolderStructure(folder);

  let entry = findBillEntry(folder, parsed.billNumber);

  if (!entry) {
    entry = {
      billNumber: parsed.billNumber,
      utilityName: parsed.utilityName,
      bollettaName: buildBillDisplayName(parsed),
      addebitoName: buildAddebitoDisplayName(parsed),
      addebitoDate: `${parsed.addebitoDay}-${parsed.addebitoMonth}-${parsed.addebitoYear}`,
      bollettaPdfId: null,
      addebitoPdfId: null,
      originalBillFileName: ""
    };

    folder.billEntries.push(entry);
  }

  entry.bollettaPdfId = pdfId;
  entry.originalBillFileName = originalFileName;
  entry.bollettaName = buildBillDisplayName(parsed);
  entry.addebitoName = buildAddebitoDisplayName(parsed);
  entry.addebitoDate = `${parsed.addebitoDay}-${parsed.addebitoMonth}-${parsed.addebitoYear}`;

  return entry;
}

function parseAddebitoName(fileName) {
  if (!fileName) return null;

  const clean = fileName.replace(/\.pdf$/i, "").trim();

  // formato atteso: addebito 01
  const match = clean.match(/^addebito\s+(\d{2})$/i);
  if (!match) return null;

  return {
    billNumber: match[1]
  };
}

function saveAddebitoIntoEntry(folder, parsedAddebito, pdfId) {
  ensureFolderStructure(folder);

  let entry = findBillEntry(folder, parsedAddebito.billNumber);

  if (!entry) {
    entry = {
      billNumber: parsedAddebito.billNumber,
      utilityName: "",
      bollettaName: `bolletta ${parsedAddebito.billNumber}.pdf`,
      addebitoName: `addebito ${parsedAddebito.billNumber}.pdf`,
      addebitoDate: "",
      bollettaPdfId: null,
      addebitoPdfId: null,
      originalBillFileName: ""
    };

    folder.billEntries.push(entry);
  }

  entry.addebitoPdfId = pdfId;
  entry.addebitoName = `addebito ${parsedAddebito.billNumber}.pdf`;

  return entry;
}

function parseDDMMYYYY(dateString) {
  if (!dateString) return null;

  const match = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

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

function isAddebitoMissing(entry) {
  if (!entry || !entry.bollettaPdfId) return false;
  if (entry.addebitoPdfId) return false;
  if (!entry.addebitoDate) return false;

  const dueDate = parseDDMMYYYY(entry.addebitoDate);
  if (!dueDate) return false;

  const today = new Date();
  dueDate.setHours(23, 59, 59, 999);

  return today > dueDate;
}

/* -------------------- DATI LEGGERI -------------------- */

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
  computeMissingCounts();
  updateAppBadge();
}

function ensureFolderStructure(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
  if (!folder.deadlines) folder.deadlines = [];
  if (!folder.billEntries) folder.billEntries = [];
}

function isYearName(name) {
  return /^\d{4}$/.test(name);
}

function getFolderYear(folder) {
  if (!folder || !folder.name) return null;
  if (/^\d{4}$/.test(folder.name)) return parseInt(folder.name, 10);
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

function sortFiles(files) {
  files.sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
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
    const folder = level[currentPath[i]];
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
  const names = ["Home"];
  let level = data;

  for (let i = 0; i < currentPath.length; i++) {
    const folder = level[currentPath[i]];
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
    deadlines: [],
    billEntries: []
  });

  sortFolders(items);
  save();
  render();
}

function getFolderByPath(path) {
  if (!path || path.length === 0) return null;

  let level = data;
  let folder = null;

  for (let i = 0; i < path.length; i++) {
    folder = level[path[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
  }

  return folder;
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
  ) return null;

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
    if (hasRequiredPdf(subFolder, requiredText, extraRequiredTexts)) return true;
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

function computeMissingCounts() {
  missingCountMap = new Map();

  function walk(folder, pathKey) {
    ensureFolderStructure(folder);

    let total = 0;
    const today = new Date();

    folder.deadlines.forEach(deadline => {
      const occurrences = getDeadlineOccurrences(deadline, folder);

      occurrences.forEach(item => {
        const due = new Date(item.dueDate);
        due.setHours(23, 59, 59, 999);

        if (
          today > due &&
          !hasRequiredPdf(folder, item.requiredText, item.extraRequiredTexts || [])
        ) {
          total++;
        }
      });
    });

    folder.sub.forEach((subFolder, index) => {
      const subPathKey = pathKey + "-" + index;
      total += walk(subFolder, subPathKey);
    });

    missingCountMap.set(pathKey, total);
    return total;
  }

  data.forEach((folder, index) => {
    walk(folder, String(index));
  });
}

function getMissingCountFromMap(pathArray, localIndex) {
  const fullPath = [...pathArray, localIndex];
  const key = fullPath.join("-");
  return missingCountMap.get(key) || 0;
}

/* -------------------- ACTION SHEET -------------------- */

function openActionSheet(target) {
  currentActionTarget = target;
  moveActionBtn.style.display = target.moveAction ? "block" : "none";
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
  currentOpenedFile = null;

  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = null;
  }
}

async function openFile(file) {
  if (!file || !file.pdfId) return;

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
    currentOpenedFile = file;

    pdfTitle.textContent = file.name || "PDF";
    pdfFrame.src = currentPdfUrl;
    pdfViewer.classList.remove("hidden");
  } catch (error) {
    alert("Errore nell'apertura del PDF.");
  }
}

async function shareCurrentPdf() {
  if (!currentOpenedFile || !currentOpenedFile.pdfId) return;

  try {
    const pdfRecord = await getPdfFromDB(currentOpenedFile.pdfId);

    if (!pdfRecord || !pdfRecord.data) {
      alert("PDF non trovato.");
      return;
    }

    const blob = new Blob([pdfRecord.data], { type: "application/pdf" });
    const fileName = currentOpenedFile.name || "documento.pdf";
    const shareFile = new File([blob], fileName, { type: "application/pdf" });

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [shareFile] })
    ) {
      await navigator.share({
        files: [shareFile],
        title: fileName
      });
    } else if (navigator.share) {
      await navigator.share({
        title: fileName,
        text: fileName
      });
    } else {
      alert("Condivisione non supportata su questo dispositivo.");
    }
  } catch (error) {
    alert("Errore nella condivisione del PDF.");
  }
}

function printCurrentPdf() {
  if (!currentPdfUrl) return;

  const win = window.open(currentPdfUrl, "_blank");
  if (!win) {
    alert("Impossibile aprire la finestra di stampa.");
    return;
  }

  win.onload = function () {
    win.print();
  };
}

/* -------------------- EDITOR MODIFICA CARTELLA -------------------- */

function renderDeadlineList(folder) {
  ensureFolderStructure(folder);

  if (folder.deadlines.length === 0) {
    deadlineListBox.innerHTML = `<div class="deadlineEmpty">Nessuna scadenza salvata</div>`;
    return;
  }

  deadlineListBox.innerHTML = folder.deadlines
    .map((d, index) => `
      <div class="deadlineItem">
        <strong>${index + 1}. ${d.label}</strong><br>
        Prima scadenza: ${d.firstDueDate}<br>
        Ripetizione: ogni ${d.intervalMonths} mese/i<br>
        Prefisso PDF: ${d.requiredPrefix || "-"}
      </div>
    `)
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

  const newDeadline = {
    label: label,
    firstDueDate: firstDueDate,
    intervalMonths: intervalMonths,
    requiredPrefix: prefix
  };

  if (replaceAll) {
    currentDeadlineFolder.deadlines = [newDeadline];
  } else if (currentDeadlineFolder.deadlines.length > 0) {
    currentDeadlineFolder.deadlines[0] = newDeadline;
  } else {
    currentDeadlineFolder.deadlines.push(newDeadline);
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

  const cleanName = file.name.replace(/\.pdf$/i, "");
  renameInput.value = cleanName;
  renameModal.classList.remove("hidden");
  renameInput.focus();
}

function openRenameModalForImportedPdf(defaultName, arrayBuffer) {
  pendingImportedPdf = arrayBuffer;
  currentRenameFile = null;
  renameInput.value = defaultName.replace(/\.pdf$/i, "");
  renameModal.classList.remove("hidden");
  renameInput.focus();
}

function closeRenameModal() {
  currentRenameFile = null;
  pendingImportedPdf = null;
  renameModal.classList.add("hidden");
}

/* -------------------- NUOVA CARTELLA -------------------- */

function openFolderModal() {
  folderNameInput.value = "";
  folderModal.classList.remove("hidden");
  folderNameInput.focus();
}

function closeFolderModal() {
  folderModal.classList.add("hidden");
}

/* -------------------- SPOSTA PDF -------------------- */

function collectFolderTargets(level = data, path = [], results = []) {
  level.forEach((folder, index) => {
    ensureFolderStructure(folder);

    const newPath = [...path, index];
    results.push({
      path: newPath,
      label: ["Home", ...newPath.map((_, i) => {
        const partial = newPath.slice(0, i + 1);
        return getFolderByPath(partial).name;
      })].join(" / ")
    });

    collectFolderTargets(folder.sub, newPath, results);
  });

  return results;
}

function openMoveModal(file, sourceFiles) {
  currentMoveFile = file;
  currentMoveSourceFiles = sourceFiles;

  moveCurrentFile.textContent = "PDF selezionato: " + file.name;

  const targets = collectFolderTargets();

  if (targets.length === 0) {
    moveFolderList.innerHTML = `<div class="deadlineEmpty">Nessuna cartella disponibile</div>`;
  } else {
    moveFolderList.innerHTML = targets
      .map((target, index) => `<button class="moveFolderItem" data-move-index="${index}">${target.label}</button>`)
      .join("");

    const buttons = moveFolderList.querySelectorAll(".moveFolderItem");
    buttons.forEach((btn, index) => {
      btn.onclick = function () {
        movePdfToTarget(targets[index].path);
      };
    });
  }

  moveModal.classList.remove("hidden");
}

function closeMoveModal() {
  currentMoveFile = null;
  currentMoveSourceFiles = null;
  moveModal.classList.add("hidden");
}

function movePdfToTarget(targetPath) {
  if (!currentMoveFile || !currentMoveSourceFiles) return;

  const targetFolder = getFolderByPath(targetPath);
  if (!targetFolder) return;

  ensureFolderStructure(targetFolder);

  const alreadyExists = targetFolder.files.some(file => file.pdfId === currentMoveFile.pdfId);
  if (alreadyExists) {
    alert("Questo PDF è già presente nella cartella scelta.");
    return;
  }

  const index = currentMoveSourceFiles.findIndex(file => file.pdfId === currentMoveFile.pdfId);
  if (index === -1) return;

  const fileToMove = currentMoveSourceFiles[index];
  currentMoveSourceFiles.splice(index, 1);
  targetFolder.files.push(fileToMove);

  save();
  render();
  closeMoveModal();
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
    const diff = currentX - startX;
    contentEl.style.transform = "translateX(0)";

    if (diff < -60) onSwipeLeft();
  });
}

function createSwipeRow(
  mainClass,
  labelClass,
  labelHTML,
  openAction,
  editAction,
  deleteAction,
  moveAction = null
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
      deleteAction,
      moveAction
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
    const missingCount = getMissingCountFromMap(currentPath, i);

    if (missingCount > 0) {
      labelHTML += ` <span class="missingCount">(${missingCount})</span>`;
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

function renderBillEntries(folder, searchText) {
  ensureFolderStructure(folder);

  folder.billEntries.sort((a, b) => {
    return a.billNumber.localeCompare(b.billNumber, "it", { sensitivity: "base" });
  });

  folder.billEntries.forEach((entry) => {
    const labelBase = entry.bollettaName.replace(/\.pdf$/i, "");

    if (searchText && !labelBase.toLowerCase().includes(searchText)) return;

    let labelHTML = labelBase;

    if (!entry.bollettaPdfId || isAddebitoMissing(entry)) {
      labelHTML += ` <span class="missingCount">(1)</span>`;
    }

    const fakeFile = {
      name: entry.bollettaName,
      pdfId: entry.bollettaPdfId
    };

    const row = createSwipeRow(
      "fileItem",
      "fileName",
      labelHTML,
      function () {
        if (entry.bollettaPdfId) {
          openFile(fakeFile);
        } else {
          alert("La bolletta non è ancora stata caricata.");
        }
      },
      function () {
        alert(
          "Voce collegata:\n- " +
          entry.bollettaName +
          "\n- " +
          entry.addebitoName +
          (entry.addebitoDate ? "\nData addebito: " + entry.addebitoDate : "")
        );
      },
      async function () {
        const ok = confirm("Vuoi eliminare la voce '" + labelBase + "'?");
        if (!ok) return;

        if (entry.bollettaPdfId) {
          await deletePdfFromDB(entry.bollettaPdfId);
        }

        if (entry.addebitoPdfId) {
          await deletePdfFromDB(entry.addebitoPdfId);
        }

        const index = folder.billEntries.indexOf(entry);
        if (index !== -1) {
          folder.billEntries.splice(index, 1);
        }

        save();
        render();
      }
    );

    list.appendChild(row);
  });
}

function renderFiles(files, searchText) {
  files.forEach((file, i) => {
    if (parseBillName(file.name) || parseAddebitoName(file.name)) return;

    if (searchText && !file.name.toLowerCase().includes(searchText)) return;

    const row = createSwipeRow(
      "fileItem",
      "fileName",
      file.name.replace(/\.pdf$/i, ""),
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
  });
}

function render() {
  if (backBtn) {
    backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
  }

  if (pathBox) {
    pathBox.textContent = getPathNames();
  }

  if (list) {
    list.innerHTML = "";
  }

  const items = getCurrentLevel();
  const files = getCurrentFiles();
  const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";

  sortFolders(items);
  sortFiles(files);

  if (addFileBtn) {
    addFileBtn.style.display = currentPath.length === 0 ? "none" : "block";
  }

  if (headerActions) {
    headerActions.style.display = currentPath.length === 0 ? "flex" : "none";
  }

  computeMissingCounts();

  renderFolders(items, searchText);

  const currentFolder = getCurrentFolder();
  if (currentFolder) {
    renderBillEntries(currentFolder, searchText);
  }

  renderFiles(files, searchText);
}

/* -------------------- EVENTI -------------------- */

if (addBtn) {
  addBtn.onclick = function () {
    openFolderModal();
  };
}

if (addFileBtn) {
  addFileBtn.onclick = function () {
    if (currentPath.length === 0) {
      alert("Entra prima in una cartella.");
      return;
    }

    fileInput.value = "";
    fileInput.click();
  };
}

if (fileInput) {
  fileInput.onchange = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      alert("Puoi caricare solo PDF, foto o screenshot.");
      fileInput.value = "";
      return;
    }

    try {
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfId = createPdfId();

        await savePdfToDB({
          id: pdfId,
          data: arrayBuffer
        });

        const folder = getCurrentFolder();

        if (folder) {
          const parsedBill = parseBillName(file.name);
          const parsedAddebito = parseAddebitoName(file.name);

if (parsedBill) {
  createOrUpdateBillEntry(folder, parsedBill, pdfId, file.name);
  alert("Bolletta riconosciuta: " + parsedBill.billNumber);
} else if (parsedAddebito) {
            saveAddebitoIntoEntry(folder, parsedAddebito, pdfId);
          } else {
            const files = getCurrentFiles();

            files.push({
              name: file.name,
              type: "application/pdf",
              pdfId: pdfId
            });
          }
        } else {
          const files = getCurrentFiles();

          files.push({
            name: file.name,
            type: "application/pdf",
            pdfId: pdfId
          });
        }

        save();
        render();
      } else {
        const arrayBuffer = await convertImageFileToPdfArrayBuffer(file);
        const savedName = suggestPdfNameFromPath(file.name);
        openRenameModalForImportedPdf(savedName, arrayBuffer);
      }
    } catch (error) {
      alert("Errore nel salvataggio del file.");
    } finally {
      fileInput.value = "";
    }
  };
}

if (backBtn) {
  backBtn.onclick = function () {
    currentPath.pop();
    render();
  };
}

if (searchInput) {
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });
}

if (moveActionBtn) {
  moveActionBtn.onclick = function () {
    if (!currentActionTarget || !currentActionTarget.moveAction) return;
    const action = currentActionTarget.moveAction;
    closeActionSheet();
    action();
  };
}

if (editActionBtn) {
  editActionBtn.onclick = function () {
    if (!currentActionTarget || !currentActionTarget.editAction) return;
    const action = currentActionTarget.editAction;
    closeActionSheet();
    action();
  };
}

if (deleteActionBtn) {
  deleteActionBtn.onclick = function () {
    if (!currentActionTarget || !currentActionTarget.deleteAction) return;
    const action = currentActionTarget.deleteAction;
    closeActionSheet();
    action();
  };
}

if (cancelActionBtn) cancelActionBtn.onclick = closeActionSheet;
if (actionSheetBackdrop) actionSheetBackdrop.onclick = closeActionSheet;

if (closePdfBtn) closePdfBtn.onclick = closePdfViewer;
if (sharePdfBtn) sharePdfBtn.onclick = shareCurrentPdf;
if (printPdfBtn) printPdfBtn.onclick = printCurrentPdf;

if (closeDeadlineEditorBtn) closeDeadlineEditorBtn.onclick = closeDeadlineEditor;
if (deadlineEditorBackdrop) deadlineEditorBackdrop.onclick = closeDeadlineEditor;

if (saveDeadlineBtn) {
  saveDeadlineBtn.onclick = function () {
    saveFolderEdit(false);
  };
}

if (replaceDeadlinesBtn) {
  replaceDeadlinesBtn.onclick = function () {
    const ok = confirm(
      "Vuoi sostituire tutte le scadenze con quella che stai inserendo?\nI PDF NON verranno eliminati."
    );
    if (!ok) return;
    saveFolderEdit(true);
  };
}

if (clearDeadlinesBtn) {
  clearDeadlinesBtn.onclick = function () {
    clearDeadlinesFromCurrentFolder();
  };
}

if (renameConfirm) {
  renameConfirm.onclick = async function () {
    const newName = renameInput.value.trim();
    if (!newName) return;

    const finalName = newName.toLowerCase().endsWith(".pdf")
      ? newName
      : newName + ".pdf";

    if (pendingImportedPdf) {
      try {
        const pdfId = createPdfId();

        await savePdfToDB({
          id: pdfId,
          data: pendingImportedPdf
        });

        const files = getCurrentFiles();

        files.push({
          name: finalName,
          type: "application/pdf",
          pdfId: pdfId
        });

        pendingImportedPdf = null;

        save();
        render();
        closeRenameModal();
        return;
      } catch (error) {
        alert("Errore nel salvataggio del PDF.");
        return;
      }
    }

    if (!currentRenameFile) return;

    currentRenameFile.name = finalName;
    save();
    render();
    closeRenameModal();
  };
}

if (renameCancel) renameCancel.onclick = closeRenameModal;
if (renameBackdrop) renameBackdrop.onclick = closeRenameModal;

if (closeMoveBtn) closeMoveBtn.onclick = closeMoveModal;
if (moveBackdrop) moveBackdrop.onclick = closeMoveModal;

if (folderConfirmBtn) {
  folderConfirmBtn.onclick = function () {
    const name = folderNameInput.value.trim();
    if (!name) return;

    createFolder(name);
    closeFolderModal();
  };
}

if (folderCancelBtn) folderCancelBtn.onclick = closeFolderModal;
if (folderBackdrop) folderBackdrop.onclick = closeFolderModal;

if (backupBtn) backupBtn.onclick = function () { exportBackup(false); };
if (restoreBtn) restoreBtn.onclick = openRestorePicker;

if (restoreInput) {
  restoreInput.onchange = function (event) {
    const file = event.target.files[0];
    importBackupFile(file);
  };
}

/* -------------------- BADGE APP -------------------- */

function updateAppBadge() {
  let totalMissing = 0;

  data.forEach((folder, index) => {
    totalMissing += missingCountMap.get(String(index)) || 0;
  });

  if ("setAppBadge" in navigator) {
    if (totalMissing > 0) {
      navigator.setAppBadge(totalMissing);
    } else if ("clearAppBadge" in navigator) {
      navigator.clearAppBadge();
    }
  }
}

/* -------------------- AVVIO -------------------- */

computeMissingCounts();
render();
updateAppBadge();
askAutoBackupIfNeeded();
