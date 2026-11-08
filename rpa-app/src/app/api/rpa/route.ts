import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { chromium } from 'playwright';
import { isRpaRunning, setRpaRunning, isRpaAbortRequested, resetRpaAbort, setActiveBrowser } from '@/lib/rpaState';
import { sendLineNotification } from '@/lib/line';

import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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
  } catch (e) {
    console.error('Error reading .env.local:', e);
  }

  const cleanStoreName = storeName.replace(/[\s　]+/g, '');
  const storeBaseName = cleanStoreName.replace(/店$/, '');

  const userId = 
    envMap[`INFOMART_USER_ID_${cleanStoreName}`] || 
    envMap[`INFOMART_USER_ID_${storeBaseName}店`] || 
    envMap[`INFOMART_USER_ID_${storeBaseName}`] || 
    process.env[`INFOMART_USER_ID_${cleanStoreName}`] || 
    process.env[`INFOMART_USER_ID_${storeBaseName}店`] || 
    process.env[`INFOMART_USER_ID_${storeBaseName}`] || 
    envMap['INFOMART_USER_ID'] || 
    process.env.INFOMART_USER_ID;

  const password = 
    envMap[`INFOMART_PASSWORD_${cleanStoreName}`] || 
    envMap[`INFOMART_PASSWORD_${storeBaseName}店`] || 
    envMap[`INFOMART_PASSWORD_${storeBaseName}`] || 
    process.env[`INFOMART_PASSWORD_${cleanStoreName}`] || 
    process.env[`INFOMART_PASSWORD_${storeBaseName}店`] || 
    process.env[`INFOMART_PASSWORD_${storeBaseName}`] || 
    envMap['INFOMART_PASSWORD'] || 
    process.env.INFOMART_PASSWORD;

  return { userId: userId?.trim(), password: password?.trim() };
}

