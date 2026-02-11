import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Memory, ViewState, Language } from './types';
import { MapWrapper } from './components/MapWrapper';
import { MemoryDetail } from './components/MemoryDetail';
import { MemoryEditor } from './components/MemoryEditor';
import { Button, Modal, Input } from './components/UI';
import { Lock, Unlock, Map as MapIcon, Plus, Search, Cloud, RefreshCw, Globe, Loader2 } from 'lucide-react';
import * as storage from './services/storage';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  // State
  const [memories, setMemories] = useState<Memory[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ type: 'MAP' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [isPickingLocation, setIsPickingLocation] = useState(false);

  const t = TRANSLATIONS[lang];
  
  // Editor State
  const [editorData, setEditorData] = useState<{lat: number, lng: number, initial?: Memory} | null>(null);

  const fetchMemories = useCallback(async () => {
    setIsLoading(true);
    const data = await storage.getMemories();
    setMemories(data);
    setIsLoading(false);
  }, []);

  // Load data on mount & subscribe to realtime changes & auth state
  useEffect(() => {
    fetchMemories();
    
    // Check initial session
    storage.checkSession().then(isAuth => {
      if (isAuth) setIsAuthenticated(true);
    });

    // Subscribe to auth changes (e.g. timeout, multi-tab logout)
    const authUnsubscribe = storage.onAuthStateChange((isAuth) => {
      setIsAuthenticated(isAuth);
    });
    
    // Subscribe to global DB updates (Supabase)
    const dbUnsubscribe = storage.subscribeToMemories(() => {
      fetchMemories();
    });

    return () => {
      authUnsubscribe();
      dbUnsubscribe();
    };
  }, [fetchMemories]);

  // Filter memories based on search
  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) return memories;
    const lowerQuery = searchQuery.toLowerCase();
    return memories.filter(m => 
      m.locationName.toLowerCase().includes(lowerQuery) || 
      m.description.toLowerCase().includes(lowerQuery)
    );
  }, [memories, searchQuery]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    const result = await storage.login(passwordInput);
    
    setIsLoggingIn(false);

    if (result.success) {
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setPasswordInput('');
    } else {
      alert(t.incorrect_password);
    }
  };

  const handleLogout = async () => {
    await storage.logout();
    setIsAuthenticated(false);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isAuthenticated) {
      if (isPickingLocation && editorData) {
        // User is picking a new location for an existing memory
        setEditorData({ 
          lat, 
          lng, 
          initial: editorData.initial 
        });
        setIsPickingLocation(false);
        setShowEditorModal(true);
      } else {
        // Normal new memory creation
        setEditorData({ lat, lng });
        setShowEditorModal(true);
      }
    } else {
      alert(t.login_alert);
    }
  };

  const handleRequestLocationChange = () => {
    // Close editor and enter location picking mode
    setShowEditorModal(false);
    setIsPickingLocation(true);
  };

  const handleSaveMemory = async (data: Omit<Memory, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    if (editorData?.initial) {
      // Edit existing
      const updated: Memory = {
        ...editorData.initial,
        ...data
      };
      await storage.updateMemory(updated);
      
      // Optimistic update for UI responsiveness
      setMemories(prev => prev.map(m => m.id === updated.id ? updated : m));
    } else {
      // Create new
      const newMemory = storage.createMemoryObject(data.lat, data.lng, data.locationName, data.description, data.photos, data.date);
      await storage.addMemory(newMemory);
      
      // Optimistic update
      setMemories(prev => [...prev, newMemory]);
    }
    setIsLoading(false);
    setShowEditorModal(false);
    setEditorData(null);
  };

  const handleDeleteMemory = async (id: string) => {
    const confirmed = confirm(t.delete_confirm);
    if (confirmed) {
      setIsLoading(true);
      try {
        const success = await storage.deleteMemory(id);
        if (success) {
          // Only update local state if the backend deletion was successful
          setMemories(prev => prev.filter(m => m.id !== id));
          setViewState({ type: 'MAP' });
        }
      } catch (error) {
        console.error("Delete failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenDetail = (id: string) => {
    setViewState({ type: 'DETAIL', memoryId: id });
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col relative">
      
      {/* Top Bar / Navigation Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[40] p-4 pointer-events-none flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
        
        {/* Logo & Search Block */}
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <div className="bg-white/90 backdrop-blur shadow-md rounded-xl p-3 pointer-events-auto border border-white/50 w-full sm:w-[320px]">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MapIcon className="text-primary" />
                WanderMap
              </h1>
              <div className="flex items-center gap-2">
                {(isLoading || isLoggingIn) && <RefreshCw size={14} className="animate-spin text-slate-400" />}
                <p className="text-xs text-slate-500 font-medium">
                  {memories.length} {t.memories_count}
                </p>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder={t.search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pointer-events-auto self-end sm:self-auto flex items-center gap-2">
          
          {/* Language Toggle */}
          <Button variant="secondary" onClick={toggleLanguage} className="shadow-lg backdrop-blur bg-white/90 px-3">
            <Globe size={16} />
            <span>{lang === 'en' ? 'EN' : '中文'}</span>
          </Button>

          {/* Auth Button */}
          {isAuthenticated ? (
            <Button variant="secondary" onClick={handleLogout} className="shadow-lg backdrop-blur bg-white/90">
              <Unlock size={16} className="text-green-600" />
              <span className="hidden sm:inline">{t.admin_mode}</span>
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setShowAuthModal(true)} className="shadow-lg">
              <Lock size={16} />
              <span className="hidden sm:inline">{t.login_to_edit}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        <MapWrapper 
          memories={filteredMemories} 
          onMapClick={handleMapClick}
          onMemoryClick={handleOpenDetail}
        />
        
        {/* Hint Overlay if logged in */}
        {isAuthenticated && viewState.type === 'MAP' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur pointer-events-none animate-bounce z-[40] whitespace-nowrap">
            {isPickingLocation ? t.picking_location_hint : t.right_click_hint}
          </div>
        )}
      </div>

      {/* Detail View Overlay */}
      {viewState.type === 'DETAIL' && (
        <MemoryDetail 
          memory={memories.find(m => m.id === viewState.memoryId)!} 
          onBack={() => setViewState({ type: 'MAP' })}
          isAuthenticated={isAuthenticated}
          onDelete={handleDeleteMemory}
          onEdit={(memory) => {
            setEditorData({ lat: memory.lat, lng: memory.lng, initial: memory });
            setShowEditorModal(true);
          }}
          lang={lang}
        />
      )}

      {/* Modals */}
      <Modal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        title={t.admin_access}
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <p className="text-sm text-slate-600">{t.enter_password}</p>
          <Input 
            type="password" 
            placeholder={t.password_placeholder}
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            autoFocus
            disabled={isLoggingIn}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowAuthModal(false)} disabled={isLoggingIn}>{t.cancel}</Button>
            <Button type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : t.access}
            </Button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">{t.hint}</p>
        </form>
      </Modal>

      <Modal
        isOpen={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        title={editorData?.initial ? t.edit_memory : t.new_memory}
      >
        {editorData && (
          <MemoryEditor 
            lat={editorData.lat} 
            lng={editorData.lng} 
            initialData={editorData.initial}
            onSave={handleSaveMemory}
            onCancel={() => {
              setShowEditorModal(false);
              setIsPickingLocation(false);
            }}
            onRequestLocationChange={handleRequestLocationChange}
            lang={lang}
          />
        )}
      </Modal>

    </div>
  );
};

export default App;