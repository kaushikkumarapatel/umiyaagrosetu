// broadcastService.js
const pool = require("../db");
const { sendWhatsAppMessage } = require("./twilioService");
// NOTE: When Meta API resolves, swap above to:
// const { sendWhatsAppMessage } = require("./whatsappService");

// ─────────────────────────────────────────────────────────────
// Gujarati date helpers
// ─────────────────────────────────────────────────────────────
const GU_DAYS   = ['રવિવાર','સોમવાર','મંગળવાર','બુધવાર','ગુરૂવાર','શુક્રવાર','શનિવાર'];
const GU_MONTHS = ['જાન્યુ','ફેબ્રુ','માર્ચ','એપ્રિ','મે','જૂન','જુલા','ઓગ','સપ્ટે','ઓક્ટો','નવે','ડિસે'];

function gujaratiDate() {
  const d = new Date();
  return `${GU_DAYS[d.getDay()]}, ${d.getDate()} ${GU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────
// Fetch latest prices (same data as /api/prices/latest)
// ─────────────────────────────────────────────────────────────
async function getLatestPrices() {
  // DISTINCT ON (f.id, c.id) — exactly matches /api/prices/latest logic
  // Gets the single latest price per factory+commodity combination
  const result = await pool.query(`
    SELECT DISTINCT ON (f.id, c.id)
      c.name          AS commodity,
      f.name          AS factory,
      dp.price::numeric AS price,
      dp.price_date
    FROM daily_prices dp
    JOIN factories   f ON dp.factory_id = f.id
    JOIN commodities c ON dp.commodity_id = c.id
    ORDER BY f.id, c.id, dp.price_date DESC
  `);
  return result.rows;
}

// ─────────────────────────────────────────────────────────────
// Generate formatted WhatsApp message
// ─────────────────────────────────────────────────────────────
async function generateTodayMessage() {
  const rows = await getLatestPrices();

  // ── HEADER (bold = *text* in WhatsApp) ───────────────────
  let msg = `🌾 *ઉમિયા એગ્રોસેતુ*\n`;
  msg    += `📅 *${gujaratiDate()}*\n`;
  msg    += `🐄 *આજના પશુ આહારના ભાવ*\n`;
  msg    += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  // ── PRICE ROWS (plain, sorted by factory then commodity) ─
  if (rows.length === 0) {
    msg += `⚠️ આજના ભાવ હજી ઉમેરાયા નથી.\n\n`;
  } else {
    // Group by factory for cleaner reading
    const byFactory = {};
    rows.forEach(r => {
      if (!byFactory[r.factory]) byFactory[r.factory] = [];
      byFactory[r.factory].push(r);
    });

    Object.keys(byFactory).sort().forEach(factory => {
      byFactory[factory].forEach(r => {
        const price = parseFloat(r.price).toLocaleString('en-IN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
        msg += `${r.factory} - ${r.commodity} - ₹${price}\n`;
      });
    });
  }

  // ── FOOTER ───────────────────────────────────────────────
  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💬 wa.me/917041037812\n`;
  msg += `🌐 umiyaagrosetu.com`;

  return msg;
}

// ─────────────────────────────────────────────────────────────
// Get active subscribers
// ─────────────────────────────────────────────────────────────
async function getActiveSubscribers() {
  const result = await pool.query(
    `SELECT whatsapp_number FROM subscribers WHERE is_active = true`
  );
  return result.rows.map(r => r.whatsapp_number);
}

// ─────────────────────────────────────────────────────────────
// Send broadcast to all active subscribers
// ─────────────────────────────────────────────────────────────
async function sendLatestBroadcast() {
  console.log("📣 Starting broadcast...");

  const message = await generateTodayMessage();
  console.log("✅ Message generated:\n", message);

  const subscribers = await getActiveSubscribers();
  console.log(`📱 ${subscribers.length} active subscribers`);

  if (subscribers.length === 0) {
    console.log("⚠️  No active subscribers found.");
    return { sent: 0, failed: 0, message };
  }

  let sent = 0, failed = 0;
  for (const phone of subscribers) {
    const result = await sendWhatsAppMessage(phone, message);
    result.success ? sent++ : failed++;
    await new Promise(r => setTimeout(r, 300)); // rate limit buffer
  }

  await pool.query(
    `INSERT INTO broadcasts (message, status, sent_at, created_at, broadcast_type)
     VALUES ($1, $2, NOW(), NOW(), $3)`,
    [message, `Sent:${sent} Failed:${failed}`, 'whatsapp']
  );

  console.log(`✅ Broadcast done — Sent: ${sent} | Failed: ${failed}`);
  return { sent, failed, message };
}

module.exports = { generateTodayMessage, sendLatestBroadcast };