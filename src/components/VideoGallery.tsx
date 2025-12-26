
import { useState, useEffect } from 'react';
import { VideoResult } from '../types/search';
import { RiPlayFill, RiExternalLinkLine, RiRobot2Fill } from 'react-icons/ri';
import { SearchAPI } from '../services/searchApi';

interface VideoGalleryProps {
  videos: VideoResult[];
  onChatWithUrl?: (url: string) => void;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ videos, onChatWithUrl }) => {
  const [videoAccessibility, setVideoAccessibility] = useState<Record<string, { accessible: boolean; reason: string; checked: boolean }>>({});

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No videos found for your search.</p>
      </div>
    );
  }

  const isYouTubeVideo = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  useEffect(() => {
    const checkVideoAccessibility = async () => {
      const youtubeVideos = videos.filter(video => isYouTubeVideo(video.link));
      
      for (const video of youtubeVideos) {
        if (!videoAccessibility[video.link]?.checked) {
          try {
            const result = await SearchAPI.checkUrlAccessibility(video.link);
            setVideoAccessibility(prev => ({
              ...prev,
              [video.link]: { ...result, checked: true }
            }));
          } catch (error) {
            setVideoAccessibility(prev => ({
              ...prev,
              [video.link]: { accessible: false, reason: 'Failed to check', checked: true }
            }));
          }
        }
      }
    };

    checkVideoAccessibility();
  }, [videos, videoAccessibility]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="relative aspect-video bg-gray-100">
            <img
              src={video.imageUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 cursor-pointer"
                 onClick={() => window.open(video.link, '_blank')}>
              <div className="bg-red-600 rounded-full p-3 hover:bg-red-700">
                <RiPlayFill size={24} className="text-white ml-1" />
              </div>
            </div>
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {video.duration}
              </div>
            )}
          </div>
          
          <div className="p-4">
            <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
              {video.title}
            </h3>
            
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="truncate">{video.channel || video.source}</span>
              {video.date && <span>{video.date}</span>}
            </div>
            
            {video.snippet && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {video.snippet}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <a
                href={video.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
              >
                <span>Watch</span>
                <RiExternalLinkLine size={14} />
              </a>
              
              {isYouTubeVideo(video.link) && onChatWithUrl && videoAccessibility[video.link]?.accessible && (
                <button
                  onClick={() => onChatWithUrl(video.link)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                >
                  <RiRobot2Fill size={12} />
                  Chat about video
                </button>
              )}
              
              {isYouTubeVideo(video.link) && videoAccessibility[video.link]?.checked && !videoAccessibility[video.link]?.accessible && (
                <span className="text-xs text-gray-400 italic">
                  No transcript available
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGallery;