let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];
let currentPdfUrl = null;
let currentViewerFile = null;
let selectedActionItem = null;
let renameTarget = null;
let editingBillingFolder = null;

/* -------------------- ELEMENTI -------------------- */

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");
const fileInput = document.getElementById("fileInput");
const searchInput = document.getElementById("search");

const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const restoreInput = document.getElementById("restoreInput");

/* ACTION SHEET FILE */
const actionSheet = document.getElementById("actionSheet");
const actionSheetBackdrop = document.getElementById("actionSheetBackdrop");
const moveActionBtn = document.getElementById("moveActionBtn");
const editActionBtn = document.getElementById("editActionBtn");
const deleteActionBtn = document.getElementById("deleteActionBtn");
const cancelActionBtn = document.getElementById("cancelActionBtn");

/* PDF VIEWER */
const pdfViewer = document.getElementById("pdfViewer");
const pdfFrame = document.getElementById("pdfFrame");
const pdfTitle = document.getElementById("pdfTitle");
const closePdfBtn = document.getElementById("closePdfBtn");
const sharePdfBtn = document.getElementById("sharePdfBtn");
const printPdfBtn = document.getElementById("printPdfBtn");

/* RENAME MODAL */
const renameModal = document.getElementById("renameModal");
const renameBackdrop = document.getElementById("renameBackdrop");
const renameInput = document.getElementById("renameInput");
const renameConfirm = document.getElementById("renameConfirm");
const renameCancel = document.getElementById("renameCancel");

/* MOVE MODAL */
const moveModal = document.getElementById("moveModal");
const moveBackdrop = document.getElementById("moveBackdrop");
const closeMoveBtn = document.getElementById("closeMoveBtn");
const moveCurrentFile = document.getElementById("moveCurrentFile");
const moveFolderList = document.getElementById("moveFolderList");

/* FOLDER MODAL */
const folderModal = document.getElementById("folderModal");
const folderBackdrop = document.getElementById("folderBackdrop");
const folderNameInput = document.getElementById("folderNameInput");
const folderConfirmBtn = document.getElementById("folderConfirmBtn");
const folderCancelBtn = document.getElementById("folderCancelBtn");

/* BILLING EDITOR */
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

/* -------------------- CONTROLLO BASE -------------------- */

if (
  !list ||
  !addBtn ||
  !addFileBtn ||
  !backBtn ||
  !pathBox ||
  !fileInput ||
  !searchInput ||
  !backupBtn ||
  !restoreBtn ||
  !restoreInput
) {
  alert("Errore: alcuni elementi HTML non sono stati trovati.");
  throw new Error("Elementi HTML mancanti");
}

/* -------------------- SAVE -------------------- */

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
}

/* -------------------- ID -------------------- */

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/* -------------------- NORMALIZZAZIONE DATI -------------------- */

function ensureFolderShape(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
  if (!("image" in folder)) folder.image = null;

  if (!folder.billing) {
    folder.billing = {
      enabled: false,
      billDay: "",
      firstBillDate: "",
      intervalMonths: 2,
      cycles: []
    };
  }

  if (!Array.isArray(folder.billing.cycles)) {
    folder.billing.cycles = [];
  }

  folder.files.forEach(file => {
    if (!file.id) file.id = createId();
    if (!file.displayName) file.displayName = getDisplayName(file.name);
  });

  folder.sub.forEach(ensureFolderShape);
}

data.forEach(ensureFolderShape);

/* -------------------- HELPERS -------------------- */

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[ch];
  });
}

function getCurrentLevel() {
  let level = data;
  currentPath.forEach(i => {
    level = level[i].sub;
  });
  return level;
}

function getCurrentFolder() {
  let level = data;
  let folder = null;

  currentPath.forEach(i => {
    folder = level[i];
    level = folder.sub;
  });

  return folder;
}

function getPath() {
  let names = ["Home"];
  let level = data;

  currentPath.forEach(i => {
    names.push(level[i].name);
    level = level[i].sub;
  });

  return names.join(" / ");
}

function getFolderByPath(pathArray) {
  let level = data;
  let folder = null;

  pathArray.forEach(i => {
    folder = level[i];
    level = folder.sub;
  });

  return folder;
}

function getLevelByPath(pathArray) {
  let level = data;
  pathArray.forEach(i => {
    level = level[i].sub;
  });
  return level;
}

