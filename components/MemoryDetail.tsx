import React, { useState, useCallback } from 'react';
import { Language, Memory } from '../types';
import { MapWrapper } from './MapWrapper';
import { ArrowLeft, Calendar, MapPin, Trash2, Edit2, Image as ImageIcon, Move, Check, X } from 'lucide-react';
import { Button } from './UI';
import { TRANSLATIONS, INITIAL_CENTER } from '../constants';

interface MemoryDetailProps {
  memory: Memory;
  onBack: () => void;
  isAuthenticated: boolean;
  onDelete: (id: string) => void;
  onEdit: (memory: Memory) => void;
  onUpdatePosition?: (memory: Memory, newLat: number, newLng: number) => void;
  lang: Language;
}

export const MemoryDetail: React.FC<MemoryDetailProps> = ({ 
  memory, 
  onBack, 
  isAuthenticated, 
  onDelete,
  onEdit,
  onUpdatePosition,
  lang
}) => {
  const t = TRANSLATIONS[lang];
  
  // State for position editing mode
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [newPosition, setNewPosition] = useState<{ lat: number; lng: number } | null>(null);

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isValidCoord = (n: number) => typeof n === 'number' && !isNaN(n);
  
  // Use new position if editing, otherwise use memory's position
  const currentLat = newPosition?.lat ?? memory.lat;
  const currentLng = newPosition?.lng ?? memory.lng;
  
  const safeCenter: [number, number] = (isValidCoord(currentLat) && isValidCoord(currentLng))
    ? [currentLat, currentLng]
    : INITIAL_CENTER;
  
  // Handler for when marker is dragged to new position
  const handlePositionChange = useCallback((lat: number, lng: number) => {
    setNewPosition({ lat, lng });
  }, []);
  
  // Start editing position
  const handleStartEditPosition = () => {
    setIsEditingPosition(true);
    setNewPosition(null); // Reset any previous temporary position
  };
  
  // Cancel position editing
  const handleCancelPosition = () => {
    setIsEditingPosition(false);
    setNewPosition(null);
  };
  
  // Confirm new position
  const handleConfirmPosition = () => {
    if (newPosition && onUpdatePosition) {
      onUpdatePosition(memory, newPosition.lat, newPosition.lng);
    }
    setIsEditingPosition(false);
    setNewPosition(null);
  };
  
  // Create a modified memory with the new position for display during editing
  const displayMemory: Memory = newPosition 
    ? { ...memory, lat: newPosition.lat, lng: newPosition.lng }
    : memory;

  return (
    <div className="fixed inset-0 bg-white z-[50] flex flex-col lg:flex-row animate-in fade-in duration-300">
      {/* Left: Map (Top on Mobile) */}
      <div className="w-full h-[40vh] lg:h-full lg:w-1/2 relative bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-200 order-1 lg:order-1">
        <MapWrapper 
          memories={[displayMemory]} 
          onMemoryClick={() => {}} // Do nothing when clicking self
          center={safeCenter} 
          zoom={13} 
          interactive={isEditingPosition}
          draggableMarker={isEditingPosition}
          onMarkerDrag={handlePositionChange}
        />
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur shadow-md p-2 rounded-full hover:bg-white transition-all text-slate-700"
        >
          <ArrowLeft size={24} />
        </button>
        
        {/* Position editing controls */}
        {isAuthenticated && !isEditingPosition && onUpdatePosition && (
          <button
            onClick={handleStartEditPosition}
            className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur shadow-md px-3 py-2 rounded-lg hover:bg-white transition-all text-slate-700 flex items-center gap-2 text-sm font-medium"
          >
            <Move size={16} />
            <span>{t.adjust_position || 'Adjust Position'}</span>
          </button>
        )}
        
        {isEditingPosition && (
          <>
            {/* Hint overlay */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] bg-slate-900/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur pointer-events-none whitespace-nowrap">
              {t.drag_marker_hint || 'Drag the marker to a new location'}
            </div>
            
            {/* Confirm/Cancel buttons */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[400] flex gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelPosition}
                className="bg-white/90 backdrop-blur shadow-md"
              >
                <X size={18} />
                <span>{t.cancel}</span>
              </Button>
              <Button
                onClick={handleConfirmPosition}
                disabled={!newPosition}
                className="shadow-md"
              >
                <Check size={18} />
                <span>{t.confirm_position || 'Confirm'}</span>
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Right: Content (Bottom on Mobile) */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto bg-white order-2 lg:order-2">
        <div className="max-w-2xl mx-auto p-6 lg:p-12 space-y-8">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">{memory.locationName}</h1>
                <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {isValidCoord(currentLat) ? currentLat.toFixed(4) : '?'}, {isValidCoord(currentLng) ? currentLng.toFixed(4) : '?'}
                    {newPosition && <span className="text-primary ml-1">(new)</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(memory.date || memory.createdAt)}
                  </span>
                </div>
              </div>
              
              {isAuthenticated && !isEditingPosition && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => onEdit(memory)} className="!p-2">
                    <Edit2 size={18} />
                  </Button>
                  <Button variant="danger" onClick={() => onDelete(memory.id)} className="!p-2">
                    <Trash2 size={18} />
                  </Button>
                </div>
              )}
            </div>

            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap font-serif italic border-l-4 border-primary/20 pl-4 py-1">
              {memory.description || t.no_description}
            </p>
          </div>

          {/* Photos Grid */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <ImageIcon size={20} className="text-primary" />
              {t.photo_gallery}
            </h2>
            
            {memory.photos.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon size={48} className="opacity-50" />
                <p>{t.no_photos}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {memory.photos.map((photo, idx) => (
                  <div key={photo.id} className="group space-y-3">
                    <div className="relative overflow-hidden rounded-xl shadow-lg bg-slate-100 ring-1 ring-slate-900/5 aspect-video md:aspect-auto" style={{ maxWidth: '70%', margin: '0 auto' }}>
                      <img 
                        src={photo.url} 
                        alt={photo.caption || `Photo ${idx + 1}`} 
                        className="w-full h-auto object-contain max-h-[49vh] mx-auto"
                        loading="lazy"
                      />
                    </div>
                    {photo.caption && (
                      <p className="text-center text-slate-600 text-sm font-medium">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};