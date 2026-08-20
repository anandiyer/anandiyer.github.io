/* Shared HTTP helper for Groundwork collectors.
   Several state portals (VA DEQ among them) sit behind Akamai bot management
   that rejects curl's TLS fingerprint outright. Node's built-in fetch (undici)
   gets through, provided we send a complete browser header set — so every
   collector goes through this module rather than shelling out. */

const CHROME_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Ch-Ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

/* SEC requires a real contact string in the UA; sending Chrome's instead is a
   good way to get the whole IP blocked. */
const SEC_HEADERS = {
  'User-Agent': 'Canonical Labs Groundwork ai@canonical.cc',
  'Accept': 'application/json',
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function get(url, { headers = CHROME_HEADERS, retries = 3, timeout = 45000, json = false } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt) await sleep(1200 * attempt);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(url, { headers, signal: ac.signal });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} ${url}`);
        /* 4xx other than 429 won't fix itself on retry. */
        if (res.status !== 429 && res.status < 500) throw lastErr;
        continue;
      }
      return json ? await res.json() : await res.text();
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export const getJSON = (url, opts = {}) => get(url, { ...opts, json: true });
export const getSEC = (url, opts = {}) => get(url, { ...opts, headers: SEC_HEADERS, json: true });
export { CHROME_HEADERS, SEC_HEADERS };