function getLabelFromPath(pathArray) {
  const names = ["Home"];
  let level = data;

  pathArray.forEach(i => {
    names.push(level[i].name);
    level = level[i].sub;
  });

  return names.join(" / ");
}

function pathEquals(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";

  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

async function compressImage(file, maxSize = 700, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas non disponibile"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;

  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateOrIso) {
  const date = typeof dateOrIso === "string" ? parseIsoDate(dateOrIso) : dateOrIso;
  if (!date) return "";

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

function parseDisplayDateToIso(displayDate) {
  if (!displayDate || !/^\d{2}-\d{2}-\d{4}$/.test(displayDate)) return "";

  const [d, m, y] = displayDate.split("-");
  return `${y}-${m}-${d}`;
}

function extractLeadingDateFromFileName(fileName) {
  const match = String(fileName).match(/^(\d{2}-\d{2}-\d{4})\b/);
  if (!match) return "";
  return match[1];
}

function extractLeadingIsoDateFromFileName(fileName) {
  const displayDate = extractLeadingDateFromFileName(fileName);
  return parseDisplayDateToIso(displayDate);
}

function isPastOrToday(isoDate) {
  const date = parseIsoDate(isoDate);
  if (!date) return false;
  return date.getTime() <= todayStart().getTime();
}

function addMonthsKeepingDay(baseDate, monthsToAdd, desiredDay) {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();

  const firstOfTarget = new Date(y, m + monthsToAdd, 1);
  const lastDay = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate();
  const day = Math.min(desiredDay, lastDay);

  return new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), day);
}

function getDisplayName(fileName) {
  return String(fileName).replace(/^\d{2}-\d{2}-\d{4}\s+/, "").trim();
}

function isDebitFileName(fileName) {
  return /addebito/i.test(fileName);
}

/* -------------------- BILLING LOGICA -------------------- */

function ensureBillingCycles(folder) {
  ensureFolderShape(folder);

  const billing = folder.billing;
  if (!billing.enabled) return;
  if (!billing.firstBillDate) return;

  const firstDate = parseIsoDate(billing.firstBillDate);
  if (!firstDate) return;

  const intervalMonths = Number(billing.intervalMonths || 2);
  const billDay = Number(billing.billDay || firstDate.getDate());

  const today = todayStart();
  let step = 0;

  while (true) {
    const expectedDate = addMonthsKeepingDay(firstDate, step * intervalMonths, billDay);
    if (expectedDate.getTime() > today.getTime()) break;

    const key = formatIsoDate(expectedDate);
    let cycle = billing.cycles.find(c => c.key === key);

    if (!cycle) {
      cycle = {
        key,
        expectedBillDate: key,
        billFileId: null,
        billLoadedName: "",
        debitDueDate: "",
        debitFileId: null,
        debitLoadedName: ""
      };
      billing.cycles.push(cycle);
    } else {
      cycle.expectedBillDate = key;
      if (!("billFileId" in cycle)) cycle.billFileId = null;
      if (!("billLoadedName" in cycle)) cycle.billLoadedName = "";
      if (!("debitDueDate" in cycle)) cycle.debitDueDate = "";
      if (!("debitFileId" in cycle)) cycle.debitFileId = null;
      if (!("debitLoadedName" in cycle)) cycle.debitLoadedName = "";
    }

    step += 1;
  }

  billing.cycles.sort((a, b) => a.expectedBillDate.localeCompare(b.expectedBillDate));
}

function getOwnBillingBadgeCount(folder) {
  ensureBillingCycles(folder);

  if (!folder.billing || !folder.billing.enabled) {
    return 0;
  }

  let count = 0;

  folder.billing.cycles.forEach(cycle => {
    if (isPastOrToday(cycle.expectedBillDate) && !cycle.billFileId) {
      count += 1;
    }

    if (
      cycle.billFileId &&
      cycle.debitDueDate &&
      isPastOrToday(cycle.debitDueDate) &&
      !cycle.debitFileId
    ) {
      count += 1;
    }
  });

  return count;
}

function getBillingBadgeCount(folder) {
  ensureFolderShape(folder);
  ensureBillingCycles(folder);

  let count = getOwnBillingBadgeCount(folder);

  if (folder.sub && folder.sub.length) {
    folder.sub.forEach(subFolder => {
      count += getBillingBadgeCount(subFolder);
    });
  }

  return count;
}

