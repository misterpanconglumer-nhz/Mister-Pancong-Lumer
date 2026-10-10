'use client';

import React, { useState } from 'react';
import { X, Delete, Equal } from 'lucide-react';
import { formatRupiah } from '@/lib/utils/formatters';

interface CalculatorModalProps {
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ onClose }) => {
  const [display, setDisplay] = useState<string>('0');
  const [formula, setFormula] = useState<string>('');

  const handleNum = (num: string) => {
    if (display === '0') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOp = (op: string) => {
    setFormula(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setFormula('');
  };

  const handleBack = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleEqual = () => {
    try {
      const fullExpr = (formula + display).replace(/×/g, '*').replace(/÷/g, '/');
      // eslint-disable-next-line no-eval
      const result = eval(fullExpr);
      setDisplay(String(result));
      setFormula('');
    } catch {
      setDisplay('Error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-brand-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide">Kalkulator Kasir</h3>
          <button onClick={onClose} className="p-1 text-amber-200 hover:text-white rounded-lg hover:bg-brand-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-900 text-right text-white">
          <div className="text-xs text-amber-400 font-mono h-5 overflow-hidden">{formula}</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-100 truncate">{display}</div>
          {numIsNumber(display) && (
            <div className="text-[11px] text-slate-400 mt-1 font-sans">{formatRupiah(Number(display))}</div>
          )}
        </div>

        {/* Grid Buttons */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-slate-50">
          <button onClick={handleClear} className="p-3 rounded-2xl bg-rose-100 text-rose-700 font-bold text-sm hover:bg-rose-200">
            C
          </button>
          <button onClick={handleBack} className="p-3 rounded-2xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 flex items-center justify-center">
            <Delete className="w-4 h-4" />
          </button>
          <button onClick={() => handleOp('÷')} className="p-3 rounded-2xl bg-amber-200 text-amber-900 font-bold text-lg hover:bg-amber-300">
            ÷
          </button>
          <button onClick={() => handleOp('×')} className="p-3 rounded-2xl bg-amber-200 text-amber-900 font-bold text-lg hover:bg-amber-300">
            ×
          </button>

          <button onClick={() => handleNum('7')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            7
          </button>
          <button onClick={() => handleNum('8')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            8
          </button>
          <button onClick={() => handleNum('9')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            9
          </button>
          <button onClick={() => handleOp('-')} className="p-3 rounded-2xl bg-amber-200 text-amber-900 font-bold text-lg hover:bg-amber-300">
            -
          </button>

          <button onClick={() => handleNum('4')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            4
          </button>
          <button onClick={() => handleNum('5')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            5
          </button>
          <button onClick={() => handleNum('6')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            6
          </button>
          <button onClick={() => handleOp('+')} className="p-3 rounded-2xl bg-amber-200 text-amber-900 font-bold text-lg hover:bg-amber-300">
            +
          </button>

          <button onClick={() => handleNum('1')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            1
          </button>
          <button onClick={() => handleNum('2')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            2
          </button>
          <button onClick={() => handleNum('3')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            3
          </button>
          <button onClick={handleEqual} className="row-span-2 p-3 rounded-2xl bg-amber-500 text-brand-900 font-bold hover:bg-amber-600 flex items-center justify-center shadow-lg">
            <Equal className="w-6 h-6" />
          </button>

          <button onClick={() => handleNum('0')} className="col-span-2 p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            0
          </button>
          <button onClick={() => handleNum('00')} className="p-3.5 rounded-2xl bg-white text-slate-800 font-bold text-base shadow-sm hover:bg-slate-100">
            00
          </button>
        </div>

      </div>
    </div>
  );
};

function numIsNumber(val: string) {
  return !isNaN(Number(val)) && val !== '';
}

export default CalculatorModal;
