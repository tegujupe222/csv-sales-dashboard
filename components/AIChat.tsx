import React, { useState, useRef, useEffect } from 'react';
import { extractTimeSeriesData } from '../services/dataManager';
import { analyzeWithOpenAI } from '../services/openaiService';
import type { TimeSeriesData, MonthlyData } from '../services/dataManager';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  data?: any; // AI返答のデータ
}

interface AIChatProps {
  monthlyData: MonthlyData[];
  selectedMonths: string[];
  selectedStores: string[];
  clientId?: string;
  onClose?: () => void;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyC604fZl-DVXu26l6rxBDfoBQay9FHWuqM';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY;

export const AIChat: React.FC<AIChatProps> = ({ 
  monthlyData, 
  selectedMonths, 
  selectedStores, 
  clientId,
  onClose 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'こんにちは！売上データについて何でもお聞きください。例えば「今月の売上の特徴は？」「どの店舗が伸びていますか？」「前年同月比はどうですか？」など、経営に役立つ分析をお手伝いします。',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 売上データをAI用のテキストに変換
  const formatSalesDataForAI = (): string => {
    if (!monthlyData || monthlyData.length === 0) return 'データがありません。';

    let dataText = `現在選択されている期間: ${selectedMonths.join(', ')}\n`;
    dataText += `選択店舗: ${selectedStores.join(', ')}\n\n`;

    // 時系列データを抽出
    const timeSeriesData = extractTimeSeriesData(selectedMonths, clientId);
    
    if (timeSeriesData && timeSeriesData.length > 0) {
      dataText += '日次売上データ:\n';
      timeSeriesData.slice(0, 20).forEach(day => { // 最新20日分
        dataText += `${day.date}: 売上${day.sales?.toLocaleString() || '0'}円, 客数${day.guests || '0'}人, 客単価${Math.round(day.avgSpend || 0).toLocaleString()}円\n`;
      });
      dataText += '\n';
    }

    // 月次サマリー
    monthlyData.forEach(month => {
      if (month && selectedMonths.includes(month.month)) {
        dataText += `${month.month}のサマリー:\n`;
        if (month.data?.cafe) {
          dataText += `  カフェ: 売上${month.data.cafe.totalSales?.toLocaleString() || '0'}円, 客数${month.data.cafe.totalGuests || '0'}人\n`;
        }
        if (month.data?.party3F) {
          dataText += `  パーティ3F: 売上${month.data.party3F.totalSales?.toLocaleString() || '0'}円, 客数${month.data.party3F.totalGuests || '0'}人\n`;
        }
        if (month.data?.party4F) {
          dataText += `  パーティ4F: 売上${month.data.party4F.totalSales?.toLocaleString() || '0'}円, 客数${month.data.party4F.totalGuests || '0'}人\n`;
        }
        dataText += '\n';
      }
    });

    return dataText;
  };

  // AIに質問を送信（OpenAI版）
  const sendMessageToAI = async (userMessage: string): Promise<string> => {
    const salesDataText = formatSalesDataForAI();
    const systemPrompt = `あなたは売上データ分析の専門家です。以下の売上データを分析して、ユーザーの質問に経営に役立つアドバイスを日本語で回答してください。\n\n売上データ:\n${salesDataText}`;
    return await analyzeWithOpenAI(userMessage, systemPrompt);
  };

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await sendMessageToAI(inputMessage);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI API error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '申し訳ございません。一時的なエラーが発生しました。しばらく時間をおいて再度お試しください。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // キーボードショートカット
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // サンプル質問
  const sampleQuestions = [
    '今月の売上の特徴は？',
    'どの店舗が伸びていますか？',
    '客単価の改善方法は？',
    '前年同月比はどうですか？',
    '売上向上のアドバイスをください',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI経営アドバイザー</h3>
              <p className="text-sm text-gray-500">売上データの分析とアドバイス</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>AIが分析中...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* サンプル質問 */}
        {messages.length === 1 && (
          <div className="p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">よくある質問:</p>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(question)}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 入力エリア */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="売上データについて質問してください..."
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter で送信、Shift + Enter で改行
          </p>
        </div>
      </div>
    </div>
  );
}; 