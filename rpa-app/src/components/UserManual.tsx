'use client';

import React, { useState } from 'react';

export default function UserManual() {
  const [activeSection, setActiveSection] = useState<'overview' | 'daily-flow' | 'buttons' | 'auto-modes' | 'recovery' | 'faq' | 'all'>('overview');

  const sections = [
    { id: 'overview', title: '1. システム概要と基本設計', icon: '📌', pageNum: 1 },
    { id: 'daily-flow', title: '2. 日常の運用フロー（現場・店長）', icon: '🔄', pageNum: 2 },
    { id: 'buttons', title: '3. 画面ボタン・機能解説', icon: '🎛️', pageNum: 3 },
    { id: 'auto-modes', title: '4. 自動発注・同期の動作仕様', icon: '⚙️', pageNum: 4 },
    { id: 'recovery', title: '5. トラブルシューティング・自動補正', icon: '🛠️', pageNum: 5 },
    { id: 'faq', title: '6. よくある質問 (FAQ)', icon: '❓', pageNum: 6 },
  ];

  return (
    <div className="space-y-6 text-slate-900">
      {/* 印刷用スタイル注入：A4横向き(Landscape) 1セクション1ページ完全収束 */}
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
          .print-manual-landscape {
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
          .print-manual-landscape:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
        }
      `}</style>

      {/* 画面用コントロールバー */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border-2 border-slate-200 print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-black">
              <span>📖 現場・店長用 取扱説明書 (横向きA4対応)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-1">
              BtoBプラットフォーム受発注自動化 取扱説明書
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
              日常の運用手順、画面操作、トラブル対応をわかりやすく解説しています。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSection(activeSection === 'all' ? 'overview' : 'all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-2 border-2 ${
                activeSection === 'all'
                  ? 'bg-blue-700 text-white border-blue-700 shadow'
                  : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>📑</span>
              <span>{activeSection === 'all' ? '1ページずつ表示に戻す' : '全ページ一覧 (印刷プレビュー)'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-black rounded-xl shadow-md transition flex items-center gap-2 border-2 border-blue-800"
            >
              <span>🖨️</span>
              <span>PDF保存 / 印刷 (横向き・各1ページ完結)</span>
            </button>
          </div>
        </div>

        {/* タブ切り替えボタン */}
        <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-slate-100">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 border-2 ${
                activeSection === s.id
                  ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. システム概要と基本設計 (Page 1) */}
      {/* ============================================================ */}
      {(activeSection === 'overview' || activeSection === 'all') && (
        <div className="print-manual-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* ページヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-blue-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">📌</span>
                <div>
                  <div className="text-[11px] font-black text-blue-700 uppercase tracking-wider">SECTION 1</div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950">1. システム概要と基本設計</h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Page 1 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
              本システムは、自社開発の惣菜製造管理アプリ<strong>「デリサポーター（Deli・supporter）」</strong>と、
              受発注基盤<strong>「BtoBプラットフォーム 受発注（インフォマート）」</strong>を自動で結ぶRPAコントローラーです。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 往路カード */}
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-xl space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-blue-950 font-black text-base border-b border-blue-200 pb-1">
                  <span className="text-xl">🤖</span>
                  <span>【往路】発注入力の完全自動化 (デリサポ ➔ インフォマート)</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  デリサポで発注確定ボタンを押すと即座にRPAへデータが送信され、インフォマートに自動ログインして1品ずつ照合・確定保存します。
                  <strong>人間がインフォマートを開いて手入力する必要はありません。</strong>
                </p>
                <div className="bg-white p-2 rounded-lg border border-blue-200 text-xs font-bold text-blue-900">
                  💡 効果：毎日の手入力時間（約30分/日）をゼロ化し、ロット誤りや品目取り違えを防止します。
                </div>
              </div>

              {/* 復路カード */}
              <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-xl space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-purple-950 font-black text-base border-b border-purple-200 pb-1">
                  <span className="text-xl">📊</span>
                  <span>【復路】実確定データの自動還元 (インフォマート ➔ デリサポ)</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  夜21:00に自動起動し、週間発注CSVをダウンロードしてデリサポAPIへ送信します。
                  <strong>店舗スタッフが夕方に手動追加・修正した発注数も含め、すべてクラウドへ還元されます。</strong>
                </p>
                <div className="bg-white p-2 rounded-lg border border-purple-200 text-xs font-bold text-purple-900">
                  💡 効果：翌朝の出勤時に、デリサポーター上で実発注数と在庫差異シミュレーションが即座に連動します。
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-950 font-black text-xs sm:text-sm">
                <span>🛡️</span>
                <span>現場スタッフへの最重要ルール</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                日常業務で本コントローラー画面を直接操作する必要は原則ありません。
                発注はすべてデリサポーターで行い、インフォマートで急遽数量変更した場合も夜21:00に自動集約されます。
              </p>
            </div>
          </div>

          {/* ページフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>BtoBプラットフォーム受発注自動化システム 操作説明書</span>
            <span>SECTION 1: システム概要と基本設計</span>
            <span>Page 1 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. 日常の運用フロー (Page 2) */}
      {/* ============================================================ */}
      {(activeSection === 'daily-flow' || activeSection === 'all') && (
        <div className="print-manual-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* ページヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-indigo-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">🔄</span>
                <div>
                  <div className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">SECTION 2</div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950">2. 日常の運用フロー（現場スタッフ・店長）</h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Page 2 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              店舗スタッフの1日の業務の流れです。基本は自動化されているため、特別な操作は不要です。
            </p>

            {/* 横向きに最適化した5ステップ横並びフロー */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1">
              {[
                {
                  step: '1',
                  time: '朝〜夕方 (〜16:30)',
                  tag: 'デリサポ操作',
                  tagColor: 'bg-blue-600 text-white',
                  title: '発注数量を確認・確定',
                  desc: '製造計画に合わせて必要発注数を計算し、デリサポ画面で「発注確定」を押します。データはRPAへ即時送信されます。'
                },
                {
                  step: '2',
                  time: 'データ受信直後 (即時)',
                  tag: 'RPA完全自動',
                  tagColor: 'bg-emerald-600 text-white',
                  title: '自動入力・保存確定',
                  desc: 'RPAが自動でインフォマートにログインし、対象店舗・納品日・仕入先を照合して発注数を入力・保存します。'
                },
                {
                  step: '3',
                  time: '夕方 (16:30〜18:00)',
                  tag: '任意・店舗自由',
                  tagColor: 'bg-amber-600 text-white',
                  title: '数量微調整・追加',
                  desc: '急な予約や天候変更により、店長がインフォマート画面上で数量を変更・追加しても夜21:00に漏れなく自動回収されます。'
                },
                {
                  step: '4',
                  time: '夜間 (21:00 定時)',
                  tag: '夜間自動同期',
                  tagColor: 'bg-purple-600 text-white',
                  title: '実確定CSVの自動回収',
                  desc: '全店舗の週間発注CSVを全自動ダウンロードし、デリサポーターへ送信します。PCは電源接続で開いておいてください。'
                },
                {
                  step: '5',
                  time: '翌朝 (出勤時)',
                  tag: 'デリサポ確認',
                  tagColor: 'bg-teal-700 text-white',
                  title: '確定数と在庫差異確認',
                  desc: '夜間に同期された最新の実発注データが反映され、正確な理論在庫と製造計画のズレが確認できます。'
                }
              ].map(item => (
                <div key={item.step} className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-black">
                        {item.step}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${item.tagColor}`}>
                        {item.tag}
                      </span>
                    </div>
                    <div className="text-[11px] font-black text-slate-950">{item.time}</div>
                    <div className="text-xs font-black text-slate-900 leading-tight">{item.title}</div>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 leading-snug pt-1 border-t border-slate-200">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-xs font-bold text-blue-950">
              💡 <strong>エラー時のLINE通知：</strong>
              万一、仕入先の受注締め切り時間を過ぎていたり休業日で発注保存ができなかった場合は、担当者の公式LINEへ店舗名・品名・エラー理由が即時プッシュ通知されます。
            </div>
          </div>

          {/* ページフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>BtoBプラットフォーム受発注自動化システム 操作説明書</span>
            <span>SECTION 2: 日常の運用フロー</span>
            <span>Page 2 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. 画面ボタン・機能解説 (Page 3) */}
      {/* ============================================================ */}
      {(activeSection === 'buttons' || activeSection === 'all') && (
        <div className="print-manual-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* ページヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">🎛️</span>
                <div>
                  <div className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">SECTION 3</div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950">3. コントローラー画面のボタン・機能解説</h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Page 3 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              画面に配置されている各種スイッチおよび操作ボタンの機能と使い分けです（2カラム横並び配置）。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 左カラム */}
              <div className="space-y-2.5">
                <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-600 inline-block"></span>
                      <span className="text-xs sm:text-sm font-black text-emerald-950">スイッチ：「受信時の自動発注」（通常：ON）</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">常時ON推奨</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    <strong>ON：</strong>デリサポからデータ受信した瞬間に即座にRPA自動入力を開始します。<br />
                    <strong>OFF：</strong>データを受信してもキューに保留し、手動ボタン押し待ちにします。
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-700 text-white text-[10px] font-black">青ボタン</span>
                      <span className="text-xs sm:text-sm font-black text-blue-950">手動発注実行 (未処理の発注を実行)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-black">手動再実行用</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    「未処理」ステータスの発注データを今すぐ一括入力します。自動発注がOFFのときやエラー再実行時に使用します。
                  </p>
                </div>

                <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-700 text-white text-[10px] font-black">赤ボタン</span>
                      <span className="text-xs sm:text-sm font-black text-red-950">🛑 RPA停止 (緊急強制停止)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 text-[10px] font-black">緊急用</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    RPA実行中のみ表示されます。緊急で発注を中断したい場合に押すと、即座にブラウザを強制切断して停止します。
                  </p>
                </div>
              </div>

              {/* 右カラム */}
              <div className="space-y-2.5">
                <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[10px] font-black">紫ボタン</span>
                      <span className="text-xs sm:text-sm font-black text-purple-950">📤 今すぐ全店舗CSV取得＆デリサポ送信</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-black">即時同期</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    21:00の定時を待たずに今すぐ最新実発注データを吸い上げてデリサポへ送信します。昼間の手修正を即時反映したいときに便利です。
                  </p>
                </div>

                <div className="p-3 bg-slate-100 border-2 border-slate-300 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-black">灰色ボタン</span>
                      <span className="text-xs sm:text-sm font-black text-slate-950">店舗別送信（本厚木 / 港南台 / 横須賀）</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-black">個別同期</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    特定の店舗のみをピンポイントでデリサポへ再同期したい場合に使用します。
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📋</span>
                      <span className="text-xs sm:text-sm font-black text-slate-950">同期履歴ログの確認</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">最新20件表示</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    「同期履歴ログを表示」をクリックすると、送信日時・店舗名・保存件数・エラー詳細がいつでも閲覧できます。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ページフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>BtoBプラットフォーム受発注自動化システム 操作説明書</span>
            <span>SECTION 3: 画面ボタン・機能解説</span>
            <span>Page 3 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. 自動発注・同期の動作仕様 (Page 4) */}
      {/* ============================================================ */}
      {(activeSection === 'auto-modes' || activeSection === 'all') && (
        <div className="print-manual-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* ページヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-amber-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">⚙️</span>
                <div>
                  <div className="text-[11px] font-black text-amber-700 uppercase tracking-wider">SECTION 4</div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950">4. 自動発注とデリサポ同期の動作仕様</h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Page 4 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              各機能が実行されるスケジュール、対象店舗、完了時および異常発生時の安全対策です。
            </p>

            <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="p-2 font-black text-slate-950">機能区分</th>
                    <th className="p-2 font-black text-slate-950">スケジュール・トリガー</th>
                    <th className="p-2 font-black text-slate-950">対象店舗</th>
                    <th className="p-2 font-black text-slate-950">正常完了時の動作</th>
                    <th className="p-2 font-black text-slate-950">異常時の安全機構</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200">
                  <tr className="bg-white">
                    <td className="p-2 font-black text-blue-900">
                      インフォマート<br />自動入力 (往路)
                    </td>
                    <td className="p-2 font-semibold text-slate-900">
                      デリサポから発注受信時<br />（即時自動トリガー）
                    </td>
                    <td className="p-2 font-bold text-slate-900">
                      データ記載店舗<br />（本厚木/港南台/横須賀）
                    </td>
                    <td className="p-2 font-semibold text-emerald-900">
                      DBステータス「完了」更新、画面保存確定
                    </td>
                    <td className="p-2 font-black text-red-700">
                      公式LINEへエラー即時通知<br />（商品名・理由・店舗名明記）
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2 font-black text-purple-900">
                      実発注データ<br />デリサポ同期 (復路)
                    </td>
                    <td className="p-2 font-semibold text-slate-900">
                      <strong>毎日 21:00 定時</strong><br />（Windowsタスク連動）
                    </td>
                    <td className="p-2 font-bold text-slate-900">
                      全店舗<br />（本厚木・港南台・横須賀）
                    </td>
                    <td className="p-2 font-semibold text-emerald-900">
                      Shift_JIS CSV送信完了、件数ログ記録
                    </td>
                    <td className="p-2 font-black text-amber-800">
                      3秒間隔で最大3回自動リトライ<br />PC起動時に追いつき実行
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-1">
                <div className="text-xs sm:text-sm font-black text-slate-950">
                  🔒 二重発注防止機構（排他制御）
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  同一店舗への同時発注要求が発生してもRPAが排他ロックをかけ多重起動を防止します。またインフォマート画面上の同一納品日の品目は上書き保存されるため、発注数が重複することはありません。
                </p>
              </div>

              <div className="p-3 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-1">
                <div className="text-xs sm:text-sm font-black text-slate-950">
                  ⚡ 高速ページネーション走査
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  カタログが複数ページにまたがる場合、画面の「次へ」リンクではなく内部ページング関数（Paging）を直接呼び出して高速走査するため、タイムアウトを起こさず安定完了します。
                </p>
              </div>
            </div>
          </div>

          {/* ページフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>BtoBプラットフォーム受発注自動化システム 操作説明書</span>
            <span>SECTION 4: 自動発注・同期の動作仕様</span>
            <span>Page 4 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. トラブルシューティング (Page 5) */}
      {/* ============================================================ */}
      {(activeSection === 'recovery' || activeSection === 'all') && (
        <div className="print-manual-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* ページヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-red-600 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">🛠️</span>
                <div>
                  <div className="text-[11px] font-black text-red-700 uppercase tracking-wider">SECTION 5</div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950">5. トラブルシューティングと自動補正機能</h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Page 5 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              画面エラーやPC電源オフなど、トラブル時の原因と復旧手順です（3カラム横並び配置）。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-950">
                  <span>⚠️</span>
                  <span>画面にあるのにエラーと出た場合</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  <strong>原因：</strong>規格や単位（例: Ｎｏ．１とNo.1、２㎏と2kgなど）の表記揺れが原因です。<br />
                  <strong>対策：</strong>本システムには「3重自動補正機能」が搭載されています。画面の「手動発注実行」を押すと、ピンポイント検索により自動修正入力が行われます。
                </p>
              </div>

              <div className="p-3.5 bg-blue-50 border-2 border-blue-300 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-blue-950">
                  <span>🔋</span>
                  <span>21:00にPC電源が切れていた場合</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  <strong>自動復旧：</strong>Windowsタスクスケジューラに「起動時に遅延実行する」設定が入っているため、翌朝PCを開いた瞬間に自動で昨晩のデータを取得・送信します。<br />
                  <strong>手動復旧：</strong>「📤 今すぐ全店舗CSV取得＆デリサポ送信」を押せば即座に同期されます。
                </p>
              </div>

              <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-red-950">
                  <span>📱</span>
                  <span>公式LINEへエラー通知が届いた場合</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                  <strong>内容の確認：</strong>LINE通知には「店舗名」「商品名」「エラー理由（締切時刻切れ、納品不可日など）」が記載されています。<br />
                  <strong>対応：</strong>仕入先の受注締め切り時刻を過ぎている場合はシステムから発注できないため、直接仕入先へ電話等で注文を依頼してください。
                </p>
              </div>
            </div>
          </div>

          {/* ページフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>BtoBプラットフォーム受発注自動化システム 操作説明書</span>
            <span>SECTION 5: トラブルシューティング</span>
            <span>Page 5 / 6</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. よくある質問 (FAQ) (Page 6) */}
      {/* ============================================================ */}
      {(activeSection === 'faq' || activeSection === 'all') && (
        <div className="print-manual-landscape bg-white p-5 sm:p-7 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3">
          <div className="space-y-3">
            {/* ページヘッダー */}
            <div className="flex items-center justify-between border-b-4 border-slate-800 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl">❓</span>
                <div>
                  <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">SECTION 6</div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950">6. よくある質問 (FAQ)</h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-900 border-2 border-slate-300 rounded-lg text-xs font-black">
                Page 6 / 6 (横向き A4)
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-800">
              現場スタッフからよく寄せられる質問と回答のまとめです（2x2グリッド配置）。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  q: 'Q. RPAの自動入力が動いている最中に、パソコンで別のエクセルやネットを見ても大丈夫ですか？',
                  a: 'はい、全く問題ありません。RPAはバックグラウンド（ヘッドレスモード）で動くため、画面のマウスやキーボードの操作を奪いません。通常通りパソコンで別の作業をしていただいて大丈夫です。'
                },
                {
                  q: 'Q. インフォマート側で直接発注数量を手修正した場合、デリサポの在庫はどうなりますか？',
                  a: '毎晩21:00にインフォマートの最新確定データをCSVで吸い上げてデリサポへ送るため、店舗スタッフが直接入力・修正した数量も100%デリサポの在庫シミュレーションに自動反映されます。'
                },
                {
                  q: 'Q. 同じ商品を二重に発注してしまう心配はありませんか？',
                  a: '二重発注は発生しません。データベースでのステータス管理、同一店舗の排他実行ロック、インフォマート画面上の同一納品日上書き保存機構の3重防御により、安全性が担保されています。'
                },
                {
                  q: 'Q. 新しい店舗が追加された場合はどうすればいいですか？',
                  a: '設定ファイル（.env.local）に新店舗のログインID・パスワードを追加するだけで、自動的に画面の一覧や21:00の定期同期対象に組み込まれます。'
                }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-1">
                  <div className="text-xs sm:text-sm font-black text-slate-950">{item.q}</div>
                  <div className="text-xs font-semibold text-slate-800 leading-relaxed pl-2.5 border-l-4 border-blue-600">
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ページフッター */}
          <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-xs font-black text-slate-500">
            <span>BtoBプラットフォーム受発注自動化システム 操作説明書</span>
            <span>SECTION 6: よくある質問 (FAQ)</span>
            <span>Page 6 / 6</span>
          </div>
        </div>
      )}
    </div>
  );
}
