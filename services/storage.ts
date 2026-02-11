import { createClient } from '@supabase/supabase-js';
import { Memory, Photo } from '../types';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_UPLOAD_PRESET,
  LOCAL_STORAGE_KEY,
  ADMIN_EMAIL,
  LOCAL_DEV_PASSWORD
} from '../constants';

// --- Supabase Client Setup ---
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_ANON_KEY;
const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// --- Authentication Functions ---

export const login = async (password: string): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    // Local Dev Fallback (Mock Auth)
    console.warn("Supabase not configured. Using local dev password.");
    return password === LOCAL_DEV_PASSWORD
      ? { success: true }
      : { success: false, error: 'Incorrect password (Local Dev)' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: password
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Login failed' };
  }
};

export const logout = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const checkSession = async (): Promise<boolean> => {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
};

export const onAuthStateChange = (callback: (isAuthenticated: boolean) => void) => {
  if (!supabase) return () => {};
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });

  return () => subscription.unsubscribe();
};

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// Validate Memory Object
const isValidMemory = (m: any): boolean => {
  return (
    m &&
    typeof m.lat === 'number' && !isNaN(m.lat) &&
    typeof m.lng === 'number' && !isNaN(m.lng) &&
    m.id
  );
};

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
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidMemory) : [];
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
    const memories = data as Memory[] || [];
    return memories.filter(isValidMemory);
  }
  return getLocalMemories();
};

export const addMemory = async (memory: Memory): Promise<void> => {
  if (!isValidMemory(memory)) {
    console.error("Attempted to add invalid memory:", memory);
    return;
  }
  
  if (supabase) {
    const { error } = await supabase.from('memories').insert([memory]);
    if (error) {
      console.error("Supabase insert error:", error);
      alert("Failed to save to cloud database. Please ensure you are logged in and have permission.");
    }
  } else {
    saveLocalMemories([...getLocalMemories(), memory]);
  }
};

export const updateMemory = async (memory: Memory): Promise<void> => {
  if (!isValidMemory(memory)) {
    console.error("Attempted to update invalid memory:", memory);
    return;
  }

  if (supabase) {
    const { error } = await supabase
      .from('memories')
      .update(memory)
      .eq('id', memory.id);
      
    if (error) {
      console.error("Supabase update error:", error);
      alert("Failed to update cloud database. Please ensure you are logged in and have permission.");
    }
  } else {
    const memories = getLocalMemories().map(m => m.id === memory.id ? memory : m);
    saveLocalMemories(memories);
  }
};

export const deleteMemory = async (id: string): Promise<boolean> => {
  if (supabase) {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) {
      console.error("Supabase delete error:", error);
      alert("Failed to delete from cloud. Please ensure you are logged in and have permission.");
      return false;
    }
    return true;
  } else {
    const memories = getLocalMemories().filter(m => m.id !== id);
    saveLocalMemories(memories);
    return true;
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