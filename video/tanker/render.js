const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const root = __dirname;
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.json') ? 'application/json' : f.endsWith('.woff2') ? 'font/woff2' : 'text/html' }); r.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port, fps = 30, dur = Number(process.env.DUR || 31.6), out = process.argv[2] || 'frames';
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${port}/scene.html`);
  await p.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
  await p.evaluate(() => document.fonts.ready);
  const ts = only || [...Array(fps * dur).keys()].map(i => i / fps);
  for (let i = 0; i < ts.length; i++) {
    await p.evaluate(t => window.render(t), ts[i]);
    await p.screenshot({ path: `${out}/f_${String(i).padStart(4, '0')}.png` });
  }
  await b.close(); srv.close();
});
