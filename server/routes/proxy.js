const express = require('express');
const router = express.Router();

// Sites block iframing via X-Frame-Options / CSP frame-ancestors headers.
// The browser enforces those headers from THEIR response — so we fetch the
// page server-side and re-serve it from our own origin with those headers
// stripped. The iframe then loads our proxied copy, which the browser allows.
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// What a real browser sends when loading an <iframe> — some WAFs (e.g. MDPI's
// Akamai) return 403 specifically to these, while allowing plain requests.
// The check must send them or it reports "frameable" for pages the browser
// will actually see as Access Denied.
const IFRAME_FETCH_HEADERS = {
  ...BROWSER_HEADERS,
  'Sec-Fetch-Dest': 'iframe',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'cross-site',
};

function validUrl(raw) {
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u : null;
  } catch { return null; }
}

// GET /api/proxy/check?url= — can this url be iframed directly, or must it go through the proxy?
router.get('/check', async (req, res) => {
  const u = validUrl(req.query.url);
  if (!u) return res.status(400).json({ error: 'valid http(s) url required' });

  try {
    const r = await fetch(u, { headers: IFRAME_FETCH_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    const xfo  = (r.headers.get('x-frame-options') || '').toLowerCase();
    const csp  = (r.headers.get('content-security-policy') || '').toLowerCase();
    const type = r.headers.get('content-type') || '';
    r.body?.cancel?.();

    res.json({
      ok: r.ok,
      status: r.status,
      contentType: type,
      isPdf: type.includes('application/pdf') || u.pathname.toLowerCase().endsWith('.pdf'),
      frameBlocked: !r.ok || xfo.includes('deny') || xfo.includes('sameorigin') || csp.includes('frame-ancestors'),
    });
  } catch (err) {
    res.json({ ok: false, status: 0, frameBlocked: true, error: err.message });
  }
});

// GET /api/proxy?url= — fetch the page and re-serve it without frame-blocking headers.
// Pass &scripts=1 to keep the page's JavaScript (default: stripped, because
// blocked sites' scripts typically redirect the frame to a login/authwall URL
// that is itself frame-blocked — Chrome then shows "blocked" over the content).
router.get('/', async (req, res) => {
  const u = validUrl(req.query.url);
  if (!u) return res.status(400).send('valid http(s) url required');

  let upstream;
  try {
    upstream = await fetch(u, { headers: BROWSER_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'Site took too long to respond (20s timeout).' : `Could not reach site: ${err.message}`;
    return res.status(502).send(errorPage(u, msg));
  }

  const type = upstream.headers.get('content-type') || 'application/octet-stream';

  if (!upstream.ok) {
    return res.status(502).send(errorPage(u, `Site refused the request (HTTP ${upstream.status}) — it is blocking non-browser access at the network edge.`));
  }

  if (type.includes('text/html')) {
    let html = await upstream.text();

    // Akamai serves a JS bot-challenge interstitial instead of the page when
    // it suspects automation. It can't be solved server-side — say so honestly.
    if (html.includes('/akamai/interstitial')) {
      return res.status(502).send(errorPage(u, "This site's firewall is showing a bot-verification challenge that only a real browser tab can pass."));
    }

    if (req.query.scripts !== '1') {
      html = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi, '');
    }

    // <base> makes every relative/root-relative asset resolve against the
    // ORIGINAL site, so styles/images load from there, not from us.
    const base = `<base href="${u.href.replace(/"/g, '&quot;')}">`;
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => `${m}\n${base}`);
    else html = base + html;

    res.set('Content-Type', type);
    return res.send(html);
  }

  // PDFs, images, everything else: stream the bytes through untouched
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.set('Content-Type', type);
  res.set('Content-Length', String(buf.length));
  res.send(buf);
});

function errorPage(u, msg) {
  return `<!doctype html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#14141f;color:#cdd6f4;font-family:sans-serif;text-align:center;padding:1rem">
  <div>
    <div style="font-size:2rem">🛡️</div>
    <p style="max-width:420px;line-height:1.5">${msg}</p>
    <a href="${u.href.replace(/"/g, '&quot;')}" target="_blank" rel="noreferrer" style="color:#fab387">↗ Open in a new tab instead</a>
  </div></body></html>`;
}

module.exports = router;