function getBillingStatusLines(folder) {
  ensureBillingCycles(folder);

  if (!folder.billing || !folder.billing.enabled) {
    return [];
  }

  const lines = [];

  folder.billing.cycles.forEach(cycle => {
    if (isPastOrToday(cycle.expectedBillDate) && !cycle.billFileId) {
      lines.push(`Bolletta mancante del ${formatDisplayDate(cycle.expectedBillDate)}`);
    }

    if (
      cycle.billFileId &&
      cycle.debitDueDate &&
      isPastOrToday(cycle.debitDueDate) &&
      !cycle.debitFileId
    ) {
      lines.push(`Addebito mancante del ${formatDisplayDate(cycle.debitDueDate)}`);
    }
  });

  return lines;
}

function assignUploadedFileToBilling(folder, storedFile) {
  ensureBillingCycles(folder);

  if (!folder.billing || !folder.billing.enabled) return;

  const cycles = folder.billing.cycles;
  const isDebit = isDebitFileName(storedFile.name);
  const fileLeadingIsoDate = extractLeadingIsoDateFromFileName(storedFile.name);

  if (isDebit) {
    let cycle = null;

    if (fileLeadingIsoDate) {
      cycle = cycles.find(c =>
        c.billFileId &&
        c.debitDueDate === fileLeadingIsoDate &&
        !c.debitFileId
      );
    }

    if (!cycle) {
      cycle = cycles.find(c =>
        c.billFileId &&
        c.debitDueDate &&
        isPastOrToday(c.debitDueDate) &&
        !c.debitFileId
      );
    }

    if (!cycle) {
      cycle = cycles.find(c => c.billFileId && !c.debitFileId);
    }

    if (cycle) {
      cycle.debitFileId = storedFile.id;
      cycle.debitLoadedName = storedFile.name;
    }

    return;
  }

  let cycle = cycles.find(c =>
    isPastOrToday(c.expectedBillDate) &&
    !c.billFileId
  );

  if (!cycle) {
    cycle = cycles.find(c => !c.billFileId);
  }

  if (cycle) {
    cycle.billFileId = storedFile.id;
    cycle.billLoadedName = storedFile.name;

    if (fileLeadingIsoDate) {
      cycle.debitDueDate = fileLeadingIsoDate;
    }
  }
}

/* -------------------- CREAZIONE -------------------- */

function createFolder(name) {
  const cleanName = name.trim();
  if (!cleanName) return;

  const folder = {
    name: cleanName,
    sub: [],
    files: [],
    image: null,
    billing: {
      enabled: false,
      billDay: "",
      firstBillDate: "",
      intervalMonths: 2,
      cycles: []
    }
  };

  getCurrentLevel().push(folder);
  save();
  render();
}

/* -------------------- MODAL CARTELLA -------------------- */

function openFolderModal() {
  folderNameInput.value = "";
  folderModal.classList.remove("hidden");
  setTimeout(() => folderNameInput.focus(), 50);
}

function closeFolderModal() {
  folderModal.classList.add("hidden");
  folderNameInput.value = "";
}

/* -------------------- MODAL RINOMINA -------------------- */

function openRenameModal(target) {
  renameTarget = target;
  renameInput.value = target.name || "";
  renameModal.classList.remove("hidden");

  setTimeout(() => {
    renameInput.focus();
    renameInput.select();
  }, 50);
}

function closeRenameModal() {
  renameModal.classList.add("hidden");
  renameInput.value = "";
  renameTarget = null;
}

/* -------------------- ACTION SHEET FILE -------------------- */

function openActionSheet(item) {
  selectedActionItem = item;

  if (item.type === "file") {
    moveActionBtn.style.display = "block";
    editActionBtn.textContent = "Rinomina";
    deleteActionBtn.style.display = "block";
    actionSheet.classList.add("show");
  }
}

function closeActionSheet() {
  actionSheet.classList.remove("show");
  selectedActionItem = null;
}

/* -------------------- MENU CARTELLA -------------------- */

