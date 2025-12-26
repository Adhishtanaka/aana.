import { useState } from 'react';
import { ImageResult } from '../types/search';
import { RiCloseLine } from 'react-icons/ri';

interface ImageGalleryProps {
  images: ImageResult[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No images found for your search.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg"
            onClick={() => setSelectedImage(image)}
          >
            <div className="aspect-square">
              <img
                src={image.thumbnailUrl}
                alt={image.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs truncate">{image.title}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <RiCloseLine size={24} />
            </button>
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <h3 className="text-white font-medium mb-2">{selectedImage.title}</h3>
              <p className="text-gray-300 text-sm">{selectedImage.source}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGallery;