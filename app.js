// ================== STATO ==================
let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");

// ================== UTILS ==================
function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
}

function ensureFolder(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
}

function getCurrentLevel() {
  let level = data;
  for (let i = 0; i < currentPath.length; i++) {
    ensureFolder(level[currentPath[i]]);
    level = level[currentPath[i]].sub;
  }
  return level;
}

function getCurrentFolder() {
  if (currentPath.length === 0) return null;
  let level = data;
  let folder;
  for (let i = 0; i < currentPath.length; i++) {
    folder = level[currentPath[i]];
    ensureFolder(folder);
    level = folder.sub;
  }
  return folder;
}

function getPathNames() {
  let names = ["Home"];
  let level = data;
  for (let i = 0; i < currentPath.length; i++) {
    const f = level[currentPath[i]];
    names.push(f.name);
    level = f.sub;
  }
  return names.join(" / ");
}

// ================== SWIPE ==================
function attachSwipe(el, onSwipeLeft) {
  let startX = 0;
  let currentX = 0;

  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  el.addEventListener("touchmove", e => {
    currentX = e.touches[0].clientX;
  });

  el.addEventListener("touchend", () => {
    if (startX - currentX > 60) {
      onSwipeLeft();
    }
  });
}

// ================== ACTION SHEET ==================
let currentAction = null;

function openActionSheet(actions) {
  currentAction = actions;

  const scelta = prompt(
    "Scrivi:\n1 = Modifica\n2 = Elimina\n3 = Sposta"
  );

  if (scelta === "1" && actions.editAction) actions.editAction();
  if (scelta === "2" && actions.deleteAction) actions.deleteAction();
  if (scelta === "3" && actions.moveAction) actions.moveAction();
}

// ================== CREAZIONE RIGA ==================
function createRow(label, openAction, editAction, deleteAction, moveAction) {
  const li = document.createElement("li");
  li.textContent = label;

  li.onclick = openAction;

  attachSwipe(li, () => {
    openActionSheet({
      editAction,
      deleteAction,
      moveAction
    });
  });

  return li;
}

// ================== RENDER ==================
function render() {
  list.innerHTML = "";
  pathBox.textContent = getPathNames();

  const folders = getCurrentLevel();
  const currentFolder = getCurrentFolder();
  const files = currentFolder ? currentFolder.files : [];

  backBtn.style.display = currentPath.length ? "block" : "none";
  addFileBtn.style.display = currentPath.length ? "block" : "none";

  // CARTELLE
  folders.forEach((f, i) => {
    ensureFolder(f);

    const row = createRow(
      "📁 " + f.name,
      () => {
        currentPath.push(i);
        render();
      },
      () => {
        const nuovo = prompt("Nuovo nome:", f.name);
        if (nuovo) {
          f.name = nuovo;
          save();
          render();
        }
      },
      () => {
        if (confirm("Eliminare cartella?")) {
          folders.splice(i, 1);
          save();
          render();
        }
      }
    );

    list.appendChild(row);
  });

  // FILE
  files.forEach((file, i) => {
    const row = createRow(
      "📄 " + file.name,
      () => alert("Apertura file (qui puoi integrare PDF)"),
      () => {
        const nuovo = prompt("Nuovo nome:", file.name);
        if (nuovo) {
          file.name = nuovo;
          save();
          render();
        }
      },
      () => {
        if (confirm("Eliminare file?")) {
          files.splice(i, 1);
          save();
          render();
        }
      }
    );

    list.appendChild(row);
  });
}

// ================== EVENTI ==================
addBtn.onclick = () => {
  const nome = prompt("Nome cartella:");
  if (!nome) return;

  getCurrentLevel().push({
    name: nome,
    sub: [],
    files: []
  });

  save();
  render();
};

addFileBtn.onclick = () => {
  const nome = prompt("Nome file:");
  if (!nome) return;

  const folder = getCurrentFolder();
  folder.files.push({ name: nome });

  save();
  render();
};

backBtn.onclick = () => {
  currentPath.pop();
  render();
};

// ================== START ==================
render();