function openFolderMenu(folderIndex) {
  closeFolderMenu();

  const menu = document.createElement("div");
  menu.id = "folderCustomMenu";
  menu.style.position = "fixed";
  menu.style.inset = "0";
  menu.style.background = "rgba(0,0,0,0.28)";
  menu.style.zIndex = "2000";
  menu.style.display = "flex";
  menu.style.alignItems = "flex-end";
  menu.style.justifyContent = "center";
  menu.style.padding = "12px";
  menu.style.boxSizing = "border-box";

  const panel = document.createElement("div");
  panel.style.width = "100%";
  panel.style.maxWidth = "500px";

  const box = document.createElement("div");
  box.style.background = "#f2f2f7";
  box.style.borderRadius = "18px";
  box.style.overflow = "hidden";

  const cancelWrap = document.createElement("div");
  cancelWrap.style.marginTop = "8px";

  const cancelBox = document.createElement("div");
  cancelBox.style.background = "#f2f2f7";
  cancelBox.style.borderRadius = "18px";
  cancelBox.style.overflow = "hidden";

  const level = getCurrentLevel();
  const folder = level[folderIndex];

  function makeBtn(text, onClick, isDanger = false, noBorder = false) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.width = "100%";
    btn.style.border = "none";
    btn.style.background = "#e9e9ef";
    btn.style.padding = "18px";
    btn.style.fontSize = "18px";
    btn.style.cursor = "pointer";
    btn.style.borderBottom = noBorder ? "none" : "1px solid #d7d7dd";
    if (isDanger) btn.style.color = "#ff3b30";

    btn.onclick = () => {
      closeFolderMenu();
      onClick();
    };

    return btn;
  }

  const openBtn = makeBtn("Apri", () => {
    currentPath.push(folderIndex);
    render();
  });

  const renameBtn = makeBtn("Rinomina", () => {
    openRenameModal(folder);
  });

  const imageBtn = makeBtn("Cambia immagine", () => {
    pickFolderImage(folder);
  });

  const billingBtn = makeBtn("Scadenze", () => {
    openBillingEditor(folder);
  });

  const removeImageBtn = makeBtn("Rimuovi immagine", () => {
    folder.image = null;
    save();
    render();
  });

  const deleteBtn = makeBtn("Elimina", () => {
    const ok = confirm(`Eliminare la cartella "${folder.name}"?`);
    if (!ok) return;

    level.splice(folderIndex, 1);
    save();
    render();
  }, true, true);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Annulla";
  cancelBtn.style.width = "100%";
  cancelBtn.style.border = "none";
  cancelBtn.style.background = "#e9e9ef";
  cancelBtn.style.padding = "18px";
  cancelBtn.style.fontSize = "18px";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.style.fontWeight = "600";
  cancelBtn.onclick = closeFolderMenu;

  box.appendChild(openBtn);
  box.appendChild(renameBtn);
  box.appendChild(imageBtn);
  box.appendChild(billingBtn);
  box.appendChild(removeImageBtn);
  box.appendChild(deleteBtn);

  cancelBox.appendChild(cancelBtn);
  cancelWrap.appendChild(cancelBox);

  panel.appendChild(box);
  panel.appendChild(cancelWrap);
  menu.appendChild(panel);

  menu.addEventListener("click", e => {
    if (e.target === menu) {
      closeFolderMenu();
    }
  });

  document.body.appendChild(menu);
}

function closeFolderMenu() {
  const menu = document.getElementById("folderCustomMenu");
  if (menu) menu.remove();
}

/* -------------------- EDITOR SCADENZE -------------------- */

function setDeadlineEditorLabels() {
  const setLabel = (forId, text) => {
    const label = document.querySelector(`label[for="${forId}"]`);
    if (label) label.textContent = text;
  };

  setLabel("deadlineFolderNameInput", "Nome cartella");
  setLabel("deadlineLabelInput", "Giorno bolletta");
  setLabel("deadlineFirstDateInput", "Prima bolletta attesa");
  setLabel("deadlineIntervalSelect", "Ripetizione");
  setLabel("deadlinePrefixInput", "Data addebito letta dal nome PDF");
}

function hideUnusedDebitField() {
  const label = document.querySelector('label[for="deadlinePrefixInput"]');
  if (label) label.style.display = "none";
  if (deadlinePrefixInput) deadlinePrefixInput.style.display = "none";
}

function openBillingEditor(folder) {
  ensureFolderShape(folder);
  ensureBillingCycles(folder);

  editingBillingFolder = folder;
  setDeadlineEditorLabels();
  hideUnusedDebitField();

  deadlineFolderNameInput.value = folder.name || "";
  deadlineLabelInput.value = folder.billing.billDay || "";
  deadlineFirstDateInput.value = folder.billing.firstBillDate || "";
  deadlineIntervalSelect.value = String(folder.billing.intervalMonths || 2);
  deadlinePrefixInput.value = "";

  renderDeadlineList(folder);
  deadlineEditor.classList.remove("hidden");
}