function getPinpointSearchKeyword(productName: string): string {
  const clean = productName
    .normalize('NFKC')
    .replace(/【.*?】|\[.*?\]|（.*?）|\(.*?\)|■.*?■/g, ' ')
    .replace(/^[a-z0-9]+[\)）]/gi, ' ')
    .replace(/(?:No|NO|no|Ｎｏ|ＮＯ|№)\.?\s*\d*/gi, ' ')
    .replace(/\d+(?:\.\d+)?(?:kg|g|ml|l|cm|mm|合|袋|本|枚|個|ヶ|ケ|箱|缶|トレー)/gi, ' ')
    .replace(/創味|ベストシェフ|ベスト|京果食品|ケンコー|キユーピー|qp|味の素|ニッスイ|マルちゃん|ヤマサ|サンジルシ|マヨネーズ|アグリトラスト|スミダパッケージ|ワン折重|ジョイフーズ|ユニフーズ|ヤマガタ|東洋水産|マルハニチロ|日本食研|食研|上野製薬|上野|ジェフダ|jfda|大冷|ミツカン|オカモト|茨木海苔|太堀|あじかん|雪和食品|長山|シンノオ|シモジマ|シモ/gi, ' ')
    .replace(/[！-／：-＠［-｀｛-～!-/:-@[-`{-~]/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(w => w.length >= 2);
  if (words.length > 0) return words[0];
  return productName.trim().slice(0, 6);
}

export async function runRpaExecution(ordersToSync?: any[]) {
  if (isRpaRunning()) {
    console.log('[RPA] すでに別のRPAタスクが実行中のため、スキップしました。');
    return { success: false, message: 'RPAは現在別のタスクで実行中です。' };
  }

  resetRpaAbort();
  setRpaRunning(true);
  const db = getDb();
  
  // UIの最新状態を受け取り、DBを同期させる（race condition対策）
  try {
    if (ordersToSync && Array.isArray(ordersToSync)) {
      const updateQ = db.prepare("UPDATE orders SET quantity = ? WHERE id = ?");
      db.transaction((ordersToUpdate: any[]) => {
        for (const o of ordersToUpdate) {
          updateQ.run(Number(o.quantity) || 0, o.id);
        }
      })(ordersToSync);
    }
  } catch (e) {
    // リクエストボディがパースできなくてもフォールバックとしてDBから直接読む
  }

  // 1. 未処理のオーダーを取得
  const orders = db.prepare("SELECT * FROM orders WHERE status = '未処理'").all() as any[];
  
  if (orders.length === 0) {
    setRpaRunning(false);
    return { success: true, message: '処理対象のデータがありません。', results: [] };
  }

  // 実行結果を記録する配列
  const results = [];

  // Playwrightのセットアップ
  const browser = await chromium.launch({ headless: true });
  setActiveBrowser(browser);

  try {
    // 2. 店舗（store_name）ごとにグループ化して順次発注を行う
    const ordersByStore: Record<string, any[]> = {};
    for (const order of orders) {
        const storeKey = order.store_name || '店舗名未指定';
        if (!ordersByStore[storeKey]) ordersByStore[storeKey] = [];
        ordersByStore[storeKey].push(order);
    }

    for (const [storeName, storeOrders] of Object.entries(ordersByStore)) {
        if (isRpaAbortRequested()) {
          console.log('[RPA] 中止リクエストを検知したため店舗ループを中断します。');
          break;
        }

        console.log(`[RPA] 店舗「${storeName}」の発注処理を開始します (${storeOrders.length}件)`);

        const { userId, password } = getStoreCredentials(storeName);

        if (!userId || !password) {
          console.error(`[RPA] 店舗「${storeName}」のログイン情報が見つかりません。`);
          for (const order of storeOrders) {
            db.prepare("UPDATE orders SET status = 'エラー', error_message = 'ログイン情報が設定されていません' WHERE id = ?").run(order.id);
            results.push(`❌ ${order.product_name} (ログイン情報未設定)`);
          }
          continue;
        }

        console.log(`[RPA] 店舗「${storeName}」用に ID: ${userId} でインフォマートにログインします`);

        // 店舗ごとにクリーンなブラウザコンテキストを作成（前の店舗のセッションクッキーをクリア）
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        page.on('dialog', async dialog => {
          console.log(`[RPA] Dialog detected: ${dialog.message()}`);
          await dialog.accept();
        });

        // インフォマートへアクセスしてログイン
        await page.goto('https://www.infomart.co.jp/scripts/logon.asp', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('input[name="uid"], input[name="UID"]', { timeout: 15000 }).catch(() => {});
        
        const uidSelector = 'input[name="uid"], input[name="UID"]';
        const pwdSelector = 'input[name="pwd"], input[name="PWD"]';
        const submitSelector = 'input[type="image"], input[type="submit"], button[type="submit"], a.btn-login';

        if (await page.$(uidSelector) && await page.$(pwdSelector)) {
            await page.fill(uidSelector, userId);
            await page.fill(pwdSelector, password);
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                page.click(submitSelector)
            ]);
        } else {
            console.log(`[RPA] ログイン画面の入力欄が見つからないか、既にログイン済みです。`);
        }

        await page.waitForTimeout(2000); // ログイン後の画面ロード待ち

        // 発注リスト画面へ遷移
        const isOnOrderPage = (await page.$('#sdate')) !== null;

        if (!isOnOrderPage) {
          console.log('[RPA] 発注リスト画面へ遷移します...');
          await page.waitForSelector('#lnkLog, a[title="発注リスト"]', { timeout: 15000 }).catch(() => {});
          
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
            page.evaluate(() => {
              const link = document.getElementById('lnkLog') || document.querySelector('a[title="発注リスト"]') || document.querySelector('a[href*="order_my_catalog"]');
              if (link) (link as HTMLElement).click();
            })
          ]);
        }
        await page.waitForTimeout(3000); // 描画待ち

        // 週間発注（カレンダー日付別・7日間）タブへの切替確認
        // インフォマートでは「発注」タブと「週間発注」タブがあり、日付ごとの入力枠は「週間発注」タブにある
        const hasSdateInput = (await page.$('#sdate')) !== null;
        if (!hasSdateInput) {
          const weeklyTab = await page.$('#catalogTabLinkB, a[href*="buyer_reserved_order"], a:has-text("週間発注")');
          if (weeklyTab) {
            console.log(`[RPA] 店舗「${storeName}」: 週間発注（カレンダー）タブへ切り替えます...`);
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
              weeklyTab.click()
            ]);
            await page.waitForTimeout(2000);
          }
        }

        // インフォマート画面上の店舗切替・確認処理（他店舗への誤入力防止ガード）
        if (storeName !== '店舗名未指定') {
          const storeSwitchResult = await page.evaluate((targetStore) => {
             const cleanTarget = targetStore.normalize('NFKC').replace(/[\s　]+/g, '').replace(/店$/, '');
             
             // 1. 店舗選択セレクトボックスを探して切り替える
             const storeSelects = Array.from(document.querySelectorAll('select[name="mc_list"], select[name="store_select"], select'));
             let switchedBySelect = false;
             for (const sel of storeSelects as HTMLSelectElement[]) {
                 const option = Array.from(sel.options).find(opt => {
                   const optText = opt.text.normalize('NFKC').replace(/[\s　]+/g, '').replace(/店$/, '');
                   return optText.includes(cleanTarget) || cleanTarget.includes(optText);
                 });
                 if (option) {
                     if (sel.value !== option.value) {
                       sel.value = option.value;
                       sel.dispatchEvent(new Event('change', { bubbles: true }));
                       if (typeof (window as any).SendForm === 'function') {
                           (window as any).SendForm();
                       }
                     }
                     switchedBySelect = true;
                     break;
                 }
             }

             // 2. 画面上のテキスト（ヘッダー、店舗名表示エリア、DOM全体）に対象店舗が含まれるか確認
             const fullText = (document.documentElement.textContent || document.body.textContent || '').normalize('NFKC').replace(/[\s　]+/g, '');
             const isStoreMatched = switchedBySelect || fullText.includes(cleanTarget);

             return { success: isStoreMatched, switchedBySelect };
          }, storeName).catch(() => ({ success: false, switchedBySelect: false }));

          if (!storeSwitchResult.success) {
             console.error(`[RPA] ❌ エラー: インフォマート画面上で店舗「${storeName}」が確認できませんでした。ログイン情報未設定または店舗切替不可のため処理を中断します。`);
             for (const order of storeOrders) {
               db.prepare("UPDATE orders SET status = 'エラー', error_message = ? WHERE id = ?")
                 .run(`インフォマート画面上で対象店舗「${storeName}」が確認できません（ログインID未設定または店舗切替不可）`, order.id);
               results.push(`❌ ${order.product_name} (店舗「${storeName}」確認不可・安全のため入力停止)`);
             }
             await page.screenshot({ path: `./public/screenshots/store_mismatch_${storeName}.png`, fullPage: true }).catch(() => {});
             await context.close().catch(() => {});
             continue; // 誤入力を防ぐため、即座に次の店舗の処理へスキップ！
          }
          await page.waitForTimeout(2000);
        }

        // 「発注実績・予定: 全て (AllFlg1)」および「全商品 > 全て」を確実に適用して全商品を表示させるガード関数
        const ensureCatalogShowsAllProducts = async () => {
          if (isRpaAbortRequested()) return false;

          // 週間発注タブが外れていたら戻す
          if ((await page.$('#sdate')) === null) {
            const weeklyTab = await page.$('#catalogTabLinkB, a[href*="buyer_reserved_order"], a:has-text("週間発注")');
            if (weeklyTab) {
              console.log(`[RPA] 店舗「${storeName}」: 週間発注タブへ復帰します...`);
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
                weeklyTab.click()
              ]);
              await page.waitForTimeout(2000);
            }
          }

          // 1. ラジオボタン「発注実績・予定」が「全て (AllFlg1)」になっているか確認
          const needsAllFlg = await page.evaluate(() => {
            const radioAll = document.getElementById('AllFlg1') as HTMLInputElement;
            const hiddenAll = document.getElementById('AllFlg') as HTMLInputElement;
            if (radioAll && !radioAll.checked) {
              radioAll.checked = true;
              if (hiddenAll) hiddenAll.value = '1';
              const label = document.querySelector('label[for="AllFlg1"]') as HTMLElement;
              if (label) label.click();
              else radioAll.click();
              if (typeof (window as any).SendForm === 'function') {
                (window as any).SendForm();
              }
              return true;
            }
            return false;
          }).catch(() => false);

          if (needsAllFlg) {
            console.log(`[RPA] 店舗「${storeName}」: 発注予定・実績を「全て (AllFlg1)」に切り替え中...`);
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(2000);
          }

          // 2. 画面上が0件または商品リンクがない場合、サイドバーの「全て」をクリック
          const needsSideMenuReset = await page.evaluate(() => {
            const text = document.body.innerText || '';
            const hasZero = text.includes('件数: 0件') || text.includes('該当する情報は見つかりませんでした');
            const hasItems = !!document.querySelector('a#itemNameLink');
            return hasZero || !hasItems;
          }).catch(() => false);

          if (needsSideMenuReset) {
            console.log(`[RPA] 店舗「${storeName}」: カタログが0件のため「全商品 > 全て」に切替処理を実行します...`);
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
              page.evaluate(() => {
                if (typeof (window as any).fSelect === 'function') {
                  (window as any).fSelect('1', '', '', '', '', '');
                } else {
                  const allLink = document.getElementById('linkAllCount');
                  if (allLink) (allLink as HTMLElement).click();
                }
              })
            ]);
            await page.waitForTimeout(3000);
          }
          return true;
        };

        await ensureCatalogShowsAllProducts();

        let remainingOrders = [...storeOrders];
        let lastUsedStartDate = "";
        
        // 日付範囲を変えながら探すための大きなループ
        while (remainingOrders.length > 0) {
            if (isRpaAbortRequested()) {
              console.log('[RPA] 中止リクエストを検知したため日付ループを中断します。');
              break;
            }

            // DBから対象オーダーが削除されていないか確認（全削除ボタン対応）
            const orderIds = remainingOrders.map(o => o.id);
            if (orderIds.length > 0) {
              const inDb = db.prepare(`SELECT COUNT(*) as cnt FROM orders WHERE id IN (${orderIds.join(',')})`).get() as { cnt: number };
              if (!inDb || inDb.cnt === 0) {
                console.log('[RPA] 対象オーダーがDBから削除されたため、処理を終了します。');
                remainingOrders = [];
                break;
              }
            }

            // 残っているオーダーのうち、最も早い納品日を見つける
            const dates = remainingOrders.map(o => new Date(o.delivery_date).getTime());
            const minDateMs = Math.min(...dates);
            const targetStartDateStr = new Date(minDateMs).toISOString().split('T')[0].replace(/-/g, '/');
            
            if (lastUsedStartDate === targetStartDateStr) {
                console.log(`[RPA] 開始日 ${targetStartDateStr} の全ページ探索が完了したためループを終了します。残り:${remainingOrders.length}件`);
                break;
            }
            lastUsedStartDate = targetStartDateStr;

            // 画面の「開始日」を変更する
            const currentSdate = await page.inputValue('#sdate').catch(() => null);
            if (currentSdate && currentSdate !== targetStartDateStr) {
                console.log(`[RPA] 表示開始日を ${targetStartDateStr} に変更します...`);
                await page.fill('#sdate', targetStartDateStr);
                // 送信前にAllFlgが1（全て）であることを担保
                await page.evaluate(() => {
                    const radioAll = document.getElementById('AllFlg1') as HTMLInputElement;
                    const hiddenAll = document.getElementById('AllFlg') as HTMLInputElement;
                    if (radioAll) radioAll.checked = true;
                    if (hiddenAll) hiddenAll.value = '1';
                }).catch(() => {});

                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                    page.evaluate(() => {
                        const btn = document.getElementById('sdateDisplayLink');
                        if (btn) btn.click();
                    })
                ]);
                await page.waitForTimeout(2000);
                await ensureCatalogShowsAllProducts();
            }

            let pageNum = 1;
            let maxPages = 10; // 無限ループ防止（最大10ページ）

        // 全ページを巡回するループ
        while (remainingOrders.length > 0 && pageNum <= maxPages) {
          if (isRpaAbortRequested()) {
            console.log('[RPA] 中止リクエストを検知したためページループを中断します。');
            break;
          }

          console.log(`[RPA] ページ ${pageNum} を処理中... (開始日:${targetStartDateStr}) 残りオーダー: ${remainingOrders.length}件`);

          if (pageNum === 1) {
            const hasZeroItems = await page.evaluate(() => {
              const text = document.body.innerText || '';
              return text.includes('件数: 0件') || text.includes('該当する情報は見つかりませんでした') || !document.querySelector('a#itemNameLink');
            }).catch(() => false);
            if (hasZeroItems) {
              console.log(`[RPA] ページ1で商品0件を検知。カタログ表示を強制再適用します...`);
              await ensureCatalogShowsAllProducts();

              // 再適用後もなお0件の場合は、この日付のカタログは存在しないため探索を終了する
              const stillZero = await page.evaluate(() => {
                const text = document.body.innerText || '';
                return text.includes('件数: 0件') || text.includes('該当する情報は見つかりませんでした') || !document.querySelector('a#itemNameLink');
              }).catch(() => false);

              if (stillZero) {
                console.log(`[RPA] 店舗「${storeName}」: 全商品カタログ適用後も商品0件のため、この開始日(${targetStartDateStr})の探索を終了します。`);
                break;
              }
            }
          }
          
          const ordersToProcess = [...remainingOrders];
          const modifiedOrdersOnThisPage: any[] = [];
          
          for (const order of ordersToProcess) {
              const targetDateStr = order.delivery_date.replace(/-/g, '/');
              
              const success = await page.evaluate(({ productName, targetDateStr, qty }) => {
                const links = Array.from(document.querySelectorAll('a#itemNameLink, a'));
                const normalize = (s: string) => {
                  if (!s) return '';
                  return s
                    .normalize('NFKC')
                    .replace(/[\u338e\u338f]/g, 'kg')
                    .replace(/[\u3395\u3396]/g, 'mg')
                    .replace(/[\u3397\u3398]/g, 'g')
                    .replace(/[\u3399\u339a]/g, 'l')
                    .replace(/[\u339b\u339c]/g, 'ml')
                    .replace(/[\u339d\u339e]/g, 'cm')
                    .replace(/[！-～]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0)) // 全角英数記号 -> 半角
                    .replace(/[ー―‐‑–—−〜~]/g, '-') // 長音符・各種ハイフン・波線 -> 半角ハイフン
                    .replace(/【.*?】|\[.*?\]|（.*?）|\(.*?\)/g, '') // ブラケット・丸括弧表記を除去
                    .replace(/^[a-z0-9]+[\)）]/gi, '') // A）B）1）等の先頭記号を除去
                    .replace(/№|no\.|no/gi, 'no')
                    .replace(/すき焼(?!き)/g, 'すき焼き')
                    .replace(/唐揚(?!げ)/g, '唐揚げ')
                    .replace(/から揚(?!げ)/g, 'から揚げ')
                    .replace(/油揚(?!げ)/g, '油揚げ')
                    .replace(/厚揚(?!げ)/g, '厚揚げ')
                    .replace(/串焼(?!き)/g, '串焼き')
                    .replace(/蒲焼(?!き)/g, '蒲焼き')
                    .replace(/照焼(?!き)/g, '照焼き')
                    .replace(/塩焼(?!き)/g, '塩焼き')
                    .replace(/角切(?!り)/g, '角切り')
                    .replace(/薄切(?!り)/g, '薄切り')
                    .replace(/[\s　]+/g, '') // スペース除去
                    .toLowerCase();
                };

                const getBigrams = (str: string) => {
                  const norm = normalize(str);
                  const bg = new Set<string>();
                  for (let i = 0; i < norm.length - 1; i++) {
                    bg.add(norm.slice(i, i + 2));
                  }
                  return bg;
                };

                const extractModelTokens = (str: string) => {
                  // スペース除去前にトークンを抽出して数字と単位の誤結合を防止
                  const s = str.normalize('NFKC').toLowerCase()
                    .replace(/[！-～]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
                    .replace(/\d+(?:\.\d+)?(?:kg|g|ml|l|cm|mm|合|袋|本|枚|個|ヶ|ケ|箱|缶)/gi, ' ');
                  const tokens = s.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
                  return tokens.filter(t => !/^\d{3,}$/.test(t) && t.length >= 2 && !/^(?:kg|ml|cm|mm|no)$/.test(t));
                };

                const extractColor = (str: string) => {
                  const norm = normalize(str);
                  const colors = ['赤', '黒', '金', '白', '青', '緑', '茶', '黄'];
                  return colors.filter(c => norm.includes(c.toLowerCase()));
                };

                const extractPartType = (str: string) => {
                  const norm = normalize(str);
                  const isLid = /蓋|oc/.test(norm);
                  const isBase = /本体|底|身/.test(norm);
                  const isInner = /内装|中皿/.test(norm);
                  return { isLid, isBase, isInner };
                };

                const BRAND_REGEX = /創味|ベストシェフ|ベスト|京果食品|ケンコー|キユーピー|qp|味の素|ニッスイ|マルちゃん|ヤマサ|サンジルシ|マヨネーズ|アグリトラスト|スミダパッケージ|ワン折重|ジョイフーズ|ユニフーズ|ヤマガタ|東洋水産|マルハニチロ|日本食研|食研|上野製薬|上野|ジェフダ|jfda|大冷|ミツカン|オカモト|茨木海苔|太堀|あじかん|雪和食品|長山|シンノオ|シモジマ|シモ|タイヨー|オーロラ|aurora|j-オイル|jオイル|ワイエムフーズ|フーディーズ|三島食品|三島/gi;

                const toKatakana = (str: string) => str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));

                const extractCoreNouns = (str: string) => {
                  const norm = toKatakana(normalize(str))
                    .replace(/■.*?■/g, '')
                    .replace(BRAND_REGEX, '');
                  const nouns = norm.match(/[\u30a0-\u30ff\u4e00-\u9faf]{2,}/g) || [];
                  return nouns;
                };

                const calcSimilarity = (target: string, candidate: string) => {
                  const normTarget = normalize(target);
                  const normCand = normalize(candidate);

                  // 1. Strict Part Type Check (Lid vs Base)
                  const partT = extractPartType(target);
                  const partC = extractPartType(candidate);
                  if (partT.isLid && partC.isBase) return 0;
                  if (partT.isBase && partC.isLid) return 0;

                  // 2. Strict Color Check
                  const colorT = extractColor(target);
                  const colorC = extractColor(candidate);
                  if (colorT.length > 0 && colorC.length > 0) {
                    const hasCommonColor = colorT.some(c => colorC.includes(c));
                    if (!hasCommonColor) return 0;
                  }

                  // 3. Strict Model Token Check (e.g. 10b vs 10-oc)
                  const modelsT = extractModelTokens(target);
                  const modelsC = extractModelTokens(candidate);
                  if (modelsT.length > 0 && modelsC.length > 0) {
                    for (const mT of modelsT) {
                      if (mT.length >= 2 && !modelsC.some(mC => mC.includes(mT) || mT.includes(mC))) {
                        return 0;
                      }
                    }
                  }

                  // 4. Strict Core Specific Noun Check (Candidate must contain at least one core noun of Target)
                  const nounsT = extractCoreNouns(target);
                  if (nounsT.length > 0) {
                    const kataCand = toKatakana(normCand);
                    const hasAnyCoreNoun = nounsT.some(n => kataCand.includes(n));
                    if (!hasAnyCoreNoun) {
                      return 0; // Reject if candidate has none of target's specific product nouns!
                    }
                  }

                  const cleanTarget = toKatakana(normTarget)
                    .replace(/■.*?■/g, '')
                    .replace(/高(?=嵌合蓋)/g, '')
                    .replace(/\d+(?:入り|入|枚|本|個|g|kg|ml)/gi, '');
                  const cleanCand = toKatakana(normCand)
                    .replace(/■.*?■/g, '')
                    .replace(/高(?=嵌合蓋)/g, '')
                    .replace(/\d+(?:入り|入|枚|本|個|g|kg|ml)/gi, '');
                  if (cleanCand.includes(cleanTarget) || cleanTarget.includes(cleanCand)) return 1.0;

                  const bgT = getBigrams(cleanTarget);
                  const bgC = getBigrams(cleanCand);
                  if (bgT.size === 0 || bgC.size === 0) return 0;

                  let intersection = 0;
                  for (const b of bgT) {
                    if (bgC.has(b)) intersection++;
                  }
                  const dice = (2 * intersection) / (bgT.size + bgC.size);

                  return dice;
                };

                let bestLink: Element | null = null;
                let bestScore = 0;

                for (const a of links) {
                  if (!a.textContent) continue;
                  const linkText = a.textContent.trim();
                  if (linkText.length < 2) continue;

                  const score = calcSimilarity(productName, linkText);
                  if (score > bestScore) {
                    bestScore = score;
                    bestLink = a;
                  }
                }

                if (!bestLink || bestScore < 0.35) return 'PRODUCT_NOT_FOUND_ON_THIS_PAGE';
                const targetLink = bestLink;
                
                const tr1 = targetLink.closest('tr');
                if (!tr1) return 'TR_NOT_FOUND';
                
                const tr2 = tr1.nextElementSibling;
                if (!tr2) return 'INPUT_ROW_NOT_FOUND';
                
                const input = tr2.querySelector(`input[name^="${targetDateStr}"]`) as HTMLInputElement;
                if (!input) return 'INPUT_NOT_FOUND'; // 列がない（日付範囲外など）
                
                if (input.disabled || input.readOnly || input.id === 'QD' || !!input.closest('.elem-disable')) {
                    return 'INPUT_DISABLED';
                }

                if (typeof (window as any).Sv === 'function') {
                    (window as any).Sv(input);
                }
                
                const isDelete = qty === '0';
                input.value = isDelete ? '' : qty;
                
                const checkbox = tr2.querySelector('input[type="checkbox"]') as HTMLInputElement;
                if (checkbox) {
                    if (isDelete && checkbox.checked) {
                        checkbox.click();
                    } else if (!isDelete && !checkbox.checked) {
                        checkbox.click();
                    }
                }

                if (typeof (window as any).Ck === 'function') {
                    (window as any).Ck(input);
                }
                
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                return 'SUCCESS';
              }, { productName: order.product_name, targetDateStr, qty: order.quantity.toString() });

              if (success === 'SUCCESS') {
                 modifiedOrdersOnThisPage.push(order);
              } else if (success === 'INPUT_DISABLED') {
                 console.log(`[RPA] 商品「${order.product_name}」の納品日 (${order.delivery_date}) は受付不可（締め切り・休日等）のため入力できません`);
                 db.prepare("UPDATE orders SET status = 'エラー', error_message = '納品日はインフォマート上で受付不可（締め切り・休日等）です' WHERE id = ?").run(order.id);
                 results.push(`❌ ${order.product_name} (納品日:${order.delivery_date}は受付不可・締め切り済み)`);
                 remainingOrders = remainingOrders.filter(o => o.id !== order.id);
              }
          }

          let pageCommitSuccess = false;
          if (modifiedOrdersOnThisPage.length > 0) {
            console.log(`[RPA] ページ ${pageNum} の入力件数: ${modifiedOrdersOnThisPage.length}件 -> 保存処理 (Commit) を実行します...`);
            await page.waitForTimeout(1000);
            try {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'commit', timeout: 30000 }).catch(() => console.log('[RPA] Navigation timeout after commit')),
                page.evaluate(() => {
                  if (typeof (window as any).Commit === 'function') {
                    (window as any).Commit();
                  } else {
                    document.getElementById('BTN_commit')?.click();
                  }
                })
              ]);
              await page.waitForTimeout(2000);
              pageCommitSuccess = true;

              // Commit成功後に初めてDBを「完了」に更新
              for (const order of modifiedOrdersOnThisPage) {
                db.prepare("UPDATE orders SET status = '完了' WHERE id = ?").run(order.id);
                results.push(`✅ ${order.product_name} - ${order.quantity} (${order.delivery_date})`);
                remainingOrders = remainingOrders.filter(o => o.id !== order.id);
              }
            } catch (err) {
              console.error(`[RPA] ページ ${pageNum} のCommit保存中にエラーが発生しました:`, err);
            }
          }

          // Commit保存後はインフォマートが予定のみ(AllFlg=0)にリセットされる場合があるため、必ず全商品表示を再適用する
          if (pageCommitSuccess) {
            console.log('[RPA] Commit保存後のカタログ表示（全商品 > 全て）を再適用します...');
            await ensureCatalogShowsAllProducts();
          }

          // 次のページへ進む処理 (Paging直接呼び出し)
          if (remainingOrders.length > 0) {
            if (isRpaAbortRequested()) {
              console.log('[RPA] 中止リクエストを検知したためページ移動を中止します。');
              break;
            }

            pageNum++;
            const targetPage = pageNum;
            console.log(`[RPA] ページ ${targetPage} へ直接移動します (Paging)...`);

            let pageNavSuccess = false;
            try {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
                page.evaluate((p) => {
                  if (typeof (window as any).Paging === 'function') {
                    (window as any).Paging(p);
                  } else if (document.f1) {
                    document.f1.pno.value = p;
                    document.f1.op_check.value = '1';
                    document.f1.sideMenuView.value = '1';
                    document.f1.action = '/trade/buyer_reserved_order.page';
                    document.f1.submit();
                  }
                }, targetPage)
              ]);
              await page.waitForTimeout(2000);

              // 画面に商品が存在するか確認
              const hasItems = await page.evaluate(() => {
                return !!document.querySelector('a#itemNameLink') || document.querySelectorAll('input#Q, input#QD').length > 0;
              }).catch(() => false);

              if (hasItems) {
                pageNavSuccess = true;
              } else {
                console.log(`[RPA] ページ ${targetPage} に商品が見つからないため、全ページの走査を完了とします。`);
                break;
              }
            } catch (pErr) {
              console.warn(`[RPA] ページ ${targetPage} への直接移動エラー:`, pErr);
              break;
            }

            if (!pageNavSuccess) {
              break;
            }
          }
        } // End of Pagination Loop
    } // End of Date Range Loop

    // ★ ピンポイント検索による自動補正入力（通常巡回で見つからなかった商品のリカバリー）
    if (remainingOrders.length > 0 && !isRpaAbortRequested()) {
      console.log(`[RPA] 通常巡回で見つからなかったオーダーが ${remainingOrders.length} 件あります。キーワード検索によるピンポイント補正入力を実行します...`);
      
      for (const order of [...remainingOrders]) {
        if (isRpaAbortRequested()) break;
        
        const kw = getPinpointSearchKeyword(order.product_name);
        const targetDateStr = order.delivery_date.replace(/-/g, '/');
        console.log(`[RPA] 🔍 ピンポイント検索実行: 「${order.product_name}」 (キーワード: 「${kw}」)`);
        
        try {
          // 1. キーワードを入力して検索実行
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
            page.evaluate((keyword) => {
              const kwInput = (document.getElementById('kwd') || document.querySelector('input[name="kwd"]')) as HTMLInputElement;
              if (kwInput) {
                kwInput.value = keyword;
              }
              if (typeof (window as any).SendForm === 'function') {
                (window as any).SendForm();
              } else if (document.f1) {
                document.f1.pno.value = '';
                document.f1.op_check.value = '1';
                document.f1.sideMenuView.value = '1';
                document.f1.action = '/trade/buyer_reserved_order.page';
                document.f1.submit();
              }
            }, kw)
          ]);
          await page.waitForTimeout(2000);

          // 2. 検索結果一覧で入力
          const success = await page.evaluate(({ productName, targetDateStr, qty }) => {
            const links = Array.from(document.querySelectorAll('a#itemNameLink, a'));
            const normalize = (s: string) => {
              if (!s) return '';
              return s
                .normalize('NFKC')
                .replace(/[\u338e\u338f]/g, 'kg')
                .replace(/[\u3395\u3396]/g, 'mg')
                .replace(/[\u3397\u3398]/g, 'g')
                .replace(/[\u3399\u339a]/g, 'l')
                .replace(/[\u339b\u339c]/g, 'ml')
                .replace(/[\u339d\u339e]/g, 'cm')
                .replace(/[！-～]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
                .replace(/[ー―‐‑–—−〜~]/g, '-')
                .replace(/【.*?】|\[.*?\]|（.*?）|\(.*?\)/g, '')
                .replace(/^[a-z0-9]+[\)）]/gi, '')
                .replace(/№|no\.|no/gi, 'no')
                .replace(/すき焼(?!き)/g, 'すき焼き')
                .replace(/唐揚(?!げ)/g, '唐揚げ')
                .replace(/から揚(?!げ)/g, 'から揚げ')
                .replace(/油揚(?!げ)/g, '油揚げ')
                .replace(/厚揚(?!げ)/g, '厚揚げ')
                .replace(/串焼(?!き)/g, '串焼き')
                .replace(/蒲焼(?!き)/g, '蒲焼き')
                .replace(/照焼(?!き)/g, '照焼き')
                .replace(/塩焼(?!き)/g, '塩焼き')
                .replace(/角切(?!り)/g, '角切り')
                .replace(/薄切(?!り)/g, '薄切り')
                .replace(/[\s　]+/g, '')
                .toLowerCase();
            };

            const toKatakana = (str: string) => str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));

            let bestLink: Element | null = null;
            let bestScore = 0;

            const normTarget = normalize(productName);
            const cleanTarget = toKatakana(normTarget).replace(/■.*?■/g, '').replace(/\d+(?:入り|入|枚|本|個|g|kg|ml)/gi, '');

            for (const a of links) {
              if (!a.textContent) continue;
              const linkText = a.textContent.trim();
              if (linkText.length < 2) continue;

              const normCand = normalize(linkText);
              const cleanCand = toKatakana(normCand).replace(/■.*?■/g, '').replace(/\d+(?:入り|入|枚|本|個|g|kg|ml)/gi, '');

              let score = 0;
              if (cleanCand === cleanTarget) score = 1.0;
              else if (cleanCand.includes(cleanTarget) || cleanTarget.includes(cleanCand)) score = 0.9;
              else if (normCand.includes(normTarget) || normTarget.includes(normCand)) score = 0.85;

              if (score > bestScore) {
                bestScore = score;
                bestLink = a;
              }
            }

            if (!bestLink || bestScore < 0.25) return 'PRODUCT_NOT_FOUND_ON_THIS_PAGE';
            const targetLink = bestLink;
            const tr1 = targetLink.closest('tr');
            if (!tr1) return 'TR_NOT_FOUND';
            const tr2 = tr1.nextElementSibling;
            if (!tr2) return 'INPUT_ROW_NOT_FOUND';

            const input = tr2.querySelector(`input[name^="${targetDateStr}"]`) as HTMLInputElement;
            if (!input) return 'INPUT_NOT_FOUND';
            if (input.disabled || input.readOnly || input.id === 'QD' || !!input.closest('.elem-disable')) {
              return 'INPUT_DISABLED';
            }

            if (typeof (window as any).Sv === 'function') (window as any).Sv(input);
            const isDelete = qty === '0';
            input.value = isDelete ? '' : qty;
            const checkbox = tr2.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (checkbox) {
              if (isDelete && checkbox.checked) checkbox.click();
              else if (!isDelete && !checkbox.checked) checkbox.click();
            }
            if (typeof (window as any).Ck === 'function') (window as any).Ck(input);
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return 'SUCCESS';
          }, { productName: order.product_name, targetDateStr, qty: order.quantity.toString() });

          if (success === 'SUCCESS') {
            console.log(`[RPA] 🎯 ピンポイント検索で商品「${order.product_name}」の入力に成功しました。保存(Commit)します...`);
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'commit', timeout: 30000 }).catch(() => {}),
              page.evaluate(() => {
                if (typeof (window as any).Commit === 'function') {
                  (window as any).Commit();
                } else {
                  document.getElementById('BTN_commit')?.click();
                }
              })
            ]);
            await page.waitForTimeout(2000);

            db.prepare("UPDATE orders SET status = '完了', error_message = NULL WHERE id = ?").run(order.id);
            results.push(`✅ ${order.product_name} - ${order.quantity} (${order.delivery_date}) [検索自動補正]`);
            remainingOrders = remainingOrders.filter(o => o.id !== order.id);
          } else if (success === 'INPUT_DISABLED') {
            db.prepare("UPDATE orders SET status = 'エラー', error_message = '納品日はインフォマート上で受付不可（締め切り・休日等）です' WHERE id = ?").run(order.id);
            results.push(`❌ ${order.product_name} (納品日:${order.delivery_date}は受付不可・締め切り済み)`);
            remainingOrders = remainingOrders.filter(o => o.id !== order.id);
          }
        } catch (kErr) {
          console.warn(`[RPA] ピンポイント検索中にエラー:`, kErr);
        }
      }

      // 検索キーワードをクリアして次回処理のためにカタログをリセット
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
          page.evaluate(() => {
            const kwInput = (document.getElementById('kwd') || document.querySelector('input[name="kwd"]')) as HTMLInputElement;
            if (kwInput) kwInput.value = '';
            if (typeof (window as any).clearKwd === 'function') (window as any).clearKwd();
            if (typeof (window as any).SendForm === 'function') (window as any).SendForm();
          })
        ]);
        await page.waitForTimeout(2000);
        await ensureCatalogShowsAllProducts();
      } catch (rstErr) {
        console.warn('[RPA] 検索クリア処理中のエラー:', rstErr);
      }
    }

    // 見つからなかったものをエラーに
    for (const order of remainingOrders) {
        db.prepare("UPDATE orders SET status = 'エラー', error_message = '全ページと全日付範囲を探しましたが入力欄が見つかりません' WHERE id = ?").run(order.id);
        results.push(`❌ ${order.product_name} (見つかりません)`);
    }
        await page.screenshot({ path: './public/screenshots/infomart_result.png', fullPage: true }).catch(() => {});
        await context.close().catch(() => {});
    } // End of Store Loop

  } catch (error: any) {
    console.error('RPA Execution Error:', error);
    return { success: false, error: error.message };
  } finally {
    // ブラウザを閉じる
    await browser.close().catch(() => {});
    setActiveBrowser(undefined);
    setRpaRunning(false);
  }

  // 中止リクエスト時でなければ、エラーが発生したオーダーがある場合はLINE公式アカウントへ通知
  if (!isRpaAbortRequested()) {
    try {
      const errorOrders = db.prepare("SELECT store_name, product_name, delivery_date, error_message FROM orders WHERE status = 'エラー'").all() as any[];
      if (errorOrders.length > 0) {
        console.log(`[RPA] エラー商品が ${errorOrders.length} 件検出されました。LINE通知を送信します...`);
        const lines = [
          '⚠️【インフォマートRPA エラー通知】',
          `発注入力中に ${errorOrders.length} 件のエラーが発生しました（要確認）:`,
          ''
        ];
        errorOrders.slice(0, 10).forEach(o => {
          lines.push(`・[${o.store_name}] ${o.product_name} (${o.delivery_date})`);
          lines.push(`  理由: ${o.error_message || '見つかりません'}`);
        });
        if (errorOrders.length > 10) {
          lines.push(`…他 ${errorOrders.length - 10} 件`);
        }
        lines.push('');
        lines.push('▼ RPA管理画面でご確認ください');
        lines.push('http://localhost:3000');

        await sendLineNotification(lines.join('\n'));
      }
    } catch (lineErr) {
      console.error('[RPA] LINE通知の作成・送信中にエラーが発生しました:', lineErr);
    }
  }

  const wasAborted = isRpaAbortRequested();
  return { 
    success: !wasAborted, 
    message: wasAborted ? 'RPA処理が停止されました。' : 'RPA処理が完了しました。', 
    results 
  };
}

export async function POST(request: Request) {
  let bodyOrders: any[] | undefined = undefined;
  try {
    const body = await request.json();
    if (body.orders) bodyOrders = body.orders;
  } catch (e) {
    // リクエストボディが空でも問題なし
  }

  const result = await runRpaExecution(bodyOrders);
  if (!result.success && result.message?.includes('現在別のタスクで実行中')) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result);
}

