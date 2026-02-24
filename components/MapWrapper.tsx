import React, { useEffect, useState, useRef, useMemo } from 'react';
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

// Marker size: doubled from 40x40 to 80x80
const MARKER_SIZE = 80;

// Custom Icon definition - now with showTitle parameter and draggable styling
const createCustomIcon = (photoUrl?: string, title?: string, showTitle: boolean = false, isDraggable: boolean = false) => {
  const html = `
    <div class="relative group cursor-pointer transition-transform hover:scale-110" style="width: ${MARKER_SIZE}px; height: ${MARKER_SIZE}px;">
      <div class="absolute inset-0 bg-white rounded-full shadow-lg border-2 ${isDraggable ? 'border-primary ring-4 ring-primary/30' : 'border-white'} overflow-hidden z-10">
        ${photoUrl 
          ? `<img src="${photoUrl}" class="w-full h-full object-cover" />` 
          : `<div class="w-full h-full bg-primary flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
             </div>`
        }
      </div>
      <!-- Pointer Tip -->
      <div class="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-4 h-4 ${isDraggable ? 'bg-primary' : 'bg-white'} rotate-45 shadow-sm z-0"></div>
      
      <!-- Title Label: always visible when showTitle is true, otherwise only on hover -->
      ${title ? `
        <span class="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-white/95 backdrop-blur px-2 py-1 rounded-md text-sm font-bold text-slate-800 shadow-md whitespace-nowrap ${showTitle ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200 pointer-events-none z-20 max-w-[150px] truncate">
          ${title}
        </span>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'custom-map-marker-container', // Empty class to avoid default styles
    html: html,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE + 4], // Half width, full height + tip offset
    popupAnchor: [0, -MARKER_SIZE],
  });
};

interface MapWrapperProps {
  memories: Memory[];
  onMapClick?: (lat: number, lng: number) => void;
  onMemoryClick: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  draggableMarker?: boolean;
  onMarkerDrag?: (lat: number, lng: number) => void;
}

const isValidLatLng = (lat: any, lng: any): boolean => {
  return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
};

const MapEvents: React.FC<{ 
  onClick?: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
}> = ({ onClick, onZoomChange }) => {
  const map = useMap();
  
  useMapEvents({
    contextmenu(e) {
      // Normalize longitude to be within -180 to 180 to save consistent data
      // even if user clicks on a "wrapped" world instance
      const wrappedLng = e.latlng.wrap().lng;
      if (onClick) onClick(e.latlng.lat, wrappedLng);
    },
    zoomend() {
      if (onZoomChange) onZoomChange(map.getZoom());
    },
  });
  
  // Report initial zoom level
  useEffect(() => {
    if (onZoomChange) onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  
  return null;
};

const MapController: React.FC<{ center?: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();

  // CRITICAL FIX: Invalidate map size on mount to ensure tiles load correctly
  // This fixes the issue where the map has white gaps on initial load/refresh
  useEffect(() => {
    // Initial invalidation
    map.invalidateSize();
    
    // Delayed invalidation to handle any flexbox layout shifts
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (center && isValidLatLng(center[0], center[1])) {
      // Use flyTo for smooth transitions, but ensure we don't spam it
      // The dependency array handles checks, but checking distance might be good optimization later
      map.flyTo(center, zoom ?? map.getZoom(), { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

// Draggable Marker Component
interface DraggableMarkerProps {
  memory: Memory;
  icon: L.DivIcon;
  onDrag: (lat: number, lng: number) => void;
  onClick: () => void;
}

const DraggableMarker: React.FC<DraggableMarkerProps> = ({ memory, icon, onDrag, onClick }) => {
  const markerRef = useRef<L.Marker>(null);
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const pos = marker.getLatLng();
          // Normalize longitude to [-180, 180] range when marker crosses dateline
          // The formula handles wrap-around: e.g., 190° becomes -170°, -200° becomes 160°
          const wrappedLng = ((pos.lng + 180) % 360 + 360) % 360 - 180;
          onDrag(pos.lat, wrappedLng);
        }
      },
      click: onClick,
    }),
    [onDrag, onClick]
  );

  return (
    <Marker
      ref={markerRef}
      position={[memory.lat, memory.lng]}
      icon={icon}
      draggable={true}
      eventHandlers={eventHandlers}
    />
  );
};

// Zoom threshold for showing titles: province level is around zoom 8 or less
const TITLE_SHOW_ZOOM_THRESHOLD = 6;

export const MapWrapper: React.FC<MapWrapperProps> = ({ 
  memories, 
  onMapClick, 
  onMemoryClick,
  center = INITIAL_CENTER,
  zoom = INITIAL_ZOOM,
  interactive = true,
  draggableMarker = false,
  onMarkerDrag
}) => {
  const [currentZoom, setCurrentZoom] = useState(zoom);
  
  // Show titles when zoomed out to province level or more
  const showTitles = currentZoom >= TITLE_SHOW_ZOOM_THRESHOLD;
  
  // Ensure center is valid, otherwise fallback to INITIAL_CENTER
  const safeCenter: [number, number] = isValidLatLng(center[0], center[1]) 
    ? center 
    : INITIAL_CENTER;

  // Limits for the Web Mercator projection (approx 85 degrees latitude)
  // We use -Infinity/Infinity for longitude to allow infinite horizontal scrolling
  const MAX_BOUNDS: L.LatLngBoundsExpression = [
    [-85, -Infinity],
    [85, Infinity]
  ];

  return (
    <MapContainer 
      center={safeCenter} 
      zoom={zoom} 
      scrollWheelZoom={interactive} 
      dragging={interactive}
      zoomControl={false}
      doubleClickZoom={interactive}
      className="w-full h-full z-0 outline-none"
      minZoom={3} // Prevent user from zooming out too far (avoid white edges at high latitudes)
      maxBounds={MAX_BOUNDS} // Prevent user from panning vertically into the void
      maxBoundsViscosity={1.0} // Hard stop at bounds
      worldCopyJump={true} // Jump back to original world copy when panning horizontally so markers stay visible
    >
      <TileLayer 
        attribution={MAP_ATTRIBUTION} 
        url={MAP_TILE_URL} 
        // Ensure tiles load even if map thinks it's small initially
        className="map-tiles"
      />
      <ZoomControl position="bottomright" />
      
      {interactive && <MapEvents onClick={onMapClick} onZoomChange={setCurrentZoom} />}
      <MapController center={safeCenter} zoom={zoom} />

      {memories.map((memory) => {
        // Skip invalid markers to prevent crash
        if (!isValidLatLng(memory.lat, memory.lng)) return null;
        
        const icon = createCustomIcon(
          memory.photos.length > 0 ? memory.photos[0].url : undefined,
          memory.locationName,
          showTitles,
          draggableMarker
        );
        
        // Use draggable marker if enabled
        if (draggableMarker && onMarkerDrag) {
          return (
            <DraggableMarker
              key={memory.id}
              memory={memory}
              icon={icon}
              onDrag={onMarkerDrag}
              onClick={() => onMemoryClick(memory.id)}
            />
          );
        }
        
        return (
          <Marker
            key={memory.id}
            position={[memory.lat, memory.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onMemoryClick(memory.id),
            }}
          >
          </Marker>
        );
      })}
    </MapContainer>
  );
};