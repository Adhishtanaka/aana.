
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { PlaceResult } from '../types/search';
import { RiMapPinLine, RiStarFill, RiPhoneLine, RiGlobalLine } from 'react-icons/ri';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PlacesGalleryProps {
  places: PlaceResult[];
}

const PlacesGallery: React.FC<PlacesGalleryProps> = ({ places }) => {
  if (places.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No places found for your search.</p>
      </div>
    );
  }

  const validPlaces = places.filter(place => place.latitude !== 0 && place.longitude !== 0);
  const center = validPlaces.length > 0 
    ? [validPlaces[0].latitude, validPlaces[0].longitude] as [number, number]
    : [40.7128, -74.0060] as [number, number]; 

  return (
    <div className="space-y-6">
      {validPlaces.length > 0 && (
        <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
          <MapContainer
            center={center}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validPlaces.map((place, index) => (
              <Marker
                key={index}
                position={[place.latitude, place.longitude]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 mb-1">{place.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{place.address}</p>
                    {place.rating > 0 && (
                      <div className="flex items-center space-x-1 mb-2">
                        <RiStarFill className="text-yellow-400" size={14} />
                        <span className="text-sm font-medium text-black">{place.rating.toFixed(1)}</span>
                        {place.ratingCount > 0 && (
                          <span className="text-xs text-black">({place.ratingCount})</span>
                        )}
                      </div>
                    )}
                    {place.phoneNumber && (
                      <p className="text-sm text-blue-600">{place.phoneNumber}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {places.map((place, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {place.title}
            </h3>
            
            {place.rating > 0 && (
              <div className="flex items-center space-x-1 mb-2">
                <RiStarFill className="text-yellow-400" size={14} />
                <span className="text-sm font-medium text-black">{place.rating.toFixed(1)}</span>
                {place.ratingCount > 0 && (
                  <span className="text-xs text-gray-500">({place.ratingCount})</span>
                )}
              </div>
            )}

            <div className="flex items-start space-x-2 mb-3">
              <RiMapPinLine className="text-gray-400 mt-1 flex-shrink-0" size={16} />
              <p className="text-gray-600 text-sm">{place.address}</p>
            </div>

            <div className="space-y-1">
              {place.phoneNumber && (
                <div className="flex items-center space-x-2">
                  <RiPhoneLine className="text-gray-400" size={14} />
                  <a
                    href={`tel:${place.phoneNumber}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {place.phoneNumber}
                  </a>
                </div>
              )}
              
              {place.website && (
                <div className="flex items-center space-x-2">
                  <RiGlobalLine className="text-gray-400" size={14} />
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Visit website
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlacesGallery;