// PETFORGE local QA walkthrough (Playwright, mobile viewport).
import { chromium } from 'playwright';

const SHOTS = '/home/hatch/workspace/petforge/qa/shots';
const errors = [];
const failedReqs = [];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('requestfailed', (r) => failedReqs.push(r.url() + ' :: ' + (r.failure()?.errorText || '')));

const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const step = async (label, fn) => {
  try { await fn(); console.log('ok  -', label); }
  catch (e) { console.log('FAIL-', label, '::', e.message.split('\n')[0]); }
};

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await step('1 onboarding shows', async () => {
  await page.getByText('PETFORGE', { exact: false }).first().waitFor({ timeout: 8000 });
  await shot('01-onboard');
});

await step('2 pick tidepup + name + hatch', async () => {
  await page.getByRole('button', { name: /Tidepup/ }).click();
  await page.locator('.name-input').fill('Bubbles');
  await page.getByRole('button', { name: /HATCH/ }).click();
  await page.waitForTimeout(4500);
  await shot('02-hatch');
});

await step('3 start raising -> den', async () => {
  await page.getByRole('button', { name: /Start raising/ }).click();
  await page.waitForTimeout(1200);
  await shot('03-den');
});

await step('4 tap pet', async () => {
  await page.mouse.click(195, 400);
  await page.waitForTimeout(900);
  await shot('04-pet-tap');
});

await step('5 feed tide cake', async () => {
  await page.getByRole('button', { name: 'Feed', exact: false }).first().click();
  await page.waitForTimeout(600);
  await shot('05a-feed-sheet');
  await page.getByRole('button', { name: 'Tide Cake' }).click();
  await page.waitForTimeout(2500);
  await shot('05b-fed');
});

await step('6 forge + fuse moth wings', async () => {
  await page.getByRole('button', { name: /Forge/ }).click();
  await page.waitForTimeout(800);
  await shot('06-forge');
  // buy cheapest common trait in Wings tab (Moth Wings, 60 shards; start 60 - 5 food + 8 feed = 63)
  await page.getByRole('button', { name: /Fuse/ }).first().click();
  await page.waitForTimeout(2200);
  await shot('07a-fusion-mid');
  await page.waitForTimeout(2200);
  await shot('07b-fusion-done');
});

await step('8 trials list', async () => {
  await page.getByRole('button', { name: /Trials/ }).click();
  await page.waitForTimeout(800);
  await shot('08-trials');
});

await step('9 battle moss trial', async () => {
  await page.getByRole('button', { name: /^Battle!$/ }).first().click();
  await page.waitForTimeout(4500);
  await shot('09a-battle-mid');
  await page.waitForTimeout(6000);
  await shot('09b-battle-end');
});

await step('10 keeper screen', async () => {
  const back = page.getByRole('button', { name: /Back to Trials/ });
  if (await back.count()) await back.click();
  await page.getByRole('button', { name: /Keeper/ }).click();
  await page.waitForTimeout(800);
  await shot('10-keeper');
});

console.log('\n--- JS errors:', errors.length ? '' : 'none');
errors.forEach((e) => console.log(e));
console.log('--- failed requests:', failedReqs.length ? '' : 'none');
failedReqs.forEach((e) => console.log(e));
await browser.close();
