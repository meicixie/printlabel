import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Trash2, Plus, LayoutGrid, FileText, ExternalLink, Settings2 } from 'lucide-react';

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

const CLASSIFICATION_COLORS: { [key: string]: string } = {
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

const BarcodeComponent: React.FC<{ entry: BookEntry; schoolName: string }> = ({ entry, schoolName }) => {
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
    return CLASSIFICATION_COLORS[firstDigit] || '#cccccc';
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
  const [entries, setEntries] = useState<BookEntry[]>(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      accessionNumber: '',
      title: '',
      classification: '',
      authorNumber: '',
      volumeCopy: '',
    }))
  );

  const [schoolName, setSchoolName] = useState<string>('臺北市內湖區康寧國民小學圖書館');
  const [syncWithLeft, setSyncWithLeft] = useState<boolean[]>(new Array(20).fill(false));
  const [offsets, setOffsets] = useState<PrintOffsets>({ x: -2.5, y: -2.5 });

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
          <p className="text-slate-500 mt-1">A4 規格：2x10 共 20 組標籤</p>
          
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
                className="w-full sm:w-64 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
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
          </div>

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
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Trash2 size={18} />
            清空全部
          </button>
          {isInIframe && (
            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-md font-medium"
            >
              <ExternalLink size={18} />
              在新分頁開啟
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
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
              <BarcodeComponent entry={entry} schoolName={schoolName} />
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
