alert("app caricata");

let data = JSON.parse(localStorage.getItem("archivio")) || [];

let currentFolder = null;

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");
const backBtn = document.getElementById("backBtn");

function save(){
localStorage.setItem("archivio", JSON.stringify(data));
}

function render(){

  backBtn.style.display = currentFolder === null ? "none" : "block";

  list.innerHTML="";

let items;

if(currentFolder === null){
items = data;
}else{
items = data[currentFolder].sub;
}

items.forEach((item,i)=>{

let li=document.createElement("li");
li.className="folder";

li.innerHTML="📁 "+item.name;

li.onclick=function(){
currentFolder=i;
render();
}
list.appendChild(li);
});

}

addBtn.onclick=function(){

let name=prompt("Nome cartella");

if(!name) return;

if(currentFolder === null){

data.push({
name:name,
sub:[]
});

}else{

data[currentFolder].sub.push({
name:name
});

}

save();
render();

}
backBtn.onclick = function(){
  currentFolder = null;
  render();
}
render()
