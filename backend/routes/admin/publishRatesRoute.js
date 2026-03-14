/**
 * publishRatesRoute.js
 * POST /api/admin/publish-rates
 *
 * Reads today's rates from daily_prices table,
 * writes frontend/data/rates.csv  (for public website)
 * writes frontend/data/seo-prices.csv (for Google SEO / Looker Studio)
 *
 * Mount in server.js:
 *   const publishRatesRoute = require('./routes/publishRatesRoute');
 *   app.use('/api/admin', requireAdmin, publishRatesRoute);
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../../db');
const fs      = require('fs');
const path    = require('path');

// ── helper: escape CSV cell ──────────────────────────
function csvCell(val) {
  if (val === null || val === undefined) return '""';
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}

// ── POST /publish-rates ──────────────────────────────
router.post('/publish-rates', async (req, res) => {
  try {
    // ── 1. Query today's rates ─────────────────────
    // Adjust table name if yours is 'daily_rates' instead of 'daily_prices'
    const result = await pool.query(`
      SELECT
        f.name        AS factory_name,
        COALESCE(f.city, '')  AS factory_city,
        c.name        AS commodity_name,
        dp.price,
        dp.remarks,
        dp.price_date
      FROM daily_prices dp
      JOIN factories   f ON f.id = dp.factory_id
      JOIN commodities c ON c.id = dp.commodity_id
      WHERE dp.price_date = CURRENT_DATE
        AND dp.price > 0
      ORDER BY f.name, c.name
    `);

    const rows = result.rows;

    if (rows.length === 0) {
      return res.json({
        success: false,
        count: 0,
        message: 'No prices entered for today. Enter prices first, then publish.'
      });
    }

    // ── 2. Build rates.csv ─────────────────────────
    // Schema: factory_name, factory_city, commodity_name, price, unit, price_date, remarks, published_at
    const ratesHeaders = [
      'factory_name', 'factory_city', 'commodity_name',
      'price', 'unit', 'price_date', 'remarks', 'published_at'
    ].join(',');

    const publishedAt = new Date().toISOString();

    const ratesRows = rows.map(r => {
      const dateStr = r.price_date
        ? new Date(r.price_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      return [
        csvCell(r.factory_name),
        csvCell(r.factory_city),
        csvCell(r.commodity_name),
        r.price,
        csvCell('bag'),
        csvCell(dateStr),
        csvCell(r.remarks || ''),
        csvCell(publishedAt)
      ].join(',');
    });

    const ratesCSV = [ratesHeaders, ...ratesRows].join('\n');

    // ── 3. Build seo-prices.csv ────────────────────
    // For Google Looker Studio / Search Console tracking
    const seoHeaders = [
      'date', 'commodity', 'factory', 'city',
      'price_inr', 'unit', 'page_url', 'schema_type', 'published_at'
    ].join(',');

    const baseUrl = 'https://umiyaagrosetu.com';
    const seoRows = rows.map(r => {
      const dateStr = r.price_date
        ? new Date(r.price_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const slug = r.commodity_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return [
        csvCell(dateStr),
        csvCell(r.commodity_name),
        csvCell(r.factory_name),
        csvCell(r.factory_city),
        r.price,
        csvCell('bag'),
        csvCell(`${baseUrl}/rates/${slug}`),
        csvCell('PriceSpecification'),
        csvCell(publishedAt)
      ].join(',');
    });

    const seoCSV = [seoHeaders, ...seoRows].join('\n');

    // ── 4. Write files ─────────────────────────────
    // Resolves to: project-root/frontend/data/
    const dataDir = path.resolve(__dirname, '../../../frontend/data');
    fs.mkdirSync(dataDir, { recursive: true });

    const ratesPath = path.join(dataDir, 'rates.csv');
    const seoPath   = path.join(dataDir, 'seo-prices.csv');

    fs.writeFileSync(ratesPath, ratesCSV, 'utf8');
    fs.writeFileSync(seoPath,   seoCSV,   'utf8');

    // ── 4b. Write daily SEO CSV (one file per day) ──
    // Used for historical SEO tracking & future DB import
    const todayStr    = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const seoDir      = path.resolve(__dirname, '../../../frontend/data/seo');
    fs.mkdirSync(seoDir, { recursive: true });
    const dailySeoPath = path.join(seoDir, `seo-${todayStr}.csv`);

    // Commodity name → English mapping for SEO
    const COMMODITY_EN = {
      'કપાસિયા ખોળ': 'Kapasiya Khal (Cottonseed Cake)',
      'બિનોળા':       'Binola (Cottonseed)',
      'બિનોળા ખોળ':   'Binola Khal (Cottonseed Cake)',
      'DOC':           'DOC (De-Oiled Cake)',
      'જાડુ ભુસુ':     'Jaadu Bhusu (Coarse Wheat Bran)',
      'જીણું ભુસુ':    'Jinu Bhusu (Fine Wheat Bran)',
      'મકાઈ':          'Corn / Maize',
      'ઘઉ ભુસુ':       'Wheat Bran',
    };

    const dailySeoHeaders = [
      'date','commodity_gu','commodity_en','price','unit',
      'factory','city','remarks','page_slug','published_at'
    ].join(',');

    const dailySeoRows = rows.map(r => {
      const dateStr  = r.price_date
        ? new Date(r.price_date).toISOString().split('T')[0]
        : todayStr;
      const commEn   = COMMODITY_EN[r.commodity_name] || r.commodity_name;
      const slug     = r.commodity_name
        .toLowerCase()
        .replace(/\s+/g,'-')
        .replace(/[^a-z0-9-]/g,'');
      return [
        csvCell(dateStr),
        csvCell(r.commodity_name),
        csvCell(commEn),
        r.price,
        csvCell('bag'),
        csvCell(r.factory_name),
        csvCell(r.factory_city),
        csvCell(r.remarks || ''),
        csvCell(`${baseUrl}/rates/${slug}`),
        csvCell(publishedAt)
      ].join(',');
    });

    const dailySeoCSV = [dailySeoHeaders, ...dailySeoRows].join('\n');
    fs.writeFileSync(dailySeoPath, dailySeoCSV, 'utf8');
    console.log(`[publishRates] Wrote ${rows.length} rows → ${ratesPath}`);

    // ── 5. Respond ─────────────────────────────────
    res.json({
      success:      true,
      count:        rows.length,
      ratesFile:    'frontend/data/rates.csv',
      seoFile:      'frontend/data/seo-prices.csv',
      dailySeoFile: `frontend/data/seo/seo-${todayStr}.csv`,
      publishedAt,
      message:      `${rows.length} rates published successfully`
    });

  } catch (err) {
    console.error('[publishRates] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;