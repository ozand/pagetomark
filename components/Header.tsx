import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="mb-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-2">
        Page<span className="text-indigo-600">To</span>Mark
      </h1>
      <p className="text-lg text-slate-600 max-w-2xl mx-auto">
        Convert any web article into clean Markdown for reading, archiving, or LLM context.
        Powered by <span className="font-medium text-slate-800">Readability.js</span> and <span className="font-medium text-slate-800">Turndown</span>.
      </p>
    </header>
  );
};