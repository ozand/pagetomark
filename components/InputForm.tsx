import React, { useState } from 'react';
import { LoadingState } from '../types';

interface InputFormProps {
  onConvert: (url: string) => void;
  loadingState: LoadingState;
}

export const InputForm: React.FC<InputFormProps> = ({ onConvert, loadingState }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }
    
    try {
      new URL(url); // Validate URL format
      setError(null);
      onConvert(url);
    } catch {
      setError('Please enter a valid URL including http:// or https://');
    }
  };

  const isBusy = loadingState === LoadingState.FETCHING || loadingState === LoadingState.PARSING;

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-white rounded-lg shadow-xl p-2">
          <div className="pl-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste article URL here (e.g., https://example.com/article)"
            className="flex-1 p-4 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 text-lg outline-none w-full"
            disabled={isBusy}
          />
          <button
            type="submit"
            disabled={isBusy}
            className={`px-6 py-3 rounded-md text-white font-medium transition-all duration-200 shadow-lg ${
              isBusy 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30'
            }`}
          >
            {isBusy ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </span>
            ) : (
              'Convert'
            )}
          </button>
        </div>
      </form>
      {error && (
        <p className="mt-2 text-red-500 text-sm font-medium text-center animate-pulse">
          {error}
        </p>
      )}
      <p className="mt-3 text-xs text-center text-slate-400">
        Note: This tool uses a CORS proxy to fetch content client-side. Some websites may block this method.
      </p>
    </div>
  );
};