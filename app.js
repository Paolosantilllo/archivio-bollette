/* -------------------- DATI -------------------- */

let data =
JSON.parse(
localStorage.getItem("archivio")
) || [];

let currentPath = [];

let currentViewerFile = null;

let currentView =
localStorage.getItem("viewMode")
|| "grid";


/* -------------------- ELEMENTI -------------------- */

const list =
document.getElementById("folders");

const pathBox =
document.getElementById("path");

const backBtn =
document.getElementById("backBtn");

const addFolderBtn =
document.getElementById("addFolder");

const addFileBtn =
document.getElementById("addFile");

const fileInput =
document.getElementById("fileInput");

const pdfViewer =
document.getElementById("pdfViewer");

const pdfFrame =
document.getElementById("pdfFrame");

const pdfTitle =
document.getElementById("pdfTitle");

const closePdfBtn =
document.getElementById("closePdfBtn");

const sharePdfBtn =
document.getElementById("sharePdfBtn");

const printPdfBtn =
document.getElementById("printPdfBtn");

const viewToggleBtn =
document.getElementById("viewToggleBtn");


/* -------------------- UTILS -------------------- */

function save(){

localStorage.setItem(
"archivio",
JSON.stringify(data)
);

localStorage.setItem(
"viewMode",
currentView
);

}


function ensureFolderShape(folder){

if(!folder.folders)
folder.folders = [];

if(!folder.files)
folder.files = [];

if(!folder.cover)
folder.cover = null;

folder.folders.forEach(
ensureFolderShape
);

}


function getCurrentFolder(){

let folder = { folders:data };

for(const i of currentPath){

folder = folder.folders[i];

}

return folder;

}


function getCurrentLevel(){

return getCurrentFolder().folders;

}


function getCurrentFiles(){

return getCurrentFolder().files || [];

}


function getPath(){

if(!currentPath.length)
return "Home";

let names = ["Home"];

let folder = { folders:data };

for(const i of currentPath){

folder = folder.folders[i];

names.push(folder.name);

}

return names.join(" / ");

}


/* -------------------- RENDER -------------------- */

function render(){

list.innerHTML = "";

pathBox.textContent =
getPath();

backBtn.style.display =
currentPath.length
? "block"
: "none";

addFileBtn.style.display =
currentPath.length
? "block"
: "none";


list.className =
currentView === "grid"
? "folderGrid"
: "folderList";


const folders =
getCurrentLevel();

const files =
getCurrentFiles();


/* CARTELLE */

folders.forEach((folder,i)=>{

ensureFolderShape(folder);

const li =
document.createElement("li");

li.className =
"swipeRow";

const card =
document.createElement("div");

card.className =
"gridCard";

const imgWrap =
document.createElement("div");

imgWrap.className =
"gridImageWrap";

if(folder.cover){

const img =
document.createElement("img");

img.src =
folder.cover;

img.className =
"gridCover";

imgWrap.appendChild(img);

}else{

const empty =
document.createElement("div");

empty.className =
"gridCoverEmpty";

empty.textContent =
"📁";

imgWrap.appendChild(empty);

}

/* click immagine = cambia cover */

imgWrap.onclick = e=>{

e.stopPropagation();

fileInput.accept =
"image/*";

fileInput.onchange = ev=>{

const file =
ev.target.files[0];

if(!file) return;

const reader =
new FileReader();

reader.onload = ()=>{

folder.cover =
reader.result;

save();

render();

};

reader.readAsDataURL(file);

};

fileInput.click();

};


const title =
document.createElement("div");

title.className =
"gridTitle";

title.textContent =
folder.name;


card.appendChild(imgWrap);

card.appendChild(title);


/* apri cartella */

card.onclick = ()=>{

currentPath.push(i);

render();

};


li.appendChild(card);

list.appendChild(li);

});


/* FILE */

files.forEach((file,i)=>{

const li =
document.createElement("li");

li.className =
"fileItem";

li.textContent =
"📄 " +
file.name.replace(".pdf","");


li.onclick = ()=>{

openFile(file);

};

list.appendChild(li);

});


save();

}


/* -------------------- CARTELLE -------------------- */

addFolderBtn.onclick = ()=>{

const name =
prompt("Nome cartella");

if(!name) return;

getCurrentLevel().push({

name,
folders:[],
files:[],
cover:null

});

render();

};


backBtn.onclick = ()=>{

currentPath.pop();

render();

};


/* -------------------- FILE -------------------- */

addFileBtn.onclick = ()=>{

fileInput.accept =
"application/pdf,image/*";

fileInput.onchange = e => {

const file =
e.target.files[0];

if(!file) return;

const reader =
new FileReader();

reader.onload = ()=>{

getCurrentFiles().push({

name:file.name,
data:reader.result

});

render();

};

reader.readAsDataURL(file);

};

fileInput.click();

};


/* -------------------- VISTA -------------------- */

viewToggleBtn.onclick = ()=>{

currentView =
currentView === "grid"
? "list"
: "grid";

render();

};


/* -------------------- PDF -------------------- */

function openFile(file){

currentViewerFile = file;

pdfTitle.textContent =
file.name;


/* PDF adattato alla larghezza schermo */

pdfFrame.src =
file.data +
"#toolbar=0&zoom=page-width";


pdfFrame.style.width = "100%";
pdfFrame.style.height = "100%";
pdfFrame.style.border = "none";


pdfViewer.classList.remove("hidden");

}


closePdfBtn.onclick = ()=>{

pdfViewer.classList
.add("hidden");

pdfFrame.src = "";

};


sharePdfBtn.onclick = async ()=>{

if(!currentViewerFile) return;

if(navigator.share){

const blob =
dataUrlToBlob(
currentViewerFile.data
);

const pdfFile =
new File(
[blob],
currentViewerFile.name,
{type:"application/pdf"}
);

await navigator.share({

files:[pdfFile]

});

}

};


printPdfBtn.onclick = ()=>{

if(!currentViewerFile) return;

const win =
window.open(
currentViewerFile.data
);

win.onload = ()=>{

win.print();

};

};


function dataUrlToBlob(url){

const arr =
url.split(",");

const mime =
arr[0].match(/:(.*?);/)[1];

const bstr =
atob(arr[1]);

let n =
bstr.length;

const u8 =
new Uint8Array(n);

while(n--){

u8[n] =
bstr.charCodeAt(n);

}

return new Blob(
[u8],
{type:mime}
);

}


/* -------------------- AVVIO -------------------- */

data.forEach(
ensureFolderShape
);

render();

console.log(
"APP PRONTA"
);
