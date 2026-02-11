import React, { useState, useRef } from 'react';
import { Language, Memory, Photo } from '../types';
import { Button, Input, TextArea } from './UI';
import { Upload, X, MapPin, Loader2, Calendar } from 'lucide-react';
import { uploadImage } from '../services/storage';
import { TRANSLATIONS } from '../constants';

interface MemoryEditorProps {
  initialData?: Partial<Memory>;
  lat?: number;
  lng?: number;
  onSave: (data: Omit<Memory, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  lang: Language;
}

export const MemoryEditor: React.FC<MemoryEditorProps> = ({ 
  initialData, 
  lat = 0, 
  lng = 0, 
  onSave, 
  onCancel,
  lang
}) => {
  const t = TRANSLATIONS[lang];
  const [locationName, setLocationName] = useState(initialData?.locationName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dateStr, setDateStr] = useState(
    initialData?.date 
      ? new Date(initialData.date).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );
  const [photos, setPhotos] = useState<Photo[]>(initialData?.photos || []);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      try {
        const newPhotos: Photo[] = [];
        const files: File[] = Array.from(e.target.files).slice(0, 5);
        
        for (const file of files) {
          // This now calls the Cloudinary upload function
          const url = await uploadImage(file);
          newPhotos.push({
            id: Math.random().toString(36).substr(2, 9),
            url: url,
            caption: ''
          });
        }
        setPhotos(prev => [...prev, ...newPhotos]);
      } catch (err) {
        console.error("Error uploading files", err);
        // Error is already alerted in the service if applicable
      } finally {
        setIsProcessing(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const updateCaption = (id: string, caption: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      lat: initialData?.lat ?? lat,
      lng: initialData?.lng ?? lng,
      locationName: locationName || 'Unknown Location',
      description,
      photos,
      date: new Date(dateStr).getTime()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg flex items-center gap-3 border border-slate-100">
          <div className="bg-white p-2 rounded-full shadow-sm">
            <MapPin className="text-primary" size={20} />
          </div>
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-900">{t.coordinates}</p>
            <p>{(initialData?.lat ?? lat).toFixed(6)}, {(initialData?.lng ?? lng).toFixed(6)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.location_name}</label>
            <Input 
              placeholder={t.location_placeholder} 
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.trip_date}</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
              <Input 
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.thoughts}</label>
            <TextArea 
              placeholder={t.thoughts_placeholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t.photos}</label>
          
          <div className="space-y-4">
            {photos.map((photo) => (
              <div key={photo.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-100 group">
                <div className="w-20 h-20 shrink-0 bg-white rounded-md overflow-hidden border border-slate-200">
                  <img src={photo.url} alt="thumbnail" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <Input 
                    placeholder={t.caption_placeholder} 
                    value={photo.caption}
                    onChange={(e) => updateCaption(photo.id, e.target.value)}
                    className="mb-2 text-xs"
                  />
                  <button 
                    type="button" 
                    onClick={() => removePhoto(photo.id)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <X size={12} /> {t.remove}
                  </button>
                </div>
              </div>
            ))}
            
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple 
                accept="image/*"
                className="hidden" 
              />
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed"
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                {isProcessing ? t.processing : t.upload_photos}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          {t.cancel}
        </Button>
        <Button type="submit" className="flex-1">
          {t.save_memory}
        </Button>
      </div>
    </form>
  );
};