import React, { useState, useMemo } from 'react';
import type { WaldData, SalesCategoryData } from '../types';
import { DataTable } from './DataTable';
import { SalesChart, CategoryPieChart } from './SalesChart';
import { UploadIcon } from './icons';

interface DashboardProps {
  data: Partial<WaldData>;
  onNewUpload: (file: File) => void;
  lastFileName: string;
}

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
        <p className="mt-1 text-2xl lg:text-3xl font-semibold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ data, onNewUpload, lastFileName }) => {
    const [activeTab, setActiveTab] = useState('summary');

    const chartData = useMemo(() => {
        const cafeData = data.cafe?.daily.map(d => ({ date: d.date, 'カフェ売上': d.sales })) || [];
        const party3FData = data.party3F?.daily.map(d => ({ date: d.date, '3Fパーティ売上': d.sales })) || [];
        const party4FData = data.party4F?.daily.map(d => ({ date: d.date, '4Fパーティ売上': d.sales })) || [];
        
        const allDates = [...new Set([...cafeData.map(d=>d.date), ...party3FData.map(d=>d.date), ...party4FData.map(d=>d.date)])]
            .sort((a,b) => parseInt(a) - parseInt(b));
        
        return allDates.map(date => {
            const c = cafeData.find(d => d.date === date) || {};
            const p3 = party3FData.find(d => d.date === date) || {};
            const p4 = party4FData.find(d => d.date === date) || {};
            return { date, ...c, ...p3, ...p4 };
        });
    }, [data]);
    
    const productSalesPieData = useMemo(() => {
        if (!data.productSales) return [];
        return [
            { name: 'サンドイッチ', value: data.productSales.sandwiches.sales8 + data.productSales.sandwiches.sales10 },
            { name: 'ドリンク', value: data.productSales.drinks.sales8 + data.productSales.drinks.sales10 },
            { name: 'その他', value: data.productSales.other.sales8 + data.productSales.other.sales10 },
        ].filter(item => item.value > 0);
    }, [data.productSales]);

    const renderCategoryTable = (categoryData: SalesCategoryData | undefined, title: string) => {
        if (!categoryData || categoryData.daily.length === 0) return <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">{`「${title}」のデータはまだアップロードされていません。`}</div>;
        return <DataTable title={title} data={categoryData.daily} headers={['日付', '売上', '客数', '客単価']} />;
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onNewUpload(e.target.files[0]);
        }
    };

  return (
    <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center bg-white p-4 rounded-lg shadow-sm gap-4">
            <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-800">
                    {data.month?.includes(' - ') ? '複数月レポート' : '月次レポート'}: {data.month || 'N/A'}
                </h2>
                <p className="text-sm text-gray-500">
                    最終処理ファイル: <span className="font-medium text-gray-700">{lastFileName}</span>
                    {data.month?.includes(' - ') && (
                        <span className="block lg:inline lg:ml-4 text-primary font-medium">複数月のデータを統合表示中</span>
                    )}
                </p>
            </div>
            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 focus:outline-none cursor-pointer transition w-full lg:w-auto">
                <UploadIcon className="w-5 h-5"/>
                追加データをアップロード
                <input type="file" className="hidden" onChange={handleFileChange} accept=".csv"/>
            </label>
        </div>
      
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-2 lg:space-x-8 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('summary')} className={`whitespace-nowrap py-4 px-2 lg:px-1 border-b-2 font-medium text-sm ${activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>概要</button>
                    <button onClick={() => setActiveTab('tables')} className={`whitespace-nowrap py-4 px-2 lg:px-1 border-b-2 font-medium text-sm ${activeTab === 'tables' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>データテーブル</button>
                    <button onClick={() => setActiveTab('charts')} className={`whitespace-nowrap py-4 px-2 lg:px-1 border-b-2 font-medium text-sm ${activeTab === 'charts' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>グラフ</button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'summary' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard title="カフェ売上合計" value={data.cafe?.totalSales || 0} />
                            <StatCard title="3Fパーティ売上合計" value={data.party3F?.totalSales || 0} />
                            <StatCard title="4Fパーティ売上合計" value={data.party4F?.totalSales || 0} />
                            <StatCard title="商品売上合計" value={productSalesPieData.reduce((acc, cv) => acc + cv.value, 0)} />
                        </div>
                         {data.productSales && (
                          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
                              <h3 className="text-lg font-medium text-gray-900 mb-4">税率別商品売上</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                                  <div>
                                      <h4 className="font-semibold text-gray-700 text-sm lg:text-base">サンドイッチ</h4>
                                      <p className="text-sm lg:text-base">8% 売上: {data.productSales.sandwiches.sales8.toLocaleString()}</p>
                                      <p className="text-sm lg:text-base">10% 売上: {data.productSales.sandwiches.sales10.toLocaleString()}</p>
                                  </div>
                                  <div>
                                      <h4 className="font-semibold text-gray-700 text-sm lg:text-base">ドリンク</h4>
                                      <p className="text-sm lg:text-base">8% 売上: {data.productSales.drinks.sales8.toLocaleString()}</p>
                                      <p className="text-sm lg:text-base">10% 売上: {data.productSales.drinks.sales10.toLocaleString()}</p>
                                  </div>
                                  <div>
                                      <h4 className="font-semibold text-gray-700 text-sm lg:text-base">その他</h4>
                                      <p className="text-sm lg:text-base">8% 売上: {data.productSales.other.sales8.toLocaleString()}</p>
                                      <p className="text-sm lg:text-base">10% 売上: {data.productSales.other.sales10.toLocaleString()}</p>
                                  </div>
                              </div>
                          </div>
                        )}
                    </div>
                )}
                {activeTab === 'tables' && (
                    <div className="space-y-6">
                        {renderCategoryTable(data.cafe, 'カフェ日次売上')}
                        {renderCategoryTable(data.party3F, '3Fパーティ日次売上')}
                        {renderCategoryTable(data.party4F, '4Fパーティ日次売上')}
                    </div>
                )}
                {activeTab === 'charts' && (
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                       <div className="bg-white p-4 rounded-lg shadow">
                         <h3 className="text-lg font-medium text-gray-900 mb-4">日次売上実績</h3>
                         <SalesChart data={chartData} />
                       </div>
                       <div className="bg-white p-4 rounded-lg shadow">
                         <h3 className="text-lg font-medium text-gray-900 mb-4">商品カテゴリ別売上</h3>
                         {productSalesPieData.length > 0 ? <CategoryPieChart data={productSalesPieData} /> : <div className="h-64 flex items-center justify-center text-gray-500">商品売上のデータはまだアップロードされていません。</div>}
                       </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};