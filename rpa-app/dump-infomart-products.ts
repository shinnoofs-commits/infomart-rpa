import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

function getStoreCredentials(storeName: string) {
  const envMap: Record<string, string> = {};
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          envMap[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
        }
      }
    });
  } catch (e) {}

  const cleanStoreName = storeName.replace(/[\s　]+/g, '');
  const storeBaseName = cleanStoreName.replace(/店$/, '');

  const userId = envMap[`INFOMART_USER_ID_${cleanStoreName}`] || envMap[`INFOMART_USER_ID_${storeBaseName}`] || envMap['INFOMART_USER_ID'];
  const password = envMap[`INFOMART_PASSWORD_${cleanStoreName}`] || envMap[`INFOMART_PASSWORD_${storeBaseName}`] || envMap['INFOMART_PASSWORD'];

  return { userId: userId?.trim(), password: password?.trim() };
}

async function run() {
  const { userId, password } = getStoreCredentials('本厚木');
  if (!userId || !password) {
    console.error('No credentials');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('https://www.infomart.co.jp/scripts/logon.asp', { waitUntil: 'commit' });
  await page.waitForSelector('input[name="uid"], input[name="UID"]');
  await page.fill('input[name="uid"], input[name="UID"]', userId);
  await page.fill('input[name="pwd"], input[name="PWD"]', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'commit' }).catch(() => {}),
    page.click('input[type="image"], input[type="submit"], button[type="submit"], a.btn-login')
  ]);

  await page.waitForSelector('#lnkLog');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'commit' }).catch(() => {}),
    page.click('#lnkLog')
  ]);
  await page.waitForTimeout(3000);

  const allProducts: { page: number; text: string }[] = [];
  let pageNum = 1;

  while (pageNum <= 20) {
    console.log(`Scanning page ${pageNum}...`);
    const productsOnPage = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a#itemNameLink, a'));
      return links
        .map(a => a.textContent?.trim() || '')
        .filter(t => t.length >= 2);
    });

    productsOnPage.forEach(t => allProducts.push({ page: pageNum, text: t }));

    const hasNext = await page.evaluate(() => !!document.querySelector('a.next_link'));
    if (!hasNext) break;

    pageNum++;
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'commit' }).catch(() => {}),
      page.evaluate(() => {
        (document.querySelector('a.next_link') as HTMLAnchorElement)?.click();
      })
    ]);
    await page.waitForTimeout(2000);
  }

  fs.writeFileSync('./public/screenshots/dump_products.json', JSON.stringify(allProducts, null, 2));
  console.log(`Saved ${allProducts.length} items from ${pageNum} pages.`);

  await browser.close();
}

run().catch(console.error);
