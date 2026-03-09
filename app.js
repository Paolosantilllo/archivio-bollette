alert("app caricata");

let data = JSON.parse(localStorage.getItem("archivio")) || [];
let currentPath = [];

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const pathBox = document.getElementById("path");
const searchInput = document.getElementById("search");
const fileInput = document.getElementById("fileInput");

function save() {
  localStorage.setItem("archivio", JSON.stringify(data));
}

function ensureFolderStructure(folder) {
  if (!folder.sub) folder.sub = [];
  if (!folder.files) folder.files = [];
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

function openFile(file) {
  if (!file.data) return;
  window.open(file.data, "_blank");
}

function renderFolders(items, searchText) {
  items.forEach((item, i) => {
    ensureFolderStructure(item);

    if (searchText && !item.name.toLowerCase().includes(searchText)) {
      return;
    }

    let li = document.createElement("li");
    li.className = "folder";

    let nameSpan = document.createElement("span");
    nameSpan.className = "folderName";
    nameSpan.textContent = "📁 " + item.name;

    nameSpan.onclick = function () {
      currentPath.push(i);
      render();
    };

    let actions = document.createElement("div");
    actions.className = "actions";

    let renameBtn = document.createElement("button");
    renameBtn.textContent = "Rinomina";
    renameBtn.onclick = function (e) {
      e.stopPropagation();

      let newName = prompt("Nuovo nome cartella", item.name);
      if (!newName || !newName.trim()) return;

      item.name = newName.trim();
      save();
      render();
    };

    let deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Elimina";
    deleteBtn.onclick = function (e) {
      e.stopPropagation();

      let ok = confirm("Vuoi eliminare la cartella '" + item.name + "'?");
      if (!ok) return;

      items.splice(i, 1);
      save();
      render();
    };

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(nameSpan);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

function renderFiles(files, searchText) {
  files.forEach((file, i) => {
    if (searchText && !file.name.toLowerCase().includes(searchText)) {
      return;
    }

    let li = document.createElement("li");
    li.className = "fileItem";

    let nameSpan = document.createElement("span");
    nameSpan.className = "fileName";
    nameSpan.textContent = "📄 " + file.name;

    nameSpan.onclick = function () {
      openFile(file);
    };

    let actions = document.createElement("div");
    actions.className = "actions";

    let renameBtn = document.createElement("button");
    renameBtn.textContent = "Rinomina";
    renameBtn.onclick = function (e) {
      e.stopPropagation();

      let newName = prompt("Nuovo nome documento", file.name);
      if (!newName || !newName.trim()) return;

      file.name = newName.trim();
      save();
      render();
    };

    let deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Elimina";
    deleteBtn.onclick = function (e) {
      e.stopPropagation();

      let ok = confirm("Vuoi eliminare il documento '" + file.name + "'?");
      if (!ok) return;

      files.splice(i, 1);
      save();
      render();
    };

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(nameSpan);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

function render() {
  backBtn.style.display = currentPath.length === 0 ? "none" : "inline-block";
  pathBox.textContent = getPathNames();
  list.innerHTML = "";

  let items = getCurrentLevel();
  let files = getCurrentFiles();
  let searchText = searchInput.value.toLowerCase().trim();

  renderFolders(items, searchText);
  renderFiles(files, searchText);
}

addBtn.onclick = function () {
  let name = prompt("Nome cartella");
  if (!name || !name.trim()) return;

  let items = getCurrentLevel();

  items.push({
    name: name.trim(),
    sub: [],
    files: []
  });

  save();
  render();
};

addFileBtn.onclick = function () {
  if (currentPath.length === 0) {
    alert("Entra prima in una cartella per aggiungere un documento.");
    return;
  }

  fileInput.value = "";
  fileInput.click();
};

fileInput.onchange = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const files = getCurrentFiles();

    files.push({
      name: file.name,
      type: file.type,
      data: e.target.result
    });

    save();
    render();
  };

  reader.readAsDataURL(file);
};

backBtn.onclick = function () {
  currentPath.pop();
  render();
};

searchInput.addEventListener("input", render);

render();
