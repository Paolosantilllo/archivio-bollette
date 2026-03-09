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
const deadlineActionBtn = document.getElementById("deadlineActionBtn");
const renameActionBtn = document.getElementById("renameActionBtn");
const deleteActionBtn = document.getElementById("deleteActionBtn");
const cancelActionBtn = document.getElementById("cancelActionBtn");

const pdfViewer = document.getElementById("pdfViewer");
const pdfFrame = document.getElementById("pdfFrame");
const pdfTitle = document.getElementById("pdfTitle");
const closePdfBtn = document.getElementById("closePdfBtn");

const iconPicker = document.getElementById("iconPicker");
const iconPickerBackdrop = document.getElementById("iconPickerBackdrop");
const closeIconPickerBtn = document.getElementById("closeIconPickerBtn");
const newFolderName = document.getElementById("newFolderName");
const createFolderConfirmBtn = document.getElementById("createFolderConfirmBtn");
const iconChoices = document.querySelectorAll(".iconChoice");

let currentActionTarget = null;
let currentPdfUrl = null;
let selectedFolderIcon = "📁";

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
  if (!folder.icon) folder.icon = "📁";
}

function isYearName(name) {
  return /^\d{4}$/.test(name);
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

function createFolder(name, icon = "📁") {
  const items = getCurrentLevel();

  items.push({
    name: name.trim(),
    icon: icon,
    sub: [],
    files: [],
    deadlines: []
  });

  sortFolders(items);
  save();
  render();
}

/* -------------------- DATE / SCADENZE -------------------- */

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

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();

  d.setMonth(d.getMonth() + months);

  if (d.getDate() < day) {
    d.setDate(0);
  }

  return d;
}

function buildDueDate(year, month, day) {
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return new Date(year, month - 1, safeDay);
}

function hasRequiredPdf(folder, requiredText) {
  ensureFolderStructure(folder);

  if (!requiredText) return false;

  const check = normalizeText(requiredText);

  const foundInCurrentFolder = folder.files.some(file =>
    normalizeText(file.name).includes(check)
  );

  if (foundInCurrentFolder) {
    return true;
  }

  for (const subFolder of folder.sub) {
    if (hasRequiredPdf(subFolder, requiredText)) {
      return true;
    }
  }

  return false;
}

function getDeadlineOccurrences(deadline) {
  const result = [];

  if (!deadline) return result;
  if (!deadline.startYear || !deadline.startMonth || !deadline.dueDay) return result;
  if (!deadline.intervalMonths || deadline.intervalMonths < 1) return result;

  const today = new Date();
  const startDate = buildDueDate(deadline.startYear, deadline.startMonth, deadline.dueDay);

  let current = new Date(startDate);

  while (current <= today) {
    result.push({
      dueDate: new Date(current),
      requiredText: `${deadline.requiredPrefix || ""}${formatYearMonth(current)}`,
      label: `${deadline.label || "Scadenza"} ${formatYearMonth(current)}`
    });

    current = addMonths(current, deadline.intervalMonths);
  }

  return result;
}

