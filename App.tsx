import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ResultViewer } from './components/ResultViewer';
import { LinksList } from './components/LinksList';
import { convertUrlToMarkdown } from './services/converter';
import { isYouTubeUrl, getYouTubeTranscript } from './services/youtube';
import { LoadingState, ConversionResult, ProcessedLink } from './types';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [links, setLinks] = useState<ProcessedLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConvert = async (url: string) => {
    const linkId = Date.now().toString();
    const newLink: ProcessedLink = {
      id: linkId,
      url,
      status: 'processing'
    };

    setLinks(prev => [...prev, newLink]);
    setLoadingState(LoadingState.FETCHING);
    setErrorMessage(null);

    try {
      let data: ConversionResult;
      
      // Check if it's a YouTube URL
      if (isYouTubeUrl(url)) {
        data = await getYouTubeTranscript(url);
      } else {
        data = await convertUrlToMarkdown(url);
      }
      
      setLinks(prev => prev.map(link =>
        link.id === linkId
          ? { ...link, status: 'completed', result: data }
          : link
      ));
      setSelectedLinkId(linkId);
      setLoadingState(LoadingState.SUCCESS);
    } catch (error: any) {
      setLinks(prev => prev.map(link =>
        link.id === linkId
          ? { ...link, status: 'error', error: error.message }
          : link
      ));
      setLoadingState(LoadingState.ERROR);
      setErrorMessage(error.message || 'An unexpected error occurred during conversion.');
    }
  };

  const handleSelectLink = (id: string) => {
    setSelectedLinkId(id);
    setErrorMessage(null);
  };

  const handleRemoveLink = (id: string) => {
    setLinks(prev => prev.filter(link => link.id !== id));
    if (selectedLinkId === id) {
      setSelectedLinkId(null);
    }
  };

  const handleClearAll = () => {
    setLinks([]);
    setSelectedLinkId(null);
    setErrorMessage(null);
  };

  const handleDownloadAll = () => {
    const completedLinks = links.filter(link => link.status === 'completed' && link.result);
    if (completedLinks.length === 0) return;

    const combinedMarkdown = completedLinks.map((link, index) => {
      const result = link.result!;
      // Since result.markdown already contains metadata and title, just use it
      return result.markdown;
    }).join('\n\n---\n\n');

    const blob = new Blob([combinedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combined-links-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedLink = links.find(link => link.id === selectedLinkId);
  const selectedResult = selectedLink?.status === 'completed' ? selectedLink.result : null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Left Column */}
          <div>
            <InputForm onConvert={handleConvert} loadingState={loadingState} />

            {links.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={handleDownloadAll}
                  disabled={links.filter(l => l.status === 'completed').length === 0}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: links.filter(l => l.status === 'completed').length === 0 ? 'not-allowed' : 'pointer',
                    opacity: links.filter(l => l.status === 'completed').length === 0 ? 0.5 : 1,
                    marginBottom: '0.5rem'
                  }}
                >
                  📥 Скачать все ({links.filter(l => l.status === 'completed').length})
                </button>
              </div>
            )}

            <LinksList
              links={links}
              selectedId={selectedLinkId}
              onSelectLink={handleSelectLink}
              onRemoveLink={handleRemoveLink}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Right Column */}
          <div>
            {loadingState === LoadingState.ERROR && errorMessage && (
              <div className="w-full mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
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

            {selectedResult ? (
              <ResultViewer
                result={selectedResult}
                onDownloadAll={handleDownloadAll}
                showDownloadAll={links.length > 0}
                completedCount={links.filter(l => l.status === 'completed').length}
              />
            ) : links.length > 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '2px dashed #e5e7eb'
              }}>
                <p>Выберите ссылку из списка для просмотра markdown</p>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="mt-16 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} PageToMark. Runs entirely in your browser.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;