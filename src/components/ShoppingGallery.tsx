
import { ShoppingResult } from '../types/search';
import { RiExternalLinkLine } from 'react-icons/ri';

interface ShoppingGalleryProps {
  products: ShoppingResult[];
}

const ShoppingGallery: React.FC<ShoppingGalleryProps> = ({ products }) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found for your search.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg cursor-pointer"
          onClick={() => window.open(product.link, '_blank')}
        >
          <div className="aspect-square bg-gray-100">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          
          <div className="p-4">
            <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
              {product.title}
            </h3>
            
            <div className="mb-3">
              <span className="text-green-600 font-bold text-lg">
                {product.price || 'Price not available'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm truncate">{product.source}</span>
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <span>View</span>
                <RiExternalLinkLine size={14} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShoppingGallery;