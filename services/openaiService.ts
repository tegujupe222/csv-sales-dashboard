const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function analyzeWithOpenAI(userMessage: string, systemPrompt = 'あなたは売上データ分析の専門家です。') {
  const body = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  };

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let errorMessage = '';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error?.message || JSON.stringify(errorData);
    } catch (e) {
      errorMessage = 'No error message in response';
    }
    throw new Error(`OpenAI API request failed: ${res.status} ${errorMessage}`);
  }

  const data = await res.json();
  // ChatGPTの返答はdata.choices[0].message.content
  return data.choices?.[0]?.message?.content || data;
}

export async function analyzeMonthlyReportWithOpenAI(month: string, data: any) {
  // データ構造を明確に説明し、期待するJSON形式を指定
  const userMessage = `以下は${month}の売上データです。

データ構造:
- cafe: { totalSales: 数値, totalGuests: 数値, avgSpend: 数値 }
- party3F: { totalSales: 数値, totalGuests: 数値, avgSpend: 数値 }
- party4F: { totalSales: 数値, totalGuests: 数値, avgSpend: 数値 }

以下のJSON形式で返してください:
{
  "summary": {
    "month": "${month}",
    "totalSales": 数値,
    "totalGuests": 数値,
    "avgSpend": 数値,
    "topCategory": "カテゴリ名"
  },
  "insights": ["インサイト1", "インサイト2", "インサイト3"],
  "recommendations": {
    "graph": {
      "type": "bar",
      "title": "グラフタイトル",
      "series": [
        { "name": "系列名1", "data": [数値] },
        { "name": "系列名2", "data": [数値] }
      ]
    }
  }
}

売上データ:
${JSON.stringify(data, null, 2)}`;

  const systemPrompt = `あなたは売上データ分析の専門家です。
必ず指定されたJSON形式で返してください。
totalSales, totalGuests, avgSpendは数値で返してください。
topCategoryは最も売上が高いカテゴリ（cafe, party3F, party4F）を返してください。`;

  return await analyzeWithOpenAI(userMessage, systemPrompt);
} 