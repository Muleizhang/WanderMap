import { Language } from './types';

// Map Configuration
export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Auth Configuration
// We use a fixed email for the admin account to keep the UI simple (Password only)
export const ADMIN_EMAIL = "muleizh@outlook.com";
export const LOCAL_DEV_PASSWORD = "travel"; // Fallback for local dev without Supabase

export const INITIAL_CENTER: [number, number] = [20, 0];
export const INITIAL_ZOOM = 3;

// Cloud Services Configuration
// NOTE: These are pulled from Vercel Environment Variables
// We use a safe access pattern to avoid crashes if import.meta.env is undefined in certain environments
const getEnv = (key: string, defaultValue: string = "") => {
  try {
    // @ts-ignore
    return (import.meta.env && import.meta.env[key]) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const SUPABASE_URL = getEnv("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY = getEnv("VITE_SUPABASE_ANON_KEY");

export const CLOUDINARY_CLOUD_NAME = getEnv("VITE_CLOUDINARY_CLOUD_NAME", "demo"); 
export const CLOUDINARY_UPLOAD_PRESET = getEnv("VITE_CLOUDINARY_UPLOAD_PRESET", "wandermap_preset");

export const LOCAL_STORAGE_KEY = "wandermap_memories_v1";

// Placeholder image for empty states
export const PLACEHOLDER_IMG = "https://picsum.photos/400/300";

// Translations
export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    memories_count: "memories",
    search_placeholder: "Search places...",
    admin_mode: "Admin Mode",
    login_to_edit: "Login to Edit",
    right_click_hint: "Right-click to add memory",
    admin_access: "Admin Access",
    enter_password: "Enter the password to add or edit memories.",
    password_placeholder: "Password",
    hint: "Hint: Use the password you set in Supabase",
    cancel: "Cancel",
    access: "Access",
    edit_memory: "Edit Memory",
    new_memory: "New Memory",
    save_memory: "Save Memory",
    processing: "Processing...",
    upload_photos: "Upload Photos",
    coordinates: "Coordinates",
    location_name: "Location Name",
    location_placeholder: "e.g., Eiffel Tower, Paris",
    trip_date: "Trip Date",
    thoughts: "Thoughts & Notes",
    thoughts_placeholder: "What was memorable about this place?",
    photos: "Photos",
    caption_placeholder: "Caption for this photo...",
    remove: "Remove",
    photo_gallery: "Photo Gallery",
    no_photos: "No photos added to this location yet.",
    no_description: "No description added.",
    delete_confirm: "Are you sure you want to delete this memory?",
    login_alert: "Please login to add a memory to this location.",
    incorrect_password: "Incorrect password or login failed.",
    change_location: "Change",
    change_location_hint: "Right-click on the map to select a new location",
    picking_location_hint: "Right-click to select a new location",
    adjust_position: "Adjust Position",
    drag_marker_hint: "Drag the marker to a new location",
    confirm_position: "Confirm",
    album_view: "Album",
    back_to_map: "Map",
    no_memories: "No memories yet. Start by adding your first memory!"
  },
  zh: {
    memories_count: "条回忆",
    search_placeholder: "搜索地点...",
    admin_mode: "管理员模式",
    login_to_edit: "登录编辑",
    right_click_hint: "右键点击地图添加回忆",
    admin_access: "管理员权限",
    enter_password: "输入密码以添加或编辑回忆。",
    password_placeholder: "密码",
    hint: "提示：使用您在 Supabase 设置的密码",
    cancel: "取消",
    access: "进入",
    edit_memory: "编辑回忆",
    new_memory: "新建回忆",
    save_memory: "保存回忆",
    processing: "处理中...",
    upload_photos: "上传照片",
    coordinates: "坐标",
    location_name: "地点名称",
    location_placeholder: "例如：北京故宫",
    trip_date: "旅行日期",
    thoughts: "想法与笔记",
    thoughts_placeholder: "这个地方有什么难忘的？",
    photos: "照片",
    caption_placeholder: "照片描述...",
    remove: "移除",
    photo_gallery: "照片墙",
    no_photos: "此地点暂无照片。",
    no_description: "暂无描述。",
    delete_confirm: "确定要删除这条回忆吗？",
    login_alert: "请先登录以在此处添加回忆。",
    incorrect_password: "密码错误或登录失败。",
    change_location: "更改",
    change_location_hint: "右键点击地图选择新位置",
    picking_location_hint: "右键点击选择新位置",
    adjust_position: "调整位置",
    drag_marker_hint: "拖动标记到新位置",
    confirm_position: "确认",
    album_view: "专辑",
    back_to_map: "地图",
    no_memories: "暂无回忆。开始添加您的第一条回忆吧！"
  }
};
