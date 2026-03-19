let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");
const fileInput = document.getElementById("fileInput");

/* -------------------- SALVATAGGIO -------------------- */

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
}

/* -------------------- STRUTTURA -------------------- */

function getCurrentLevel() {
  let level = data;

  for (let i = 0; i < currentPath.length; i++) {
    level = level[currentPath[i]].sub;
  }

  return level;
}

function getCurrentFolder() {
  let folder = null;
  let level = data;

  for (let i = 0; i < currentPath.length; i++) {
    folder = level[currentPath[i]];
    level = folder.sub;
  }

  return folder;
}

/* -------------------- PATH -------------------- */

function getPathNames() {
  let names = ["Home"];
  let level = data;

  for (let i = 0; i < currentPath.length; i++) {
    const folder = level[currentPath[i]];
    names.push(folder.name);
    level = folder.sub;
  }

  return names.join(" / ");
}

/* -------------------- CREA CARTELLA -------------------- */

function createFolder(name) {
  const items = getCurrentLevel();

  items.push({
    name: name,
    sub: [],
    files: [],
    image: null
  });

  save();
  render();
}

/* -------------------- MENU IOS -------------------- */

function openContextMenu(actions) {
  const menu = document.createElement("div");
  menu.className = "iosMenu";

  menu.innerHTML = `
    <div class="iosMenuBox">
      <button id="mOpen">Apri</button>
      <button id="mEdit">Rinomina</button>
      <button id="mMove">Sposta</button>
      <button id="mDelete" class="danger">Elimina</button>
      <button id="mCancel">Annulla</button>
    </div>
  `;

  document.body.appendChild(menu);

  document.getElementById("mOpen").onclick = () => {
    actions.openAction();
    menu.remove();
  };

  document.getElementById("mEdit").onclick = () => {
    actions.editAction();
    menu.remove();
  };

  document.getElementById("mMove").onclick = () => {
    if (actions.moveAction) actions.moveAction();
    menu.remove();
  };

  document.getElementById("mDelete").onclick = () => {
    actions.deleteAction();
    menu.remove();
  };

  document.getElementById("mCancel").onclick = () => {
    menu.remove();
  };
}

/* -------------------- RIGA -------------------- */

function createRow(labelHTML, actions) {
  const row = document.createElement("li");
  row.className = "row";

  row.innerHTML = `<div class="rowContent">${labelHTML}</div>`;

  row.onclick = actions.openAction;

  let pressTimer;

  row.addEventListener("touchstart", () => {
    pressTimer = setTimeout(() => {
      openContextMenu(actions);
    }, 500);
  });

  row.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
  });

  return row;
}

/* -------------------- RENDER -------------------- */

function render() {
  list.innerHTML = "";

  const folders = getCurrentLevel();
  const currentFolder = getCurrentFolder();
  const files = currentFolder ? currentFolder.files : [];

  pathBox.textContent = getPathNames();

  backBtn.style.display = currentPath.length ? "block" : "none";
  addFileBtn.style.display = currentPath.length ? "block" : "none";

  /* CARTELLE */
  folders.forEach((f, i) => {
    const label = `
      <div style="display:flex;align-items:center;gap:10px;">
        ${f.image ? `<img src="${f.image}" style="width:40px;height:40px;border-radius:8px;">` : "📁"}
        <span>${f.name}</span>
      </div>
    `;

    const row = createRow(label, {
      openAction: () => {
        currentPath.push(i);
        render();
      },
      editAction: () => renameFolder(f),
      deleteAction: () => {
        if (confirm("Eliminare cartella?")) {
          folders.splice(i, 1);
          save();
          render();
        }
      },
      moveAction: null
    });

    list.appendChild(row);
  });

  /* FILE */
  files.forEach((file, i) => {
    const row = createRow(`📄 ${file.name}`, {
      openAction: () => alert("Apro PDF"),
      editAction: () => renameFile(file),
      deleteAction: () => {
        if (confirm("Eliminare file?")) {
          files.splice(i, 1);
          save();
          render();
        }
      },
      moveAction: null
    });

    list.appendChild(row);
  });
}

/* -------------------- RINOMINA -------------------- */

function renameFolder(folder) {
  const name = prompt("Nuovo nome", folder.name);
  if (!name) return;
  folder.name = name;
  save();
  render();
}

function renameFile(file) {
  const name = prompt("Nuovo nome", file.name);
  if (!name) return;
  file.name = name;
  save();
  render();
}

/* -------------------- EVENTI -------------------- */

addBtn.onclick = () => {
  const name = prompt("Nome cartella");
  if (!name) return;
  createFolder(name);
};

addFileBtn.onclick = () => {
  fileInput.click();
};

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const folder = getCurrentFolder();
  folder.files.push({ name: file.name });

  save();
  render();
};

backBtn.onclick = () => {
  currentPath.pop();
  render();
};

/* -------------------- START -------------------- */

render();