function closeBillingEditor() {
  deadlineEditor.classList.add("hidden");
  editingBillingFolder = null;
}

function renderDeadlineList(folder) {
  ensureBillingCycles(folder);

  const lines = getBillingStatusLines(folder);
  const cycles = folder.billing.cycles || [];
  const summary = [];

  if (folder.billing.enabled) {
    summary.push(`Bolletta ogni ${folder.billing.intervalMonths} mese/i`);
    if (folder.billing.billDay) {
      summary.push(`Giorno bolletta: ${folder.billing.billDay}`);
    }
    summary.push("Data addebito: letta automaticamente dal nome del PDF bolletta");
  }

  const htmlParts = [];

  if (!folder.billing.enabled) {
    htmlParts.push(`<div class="deadlineEmpty">Scadenze non attive per questa cartella</div>`);
  } else {
    if (summary.length) {
      summary.forEach(line => {
        htmlParts.push(`<div class="deadlineItem">${escapeHtml(line)}</div>`);
      });
    }

    if (!cycles.length) {
      htmlParts.push(`<div class="deadlineEmpty">Nessun ciclo generato ancora</div>`);
    } else {
      cycles.forEach(cycle => {
        const billOk = cycle.billFileId ? "✅ Bolletta caricata" : "❌ Bolletta mancante";
        const debitText = cycle.debitDueDate
          ? (cycle.debitFileId
              ? `✅ Addebito caricato (${formatDisplayDate(cycle.debitDueDate)})`
              : `⏳ Addebito atteso dal ${formatDisplayDate(cycle.debitDueDate)}`)
          : "— Data addebito non ancora letta da nessun PDF";

        htmlParts.push(`
          <div class="deadlineItem">
            <strong>${escapeHtml(formatDisplayDate(cycle.expectedBillDate))}</strong><br>
            ${escapeHtml(billOk)}<br>
            ${escapeHtml(debitText)}
          </div>
        `);
      });
    }

    if (lines.length) {
      lines.forEach(line => {
        htmlParts.push(`<div class="deadlineItem" style="color:#ff3b30;"><strong>${escapeHtml(line)}</strong></div>`);
      });
    }
  }

  deadlineListBox.innerHTML = htmlParts.join("");
}

/* -------------------- IMMAGINE CARTELLA -------------------- */

function pickFolderImage(folder) {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";

  picker.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      folder.image = await compressImage(file);
      save();
      render();
    } catch (err) {
      console.error(err);
      alert("Errore durante il caricamento dell'immagine");
    }
  };

  picker.click();
}

/* -------------------- VIEWER FILE -------------------- */

function openFile(file) {
  currentViewerFile = file;

  if (file.type && file.type.startsWith("image/")) {
    window.open(file.data, "_blank");
    return;
  }

  if (file.type !== "application/pdf") {
    window.open(file.data, "_blank");
    return;
  }

  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = null;
  }

  const blob = dataUrlToBlob(file.data);
  const url = URL.createObjectURL(blob);

  currentPdfUrl = url;
  pdfTitle.textContent = file.displayName || file.name;
  pdfFrame.src = url;
  pdfViewer.classList.remove("hidden");
}

function closePdfViewer() {
  pdfViewer.classList.add("hidden");
  pdfFrame.removeAttribute("src");
  currentViewerFile = null;

  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = null;
  }
}

/* -------------------- BACKUP / RESTORE -------------------- */

function downloadBackup() {
  const backup = {
    version: 3,
    createdAt: new Date().toISOString(),
    archivio: data
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "archivio-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function restoreBackup(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      data = parsed;
    } else if (parsed && Array.isArray(parsed.archivio)) {
      data = parsed.archivio;
    } else {
      throw new Error("Formato backup non valido");
    }

    data.forEach(ensureFolderShape);

    currentPath = [];
    save();
    render();
    alert("Backup ripristinato con successo");
  } catch (err) {
    console.error(err);
    alert("Impossibile ripristinare il backup");
  }
}

/* -------------------- MOVE FILE -------------------- */

function collectFolders(level = data, path = [], result = []) {
  result.push({
    name: path.length ? getFolderByPath(path).name : "Home",
    path: [...path],
    label: path.length ? getLabelFromPath(path) : "Home"
  });

  level.forEach((folder, i) => {
    const nextPath = [...path, i];
    result.push({
      name: folder.name,
      path: nextPath,
      label: getLabelFromPath(nextPath)
    });

    if (folder.sub.length) {
      collectFolders(folder.sub, nextPath, result);
    }
  });

  return result;
}

