import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Memory } from '../types';
import { MAP_TILE_URL, MAP_ATTRIBUTION, INITIAL_CENTER, INITIAL_ZOOM } from '../constants';

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon definition
const createCustomIcon = (photoUrl?: string, title?: string) => {
  // CRITICAL FIX:
  // 1. Removed `-translate-x-1/2 -translate-y-full`. The `iconAnchor` handles the positioning.
  // 2. The div is now 40x40. `iconAnchor: [20, 40]` means the bottom-center of this 40x40 box is placed at the coordinate.
  // 3. Added a Title label that appears to the right.
  const html = `
    <div class="relative w-10 h-10 group cursor-pointer transition-transform hover:scale-110">
      <div class="absolute inset-0 bg-white rounded-full shadow-lg border-2 border-white overflow-hidden z-10">
        ${photoUrl 
          ? `<img src="${photoUrl}" class="w-full h-full object-cover" />` 
          : `<div class="w-full h-full bg-primary flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>`
        }
      </div>
      <!-- Pointer Tip -->
      <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rotate-45 shadow-sm z-0"></div>
      
      <!-- Title Label (Visible on hover or if map is zoomed in - handled by CSS or just always there) -->
      ${title ? `
        <span class="absolute left-[85%] top-1/2 -translate-y-1/2 ml-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold text-slate-800 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
          ${title}
        </span>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'custom-map-marker-container', // Empty class to avoid default styles
    html: html,
    iconSize: [40, 40],
    iconAnchor: [20, 42], // 20 (half width), 42 (full height + slight tip offset)
    popupAnchor: [0, -40],
  });
};

interface MapWrapperProps {
  memories: Memory[];
  onMapClick?: (lat: number, lng: number) => void;
  onMemoryClick: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
}

const MapEvents: React.FC<{ onClick?: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({
    contextmenu(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapController: React.FC<{ center?: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom ?? map.getZoom(), { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

export const MapWrapper: React.FC<MapWrapperProps> = ({ 
  memories, 
  onMapClick, 
  onMemoryClick,
  center = INITIAL_CENTER,
  zoom = INITIAL_ZOOM,
  interactive = true 
}) => {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      scrollWheelZoom={interactive} 
      dragging={interactive}
      zoomControl={false}
      doubleClickZoom={interactive}
      className="w-full h-full z-0"
    >
      <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
      <ZoomControl position="bottomright" />
      
      {interactive && <MapEvents onClick={onMapClick} />}
      <MapController center={center} zoom={zoom} />

      {memories.map((memory) => (
        <Marker
          key={memory.id}
          position={[memory.lat, memory.lng]}
          icon={createCustomIcon(
            memory.photos.length > 0 ? memory.photos[0].url : undefined,
            memory.locationName
          )}
          eventHandlers={{
            click: () => onMemoryClick(memory.id),
          }}
        >
        </Marker>
      ))}
    </MapContainer>
  );
};