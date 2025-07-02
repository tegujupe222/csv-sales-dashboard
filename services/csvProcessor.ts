import type { Partial, ParseResult } from 'papaparse';
import { FileType } from '../types';
import type { WaldData, SalesCategoryData, DailyEntry, ProductSales, Product } from '../types';
import { PRODUCT_NAME_MASTER, PRODUCT_CATEGORIES } from '../constants';

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


export const processCsvFile = (file: File, selectedStoreCode?: string): Promise<Partial<WaldData>> => {
  return new Promise((resolve, reject) => {
    const fileType = detectFileType(file.name);
    const month = extractMonth(file.name);
    // 選択された店舗コードがある場合はそれを使用、なければファイル名から抽出
    const storeCode = selectedStoreCode || extractStoreCode(file.name);

    if (fileType === FileType.Unknown) {
      return reject(new Error("不明またはサポートされていないCSVファイル形式です。"));
    }

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
                    processRows(utf8Results.data, fileType, file.name, month, storeCode, resolve, reject);
                }
            });
        } else {
           processRows(rows, fileType, file.name, month, storeCode, resolve, reject);
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
    const header = rows.shift();
    
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