function openMoveModal(fileItem, fromPath, fileIndex) {
  moveCurrentFile.textContent = `File: ${fileItem.displayName || fileItem.name}`;
  moveFolderList.innerHTML = "";

  const folders = collectFolders();

  folders.forEach(folderInfo => {
    if (pathEquals(folderInfo.path, fromPath)) return;
    if (!folderInfo.path.length) return;

    const btn = document.createElement("button");
    btn.className = "moveFolderItem";
    btn.textContent = folderInfo.label;

    btn.onclick = () => {
      const sourceFolder = getFolderByPath(fromPath);
      const destinationFolder = getFolderByPath(folderInfo.path);

      const movedFile = sourceFolder.files.splice(fileIndex, 1)[0];
      destinationFolder.files.push(movedFile);

      save();
      closeMoveModal();
      render();
    };

    moveFolderList.appendChild(btn);
  });

  if (!moveFolderList.children.length) {
    moveFolderList.innerHTML = `<div class="deadlineEmpty">Nessuna cartella disponibile</div>`;
  }

  moveModal.classList.remove("hidden");
}

function closeMoveModal() {
  moveModal.classList.add("hidden");
  moveCurrentFile.textContent = "";
  moveFolderList.innerHTML = "";
}

/* -------------------- DELETE -------------------- */

function deleteSelectedItem() {
  if (!selectedActionItem) return;

  const { type, index, parentPath } = selectedActionItem;

  if (type === "file") {
    const folder = getFolderByPath(parentPath);
    const file = folder.files[index];
    const ok = confirm(`Eliminare il file "${file.displayName || file.name}"?`);
    if (!ok) return;

    if (folder.billing && folder.billing.cycles) {
      folder.billing.cycles.forEach(cycle => {
        if (cycle.billFileId === file.id) {
          cycle.billFileId = null;
          cycle.billLoadedName = "";
          cycle.debitDueDate = "";
        }

        if (cycle.debitFileId === file.id) {
          cycle.debitFileId = null;
          cycle.debitLoadedName = "";
        }
      });
    }

    folder.files.splice(index, 1);
    save();
    render();
  }
}

/* -------------------- LONG PRESS -------------------- */

function attachFolderInteractions(li, index) {
  let timer = null;
  let longPressTriggered = false;

  li.addEventListener("click", () => {
    if (longPressTriggered) {
      longPressTriggered = false;
      return;
    }

    currentPath.push(index);
    render();
  });

  li.addEventListener("contextmenu", e => {
    e.preventDefault();
    openFolderMenu(index);
  });

  li.addEventListener("touchstart", () => {
    longPressTriggered = false;

    timer = setTimeout(() => {
      longPressTriggered = true;
      openFolderMenu(index);
    }, 500);
  }, { passive: true });

  li.addEventListener("touchend", () => {
    clearTimeout(timer);
  });

  li.addEventListener("touchmove", () => {
    clearTimeout(timer);
  });
}

function attachFileInteractions(li, index, file) {
  let timer = null;
  let longPressTriggered = false;

  li.addEventListener("click", () => {
    if (longPressTriggered) {
      longPressTriggered = false;
      return;
    }

    openFile(file);
  });

  li.addEventListener("contextmenu", e => {
    e.preventDefault();
    openActionSheet({
      type: "file",
      index,
      parentPath: [...currentPath]
    });
  });

  li.addEventListener("touchstart", () => {
    longPressTriggered = false;

    timer = setTimeout(() => {
      longPressTriggered = true;
      openActionSheet({
        type: "file",
        index,
        parentPath: [...currentPath]
      });
    }, 500);
  }, { passive: true });

  li.addEventListener("touchend", () => {
    clearTimeout(timer);
  });

  li.addEventListener("touchmove", () => {
    clearTimeout(timer);
  });
}

/* -------------------- RENDER -------------------- */

