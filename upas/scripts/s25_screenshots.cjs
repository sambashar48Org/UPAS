const { chromium } = require('playwright');
const { createServer } = require('http');
const path = require('path');
const fs = require('fs');

(async () => {
  const distDir = path.resolve(__dirname, '../dist');
  const server = createServer((req, res) => {
    let fp = path.join(distDir, req.url === '/' ? '/index.html' : req.url);
    if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
    const ext = path.extname(fp);
    const ct = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2' };
    fs.readFile(fp, (err, d) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'Content-Type':ct[ext]||'application/octet-stream'}); res.end(d); });
  });
  await new Promise(r => server.listen(5179, '0.0.0.0', r));

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then(c => c.newPage());

  await page.goto('http://0.0.0.0:5179/');
  await page.waitForTimeout(1200);

  // Create project
  await page.locator('aside').getByText('مشروع جديد').click();
  await page.waitForTimeout(800);
  await page.fill('#project-name', 'S2.5 Demo');
  await page.getByRole('button', { name: 'إنشاء المشروع' }).click();
  await page.waitForTimeout(1500);

  // Go to Analysis
  await page.locator('aside').getByText('التحليل').click();
  await page.waitForTimeout(5000);

  const snap = async (name) => {
    await page.screenshot({ path: `/home/z/my-project/download/${name}.png` });
    console.log(`OK: ${name}.png`);
  };

  // 1. Normal mode default view
  await snap('s25_analysis_normal');

  // 2. Click soil layer in tree → properties panel
  await page.locator('text=طين رخو').first().click().catch(() => {});
  await page.waitForTimeout(800);
  await snap('s25_soil_properties');

  // 3. Click structure in tree → properties panel
  await page.locator('text=ملجأ تحت أرضي تجريبي').first().click().catch(() => {});
  await page.waitForTimeout(800);
  await snap('s25_structure_properties');

  // 4. Click roof in tree → roof properties
  await page.locator('text=السقف').first().click().catch(() => {});
  await page.waitForTimeout(800);
  await snap('s25_roof_properties');

  // 5. Use JS to click Cutaway mode button
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent?.includes('مقطع') && b.textContent?.length < 20) { b.click(); break; } }
  });
  await page.waitForTimeout(2000);
  await snap('s25_cutaway');

  // 6. X-Ray mode
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent?.includes('أشعة سينية')) { b.click(); break; } }
  });
  await page.waitForTimeout(2000);
  await snap('s25_xray');

  // 7. Surface mode
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent?.includes('السطح') && b.textContent?.length < 15) { b.click(); break; } }
  });
  await page.waitForTimeout(2000);
  await snap('s25_surface');

  // 8. Normal + top view
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent?.trim() === 'عادي') { b.click(); break; } }
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent?.includes('علوي')) { b.click(); break; } }
  });
  await page.waitForTimeout(2000);
  await snap('s25_top_view');

  // 9. Auto-fit
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (const b of btns) { if (b.textContent?.includes('ملاءمة')) { b.click(); break; } }
  });
  await page.waitForTimeout(2000);
  await snap('s25_autofit');

  await browser.close();
  server.close();
  console.log('All done!');
})();