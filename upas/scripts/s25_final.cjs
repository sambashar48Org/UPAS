const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const vite = spawn(path.resolve(__dirname, '../node_modules/.bin/vite'), ['--host', '0.0.0.0', '--port', '5182'], {
    stdio: 'pipe', cwd: path.resolve(__dirname, '..')
  });
  await new Promise(r => { vite.stdout.on('data', d => { if (d.toString().includes('ready')) r(); }); setTimeout(r, 8000); });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto('http://0.0.0.0:5182/');
  await page.waitForTimeout(2000);
  await page.locator('aside').getByText('مشروع جديد').click();
  await page.waitForTimeout(1000);
  await page.fill('#project-name', 'S2.5');
  await page.getByRole('button', { name: 'إنشاء المشروع' }).click();
  await page.waitForTimeout(2000);
  await page.locator('aside').getByText('التحليل').click();
  await page.waitForTimeout(5000);

  const snap = async (name) => {
    await page.screenshot({ path: `/home/z/my-project/download/${name}.png` });
    const fs = require('fs');
    console.log(`${name}.png (${(fs.statSync(`/home/z/my-project/download/${name}.png`).size/1024).toFixed(0)}KB)`);
  };

  // 1. Normal
  await snap('s25_01_normal');

  // 2. Soil properties
  await page.locator('text=طين رخو').first().click();
  await page.waitForTimeout(800);
  await snap('s25_02_soil_props');

  // 3. Structure properties
  await page.locator('text=ملجأ تحت أرضي تجريبي').first().click();
  await page.waitForTimeout(800);
  await snap('s25_03_struct_props');

  // 4. Roof via force click
  await page.locator('text=السقف').first().click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  await snap('s25_04_roof_props');

  // 5-9: Mode switches using force click
  const modes = [
    ['مقطع', 's25_05_cutaway'],
    ['أشعة سينية', 's25_06_xray'],
    ['السطح', 's25_07_surface'],
    ['عادي', null], // just switch back, no screenshot
    ['علوي', 's25_08_top_view'],
  ];

  for (const [label, name] of modes) {
    await page.locator('button').filter({ hasText: label }).first().click({ force: true, timeout: 3000 }).catch(() => console.log(`  skip: ${label}`));
    await page.waitForTimeout(2000);
    if (name) await snap(name);
  }

  // 9. Auto-fit
  await page.locator('button').filter({ hasText: 'ملاءمة' }).first().click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await snap('s25_09_autofit');

  await browser.close();
  vite.kill();
  console.log('Done!');
})();