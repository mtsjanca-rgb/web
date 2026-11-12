const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const fps = 30, dur = 10, out = process.argv[2] || 'frames';
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve('scene.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const ts = only || [...Array(fps * dur).keys()].map(i => i / fps);
  for (let i = 0; i < ts.length; i++) {
    await p.evaluate(t => window.render(t), ts[i]);
    await p.screenshot({ path: `${out}/f_${String(i).padStart(4, '0')}.png` });
  }
  await b.close();
})();
