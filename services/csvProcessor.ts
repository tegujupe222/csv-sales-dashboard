import type { ParseResult } from 'papaparse';
import { FileType } from '../types';
import type { WaldData, SalesCategoryData, DailyEntry, ProductSales, Product } from '../types';
import { PRODUCT_NAME_MASTER, PRODUCT_CATEGORIES } from '../constants';
import { analyzeWithOpenAI } from './openaiService';

declare var Papa: {
  parse: (file: File, config: any) => void;
};

const parseNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const detectFileType = (name: string): FileType => {
  if (name.match(/^日別売上\(年月：\d{4}_\d{2}\)\.csv$/)) {
    return FileType.DailySales;
  }
  if (name.includes("取引") && (name.includes("CPT") || name.includes("DPT")) && name.toLowerCase().endsWith(".csv")) {
    return FileType.Party;
  }
  if (/取引データ[\(（]取引日時=/.test(name.normalize('NFKC'))) {
    return FileType.ProductSalesByTaxRate;
  }
  return FileType.Unknown;
};

const extractMonth = (filename: string): string => {
  const pattern1 = filename.match(/(\d{4})_(\d{1,2})/);
  if (pattern1) return `${pattern1[1]}年${parseInt(pattern1[2], 10)}月`;

  const pattern2 = filename.match(/(\d{4})(\d{2})(\d{2})/);
  if (pattern2) return `${pattern2[1]}年${parseInt(pattern2[2], 10)}月`;

  const dateMatch = filename.normalize('NFKC').match(/取引日時=([0-9]{8})/);
    if (dateMatch) {
      const yyyymmdd = dateMatch[1];
      const year = yyyymmdd.substring(0, 4);
      const month = parseInt(yyyymmdd.substring(4, 6), 10);
      return `${year}年${month}月`;
    }

  const today = new Date();
  return `${today.getFullYear()}年${today.getMonth() + 1}月`;
};

const extractStoreCode = (filename: string): string | null => {
  // ファイル名から店舗コードを抽出するパターン
  // 例: "SHIBUYA_2024_01.csv", "渋谷店_2024_01.csv" など
  const patterns = [
    /^([A-Z]+)_/, // 英大文字の店舗コード
    /^([^_]+)_/, // アンダースコア前の文字列
    /^([^0-9]+)/, // 数字前の文字列
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
};

const processDailySales = (rows: string[][]): Partial<WaldData> => {
    const daily: DailyEntry[] = [];
    rows.forEach(row => {
        const dateValue = (row[0] || "").trim();
        if (!dateValue || dateValue.includes("合計")) return;
        
        let day = '';
        const fullDateMatch = dateValue.match(/\d{4}\/(\d{1,2})\/(\d{1,2})/);
        if (fullDateMatch) {
            day = `${parseInt(fullDateMatch[2], 10)}日`;
        } else {
            const partialDateMatch = dateValue.match(/(\d{1,2})\/(\d{1,2})/);
            if(partialDateMatch) {
                day = `${parseInt(partialDateMatch[2], 10)}日`;
            }
        }
        if (!day) return;

        daily.push({
            date: day,
            sales: parseNumber(row[1]),
            guests: parseNumber(row[10]),
            avgSpend: parseNumber(row[11]),
        });
    });

    const totalSales = daily.reduce((sum, item) => sum + item.sales, 0);
    const totalGuests = daily.reduce((sum, item) => sum + item.guests, 0);
    const cafeData: SalesCategoryData = {
        daily,
        totalSales,
        totalGuests,
        avgSpend: totalGuests > 0 ? totalSales / totalGuests : 0,
    };
    return { cafe: cafeData };
}

const processPartySales = (rows: string[][], fileName: string): Partial<WaldData> => {
    const dailyMap: { [key: string]: { sales: number, guests: number } } = {};

    rows.forEach(row => {
        if (!row || row.length < 10) return;
        const dateRaw = (row[1] || "").trim();
        const dateMatch = dateRaw.match(/\d{4}\/\d{1,2}\/(\d{1,2})/);
        if (!dateMatch) return;

        const day = `${parseInt(dateMatch[1], 10)}日`;
        if (!dailyMap[day]) {
            dailyMap[day] = { sales: 0, guests: 0 };
        }
        dailyMap[day].sales += parseNumber(row[9]); // J列
        dailyMap[day].guests += parseNumber(row[4]); // E列
    });

    const daily: DailyEntry[] = Object.keys(dailyMap).map(day => ({
        date: day,
        sales: dailyMap[day].sales,
        guests: dailyMap[day].guests,
        avgSpend: dailyMap[day].guests > 0 ? dailyMap[day].sales / dailyMap[day].guests : 0,
    }));
    
    const totalSales = daily.reduce((sum, item) => sum + item.sales, 0);
    const totalGuests = daily.reduce((sum, item) => sum + item.guests, 0);
    const partyData: SalesCategoryData = {
        daily,
        totalSales,
        totalGuests,
        avgSpend: totalGuests > 0 ? totalSales / totalGuests : 0,
    };
    
    if (fileName.includes("CPT")) return { party3F: partyData };
    if (fileName.includes("DPT")) return { party4F: partyData };
    return {};
}

const processProductSales = (rows: string[][]): Partial<WaldData> => {
    const products: Product[] = [];
    rows.forEach(row => {
        if (!row || row.length < 45) return;

        const productCode = (row[32] || "").trim(); // AG列
        if (!productCode) return;

        products.push({
            code: productCode,
            name: (row[33] || "").trim(), // AH列
            sales: parseNumber(row[41]), // AP列
            tax: 0, // Not directly available, to be calculated
            taxRate: parseNumber(row[44]), // AS列
        });
    });

    const productSales: ProductSales = {
        sandwiches: { sales10: 0, tax10: 0, sales8: 0, tax8: 0 },
        drinks: { sales10: 0, tax10: 0, sales8: 0, tax8: 0 },
        other: { sales10: 0, tax10: 0, sales8: 0, tax8: 0 },
    };

    products.forEach(p => {
        const name = PRODUCT_NAME_MASTER[p.code] || p.name;
        const lowerCaseName = name.toLowerCase();
        let category: keyof ProductSales | null = null;
        
        if(PRODUCT_CATEGORIES[0].keywords.some(k => lowerCaseName.includes(k))) {
            category = 'sandwiches';
        } else if(PRODUCT_CATEGORIES[1].keywords.some(k => lowerCaseName.includes(k))) {
            category = 'drinks';
        } else {
            category = 'other';
        }

        if (p.taxRate === 10) {
            productSales[category].sales10 += p.sales;
        } else if (p.taxRate === 8) {
            productSales[category].sales8 += p.sales;
        } else {
            productSales[category].sales10 += p.sales;
        }
    });

    return { productSales };
}

// --- ファイル内容からFileTypeを推測 ---
const detectFileTypeByContent = (rows: string[][]): FileType => {
  if (!rows || rows.length < 2) return FileType.Unknown;
  const header = rows[0].map(h => h.trim());
  // 日別売上: 日付/売上/客数/客単価など
  if (header.includes('日付') && header.includes('売上') && header.includes('客数')) {
    return FileType.DailySales;
  }
  // パーティ: 取引/日付/人数/金額など
  if (header.some(h => h.includes('取引')) && header.some(h => h.includes('人数')) && header.some(h => h.includes('金額'))) {
    return FileType.Party;
  }
  // 商品別: 商品コード/商品名/税率/売上など
  if (header.some(h => h.includes('商品')) && header.some(h => h.includes('税率'))) {
    return FileType.ProductSalesByTaxRate;
  }
  // カラム数で判定（例: 45列以上なら商品別）
  if (header.length >= 45) return FileType.ProductSalesByTaxRate;
  return FileType.Unknown;
};

// --- AIでFileTypeを推論 ---
const detectFileTypeByAI = async (rows: string[][]): Promise<FileType> => {
  const sample = rows.slice(0, 5).map(r => r.join(",")).join("\n");
  const prompt = `以下は売上CSVデータのサンプルです。ファイルタイプを次から1つだけ日本語で答えてください：日別売上, パーティ売上, 商品別売上。\n---\n${sample}`;
  try {
    const aiResult = await analyzeWithOpenAI(prompt, 'あなたは売上データ分析の専門家です。ファイルタイプを1語で答えてください。');
    if (typeof aiResult === 'string') {
      if (aiResult.includes('日別')) return FileType.DailySales;
      if (aiResult.includes('パーティ')) return FileType.Party;
      if (aiResult.includes('商品')) return FileType.ProductSalesByTaxRate;
    }
  } catch (e) {
    // fallback: unknown
  }
  return FileType.Unknown;
};

export const processCsvFile = (file: File, selectedStoreCode?: string): Promise<Partial<WaldData>> => {
  return new Promise((resolve, reject) => {
    const fileType = detectFileType(file.name);
    const month = extractMonth(file.name);
    const storeCode = selectedStoreCode || extractStoreCode(file.name);

    // ファイル名で判定できない場合は内容で判定
    const tryParse = (rows: string[][]) => {
      let type = fileType;
      if (type === FileType.Unknown) {
        type = detectFileTypeByContent(rows);
      }
      if (type === FileType.Unknown) {
        // AI判定
        detectFileTypeByAI(rows).then(aiType => {
          if (aiType === FileType.Unknown) {
            return reject(new Error("不明またはサポートされていないCSVファイル形式です (AI判定も失敗)"));
          }
          processRows(rows, aiType, file.name, month, storeCode, resolve, reject);
        }).catch(() => {
          return reject(new Error("不明またはサポートされていないCSVファイル形式です (AI判定エラー)"));
        });
        return;
      }
      processRows(rows, type, file.name, month, storeCode, resolve, reject);
    };

    Papa.parse(file, {
      encoding: "Shift_JIS",
      complete: (results: ParseResult<string[]>) => {
        let rows = results.data;
        if (results.errors.length > 0) {
          Papa.parse(file, {
            encoding: "UTF-8",
            complete: (utf8Results: ParseResult<string[]>) => {
              if (utf8Results.errors.length > 0 && utf8Results.data.length <= 1) {
                return reject(new Error("Shift_JISおよびUTF-8エンコーディングでのCSV解析に失敗しました。"));
              }
              tryParse(utf8Results.data);
            }
          });
        } else {
          tryParse(rows);
        }
      },
      error: (err: any) => reject(err),
    });
  });
};

const processRows = (
    rows: string[][], 
    fileType: FileType, 
    fileName: string, 
    month: string, 
    storeCode: string | null,
    resolve: (value: Partial<WaldData>) => void,
    reject: (reason?: any) => void
) => {
    if (rows.length <= 1) {
      return reject(new Error("CSVファイルが空か、ヘッダーのみを含んでいます。"));
    }
    rows.shift(); // ヘッダー行を削除
    
    let processedData: Partial<WaldData> = {};

    switch(fileType) {
        case FileType.DailySales:
            processedData = processDailySales(rows);
            break;
        case FileType.Party:
            processedData = processPartySales(rows, fileName);
            break;
        case FileType.ProductSalesByTaxRate:
            processedData = processProductSales(rows);
            break;
        default:
            return reject(new Error("このファイルタイプの処理は実装されていません。"));
    }
    
    processedData.month = month;
    if (storeCode) {
      processedData.storeId = storeCode;
    }
    resolve(processedData);
};