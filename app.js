let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];
let currentPdfUrl = null;

/* ELEMENTI */
const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");
const fileInput = document.getElementById("fileInput");

/* -------------------- SAVE -------------------- */

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
}

/* -------------------- NAVIGAZIONE -------------------- */

function getCurrentLevel() {
  let level = data;
  currentPath.forEach(i => level = level[i].sub);
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

/* -------------------- CREAZIONE -------------------- */

function createFolder(name) {
  getCurrentLevel().push({
    name,
    sub: [],
    files: [],
    image: null
  });

  save();
  render();
}

/* -------------------- MENU IOS -------------------- */

function openMenu(actions) {
  const menu = document.createElement("div");
  menu.className = "iosMenu";

  menu.innerHTML = `
    <div class="iosMenuBox">
      <button id="open">Apri</button>
      <button id="rename">Rinomina</button>
      <button id="image">Immagine</button>
      <button id="delete" class="danger">Elimina</button>
      <button id="cancel">Annulla</button>
    </div>
  `;

  document.body.appendChild(menu);

  const close = () => menu.remove();

  document.getElementById("open").onclick = () => { actions.open(); close(); };
  document.getElementById("rename").onclick = () => { actions.rename(); close(); };
  document.getElementById("image").onclick = () => { actions.image(); close(); };
  document.getElementById("delete").onclick = () => { actions.delete(); close(); };
  document.getElementById("cancel").onclick = close;
}

/* -------------------- ROW -------------------- */

function createRow(html, actions) {
  const row = document.createElement("li");
  row.className = "row";
  row.innerHTML = html;

  row.onclick = actions.open;

  let timer;
  row.addEventListener("touchstart", () => {
    timer = setTimeout(() => openMenu(actions), 500);
  });

  row.addEventListener("touchend", () => clearTimeout(timer));

  return row;
}

/* -------------------- PDF -------------------- */

function openPDF(file) {
  const blob = new Blob([file.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank");
  if (!win) alert("Popup bloccato");

  currentPdfUrl = url;
}

/* -------------------- RENDER -------------------- */

function render() {
  list.innerHTML = "";
  pathBox.textContent = getPath();

  backBtn.style.display = currentPath.length ? "block" : "none";
  addFileBtn.style.display = currentPath.length ? "block" : "none";

  const folders = getCurrentLevel();
  const folder = getCurrentFolder();
  const files = folder ? folder.files : [];

  /* CARTELLE */
  folders.forEach((f, i) => {
    const html = `
      <div class="card">
        ${f.image 
          ? `<img src="${f.image}" class="cover">`
          : `<div class="cover empty">📁</div>`
        }
        <div class="title">${f.name}</div>
      </div>
    `;

    list.appendChild(createRow(html, {
      open: () => {
        currentPath.push(i);
        render();
      },
      rename: () => {
        const n = prompt("Nome", f.name);
        if (!n) return;
        f.name = n;
        save(); render();
      },
      image: () => {
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = "image/*";

        picker.onchange = e => {
          const file = e.target.files[0];
          const reader = new FileReader();

          reader.onload = () => {
            f.image = reader.result;
            save(); render();
          };

          reader.readAsDataURL(file);
        };

        picker.click();
      },
      delete: () => {
        if (confirm("Eliminare?")) {
          folders.splice(i, 1);
          save(); render();
        }
      }
    }));
  });

  /* FILE */
  files.forEach((file, i) => {
    const html = `
      <div class="file">
        📄 ${file.name}
      </div>
    `;

    list.appendChild(createRow(html, {
      open: () => openPDF(file),
      rename: () => {
        const n = prompt("Nome", file.name);
        if (!n) return;
        file.name = n;
        save(); render();
      },
      image: () => {},
      delete: () => {
        if (confirm("Eliminare file?")) {
          files.splice(i, 1);
          save(); render();
        }
      }
    }));
  });
}

/* -------------------- EVENTI -------------------- */

addBtn.onclick = () => {
  const name = prompt("Nome cartella");
  if (!name) return;
  createFolder(name);
};

addFileBtn.onclick = () => fileInput.click();

fileInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  const folder = getCurrentFolder();

  folder.files.push({
    name: file.name,
    data: arrayBuffer
  });

  save();
  render();
};

backBtn.onclick = () => {
  currentPath.pop();
  render();
};

/* -------------------- START -------------------- */

render();