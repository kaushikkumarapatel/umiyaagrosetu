const axios = require("axios");
const config = require("../config/whatsappConfig");

async function sendWhatsAppMessage(to, message) {

  try {

    const response = await axios.post(
      config.apiUrl,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          body: message
        }
      },
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {
    console.error("WhatsApp send error:", error.response?.data || error.message);
  }

}

module.exports = {
  sendWhatsAppMessage
};