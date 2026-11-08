const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('========================================================');
console.log('   Infomart RPA Controller - Cloud Tunnel Mode          ');
console.log('   (Cloudflare Tunnel - 高安定・切断ゼロ通信)           ');
console.log('========================================================\n');

function checkPort3000() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/api/webhook/orders', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const isRunning = await checkPort3000();
  if (!isRunning) {
    console.log('[1/2] RPAサーバー (ポート3000) を起動しています...');
    spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], {
      detached: true,
      stdio: 'ignore',
      cwd: __dirname
    }).unref();
    console.log('サーバーの起動を待機しています (約7秒)...');
    await new Promise(r => setTimeout(r, 7000));
  } else {
    console.log('[1/2] RPAサーバー (ポート3000) は正常稼働中です。');
  }

  console.log('\n[2/2] 高速・高安定クラウドトンネルを起動しています...');
  const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');

  const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:3000']);

  let urlDetected = false;
  let accumulatedOutput = '';

  const handleOutput = (chunk) => {
    const text = chunk.toString();
    accumulatedOutput += text;

    if (!urlDetected) {
      const match = accumulatedOutput.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match) {
        urlDetected = true;
        const baseUrl = match[0];
        const webhookUrl = `${baseUrl}/api/webhook/orders`;

        // クリップボードにコピー
        try {
          const clipProc = spawn('clip');
          clipProc.stdin.write(webhookUrl);
          clipProc.stdin.end();
        } catch (e) {}

        console.log('\n========================================================');
        console.log('  トンネル接続が確立されました！（通信切断なし・高安定）');
        console.log('========================================================\n');
        console.log('【Webhook 送信先 URL】');
        console.log(`  ${webhookUrl}\n`);
        console.log('  ★ URLをクリップボードに自動コピーしました！');
        console.log('  デリサポーターの「設定」->「インフォマート連携 RPA Webhook 設定」の');
        console.log('  「Webhook 送信先 URL」欄に [Ctrl + V] で貼り付けて保存してください。\n');
        console.log('  ※この黒い画面を開いたままにしておくと、自動発注を受信できます。');
        console.log('========================================================\n');
      }
    }
  };

  tunnel.stdout.on('data', handleOutput);
  tunnel.stderr.on('data', handleOutput);

  tunnel.on('close', (code) => {
    console.log(`\nトンネルプロセスが終了しました (終了コード: ${code})`);
  });
}

main().catch(err => {
  console.error('エラーが発生しました:', err);
});
