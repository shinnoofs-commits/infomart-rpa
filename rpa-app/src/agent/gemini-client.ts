/**
 * @fileOverview Lightweight, high-speed Gemini Client for S-Hub Agent
 */

import * as https from 'https';

export interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, any>;
  };
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export async function callGeminiApi(
  apiKey: string,
  model: string,
  contents: GeminiContent[],
  systemInstruction?: string,
  tools?: { functionDeclarations: GeminiFunctionDeclaration[] }[]
): Promise<any> {
  const payload: Record<string, any> = { contents };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const data = JSON.stringify(payload);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.error) {
              reject(new Error(`Gemini API Error: ${json.error.message}`));
            } else {
              resolve(json);
            }
          } catch (e: any) {
            reject(new Error(`Failed to parse Gemini response: ${e.message}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}
