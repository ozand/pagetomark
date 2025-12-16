import React, { useState } from 'react';
import { ConversionResult } from '../types';

interface ResultViewerProps {
  result: ConversionResult;
  onDownloadAll?: () => void;
  showDownloadAll?: boolean;
  completedCount?: number;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ result, onDownloadAll, showDownloadAll, completedCount }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'markdown' | 'rendered'>('markdown');

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
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-800 truncate max-w-md" title={result.title}>
              {result.title}
            </h3>
            <span className="text-xs text-slate-500">
              Generated: {result.timestamp}
            </span>
          </div>
        </div>

        {/* Action buttons above content */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-2 justify-end items-center">
          {showDownloadAll && (
            <button
              onClick={onDownloadAll}
              disabled={!completedCount || completedCount === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
              style={{
                cursor: !completedCount || completedCount === 0 ? 'not-allowed' : 'pointer',
                opacity: !completedCount || completedCount === 0 ? 0.5 : 1
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Скачать все ({completedCount || 0})
            </button>
          )}
          
          <button
            onClick={() => setViewMode(viewMode === 'markdown' ? 'rendered' : 'markdown')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {viewMode === 'markdown' ? 'Превью' : 'Markdown'}
          </button>

          <button
            onClick={handleCopy}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${copied
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

        {/* Content Area */}
        <div className="flex-1 relative bg-slate-50 overflow-auto">
          {viewMode === 'markdown' ? (
            <textarea
              readOnly
              value={result.markdown}
              className="w-full h-full p-6 resize-none outline-none font-mono text-sm leading-6 text-slate-800 bg-slate-50 border-none focus:ring-0"
              spellCheck={false}
            />
          ) : (
            <div
              className="prose prose-slate max-w-none p-6 h-full overflow-auto"
              dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(result.markdown) }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Simple markdown to HTML converter
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n/gim, '</p><p>');
  html = '<p>' + html + '</p>';

  // Line breaks
  html = html.replace(/\n/gim, '<br>');

  return html;
}