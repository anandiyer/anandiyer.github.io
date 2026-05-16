#!/usr/bin/env node
/**
 * Refresh public market close prices for the Physical AI & Robotics page.
 *
 * Reads tickers from physical-ai-robotics/data.json (each public company has a
 * `ticker` field), fetches latest close prices from Stooq, and writes them
 * back under `data.live_quotes.quotes`. Run by a daily GitHub Action (see
 * .github/workflows/refresh-quotes.yml). Can also be run locally:
 *
 *   node scripts/refresh-quotes.mjs
 *
 * Browser CORS prevents doing this client-side, hence the server-side cron.
 * Stooq is CORS-restricted but happily serves server-to-server requests with
 * no auth and no rate limits worth worrying about for ~10 tickers/day.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'labs', 'physical-ai', 'data.json');

function tickerToStooq(ticker) {
    if (/\.HK$/i.test(ticker)) return ticker.toLowerCase();
    return ticker.toLowerCase() + '.us';
}

async function fetchOne(stooqSym) {
    const url = `https://stooq.com/q/l/?s=${stooqSym}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${stooqSym}`);
    const csv = await res.text();
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error(`Empty CSV for ${stooqSym}`);
    const cols = lines[1].split(',');
    // Headers: Symbol, Date, Time, Open, High, Low, Close, Volume
    if (cols.length < 7) throw new Error(`Bad CSV row for ${stooqSym}: ${lines[1]}`);
    const date = cols[1];
    const open = parseFloat(cols[3]);
    const close = parseFloat(cols[6]);
    if (!Number.isFinite(close) || close <= 0) {
        throw new Error(`No close price for ${stooqSym} (row: ${lines[1]})`);
    }
    const changePct = Number.isFinite(open) && open > 0
        ? Math.round(((close - open) / open) * 10000) / 100
        : null;
    return { price: close, open: Number.isFinite(open) ? open : null, change_pct: changePct, date };
}

async function main() {
    const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

    // Collect unique tickers from public companies
    const tickers = new Set();
    for (const s of data.subsectors || []) {
        for (const c of s.top_companies || []) {
            if (c.ticker) tickers.add(c.ticker);
        }
    }

    if (tickers.size === 0) {
        console.log('No tickers found in data.json; nothing to refresh.');
        return;
    }

    console.log(`Refreshing ${tickers.size} quotes:`, Array.from(tickers).join(', '));

    const quotes = {};
    const errors = [];
    for (const ticker of tickers) {
        const stooqSym = tickerToStooq(ticker);
        try {
            const quote = await fetchOne(stooqSym);
            quotes[ticker] = quote;
            console.log(`  ${ticker} → $${quote.price} (${quote.change_pct != null ? quote.change_pct + '%' : 'n/a'}) on ${quote.date}`);
        } catch (err) {
            errors.push({ ticker, error: err.message });
            console.warn(`  ${ticker} failed: ${err.message}`);
        }
        // Be polite: small delay between requests
        await new Promise(r => setTimeout(r, 200));
    }

    const updated = new Date().toISOString().split('T')[0];
    data.live_quotes = {
        updated,
        source: 'Stooq',
        quotes,
        ...(errors.length ? { errors } : {})
    };

    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`Wrote ${Object.keys(quotes).length} quotes to ${DATA_PATH} (${errors.length} errors)`);
}

main().catch(err => {
    console.error('refresh-quotes failed:', err);
    process.exit(1);
});
