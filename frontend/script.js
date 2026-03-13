/* ═══════════════════════════════════════════════════════════
   AgroSetu — Public Website script.js
   Data source: data/rates.csv  (written by backend on Publish)
   No backend dependency on public page — works purely static.
   ═══════════════════════════════════════════════════════════ */

async function fetchRatesCSV() {
  return new Promise((resolve, reject) => {
    Papa.parse('data/rates.csv', {
      download: true, header: true, skipEmptyLines: true, dynamicTyping: true,
      complete: (r) => resolve(r.data),
      error: (e) => reject(e)
    });
  });
}

function fmtDate(s, opts) {
  if (!s) return '—';
  return new Date(String(s).slice(0,10)+'T00:00:00').toLocaleDateString('en-IN',
    opts || {day:'2-digit',month:'short'});
}
function fmtPrice(p) {
  return '₹' + parseFloat(p||0).toLocaleString('en-IN');
}

function renderMarketCards(rows) {
  const el = document.getElementById('marketCards');
  if (!el) return;
  el.innerHTML = rows.slice(0,4).map(p => `
    <div class="market-card">
      <div class="market-top">
        <div class="market-commodity">${p.commodity_name||'—'}</div>
        <div class="market-icon">📦</div>
      </div>
      <div class="market-price">${fmtPrice(p.price)}</div>
      <div class="market-market">🏭 ${p.factory_name||'—'}</div>
      <div class="trend-pill trend-flat">Updated: ${fmtDate(p.price_date)}</div>
    </div>`).join('');
}

function renderRatesTable(rows) {
  const el = document.getElementById('ratesTable');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#888;">⏳ Rates not published yet. Please check back later.</td></tr>`;
    return;
  }
  el.innerHTML = rows.map(p => `
    <tr>
      <td>${p.commodity_name||'—'}</td>
      <td>${p.factory_name||'—'}${p.factory_city?'<br><small style="color:#888">📍 '+p.factory_city+'</small>':''}</td>
      <td><strong>${fmtPrice(p.price)}</strong><small style="color:#888">/bag</small></td>
      <td>${fmtDate(p.price_date)}</td>
    </tr>`).join('');
}

function injectStructuredData(rows) {
  if (!rows.length) return;
  const dateStr = (rows[0].price_date||'').slice(0,10) || new Date().toISOString().split('T')[0];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Gujarat Cattle Feed Daily Rates — ${dateStr}`,
    description: 'Daily cattle feed prices in Gujarat — Kapasiya Khal, Binola Khal, DOC rates',
    url: 'https://umiyaagrosetu.com',
    numberOfItems: rows.length,
    itemListElement: rows.map((r,i) => ({
      '@type': 'ListItem',
      position: i+1,
      item: {
        '@type': 'Product',
        name: r.commodity_name,
        brand: { '@type': 'Brand', name: r.factory_name },
        offers: {
          '@type': 'Offer',
          price: String(r.price),
          priceCurrency: 'INR',
          priceValidUntil: dateStr,
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: 'Umiya AgroSetu Digital LLP' }
        }
      }
    }))
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);

  // Update meta description with live price data
  const meta = document.querySelector('meta[name="description"]');
  if (meta && rows[0]) {
    meta.content = `Today's cattle feed rates Gujarat — ${rows[0].commodity_name}: ${fmtPrice(rows[0].price)}/bag. Daily updated Kapasiya Khal, Binola Khal, DOC prices from Gujarat mills.`;
  }
}

function updateTimestamp(rows) {
  const el = document.getElementById('publishedAt');
  if (!el || !rows.length) return;
  const ts = rows[0].published_at || rows[0].price_date;
  if (ts) el.textContent = new Date(ts).toLocaleString('en-IN',
    {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

async function loadFromCSV() {
  try {
    const rows = await fetchRatesCSV();
    if (!rows || !rows.length) throw new Error('empty');
    renderMarketCards(rows);
    renderRatesTable(rows);
    injectStructuredData(rows);
    updateTimestamp(rows);
  } catch(e) {
    console.warn('CSV load:', e.message);
    const el = document.getElementById('ratesTable');
    if (el) el.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#888;">⏳ Today's rates not yet published. Please check back after 10 AM.</td></tr>`;
    const cards = document.getElementById('marketCards');
    if (cards) cards.innerHTML = '';
  }
}

function joinWhatsApp() {
  const n = document.getElementById('mobileNumber').value.trim();
  if (!n || n.length < 10) { alert('Please enter a valid 10-digit mobile number'); return; }
  window.open(`https://wa.me/917041037812?text=${encodeURIComponent('Add me to daily cattle feed price updates\nMobile: '+n)}`,'_blank');
}

async function logVisitor() {
  try {
    const d = await (await fetch('https://ipapi.co/json/')).json();
    await fetch('/api/visitor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  } catch(e) {}
}

window.onload = () => {
  const todayEl = document.getElementById('today');
  if (todayEl) todayEl.innerText = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  loadFromCSV();
  setTimeout(logVisitor, 3000);
};

setInterval(loadFromCSV, 30 * 60 * 1000);