let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

let pendingImportedPdf = null;
let pendingImportedPdfName = "";

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

function changeExtensionToPdf(fileName) {
  if (!fileName) return "documento.pdf";
  return fileName.replace(/\.[^/.]+$/, "") + ".pdf";
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

/* -------------------- DATI LEGGERI -------------------- */

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
  updateAppBadge();
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
    deadlines: []
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

/* -------------------- OTTIMIZZAZIONE CONTATORI -------------------- */

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

function openRenameModalForImportedPdf(defaultName, arrayBuffer) {
  pendingImportedPdf = arrayBuffer;
  pendingImportedPdfName = defaultName;

  currentRenameFile = null;
  renameInput.value = defaultName;
  renameModal.classList.remove("hidden");
  renameInput.focus();
}

function closeRenameModal() {
  currentRenameFile = null;
  pendingImportedPdf = null;
  pendingImportedPdfName = "";
  renameModal.classList.add("hidden");
}

/* -------------------- MODAL NUOVA CARTELLA -------------------- */

function openFolderModal() {
  if (!folderModal || !folderNameInput) return;
  folderNameInput.value = "";
  folderModal.classList.remove("hidden");
  folderNameInput.focus();
}

function closeFolderModal() {
  if (!folderModal) return;
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
      .map((target, index) => {
        return `<button class="moveFolderItem" data-move-index="${index}">${target.label}</button>`;
      })
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

  const alreadyExists = targetFolder.files.some(
    file => file.pdfId === currentMoveFile.pdfId
  );

  if (alreadyExists) {
    alert("Questo PDF è già presente nella cartella scelta.");
    return;
  }

  const index = currentMoveSourceFiles.findIndex(
    file => file.pdfId === currentMoveFile.pdfId
  );

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

  contentEl.addEventListener(
    "touchstart",
    function (e) {
      startX = e.touches[0].clientX;
      currentX = startX;
      isDragging = true;
    },
    { passive: true }
  );

  contentEl.addEventListener(
    "touchmove",
    function (e) {
      if (!isDragging) return;

      currentX = e.touches[0].clientX;
      let diff = currentX - startX;

      if (diff < 0) {
        diff = Math.max(diff, -80);
        contentEl.style.transform = `translateX(${diff}px)`;
      }
    },
    { passive: true }
  );

  contentEl.addEventListener("touchend", function () {
    if (!isDragging) return;

    isDragging = false;
    const diff = currentX - startX;
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

function renderFiles(files, searchText) {
  files.forEach((file, i) => {
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
  backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
  pathBox.textContent = getPathNames();
  list.innerHTML = "";

  const items = getCurrentLevel();
  const files = getCurrentFiles();
  const searchText = searchInput.value.toLowerCase().trim();

  sortFolders(items);

  addYearBtn.style.display = currentPath.length === 0 ? "none" : "block";
  addFileBtn.style.display = currentPath.length === 0 ? "none" : "block";

  computeMissingCounts();

  renderFolders(items, searchText);
  renderFiles(files, searchText);
}

/* -------------------- EVENTI -------------------- */

addBtn.onclick = function () {
  openFolderModal();
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

      const files = getCurrentFiles();

      files.push({
        name: file.name,
        type: "application/pdf",
        pdfId: pdfId
      });

      save();
      render();
    } else {
      const arrayBuffer = await convertImageFileToPdfArrayBuffer(file);
      const savedName = changeExtensionToPdf(file.name);

      openRenameModalForImportedPdf(savedName, arrayBuffer);
    }
  } catch (error) {
    alert("Errore nel salvataggio del file.");
  } finally {
    fileInput.value = "";
  }
};

backBtn.onclick = function () {
  currentPath.pop();
  render();
};

searchInput.addEventListener("input", render);

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
if (sharePdfBtn) sharePdfBtn.onclick = shareCurrentPdf;
if (printPdfBtn) printPdfBtn.onclick = printCurrentPdf;

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

renameConfirm.onclick = async function () {
  const newName = renameInput.value.trim();
  if (!newName) return;

  if (pendingImportedPdf) {
    try {
      const finalName = newName.toLowerCase().endsWith(".pdf")
        ? newName
        : newName + ".pdf";

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
      pendingImportedPdfName = "";

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

  currentRenameFile.name = newName;
  save();
  render();
  closeRenameModal();
};

renameCancel.onclick = closeRenameModal;
renameBackdrop.onclick = closeRenameModal;

closeMoveBtn.onclick = closeMoveModal;
moveBackdrop.onclick = closeMoveModal;

if (folderConfirmBtn) {
  folderConfirmBtn.onclick = function () {
    const name = folderNameInput.value.trim();
    if (!name) return;

    createFolder(name);
    closeFolderModal();
  };
}

if (folderCancelBtn) {
  folderCancelBtn.onclick = closeFolderModal;
}

if (folderBackdrop) {
  folderBackdrop.onclick = closeFolderModal;
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

render();
updateAppBadge();