function render() {
  list.innerHTML = "";
  list.className = "";
  pathBox.textContent = getPath();

  backBtn.style.display = currentPath.length ? "block" : "none";
  addFileBtn.style.display = currentPath.length ? "block" : "none";

  const searchTerm = (searchInput.value || "").trim().toLowerCase();

  const folders = getCurrentLevel();
  const currentFolder = getCurrentFolder();
  const files = currentFolder ? currentFolder.files : [];

  folders.forEach(ensureFolderShape);

  const filteredFolders = folders
    .map((folder, index) => ({ folder, index }))
    .filter(({ folder }) => folder.name.toLowerCase().includes(searchTerm));

  const filteredFiles = files
    .map((file, index) => ({ file, index }))
    .filter(({ file }) =>
      (file.displayName || file.name).toLowerCase().includes(searchTerm)
    );

  if (filteredFolders.length) {
    list.classList.add("folderGrid");
  } else {
    list.classList.add("folderList");
  }

  filteredFolders.forEach(({ folder, index }) => {
    const badgeCount = getBillingBadgeCount(folder);

    const li = document.createElement("li");
    li.className = "swipeRow";

    const imageHtml = folder.image
      ? `
        <div class="gridImageWrap">
          <img src="${folder.image}" alt="" class="gridCover">
        </div>
      `
      : `<div class="gridCoverEmpty">📁</div>`;

    li.innerHTML = `
      <div class="gridCard">
        ${imageHtml}
        <div class="gridTitle">
          ${escapeHtml(folder.name)}
          ${badgeCount ? `<span class="missingCount">(${badgeCount})</span>` : ""}
        </div>
      </div>
    `;

    attachFolderInteractions(li, index);
    list.appendChild(li);
  });

  if (!filteredFolders.length) {
    list.classList.add("folderList");
  }

  filteredFiles.forEach(({ file, index }) => {
    const li = document.createElement("li");
    li.className = "swipeRow";

    const icon = file.type && file.type.startsWith("image/") ? "🖼️" : "📄";

    li.innerHTML = `
      <div class="fileItem">
        <div class="fileName">${icon} ${escapeHtml(file.displayName || file.name)}</div>
      </div>
    `;

    attachFileInteractions(li, index, file);
    list.appendChild(li);
  });

  if (!filteredFolders.length && !filteredFiles.length) {
    const empty = document.createElement("li");
    empty.innerHTML = `
      <div class="fileItem" style="justify-content:center;color:#666;">
        Nessun elemento trovato
      </div>
    `;
    list.appendChild(empty);
  }

  if (editingBillingFolder && !deadlineEditor.classList.contains("hidden")) {
    renderDeadlineList(editingBillingFolder);
  }
}

/* -------------------- EVENTI -------------------- */

addBtn.onclick = () => {
  openFolderModal();
};

folderConfirmBtn.onclick = () => {
  const name = folderNameInput.value.trim();
  if (!name) return;

  createFolder(name);
  closeFolderModal();
};

folderCancelBtn.onclick = closeFolderModal;
folderBackdrop.onclick = closeFolderModal;

folderNameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    folderConfirmBtn.click();
  }
});

addFileBtn.onclick = () => fileInput.click();

fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const currentFolder = getCurrentFolder();
  if (!currentFolder) {
    alert("Apri prima una cartella");
    fileInput.value = "";
    return;
  }

  try {
    let storedData;

    if (file.type.startsWith("image/")) {
      storedData = await compressImage(file, 1200, 0.82);
    } else {
      storedData = await fileToDataUrl(file);
    }

    const storedFile = {
      id: createId(),
      name: file.name,
      displayName: getDisplayName(file.name),
      type: file.type || "application/octet-stream",
      data: storedData
    };

    currentFolder.files.push(storedFile);
    assignUploadedFileToBilling(currentFolder, storedFile);

    save();
    render();
  } catch (err) {
    console.error(err);
    alert("Errore durante il caricamento del file");
  }

  fileInput.value = "";
};

backBtn.onclick = () => {
  currentPath.pop();
  render();
};

searchInput.addEventListener("input", render);

backupBtn.onclick = downloadBackup;

restoreBtn.onclick = () => restoreInput.click();

restoreInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const ok = confirm("Vuoi sostituire l'archivio attuale con il backup selezionato?");
  if (!ok) {
    restoreInput.value = "";
    return;
  }

  await restoreBackup(file);
  restoreInput.value = "";
};

/* ACTION SHEET FILE */
actionSheetBackdrop.onclick = closeActionSheet;
cancelActionBtn.onclick = closeActionSheet;

