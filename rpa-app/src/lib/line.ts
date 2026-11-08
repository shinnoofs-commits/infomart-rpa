import fs from 'fs';
import path from 'path';

function getEnvValue(key: string): string | undefined {
  if (process.env[key]) return process.env[key];

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx > 0 && trimmed.slice(0, idx).trim() === key) {
            return trimmed.slice(idx + 1).trim();
          }
        }
      }
    }
  } catch (e) {
    console.error(`[LINE] Error reading .env.local for ${key}:`, e);
  }
  return undefined;
}

/**
 * LINE公式アカウント (Messaging API) 経由で通知メッセージを送信する
 * @param message 送信するテキストメッセージ
 * @returns 送信が成功したか、または未設定でスキップされたか
 */
export async function sendLineNotification(message: string): Promise<boolean> {
  const channelAccessToken = getEnvValue('LINE_CHANNEL_ACCESS_TOKEN');
  const userId = getEnvValue('LINE_USER_ID');

  if (!channelAccessToken || !userId) {
    console.log('[LINE] LINE_CHANNEL_ACCESS_TOKEN または LINE_USER_ID が未設定のため、LINE通知をスキップしました。');
    return false;
  }

  try {
    console.log(`[LINE] LINE公式アカウントからメッセージを送信します (宛先: ${userId.slice(0, 6)}...)`);
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[LINE] 送信エラー (Status: ${res.status}):`, errorText);
      return false;
    }

    console.log('[LINE] LINE通知の送信に成功しました。');
    return true;
  } catch (error) {
    console.error('[LINE] 送信中に予期せぬ例外が発生しました:', error);
    return false;
  }
}
