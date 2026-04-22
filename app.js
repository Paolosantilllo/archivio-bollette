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
const imageInput = document.getElementById("imageInput");

const pdfViewer = document.getElementById("pdfViewer");
const pdfFrame = document.getElementById("pdfFrame");
const pdfTitle = document.getElementById("pdfTitle");
const closePdfBtn = document.getElementById("closePdfBtn");


/* -------------------- INIT -------------------- */

function init(){
  render();
}


/* -------------------- BACK -------------------- */

backBtn.onclick = () => {
  currentFolderId = pathStack.length ? pathStack.pop() : null;
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

      const li = document.createElement("li");
      li.className = "swipeRow";

      const content = document.createElement("div");
      content.className = "swipeContent";

      /* CARD */
      const card = document.createElement("div");
      card.className = "gridCard";

      const imgWrap = document.createElement("div");
      imgWrap.className = "gridImageWrap";

      if(folder.cover){
        const img = document.createElement("img");
        img.src = folder.cover;
        img.className = "gridCover";
        imgWrap.appendChild(img);
      }else{
        const empty = document.createElement("div");
        empty.className = "gridCoverEmpty";
        empty.textContent = "📁";
        imgWrap.appendChild(empty);
      }

      const title = document.createElement("div");
      title.className = "gridTitle";
      title.textContent = folder.name;

      card.appendChild(imgWrap);
      card.appendChild(title);
      content.appendChild(card);
      li.appendChild(content);

      /* CLICK */
      content.onclick = ()=>{
        if(li.classList.contains("open")){
          closeAllSwipes();
          return;
        }
        pathStack.push(currentFolderId);
        currentFolderId = folder.id;
        render();
      };

      /* SWIPE */
      enableSwipe(
        li,
        () => renameFolder(folder),
        () => deleteFolder(folder),
        () => changeFolderImage(folder)
      );

      list.appendChild(li);
    });
  };

  /* FILE */
  fileStore.getAll().onsuccess = e => {

    const files = e.target.result.filter(f => f.parent === currentFolderId);

    files.forEach(file => {

      const li = document.createElement("li");
      li.className = "swipeRow";

      const content = document.createElement("div");
      content.className = "swipeContent fileItem";
      content.textContent = "📄 " + file.name;

      content.onclick = ()=>{
        if(li.classList.contains("open")){
          closeAllSwipes();
          return;
        }
        openFile(file);
      };

      li.appendChild(content);

      enableSwipe(
        li,
        () => renameFile(file),
        () => deleteFile(file),
        null
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
  <embed src="${file.data}" width="100%" height="100%">
  `;

  pdfViewer.classList.remove("hidden");
}

closePdfBtn.onclick = ()=>{
  pdfViewer.classList.add("hidden");
};


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


/* -------------------- IMMAGINE CARTELLA -------------------- */

function changeFolderImage(folder){

  imageInput.onchange = e=>{
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();

    reader.onload = ()=>{
      folder.cover = reader.result;

      const tx = db.transaction("folders","readwrite");
      tx.objectStore("folders").put(folder);
      tx.oncomplete = render;
    };

    reader.readAsDataURL(file);
  };

  imageInput.click();
}


/* -------------------- SWIPE iOS -------------------- */

let openedRow = null;

function enableSwipe(li, onRename, onDelete, onImage){

  const content = li.querySelector(".swipeContent");

  const actions = document.createElement("div");
  actions.className = "swipeActions";

  if(onImage){
    const btn = document.createElement("button");
    btn.textContent = "Img";
    btn.style.background = "#34c759";
    btn.onclick = e=>{
      e.stopPropagation();
      onImage();
      closeAllSwipes();
    };
    actions.appendChild(btn);
  }

  if(onRename){
    const btn = document.createElement("button");
    btn.className = "renameBtn";
    btn.textContent = "Rinomina";
    btn.onclick = e=>{
      e.stopPropagation();
      onRename();
      closeAllSwipes();
    };
    actions.appendChild(btn);
  }

  if(onDelete){
    const btn = document.createElement("button");
    btn.className = "deleteBtn";
    btn.textContent = "Elimina";
    btn.onclick = e=>{
      e.stopPropagation();
      onDelete();
      closeAllSwipes();
    };
    actions.appendChild(btn);
  }

  li.appendChild(actions);

  let startX = 0;
  let currentX = 0;
  let dragging = false;

  const MAX = 160;

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
      diff = MAX + (diff - MAX) / 3;
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
}

function openSwipe(li, content){
  closeAllSwipes();
  content.style.transform = "translateX(-160px)";
  li.classList.add("open");
  openedRow = {li, content};
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
    closeSwipe(openedRow.li, openedRow.content);
  }
}

document.addEventListener("touchstart", e=>{
  if(openedRow && !openedRow.li.contains(e.target)){
    closeAllSwipes();
  }
});
