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
  const userMessage = `以下は${month}の売上データです。売上・客数・カテゴリ別売上などを要約し、経営に役立つインサイトや推奨グラフ（グラフ種別・タイトル・x軸・y軸・系列名など）をJSON形式で返してください。\n---\n${JSON.stringify(data, null, 2)}`;
  const systemPrompt = 'あなたは売上データ分析の専門家です。要約・インサイト・推奨グラフをJSONで返してください。';
  return await analyzeWithOpenAI(userMessage, systemPrompt);
} 