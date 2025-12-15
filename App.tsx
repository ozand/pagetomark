import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ResultViewer } from './components/ResultViewer';
import { convertUrlToMarkdown } from './services/converter';
import { LoadingState, ConversionResult } from './types';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConvert = async (url: string) => {
    setLoadingState(LoadingState.FETCHING);
    setErrorMessage(null);
    setResult(null);

    try {
      const data = await convertUrlToMarkdown(url);
      setResult(data);
      setLoadingState(LoadingState.SUCCESS);
    } catch (error: any) {
      setLoadingState(LoadingState.ERROR);
      setErrorMessage(error.message || 'An unexpected error occurred during conversion.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        <div className="flex flex-col items-center">
          <InputForm onConvert={handleConvert} loadingState={loadingState} />

          {loadingState === LoadingState.ERROR && errorMessage && (
            <div className="w-full max-w-3xl mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    <span className="font-bold">Error:</span> {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && <ResultViewer result={result} />}
        </div>
        
        <footer className="mt-16 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} PageToMark. Runs entirely in your browser.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;