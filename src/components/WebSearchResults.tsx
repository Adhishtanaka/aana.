import { useState, useEffect } from 'react';
import { WebSearchResponse } from '../types/search';
import { 
  RiExternalLinkLine, 
  RiArrowDownSLine, 
  RiArrowUpSLine,
  RiRobot2Fill
} from 'react-icons/ri';
import { SearchAPI } from '../services/searchApi';

interface WebSearchResultsProps {
  results: WebSearchResponse;
  onChatWithUrl?: (url: string) => void;
}

const WebSearchResults: React.FC<WebSearchResultsProps> = ({ results, onChatWithUrl }) => {
  const [expandedPAA, setExpandedPAA] = useState<number | null>(null);
  const [urlAccessibility, setUrlAccessibility] = useState<Record<string, { accessible: boolean; reason: string; checked: boolean }>>({});

  const togglePAA = (index: number) => {
    setExpandedPAA(expandedPAA === index ? null : index);
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  useEffect(() => {
    const checkUrls = async () => {
      const urlsToCheck = results.organic.map(result => result.link);
      
      for (const url of urlsToCheck) {
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        
        if (!urlAccessibility[url]?.checked || isYouTube) {
          try {
            const result = await SearchAPI.checkUrlAccessibility(url);
            setUrlAccessibility(prev => ({
              ...prev,
              [url]: { ...result, checked: true }
            }));
          } catch (error) {
            setUrlAccessibility(prev => ({
              ...prev,
              [url]: { accessible: false, reason: 'Failed to check', checked: true }
            }));
          }
        }
      }
    };

    checkUrls();
  }, [results.organic]);

  return (
    <div className="space-y-6">
      {results.knowledgeGraph && (
        <div className="bg-google-light-surface dark:bg-google-dark-surface rounded-lg p-6 border border-google-light-border dark:border-google-dark-border google-elevation-1">
          <div className="flex gap-6">
            {results.knowledgeGraph.imageUrl && (
              <img
                src={results.knowledgeGraph.imageUrl}
                alt={results.knowledgeGraph.title}
                className="w-32 h-32 object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-google-light-text-primary dark:text-google-dark-text-primary mb-2">
                {results.knowledgeGraph.title}
              </h2>
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary mb-4">{results.knowledgeGraph.description}</p>
              {results.knowledgeGraph.website && (
                <a
                  href={results.knowledgeGraph.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-google-blue-light dark:text-google-blue hover:text-blue-700 dark:hover:text-google-blue-hover"
                >
                  Visit website
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {results.organic.map((result, index) => {
          const urlStatus = urlAccessibility[result.link];
          
          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-google-green-light dark:text-google-green text-sm">{formatUrl(result.link)}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-google-light-text-secondary dark:text-google-dark-text-secondary hover:text-google-light-text-primary dark:hover:text-google-dark-text-primary"
                  >
                    <RiExternalLinkLine size={16} />
                  </a>
                  {urlStatus?.accessible && onChatWithUrl && (
                    <button
                      onClick={() => onChatWithUrl(result.link)}
                      className="flex items-center gap-1 px-2 py-1 bg-google-light-surface dark:bg-google-dark-surface hover:bg-google-light-hover dark:hover:bg-google-dark-hover text-google-light-text-primary dark:text-google-dark-text-primary rounded text-xs google-focus"
                    >
                      <RiRobot2Fill size={12} />
                      Chat
                    </button>
                  )}
                </div>
              </div>
              
              <h3 className="text-xl text-google-blue-light dark:text-google-blue hover:text-blue-700 dark:hover:text-google-blue-hover mb-2">
                <a href={result.link} target="_blank" rel="noopener noreferrer">
                  {result.title}
                </a>
              </h3>
              
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary text-sm leading-relaxed">
                {result.snippet}
              </p>
            </div>
          );
        })}
      </div>

      {results.peopleAlsoAsk && results.peopleAlsoAsk.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 p-4 border-b border-gray-200">
            People also ask
          </h3>
          <div className="divide-y divide-gray-200">
            {results.peopleAlsoAsk.map((paa, index) => (
              <div key={index}>
                <button
                  onClick={() => togglePAA(index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <span className="text-gray-900 pr-4">{paa.question}</span>
                  {expandedPAA === index ? (
                    <RiArrowUpSLine size={20} className="text-gray-400" />
                  ) : (
                    <RiArrowDownSLine size={20} className="text-gray-400" />
                  )}
                </button>
                
                {expandedPAA === index && (
                  <div className="px-4 pb-4">
                    <p className="text-gray-700 text-sm mb-3">{paa.snippet}</p>
                    <a
                      href={paa.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {paa.title}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSearchResults;