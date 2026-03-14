/* ═══════════════════════════════════════════════════════════
   AgroSetu — Public Website script.js
   Data source: data/rates.csv  (written by backend on Publish)
   No backend dependency on public page — works purely static.
   ═══════════════════════════════════════════════════════════ */

// Gujarati → English commodity name map for SEO structured data
const COMMODITY_EN = {
  'કપાસિયા ખોળ': 'Kapasiya Khal (Cottonseed Cake)',
  'બિનોળા':       'Binola Cottonseed',
  'બિનોળા ખોળ':   'Binola Khal (Cottonseed Cake)',
  'DOC':           'DOC De-Oiled Cake',
  'જાડુ ભુસુ':     'Jaadu Bhusu Coarse Wheat Bran',
  'જીણું ભુસુ':    'Jinu Bhusu Fine Wheat Bran',
  'મકાઈ':          'Corn Maize cattle feed',
  'ઘઉ ભુસુ':       'Wheat Bran cattle feed',
};

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

  // ── 1. ItemList — price list ──
  const itemList = {
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
        name: COMMODITY_EN[r.commodity_name] || r.commodity_name,
        description: `${COMMODITY_EN[r.commodity_name]||r.commodity_name} price today in Gujarat from ${r.factory_name}`,
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

  // ── 2. LocalBusiness ──
  const localBiz = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Umiya AgroSetu Digital LLP',
    description: 'Daily cattle feed price discovery platform for Gujarat — Kapasiya Khal, Binola, DOC rates',
    url: 'https://umiyaagrosetu.com',
    telephone: '+917041037812',
    email: 'info@umiyaagrosetu.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Mahesana',
      addressRegion: 'Gujarat',
      addressCountry: 'IN'
    },
    areaServed: { '@type': 'State', name: 'Gujarat' },
    knowsAbout: ['Cattle Feed', 'Kapasiya Khal', 'Binola', 'DOC', 'Wheat Bran', 'Corn'],
    sameAs: ['https://umiyaagrosetu.com']
  };

  // ── 3. FAQ schema — captures voice search & People Also Ask ──
  const firstPrice = rows[0];
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the price of Kapasiya Khal today in Gujarat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Today's Kapasiya Khal (Cottonseed Cake) price in Gujarat is ₹${
            rows.find(r=>r.commodity_name==='કપાસિયા ખોળ')?.price || '—'
          } per bag. Updated daily by Umiya AgroSetu.`
        }
      },
      {
        '@type': 'Question',
        name: 'What is Binola Khal price today Gujarat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Today's Binola (Cottonseed) price in Gujarat is ₹${
            rows.find(r=>r.commodity_name==='બિનોળા'||r.commodity_name==='બિનોળા ખોળ')?.price || '—'
          } per bag. Updated daily by Umiya AgroSetu.`
        }
      },
      {
        '@type': 'Question',
        name: 'Where to get daily cattle feed rates in Gujarat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Umiya AgroSetu (umiyaagrosetu.com) publishes daily cattle feed rates every morning for Gujarat markets including Mehsana, Harij, Visnagar and surrounding areas.'
        }
      },
      {
        '@type': 'Question',
        name: 'આજના કપાસિયા ખોળ ના ભાવ શું છે?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `આજના કપાસિયા ખોળ ના ભાવ ₹${
            rows.find(r=>r.commodity_name==='કપાસિયા ખોળ')?.price || '—'
          } પ્રતિ બેગ છે. દરરોજ ઉમિયા એગ્રોસેતુ દ્વારા અપડેટ કરવામાં આવે છે.`
        }
      }
    ]
  };

  // Inject all 3 schemas
  [itemList, localBiz, faq].forEach(schema => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  });

  // Update meta description with live price
  const meta = document.querySelector('meta[name="description"]');
  if (meta && firstPrice) {
    const enName = COMMODITY_EN[firstPrice.commodity_name] || firstPrice.commodity_name;
    meta.content = `Today's cattle feed rates Gujarat — ${enName}: ₹${firstPrice.price}/bag. Daily updated Kapasiya Khal, Binola Khal, DOC prices from Gujarat mills.`;
  }

  // Update page title with today's top price
  const topPrice = rows.find(r=>r.commodity_name==='કપાસિયા ખોળ') || rows[0];
  if (topPrice) {
    document.title = `Kapasiya Khal Price Today ₹${topPrice.price}/bag | Gujarat Cattle Feed Rates | Umiya AgroSetu`;
  }
}

function updateFAQ(rows) {
  const kapasiya = rows.find(r => r.commodity_name === 'કપાસિયા ખોળ');
  const binola   = rows.find(r => r.commodity_name === 'બિનોળા' || r.commodity_name === 'બિનોળા ખોળ');
  const el1 = document.getElementById('faq_kapasiya');
  const el2 = document.getElementById('faq_binola');
  if (el1 && kapasiya)
    el1.textContent = `આજના કપાસિયા ખોળ ના ભાવ ₹${kapasiya.price} પ્રતિ બેગ છે (${fmtDate(kapasiya.price_date)}).`;
  if (el2 && binola)
    el2.textContent = `Today's Binola price is ₹${binola.price} per bag (${fmtDate(binola.price_date)}).`;
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
    updateFAQ(rows);
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


window.onload = () => {
  const todayEl = document.getElementById('today');
  if (todayEl) todayEl.innerText = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  loadFromCSV();
  
};

setInterval(loadFromCSV, 30 * 60 * 1000);