function getMissingDeadlinesCount(folder) {
  ensureFolderStructure(folder);

  const today = new Date();
  let missing = 0;

  folder.deadlines.forEach(deadline => {
    const occurrences = getDeadlineOccurrences(deadline);

    occurrences.forEach(item => {
      const due = new Date(item.dueDate);
      due.setHours(23, 59, 59, 999);

      if (today > due && !hasRequiredPdf(folder, item.requiredText)) {
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

/* -------------------- ICON PICKER -------------------- */

function openIconPicker() {
  newFolderName.value = "";
  selectedFolderIcon = "📁";

  iconChoices.forEach(btn => {
    btn.classList.remove("selected");
    if (btn.dataset.icon === selectedFolderIcon) {
      btn.classList.add("selected");
    }
  });

  iconPicker.classList.remove("hidden");
}

function closeIconPicker() {
  iconPicker.classList.add("hidden");
}

function selectFolderIcon(icon) {
  selectedFolderIcon = icon;

  iconChoices.forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.icon === icon);
  });
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

/* -------------------- GESTIONE SCADENZE -------------------- */

function configureDeadlinesForFolder(folder) {
  ensureFolderStructure(folder);

  const ruleName = prompt("Nome scadenza", folder.name);
  if (!ruleName || !ruleName.trim()) return;

  let type = prompt("Tipo scadenza: mensile / annuale / personalizzata", "mensile");
  if (!type || !type.trim()) return;

  type = type.trim().toLowerCase();

  let intervalMonths = 1;

  if (type === "mensile") {
    intervalMonths = 1;
  } else if (type === "annuale") {
    intervalMonths = 12;
  } else if (type === "personalizzata") {
    let customMonths = prompt("Ogni quanti mesi?", "3");
    if (!customMonths || !customMonths.trim()) return;

    intervalMonths = parseInt(customMonths, 10);

    if (!intervalMonths || intervalMonths < 1) {
      alert("Numero mesi non valido.");
      return;
    }
  } else {
    alert("Tipo non valido.");
    return;
  }

  let dueDay = prompt("Giorno del mese di scadenza (1-31)", "5");
  if (!dueDay || !dueDay.trim()) return;
  dueDay = parseInt(dueDay, 10);

  if (!dueDay || dueDay < 1 || dueDay > 31) {
    alert("Giorno non valido.");
    return;
  }

  let startYear = prompt("Anno iniziale", String(new Date().getFullYear()));
  if (!startYear || !startYear.trim()) return;
  startYear = parseInt(startYear, 10);

  if (!startYear || startYear < 2000 || startYear > 3000) {
    alert("Anno iniziale non valido.");
    return;
  }

  let startMonth = prompt("Mese iniziale (1-12)", String(new Date().getMonth() + 1));
  if (!startMonth || !startMonth.trim()) return;
  startMonth = parseInt(startMonth, 10);

  if (!startMonth || startMonth < 1 || startMonth > 12) {
    alert("Mese iniziale non valido.");
    return;
  }

  let requiredPrefix = prompt("Prefisso da cercare nel nome PDF", "");
  if (requiredPrefix === null) return;

  folder.deadlines.push({
    label: ruleName.trim(),
    type: type,
    intervalMonths: intervalMonths,
    dueDay: dueDay,
    startYear: startYear,
    startMonth: startMonth,
    requiredPrefix: requiredPrefix.trim()
  });

  save();
  render();
  alert("Scadenza salvata.");
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

function createSwipeRow(mainClass, labelClass, labelHTML, openAction, renameAction, deleteAction, deadlineAction) {
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
      renameAction,
      deleteAction,
      deadlineAction
    });
  });

  return row;
}

/* -------------------- RENDER -------------------- */

function renderFolders(items, searchText) {
  items.forEach((item, i) => {
    ensureFolderStructure(item);

    if (searchText && !item.name.toLowerCase().includes(searchText)) return;

    const missingCount = getMissingDeadlinesCount(item);

    let labelHTML = "";

    if (isYearName(item.name)) {
      labelHTML = `🗓️ ${item.name}`;
    } else {
      labelHTML = `
        <span class="folderLabel">
          <span class="folderEmoji">${item.icon || "📁"}</span>
          <span>${item.name}</span>
        </span>
      `;
    }

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
        let newName = prompt("Nuovo nome cartella", item.name);
        if (!newName || !newName.trim()) return;

        item.name = newName.trim();
        sortFolders(items);
        save();
        render();
      },
      function () {
        let ok = confirm("Vuoi eliminare la cartella '" + item.name + "'?");
        if (!ok) return;

        items.splice(i, 1);
        save();
        render();
      },
      function () {
        configureDeadlinesForFolder(item);
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
      "📄 PDF - " + file.name,
      function () {
        openFile(file);
      },
      function () {
        let newName = prompt("Nuovo nome PDF", file.name);
        if (!newName || !newName.trim()) return;

        file.name = newName.trim();
        save();
        render();
      },
      async function () {
        let ok = confirm("Vuoi eliminare il PDF '" + file.name + "'?");
        if (!ok) return;

        if (file.pdfId) {
          await deletePdfFromDB(file.pdfId);
        }

        files.splice(i, 1);
        save();
        render();
      },
      null
    );

    list.appendChild(row);
  });
}

function render() {
  backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
  pathBox.textContent = getPathNames();
  list.innerHTML = "";

  let items = getCurrentLevel();
  let files = getCurrentFiles();
  let searchText = searchInput.value.toLowerCase().trim();

  sortFolders(items);

  addYearBtn.style.display = currentPath.length === 0 ? "none" : "block";
  addFileBtn.style.display = currentPath.length === 0 ? "none" : "block";

  renderFolders(items, searchText);
  renderFiles(files, searchText);
}

/* -------------------- EVENTI -------------------- */

addBtn.onclick = function () {
  openIconPicker();
};

createFolderConfirmBtn.onclick = function () {
  const name = newFolderName.value.trim();

  if (!name) {
    alert("Inserisci il nome della cartella.");
    return;
  }

  createFolder(name, selectedFolderIcon);
  closeIconPicker();
};

iconChoices.forEach(btn => {
  btn.onclick = function () {
    selectFolderIcon(btn.dataset.icon);
  };
});

closeIconPickerBtn.onclick = closeIconPicker;
iconPickerBackdrop.onclick = closeIconPicker;

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

  let items = getCurrentLevel();

  if (items.some(item => item.name === year)) {
    alert("Questo anno esiste già.");
    return;
  }

  createFolder(year, "🗓️");
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

deadlineActionBtn.onclick = function () {
  if (!currentActionTarget || !currentActionTarget.deadlineAction) return;

  const action = currentActionTarget.deadlineAction;
  closeActionSheet();
  action();
};

renameActionBtn.onclick = function () {
  if (!currentActionTarget) return;

  const action = currentActionTarget.renameAction;
  closeActionSheet();
  action();
};

deleteActionBtn.onclick = function () {
  if (!currentActionTarget) return;

  const action = currentActionTarget.deleteAction;
  closeActionSheet();
  action();
};

cancelActionBtn.onclick = closeActionSheet;
actionSheetBackdrop.onclick = closeActionSheet;
closePdfBtn.onclick = closePdfViewer;

/* -------------------- AVVIO -------------------- */

selectFolderIcon("📁");
render();
