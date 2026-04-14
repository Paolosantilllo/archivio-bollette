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


/* -------------------- RENDER -------------------- */

function render(){

  list.innerHTML = "";

  const tx = db.transaction(["folders","files"], "readonly");

  const folderStore = tx.objectStore("folders");
  const fileStore = tx.objectStore("files");

  folderStore.getAll().onsuccess = e => {

    const folders = e.target.result.filter(f => f.parent === currentFolderId);

    folders.forEach(folder => {

      const li = document.createElement("li");
      li.textContent = "📁 " + folder.name;

li.onclick = () => {
  pathStack.push(currentFolderId);
  currentFolderId = folder.id;
  render();
};
      enableSwipe(li,
        ()=>renameFolder(folder),
        null,
        ()=>deleteFolder(folder)
      );

      list.appendChild(li);
    });
  };

  fileStore.getAll().onsuccess = e => {

    const files = e.target.result.filter(f => f.parent === currentFolderId);

    files.forEach(file => {

      const li = document.createElement("li");
      li.textContent = "📄 " + file.name;

      li.onclick = () => openFile(file);

      enableSwipe(li,
        ()=>renameFile(file),
        null,
        ()=>deleteFile(file)
      );

      list.appendChild(li);
    });
  };
}


/* -------------------- CARTELLE -------------------- */

function addFolder(){

  const name = prompt("Nome cartella");
  if(!name) return;

  const tx = db.transaction("folders","readwrite");

  tx.objectStore("folders").add({
    name,
    parent: currentFolderId
  });

  tx.oncomplete = render;
}

addFolderBtn.onclick = addFolder;


/* -------------------- FILE -------------------- */

addFileBtn.onclick = ()=>{

  fileInput.accept = "application/pdf";

  fileInput.onchange = e => {

    const file = e.target.files[0];
    if(!file) return;

    /* reset input (importantissimo) */
    fileInput.value = "";

    /* 🚫 blocco file troppo grandi */
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
        parent: currentFolderId,
        type: "pdf",
        created: Date.now()
      });

      tx.oncomplete = ()=>{
        render();
      };

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


/* -------------------- SWIPE -------------------- */

function enableSwipe(li,onRename,onMove,onDelete){

  let startX = 0;

  li.addEventListener("touchstart",e=>{
    startX = e.touches[0].clientX;
  });

  li.addEventListener("touchend",e=>{
    let endX = e.changedTouches[0].clientX;
    let diff = startX - endX;

    if(diff > 60){

      const action = prompt(
        "1 Rinomina\n3 Elimina"
      );

      if(action=="1") onRename();
      if(action=="3") onDelete();
    }
  });
}
