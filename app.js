let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];
let currentPdfUrl = null;
let currentViewerFile = null;
let selectedActionItem = null;
let renameTarget = null;

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

/* DEADLINE EDITOR */
const deadlineEditor = document.getElementById("deadlineEditor");
const closeDeadlineEditorBtn = document.getElementById("closeDeadlineEditorBtn");

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

/* -------------------- CREAZIONE -------------------- */

function createFolder(name) {
  const cleanName = name.trim();
  if (!cleanName) return;

  getCurrentLevel().push({
    name: cleanName,
    sub: [],
    files: [],
    image: null
  });

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
  pdfTitle.textContent = file.name;
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
    version: 1,
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
  moveCurrentFile.textContent = `File: ${fileItem.name}`;
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
    const ok = confirm(`Eliminare il file "${file.name}"?`);
    if (!ok) return;

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

function attachFileInteractions(li, index) {
  let timer = null;
  let longPressTriggered = false;

  li.addEventListener("click", () => {
    if (longPressTriggered) {
      longPressTriggered = false;
      return;
    }

    const currentFolder = getCurrentFolder();
    if (!currentFolder) return;

    const file = currentFolder.files[index];
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

  const filteredFolders = folders
    .map((folder, index) => ({ folder, index }))
    .filter(({ folder }) => folder.name.toLowerCase().includes(searchTerm));

  const filteredFiles = files
    .map((file, index) => ({ file, index }))
    .filter(({ file }) => file.name.toLowerCase().includes(searchTerm));

  if (filteredFolders.length) {
    list.classList.add("folderGrid");
  } else {
    list.classList.add("folderList");
  }

  filteredFolders.forEach(({ folder, index }) => {
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
    <div class="gridTitle">${escapeHtml(folder.name)}</div>
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
        <div class="fileName">${icon} ${escapeHtml(file.name)}</div>
      </div>
    `;

    attachFileInteractions(li, index);
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

    currentFolder.files.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      data: storedData
    });

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
        title: currentViewerFile.name
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

/* DEADLINE */
if (closeDeadlineEditorBtn) {
  closeDeadlineEditorBtn.onclick = () => {
    deadlineEditor.classList.add("hidden");
  };
}

/* -------------------- START -------------------- */

render();
