# 🌾 AgroSetu — Product Roadmap & Architecture
> Version 3.0 · March 2026 · Umiya AgroSetu Digital LLP  
> Replaces: AgroSetu_Product_Roadmap_v2.docx

---

## 1. What Has Changed Since v2.0

| Area | v2.0 Status | v3.0 Reality |
|------|-------------|--------------|
| WhatsApp (Twilio) | Sandbox only, "join keyword" friction | ✅ **Twilio testing complete** |
| Meta WhatsApp API | Blocked, community case raised | ✅ **Meta developer account now active** |
| Broker login | Not built | ✅ **Built — full broker portal** |
| Brokerage ledger | Highest priority, not started | ✅ **Built — trade entry, settlement, invoices** |
| Railway deployment | Pending | ⏳ Waiting on LLP name approval |
| MVP phase naming | Phase 0 / Phase 1 | Renamed to MVP 1.x milestones |

---

## 2. MVP Milestone Tracker

### ✅ MVP 1.0 — Foundation (Oct–Dec 2025)
> Admin rate entry + public website + WhatsApp broadcast

- Daily rate entry admin panel (`price-entry.html`, localhost:5000)
- Public rates page — `umiyaagrosetu.com` live on Netlify
- WhatsApp broadcast via Twilio (Gujarati-formatted message)
- Admin login protection (session-based)
- TradingView MCX Cotton + NCDEX Castor Seed widgets
- Visitor IP logging

---

### ✅ MVP 1.5 — Broker Portal (Jan–Mar 2026)
> Full broker login + brokerage ledger + settlement invoices

**Broker Authentication**
- `broker-login.html` — session-based login per broker
- `brokerAuth.js` middleware — route protection
- Broker "me" API — `GET /api/broker/me`
- Logout endpoint

**Trade Management**
- `broker-entry.html` — trade entry with factory + wholesaler + commodity dropdowns
- `broker-trades.html` — trade history with date filters, search, edit/delete
- Trade API — full CRUD (`GET/POST/PUT/DELETE /api/broker/trades`)

**Settlement & Invoicing**
- `broker-report.html` — settlement overview + invoice generator
- Grand totals dashboard (factory due / wholesaler due / outstanding)
- Per-party settlement cards with running balance
- Mark Settlement modal — records payment with date and remarks
- Settlement history toggle per party
- **Invoice generator** — `AGS-YYYYFYY-NNN` numbered PDF invoices
- PDF download via html2canvas + jsPDF (multi-page, A4)
- WhatsApp + PDF flow — downloads PDF, opens WhatsApp web pre-filled

**Admin — Master Data**
- `admin.html` — full CRUD for Brokers, Factories, Wholesalers, Commodities
- `masterDataRoutes.js` — consolidated route (replaced `adminBrokerRoutes.js`)
- Assign drawer — broker ↔ factory and broker ↔ wholesaler assignments
- City field across all entities
- `apiFetch()` helper — auto-redirects to login on 401

**Database additions (broker schema)**
- `brokers` table — login credentials, city, status
- `trades` table — full trade records
- `brokerage_settlements` table — settlement records per party per FY
- `broker_factories`, `broker_wholesalers` — assignment junction tables
- FY-aware queries (April–March cycle)

---

### 🔄 MVP 1.6 — Public Daily Rates Page v2 (Next — Apr 2026)
> Replace hardcoded/API-driven public page with a simple CSV-powered static page

**Goal:** Broker (or admin) drops a CSV file → public page auto-renders today's rates. Zero backend dependency for the public-facing page.

**Why CSV?**
- Backend not yet deployed publicly (waiting on LLP + AWS)
- Netlify can serve a static page that reads a CSV from the same repo
- Father can update rates without touching code — just update one file
- Fallback when backend is down

**Single Page Design**
```
umiyaagrosetu.com/rates  (or index page)
  └── rates.csv          (committed to GitHub / Netlify)
       factory, commodity, price_per_bag, unit, date
       "Shree Bhagvati Mill", "Jaadu Bhusu 39kg", 901, bag, 2026-03-12
       ...
  └── index.html
       Fetches rates.csv at load time (Papa Parse or native fetch)
       Renders rate cards grouped by factory
       Shows "Last updated: 12 Mar 2026"
       Gujarati + English commodity names
       Mobile responsive
       SEO meta tags + JSON-LD structured data
```

