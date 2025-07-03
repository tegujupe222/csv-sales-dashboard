import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, ComposedChart
} from 'recharts';

// AI返答の可視化データの型定義
interface VisualizationData {
  type: string;
  title?: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  series?: Array<{
    key: string;
    color?: string;
    type?: 'line' | 'bar' | 'area';
  }>;
  columns?: string[];
  colors?: string[];
  height?: number;
  [key: string]: any; // その他のプロパティも許可
}

interface DynamicVisualizationProps {
  visualization: VisualizationData;
  index?: number;
}

// 色のパレット
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff6b6b', '#4ecdc4'];

export const DynamicVisualization: React.FC<DynamicVisualizationProps> = ({ 
  visualization, 
  index = 0 
}) => {
  const { type, title, data, xKey, yKey, series, columns, height = 300 } = visualization;

  // 折れ線グラフ
  if (type === 'line_chart' || type === 'trend') {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title || '売上推移'}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey || 'date'} />
            <YAxis />
            <Tooltip />
            <Legend />
            {series?.map((s, idx) => (
              <Line 
                key={s.key} 
                type="monotone" 
                dataKey={s.key} 
                stroke={s.color || COLORS[idx % COLORS.length]} 
                strokeWidth={2}
              />
            )) || (yKey && <Line type="monotone" dataKey={yKey} stroke={COLORS[0]} strokeWidth={2} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 棒グラフ
  if (type === 'bar_chart' || type === 'comparison') {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title || '比較分析'}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey || 'category'} />
            <YAxis />
            <Tooltip />
            <Legend />
            {series?.map((s, idx) => (
              <Bar 
                key={s.key} 
                dataKey={s.key} 
                fill={s.color || COLORS[idx % COLORS.length]} 
              />
            )) || (yKey && <Bar dataKey={yKey} fill={COLORS[0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 円グラフ
  if (type === 'pie_chart' || type === 'distribution') {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title || '構成比'}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey || 'value'}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // エリアチャート
  if (type === 'area_chart' || type === 'cumulative') {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title || '累積分析'}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey || 'date'} />
            <YAxis />
            <Tooltip />
            <Legend />
            {series?.map((s, idx) => (
              <Area 
                key={s.key} 
                type="monotone" 
                dataKey={s.key} 
                fill={s.color || COLORS[idx % COLORS.length]} 
                stroke={s.color || COLORS[idx % COLORS.length]}
              />
            )) || (yKey && <Area type="monotone" dataKey={yKey} fill={COLORS[0]} stroke={COLORS[0]} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 複合チャート（折れ線+棒グラフ）
  if (type === 'composed_chart' || type === 'mixed') {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title || '複合分析'}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey || 'date'} />
            <YAxis />
            <Tooltip />
            <Legend />
            {series?.map((s, idx) => {
              if (s.type === 'line') {
                return (
                  <Line 
                    key={s.key} 
                    type="monotone" 
                    dataKey={s.key} 
                    stroke={s.color || COLORS[idx % COLORS.length]} 
                    strokeWidth={2}
                  />
                );
              } else if (s.type === 'area') {
                return (
                  <Area 
                    key={s.key} 
                    type="monotone" 
                    dataKey={s.key} 
                    fill={s.color || COLORS[idx % COLORS.length]} 
                    stroke={s.color || COLORS[idx % COLORS.length]}
                  />
                );
              } else {
                return (
                  <Bar 
                    key={s.key} 
                    dataKey={s.key} 
                    fill={s.color || COLORS[idx % COLORS.length]} 
                  />
                );
              }
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // テーブル
  if (type === 'table' || type === 'summary_table' || type === 'comparison_table') {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title || '詳細表'}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr>
                {columns?.map((col) => (
                  <th key={col} className="border px-3 py-2 bg-gray-100 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  {columns?.map((col) => (
                    <td key={col} className="border px-3 py-2">
                      {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // メトリックカード
  if (type === 'metric' || type === 'kpi' || type === 'summary') {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{title || '主要指標'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow border">
              <div className="text-sm text-gray-600 mb-1">{item.label || item.name}</div>
              <div className="text-2xl font-bold text-gray-800">
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </div>
              {item.unit && <div className="text-sm text-gray-500">{item.unit}</div>}
              {item.change && (
                <div className={`text-sm ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 未知の可視化タイプ
  return (
    <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2 text-yellow-800">
        {title || `未対応の可視化タイプ: ${type}`}
      </h3>
      <p className="text-yellow-700 mb-2">
        この可視化タイプ（{type}）は現在サポートされていません。
      </p>
      <details className="text-sm text-yellow-600">
        <summary className="cursor-pointer">データ内容を表示</summary>
        <pre className="mt-2 bg-white p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(visualization, null, 2)}
        </pre>
      </details>
    </div>
  );
};

// AI返答全体をレンダリングするコンポーネント
interface AIDashboardProps {
  aiResponse: any;
  onClose?: () => void;
}

export const AIDashboard: React.FC<AIDashboardProps> = ({ aiResponse, onClose }) => {
  // AI返答から可視化データを抽出
  const visualizations: VisualizationData[] = [];

  // 既存の構造（salesTrend, budgetVsActual）を新しい形式に変換
  if (aiResponse.salesTrend) {
    visualizations.push({
      type: 'line_chart',
      title: '売上推移',
      data: aiResponse.salesTrend.data || [],
      xKey: aiResponse.salesTrend.xKey || '月',
      series: aiResponse.salesTrend.series || []
    });
  }

  if (aiResponse.budgetVsActual) {
    visualizations.push({
      type: 'table',
      title: '予算実績比較',
      data: aiResponse.budgetVsActual.data || [],
      columns: aiResponse.budgetVsActual.columns || []
    });
  }

  // 新しい構造（visualizations配列）を処理
  if (Array.isArray(aiResponse.visualizations)) {
    visualizations.push(...aiResponse.visualizations);
  }

  // 単一の可視化データ
  if (aiResponse.type && aiResponse.data) {
    visualizations.push(aiResponse);
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AI自動生成ダッシュボード</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            閉じる
          </button>
        )}
      </div>
      
      {visualizations.length > 0 ? (
        visualizations.map((viz, index) => (
          <DynamicVisualization 
            key={index} 
            visualization={viz} 
            index={index} 
          />
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>可視化データが見つかりませんでした。</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm">AI返答の詳細を表示</summary>
            <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-x-auto">
              {JSON.stringify(aiResponse, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}; 