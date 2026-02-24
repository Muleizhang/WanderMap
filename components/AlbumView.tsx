import React from 'react';
import { Memory, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface AlbumViewProps {
  memories: Memory[];
  onMemoryClick: (id: string) => void;
  onBack: () => void;
  lang: Language;
}

export const AlbumView: React.FC<AlbumViewProps> = ({
  memories,
  onMemoryClick,
  onBack,
  lang
}) => {
  const t = TRANSLATIONS[lang];

  // Sort memories by date (newest first)
  const sortedMemories = [...memories].sort((a, b) => b.date - a.date);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-y-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur shadow-sm z-10 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          {t.album_view || 'Album View'}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {t.back_to_map || 'Back to Map'}
        </button>
      </div>

      {/* Memory List */}
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {sortedMemories.map((memory, index) => (
          <div
            key={memory.id}
            className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onMemoryClick(memory.id)}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Image */}
              <div className="sm:w-48 sm:min-h-[140px] h-40 sm:h-auto relative">
                {memory.photos && memory.photos.length > 0 ? (
                  <img
                    src={memory.photos[0].url}
                    alt={memory.locationName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-400 text-sm">No photo</span>
                  </div>
                )}
                {/* Photo count badge */}
                {memory.photos && memory.photos.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {memory.photos.length} {t.photos || 'photos'}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {memory.locationName}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                    {memory.description || (t.no_description || 'No description')}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">
                    {new Date(memory.date).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-xs text-slate-400">
                    {memory.lat.toFixed(4)}, {memory.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {sortedMemories.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {t.no_memories || 'No memories yet'}
          </div>
        )}
      </div>
    </div>
  );
};
