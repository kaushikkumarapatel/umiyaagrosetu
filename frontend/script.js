async function loadPrices(){

  try{

    const res = await fetch("/api/prices/today");
    const data = await res.json();

    const table = document.getElementById("ratesTable");
    const cards = document.getElementById("marketCards");

    if(table) table.innerHTML="";
    if(cards) cards.innerHTML="";

    data.slice(0,4).forEach(p=>{

      /* -------- Table rows -------- */

      if(table){
        table.innerHTML += `
        <tr>
          <td>${p.commodity}</td>
          <td>${p.factory}</td>
          <td>₹${p.price}</td>
          <td>—</td>
        </tr>
        `;
      }

      /* -------- Market cards -------- */

      if(cards){
        cards.innerHTML += `
        <div class="market-card">

        <div class="market-top">
        <div class="market-commodity">${p.commodity}</div>
        <div class="market-icon"><i data-lucide="bar-chart-3"></i></div>
        </div>

        <div class="market-price">₹${p.price}</div>

        <div class="market-market">
        📍 ${p.factory}
        </div>

        <div class="trend-pill trend-flat">Updated Today</div>

        </div>
        `;
      }

    });
    lucide.createIcons();
  }catch(err){
    console.error("Error loading prices",err);
  }

}
async function loadTodayRates(){

  const res = await fetch("/api/prices/today");
  const data = await res.json();

  const table = document.getElementById("ratesTable");

  table.innerHTML = "";

  data.forEach(p => {

    table.innerHTML += `
      <tr>
        <td>${p.commodity}</td>
        <td>${p.factory}</td>
        <td>₹${p.price}</td>
        <td>—</td>
      </tr>
    `;

  });

}
/* run once 
loadPrices();
*/

/* refresh every 30 seconds */
setInterval(loadPrices,90000);

window.onload = () => {

  loadPrices();       // market cards
  loadTodayRates();   // daily rates table

};
/* show today's date in hero */
document.getElementById("today").innerText =
  new Date().toLocaleDateString("en-IN");