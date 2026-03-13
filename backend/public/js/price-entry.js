let factoriesData = [];
let commoditiesData = [];

/* ---------------------------
   Utility
----------------------------*/
function getToday(){
  return new Date().toISOString().split("T")[0];
}

/* ---------------------------
   Load Factories
----------------------------*/
async function loadFactories(){

  try {
    const res = await fetch("/api/admin/factories");
    if(!res.ok) throw new Error(`Factories API returned ${res.status}`);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error("Factories response is not an array: " + JSON.stringify(data));
    factoriesData = data.filter(f => f.is_active !== false);
  } catch(err) {
    console.error("❌ loadFactories failed:", err);
    showToast("Could not load factories. Check console.", true);
    return;
  }

  document.querySelectorAll(".factory").forEach(select=>{
    populateFactoryDropdown(select);
  });

}

function populateFactoryDropdown(select){

  select.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Select Factory";
  defaultOpt.disabled = true;
  defaultOpt.selected = true;

  select.appendChild(defaultOpt);

  factoriesData.forEach(f=>{
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    select.appendChild(opt);
  });

}

/* ---------------------------
   Load Commodities
----------------------------*/
async function loadCommodities(){

  try {
    const res = await fetch("/api/admin/commodities");
    if(!res.ok) throw new Error(`Commodities API returned ${res.status}`);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error("Commodities response is not an array: " + JSON.stringify(data));
    commoditiesData = data.filter(c => c.is_active !== false);
  } catch(err) {
    console.error("❌ loadCommodities failed:", err);
    showToast("Could not load commodities. Check console.", true);
    return;
  }

  document.querySelectorAll(".commodity").forEach(select=>{
    populateCommodityDropdown(select);
  });

}

function populateCommodityDropdown(select){

  select.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Select Commodity";
  defaultOpt.disabled = true;
  defaultOpt.selected = true;

  select.appendChild(defaultOpt);

  commoditiesData.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
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
    <input type="text" class="form-control remarks" placeholder="Remarks">
  </td>

  <td>
    <input type="date" class="form-control price_date">
  </td>

  <td>
    <button class="btn btn-danger btn-sm delete-row">Delete</button>
  </td>
  `;

  tbody.appendChild(row);

  populateFactoryDropdown(row.querySelector(".factory"));
  populateCommodityDropdown(row.querySelector(".commodity"));
  row.querySelector(".price_date").value = getToday();

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
    const data = await res.json();
    console.log(data);

    showToast("Prices saved successfully");
    loadAllRecords();

  }catch(err){

    console.error(err);
    showToast("Error saving prices", true);

  }

}

/* ---------------------------
   Load Records
----------------------------*/
async function loadAllRecords(){

  const res = await fetch("/api/prices/all");
  const data = await res.json();

  const tbody = document.querySelector("#recordsTable tbody");
  if(!tbody) return;

  tbody.innerHTML = "";

  data.forEach(r => {

    tbody.innerHTML += `
      <tr>
        <td>${r.id}</td>
        <td>${r.factory}</td>
        <td>${r.commodity}</td>
        <td>${r.price}</td>
        <td>${r.price_date}</td>
        <td>
          <button class="btn btn-warning btn-sm"
            onclick="editPrice(${r.id}, ${r.price})">
            Edit
          </button>

          <button class="btn btn-danger btn-sm"
            onclick="deletePrice(${r.id})">
            Delete
          </button>
        </td>
      </tr>
    `;

  });

}

/* ---------------------------
   Edit Price
----------------------------*/
async function editPrice(id,currentPrice){

  const newPrice = prompt("Enter new price",currentPrice);

  if(!newPrice) return;

  await fetch(`/api/prices/${id}`,{
    method:"PUT",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({price:newPrice})
  });

  loadAllRecords();

}

/* ---------------------------
   Delete Price
----------------------------*/
async function deletePrice(id){

  if(!confirm("Delete this record?")) return;

  await fetch(`/api/prices/${id}`,{
    method:"DELETE"
  });

  loadAllRecords();

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

  setTimeout(()=>toast.remove(),3000);

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

/* ---------------------------
   Delete Row
----------------------------*/
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
   Excel Style Navigation
----------------------------*/
document.addEventListener("keydown", function(e){

  if(e.key==="Enter"){

    const inputs = Array.from(
      document.querySelectorAll("input,select")
    );

    const index = inputs.indexOf(document.activeElement);

    if(index>-1 && index<inputs.length-1){
      inputs[index+1].focus();
      e.preventDefault();
    }

  }

});

/* ---------------------------
   Page Load
----------------------------*/
window.onload = async ()=>{

  await loadFactories();
  await loadCommodities();

  setTodayDate();

  loadAllRecords();

};