**Build tasks**
- [ ] Design `rates.csv` schema (factory, commodity, price, unit, date, remark_guj)
- [ ] Build `index.html` — CSV fetch + render with Papa Parse
- [ ] Add "Last Updated" timestamp from CSV `date` column
- [ ] Gujarati commodity name column in CSV → display Gujarati on page
- [ ] SEO: `<title>`, `<meta description>`, Open Graph, JSON-LD PriceSpecification
- [ ] Deploy to Netlify — `git push` = rates go live in 60 seconds
- [ ] Update admin panel — "Export today's rates as CSV" button (one click → download `rates.csv`)

**Future bridge:** Once backend is on AWS, the page can switch from CSV fetch to API fetch — zero design change needed.

---

### ⏳ MVP 1.7 — WhatsApp via Meta API (Apr–May 2026)
> Replace Twilio with Meta WhatsApp Cloud API (developer account now active)

**Status:** Meta developer account active ✅ · Twilio testing complete ✅

**Migration plan**
- [ ] Create WhatsApp Business message template in Meta dashboard (Gujarati daily rates format)
- [ ] Get template approved (typically 24–48 hrs)
- [ ] Update `whatsappService.js` — swap Twilio client for Meta Cloud API calls
- [ ] Update `whatsappConfig.js` — `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` from `.env`
- [ ] Test broadcast end-to-end with father's number
- [ ] Add subscriber opt-in flow (Meta requires explicit opt-in)
- [ ] Keep Twilio as fallback until Meta fully stable

**Why this matters:** Meta API has no "join keyword" friction — subscribers receive messages directly once opted in. Unlocks proper WhatsApp Business broadcast at scale.

---

### ⏳ MVP 2.0 — Cloud Deployment (May–Jun 2026)
> Backend live on AWS, real data flowing to public website

**Blocked on:** LLP name approval (Umiya AgroSetu Digital LLP)

- [ ] AWS account setup (EC2 + RDS, ap-south-1 Mumbai)
- [ ] Migrate PostgreSQL from local → RDS
- [ ] Deploy Node.js backend → EC2 (or Elastic Beanstalk)
- [ ] Configure CORS — Netlify origin whitelisted
- [ ] Update `CONFIG.siteUrl` → `umiyaagrosetu.com`
- [ ] SSL on backend domain (`api.umiyaagrosetu.com`)
- [ ] Switch public rates page from CSV → `GET /api/rates/today`
- [ ] Set up `umiyaagrosetu.in` as Netlify domain alias
- [ ] Windows Task Scheduler → daily PostgreSQL backup script

---

### ⏳ MVP 2.5 — Multi-Broker Platform (Jul–Sep 2026)

- Broker self-registration (admin approves)
- Each broker has isolated factory/wholesaler network
- Isolated brokerage data per broker (row-level security)
- Subscription billing via Razorpay (₹999/mo broker plan)
- Price history charts (30-day trends)
- Admin super-dashboard across all brokers

---

### ⏳ Phase 3 — Factory & Wholesaler Portals (Sep–Dec 2026)

- Factory self-signup → rate publishing portal
- Factory brokerage dues dashboard (self-service)
- Wholesaler portal — browse rates, place orders, view dues
- Progressive Web App (PWA) — mobile first
- Order history and digital payment records

---

### ⏳ Phase 4 — Marketplace & Scale (Jan 2027+)

- Farmer price discovery and direct buying
- Transaction commission model (₹1–2/bag on digital trades)
- Expand to South Gujarat (Anand, Surat belt)
- AgroSetu Finance — NBFC credit partnership
- Data intelligence product (price trends, forecasts)
- Pan-Gujarat platform — seed funding pitch

---

## 3. Current Architecture (March 2026)

