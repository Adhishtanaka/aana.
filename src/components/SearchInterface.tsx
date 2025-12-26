import { useRef, KeyboardEvent, useState } from 'react';
import { RiSearchLine, RiCloseLine, RiRobot2Fill } from 'react-icons/ri';
import { SearchMode } from '../types/search';

interface SearchInterfaceProps {
  query: string;
  mode: SearchMode;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onModeChange: (mode: SearchMode) => void;
  onSearch: () => void;
  onClear?: () => void;
  onAIChat?: () => void;
}

const modes: { key: SearchMode; label: string }[] = [
  { key: 'web', label: 'Web' },
  { key: 'images', label: 'Images' },
  { key: 'videos', label: 'Videos' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'places', label: 'Places' },
];

const suggestions = [
  'artificial intelligence',
  'climate change',
  'space exploration',
  'renewable energy',
  'machine learning',
  'quantum computing',
];

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  query,
  mode,
  loading,
  onQueryChange,
  onModeChange,
  onSearch,
  onClear,
  onAIChat,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      setShowSuggestions(false);
      onSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onQueryChange(suggestion);
    setShowSuggestions(false);
    setTimeout(() => onSearch(), 0);
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(query.toLowerCase()) && s !== query
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {modes.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors google-focus ${
              mode === key
                ? 'bg-google-blue-light dark:bg-google-blue text-white border-google-blue-light dark:border-google-blue'
                : 'bg-google-light-surface dark:bg-google-dark-surface text-google-light-text-primary dark:text-google-dark-text-primary border-google-light-border dark:border-google-dark-border hover:bg-google-light-hover dark:hover:bg-google-dark-hover'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      
      <div className="relative">
        <div className="flex items-center bg-google-light-bg dark:bg-google-dark-surface border border-google-light-border dark:border-google-dark-border rounded-full google-elevation-1 hover:google-elevation-2 focus-within:google-elevation-2 transition-all">
          <RiSearchLine size={20} className="text-google-light-text-secondary dark:text-google-dark-text-secondary ml-4" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(query.length >= 2)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={`Search ${mode === 'web' ? 'the web' : mode}...`}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-google-light-text-primary dark:text-google-dark-text-primary placeholder-google-light-text-secondary dark:placeholder-google-dark-text-secondary"
          />
          {query && (
            <button
              onClick={() => {
                onQueryChange('');
                if (onClear) onClear();
              }}
              className="p-2 text-google-light-text-secondary dark:text-google-dark-text-secondary hover:text-google-light-text-primary dark:hover:text-google-dark-text-primary google-focus rounded-full"
            >
              <RiCloseLine size={20} />
            </button>
          )}
          <button
            onClick={onSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 mr-2 bg-google-blue-light dark:bg-google-blue text-white rounded-full hover:bg-blue-700 dark:hover:bg-google-blue-hover disabled:bg-google-light-text-disabled dark:disabled:bg-google-dark-text-disabled transition-colors google-focus"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          {onAIChat && query.trim() && (
            <button
              onClick={onAIChat}
              disabled={loading}
              className="p-3 mr-2 bg-google-light-surface dark:bg-google-dark-surface text-google-light-text-primary dark:text-google-dark-text-primary rounded-full hover:bg-google-light-hover dark:hover:bg-google-dark-hover disabled:bg-google-light-text-disabled dark:disabled:bg-google-dark-text-disabled transition-colors google-focus"
              title="Ask AI about this query"
            >
              <RiRobot2Fill size={18} />
            </button>
          )}
        </div>
        
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-google-light-bg dark:bg-google-dark-surface border border-google-light-border dark:border-google-dark-border rounded-lg google-elevation-2 mt-1 z-10">
            {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-google-light-hover dark:hover:bg-google-dark-hover first:rounded-t-lg last:rounded-b-lg transition-colors google-focus"
              >
                <div className="flex items-center">
                  <RiSearchLine size={16} className="text-google-light-text-secondary dark:text-google-dark-text-secondary mr-3" />
                  <span className="text-google-light-text-primary dark:text-google-dark-text-primary">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchInterface;