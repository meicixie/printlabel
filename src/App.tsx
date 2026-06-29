import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Trash2, Plus, LayoutGrid, FileText, ExternalLink, Settings2, Palette, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface BookEntry {
  id: number;
  accessionNumber: string; // 登錄號
  title: string; // 書名
  classification: string; // 分類號
  authorNumber: string; // 作者號
  volumeCopy: string; // 冊次號/複本號
}

interface PrintOffsets {
  x: number;
  y: number;
}

interface AppStorageData {
  entries: BookEntry[];
  schoolName: string;
  syncWithLeft: boolean[];
  offsets: PrintOffsets;
  classificationColors: { [key: string]: string };
}

const STORAGE_KEY = 'lib_barcode_printer_app_data_v1';

const DEFAULT_CLASSIFICATION_COLORS: { [key: string]: string } = {
  '0': '#5e2488',
  '1': '#ffff00',
  '2': '#663300',
  '3': '#000000',
  '4': '#0000ff',
  '5': '#cf541f',
  '6': '#cc2779',
  '7': '#006600',
  '8': '#ff0000',
  '9': '#78b025',
};

const CLASSIFICATION_LABELS: { [key: string]: string } = {
  '0': '000總類',
  '1': '100哲學類',
  '2': '200宗教類',
  '3': '300科學類',
  '4': '400應用科學類',
  '5': '500社會科學類',
  '6': '600中國史地類',
  '7': '700世界史地類',
  '8': '800語言文學類',
  '9': '900藝術類',
};

const getInitialStorage = (): Partial<AppStorageData> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse localStorage', e);
    return {};
  }
};

const BarcodeComponent: React.FC<{ 
  entry: BookEntry; 
  schoolName: string;
  classificationColors: { [key: string]: string };
}> = ({ entry, schoolName, classificationColors }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && entry.accessionNumber) {
      try {
        JsBarcode(svgRef.current, entry.accessionNumber, {
          format: 'CODE39',
          width: 1.5,
          height: 35, // 增加條碼高度
          displayValue: false,
          margin: 0,
        });
      } catch (e) {
        console.error('Barcode generation failed', e);
      }
    }
  }, [entry.accessionNumber]);

  if (!entry.accessionNumber && !entry.title) return <div className="w-[8.9cm] h-[2.68cm]"></div>;

  const getClassificationColor = (cls: string) => {
    const firstDigit = cls.trim().charAt(0);
    return classificationColors[firstDigit] || '#cccccc';
  };

  return (
    <div className="flex w-[8.9cm] h-[2.68cm] border-collapse overflow-hidden print:border-0">
      {/* 條碼部分 (5.2cm x 2.68cm) */}
      <div className="w-[5.2cm] h-[2.68cm] flex flex-col items-center py-2.5 px-1 border-r border-gray-100 print:border-r-0">
        <div className="text-[9pt] font-kai leading-none text-center w-full truncate mb-1">
          {schoolName || '\u00A0'}
        </div>
        <div className="flex items-center justify-center h-[0.75cm] w-[4.6cm] mb-1">
          <svg ref={svgRef} className="max-w-full max-h-full"></svg>
        </div>
        <div className="text-[10pt] font-mono leading-none font-bold mb-0.5">
          {entry.accessionNumber}
        </div>
        <div className="text-[10pt] font-kai leading-none text-left w-full h-[0.4cm] overflow-hidden flex items-center justify-start px-1">
          <span className="truncate w-full">{entry.title}</span>
        </div>
      </div>

      {/* 書標部分 (3.7cm x 2.68cm) */}
      <div className="w-[3.7cm] h-[2.68cm] relative flex items-center justify-center">
        {/* 色框 (3.0cm x 2.1cm) */}
        <div 
          className="absolute w-[3.0cm] h-[2.1cm] border-[0.13cm] flex flex-col justify-center items-start pl-[0.5mm] pr-1"
          style={{ borderColor: getClassificationColor(entry.classification) }}
        >
          <div className="text-[10pt] font-kai font-bold leading-tight truncate w-full">{entry.classification || '\u00A0'}</div>
          <div className="text-[10pt] font-kai font-bold leading-tight truncate w-full">{entry.authorNumber || '\u00A0'}</div>
          <div className="text-[10pt] font-kai font-bold leading-tight truncate w-full">{entry.volumeCopy || '\u00A0'}</div>
          <div className="text-[10pt] font-mono font-bold leading-tight truncate w-full mt-0.5">{entry.accessionNumber || '\u00A0'}</div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const initialData = useRef(getInitialStorage()).current;

  const [entries, setEntries] = useState<BookEntry[]>(
    initialData.entries?.length === 20
      ? initialData.entries
      : Array.from({ length: 20 }, (_, i) => ({
          id: i,
          accessionNumber: '',
          title: '',
          classification: '',
          authorNumber: '',
          volumeCopy: '',
        }))
  );

  // 1. 校名標題預設留空讓使用者自行輸入
  const [schoolName, setSchoolName] = useState<string>(
    initialData.schoolName !== undefined ? initialData.schoolName : ''
  );

  const [syncWithLeft, setSyncWithLeft] = useState<boolean[]>(
    initialData.syncWithLeft?.length === 20
      ? initialData.syncWithLeft
      : new Array(20).fill(false)
  );

  const [offsets, setOffsets] = useState<PrintOffsets>(
    initialData.offsets || { x: -2.5, y: -2.5 }
  );

  // 2. 十大分類書標套色自訂欄位
  const [classificationColors, setClassificationColors] = useState<{ [key: string]: string }>(
    initialData.classificationColors || DEFAULT_CLASSIFICATION_COLORS
  );

  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  // 3. 暫存至 LocalStorage
  useEffect(() => {
    try {
      const dataToSave: AppStorageData = {
        entries,
        schoolName,
        syncWithLeft,
        offsets,
        classificationColors,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
  }, [entries, schoolName, syncWithLeft, offsets, classificationColors]);

  const updateEntry = (id: number, field: keyof BookEntry, value: string) => {
    setEntries(prev => {
      const newEntries = [...prev];
      newEntries[id] = { ...newEntries[id], [field]: value };
      
      // 如果這是左側欄位 (0, 2, 4...) 且右側欄位勾選了「同左」
      if (id % 2 === 0 && id + 1 < 20 && syncWithLeft[id + 1]) {
        newEntries[id + 1] = { ...newEntries[id + 1], [field]: value };
      }
      
      return newEntries;
    });
  };

  const toggleSync = (id: number) => {
    setSyncWithLeft(prev => {
      const next = [...prev];
      const isNowSynced = !next[id];
      next[id] = isNowSynced;
      
      if (isNowSynced) {
        setEntries(prevEntries => {
          const updated = [...prevEntries];
          const leftEntry = prevEntries[id - 1];
          updated[id] = { 
            ...leftEntry, 
            id: id 
          };
          return updated;
        });
      }
      return next;
    });
  };

  const clearAll = () => {
    setEntries(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      accessionNumber: '',
      title: '',
      classification: '',
      authorNumber: '',
      volumeCopy: '',
    })));
    setSyncWithLeft(new Array(20).fill(false));
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.error('Print failed', e);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      {/* UI Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 print:hidden">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutGrid className="text-blue-600" />
            圖書條碼列印工具
          </h1>
          <p className="text-slate-500 mt-1">A4 規格：2x10 共 20 組標籤（資料自動本機暫存）</p>
          
          {/* 設定與調整區 */}
          <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-4">
            {/* 校名設定 */}
            <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm grow sm:grow-0">
              <span className="text-sm font-medium text-slate-600 shrink-0">校名標題:</span>
              <input 
                type="text" 
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="例如：臺北市內湖區康寧國民小學圖書館"
                className="w-full sm:w-80 md:w-96 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
              />
            </div>

            {/* 微調偏移量 */}
            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm w-fit">
              <div className="flex items-center gap-2 text-slate-600">
                <Settings2 size={16} />
                <span className="text-sm font-medium">列印偏移微調 (mm):</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">X:</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={offsets.x}
                    onChange={(e) => setOffsets(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Y:</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={offsets.y}
                    onChange={(e) => setOffsets(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 ml-2 max-w-[150px] hidden md:block">正值向右/下，負值向左/上</p>
            </div>

            {/* 分類邊框套色設定按鈕 */}
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shadow-sm cursor-pointer ${
                showColorPicker
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Palette size={16} className={showColorPicker ? 'text-blue-600' : 'text-slate-500'} />
              <span>十大分類書標套色設定</span>
              {showColorPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* 十大分類書標顏色展開面板 */}
          {showColorPicker && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm transition-all">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Palette size={16} className="text-blue-600" />
                  十大分類書標邊框套色自訂 (0~9類)
                </span>
                <button
                  onClick={() => setClassificationColors(DEFAULT_CLASSIFICATION_COLORS)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-2.5 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  恢復預設套色
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.keys(DEFAULT_CLASSIFICATION_COLORS).map((digit) => (
                  <div key={digit} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <input
                      type="color"
                      value={classificationColors[digit] || '#cccccc'}
                      onChange={(e) => setClassificationColors(prev => ({ ...prev, [digit]: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-700 truncate" title={CLASSIFICATION_LABELS[digit]}>{CLASSIFICATION_LABELS[digit]}</div>
                      <input
                        type="text"
                        value={classificationColors[digit] || ''}
                        onChange={(e) => setClassificationColors(prev => ({ ...prev, [digit]: e.target.value }))}
                        className="text-[11px] font-mono text-slate-500 bg-transparent uppercase w-full outline-none focus:text-blue-600"
                        maxLength={7}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isInIframe && (
            <p className="text-amber-600 text-sm mt-4 flex items-center gap-1 bg-amber-50 p-2 rounded border border-amber-100">
              <ExternalLink size={14} />
              提示：為確保列印比例正確，請點擊右側「在新分頁開啟」按鈕後再進行列印。
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 size={18} />
            清空表格
          </button>
          {isInIframe && (
            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-md font-medium cursor-pointer"
            >
              <ExternalLink size={18} />
              在新分頁開啟
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium cursor-pointer"
          >
            <Printer size={18} />
            列印標籤
          </button>
        </div>
      </div>

      {/* Input Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        {entries.map((entry, index) => {
          const isLeft = index % 2 === 0;
          const colNum = Math.floor(index / 2) + 1;
          const labelText = isLeft ? `左 ${colNum}` : `右 ${colNum}`;
          
          return (
            <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`h-6 px-2.5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isLeft 
                      ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {labelText}
                  </span>
                </div>
                
                {index % 2 === 1 && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={syncWithLeft[index]}
                      onChange={() => toggleSync(index)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-500 group-hover:text-blue-600 transition-colors">同左</span>
                  </label>
                )}
              </div>
              <div className={`grid grid-cols-2 gap-3 ${index % 2 === 1 && syncWithLeft[index] ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">登錄號</label>
                <input
                  type="text"
                  value={entry.accessionNumber}
                  onChange={(e) => updateEntry(entry.id, 'accessionNumber', e.target.value)}
                  placeholder="5-10位數字"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">書名</label>
                <input
                  type="text"
                  value={entry.title}
                  onChange={(e) => updateEntry(entry.id, 'title', e.target.value)}
                  placeholder="輸入書名"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">分類號</label>
                <input
                  type="text"
                  value={entry.classification}
                  onChange={(e) => updateEntry(entry.id, 'classification', e.target.value)}
                  placeholder="例如: 857.7"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">作者號</label>
                <input
                  type="text"
                  value={entry.authorNumber}
                  onChange={(e) => updateEntry(entry.id, 'authorNumber', e.target.value)}
                  placeholder="例如: 8442"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 mb-1 block">冊次/複本</label>
                <input
                  type="text"
                  value={entry.volumeCopy}
                  onChange={(e) => updateEntry(entry.id, 'volumeCopy', e.target.value)}
                  placeholder="例如: v.1 c.2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>
        );})}
      </div>

      {/* Print Preview Area (Hidden on screen, shown on print) */}
      <div className="hidden print:block bg-white w-[21cm] h-[29.7cm] mx-auto overflow-hidden relative">
        <div 
          className="grid grid-cols-2 grid-rows-10 w-[17.8cm] h-[26.8cm] absolute"
          style={{ 
            top: `${1.6 + offsets.y/10}cm`,
            left: `${1.6 + offsets.x/10}cm`
          }}
        >
          {entries.map((entry, index) => (
            <div key={entry.id} style={{ paddingLeft: index % 2 === 1 ? '0.2cm' : '0' }}>
              <BarcodeComponent 
                entry={entry} 
                schoolName={schoolName}
                classificationColors={classificationColors}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Global CSS for Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght=400;500;700&display=swap');
        
        @theme {
          --font-kai: "標楷體", "DFKai-SB", "BiauKai", "KaiTi", serif;
          --font-mono: "Consolas", "Courier New", monospace;
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100vh !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          body {
            background: white;
          }
          .print-hidden {
            display: none !important;
          }
        }

        .font-kai {
          font-family: var(--font-kai);
        }
        
        .font-mono {
          font-family: var(--font-mono);
        }
      `}} />
    </div>
  );
}

