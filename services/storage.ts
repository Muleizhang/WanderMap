import { createClient } from '@supabase/supabase-js';
import { Memory, Photo } from '../types';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_UPLOAD_PRESET,
  LOCAL_STORAGE_KEY 
} from '../constants';

// --- Supabase Client Setup ---
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_ANON_KEY;
const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Cloudinary Upload ---
export const uploadImage = async (file: File): Promise<string> => {
  // If Cloudinary is not configured or we are in 'demo' mode without a preset, fallback to Base64 (Local)
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'demo') {
    console.warn("Cloudinary not configured. Falling back to local Base64 storage (not persistent globally).");
    return fileToBase64(file);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Cloudinary upload failed');
    }

    const data = await response.json();
    return data.secure_url; // Return the hosted URL
  } catch (error) {
    console.error("Upload error:", error);
    alert("Image upload failed. Check your Cloudinary configuration. Falling back to local storage.");
    return fileToBase64(file);
  }
};

// --- Fallback Local Storage Implementation ---
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Resize logic: Max 800x800 to save space
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // If canvas fails, fallback to raw base64 (risky for size)
          resolve(event.target?.result as string);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality to save space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // If image loading fails, resolve with raw base64
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

const getLocalMemories = (): Memory[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalMemories = (memories: Memory[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memories));
  } catch (e: any) {
    console.error("Local Storage Error", e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert("Local storage is full! The app is unable to save more data locally. \n\nPlease configure Supabase and Cloudinary for unlimited cloud storage, or delete some old memories.");
    } else {
      alert("Failed to save data locally.");
    }
  }
};

// --- Data Operations (Supabase + Local Fallback) ---

export const getMemories = async (): Promise<Memory[]> => {
  if (supabase) {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('createdAt', { ascending: false });
      
    if (error) {
      console.error("Supabase fetch error:", error);
      return getLocalMemories();
    }
    return data as Memory[] || [];
  }
  return getLocalMemories();
};

export const addMemory = async (memory: Memory): Promise<void> => {
  if (supabase) {
    const { error } = await supabase.from('memories').insert([memory]);
    if (error) {
      console.error("Supabase insert error:", error);
      alert("Failed to save to cloud database. Attempting local backup.");
      saveLocalMemories([...getLocalMemories(), memory]);
    }
  } else {
    saveLocalMemories([...getLocalMemories(), memory]);
  }
};

export const updateMemory = async (memory: Memory): Promise<void> => {
  if (supabase) {
    const { error } = await supabase
      .from('memories')
      .update(memory)
      .eq('id', memory.id);
      
    if (error) {
      console.error("Supabase update error:", error);
      alert("Failed to update cloud database.");
    }
  } else {
    const memories = getLocalMemories().map(m => m.id === memory.id ? memory : m);
    saveLocalMemories(memories);
  }
};

export const deleteMemory = async (id: string): Promise<void> => {
  if (supabase) {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) console.error("Supabase delete error:", error);
  } else {
    const memories = getLocalMemories().filter(m => m.id !== id);
    saveLocalMemories(memories);
  }
};

export const createMemoryObject = (
  lat: number, 
  lng: number, 
  locationName: string, 
  description: string, 
  photos: Photo[],
  date: number
): Memory => {
  return {
    id: generateId(),
    lat,
    lng,
    locationName,
    description,
    photos,
    date,
    createdAt: Date.now(),
  };
};

// --- Realtime Subscription ---
export const subscribeToMemories = (onUpdate: () => void) => {
  if (!supabase) return () => {};
  
  const channel = supabase
    .channel('public:memories')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, (payload) => {
      console.log('Realtime update:', payload);
      onUpdate();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};