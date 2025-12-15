import React, { useState } from 'react';
import { ConversionResult } from '../types';

interface ResultViewerProps {
  result: ConversionResult;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Create a safe filename
    const safeTitle = result.title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
    link.href = url;
    link.download = `${safeTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[70vh]">
        {/* Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-800 truncate max-w-md" title={result.title}>
              {result.title}
            </h3>
            <span className="text-xs text-slate-500">
              Generated: {result.timestamp}
            </span>
          </div>
          
          <div className="flex gap-2">
             <button
              onClick={handleCopy}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                copied
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-500'
              }`}
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy MD
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-slate-50">
          <textarea
            readOnly
            value={result.markdown}
            className="w-full h-full p-6 resize-none outline-none font-mono text-sm leading-6 text-slate-800 bg-slate-50 border-none focus:ring-0"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};