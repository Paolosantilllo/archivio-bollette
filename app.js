="57028"}
let folders = JSON.parse(localStorage.getItem("folders")) || [];

const list = document.getElementById("folders");
const addBtn = document.getElementById("addFolder");

function render(){
list.innerHTML="";

folders.forEach((f,i)=>{
let li=document.createElement("li");
li.className="folder";
li.innerText="📁 "+f;
list.appendChild(li);
});

localStorage.setItem("folders",JSON.stringify(folders));
}

addBtn.onclick=function(){

let name=prompt("Nome cartella");

if(name){
folders.push(name);
render();
}

}
