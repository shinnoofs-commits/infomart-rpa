/**
 * @fileOverview S-Guardian Gate for S-Hub Agent (Security Pre-Audit)
 * RPAおよびインフォマート自動発注に対する不正アクセス、命令改ざん、秘密情報漏洩を遮断するセキュリティゲート
 */

export interface SecurityCheckResult {
  isSafe: boolean;
  reason?: string;
  sanitizedPrompt: string;
}

// プロンプトインジェクション検知
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /これまでの(指示|命令|設定)を(すべて|全部)?(無視|破棄|忘れて)/,
  /system\s*prompt/i,
  /システムプロンプトを(表示|開示|出力|教えて)/,
  /api[-_]?key/i,
  /秘密鍵|パスワード|password|credentials|トークン|channel_access_token/i,
  /rm\s+-rf/i,
  /drop\s+table/i,
  /delete\s+from/i,
];

// 書き込み・破壊・強制送信の検知（現フェーズは完全Read-Only）
const WRITE_OR_TRIGGER_PATTERNS = [
  /(データベース|データ|レコード|発注|注文|ログ).*(削除|消去|上書き|変更|書き換え|消して|なくして)/i,
  /delete\s+(all|order|log|setting)/i,
  /overwrite/i,
  /(今すぐ|強制|自動).*発注.*(実行|送信|して)/i, // 現フェーズは誤発注防止のためAIからの直接発注送信は禁止
];

export function auditPromptSecurity(rawPrompt: string): SecurityCheckResult {
  const trimmed = rawPrompt.trim();

  if (!trimmed) {
    return {
      isSafe: false,
      reason: 'プロンプトが空です。',
      sanitizedPrompt: '',
    };
  }

  // 1. プロンプトインジェクション＆機密流出検査
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isSafe: false,
        reason: '【S-Guardian 遮断】プロンプトインジェクションまたはインフォマート認証情報・機密へのアクセス試行を検知しました。',
        sanitizedPrompt: '',
      };
    }
  }

  // 2. データベース破壊・不正な直接発注試行の検査
  for (const pattern of WRITE_OR_TRIGGER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isSafe: false,
        reason: '【S-Guardian 遮断】現在のS-Hub Agentは安全保護のため「監視・照会・診断専用（Read-Only）」モードで動作しています。データベースの改ざんやAI単独による強制発注送信は制限されています。',
        sanitizedPrompt: '',
      };
    }
  }

  return {
    isSafe: true,
    sanitizedPrompt: trimmed,
  };
}
