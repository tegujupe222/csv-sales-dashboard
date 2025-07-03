const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyC604fZl-DVXu26l6rxBDfoBQay9FHWuqM';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY;

export async function analyzeCsvWithGemini(csvSample: string): Promise<any> {
  const prompt = `以下は日本語の売上CSVデータの一部です。各カラムの意味と、売上日・商品名・売上金額・数量など主要な情報をどのカラムから抽出すればよいか、また最適な集計・可視化（表やグラフ）をJSON形式で提案してください。

以下の形式で複数の可視化を提案してください：

{
  "visualizations": [
    {
      "type": "line_chart",
      "title": "売上推移",
      "data": [...],
      "xKey": "date",
      "series": [{"key": "sales", "color": "#8884d8"}]
    },
    {
      "type": "bar_chart", 
      "title": "商品別売上",
      "data": [...],
      "xKey": "product",
      "yKey": "sales"
    },
    {
      "type": "pie_chart",
      "title": "カテゴリ別構成比",
      "data": [...],
      "yKey": "value"
    },
    {
      "type": "table",
      "title": "月次サマリー",
      "data": [...],
      "columns": ["月", "売上", "目標", "達成率"]
    },
    {
      "type": "metric",
      "title": "主要KPI",
      "data": [
        {"label": "総売上", "value": 1000000, "unit": "円"},
        {"label": "平均客単価", "value": 2500, "unit": "円"}
      ]
    }
  ]
}

対応可能な可視化タイプ：
- line_chart: 時系列データ
- bar_chart: 比較データ
- pie_chart: 構成比
- area_chart: 累積データ
- composed_chart: 複合グラフ
- table: 詳細表
- metric: KPI指標

経営に役立つ分析（予算実績比較、達成率、差異、客数、客単価など）も含めてください。

--- CSVサンプル ---
${csvSample}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error('Gemini API request failed');
  }

  const data = await res.json();
  // Geminiの返答はdata.candidates[0].content.parts[0].textに入っていることが多い
  return data.candidates?.[0]?.content?.parts?.[0]?.text || data;
} 