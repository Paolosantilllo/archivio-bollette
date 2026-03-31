let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

let pendingImportedPdf = null;

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

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
  computeMissingCounts();
  updateAppBadge();
}
/* -------------------- BACKUP / RIPRISTINO -------------------- */

function ensureFolderStructure(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
  if (!folder.deadlines) folder.deadlines = [];
}
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;

function isYearName(name) {
  return /^\d{4}$/.test(name);
}
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

function getFolderYear(folder) {
  if (!folder || !folder.name) return null;
  if (/^\d{4}$/.test(folder.name)) return parseInt(folder.name, 10);
  return null;
  return btoa(binary);
}

function sortFolders(items) {
  items.sort((a, b) => {
    const aIsYear = isYearName(a.name);
    const bIsYear = isYearName(b.name);
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

    if (aIsYear && bIsYear) return Number(b.name) - Number(a.name);
    if (aIsYear && !bIsYear) return -1;
    if (!aIsYear && bIsYear) return 1;
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

    return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  });
  return bytes.buffer;
}

function sortFiles(files) {
  files.sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
}
async function exportBackup() {
  try {
    if (backupBtn) backupBtn.disabled = true;

function getCurrentFolder() {
  if (currentPath.length === 0) return null;
    const pdfs = await getAllPdfsFromDB();

  let level = data;
  let folder = null;
    const backup = {
      version: 1,
      createdAt: new Date().toISOString(),
      archivio: data,
      pdfs: pdfs.map(item => ({
        id: item.id,
        data: arrayBufferToBase64(item.data)
      }))
    };

  for (let i = 0; i < currentPath.length; i++) {
    folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
  }
    const json = JSON.stringify(backup);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

  return folder;
}
    const now = new Date();
    const fileName =
      "backup-bollette-" +
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") +
      ".json";

function getCurrentLevel() {
  let level = data;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

  for (let i = 0; i < currentPath.length; i++) {
    const folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
  }
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

  return level;
    alert("Backup creato. Salvalo nell'app File del tuo iPhone.");
  } catch (error) {
    alert("Errore durante il backup.");
  } finally {
    if (backupBtn) backupBtn.disabled = false;
  }
}

function getCurrentFiles() {
  const folder = getCurrentFolder();
  if (!folder) return [];
  ensureFolderStructure(folder);
  return folder.files;
function openRestorePicker() {
  if (!restoreInput) return;
  restoreInput.value = "";
  restoreInput.click();
}

function getPathNames() {
  const names = ["Home"];
  let level = data;
async function importBackupFile(file) {
  if (!file) return;

  for (let i = 0; i < currentPath.length; i++) {
    const folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    names.push(folder.name);
    level = folder.sub;
  }
  const ok = confirm(
    "Vuoi ripristinare questo backup?\nL'archivio attuale verrà sostituito completamente."
  );
  if (!ok) return;

  return names.join(" / ");
}
  try {
    if (restoreBtn) restoreBtn.disabled = true;

function createFolder(name) {
  const items = getCurrentLevel();
    const text = await file.text();
    const backup = JSON.parse(text);

  items.push({
    name: name.trim(),
    sub: [],
    files: [],
    deadlines: []
  });
    if (!backup || !backup.archivio || !Array.isArray(backup.pdfs)) {
      alert("File backup non valido.");
      return;
    }

  sortFolders(items);
  save();
  render();
}
    await clearAllPdfsFromDB();

function getFolderByPath(path) {
  if (!path || path.length === 0) return null;
    for (const pdf of backup.pdfs) {
      await savePdfToDB({
        id: pdf.id,
        data: base64ToArrayBuffer(pdf.data)
      });
    }

  let level = data;
  let folder = null;
    data = backup.archivio;
    currentPath = [];
    save();
    render();

  for (let i = 0; i < path.length; i++) {
    folder = level[path[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
    alert("Backup ripristinato con successo.");
  } catch (error) {
    alert("Errore durante il ripristino del backup.");
  } finally {
    if (restoreBtn) restoreBtn.disabled = false;
}

  return folder;
}

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
/* -------------------- CONVERSIONE IMMAGINE -> PDF -------------------- */

function formatDateIT(date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
function stringToUint8(str) {
  return new TextEncoder().encode(str);
}

function parseItalianDate(dateString) {
  if (!dateString) return null;

  const parts = dateString.split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
function concatUint8Arrays(arrays) {
  let totalLength = 0;

  if (!day || !month || !year) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  arrays.forEach(arr => {
    totalLength += arr.length;
  });

  const date = new Date(year, month - 1, day);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  arrays.forEach(arr => {
    result.set(arr, offset);
    offset += arr.length;
  });

  return date;
  return result;
}

function formatDateForInput(itDate) {
  const date = parseItalianDate(itDate);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

function formatInputDateToIT(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function addMonths(date, months) {
  const d = new Date(date);
  const originalDay = d.getDate();
function buildPdfFromJpeg(jpegBytes, imgWidth, imgHeight) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  d.setMonth(d.getMonth() + months);
  let drawWidth = pageWidth;
  let drawHeight = (imgHeight / imgWidth) * drawWidth;

  if (d.getDate() < originalDay) {
    d.setDate(0);
  if (drawHeight > pageHeight) {
    drawHeight = pageHeight;
    drawWidth = (imgWidth / imgHeight) * drawHeight;
}

  return d;
}
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

function hasRequiredPdf(folder, requiredText, extraRequiredTexts = []) {
  ensureFolderStructure(folder);
  const contentStream =
`q
${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm
/Im0 Do
Q`;

  const checks = [requiredText, ...extraRequiredTexts]
    .filter(Boolean)
    .map(text => normalizeText(text));
  const contentBytes = stringToUint8(contentStream);
  const objects = [];

  if (checks.length === 0) return false;
  objects.push(stringToUint8(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`));

  const foundInCurrentFolder = folder.files.some(file => {
    const fileName = normalizeText(file.name);
    return checks.some(check => fileName.includes(check));
  });
  objects.push(stringToUint8(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`));

  if (foundInCurrentFolder) return true;
  objects.push(stringToUint8(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`));

  for (const subFolder of folder.sub) {
    if (hasRequiredPdf(subFolder, requiredText, extraRequiredTexts)) return true;
  }
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

  return false;
}
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

function getDeadlineOccurrences(deadline, folder = null) {
  const result = [];
  const header = concatUint8Arrays([
    stringToUint8("%PDF-1.4\n"),
    new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])
  ]);

  if (!deadline) return result;
  if (!deadline.firstDueDate) return result;
  if (!deadline.intervalMonths || deadline.intervalMonths < 1) return result;
  const parts = [header];
  const offsets = [0];
  let currentOffset = header.length;

  const today = new Date();
  const firstDate = parseItalianDate(deadline.firstDueDate);
  if (!firstDate) return result;
  objects.forEach(obj => {
    offsets.push(currentOffset);
    parts.push(obj);
    currentOffset += obj.length;
  });

  const folderYear = getFolderYear(folder);
  let current = new Date(firstDate);
  let xref = `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

  while (current <= today) {
    if (!folderYear || current.getFullYear() === folderYear) {
      const primaryRequiredText = `${deadline.requiredPrefix || ""}${formatYearMonth(current)}`;
      const extraRequiredTexts = [];
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n 
`;
  }

      if (deadline.intervalMonths === 12) {
        extraRequiredTexts.push(`${deadline.requiredPrefix || ""}${current.getFullYear()}`);
      }
  const xrefBytes = stringToUint8(xref);
  const startxref = currentOffset;

      result.push({
        dueDate: new Date(current),
        requiredText: primaryRequiredText,
        extraRequiredTexts: extraRequiredTexts,
        label: `${deadline.label || "Scadenza"} ${formatDateIT(current)}`
      });
    }
  const trailerBytes = stringToUint8(`trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${startxref}
%%EOF`);

    current = addMonths(current, deadline.intervalMonths);
  }
  parts.push(xrefBytes);
  parts.push(trailerBytes);

  return result;
  return concatUint8Arrays(parts);
}

function computeMissingCounts() {
  missingCountMap = new Map();
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

  function walk(folder, pathKey) {
    ensureFolderStructure(folder);
    reader.onload = function () {
      const img = new Image();

    let total = 0;
    const today = new Date();
      img.onload = function () {
        resolve(img);
      };

    folder.deadlines.forEach(deadline => {
      const occurrences = getDeadlineOccurrences(deadline, folder);
      img.onerror = function () {
        reject(new Error("Immagine non valida"));
      };

      occurrences.forEach(item => {
        const due = new Date(item.dueDate);
        due.setHours(23, 59, 59, 999);
      img.src = reader.result;
    };

        if (
          today > due &&
          !hasRequiredPdf(folder, item.requiredText, item.extraRequiredTexts || [])
        ) {
          total++;
        }
      });
    });
    reader.onerror = function () {
      reject(new Error("Errore lettura immagine"));
    };

    folder.sub.forEach((subFolder, index) => {
      const subPathKey = pathKey + "-" + index;
      total += walk(subFolder, subPathKey);
    });
    reader.readAsDataURL(file);
  });
}

    missingCountMap.set(pathKey, total);
    return total;
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

  data.forEach((folder, index) => {
    walk(folder, String(index));
  });
}
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

function getMissingCountFromMap(pathArray, localIndex) {
  const fullPath = [...pathArray, localIndex];
  const key = fullPath.join("-");
  return missingCountMap.get(key) || 0;
}
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

function openActionSheet(target) {
  currentActionTarget = target;
  moveActionBtn.style.display = target.moveAction ? "block" : "none";
  actionSheet.classList.add("show");
}
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  const pdfBytes = buildPdfFromJpeg(jpegBytes, width, height);

function closeActionSheet() {
  currentActionTarget = null;
  actionSheet.classList.remove("show");
  return pdfBytes.buffer;
}

function closePdfViewer() {
  pdfViewer.classList.add("hidden");
  pdfFrame.src = "";
  pdfTitle.textContent = "PDF";
  currentOpenedFile = null;
function suggestPdfNameFromPath(originalName = "") {
  const cleanOriginal = originalName.replace(/\.[^/.]+$/, "");
  const pathNames = getPathNames().split(" / ").filter(Boolean);

  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = null;
  }
}
  let folderName = "";
  let yearName = "";

async function openFile(file) {
  if (!file.pdfId) return;
  if (pathNames.length >= 2) {
    folderName = pathNames[pathNames.length - 1];
  }

  try {
    const pdfRecord = await getPdfFromDB(file.pdfId);
  if (pathNames.length >= 3) {
    const last = pathNames[pathNames.length - 1];
    const prev = pathNames[pathNames.length - 2];

    if (!pdfRecord || !pdfRecord.data) {
      alert("PDF non trovato.");
      return;
    if (/^\d{4}$/.test(last)) {
      yearName = last;
      folderName = prev;
}
  }

    if (currentPdfUrl) {
      URL.revokeObjectURL(currentPdfUrl);
      currentPdfUrl = null;
    }
  folderName = (folderName || "documento").toLowerCase().trim();

    const blob = new Blob([pdfRecord.data], { type: "application/pdf" });
    currentPdfUrl = URL.createObjectURL(blob);
    currentOpenedFile = file;
  if (yearName) return `${folderName} ${yearName}.pdf`;
  if (cleanOriginal) return `${folderName} ${cleanOriginal}.pdf`;

    pdfTitle.textContent = file.name || "PDF";
    pdfFrame.src = currentPdfUrl;
    pdfViewer.classList.remove("hidden");
  } catch {
    alert("Errore nell'apertura del PDF.");
  }
  return `${folderName}.pdf`;
}

async function shareCurrentPdf() {
  if (!currentOpenedFile || !currentOpenedFile.pdfId) return;
/* -------------------- DATI LEGGERI -------------------- */

  try {
    const pdfRecord = await getPdfFromDB(currentOpenedFile.pdfId);
    if (!pdfRecord || !pdfRecord.data) {
      alert("PDF non trovato.");
      return;
    }

    const blob = new Blob([pdfRecord.data], { type: "application/pdf" });
    const fileName = currentOpenedFile.name || "documento.pdf";
    const shareFile = new File([blob], fileName, { type: "application/pdf" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
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
  } catch {
    alert("Errore nella condivisione del PDF.");
  }
function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
  computeMissingCounts();
  updateAppBadge();
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
function ensureFolderStructure(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
  if (!folder.deadlines) folder.deadlines = [];
}

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
function isYearName(name) {
  return /^\d{4}$/.test(name);
}

function openDeadlineEditor(folder) {
  currentDeadlineFolder = folder;
  ensureFolderStructure(folder);
function getFolderYear(folder) {
  if (!folder || !folder.name) return null;
  if (/^\d{4}$/.test(folder.name)) return parseInt(folder.name, 10);
  return null;
}

  deadlineFolderNameInput.value = folder.name || "";
function sortFolders(items) {
  items.sort((a, b) => {
    const aIsYear = isYearName(a.name);
    const bIsYear = isYearName(b.name);

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
    if (aIsYear && bIsYear) return Number(b.name) - Number(a.name);
    if (aIsYear && !bIsYear) return -1;
    if (!aIsYear && bIsYear) return 1;

  renderDeadlineList(folder);
  deadlineEditor.classList.remove("hidden");
    return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  });
}

function closeDeadlineEditor() {
  currentDeadlineFolder = null;
  deadlineEditor.classList.add("hidden");
function sortFiles(files) {
  files.sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
}

function saveFolderEdit(replaceAll = false) {
  if (!currentDeadlineFolder) return;
function getCurrentFolder() {
  if (currentPath.length === 0) return null;

  const folderName = deadlineFolderNameInput.value.trim();
  const label = deadlineLabelInput.value.trim();
  const inputDate = deadlineFirstDateInput.value;
  const intervalMonths = parseInt(deadlineIntervalSelect.value, 10);
  const prefix = deadlinePrefixInput.value.trim();
  let level = data;
  let folder = null;

  if (!folderName) {
    alert("Inserisci il nome della cartella.");
    return;
  for (let i = 0; i < currentPath.length; i++) {
    folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
}

  currentDeadlineFolder.name = folderName;
  return folder;
}

  if (!inputDate && !label && !prefix) {
    save();
    render();
    renderDeadlineList(currentDeadlineFolder);
    return;
  }
function getCurrentLevel() {
  let level = data;

  if (!label) {
    alert("Inserisci il nome della scadenza.");
    return;
  for (let i = 0; i < currentPath.length; i++) {
    const folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
}

  if (!inputDate) {
    alert("Inserisci la prima scadenza.");
    return;
  }
  return level;
}

  if (!intervalMonths || intervalMonths < 1) {
    alert("Intervallo mesi non valido.");
    return;
  }
function getCurrentFiles() {
  const folder = getCurrentFolder();
  if (!folder) return [];
  ensureFolderStructure(folder);
  return folder.files;
}

  const firstDueDate = formatInputDateToIT(inputDate);
function getPathNames() {
  const names = ["Home"];
  let level = data;

  if (!parseItalianDate(firstDueDate)) {
    alert("Data non valida.");
    return;
  for (let i = 0; i < currentPath.length; i++) {
    const folder = level[currentPath[i]];
    ensureFolderStructure(folder);
    names.push(folder.name);
    level = folder.sub;
}

  ensureFolderStructure(currentDeadlineFolder);

  if (replaceAll) {
    currentDeadlineFolder.deadlines = [];
  }
  return names.join(" / ");
}

  const newDeadline = {
    label: label,
    firstDueDate: firstDueDate,
    intervalMonths: intervalMonths,
    requiredPrefix: prefix
  };
function createFolder(name) {
  const items = getCurrentLevel();

  if (!replaceAll && currentDeadlineFolder.deadlines.length > 0) {
    currentDeadlineFolder.deadlines[0] = newDeadline;
  } else {
    currentDeadlineFolder.deadlines.push(newDeadline);
  }
  items.push({
    name: name.trim(),
    sub: [],
    files: [],
    deadlines: []
  });

  sortFolders(items);
save();
render();
  renderDeadlineList(currentDeadlineFolder);
}

function clearDeadlinesFromCurrentFolder() {
  if (!currentDeadlineFolder) return;
function getFolderByPath(path) {
  if (!path || path.length === 0) return null;

  ensureFolderStructure(currentDeadlineFolder);
  let level = data;
  let folder = null;

  if (currentDeadlineFolder.deadlines.length === 0) {
    alert("Non ci sono scadenze da eliminare.");
    return;
  for (let i = 0; i < path.length; i++) {
    folder = level[path[i]];
    ensureFolderStructure(folder);
    level = folder.sub;
}

  const ok = confirm("Vuoi eliminare tutte le scadenze di questa cartella?\nI PDF NON verranno eliminati.");
  if (!ok) return;

  currentDeadlineFolder.deadlines = [];
  save();
  render();
  renderDeadlineList(currentDeadlineFolder);
  return folder;
}

function openRenameModal(file) {
  currentRenameFile = file;
  renameInput.value = file.name;
  renameModal.classList.remove("hidden");
  renameInput.focus();
}
/* -------------------- UTILITA TESTO E DATE -------------------- */

function openRenameModalForImportedPdf(defaultName, arrayBuffer) {
  pendingImportedPdf = arrayBuffer;
  currentRenameFile = null;
  renameInput.value = defaultName;
  renameModal.classList.remove("hidden");
  renameInput.focus();
function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_\-]+/g, "");
}

function closeRenameModal() {
  currentRenameFile = null;
  pendingImportedPdf = null;
  renameModal.classList.add("hidden");
function pad2(value) {
  return String(value).padStart(2, "0");
}

function openFolderModal() {
  folderNameInput.value = "";
  folderModal.classList.remove("hidden");
  folderNameInput.focus();
function formatYearMonth(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function closeFolderModal() {
  folderModal.classList.add("hidden");
function formatDateIT(date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function collectFolderTargets(level = data, path = [], results = []) {
  level.forEach((folder, index) => {
    ensureFolderStructure(folder);
function parseItalianDate(dateString) {
  if (!dateString) return null;

    const newPath = [...path, index];
    results.push({
      path: newPath,
      label: ["Home", ...newPath.map((_, i) => {
        const partial = newPath.slice(0, i + 1);
        return getFolderByPath(partial).name;
      })].join(" / ")
    });
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;

    collectFolderTargets(folder.sub, newPath, results);
  });

  return results;
}

function openMoveModal(file, sourceFiles) {
  currentMoveFile = file;
  currentMoveSourceFiles = sourceFiles;

  moveCurrentFile.textContent = "PDF selezionato: " + file.name;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  const targets = collectFolderTargets();
  if (!day || !month || !year) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  if (targets.length === 0) {
    moveFolderList.innerHTML = `<div class="deadlineEmpty">Nessuna cartella disponibile</div>`;
  } else {
    moveFolderList.innerHTML = targets
      .map((target, index) => `<button class="moveFolderItem" data-move-index="${index}">${target.label}</button>`)
      .join("");
  const date = new Date(year, month - 1, day);

    const buttons = moveFolderList.querySelectorAll(".moveFolderItem");
    buttons.forEach((btn, index) => {
      btn.onclick = function () {
        movePdfToTarget(targets[index].path);
      };
    });
  }
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;

  moveModal.classList.remove("hidden");
  return date;
}

function closeMoveModal() {
  currentMoveFile = null;
  currentMoveSourceFiles = null;
  moveModal.classList.add("hidden");
function formatDateForInput(itDate) {
  const date = parseItalianDate(itDate);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function movePdfToTarget(targetPath) {
  if (!currentMoveFile || !currentMoveSourceFiles) return;
function formatInputDateToIT(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

  const targetFolder = getFolderByPath(targetPath);
  if (!targetFolder) return;
function addMonths(date, months) {
  const d = new Date(date);
  const originalDay = d.getDate();

  ensureFolderStructure(targetFolder);
  d.setMonth(d.getMonth() + months);

  const alreadyExists = targetFolder.files.some(file => file.pdfId === currentMoveFile.pdfId);
  if (alreadyExists) {
    alert("Questo PDF è già presente nella cartella scelta.");
    return;
  if (d.getDate() < originalDay) {
    d.setDate(0);
}

  const index = currentMoveSourceFiles.findIndex(file => file.pdfId === currentMoveFile.pdfId);
  if (index === -1) return;

  const fileToMove = currentMoveSourceFiles[index];
  currentMoveSourceFiles.splice(index, 1);
  targetFolder.files.push(fileToMove);

  save();
  render();
  closeMoveModal();
  return d;
}

function attachSwipe(contentEl, onSwipeLeft) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
/* -------------------- CONTROLLO PDF / SCADENZE -------------------- */

  contentEl.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
  }, { passive: true });
function hasRequiredPdf(folder, requiredText, extraRequiredTexts = []) {
  ensureFolderStructure(folder);

  contentEl.addEventListener("touchmove", function (e) {
    if (!isDragging) return;
  const checks = [requiredText, ...extraRequiredTexts]
    .filter(Boolean)
    .map(text => normalizeText(text));

    currentX = e.touches[0].clientX;
    let diff = currentX - startX;
  if (checks.length === 0) return false;

    if (diff < 0) {
      diff = Math.max(diff, -80);
      contentEl.style.transform = `translateX(${diff}px)`;
    }
  }, { passive: true });
  const foundInCurrentFolder = folder.files.some(file => {
    const fileName = normalizeText(file.name);
    return checks.some(check => fileName.includes(check));
  });

  contentEl.addEventListener("touchend", function () {
    if (!isDragging) return;
  if (foundInCurrentFolder) return true;

    isDragging = false;
    const diff = currentX - startX;
    contentEl.style.transform = "translateX(0)";
  for (const subFolder of folder.sub) {
    if (hasRequiredPdf(subFolder, requiredText, extraRequiredTexts)) return true;
  }

    if (diff < -60) onSwipeLeft();
  });
  return false;
}

function createSwipeRow(mainClass, labelClass, labelHTML, openAction, editAction, deleteAction, moveAction = null) {
  const row = document.createElement("li");
  row.className = "swipeRow";
function getDeadlineOccurrences(deadline, folder = null) {
  const result = [];

  const content = document.createElement("div");
  content.className = mainClass;
  if (!deadline) return result;
  if (!deadline.firstDueDate) return result;
  if (!deadline.intervalMonths || deadline.intervalMonths < 1) return result;

  const nameSpan = document.createElement("span");
  nameSpan.className = labelClass;
  nameSpan.innerHTML = labelHTML;
  nameSpan.onclick = function () {
    openAction();
  };
  const today = new Date();
  const firstDate = parseItalianDate(deadline.firstDueDate);
  if (!firstDate) return result;

  content.appendChild(nameSpan);
  row.appendChild(content);
  const folderYear = getFolderYear(folder);
  let current = new Date(firstDate);

  attachSwipe(content, function () {
    openActionSheet({ editAction, deleteAction, moveAction });
  });
  while (current <= today) {
    if (!folderYear || current.getFullYear() === folderYear) {
      const primaryRequiredText = `${deadline.requiredPrefix || ""}${formatYearMonth(current)}`;
      const extraRequiredTexts = [];

  return row;
}
      if (deadline.intervalMonths === 12) {
        extraRequiredTexts.push(`${deadline.requiredPrefix || ""}${current.getFullYear()}`);
      }

function renderFolders(items, searchText) {
  items.forEach((item, i) => {
    ensureFolderStructure(item);
      result.push({
        dueDate: new Date(current),
        requiredText: primaryRequiredText,
        extraRequiredTexts: extraRequiredTexts,
        label: `${deadline.label || "Scadenza"} ${formatDateIT(current)}`
      });
    }

    if (searchText && !item.name.toLowerCase().includes(searchText)) return;
    current = addMonths(current, deadline.intervalMonths);
  }

    let labelHTML = item.name;
    const missingCount = getMissingCountFromMap(currentPath, i);
  return result;
}

    if (missingCount > 0) {
      labelHTML += ` <span class="missingCount">(${missingCount})</span>`;
    }
function computeMissingCounts() {
  missingCountMap = new Map();

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
  function walk(folder, pathKey) {
    ensureFolderStructure(folder);

        items.splice(i, 1);
        save();
        render();
      }
    );
    let total = 0;
    const today = new Date();

    list.appendChild(row);
  });
}
    folder.deadlines.forEach(deadline => {
      const occurrences = getDeadlineOccurrences(deadline, folder);

function renderFiles(files, searchText) {
  files.forEach((file, i) => {
    if (searchText && !file.name.toLowerCase().includes(searchText)) return;
      occurrences.forEach(item => {
        const due = new Date(item.dueDate);
        due.setHours(23, 59, 59, 999);

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
        if (
          today > due &&
          !hasRequiredPdf(folder, item.requiredText, item.extraRequiredTexts || [])
        ) {
          total++;
        }
      });
    });

        if (file.pdfId) await deletePdfFromDB(file.pdfId);
    folder.sub.forEach((subFolder, index) => {
      const subPathKey = pathKey + "-" + index;
      total += walk(subFolder, subPathKey);
    });

        files.splice(i, 1);
        save();
        render();
      },
      function () {
        openMoveModal(file, files);
      }
    );
    missingCountMap.set(pathKey, total);
    return total;
  }

    list.appendChild(row);
  data.forEach((folder, index) => {
    walk(folder, String(index));
});
}

function render() {
  if (currentPath.length === 0) {
  backupBtn.style.display = "flex";
  restoreBtn.style.display = "flex";
} else {
  backupBtn.style.display = "none";
  restoreBtn.style.display = "none";
function getMissingCountFromMap(pathArray, localIndex) {
  const fullPath = [...pathArray, localIndex];
  const key = fullPath.join("-");
  return missingCountMap.get(key) || 0;
}
  backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
  pathBox.textContent = getPathNames();
  list.innerHTML = "";

  const items = getCurrentLevel();
  const files = getCurrentFiles();
  const searchText = searchInput.value.toLowerCase().trim();
/* -------------------- ACTION SHEET -------------------- */

  sortFolders(items);
  sortFiles(files);
function openActionSheet(target) {
  currentActionTarget = target;
  moveActionBtn.style.display = target.moveAction ? "block" : "none";
  actionSheet.classList.add("show");
}

  addFileBtn.style.display = currentPath.length === 0 ? "none" : "block";
function closeActionSheet() {
  currentActionTarget = null;
  actionSheet.classList.remove("show");
}

  computeMissingCounts();
/* -------------------- PDF VIEWER -------------------- */

  renderFolders(items, searchText);
  renderFiles(files, searchText);
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

function stringToUint8(str) {
  return new TextEncoder().encode(str);
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
    currentOpenedFile = file;

    pdfTitle.textContent = file.name || "PDF";
    pdfFrame.src = currentPdfUrl;
    pdfViewer.classList.remove("hidden");
  } catch (error) {
    alert("Errore nell'apertura del PDF.");
  }
}

function concatUint8Arrays(arrays) {
  let totalLength = 0;
  arrays.forEach(arr => {
    totalLength += arr.length;
  });
async function shareCurrentPdf() {
  if (!currentOpenedFile || !currentOpenedFile.pdfId) return;

  const result = new Uint8Array(totalLength);
  let offset = 0;
  try {
    const pdfRecord = await getPdfFromDB(currentOpenedFile.pdfId);

  arrays.forEach(arr => {
    result.set(arr, offset);
    offset += arr.length;
  });
    if (!pdfRecord || !pdfRecord.data) {
      alert("PDF non trovato.");
      return;
    }

  return result;
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

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
function printCurrentPdf() {
  if (!currentPdfUrl) return;

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  const win = window.open(currentPdfUrl, "_blank");
  if (!win) {
    alert("Impossibile aprire la finestra di stampa.");
    return;
}

  return bytes;
  win.onload = function () {
    win.print();
  };
}

function buildPdfFromJpeg(jpegBytes, imgWidth, imgHeight) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
/* -------------------- EDITOR MODIFICA CARTELLA -------------------- */

  let drawWidth = pageWidth;
  let drawHeight = (imgHeight / imgWidth) * drawWidth;
function renderDeadlineList(folder) {
  ensureFolderStructure(folder);

  if (drawHeight > pageHeight) {
    drawHeight = pageHeight;
    drawWidth = (imgWidth / imgHeight) * drawHeight;
  if (folder.deadlines.length === 0) {
    deadlineListBox.innerHTML = `<div class="deadlineEmpty">Nessuna scadenza salvata</div>`;
    return;
}

  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;
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

  const contentStream =
`q
${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm
/Im0 Do
Q`;
function openDeadlineEditor(folder) {
  currentDeadlineFolder = folder;
  ensureFolderStructure(folder);

  const contentBytes = stringToUint8(contentStream);
  const objects = [];
  deadlineFolderNameInput.value = folder.name || "";

  objects.push(stringToUint8(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`));
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

  objects.push(stringToUint8(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`));
  renderDeadlineList(folder);
  deadlineEditor.classList.remove("hidden");
}

  objects.push(stringToUint8(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`));
function closeDeadlineEditor() {
  currentDeadlineFolder = null;
  deadlineEditor.classList.add("hidden");
}

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
function saveFolderEdit(replaceAll = false) {
  if (!currentDeadlineFolder) return;

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
  const folderName = deadlineFolderNameInput.value.trim();
  const label = deadlineLabelInput.value.trim();
  const inputDate = deadlineFirstDateInput.value;
  const intervalMonths = parseInt(deadlineIntervalSelect.value, 10);
  const prefix = deadlinePrefixInput.value.trim();

  const header = concatUint8Arrays([
    stringToUint8("%PDF-1.4\n"),
    new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])
  ]);
  if (!folderName) {
    alert("Inserisci il nome della cartella.");
    return;
  }

  const parts = [header];
  const offsets = [0];
  let currentOffset = header.length;
  currentDeadlineFolder.name = folderName;

  objects.forEach(obj => {
    offsets.push(currentOffset);
    parts.push(obj);
    currentOffset += obj.length;
  });
  if (!inputDate && !label && !prefix) {
    save();
    render();
    renderDeadlineList(currentDeadlineFolder);
    return;
  }

  let xref = `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;
  if (!label) {
    alert("Inserisci il nome della scadenza.");
    return;
  }

  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n 
`;
  if (!inputDate) {
    alert("Inserisci la prima scadenza.");
    return;
}

  const xrefBytes = stringToUint8(xref);
  const startxref = currentOffset;
  if (!intervalMonths || intervalMonths < 1) {
    alert("Intervallo mesi non valido.");
    return;
  }

  const trailerBytes = stringToUint8(`trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${startxref}
%%EOF`);
  const firstDueDate = formatInputDateToIT(inputDate);

  parts.push(xrefBytes);
  parts.push(trailerBytes);
  if (!parseItalianDate(firstDueDate)) {
    alert("Data non valida.");
    return;
  }

  return concatUint8Arrays(parts);
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

function suggestPdfNameFromPath(originalName = "") {
  const cleanOriginal = originalName.replace(/\.[^/.]+$/, "");
  const pathNames = getPathNames().split(" / ").filter(Boolean);
function clearDeadlinesFromCurrentFolder() {
  if (!currentDeadlineFolder) return;

  let folderName = "";
  let yearName = "";
  ensureFolderStructure(currentDeadlineFolder);

  if (pathNames.length >= 2) {
    folderName = pathNames[pathNames.length - 1];
  if (currentDeadlineFolder.deadlines.length === 0) {
    alert("Non ci sono scadenze da eliminare.");
    return;
}

  if (pathNames.length >= 3) {
    const last = pathNames[pathNames.length - 1];
    const prev = pathNames[pathNames.length - 2];
  const ok = confirm(
    "Vuoi eliminare tutte le scadenze di questa cartella?\nI PDF NON verranno eliminati."
  );
  if (!ok) return;

    if (/^\d{4}$/.test(last)) {
      yearName = last;
      folderName = prev;
    }
  }
  currentDeadlineFolder.deadlines = [];
  save();
  render();
  renderDeadlineList(currentDeadlineFolder);
}

  folderName = (folderName || "documento").toLowerCase().trim();
/* -------------------- RINOMINA PDF -------------------- */

  if (yearName) return `${folderName} ${yearName}.pdf`;
  if (cleanOriginal) return `${folderName} ${cleanOriginal}.pdf`;
function openRenameModal(file) {
  currentRenameFile = file;
  renameInput.value = file.name;
  renameModal.classList.remove("hidden");
  renameInput.focus();
}

  return `${folderName}.pdf`;
function openRenameModalForImportedPdf(defaultName, arrayBuffer) {
  pendingImportedPdf = arrayBuffer;
  currentRenameFile = null;
  renameInput.value = defaultName;
  renameModal.classList.remove("hidden");
  renameInput.focus();
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
function closeRenameModal() {
  currentRenameFile = null;
  pendingImportedPdf = null;
  renameModal.classList.add("hidden");
}

    reader.onload = function () {
      const img = new Image();
/* -------------------- NUOVA CARTELLA -------------------- */

      img.onload = function () {
        resolve(img);
      };
function openFolderModal() {
  folderNameInput.value = "";
  folderModal.classList.remove("hidden");
  folderNameInput.focus();
}

      img.onerror = function () {
        reject(new Error("Immagine non valida"));
      };
function closeFolderModal() {
  folderModal.classList.add("hidden");
}

      img.src = reader.result;
    };
/* -------------------- SPOSTA PDF -------------------- */

    reader.onerror = function () {
      reject(new Error("Errore lettura immagine"));
    };
function collectFolderTargets(level = data, path = [], results = []) {
  level.forEach((folder, index) => {
    ensureFolderStructure(folder);

    reader.readAsDataURL(file);
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

async function convertImageFileToPdfArrayBuffer(file) {
  const img = await loadImageFile(file);
function openMoveModal(file, sourceFiles) {
  currentMoveFile = file;
  currentMoveSourceFiles = sourceFiles;

  const maxDimension = 2000;
  let width = img.width;
  let height = img.height;
  moveCurrentFile.textContent = "PDF selezionato: " + file.name;

  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const targets = collectFolderTargets();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  if (targets.length === 0) {
    moveFolderList.innerHTML = `<div class="deadlineEmpty">Nessuna cartella disponibile</div>`;
  } else {
    moveFolderList.innerHTML = targets
      .map((target, index) => `<button class="moveFolderItem" data-move-index="${index}">${target.label}</button>`)
      .join("");

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
    const buttons = moveFolderList.querySelectorAll(".moveFolderItem");
    buttons.forEach((btn, index) => {
      btn.onclick = function () {
        movePdfToTarget(targets[index].path);
      };
    });
  }

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);
  const pdfBytes = buildPdfFromJpeg(jpegBytes, width, height);
  moveModal.classList.remove("hidden");
}

  return pdfBytes.buffer;
function closeMoveModal() {
  currentMoveFile = null;
  currentMoveSourceFiles = null;
  moveModal.classList.add("hidden");
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
function movePdfToTarget(targetPath) {
  if (!currentMoveFile || !currentMoveSourceFiles) return;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  const targetFolder = getFolderByPath(targetPath);
  if (!targetFolder) return;

  ensureFolderStructure(targetFolder);

  const alreadyExists = targetFolder.files.some(file => file.pdfId === currentMoveFile.pdfId);
  if (alreadyExists) {
    alert("Questo PDF è già presente nella cartella scelta.");
    return;
}

  return btoa(binary);
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

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
/* -------------------- RENDER -------------------- */

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
function renderFolders(items, searchText) {
  items.forEach((item, i) => {
    ensureFolderStructure(item);

  return bytes.buffer;
}
    if (searchText && !item.name.toLowerCase().includes(searchText)) return;

async function exportBackup() {
  try {
    if (backupBtn) {
      backupBtn.textContent = "Backup...";
      backupBtn.disabled = true;
    let labelHTML = item.name;
    const missingCount = getMissingCountFromMap(currentPath, i);

    if (missingCount > 0) {
      labelHTML += ` <span class="missingCount">(${missingCount})</span>`;
}

    const pdfs = await getAllPdfsFromDB();
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

    const backup = {
      version: 1,
      createdAt: new Date().toISOString(),
      archivio: data,
      pdfs: pdfs.map(item => ({
        id: item.id,
        data: arrayBufferToBase64(item.data)
      }))
    };
        items.splice(i, 1);
        save();
        render();
      }
    );

    const json = JSON.stringify(backup);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    list.appendChild(row);
  });
}

    const now = new Date();
    const fileName =
      "backup-bollette-" +
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") +
      ".json";
function renderFiles(files, searchText) {
  files.forEach((file, i) => {
    if (searchText && !file.name.toLowerCase().includes(searchText)) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
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

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
        if (file.pdfId) {
          await deletePdfFromDB(file.pdfId);
        }

    alert("Backup creato. Salvalo nell'app File del tuo iPhone.");
  } catch {
    alert("Errore durante il backup.");
  } finally {
    if (backupBtn) {
      backupBtn.textContent = "Backup";
      backupBtn.disabled = false;
    }
  }
}
        files.splice(i, 1);
        save();
        render();
      },
      function () {
        openMoveModal(file, files);
      }
    );

function openRestorePicker() {
  if (!restoreInput) return;
  restoreInput.value = "";
  restoreInput.click();
    list.appendChild(row);
  });
}

async function importBackupFile(file) {
  if (!file) return;
function render() {
  backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
  pathBox.textContent = getPathNames();
  list.innerHTML = "";

  const ok = confirm("Vuoi ripristinare questo backup?\nL'archivio attuale verrà sostituito completamente.");
  if (!ok) return;
  const items = getCurrentLevel();
  const files = getCurrentFiles();
  const searchText = searchInput.value.toLowerCase().trim();

  try {
    if (restoreBtn) {
      restoreBtn.textContent = "Ripristino...";
      restoreBtn.disabled = true;
    }
  sortFolders(items);
  sortFiles(files);

    const text = await file.text();
    const backup = JSON.parse(text);
  addFileBtn.style.display = currentPath.length === 0 ? "none" : "block";

    if (!backup || !backup.archivio || !Array.isArray(backup.pdfs)) {
      alert("File backup non valido.");
      return;
    }
  if (headerActions) {
    headerActions.style.display = currentPath.length === 0 ? "flex" : "none";
  }

    await clearAllPdfsFromDB();
  computeMissingCounts();

    for (const pdf of backup.pdfs) {
      await savePdfToDB({
        id: pdf.id,
        data: base64ToArrayBuffer(pdf.data)
      });
    }
  renderFolders(items, searchText);
  renderFiles(files, searchText);
}

    data = backup.archivio;
    currentPath = [];
    save();
    render();
/* -------------------- EVENTI -------------------- */

    alert("Backup ripristinato con successo.");
  } catch {
    alert("Errore durante il ripristino del backup.");
  } finally {
    if (restoreBtn) {
      restoreBtn.textContent = "Ripristina";
      restoreBtn.disabled = false;
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
  }

    fileInput.value = "";
    fileInput.click();
  };
}

function updateAppBadge() {
  let totalMissing = 0;
if (fileInput) {
  fileInput.onchange = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

  data.forEach((folder, index) => {
    totalMissing += missingCountMap.get(String(index)) || 0;
  });
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

  if ("setAppBadge" in navigator) {
    if (totalMissing > 0) {
      navigator.setAppBadge(totalMissing);
    } else if ("clearAppBadge" in navigator) {
      navigator.clearAppBadge();
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      alert("Puoi caricare solo PDF, foto o screenshot.");
      fileInput.value = "";
      return;
}
  }
}

addBtn.onclick = function () {
  openFolderModal();
};
    try {
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfId = createPdfId();

addFileBtn.onclick = function () {
  if (currentPath.length === 0) {
    alert("Entra prima in una cartella.");
    return;
  }
        await savePdfToDB({
          id: pdfId,
          data: arrayBuffer
        });

  fileInput.value = "";
  fileInput.click();
};
        const files = getCurrentFiles();

fileInput.onchange = async function (event) {
  const file = event.target.files[0];
  if (!file) return;
        files.push({
          name: file.name,
          type: "application/pdf",
          pdfId: pdfId
        });

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");
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

  if (!isPdf && !isImage) {
    alert("Puoi caricare solo PDF, foto o screenshot.");
    fileInput.value = "";
    return;
  }
if (backBtn) {
  backBtn.onclick = function () {
    currentPath.pop();
    render();
  };
}

  try {
    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfId = createPdfId();
if (searchInput) {
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });
}

      await savePdfToDB({
        id: pdfId,
        data: arrayBuffer
      });
if (moveActionBtn) {
  moveActionBtn.onclick = function () {
    if (!currentActionTarget || !currentActionTarget.moveAction) return;
    const action = currentActionTarget.moveAction;
    closeActionSheet();
    action();
  };
}

      const files = getCurrentFiles();
if (editActionBtn) {
  editActionBtn.onclick = function () {
    if (!currentActionTarget || !currentActionTarget.editAction) return;
    const action = currentActionTarget.editAction;
    closeActionSheet();
    action();
  };
}

      files.push({
        name: file.name,
        type: "application/pdf",
        pdfId: pdfId
      });
if (deleteActionBtn) {
  deleteActionBtn.onclick = function () {
    if (!currentActionTarget || !currentActionTarget.deleteAction) return;
    const action = currentActionTarget.deleteAction;
    closeActionSheet();
    action();
  };
}

      save();
      render();
    } else {
      const arrayBuffer = await convertImageFileToPdfArrayBuffer(file);
      const savedName = suggestPdfNameFromPath(file.name);
      openRenameModalForImportedPdf(savedName, arrayBuffer);
    }
  } catch {
    alert("Errore nel salvataggio del file.");
  } finally {
    fileInput.value = "";
  }
};
if (cancelActionBtn) cancelActionBtn.onclick = closeActionSheet;
if (actionSheetBackdrop) actionSheetBackdrop.onclick = closeActionSheet;

backBtn.onclick = function () {
  currentPath.pop();
  render();
};

searchInput.addEventListener("input", function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 120);
});

moveActionBtn.onclick = function () {
  if (!currentActionTarget || !currentActionTarget.moveAction) return;
  const action = currentActionTarget.moveAction;
  closeActionSheet();
  action();
};

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
if (closePdfBtn) closePdfBtn.onclick = closePdfViewer;
if (sharePdfBtn) sharePdfBtn.onclick = shareCurrentPdf;
if (printPdfBtn) printPdfBtn.onclick = printCurrentPdf;

closeDeadlineEditorBtn.onclick = closeDeadlineEditor;
deadlineEditorBackdrop.onclick = closeDeadlineEditor;
if (closeDeadlineEditorBtn) closeDeadlineEditorBtn.onclick = closeDeadlineEditor;
if (deadlineEditorBackdrop) deadlineEditorBackdrop.onclick = closeDeadlineEditor;

saveDeadlineBtn.onclick = function () {
  saveFolderEdit(false);
};

replaceDeadlinesBtn.onclick = function () {
  const ok = confirm("Vuoi sostituire tutte le scadenze con quella che stai inserendo?\nI PDF NON verranno eliminati.");
  if (!ok) return;
  saveFolderEdit(true);
};
if (saveDeadlineBtn) {
  saveDeadlineBtn.onclick = function () {
    saveFolderEdit(false);
  };
}

clearDeadlinesBtn.onclick = function () {
  clearDeadlinesFromCurrentFolder();
};
if (replaceDeadlinesBtn) {
  replaceDeadlinesBtn.onclick = function () {
    const ok = confirm(
      "Vuoi sostituire tutte le scadenze con quella che stai inserendo?\nI PDF NON verranno eliminati."
    );
    if (!ok) return;
    saveFolderEdit(true);
  };
}

renameConfirm.onclick = async function () {
  const newName = renameInput.value.trim();
  if (!newName) return;
if (clearDeadlinesBtn) {
  clearDeadlinesBtn.onclick = function () {
    clearDeadlinesFromCurrentFolder();
  };
}

  if (pendingImportedPdf) {
    try {
      const finalName = newName.toLowerCase().endsWith(".pdf") ? newName : newName + ".pdf";
      const pdfId = createPdfId();
if (renameConfirm) {
  renameConfirm.onclick = async function () {
    const newName = renameInput.value.trim();
    if (!newName) return;

      await savePdfToDB({
        id: pdfId,
        data: pendingImportedPdf
      });
    if (pendingImportedPdf) {
      try {
        const finalName = newName.toLowerCase().endsWith(".pdf")
          ? newName
          : newName + ".pdf";

      const files = getCurrentFiles();
        const pdfId = createPdfId();

      files.push({
        name: finalName,
        type: "application/pdf",
        pdfId: pdfId
      });
        await savePdfToDB({
          id: pdfId,
          data: pendingImportedPdf
        });

      pendingImportedPdf = null;
        const files = getCurrentFiles();

      save();
      render();
      closeRenameModal();
      return;
    } catch {
      alert("Errore nel salvataggio del PDF.");
      return;
    }
  }
        files.push({
          name: finalName,
          type: "application/pdf",
          pdfId: pdfId
        });

  if (!currentRenameFile) return;
        pendingImportedPdf = null;

  currentRenameFile.name = newName;
  save();
  render();
  closeRenameModal();
};
        save();
        render();
        closeRenameModal();
        return;
      } catch (error) {
        alert("Errore nel salvataggio del PDF.");
        return;
      }
    }

renameCancel.onclick = closeRenameModal;
renameBackdrop.onclick = closeRenameModal;
    if (!currentRenameFile) return;

closeMoveBtn.onclick = closeMoveModal;
moveBackdrop.onclick = closeMoveModal;
    currentRenameFile.name = newName;
    save();
    render();
    closeRenameModal();
  };
}

folderConfirmBtn.onclick = function () {
  const name = folderNameInput.value.trim();
  if (!name) return;
if (renameCancel) renameCancel.onclick = closeRenameModal;
if (renameBackdrop) renameBackdrop.onclick = closeRenameModal;

  createFolder(name);
  closeFolderModal();
};
if (closeMoveBtn) closeMoveBtn.onclick = closeMoveModal;
if (moveBackdrop) moveBackdrop.onclick = closeMoveModal;

folderCancelBtn.onclick = closeFolderModal;
folderBackdrop.onclick = closeFolderModal;
if (folderConfirmBtn) {
  folderConfirmBtn.onclick = function () {
    const name = folderNameInput.value.trim();
    if (!name) return;

if (backupBtn) {
  backupBtn.onclick = exportBackup;
    createFolder(name);
    closeFolderModal();
  };
}

if (restoreBtn) {
  restoreBtn.onclick = openRestorePicker;
}
if (folderCancelBtn) folderCancelBtn.onclick = closeFolderModal;
if (folderBackdrop) folderBackdrop.onclick = closeFolderModal;

if (backupBtn) backupBtn.onclick = exportBackup;
if (restoreBtn) restoreBtn.onclick = openRestorePicker;

if (restoreInput) {
restoreInput.onchange = function (event) {
@@ -1529,6 +1581,26 @@
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
