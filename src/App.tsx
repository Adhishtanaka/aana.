import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RiSearchLine, RiSunLine, RiMoonLine } from "react-icons/ri";
import SearchInterface from "./components/SearchInterface";
import SearchResults from "./components/SearchResults";
import AIChat from "./components/AIChat";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useThemeStore } from "./stores/themeStore";
import { useSearch } from "./hooks/useSearch";
import { queryClient } from "./lib/queryClient";

function AppContent() {
  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const { theme, toggleTheme, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);
  
  const {
    searchState,
    setQuery,
    switchMode,
    clearResults,
    retrySearch,
    executeSearch,
  } = useSearch();

  const handleChatWithUrl = (url: string) => {
    setSelectedUrl(url);
    setShowAIChat(true);
  };

  const handleGeneralChat = () => {
    setSelectedUrl(null);
    setShowAIChat(true);
  };

  return (
    <div className="min-h-screen bg-google-light-bg dark:bg-google-dark-bg transition-colors">
      <header className="bg-google-light-bg dark:bg-google-dark-bg border-b border-google-light-border dark:border-google-dark-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-medium text-google-light-text-primary dark:text-google-dark-text-primary">
            <a href="/" className="hover:text-google-light-text-secondary dark:hover:text-google-dark-text-secondary transition-colors">Aana</a>
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-google-light-surface dark:bg-google-dark-surface text-google-light-text-secondary dark:text-google-dark-text-secondary hover:bg-google-light-hover dark:hover:bg-google-dark-hover transition-colors google-focus"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <RiMoonLine size={20} /> : <RiSunLine size={20} />}
          </button>
        </div>
      </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {!searchState.results ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <RiSearchLine size={64} className="text-google-light-border dark:text-google-dark-text-disabled mb-8" />
              <h1 className="text-4xl font-light mb-4 text-google-light-text-primary dark:text-google-dark-text-primary">Search</h1>
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary mb-12 max-w-md">
                Search across web, images, videos, shopping, and places
              </p>
              <SearchInterface
                query={searchState.query}
                mode={searchState.mode}
                loading={searchState.loading}
                onQueryChange={setQuery}
                onModeChange={switchMode}
                onSearch={executeSearch}
                onClear={clearResults}
                onAIChat={handleGeneralChat}
              />
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <SearchInterface
                  query={searchState.query}
                  mode={searchState.mode}
                  loading={searchState.loading}
                  onQueryChange={setQuery}
                  onModeChange={switchMode}
                  onSearch={executeSearch}
                  onClear={clearResults}
                  onAIChat={handleGeneralChat}
                />
              </div>
              <SearchResults
                mode={searchState.mode}
                results={searchState.results}
                query={searchState.query}
                loading={searchState.loading}
                onChatWithUrl={handleChatWithUrl}
              />
            </div>
          )}

          {searchState.error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-google-dark-surface border border-google-red-light dark:border-google-red rounded-lg google-elevation-1">
              <p className="text-google-red-light dark:text-google-red">{searchState.error?.message || 'An error occurred'}</p>
              <button
                onClick={() => retrySearch()}
                className="mt-2 text-google-red-light dark:text-google-red hover:underline google-focus"
              >
                Retry
              </button>
            </div>
          )}
        </main>

        <AIChat
          isOpen={showAIChat}
          onClose={() => {
            setShowAIChat(false);
            setSelectedUrl(null);
          }}
          specificUrl={selectedUrl || undefined}
          initialQuery={searchState.query || undefined}
        />

        <footer className="text-center py-4 text-sm text-google-light-text-secondary dark:text-google-dark-text-secondary">
          made by adhishtanaka
        </footer>
      </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}