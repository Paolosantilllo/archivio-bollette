fileInput.onchange = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    alert("Puoi caricare solo file PDF.");
    fileInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const files = getCurrentFiles();

    files.push({
      name: file.name,
      type: "application/pdf",
      data: e.target.result
    });

    save();
    render();
  };

  reader.readAsDataURL(file);
};