moveActionBtn.onclick = () => {
  if (!selectedActionItem || selectedActionItem.type !== "file") return;

  const folder = getFolderByPath(selectedActionItem.parentPath);
  const file = folder.files[selectedActionItem.index];

  closeActionSheet();
  openMoveModal(file, selectedActionItem.parentPath, selectedActionItem.index);
};

editActionBtn.onclick = () => {
  if (!selectedActionItem) return;

  if (selectedActionItem.type === "file") {
    const folder = getFolderByPath(selectedActionItem.parentPath);
    const file = folder.files[selectedActionItem.index];
    closeActionSheet();
    openRenameModal(file);
  }
};

deleteActionBtn.onclick = () => {
  deleteSelectedItem();
  closeActionSheet();
};

/* RENAME */
renameConfirm.onclick = () => {
  if (!renameTarget) return;

  const newName = renameInput.value.trim();
  if (!newName) return;

  renameTarget.name = newName;
  renameTarget.displayName = getDisplayName(newName);

  save();
  render();
  closeRenameModal();
};

renameCancel.onclick = closeRenameModal;
renameBackdrop.onclick = closeRenameModal;

renameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    renameConfirm.click();
  }
});

/* MOVE MODAL */
closeMoveBtn.onclick = closeMoveModal;
moveBackdrop.onclick = closeMoveModal;

/* PDF VIEWER */
closePdfBtn.onclick = closePdfViewer;

sharePdfBtn.onclick = async () => {
  if (!currentViewerFile) return;

  try {
    const blob = dataUrlToBlob(currentViewerFile.data);
    const sharedFile = new File([blob], currentViewerFile.name, {
      type: currentViewerFile.type || "application/pdf"
    });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [sharedFile] })) {
      await navigator.share({
        files: [sharedFile],
        title: currentViewerFile.displayName || currentViewerFile.name
      });
      return;
    }

    alert("Condivisione non supportata su questo dispositivo");
  } catch (err) {
    console.error(err);
    alert("Impossibile condividere il file");
  }
};

printPdfBtn.onclick = () => {
  if (!currentPdfUrl) return;

  const win = window.open(currentPdfUrl, "_blank");
  if (!win) {
    alert("Popup bloccato");
    return;
  }

  win.onload = () => {
    win.print();
  };
};

/* BILLING EDITOR */
if (closeDeadlineEditorBtn) {
  closeDeadlineEditorBtn.onclick = closeBillingEditor;
}

if (deadlineEditorBackdrop) {
  deadlineEditorBackdrop.onclick = closeBillingEditor;
}

saveDeadlineBtn.onclick = () => {
  if (!editingBillingFolder) return;

  const billDay = Number(deadlineLabelInput.value.trim());
  const firstBillDate = deadlineFirstDateInput.value;
  const intervalMonths = Number(deadlineIntervalSelect.value || 2);

  if (!firstBillDate) {
    alert("Inserisci la prima bolletta attesa");
    return;
  }

  if (!billDay || billDay < 1 || billDay > 28) {
    alert("Il giorno bolletta deve essere tra 1 e 28");
    return;
  }

  editingBillingFolder.name = deadlineFolderNameInput.value.trim() || editingBillingFolder.name;
  editingBillingFolder.billing.enabled = true;
  editingBillingFolder.billing.billDay = billDay;
  editingBillingFolder.billing.firstBillDate = firstBillDate;
  editingBillingFolder.billing.intervalMonths = intervalMonths;

  ensureBillingCycles(editingBillingFolder);
  save();
  render();
  renderDeadlineList(editingBillingFolder);
  alert("Scadenze salvate");
};

replaceDeadlinesBtn.onclick = () => {
  if (!editingBillingFolder) return;

  const ok = confirm("Vuoi rigenerare i cicli delle bollette?");
  if (!ok) return;

  editingBillingFolder.billing.cycles = [];
  ensureBillingCycles(editingBillingFolder);
  save();
  render();
  renderDeadlineList(editingBillingFolder);
};

clearDeadlinesBtn.onclick = () => {
  if (!editingBillingFolder) return;

  const ok = confirm("Vuoi disattivare le scadenze per questa cartella?");
  if (!ok) return;

  editingBillingFolder.billing.enabled = false;
  editingBillingFolder.billing.billDay = "";
  editingBillingFolder.billing.firstBillDate = "";
  editingBillingFolder.billing.intervalMonths = 2;
  editingBillingFolder.billing.cycles = [];

  save();
  render();
  renderDeadlineList(editingBillingFolder);
};

/* -------------------- START -------------------- */

render();
