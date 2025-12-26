
import { SearchMode } from '../types/search';
import WebSearchResults from './WebSearchResults';
import ImageGallery from './ImageGallery';
import VideoGallery from './VideoGallery';
import ShoppingGallery from './ShoppingGallery';
import PlacesGallery from './PlacesGallery';
import {
  WebSearchResponse,
  ImageSearchResponse,
  VideoSearchResponse,
  ShoppingSearchResponse,
  PlacesSearchResponse
} from '../types/search';

interface SearchResultsProps {
  mode: SearchMode;
  results: any;
  query: string;
  loading?: boolean;
  onChatWithUrl?: (url: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ mode, results, query, loading = false, onChatWithUrl }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue-light dark:border-google-blue mx-auto mb-4"></div>
          <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary">Searching {mode}...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const renderResultsHeader = () => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-google-light-text-primary dark:text-google-dark-text-primary mb-2">
        Search results for "{query}"
      </h2>
      <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary text-sm">
        Showing {mode} results
      </p>
    </div>
  );

  const renderResults = () => {
    switch (mode) {
      case 'web':
        const webResults = results as WebSearchResponse;
        if (!webResults.organic || webResults.organic.length === 0) {
          return (
            <div className="text-center py-12">
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary">No web results found for your search.</p>
            </div>
          );
        }
        return <WebSearchResults results={webResults} onChatWithUrl={onChatWithUrl} />;

      case 'images':
        const imageResults = results as ImageSearchResponse;
        if (!imageResults.images || imageResults.images.length === 0) {
          return (
            <div className="text-center py-12">
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary">No images found for your search.</p>
            </div>
          );
        }
        return (
          <>
            {renderResultsHeader()}
            <ImageGallery images={imageResults.images} />
          </>
        );

      case 'videos':
        const videoResults = results as VideoSearchResponse;
        if (!videoResults.videos || videoResults.videos.length === 0) {
          return (
            <div className="text-center py-12">
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary">No videos found for your search.</p>
            </div>
          );
        }
        return (
          <>
            {renderResultsHeader()}
            <VideoGallery videos={videoResults.videos} onChatWithUrl={onChatWithUrl} />
          </>
        );

      case 'shopping':
        const shoppingResults = results as ShoppingSearchResponse;
        if (!shoppingResults.shopping || shoppingResults.shopping.length === 0) {
          return (
            <div className="text-center py-12">
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary">No products found for your search.</p>
            </div>
          );
        }
        return (
          <>
            {renderResultsHeader()}
            <ShoppingGallery products={shoppingResults.shopping} />
          </>
        );

      case 'places':
        const placesResults = results as PlacesSearchResponse;
        if (!placesResults.places || placesResults.places.length === 0) {
          return (
            <div className="text-center py-12">
              <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary">No places found for your search.</p>
            </div>
          );
        }
        return (
          <>
            {renderResultsHeader()}
            <PlacesGallery places={placesResults.places} />
          </>
        );

      default:
        return (
          <div className="text-center py-12">
            <p className="text-google-light-text-secondary dark:text-google-dark-text-secondary">Unknown search mode: {mode}</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {renderResults()}
    </div>
  );
};

export default SearchResults;