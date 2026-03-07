function getToday(){
  return new Date().toISOString().split("T")[0];
}

/* ---------------------------
   Load Factories
----------------------------*/
async function loadFactories(){

  const res = await fetch("/api/factories");
  const factories = await res.json();

  document.querySelectorAll(".factory").forEach(select => {

    select.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Select Factory";
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    select.appendChild(defaultOpt);

    factories.forEach(f => {

      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name;
      select.appendChild(opt);

    });

  });

}

/* ---------------------------
   Load Commodities
----------------------------*/
async function loadCommodities(){

  const res = await fetch("/api/commodities");
  const commodities = await res.json();

  document.querySelectorAll(".commodity").forEach(select => {

    select.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Select Commodity";
    defaultOpt.disabled = true;
    defaultOpt.selected = true;
    select.appendChild(defaultOpt);

    commodities.forEach(c => {

      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);

    });

  });

}

/* ---------------------------
   Set Today Date
----------------------------*/
function setTodayDate(){

  document.querySelectorAll(".price_date").forEach(d=>{
    d.value = getToday();
  });

}

/* ---------------------------
   Add Row
----------------------------*/
function addRow(){

  const tbody = document.querySelector("#priceTable tbody");

  const row = document.createElement("tr");

  row.innerHTML = `
  <td>
    <select class="form-select factory"></select>
  </td>

  <td>
    <select class="form-select commodity"></select>
  </td>

  <td>
    <input type="number" class="form-control price" placeholder="Enter price">
  </td>

  <td>
    <input type="text" class="form-control remarks" placeholder="Remarks (Gujarati supported)">
  </td>

  <td>
    <input type="date" class="form-control price_date">
  </td>

  <td>
    <button class="btn btn-danger btn-sm delete-row">Delete</button>
  </td>
  `;

  tbody.appendChild(row);

  loadFactories();
  loadCommodities();

}

/* ---------------------------
   Save Prices
----------------------------*/
async function savePrices(){

  const rows = document.querySelectorAll("#priceTable tbody tr");
  const prices = [];

  let firstErrorField = null;

  rows.forEach(row=>{

    const factorySelect = row.querySelector(".factory");
    const commoditySelect = row.querySelector(".commodity");
    const priceInput = row.querySelector(".price");

    const factory = factorySelect.value;
    const commodity = commoditySelect.value;
    const price = priceInput.value;

    const remarks = row.querySelector(".remarks").value;
    const date = row.querySelector(".price_date").value;

    factorySelect.classList.remove("error-field");
    commoditySelect.classList.remove("error-field");
    priceInput.classList.remove("error-field");

    if(!factory){
      factorySelect.classList.add("error-field");
      if(!firstErrorField) firstErrorField = factorySelect;
    }

    if(!commodity){
      commoditySelect.classList.add("error-field");
      if(!firstErrorField) firstErrorField = commoditySelect;
    }

    if(!price){
      priceInput.classList.add("error-field");
      if(!firstErrorField) firstErrorField = priceInput;
    }

    if(factory && commodity && price){

      prices.push({
        factory_id: parseInt(factory),
        commodity_id: parseInt(commodity),
        price: parseFloat(price),
        remarks: remarks,
        price_date: date
      });

    }

  });

  if(firstErrorField){
    firstErrorField.focus();
    showToast("Please fill required fields", true);
    return;
  }

  if(prices.length === 0){
    showToast("No prices entered", true);
    return;
  }

  try{

    const res = await fetch("/api/prices",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({prices})
    });

    const result = await res.json();

    showToast("Prices saved successfully");

  }catch(err){

    console.error(err);
    showToast("Error saving prices", true);

  }

}

/* ---------------------------
   Toast Notification
----------------------------*/
function showToast(message,isError=false){

  const toast = document.createElement("div");

  toast.innerText = message;

  toast.style.position="fixed";
  toast.style.top="20px";
  toast.style.right="20px";
  toast.style.padding="12px 20px";
  toast.style.borderRadius="6px";
  toast.style.color="white";
  toast.style.fontSize="14px";
  toast.style.zIndex="9999";

  toast.style.background = isError ? "#dc3545" : "#28a745";

  document.body.appendChild(toast);

  setTimeout(()=>{
    toast.remove();
  },3000);

}

/* ---------------------------
   Remove Error Style
----------------------------*/
document.addEventListener("change",function(e){

  if(e.target.classList.contains("factory") ||
     e.target.classList.contains("commodity") ||
     e.target.classList.contains("price")){

     e.target.classList.remove("error-field");
  }

});

document.addEventListener("click", function(e){

  if(e.target.classList.contains("delete-row")){

    const table = document.getElementById("priceTable").querySelector("tbody");

    const rows = table.querySelectorAll("tr");

    if(rows.length === 1){
      alert("At least one row must remain.");
      return;
    }

    e.target.closest("tr").remove();
  }

});
/**
 * Delete Row
 */

document.addEventListener("click", function(e){

  if(e.target.classList.contains("delete-row")){

    const tbody = document.querySelector("#priceTable tbody");

    const rows = tbody.querySelectorAll("tr");

    if(rows.length === 1){
      alert("At least one row must remain.");
      return;
    }

    e.target.closest("tr").remove();
  }

});
/* ---------------------------
   Page Load
----------------------------*/
window.onload = async ()=>{

  await loadFactories();
  await loadCommodities();
  setTodayDate();

};