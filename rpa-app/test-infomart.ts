import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const userId = process.env.INFOMART_USER_ID?.trim();
  const password = process.env.INFOMART_PASSWORD?.trim();

  if (!userId || !password) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
  }

  console.log('Starting Playwright for Infomart Login Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // 1. ログインページへアクセス
    console.log('Navigating to login page...');
    await page.goto('https://www.infomart.co.jp/scripts/logon.asp', { waitUntil: 'networkidle' });
    
    // Take screenshot of login page
    await page.screenshot({ path: './public/screenshots/infomart_login.png' });
    
    // Check if login inputs exist by name (common for ASP) or id
    console.log('Filling credentials...');
    // We will dump the HTML of the login form to understand the selectors if standard ones fail
    const html = await page.content();
    require('fs').writeFileSync('./public/screenshots/login_page.html', html);

    // Common selectors for Infomart
    // ID field is usually name="uid" or id="uid"
    // Password is name="pwd" or id="pwd"
    // We will attempt to fill them if they exist
    const uidSelector = 'input[name="uid"], input[name="UID"]';
    const pwdSelector = 'input[name="pwd"], input[name="PWD"]';
    
    if (await page.$(uidSelector) && await page.$(pwdSelector)) {
        await page.fill(uidSelector, userId);
        await page.fill(pwdSelector, password);
        
        // Usually an image button or submit button
        const submitSelector = 'input[type="image"], input[type="submit"], button[type="submit"], a.btn-login';
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
            page.click(submitSelector)
        ]);

        console.log('Login submitted, taking post-login screenshot...');
        await page.waitForTimeout(5000); // Wait for potential redirects
        await page.screenshot({ path: './public/screenshots/infomart_post_login.png', fullPage: true });
        
        const postHtml = await page.content();
        require('fs').writeFileSync('./public/screenshots/post_login_page.html', postHtml);
        console.log('Success! Saved screenshots and HTML.');
    } else {
        console.log('Could not find standard login fields. Check login_page.html');
    }

  } catch (error) {
    console.error('Error during automation:', error);
  } finally {
    await browser.close();
  }
}

run();
