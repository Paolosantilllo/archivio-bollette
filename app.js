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

try{

localStorage.setItem(
"archivio",
JSON.stringify(data)
);

}catch(e){

console.warn("memoria piena");

}

}
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

const li = document.createElement("li");

li.className = "swipeRow";


/* CARD */

const card = document.createElement("div");

card.className = "gridCard";


/* COVER */

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


/* cambia immagine cartella */

imgWrap.onclick = e=>{

e.stopPropagation();

fileInput.accept = "image/*";

fileInput.onchange = ev=>{

const file = ev.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = ()=>{

folder.cover = reader.result;

save();

render();

};

reader.readAsDataURL(file);

};

fileInput.click();

};


/* titolo */

const title = document.createElement("div");

title.className = "gridTitle";

title.textContent = folder.name;


card.appendChild(imgWrap);

card.appendChild(title);


/* apri cartella */

card.onclick = ()=>{

currentPath.push(i);

render();

};


li.appendChild(card);


/* SWIPE CARTELLA */

enableSwipe(

li,

()=>{

const nuovo = prompt(

"Nuovo nome",

folder.name

);

if(nuovo){

folder.name = nuovo;

render();

}

},

null,

()=>{

if(confirm("Eliminare cartella?")){

folders.splice(i,1);

render();

}

}

);


list.appendChild(li);

});


/* FILE */

files.forEach((file,i)=>{

const li = document.createElement("li");

li.className = "fileItem";

li.textContent =
"📄 " +
file.name.replace(".pdf","");


li.onclick = ()=>{

openFile(file);

};


/* SWIPE PDF */

enableSwipe(

li,

()=>{

const nuovo = prompt(

"Nuovo nome",

file.name

);

if(nuovo){

file.name = nuovo;

render();

}

},

()=>{

const dest = prompt(

"Indice cartella destinazione"

);

if(dest!==null){

const folder = getCurrentLevel()[dest];

if(folder){

folder.files.push(file);

files.splice(i,1);

render();

}

}

},

()=>{

if(confirm("Eliminare file?")){

files.splice(i,1);

render();

}

}

);


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

pdfTitle.textContent = file.name;


function loadPDF(){

pdfFrame.srcdoc = `
<html>

<head>

<meta name="viewport"
content="width=device-width,
initial-scale=1,
maximum-scale=5">

<style>

html,body{

margin:0;
padding:0;
height:100%;
background:#111;

}

embed{

width:100%;
height:100%;

}

</style>

</head>

<body>

<embed
src="${file.data}"
type="application/pdf">

</body>

</html>
`;

}


/* prima apertura */

loadPDF();

pdfViewer.classList.remove("hidden");


/* aggiorna quando ruoti telefono */

window.addEventListener(
"orientationchange",
loadPDF
);

window.addEventListener(
"resize",
loadPDF
);

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
function enableSwipe(li,onRename,onMove,onDelete){

let startX = 0;

li.addEventListener("touchstart",e=>{

startX = e.touches[0].clientX;

});

li.addEventListener("touchend",e=>{

let endX = e.changedTouches[0].clientX;

let diff = startX - endX;


/* swipe sinistra */

if(diff > 60){

showActions();

}

});


function showActions(){

const action = prompt(

"1 rinomina\n2 sposta\n3 elimina"

);

if(action=="1") onRename();

if(action=="2" && onMove) onMove();

if(action=="3") onDelete();

}

}
