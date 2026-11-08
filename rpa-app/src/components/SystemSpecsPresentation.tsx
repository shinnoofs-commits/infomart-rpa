'use client';

import React, { useState } from 'react';

export default function SystemSpecsPresentation() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'bidirectional' | 'timeline' | 'roi' | 'security' | 'api' | 'all'>('architecture');

  const slides = [
    { id: 'architecture', label: '1. システム全体構成図', icon: '🏛️', pageNum: 1 },
    { id: 'bidirectional', label: '2. 双方向データ連携仕様', icon: '⇄', pageNum: 2 },
    { id: 'timeline', label: '3. 24時間業務スケジュール', icon: '⏱️', pageNum: 3 },
    { id: 'roi', label: '4. 導入効果 & ROI (定量実績)', icon: '📈', pageNum: 4 },
    { id: 'security', label: '5. 堅牢性・耐障害性・セキュリティ', icon: '🛡️', pageNum: 5 },
    { id: 'api', label: '6. API接続 & プロトコル仕様', icon: '🔌', pageNum: 6 },
  ];

  return (
    <div className="space-y-6 text-slate-900">
      {/* 印刷用スタイル注入：A4横向き(Landscape) 1スライド1ページ完全収束 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-slide-landscape {
            break-after: page !important;
            page-break-after: always !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            height: 190mm !important;
            max-height: 190mm !important;
            min-height: 190mm !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
            border: none !important;
          }
          .print-slide-landscape:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
        }
      `}</style>

      {/* 画面用プレゼンターヘッダー（明るく洗練されたビジネス配色） */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 sm:p-6 rounded-2xl shadow-sm border-2 border-indigo-200 print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-900 text-xs font-black">
              <span>🚀 企業間受発注DXソリューション</span>
              <span>•</span>
              <span>社外・パートナー向け システム仕様書 (横向きA4対応)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-snug">
              次世代店舗受発注自動化 ＆ 実発注双方向同期システム
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
              クラウド製造管理アプリ「デリサポーター」と「BtoBプラットフォーム受発注」をシームレスに直結。<br />
              受発注の手作業入力ゼロ化・発注ミス撲滅・夜間実発注データ即時還元を実現するハイブリッド連携基盤。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={() => setActiveTab(activeTab === 'all' ? 'architecture' : 'all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 border-2 ${
                activeTab === 'all'
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>📑</span>
              <span>{activeTab === 'all' ? '1スライドずつ表示に戻す' : '全スライド一覧 (印刷プレビュー)'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-black text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 border-2 border-indigo-800"
            >
              <span>🖨️</span>
              <span>PDF保存 / 印刷 (横向き・各1ページ完結)</span>
            </button>
          </div>
        </div>

        {/* スライドナビゲーションタブ */}
        <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-indigo-100">
          {slides.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 border-2 ${
                activeTab === tab.id
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. システム全体構成図 (Slide 1) */}
      {/* ============================================================ */}
      {(activeTab === 'architecture' || activeTab === 'all') && (
        <div className="print-slide-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* スライドヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-indigo-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">🏛️</span>
                <div>
                  <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">SLIDE 01 / ARCHITECTURE</div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">システム全体アーキテクチャ概要</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Slide 1 / 6 (横向き A4)
              </span>
            </div>

            {/* 3ブロック構成図 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Box 1: デリサポーター */}
              <div className="bg-white border-2 border-blue-300 rounded-xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                    CLOUD APPLICATION
                  </span>
                  <span className="text-xl">☁️</span>
                </div>
                <h3 className="text-base font-black text-slate-950">デリサポーター (Deli・supporter)</h3>
                <p className="text-xs font-semibold text-slate-700 leading-snug">
                  製造計画・原材料の自動計算、理論在庫シミュレーション、発注推奨数の自動算出、実発注差異の可視化。
                </p>
                <div className="pt-1 text-[11px] font-bold text-slate-600 space-y-0.5 border-t border-slate-200">
                  <div>• Google Cloud / Firebase Hosted App</div>
                  <div>• Cloud Functions (Node.js API)</div>
                </div>
              </div>

              {/* Box 2: RPAコントローラー */}
              <div className="bg-white border-2 border-indigo-500 rounded-xl p-3 space-y-1.5 shadow-md ring-2 ring-indigo-200">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
                    ON-PREMISES RPA HUB
                  </span>
                  <span className="text-xl">🤖</span>
                </div>
                <h3 className="text-base font-black text-slate-950">RPA Controller (本システム)</h3>
                <p className="text-xs font-semibold text-slate-700 leading-snug">
                  双方向中継ハブ。Webhook受信による即時自動入力、夜間21:00定時CSV自動回収、3重自動補正、LINE通知。
                </p>
                <div className="pt-1 text-[11px] font-bold text-slate-600 space-y-0.5 border-t border-slate-200">
                  <div>• Next.js App Router (localhost:3000)</div>
                  <div>• Playwright ヘッドレスブラウザ / SQLite</div>
                </div>
              </div>

              {/* Box 3: インフォマート */}
              <div className="bg-white border-2 border-emerald-400 rounded-xl p-3 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                    EXTERNAL PLATFORM
                  </span>
                  <span className="text-xl">🏢</span>
                </div>
                <h3 className="text-base font-black text-slate-950">BtoBプラットフォーム 受発注</h3>
                <p className="text-xs font-semibold text-slate-700 leading-snug">
                  食品卸・資材メーカー（高瀬物産、久世、日本食研、スミダパッケージ等）への公式受発注確定EDI。
                </p>
                <div className="pt-1 text-[11px] font-bold text-slate-600 space-y-0.5 border-t border-slate-200">
                  <div>• 株式会社インフォマート ASP</div>
                  <div>• 店舗別認証 / 週間発注CSV (Shift_JIS)</div>
                </div>
              </div>
            </div>

            {/* 双方向矢印の説明 */}
            <div className="bg-slate-50 p-2.5 rounded-xl border-2 border-slate-200 flex flex-col sm:flex-row justify-around gap-2 text-xs font-bold">
              <div className="flex items-center gap-2 text-blue-900">
                <span className="text-base font-black">➔</span>
                <div>
                  <span className="font-black text-blue-950">往路（発注入力）：</span>
                  <span className="text-slate-800">デリサポ (Webhook) ➔ RPA ➔ インフォマート（即時自動入力）</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-purple-900">
                <span className="text-base font-black">➔</span>
                <div>
                  <span className="font-black text-purple-950">復路（実績同期）：</span>
                  <span className="text-slate-800">インフォマート ➔ RPA (定時CSV取得) ➔ デリサポ (API送信・毎日21:00)</span>
                </div>
              </div>
            </div>

            {/* 構成要素一覧テーブル */}
            <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="p-2 font-black text-slate-950">構成要素</th>
                    <th className="p-2 font-black text-slate-950">採用技術・基盤</th>
                    <th className="p-2 font-black text-slate-950">主な役割・ミッション</th>
                    <th className="p-2 font-black text-slate-950">耐障害・保全設計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-white">
                    <td className="p-1.5 font-black text-slate-900">発注基幹 (Deli・supporter)</td>
                    <td className="p-1.5 font-semibold text-slate-700">Firebase / Cloud Functions</td>
                    <td className="p-1.5 font-bold text-slate-800">製造数ベースの発注数計算、実発注差異シミュレーション</td>
                    <td className="p-1.5 font-semibold text-slate-700">常時冗長化、メイン/バックアップ二重エンドポイント</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1.5 font-black text-slate-900">RPAコントローラー</td>
                    <td className="p-1.5 font-semibold text-slate-700">Node.js / Next.js / TypeScript</td>
                    <td className="p-1.5 font-bold text-slate-800">UI操作管理、発注キュー管理、定時同期、手動緊急実行</td>
                    <td className="p-1.5 font-semibold text-slate-700">SQLiteトランザクション、排他ロック制御</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-1.5 font-black text-slate-900">ブラウザ自動化エンジン</td>
                    <td className="p-1.5 font-semibold text-slate-700">Playwright (Chromium Headless)</td>
                    <td className="p-1.5 font-bold text-slate-800">インフォマート自動ログイン、ページング、数量入力、保存</td>
                    <td className="p-1.5 font-semibold text-slate-700">ピンポイント検索補正、表記ゆれ自動正規化</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-1.5 font-black text-slate-900">アラート・通知基盤</td>
                    <td className="p-1.5 font-semibold text-slate-700">LINE Messaging API</td>
                    <td className="p-1.5 font-bold text-slate-800">締切切れ・欠品・入力エラー時の即時プッシュ通知</td>
                    <td className="p-1.5 font-semibold text-slate-700">エラー時のみサイレント発報（迅速エスカレーション）</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* スライドフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>次世代店舗受発注DXシステム システム仕様書</span>
            <span>SLIDE 01: システム全体構成図</span>
            <span>Slide 1 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. 双方向データ連携仕様 (Slide 2) */}
      {/* ============================================================ */}
      {(activeTab === 'bidirectional' || activeTab === 'all') && (
        <div className="print-slide-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* スライドヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-blue-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">⇄</span>
                <div>
                  <div className="text-[11px] font-black text-blue-700 uppercase tracking-wider">SLIDE 02 / DATA PIPELINE</div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">双方向データ連携仕様（往路・復路の詳細）</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Slide 2 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              「予定発注の自動投入（往路）」と「確定実発注の自動還元（復路）」が織りなす完全循環サイクル
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 往路カード */}
              <div className="border-2 border-blue-300 bg-blue-50/40 rounded-xl p-3.5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-blue-950 font-black text-base border-b-2 border-blue-200 pb-1.5">
                  <span className="px-2 py-0.5 rounded bg-blue-700 text-white text-xs font-black">往路</span>
                  <span>発注計画の自動投入 (デリサポ ➔ インフォマート)</span>
                </div>

                <div className="space-y-1.5">
                  <div className="p-2 bg-white rounded-lg border border-blue-200">
                    <span className="font-black text-blue-950 text-xs block">1. 発注データ即時受信 (Webhook)</span>
                    <span className="text-xs font-semibold text-slate-700">
                      デリサポ確定データをJSON形式で即時受信（店舗・品名・数量・納品日）。
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-200">
                    <span className="font-black text-blue-950 text-xs block">2. 自動起動 & 店舗別セッション認証</span>
                    <span className="text-xs font-semibold text-slate-700">
                      他店誤入力を防止する「店舗名DOMバリデーション」を経て安全にログイン。
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-200">
                    <span className="font-black text-blue-950 text-xs block">3. 3重自動補正による数量入力</span>
                    <span className="text-xs font-semibold text-slate-700">
                      表記正規化・内部高速ページング走査・ピンポイント検索補正で100%入力。
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-200">
                    <span className="font-black text-blue-950 text-xs block">4. 確定コミット & LINE通知</span>
                    <span className="text-xs font-semibold text-slate-700">
                      インフォマートで保存確定。万一の締め切り切れ等はLINEへ即時エラー通知。
                    </span>
                  </div>
                </div>
              </div>

              {/* 復路カード */}
              <div className="border-2 border-purple-300 bg-purple-50/40 rounded-xl p-3.5 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-purple-950 font-black text-base border-b-2 border-purple-200 pb-1.5">
                  <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-xs font-black">復路</span>
                  <span>実発注データの自動還元 (インフォマート ➔ デリサポ)</span>
                </div>

                <div className="space-y-1.5">
                  <div className="p-2 bg-white rounded-lg border border-purple-200">
                    <span className="font-black text-purple-950 text-xs block">1. 毎日 21:00 定時自動起動</span>
                    <span className="text-xs font-semibold text-slate-700">
                      Windowsタスクスケジューラ連動。全店舗（本厚木・港南台・横須賀）を自動巡回。
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-purple-200">
                    <span className="font-black text-purple-950 text-xs block">2. 週間発注CSVの自動ダウンロード</span>
                    <span className="text-xs font-semibold text-slate-700">
                      店舗スタッフの夕方手修正・独自追加分も含めた実確定データ（Shift_JIS CSV）を取得。
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-purple-200">
                    <span className="font-black text-purple-950 text-xs block">3. 未加工データ送信 (Pass-Through)</span>
                    <span className="text-xs font-semibold text-slate-700">
                      生データを一切加工せずそのままAPI送信し、計算ズレや文字化けを完全排除。
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-purple-200">
                    <span className="font-black text-purple-950 text-xs block">4. デリサポ在庫シミュレーション連動</span>
                    <span className="text-xs font-semibold text-slate-700">
                      デリサポ側で即時パースされ、店舗の最終実発注数と在庫差異が同期完了。
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900">
              💡 <strong>双方向連携の真価：</strong>
              一方通行のRPAでは「店舗スタッフが夕方にインフォマートで行った手修正」がクラウド側に反映されず、翌朝の在庫予測が狂います。
              本システムの夜間21:00自動CSV還元により、現場の柔軟性と本部の正確なデータ統制を両立しています。
            </div>
          </div>

          {/* スライドフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>次世代店舗受発注DXシステム システム仕様書</span>
            <span>SLIDE 02: 双方向データ連携仕様</span>
            <span>Slide 2 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. 24時間業務スケジュール (Slide 3) */}
      {/* ============================================================ */}
      {(activeTab === 'timeline' || activeTab === 'all') && (
        <div className="print-slide-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* スライドヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-amber-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">⏱️</span>
                <div>
                  <div className="text-[11px] font-black text-amber-700 uppercase tracking-wider">SLIDE 03 / DAILY TIMELINE</div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">24時間 業務タイムスケジュール</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Slide 3 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              現場スタッフの負担を最小化し、業務の流れを阻害しない最適な自動化タイムライン
            </p>

            {/* 横向きに最適化した5ステップ横並びフロー */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1">
              {[
                {
                  step: 'STEP 1',
                  time: '10:00 〜 16:30',
                  badge: '随時即時',
                  badgeColor: 'bg-blue-600 text-white',
                  title: '発注確定と自動入力',
                  flow: 'デリサポ ➔ インフォマート',
                  desc: 'デリサポで発注確定ボタン押下と同時にRPAがバックグラウンドでインフォマートへ入力。'
                },
                {
                  step: 'STEP 2',
                  time: '16:30 〜 18:00',
                  badge: '店舗運用',
                  badgeColor: 'bg-amber-600 text-white',
                  title: '締切前の最終チェック',
                  flow: '店舗独自微調整（任意）',
                  desc: '天候や突発的な予約変更に応じ、店長やスタッフがインフォマート上で数量微調整可能。'
                },
                {
                  step: 'STEP 3',
                  time: '18:00 〜 20:30',
                  badge: '仕入先締切',
                  badgeColor: 'bg-slate-700 text-white',
                  title: '受注締め切り時刻通過',
                  flow: '各食品卸の受注確定',
                  desc: '仕入先（高瀬物産、久世、日本食研等）の当日受注が確定し、発注が確定状態へ切り替わる。'
                },
                {
                  step: 'STEP 4',
                  time: '21:00 (JST)',
                  badge: '定時自動実行',
                  badgeColor: 'bg-purple-700 text-white',
                  title: '実発注CSVの全自動回収',
                  flow: 'インフォマート ➔ デリサポ',
                  desc: '全店舗の週間発注CSVをダウンロードしてデリサポへ一括送信。手入力分も全吸い上げ。'
                },
                {
                  step: 'STEP 5',
                  time: '21:05 〜 翌朝',
                  badge: '自動更新',
                  badgeColor: 'bg-teal-700 text-white',
                  title: '在庫差異の自動再計算',
                  flow: 'デリサポ側シミュレーション',
                  desc: '実発注データが即反映され、翌朝の出勤時には最新の在庫差異・原価情報が確認可能。'
                }
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border-2 border-slate-200 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500">{item.step}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-950">{item.time}</div>
                    <div className="text-xs font-black text-slate-900 leading-tight">{item.title}</div>
                    <div className="text-[11px] font-bold text-indigo-700">{item.flow}</div>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 leading-snug pt-1 border-t border-slate-200">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-xs font-bold text-emerald-950">
              ✅ <strong>夜間運用の安心設計：</strong>
              店舗PCが万一スリープや電源オフになっていた場合でも、翌朝PCを開いて起動した直後にタスクスケジューラが昨晩の21:00タスクを検知して自動追いつき実行します。
            </div>
          </div>

          {/* スライドフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>次世代店舗受発注DXシステム システム仕様書</span>
            <span>SLIDE 03: 24時間業務スケジュール</span>
            <span>Slide 3 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. 導入効果 & ROI (Slide 4) */}
      {/* ============================================================ */}
      {(activeTab === 'roi' || activeTab === 'all') && (
        <div className="print-slide-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* スライドヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">📈</span>
                <div>
                  <div className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">SLIDE 04 / BUSINESS ROI</div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">導入効果 & 定量ROI（業務改善実績）</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Slide 4 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              店舗現場の工数削減にとどまらず、発注精度向上による廃棄ロス削減と経営数値の可視化に貢献
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-300 text-center space-y-1 shadow-sm">
                <span className="text-xs font-black text-blue-900">月間作業削減時間</span>
                <div className="text-3xl sm:text-4xl font-black text-blue-950">約 60 <span className="text-sm font-bold">時間/月</span></div>
                <p className="text-xs font-bold text-slate-700 pt-0.5">3店舗合計。手入力・照合作業を完全自動化し、現場スタッフが調理・接客に集中。</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-1 shadow-sm">
                <span className="text-xs font-black text-emerald-900">発注入力ミス・ズレ</span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-950">0 <span className="text-sm font-bold">件（ゼロ化）</span></div>
                <p className="text-xs font-bold text-slate-700 pt-0.5">ロット違い・類似品取り違え・納品日誤入力をシステムチェックで完全防止。</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-300 text-center space-y-1 shadow-sm">
                <span className="text-xs font-black text-purple-900">実発注同期の鮮度</span>
                <div className="text-3xl sm:text-4xl font-black text-purple-950">毎日 21:00 <span className="text-sm font-bold">連動</span></div>
                <p className="text-xs font-bold text-slate-700 pt-0.5">翌朝を待たずに当夜のうちに実発注数がクラウド集約され、在庫差異シミュレーションが即完成。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-1">
                <div className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                  <span>👥</span>
                  <span>属人化の解消</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                  インフォマートの煩雑な画面操作を覚える必要がなくなり、新任店長やスタッフでも初日から正確に発注業務を遂行可能。
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-1">
                <div className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>本部ガバナンス向上</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                  どの店舗がいつ何を何個発注したかの履歴がSQLiteおよびクラウド側へ1件残らずログ記録され、監査や発注傾向分析に活用可能。
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-1">
                <div className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                  <span>🔄</span>
                  <span>柔軟な手修正の許容</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                  完全自動化でありながら現場の突発的調整を否定せず、夜間のCSV吸い上げによって実態に即時追従するハイブリッド運用。
                </p>
              </div>
            </div>
          </div>

          {/* スライドフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>次世代店舗受発注DXシステム システム仕様書</span>
            <span>SLIDE 04: 導入効果 & ROI</span>
            <span>Slide 4 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. 堅牢性・耐障害性・セキュリティ (Slide 5) */}
      {/* ============================================================ */}
      {(activeTab === 'security' || activeTab === 'all') && (
        <div className="print-slide-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* スライドヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-indigo-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">🛡️</span>
                <div>
                  <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">SLIDE 05 / RELIABILITY & SECURITY</div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">エンタープライズ堅牢性 & セキュリティ設計</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Slide 5 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              店舗端末の電源断やネットワーク瞬断にも耐えうる、実務運用に耐えるフォールトトレラント設計
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-1.5">
                <div className="font-black text-slate-950 text-sm flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <span>誤発注防止ガード (店舗名DOM照合)</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  ログイン後、インフォマート画面上のDOMに対象店舗名（例: 本厚木店）が確実に存在するかを自動検証。
                  万一セッションの混同や店舗切替失敗を検知した場合は、即座に入力を緊急停止し、他店舗への誤発注を100%防止します。
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-1.5">
                <div className="font-black text-slate-950 text-sm flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <span>PCスリープ & 瞬断リカバリー (Auto-Catchup)</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  Windows Task Schedulerに「PC起動時の遅延実行（StartWhenAvailable）」を登録。
                  夜間21:00にPCがスリープしていた場合でも、翌朝PCを開いた瞬間に自動リカバリー実行。
                  API送信には3秒間隔・最大3回の自動リトライを実装しています。
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-1.5">
                <div className="font-black text-slate-950 text-sm flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span>ピンポイント検索による自動補正 (Auto-Heal)</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  仕入先の表記変更（例: Ｎｏ．１ ➔ No.1、2kg ➔ ２㎏）や、カタログの深いページに商品が存在する場合でも、
                  通常巡回で見つからなければキーワード検索エンジンが自動で発動し、該当商品だけを一発特定して数量入力・保存します。
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border-2 border-slate-200 space-y-1.5">
                <div className="font-black text-slate-950 text-sm flex items-center gap-2">
                  <span className="text-lg">🔐</span>
                  <span>クレデンシャル管理 & ゼロトラスト通信</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  インフォマートのログインパスワードは端末内の環境変数（.env.local）にのみ保持され、外部ネットワークへは一切送信されません。
                  デリサポーターとの通信はHTTPS暗号化および専用APIキー（x-api-key）による認証で保護されています。
                </p>
              </div>
            </div>
          </div>

          {/* スライドフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>次世代店舗受発注DXシステム システム仕様書</span>
            <span>SLIDE 05: 堅牢性・セキュリティ設計</span>
            <span>Slide 5 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. API接続 & プロトコル仕様 (Slide 6) */}
      {/* ============================================================ */}
      {(activeTab === 'api' || activeTab === 'all') && (
        <div className="print-slide-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* スライドヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-slate-800 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">🔌</span>
                <div>
                  <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">SLIDE 06 / API PROTOCOLS</div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">API接続 & プロトコル仕様書</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Slide 6 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              社外システム・別アプリケーションとの連携インターフェース仕様（横向き2カラム最適化フォーマット）
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* API 1: デリサポAPI */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-1.5">
                <div className="text-indigo-950 font-black text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-700 text-white text-[11px] font-black">POST</span>
                  <span>デリサポーター実確定データ同期API</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 break-all">
                  URL: <span className="font-mono text-indigo-900">https://firebase-portfolio-maestro--fir-01278470-c0ea3.us-central1.hosted.app/api/sync/infomart</span>
                </div>
                <div className="text-[11px] font-bold text-slate-600 break-all">
                  Backup: <span className="font-mono text-slate-800">https://asia-northeast1-fir-01278470-c0ea3.cloudfunctions.net/syncInfomartActuals</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  Headers: <span className="font-mono text-slate-950">Content-Type: application/json, x-api-key: delicount-sync-secret-2026</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-300 font-mono text-[11px] text-slate-900 font-bold overflow-x-auto">
{`{
  "storeId": "hon-atsugi", // hon-atsugi / konandai / yokosuka
  "csvText": "<Shift_JIS (CP932) 週間発注CSVの全テキスト>"
}`}
                </div>
              </div>

              {/* API 2: Webhook */}
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-1.5">
                <div className="text-blue-950 font-black text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-700 text-white text-[11px] font-black">POST</span>
                  <span>RPA発注受信Webhook (本システム側)</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  URL: <span className="font-mono text-blue-900">http://localhost:3000/api/webhook/orders</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800">
                  Headers: <span className="font-mono text-slate-950">Content-Type: application/json</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-300 font-mono text-[11px] text-slate-900 font-bold overflow-x-auto">
{`{
  "storeId": "hon-atsugi",
  "orders": [
    {
      "store_name": "本厚木",
      "supplier_name": "日本食研株式会社【新】",
      "product_name": "食研天ぷら粉 １ｋｇ ■ケース■",
      "quantity": 2,
      "delivery_date": "2026-10-28"
    }
  ]
}`}
                </div>
              </div>
            </div>
          </div>

          {/* スライドフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>次世代店舗受発注DXシステム システム仕様書</span>
            <span>SLIDE 06: API接続 & プロトコル仕様</span>
            <span>Slide 6 / 6</span>
          </div>
        </div>
      )}
    </div>
  );
}
