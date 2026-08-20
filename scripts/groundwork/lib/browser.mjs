/* Minimal CDP driver for sources that only exist as an interactive app.

   TCEQ's air permit search is a session-bound ColdFusion form. It cannot be
   posted directly — the submit control is an image input whose *name* carries
   the Fusebox action, and reconstructing that wire format by hand returns a
   server error. Letting a real browser submit the form natively is the only
   thing that works, so this wraps just enough of the DevTools protocol to do
   that: launch, navigate, evaluate, and read the page after a navigation.

   It also sets a normal user agent. TCEQ serves a 404 to the default
   HeadlessChrome UA while serving the real form to everything else. */

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333, profile = '/tmp/gw-chrome-profile' } = {}) {
  fs.mkdirSync(profile, { recursive: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--user-agent=${UA}`, '--window-size=1400,1000', 'about:blank',
  ], { stdio: 'ignore', detached: false });

  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }
  return { proc, port };
}

export async function attach(port = 9333) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
  if (!target) throw new Error('no page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener('open', r));
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Page.enable');

  return {
    async goto(url, wait = 4000) { await send('Page.navigate', { url }); await sleep(wait); },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
      return r.result?.result?.value;
    },
    close() { try { ws.close(); } catch { /* already gone */ } },
  };
}
