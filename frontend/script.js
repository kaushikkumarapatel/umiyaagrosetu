/* ── loadMarketIndicators: MCX/NCDEX cards ────────── */
async function loadMarketIndicators() {
  const grid = document.getElementById("indicatorsGrid");
  if (!grid) return;

  try {
    const res  = await fetch("/api/market/indicators");
    const data = await res.json();

    if (!data || data.length === 0) {
      grid.innerHTML = `<div class="ind-error">⚠️ Market data unavailable. Try again later.</div>`;
      return;
    }

    grid.innerHTML = data.map(ind => {
      const changeAbs = Math.abs(ind.change).toFixed(2);
      const changePct = Math.abs(ind.changePct).toFixed(2);
      const arrow     = ind.trend === "up" ? "▲" : ind.trend === "down" ? "▼" : "—";
      const sign      = ind.trend === "up" ? "+" : ind.trend === "down" ? "-" : "";
      const price     = ind.price?.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      return `
        <div class="ind-card">
          <div class="ind-left">
            <div class="ind-exchange">${ind.exchange}</div>
            <div class="ind-name">${ind.label}</div>
            <div class="ind-name-gu">${ind.labelGu}</div>
          </div>
          <div class="ind-right">
            <div class="ind-price">₹${price}<span class="ind-unit">${ind.unit}</span></div>
            <div class="ind-change ${ind.trend}">
              ${arrow} ${sign}₹${changeAbs} (${sign}${changePct}%)
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Indicators error:", err);
    grid.innerHTML = `<div class="ind-error">⚠️ Could not load MCX/NCDEX data. Please refresh.</div>`;
  }
}

/* ── loadPrices: Market Snapshot Cards ───────────── */
async function loadPrices() {
  try {
    const res  = await fetch("/api/prices/latest");
    const data = await res.json();

    const cards = document.getElementById("marketCards");
    if (!cards) return;

    cards.innerHTML = "";

    data.slice(0, 4).forEach(p => {
      cards.innerHTML += `
        <div class="market-card">
          <div class="market-top">
            <div class="market-commodity">${p.commodity}</div>
            <div class="market-icon"><i data-lucide="bar-chart-3"></i></div>
          </div>
          <div class="market-price">₹${p.price}</div>
          <div class="market-market">🏭 ${p.factory}</div>
          <div class="trend-pill trend-flat">
            Updated: ${new Date(p.price_date).toLocaleDateString("en-IN")}
          </div>
        </div>
      `;
    });

    lucide.createIcons();

  } catch (err) {
    console.error("Error loading market cards:", err);
  }
}

/* ── loadTodayRates: Daily Rates Table ───────────── */
async function loadTodayRates() {
  const table = document.getElementById("ratesTable");
  if (!table) return;

  table.innerHTML = `
    <tr>
      <td colspan="4" style="text-align:center; padding:20px; color:#888;">
        ⏳ Loading rates...
      </td>
    </tr>
  `;

  try {
    const res  = await fetch("/api/prices/all");
    const data = await res.json();

    if (!data || data.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:20px; color:#888;">
            No rates available yet. Please check back later.
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = data.map(p => `
      <tr>
        <td>${p.commodity}</td>
        <td>${p.factory}</td>
        <td>₹${p.price}</td>
        <td>${new Date(p.price_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Error loading today's rates:", err);
    table.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:20px; color:#c00;">
          ⚠️ Could not load rates. Please refresh.
        </td>
      </tr>
    `;
  }
}

/* ── WhatsApp join ───────────────────────────────── */
function joinWhatsApp() {
  const number = document.getElementById("mobileNumber").value;
  if (!number) {
    alert("Please enter mobile number");
    return;
  }
  window.open(
    "https://wa.me/917041037812?text=Add%20me%20to%20daily%20cattle%20feed%20price%20updates",
    "_blank"
  );
}

/* ── Visitor logging ─────────────────────────────── */
async function logVisitor() {
  try {
    const location = await fetch("https://ipapi.co/json/");
    const data     = await location.json();
    await fetch("/api/visitor", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data)
    });
  } catch (err) {
    console.log("Visitor logging skipped");
  }
}

/* ── On page load ────────────────────────────────── */
window.onload = () => {
  document.getElementById("today").innerText =
    new Date().toLocaleDateString("en-IN");

  loadMarketIndicators();             // MCX/NCDEX cards
  loadPrices();                       // Market snapshot cards
  loadTodayRates();                   // Daily rates table
  setTimeout(logVisitor, 2000);       // Delayed visitor log
};

/* ── Auto-refresh every 5 minutes ───────────────── */
setInterval(loadMarketIndicators, 5 * 60 * 1000);
setInterval(loadPrices, 90 * 1000);