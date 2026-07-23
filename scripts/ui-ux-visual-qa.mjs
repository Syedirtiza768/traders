import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.QA_BASE || 'http://localhost:8080';
const OUT = path.resolve('.qa-evidence/ui-ux-2026-07-23');
const USER = process.env.QA_USER || 'bilal@electrence.com';
const PASS = process.env.QA_PASS || 'Electrence@2026';

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', file);
}

async function runViewport(label, width, height, isMobile = false) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    hasTouch: isMobile,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username');
  await shot(page, `${label}-01-login.png`);

  await page.locator('#username').fill(USER);
  await page.locator('#password').fill(PASS);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 }).catch(() => null),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForTimeout(2000);

  // If still on login, capture and stop authenticated flow
  if (page.url().includes('/login')) {
    await shot(page, `${label}-01b-login-failed.png`);
    await browser.close();
    return { ok: false };
  }

  await page.waitForTimeout(1500);
  await shot(page, `${label}-02-dashboard.png`);

  for (const [route, slug] of [
    ['/sales', 'sales'],
    ['/customers', 'customers'],
    ['/purchases', 'purchases'],
    ['/inventory', 'inventory'],
    ['/finance', 'finance'],
    ['/reports', 'reports'],
    ['/settings', 'settings'],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await shot(page, `${label}-03-${slug}.png`);
  }

  await browser.close();
  return { ok: true };
}

const results = [];
results.push(await runViewport('desktop-1440', 1440, 900));
results.push(await runViewport('tablet-768', 768, 1024, true));
results.push(await runViewport('mobile-390', 390, 844, true));
console.log(JSON.stringify(results));
