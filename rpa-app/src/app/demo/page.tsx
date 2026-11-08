'use client';
import { useState } from 'react';

export default function DemoSite() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orders, setOrders] = useState<{productName: string, quantity: number}[]>([]);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  const handleOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const productName = formData.get('productName') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);
    
    // シミュレーション: 在庫不足エラー
    if (quantity > 100) {
      setSubmitStatus('エラー: 在庫が不足しています。');
      return;
    }

    setOrders([...orders, { productName, quantity }]);
    setSubmitStatus('注文が完了しました。');
    (e.target as HTMLFormElement).reset();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">BtoBプラットフォーム (Demo)</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">ユーザーID</label>
              <input type="text" id="userid" required className="mt-1 block w-full border border-gray-300 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">パスワード</label>
              <input type="password" id="password" required className="mt-1 block w-full border border-gray-300 rounded p-2" />
            </div>
            <button type="submit" id="login-button" className="w-full bg-blue-600 text-white rounded p-2">ログイン</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">商品発注画面</h1>
        
        {submitStatus && (
          <div className={`p-4 mb-4 rounded ${submitStatus.includes('エラー') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`} id="status-message">
            {submitStatus}
          </div>
        )}

        <form onSubmit={handleOrder} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium">商品名</label>
            <input type="text" name="productName" id="product-name" required className="mt-1 block w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">数量</label>
            <input type="number" name="quantity" id="quantity" required className="mt-1 block w-full border border-gray-300 rounded p-2" />
          </div>
          <button type="submit" id="order-button" className="bg-blue-600 text-white rounded p-2 px-4">発注する</button>
        </form>

        <h2 className="text-xl font-bold mb-2">本日の発注履歴</h2>
        <ul className="list-disc pl-5" id="order-history">
          {orders.map((o, i) => (
            <li key={i}>{o.productName} - {o.quantity}個</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
