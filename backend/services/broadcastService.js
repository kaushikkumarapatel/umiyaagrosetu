const pool = require("../db");

async function generateTodayMessage() {

  const query = `
    SELECT 
      c.name AS commodity_name,
      c.unit,
      f.name AS factory_name,
      p.price,
      p.remarks,
      ph.old_price
    FROM daily_prices p
    JOIN commodities c ON c.id = p.commodity_id
    JOIN factories f ON f.id = p.factory_id
    LEFT JOIN LATERAL (
        SELECT old_price
        FROM price_history ph
        WHERE ph.factory_id = p.factory_id
        AND ph.commodity_id = p.commodity_id
        ORDER BY ph.changed_at DESC
        LIMIT 1
    ) ph ON true
    WHERE p.price_date = CURRENT_DATE
    ORDER BY c.name, f.name
  `;

  const result = await pool.query(query);

  const today = new Date().toLocaleDateString("en-GB");

  let message = `🐄 ઉમિયા ચારા સેતુ - આજના બજાર ભાવ ${today}\n\n`;

  const grouped = {};

  result.rows.forEach(row => {

    if (!grouped[row.commodity_name]) {
      grouped[row.commodity_name] = {
        unit: row.unit,
        prices: []
      };
    }

    let changeText = "";

    if (row.old_price !== null && row.old_price !== undefined) {

      const diff = row.price - row.old_price;

      if (diff !== 0) {

        const percent = ((diff / row.old_price) * 100).toFixed(2);

        if (Math.abs(percent) <= 50) {

          if (diff > 0) {
            changeText = ` 🔺${diff} (${percent}%)`;
          } else {
            changeText = ` 🔻${Math.abs(diff)} (${percent}%)`;
          }

        }

      }

    }

    grouped[row.commodity_name].prices.push({
      factory: row.factory_name,
      price: row.price,
      remarks: row.remarks,
      change: changeText
    });

  });

  Object.keys(grouped).forEach(commodity => {

    const item = grouped[commodity];

    message += `🔹 ${commodity} (${item.unit})\n`;

    item.prices.forEach(p => {

      let line = `   ${p.factory} ₹${p.price}${p.change}`;

      if (p.remarks && p.remarks.trim() !== "") {
        line += ` (${p.remarks})`;
      }

      message += line + "\n";

    });

    message += "\n";

  });

  message += `Umiya Trading Co\nArvindbhai Patel\n📞 9426501245`;

  return message;
}

module.exports = {
  generateTodayMessage
};