/* -------------------- DATABASE -------------------- */

let db;

const request = indexedDB.open("ArchivioDB", 1);

request.onupgradeneeded = e => {
  db = e.target.result;

  db.createObjectStore("folders", { keyPath: "id", autoIncrement: true });
  db.createObjectStore("files", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = e => {
  db = e.target.result;
  init();
};

request.onerror = () => {
  alert("Errore database");
};


/* -------------------- STATO -------------------- */

let currentFolderId = null;
let currentViewerFile = null;
let pathStack = [];


/* -------------------- ELEMENTI -------------------- */

const list = document.getElementById("folders");
const addFolderBtn = document.getElementById("addFolder");
const addFileBtn = document.getElementById("addFile");
const backBtn = document.getElementById("backBtn");
const fileInput = document.getElementById("fileInput");

const pdfViewer = document.getElementById("pdfViewer");
const pdfFrame = document.getElementById("pdfFrame");
const pdfTitle = document.getElementById("pdfTitle");
const closePdfBtn = document.getElementById("closePdfBtn");
const sharePdfBtn = document.getElementById("sharePdfBtn");


/* -------------------- INIT -------------------- */

function init(){
  render();
}


/* -------------------- BACK -------------------- */

backBtn.onclick = () => {
  if(pathStack.length === 0){
    currentFolderId = null;
  } else {
    currentFolderId = pathStack.pop();
  }
  render();
};


/* -------------------- RENDER -------------------- */

function render(){

  list.innerHTML = "";

  const tx = db.transaction(["folders","files"], "readonly");

  const folderStore = tx.objectStore("folders");
  const fileStore = tx.objectStore("files");

  /* CARTELLE */
  folderStore.getAll().onsuccess = e => {

    const folders = e.target.result.filter(f => f.parent === currentFolderId);

    folders.forEach(folder => {

      const li = createSwipeRow(
        "📁 " + folder.name,
        () => {
          pathStack.push(currentFolderId);
          currentFolderId = folder.id;
          render();
        },
        () => renameFolder(folder),
        () => deleteFolder(folder)
      );

      list.appendChild(li);
    });
  };

  /* FILE */
  fileStore.getAll().onsuccess = e => {

    const files = e.target.result.filter(f => f.parent === currentFolderId);

    files.forEach(file => {

      const li = createSwipeRow(
        "📄 " + file.name,
        () => openFile(file),
        () => renameFile(file),
        () => deleteFile(file)
      );

      list.appendChild(li);
    });
  };
}


/* -------------------- CARTELLE -------------------- */

addFolderBtn.onclick = ()=>{

  const name = prompt("Nome cartella");
  if(!name) return;

  const tx = db.transaction("folders","readwrite");

  tx.objectStore("folders").add({
    name,
    parent: currentFolderId
  });

  tx.oncomplete = render;
};


/* -------------------- FILE -------------------- */

addFileBtn.onclick = ()=>{

  fileInput.accept = "application/pdf";

  fileInput.onchange = e => {

    const file = e.target.files[0];
    if(!file) return;

    fileInput.value = "";

    if(file.size > 5 * 1024 * 1024){
      alert("PDF troppo grande (max 5MB)");
      return;
    }

    const reader = new FileReader();

    reader.onload = ()=>{

      const tx = db.transaction("files","readwrite");

      tx.objectStore("files").add({
        name: file.name,
        data: reader.result,
        parent: currentFolderId
      });

      tx.oncomplete = render;
    };

    reader.readAsDataURL(file);
  };

  fileInput.click();
};


/* -------------------- PDF -------------------- */

function openFile(file){

  currentViewerFile = file;
  pdfTitle.textContent = file.name;

  pdfFrame.srcdoc = `
  <html>
  <body style="margin:0">
  <embed src="${file.data}" width="100%" height="100%">
  </body>
  </html>
  `;

  pdfViewer.classList.remove("hidden");
}

closePdfBtn.onclick = ()=>{
  pdfViewer.classList.add("hidden");
};


/* -------------------- SHARE -------------------- */

sharePdfBtn.onclick = async ()=>{

  if(!currentViewerFile) return;

  if(navigator.share){

    const blob = dataUrlToBlob(currentViewerFile.data);

    const pdfFile = new File(
      [blob],
      currentViewerFile.name,
      {type:"application/pdf"}
    );

    await navigator.share({ files:[pdfFile] });
  }
};

function dataUrlToBlob(url){
  const arr = url.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);

  let n = bstr.length;
  const u8 = new Uint8Array(n);

  while(n--){
    u8[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8], {type:mime});
}


/* -------------------- AZIONI -------------------- */

function renameFolder(folder){
  const name = prompt("Nuovo nome", folder.name);
  if(!name) return;

  const tx = db.transaction("folders","readwrite");
  folder.name = name;
  tx.objectStore("folders").put(folder);
  tx.oncomplete = render;
}

function deleteFolder(folder){
  if(!confirm("Eliminare cartella?")) return;

  const tx = db.transaction("folders","readwrite");
  tx.objectStore("folders").delete(folder.id);
  tx.oncomplete = render;
}

function renameFile(file){
  const name = prompt("Nuovo nome", file.name);
  if(!name) return;

  const tx = db.transaction("files","readwrite");
  file.name = name;
  tx.objectStore("files").put(file);
  tx.oncomplete = render;
}

function deleteFile(file){
  if(!confirm("Eliminare file?")) return;

  const tx = db.transaction("files","readwrite");
  tx.objectStore("files").delete(file.id);
  tx.oncomplete = render;
}


/* -------------------- SWIPE iOS PERFETTO -------------------- */

let openedRow = null;

function createSwipeRow(text, onClick, onRename, onDelete){

  const li = document.createElement("li");
  li.className = "swipeRow";

  const content = document.createElement("div");
  content.className = "swipeContent";
  content.textContent = text;

  const actions = document.createElement("div");
  actions.className = "swipeActions";

  if(onRename){
    const btn = document.createElement("button");
    btn.className = "renameBtn";
    btn.textContent = "Rinomina";
    btn.onclick = e=>{
      e.stopPropagation();
      closeAllSwipes();
      onRename();
    };
    actions.appendChild(btn);
  }

  if(onDelete){
    const btn = document.createElement("button");
    btn.className = "deleteBtn";
    btn.textContent = "Elimina";
    btn.onclick = e=>{
      e.stopPropagation();
      closeAllSwipes();
      onDelete();
    };
    actions.appendChild(btn);
  }

  li.appendChild(actions);
  li.appendChild(content);

  content.addEventListener("click", ()=>{
    if(li.classList.contains("open")){
      closeSwipe(li, content);
    } else {
      onClick();
    }
  });

  let startX = 0;
  let currentX = 0;
  let dragging = false;

  const MAX = 140;

  content.addEventListener("touchstart", e=>{
    startX = e.touches[0].clientX;
    dragging = true;
  });

  content.addEventListener("touchmove", e=>{
    if(!dragging) return;

    currentX = e.touches[0].clientX;
    let diff = startX - currentX;

    if(diff < 0) diff = 0;

    if(diff > MAX){
      diff = MAX + (diff - MAX) / 4;
    }

    content.style.transform = `translateX(-${diff}px)`;
  });

  content.addEventListener("touchend", ()=>{
    dragging = false;

    let diff = startX - currentX;

    if(diff > 70){
      openSwipe(li, content);
    }else{
      closeSwipe(li, content);
    }
  });

  return li;
}


/* -------------------- GESTIONE SWIPE -------------------- */

function openSwipe(li, content){
  closeAllSwipes();

  content.style.transform = "translateX(-140px)";
  li.classList.add("open");

  openedRow = { li, content };
}

function closeSwipe(li, content){
  content.style.transform = "translateX(0)";
  li.classList.remove("open");

  if(openedRow && openedRow.li === li){
    openedRow = null;
  }
}

function closeAllSwipes(){
  if(openedRow){
    openedRow.content.style.transform = "translateX(0)";
    openedRow.li.classList.remove("open");
    openedRow = null;
  }
}

document.addEventListener("touchstart", e=>{
  if(openedRow && !openedRow.li.contains(e.target)){
    closeAllSwipes();
  }
});
