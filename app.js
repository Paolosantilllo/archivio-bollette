/* -------------------- DATI -------------------- */

let data =
JSON.parse(
localStorage.getItem("archivio")
) || [];

let currentPath = [];

let currentViewerFile = null;


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


/* -------------------- UTILS -------------------- */

function save(){

localStorage.setItem(
"archivio",
JSON.stringify(data)
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


function ensureFolderShape(folder){

if(!folder.folders)
folder.folders = [];

if(!folder.files)
folder.files = [];

folder.folders.forEach(
ensureFolderShape
);

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


const folders =
getCurrentLevel();

const files =
getCurrentFiles();


folders.forEach((folder,i)=>{

ensureFolderShape(folder);

const li =
document.createElement("li");

li.textContent =
"📁 " + folder.name;

li.onclick = ()=>{

currentPath.push(i);

render();

};

list.appendChild(li);

});


files.forEach((file,i)=>{

const li =
document.createElement("li");

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
files:[]

});

render();

};


backBtn.onclick = ()=>{

currentPath.pop();

render();

};


/* -------------------- FILE -------------------- */

addFileBtn.onclick = ()=>{

fileInput.click();

};


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


/* -------------------- PDF -------------------- */

function openFile(file){

currentViewerFile = file;

pdfTitle.textContent =
file.name;

/* adattamento automatico */
pdfFrame.src =
file.data +
"#toolbar=0&view=FitH";

pdfViewer.classList
.remove("hidden");

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

console.log("APP PRONTA");
