export type Language = 'en' | 'zh';

export interface Photo {
  id: string;
  url: string; // Base64 data URL
  caption: string;
}

export interface Memory {
  id: string;
  lat: number;
  lng: number;
  locationName: string;
  description: string;
  photos: Photo[];
  date: number; // Timestamp of the trip
  createdAt: number; // Timestamp of record creation
}

export type ViewState =
  | { type: 'MAP' }
  | { type: 'DETAIL'; memoryId: string }
  | { type: 'ADD'; lat: number; lng: number }
  | { type: 'ALBUM' };

export interface AppContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  memories: Memory[];
  addMemory: (memory: Memory) => void;
  updateMemory: (memory: Memory) => void;
  deleteMemory: (id: string) => void;
  viewState: ViewState;
  setViewState: (view: ViewState) => void;
}