// twilioService.js
// Twilio WhatsApp — temporary replacement for Meta Cloud API
// To switch back to Meta: change import in broadcastService.js to whatsappService.js

const twilio = require("twilio");
require("dotenv").config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage(to, body) {
  try {
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to:   `whatsapp:${to}`,
      body: body
    });
    console.log(`✅ Sent to ${to} | SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error(`❌ Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendWhatsAppMessage };