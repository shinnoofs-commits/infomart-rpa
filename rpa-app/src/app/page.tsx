'use client';

import { useState, useEffect } from 'react';
import UserManual from '@/components/UserManual';
import SystemSpecsPresentation from '@/components/SystemSpecsPresentation';

type Order = {
  id: number;
  store_name?: string;
  supplier_name: string;
  product_name: string;
  quantity: number | string;
  delivery_date: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type DeliSyncLog = {
  id: number;
  store_id: string;
  store_name: string;
  status: string;
  saved_count: number;
  summary_json?: string;
  error_message?: string;
  created_at: string;
};

type DeliStore = {
  storeName: string;
  storeId: string;
};

export default function Home() {
  const [mainTab, setMainTab] = useState<'controller' | 'manual' | 'specs'>('controller');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpaStatus, setRpaStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [rpaMessage, setRpaMessage] = useState<string | null>(null);
  const [rpaResults, setRpaResults] = useState<string[]>([]);
  const [autoRpaEnabled, setAutoRpaEnabled] = useState(false);
  const [settingUpdating, setSettingUpdating] = useState(false);
  const [isBackendRunning, setIsBackendRunning] = useState(false);

  // デリサポーター連携用ステート
  const [deliSyncRunning, setDeliSyncRunning] = useState(false);
  const [deliAutoEnabled, setDeliAutoEnabled] = useState(true);
  const [deliScheduleTime, setDeliScheduleTime] = useState('21:00');
  const [deliStores, setDeliStores] = useState<DeliStore[]>([]);
  const [deliLogs, setDeliLogs] = useState<DeliSyncLog[]>([]);
  const [deliStatusMsg, setDeliStatusMsg] = useState<string | null>(null);
  const [deliStatusType, setDeliStatusType] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [deliLogsOpen, setDeliLogsOpen] = useState(false);
  const [deliSyncingTarget, setDeliSyncingTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchSettings();
    fetchDeliSync();

    // 定期ポーリング（バックグラウンド自動発注やデリサポからの受信状況、定時同期を自動反映）
    const interval = setInterval(() => {
      fetchSettings();
      fetchOrders(true);
      fetchDeliSync(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (silent = false) => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      if (!silent) console.error('Error fetching orders:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (typeof data.autoRpaEnabled === 'boolean') {
        setAutoRpaEnabled(data.autoRpaEnabled);
      }
      if (typeof data.isRpaRunning === 'boolean') {
        setIsBackendRunning(data.isRpaRunning);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  const fetchDeliSync = async (silent = false) => {
    try {
      const res = await fetch('/api/deli-sync');
      const data = await res.json();
      if (typeof data.isRunning === 'boolean') {
        setDeliSyncRunning(data.isRunning);
      }
      if (typeof data.autoSyncEnabled === 'boolean') {
        setDeliAutoEnabled(data.autoSyncEnabled);
      }
      if (data.scheduleTime) {
        setDeliScheduleTime(data.scheduleTime);
      }
      if (Array.isArray(data.stores)) {
        setDeliStores(data.stores);
      }
      if (Array.isArray(data.recentLogs)) {
        setDeliLogs(data.recentLogs);
      }
      if (data.currentStatus && data.currentStatus.status !== 'idle') {
        setDeliStatusType(data.currentStatus.status);
        setDeliStatusMsg(data.currentStatus.message);
      }
    } catch (e) {
      if (!silent) console.error('Error fetching deli sync status:', e);
    }
  };

  const toggleAutoRpa = async () => {
    setSettingUpdating(true);
    const nextVal = !autoRpaEnabled;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRpaEnabled: nextVal })
      });
      const data = await res.json();
      if (res.ok) {
        setAutoRpaEnabled(data.autoRpaEnabled);
      }
    } catch (e) {
      console.error('Error updating settings:', e);
    } finally {
      setSettingUpdating(false);
    }
  };

  const toggleDeliAutoSync = async () => {
    const nextVal = !deliAutoEnabled;
    try {
      await fetch('/api/deli-sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSyncEnabled: nextVal })
      });
      setDeliAutoEnabled(nextVal);
    } catch (e) {
      console.error('Error updating deli sync settings:', e);
    }
  };

  const executeDeliSync = async (targetStore?: string) => {
    if (deliSyncRunning || isBackendRunning) {
      alert('現在別の処理が実行中です。完了までお待ちください。');
      return;
    }

    setDeliSyncRunning(true);
    setDeliSyncingTarget(targetStore || 'ALL');
    setDeliStatusType('running');
    setDeliStatusMsg(
      targetStore 
        ? `店舗「${targetStore}」の週間発注CSVをインフォマートからダウンロードし、デリサポへ送信中...`
        : '全店舗の週間発注CSVをインフォマートからダウンロードし、デリサポへ送信中...'
    );

    try {
      const res = await fetch('/api/deli-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetStore ? { storeName: targetStore } : {})
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDeliStatusType('completed');
        setDeliStatusMsg(data.message || 'デリサポーターへのデータ送信が完了しました！');
      } else {
        setDeliStatusType('error');
        setDeliStatusMsg(data.message || data.error || '連携中にエラーが発生しました');
      }
    } catch (err: any) {
      setDeliStatusType('error');
      setDeliStatusMsg(err.message || '通信エラーが発生しました');
    } finally {
      setDeliSyncRunning(false);
      setDeliSyncingTarget(null);
      await fetchDeliSync();
    }
  };

  const addDummyData = async () => {
    setLoading(true);
    await fetch('/api/orders', { method: 'POST' });
    await fetchOrders();
  };

  const deleteAllData = async () => {
    if (!confirm('現在表示されているすべてのデータを削除します。よろしいですか？')) return;
    setLoading(true);
    await fetch('/api/orders', { method: 'DELETE' });
    await fetchOrders();
  };

  const resetToZeroAndPending = async () => {
    if (!confirm('すべての数量を0にして、ステータスを「未処理」に戻しますか？（RPAで発注を取り消す際に使います）')) return;
    setLoading(true);
    await fetch('/api/orders', { method: 'PATCH' });
    await fetchOrders();
  };

  const handleQuantityChange = (id: number, newQuantity: number | string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, quantity: newQuantity } : o));
  };

  const handleQuantityBlur = async (id: number, quantity: number) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const executeRPA = async () => {
    if (isBackendRunning) {
      alert('現在別のRPAプロセスが実行中です。完了までお待ちください。');
      return;
    }

    setRpaStatus('running');
    setRpaMessage('RPA処理を実行中です。ブラウザ操作を行っています...');
    setRpaResults([]);
    try {
      const res = await fetch('/api/rpa', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: orders.filter(o => o.status === '未処理') })
      });
      const data = await res.json();
      
      if (res.ok) {
        setRpaStatus('completed');
        setRpaMessage(data.message || '処理が完了しました。');
        if (data.results) setRpaResults(data.results);
      } else {
        setRpaStatus('error');
        setRpaMessage(data.error || data.message || 'エラーが発生しました。');
      }
    } catch (error: any) {
      setRpaStatus('error');
      setRpaMessage(error.message);
    }
    // 最新の状態を取得
    await fetchOrders();
    await fetchSettings();
  };

  const stopRPA = async () => {
    if (!confirm('実行中のRPA処理を強制停止しますか？')) return;
    try {
      setRpaMessage('RPA処理を停止しています...');
      const res = await fetch('/api/rpa/stop', { method: 'POST' });
      const data = await res.json();
      setRpaStatus('idle');
      setRpaMessage(data.message || 'RPAを停止しました。');
      await fetchOrders();
      await fetchSettings();
    } catch (e: any) {
      alert('停止リクエスト中にエラーが発生しました: ' + e.message);
    }
  };

  const isExecuting = rpaStatus === 'running' || isBackendRunning;

  if (loading && orders.length === 0) {
    return <div className="min-h-screen p-8 text-gray-700">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 最上部メインナビゲーションタブ */}
        <div className="bg-white p-2.5 rounded-2xl shadow-sm border-2 border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMainTab('controller')}
              className={`px-5 py-3 rounded-xl font-black text-sm sm:text-base transition flex items-center gap-2 border-2 ${
                mainTab === 'controller'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span className="text-lg">🖥️</span>
              <span>RPAコントローラー</span>
              {orders.filter(o => o.status === '未処理').length > 0 && (
                <span className="ml-1 px-2.5 py-0.5 text-xs rounded-full bg-amber-400 text-amber-950 font-black animate-pulse">
                  {orders.filter(o => o.status === '未処理').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setMainTab('manual')}
              className={`px-5 py-3 rounded-xl font-black text-sm sm:text-base transition flex items-center gap-2 border-2 ${
                mainTab === 'manual'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span className="text-lg">📖</span>
              <span>操作説明マニュアル</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-black ${mainTab === 'manual' ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-900'}`}>
                現場・店長用
              </span>
            </button>

            <button
              onClick={() => setMainTab('specs')}
              className={`px-5 py-3 rounded-xl font-black text-sm sm:text-base transition flex items-center gap-2 border-2 ${
                mainTab === 'specs'
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <span className="text-lg">🏢</span>
              <span>システム仕様書 (プレゼン資料)</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-black ${mainTab === 'specs' ? 'bg-indigo-900 text-white' : 'bg-indigo-100 text-indigo-900'}`}>
                社外・パートナー向け
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-700 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isExecuting ? 'bg-amber-500 animate-ping' : 'bg-emerald-600'}`}></span>
              <span className="font-black text-slate-900">{isExecuting ? 'RPA稼働中' : 'システム待機中'}</span>
            </span>
            <span>|</span>
            <span>定時同期: <strong className="text-slate-950 font-black">{deliScheduleTime}</strong></span>
          </div>
        </div>

        {/* タブに応じた表示切り替え */}
        {mainTab === 'manual' && <UserManual />}
        {mainTab === 'specs' && <SystemSpecsPresentation />}

        {mainTab === 'controller' && (
          <>
            {/* ヘッダーカード */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>🤖 BtoBプラットフォーム発注自動化 (RPA Controller)</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Deli・supporter実発注データ双方向連携 & インフォマート店舗別自動発注システム
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* 受信時自動発注トグルスイッチ */}
            <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-2 rounded-lg border border-gray-200 shadow-inner">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span>受信時の自動発注</span>
                  {isBackendRunning && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 animate-pulse">
                      ● 実行中
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-500">
                  {autoRpaEnabled ? 'データ受信時に即座にRPA自動開始' : 'データ受信後、手動ボタン押し待ち'}
                </span>
              </div>

              <button
                type="button"
                onClick={toggleAutoRpa}
                disabled={settingUpdating}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoRpaEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                } ${settingUpdating ? 'opacity-50' : ''}`}
                role="switch"
                aria-checked={autoRpaEnabled}
                title={`クリックして${autoRpaEnabled ? '無効' : '有効'}にする`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoRpaEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold w-7 ${autoRpaEnabled ? 'text-emerald-700' : 'text-gray-500'}`}>
                {autoRpaEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* 発注アクションボタン群 */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={deleteAllData}
                className="px-3 py-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition"
              >
                全削除
              </button>
              <button 
                onClick={resetToZeroAndPending}
                className="px-3 py-2 text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md hover:bg-yellow-100 transition"
              >
                全件0(未処理)に戻す
              </button>
              <button 
                onClick={addDummyData}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 transition"
              >
                ダミー追加
              </button>
              {isExecuting ? (
                <button 
                  onClick={stopRPA}
                  className="px-4 py-2 text-sm bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition shadow animate-pulse flex items-center gap-1.5"
                >
                  <span>🛑 RPA停止</span>
                </button>
              ) : (
                <button 
                  onClick={executeRPA}
                  className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition shadow"
                >
                  手動発注実行 (RPA開始)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ★ 新機能: デリサポーター実発注データ自動連携カード ★ */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-indigo-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h2 className="text-base font-bold text-gray-800">
                  インフォマート実発注データ自動連携 (デリサポーター宛て)
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-300">
                  週間発注CSV自動送信
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                インフォマートから実確定データ（Shift_JIS CSV）を自動取得し、デリサポーターの在庫シミュレーションへ即時連動します。
              </p>
            </div>

            {/* 毎日21:00自動スケジュール設定スイッチ */}
            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-lg border border-indigo-200 shadow-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span>⏰ 毎日 {deliScheduleTime} 自動実行</span>
                  {deliSyncRunning && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 animate-pulse">
                      ● 同期中
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-500">
                  {deliAutoEnabled ? '毎日21:00に全店舗CSVを自動取得・送信' : '定期自動送信を停止中（手動のみ）'}
                </span>
              </div>

              <button
                type="button"
                onClick={toggleDeliAutoSync}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  deliAutoEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={deliAutoEnabled}
                title={`クリックして定時自動送信を${deliAutoEnabled ? '無効' : '有効'}にする`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    deliAutoEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold w-7 ${deliAutoEnabled ? 'text-indigo-700' : 'text-gray-500'}`}>
                {deliAutoEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* 送信ボタン & 個別店舗ボタン */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => executeDeliSync()}
                disabled={deliSyncRunning || isExecuting}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow transition flex items-center gap-2 ${
                  deliSyncRunning
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {deliSyncRunning && deliSyncingTarget === 'ALL' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>全店舗CSV取得＆送信中...</span>
                  </>
                ) : (
                  <>
                    <span>📤 今すぐ全店舗CSV取得＆デリサポ送信</span>
                  </>
                )}
              </button>

              {/* 店舗別個別送信ボタン */}
              {deliStores.map(store => (
                <button
                  key={store.storeId}
                  onClick={() => executeDeliSync(store.storeName)}
                  disabled={deliSyncRunning || isExecuting}
                  className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 hover:text-indigo-600 transition shadow-xs disabled:opacity-50"
                  title={`「${store.storeName}」のみCSV取得してデリサポへ送信`}
                >
                  {deliSyncRunning && deliSyncingTarget === store.storeName ? (
                    <span className="flex items-center gap-1 text-indigo-600">
                      <span className="animate-spin">⏳</span>
                      {store.storeName} 送信中...
                    </span>
                  ) : (
                    <span>📍 {store.storeName}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ログ履歴トグルボタン */}
            <button
              onClick={() => setDeliLogsOpen(!deliLogsOpen)}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded border border-indigo-200 hover:border-indigo-300 transition"
            >
              {deliLogsOpen ? '▲ 送信履歴を閉じる' : `▼ 送信履歴を表示 (${deliLogs.length}件)`}
            </button>
          </div>

          {/* デリサポ連携ステータスメッセージ表示 */}
          {deliStatusMsg && (
            <div className={`mt-3 p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
              deliStatusType === 'running' ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' :
              deliStatusType === 'completed' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' :
              deliStatusType === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-300' :
              'bg-gray-100 text-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                {deliStatusType === 'running' && (
                  <svg className="animate-spin h-4 w-4 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {deliStatusType === 'completed' && <span>✅</span>}
                {deliStatusType === 'error' && <span>❌</span>}
                <span>{deliStatusMsg}</span>
              </div>
              <span className="text-[11px] text-gray-500">
                最終更新: {new Date().toLocaleTimeString('ja-JP')}
              </span>
            </div>
          )}

          {/* 送信履歴ログテーブル（折りたたみ） */}
          {deliLogsOpen && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 flex justify-between">
                <span>デリサポーター宛て 実発注CSV送信ログ (直近15件)</span>
                <span className="text-gray-500 font-normal">※ Shift_JIS 未加工CSVを送信済み</span>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">日時</th>
                      <th className="px-3 py-2 text-left">店舗名 (ID)</th>
                      <th className="px-3 py-2 text-left">結果</th>
                      <th className="px-3 py-2 text-left">デリサポ登録件数</th>
                      <th className="px-3 py-2 text-left">対象日・取引先</th>
                      <th className="px-3 py-2 text-left">エラー詳細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {deliLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                          送信ログはまだありません。「今すぐ全店舗CSV取得＆デリサポ送信」を押して実行してください。
                        </td>
                      </tr>
                    ) : (
                      deliLogs.map(log => {
                        let summaryObj: any = null;
                        try {
                          if (log.summary_json) summaryObj = JSON.parse(log.summary_json);
                        } catch {}
                        return (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                              {new Date(log.created_at + 'Z').toLocaleString('ja-JP')}
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                              {log.store_name} ({log.store_id})
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {log.status === 'success' ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">
                                  成功
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                                  エラー
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">
                              {log.status === 'success' ? `${log.saved_count} 件` : '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={summaryObj?.suppliers?.join(', ') || ''}>
                              {summaryObj?.dates ? `日: ${summaryObj.dates.length}日間 / 取引先: ${summaryObj.suppliers?.length || 0}社` : '-'}
                            </td>
                            <td className="px-3 py-2 text-red-600 max-w-xs truncate" title={log.error_message || ''}>
                              {log.error_message || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* バックグラウンド自動発注実行中アラート */}
        {isBackendRunning && rpaStatus !== 'running' && (
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-semibold">
                バックグラウンドでインフォマート自動発注(RPA)が実行中です... 完了するとテーブルが自動更新されます。
              </span>
            </div>
            <button
              onClick={stopRPA}
              className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition"
            >
              🛑 停止
            </button>
          </div>
        )}

        {/* 通常RPA発注のメッセージ・実行結果表示 */}
        {rpaMessage && (
          <div className={`p-4 rounded-lg shadow-sm ${
            rpaStatus === 'running' ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-500' :
            rpaStatus === 'completed' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' :
            'bg-red-100 text-red-800 border-l-4 border-red-500'
          }`}>
            <div className="flex items-center mb-1">
              {rpaStatus === 'running' && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span className="font-bold text-base">{rpaMessage}</span>
            </div>
            {rpaResults.length > 0 && (
              <div className="mt-2 text-sm border-t border-green-200 pt-2 space-y-1">
                {rpaResults.map((res, i) => (
                  <div key={i} className="font-mono text-xs">{res}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 注文データ一覧テーブル */}
        <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">店舗名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">取引先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">納品日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量 (編集可)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">エラー情報</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登録日時</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    発注データがありません。「Deli・supporter」から送信してください。
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-700">{order.store_name || '店舗名未指定'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-blue-600">{order.supplier_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{order.delivery_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{order.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input 
                        type="number" 
                        value={order.quantity}
                        onChange={(e) => handleQuantityChange(order.id, e.target.value as any)}
                        onBlur={(e) => handleQuantityBlur(order.id, parseInt(e.target.value, 10) || 0)}
                        className="border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:border-blue-500"
                        disabled={order.status !== '未処理'}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.status === '完了' ? 'bg-green-100 text-green-800' : 
                          order.status === 'エラー' ? 'bg-red-100 text-red-800' : 
                          order.status === '処理中' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate" title={order.error_message || ''}>
                      {order.error_message || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at + 'Z').toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
        )}

      </div>
    </div>
  );
}
