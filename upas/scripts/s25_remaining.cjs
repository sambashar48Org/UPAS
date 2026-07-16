const { chromium } = require('playwright');
const { createServer } = require('http');
const path = require('path');
const fs = require('fs');
const distDir = path.resolve(__dirname, '../dist');
const server = createServer((req, res) => {
  let fp = path.join(distDir, req.url === '/' ? '/index.html' : req.url);
  if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (err, d) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'Content-Type':{'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}[path.extname(fp)]||'application/octet-stream'}); res.end(d); });
});
(async () => {
  await new Promise(r => server.listen(5180, '0.0.0.0', r));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://0.0.0.0:5180/');
  await page.waitForTimeout(1000);
  await page.locator('aside').getByText('مشروع جديد').click();
  await page.waitForTimeout(600);
  await page.fill('#project-name', 'S');
  await page.getByRole('button', { name: 'إنشاء المشروع' }).click();
  await page.waitForTimeout(1000);
  await page.locator('aside').getByText('التحليل').click();
  await page.waitForTimeout(4000);
  // Switch to surface mode via JS
  await page.evaluate(() => { document.querySelectorAll('button').forEach(b => { if (b.textContent?.includes('السطح') && b.textContent.length < 15) b.click(); }); });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/z/my-project/download/s25_surface.png' });
  console.log('s25_surface.png done');
  // Top view
  await page.evaluate(() => { document.querySelectorAll('button').forEach(b => { if (b.textContent?.trim() === 'عادي') b.click(); }); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.querySelectorAll('button').forEach(b => { if (b.textContent?.includes('علوي')) b.click(); }); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/home/z/my-project/download/s25_top_view.png' });
  console.log('s25_top_view.png done');
  // Auto-fit
  await page.evaluate(() => { document.querySelectorAll('button').forEach(b => { if (b.textContent?.includes('ملاءمة')) b.click(); }); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/home/z/my-project/download/s25_autofit.png' });
  console.log('s25_autofit.png done');
  await browser.close();
  server.close();
})();