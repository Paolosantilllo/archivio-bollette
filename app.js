// ===================== STATO =====================
let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");

// ===================== UTILS =====================
function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
}

function ensureFolder(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
  if (!folder.image) folder.image = null;
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

// ===================== SWIPE =====================
function attachSwipe(el, onSwipeLeft) {
  let startX = 0;

  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });

  el.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    if (startX - endX > 60) onSwipeLeft();
  });
}

// ===================== ACTION MENU =====================
function openActionMenu(actions) {
  const scelta = prompt(
    "1 = Rinomina\n2 = Elimina\n3 = Cambia immagine"
  );

  if (scelta === "1" && actions.rename) actions.rename();
  if (scelta === "2" && actions.delete) actions.delete();
  if (scelta === "3" && actions.image) actions.image();
}

// ===================== RIGA =====================
function createRow(contentHTML, onClick, actions) {
  const li = document.createElement("li");
  li.className = "row";
  li.innerHTML = contentHTML;

  li.onclick = onClick;

  attachSwipe(li, () => openActionMenu(actions));

  return li;
}

// ===================== RENDER =====================
function render() {
  list.innerHTML = "";
  pathBox.textContent = getPathNames();

  const folders = getCurrentLevel();
  const currentFolder = getCurrentFolder();
  const files = currentFolder ? currentFolder.files : [];

  backBtn.style.display = currentPath.length ? "block" : "none";
  addFileBtn.style.display = currentPath.length ? "block" : "none";

  // ===== CARTELLE =====
  folders.forEach((f, i) => {
    ensureFolder(f);

    const html = `
      <div style="display:flex;align-items:center;gap:12px;">
        ${
          f.image
            ? `<img src="${f.image}" style="width:50px;height:50px;border-radius:12px;object-fit:cover;">`
            : `<div style="font-size:30px;">📁</div>`
        }
        <div style="font-weight:600;">${f.name}</div>
      </div>
    `;

    const row = createRow(
      html,
      () => {
        currentPath.push(i);
        render();
      },
      {
        rename: () => {
          const nuovo = prompt("Nuovo nome:", f.name);
          if (!nuovo) return;
          f.name = nuovo;
          save();
          render();
        },
        delete: () => {
          if (confirm("Eliminare cartella?")) {
            folders.splice(i, 1);
            save();
            render();
          }
        },
        image: () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";

          input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
              f.image = reader.result;
              save();
              render();
            };
            reader.readAsDataURL(file);
          };

          input.click();
        }
      }
    );

    list.appendChild(row);
  });

  // ===== FILE =====
  files.forEach((file, i) => {
    const html = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:24px;">📄</div>
        <div>${file.name}</div>
      </div>
    `;

    const row = createRow(
      html,
      () => alert("Apertura file (puoi aggiungere PDF qui)"),
      {
        rename: () => {
          const nuovo = prompt("Nuovo nome:", file.name);
          if (!nuovo) return;
          file.name = nuovo;
          save();
          render();
        },
        delete: () => {
          if (confirm("Eliminare file?")) {
            files.splice(i, 1);
            save();
            render();
          }
        }
      }
    );

    list.appendChild(row);
  });
}

// ===================== EVENTI =====================
addBtn.onclick = () => {
  const nome = prompt("Nome cartella:");
  if (!nome) return;

  getCurrentLevel().push({
    name: nome,
    sub: [],
    files: [],
    image: null
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

// ===================== START =====================
render();