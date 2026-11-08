/**
 * @fileOverview S-Hub Agent (S-デリハブ / RPA機能 専属AIエージェント)
 * インフォマート発注ジョブ・デリサポデータ同期の監視と実務支援を行う自律型業務AI
 */

import { auditPromptSecurity } from './security/guardian-gate';
import { callGeminiApi, GeminiContent, GeminiFunctionDeclaration } from './gemini-client';
import { getRpaStatusDirect } from './tools/rpa-status-tool';
import { getOrderSummaryDirect } from './tools/order-summary-tool';
import { getSyncLogsDirect } from './tools/sync-logs-tool';

export interface HubAgentInput {
  userQuery: string;
  storeContext?: string;
}

export interface HubAgentOutput {
  success: boolean;
  securityStatus: string;
  response: string;
  executedTools: string[];
}

const HUB_AGENT_SYSTEM_PROMPT = `
あなたは惣菜製造・小売チェーン「株式会社シンノオ」のインフォマート自動発注・データハブ専属AIエージェント（S-Hub Agent）です。

【役割と使命】
RPA機能（インフォマート自動発注、デリサポーター確定データ同期、定期実行ジョブ）の専属頭脳として、現場担当者、店長、本部、および統括AI「S-スフィア」からの問い合わせ・監視要求を的確に解釈し、SQLiteの実データに基づいて迅速・正確に回答・診断を行います。

【保有する能力とツール】
1. getRpaStatus: 現在のRPA稼働状態、デリサポ連携の進行状況、自動スケジュール設定（21:00同期など）を照会
2. getOrderSummary: 発注伝票の集計（未処理、完了、エラー件数）および直近のエラー伝票・完了伝票の内訳を照会
3. getSyncLogs: デリサポ連携ログの履歴（店舗名、成功/失敗、取り込み件数、エラー理由）を照会

【行動規範】
- 丁寧、親切、かつ簡潔・明瞭なビジネス日本語で回答してください。
- 質問に回答するために必要なデータがある場合は、まずツールを自律的に呼び出して最新データを取得してください。
- エラー伝票がある場合は、どの店舗のどの仕入先・商品で失敗したかを明確に伝え、現場がすぐにリカバリーできるよう具体的な注意点を添えてください。
- 現在の安全フェーズでは、データの改ざんやAI単独による強制発注送信は行いません（監視・照会・診断専用）。
`;

const FUNCTION_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: 'getRpaStatus',
    description: '現在のRPA自動実行状態、デリサポ同期ステータス、夜間スケジュール設定などを取得します。',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getOrderSummary',
    description: 'インフォマート発注伝票の集計（未処理・完了・エラー件数）および直近のエラーや完了伝票を取得します。',
    parameters: {
      type: 'object',
      properties: {
        storeName: { type: 'string', description: '店舗名（例: 本厚木店, 港南台店など）。省略時は全店舗' },
        deliveryDate: { type: 'string', description: '納品日 (YYYY-MM-DD)。省略時は全件' },
      },
    },
  },
  {
    name: 'getSyncLogs',
    description: 'デリサポからの発注確定データ取り込みログ履歴（成功・失敗・件数）を取得します。',
    parameters: {
      type: 'object',
      properties: {
        storeName: { type: 'string', description: '店舗名または店舗ID。省略時は全店舗' },
        limit: { type: 'number', description: '取得件数上限（デフォルト5件）' },
      },
    },
  },
];

export async function runHubAgent(input: HubAgentInput): Promise<HubAgentOutput> {
  // 1. S-Guardian による事前セキュリティ検査
  const secResult = auditPromptSecurity(input.userQuery);
  if (!secResult.isSafe) {
    return {
      success: false,
      securityStatus: 'BLOCKED_BY_GUARDIAN',
      response: secResult.reason || 'セキュリティポリシーによりリクエストが遮断されました。',
      executedTools: [],
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      securityStatus: 'ERROR',
      response: 'GEMINI_API_KEY が設定されていません。',
      executedTools: [],
    };
  }

  const promptText = input.storeContext
    ? `【店舗文脈: ${input.storeContext}】\n質問: ${secResult.sanitizedPrompt}`
    : `質問: ${secResult.sanitizedPrompt}`;

  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [{ text: promptText }],
    },
  ];

  const tools = [{ functionDeclarations: FUNCTION_DECLARATIONS }];
  const executedTools: string[] = [];

  try {
    for (let step = 0; step < 3; step++) {
      const response = await callGeminiApi(
        apiKey,
        'gemini-flash-lite-latest',
        contents,
        HUB_AGENT_SYSTEM_PROMPT,
        tools
      );

      const candidate = response.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent) {
        throw new Error('No candidate content received from Gemini');
      }

      contents.push(modelContent);

      const functionCalls = (modelContent.parts || []).filter((p: any) => p.functionCall);

      if (functionCalls.length === 0) {
        const textParts = (modelContent.parts || []).filter((p: any) => p.text).map((p: any) => p.text);
        return {
          success: true,
          securityStatus: 'PASSED',
          response: textParts.join('\n'),
          executedTools,
        };
      }

      for (const fc of functionCalls) {
        const toolName = fc.functionCall.name;
        const toolArgs = fc.functionCall.args || {};
        executedTools.push(toolName);

        let toolResult: any = null;

        if (toolName === 'getRpaStatus') {
          toolResult = await getRpaStatusDirect();
        } else if (toolName === 'getOrderSummary') {
          toolResult = await getOrderSummaryDirect(toolArgs);
        } else if (toolName === 'getSyncLogs') {
          toolResult = await getSyncLogsDirect(toolArgs);
        } else {
          toolResult = { error: `Unknown tool: ${toolName}` };
        }

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: { result: toolResult },
              },
            },
          ],
        });
      }
    }

    return {
      success: true,
      securityStatus: 'PASSED',
      response: '処理ステップ上限に達しました。',
      executedTools,
    };
  } catch (error: any) {
    console.error('Error executing Hub Agent:', error);
    return {
      success: false,
      securityStatus: 'ERROR',
      response: `エージェント実行エラー: ${error.message || error}`,
      executedTools,
    };
  }
}