```
┌─────────────────────────────────────────────────────────────────┐
│  ACTORS                                                         │
│  🧑‍💼 Broker (Father)   🛒 Wholesaler   🏭 Factory   👤 Admin    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  FRONTEND  (localhost:5000/public — will move to Netlify)       │
│                                                                 │
│  broker-login.html      Admin login                            │
│  broker-entry.html      Trade entry                            │
│  broker-trades.html     Trade history + edit                   │
│  broker-report.html     Settlement + invoice + PDF + WA        │
│  admin.html             Master data CRUD (admin only)          │
│  price-entry.html       Daily rate entry (legacy admin)        │
│                                                                 │
│  umiyaagrosetu.com ──── Netlify ────────────────────────────── │
│  index.html             Public rates page (currently static)   │
│  rates.csv     ◄──── MVP 1.6: CSV-powered rates               │
└──────────────────────┬──────────────────────────────────────────┘
                       │ fetch() with credentials
┌──────────────────────▼──────────────────────────────────────────┐
│  BACKEND  Node.js + Express  (localhost:5000 → AWS EC2 later)  │
│                                                                 │
│  /api/broker/*      brokerRoutes.js    Trade + settlement CRUD  │
│  /api/admin/*       masterDataRoutes.js  Broker/Factory/WHL/Com │
│  /api/prices/*      priceRoutes.js     Daily rate entry        │
│  /api/commodities   commodityRoutes.js  Dropdown data          │
│  /api/broadcast     broadcastRoutes.js  WhatsApp trigger       │
│                                                                 │
│  middleware/brokerAuth.js   — session guard (broker routes)    │
│  middleware/adminAuth.js    — session guard (admin routes)     │
│  services/whatsappService.js — Twilio now · Meta API next      │
│  services/broadcastService.js — message formatter              │
│  db.js               — pg pool, process.env.DATABASE_URL       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ pg pool.query()
┌──────────────────────▼──────────────────────────────────────────┐
│  DATABASE  PostgreSQL  (local → AWS RDS later)                  │
│                                                                 │
│  daily_prices        Today's factory commodity rates           │
│  price_history       Auto-logged via trigger                   │
│  commodities         Feed item catalogue                       │
│  factories           Mill/factory directory                    │
│  brokers             Broker accounts + hashed passwords        │
│  trades              All trade records (FY-aware)              │
│  brokerage_settlements  Payment records per party per FY       │
│  broker_factories    Broker ↔ factory assignments              │
│  broker_wholesalers  Broker ↔ wholesaler assignments           │
│  wholesalers         Wholesaler directory                      │
│  subscribers         WhatsApp broadcast list                   │
│  broadcasts          Message log                               │
│  system_settings     App config                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  EXTERNAL SERVICES                                              │
│                                                                 │
│  Netlify             Static frontend hosting · SSL active       │
│  Namecheap           DNS · umiyaagrosetu.com + .in             │
│  Twilio              WhatsApp broadcast · ✅ Testing complete   │
│  Meta Cloud API      WhatsApp Business · ✅ Account active      │
│  AWS (planned)       EC2 (Node) + RDS (PostgreSQL) ap-south-1  │
│  Razorpay (future)   Subscription billing Phase 2.5            │
│  TradingView         MCX Cotton + NCDEX Castor widget (free)   │
│  Google Analytics    G-PCX7884MG3                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack (Current vs Planned)

| Layer | Current | Planned (MVP 2.0+) |
|-------|---------|-------------------|
| Frontend (admin/broker) | HTML/CSS/JS — localhost:5000 | Same, served from AWS |
| Frontend (public) | Static HTML — Netlify | Static HTML — Netlify (CSV→API) |
| Backend | Node.js + Express — localhost | AWS EC2 — ap-south-1 |
| Database | PostgreSQL — local | AWS RDS PostgreSQL |
| Auth | express-session + bcrypt | Same + JWT for Phase 2.5 |
| WhatsApp | Twilio (tested ✅) | Meta Cloud API (account active ✅) |
| Billing | None | Razorpay Phase 2.5 |
| Domain | Namecheap + Netlify | Same + `api.umiyaagrosetu.com` |
| CI/CD | Git push → manual | Git push → Netlify auto (frontend) |
| Backup | Manual | Windows Task Scheduler daily bat |

---

## 5. Open Issues & Blockers

| # | Issue | Status | Action |
|---|-------|--------|--------|
| 1 | LLP name approval | ⏳ Pending | Wait — triggers AWS setup |
| 2 | Backend not publicly deployed | ⏳ Blocked on LLP | Deploy to AWS after LLP |
| 3 | Public rates page (umiyaagrosetu.com) | 🔄 MVP 1.6 | Build CSV-powered page |
| 4 | Meta WhatsApp template approval | 🔄 Next | Create + submit template |
| 5 | umiyaagrosetu.in not on Netlify | ⏳ Pending | Add as domain alias |
| 6 | City field unpopulated | ⏳ Pending | Fill in Admin → Master Data |
| 7 | Historical trade data entry | ⏳ Pending | Enter from manual book records |
| 8 | ₹3/bag brokerage conversation | ⏳ Pending | After first invoices sent |
| 9 | Google My Business | ⏳ Pending | After LLP cert received |
| 10 | Razorpay account | ⏳ Pending | After LLP cert received |

---

## 6. File Structure (Current)

```
commodity-broker-backend/
├── public/
│   ├── admin.html                ← Master data CRUD (admin only)
│   ├── price-entry.html          ← Daily rate entry
│   ├── broker-login.html         ← Broker authentication
│   ├── broker-entry.html         ← Trade entry
│   ├── broker-trades.html        ← Trade history
│   └── broker-report.html        ← Settlement + invoices
├── routes/
│   ├── admin/
│   │   └── masterDataRoutes.js   ← Brokers/Factories/Wholesalers/Commodities CRUD
│   ├── brokerRoutes.js           ← All broker APIs
│   ├── priceRoutes.js            ← Daily rate APIs
│   ├── commodityRoutes.js        ← Commodity dropdown
│   ├── factoryRoutes.js          ← Factory management
│   └── broadcastRoutes.js        ← WhatsApp trigger
├── middleware/
│   ├── adminAuth.js              ← Admin session guard
│   └── brokerAuth.js             ← Broker session guard
├── services/
│   ├── whatsappService.js        ← Twilio (→ Meta API in 1.7)
│   └── broadcastService.js       ← Message formatter
├── config/
│   └── whatsappConfig.js
├── db.js                         ← pg pool
├── server.js                     ← Express app
├── .env                          ← Secrets
└── PROJECT_NOTES.md              ← Context file for Claude sessions
```

---

## 7. Immediate Next Steps (Priority Order)

### 🔴 This Sprint — MVP 1.6

1. **Design `rates.csv` schema** — agree on columns before building
2. **Build CSV-powered public rates page** — Papa Parse + render factory cards
3. **Add "Export CSV" button** to `price-entry.html` — one-click download of today's rates as `rates.csv`
4. **Deploy to Netlify** — commit CSV + page → auto-deploy
5. **SEO pass** — meta tags, JSON-LD, Gujarati keywords

### 🟡 Parallel — WhatsApp Meta Migration (MVP 1.7)

1. **Create message template** in Meta Business Manager (Gujarati daily rates)
2. **Submit for approval** — typically 24–48 hrs
3. **Update `whatsappService.js`** — Meta Cloud API integration
4. **End-to-end test** with father's number

### 🟢 Waiting / Background

1. LLP certificate → AWS setup → MVP 2.0
2. Enter historical FY 2024-25 data from notebook
3. Configure `umiyaagrosetu.in` on Netlify
4. ₹3/bag conversation after first invoices sent

---

## 8. Business Context (Unchanged)

**Brokerage model:** ₹2/bag from factory + ₹2/bag from wholesaler = ₹4/bag total  
**Settlement cycle:** Annual — April to March  
**FY 2025-26 to date:** 164 trades · 5,824 bags · ₹69,53,113 gross · ₹23,296 brokerage earned

**Competitive moats:**
- 30-year trust network (father knows every factory and wholesaler personally)
- Gujarati-first product — language + local knowledge barrier
- First mover in North Gujarat cattle feed digitisation
- Proven ₹2+₹2 model — zero behaviour change needed
- Data moat — first to digitise trade records owns pricing intelligence

---

*AgroSetu — સાચો ભાવ, સીધો તમારા હાથમાં | Umiya AgroSetu Digital LLP | umiyaagrosetu.com*  
*Document maintained in: `commodity-broker-backend/PROJECT_NOTES.md`*
