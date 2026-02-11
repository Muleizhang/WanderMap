# WanderMap 🌍

WanderMap 是一个极简风格的旅行记录网站。它基于世界地图，让你可以在地图上标记去过的城市或坐标，上传照片，并记录旅行的想法。

## ✨ 功能特点

- **交互式地图**：基于 Leaflet 的平滑地图体验，支持缩放和平移。
- **照片墙**：在地图上的任意位置添加多张照片。
- **双语支持**：支持中文和英文切换。
- **极简设计**：平面化 UI 风格，专注于内容展示。
- **简单鉴权**：通过简单的密码保护（默认密码：`travel`）来管理内容的增删改，未输入密码时仅供浏览。
- **响应式设计**：完美支持桌面端和移动端，移动端采用分屏/弹窗模式。

---

## 🚀 部署指南 (Vercel + Supabase + Cloudinary)

本项目完全适配 **Vercel** 部署。在部署前，你需要配置两个免费的云服务：**Supabase** (用于数据库) 和 **Cloudinary** (用于图片存储)。

### 第一步：配置 Supabase (数据库)

1. 访问 [Supabase](https://supabase.com/) 并注册/登录。
2. 点击 **"New Project"** 创建一个新项目。
3. 项目创建完成后，进入项目面板，点击左侧菜单的 **SQL Editor**。
4. 点击 **New query**，粘贴以下 SQL 代码并点击 **Run** 以创建数据表：

```sql
create table memories (
  id text primary key,
  lat float8,
  lng float8,
  "locationName" text,
  description text,
  photos jsonb,
  date int8,
  "createdAt" int8
);
```

5. 点击左侧菜单的 **Project Settings (齿轮图标) -> API**。
6. 找到 **Project URL** 和 **anon / public** Key，复制备用。

### 第二步：配置 Cloudinary (图片存储)

1. 访问 [Cloudinary](https://cloudinary.com/) 并注册免费账号。
2. 登录 Dashboard，复制顶部的 **Cloud Name** 备用。
3. 点击左下角 **Settings (齿轮图标)** -> 点击左侧菜单 **Upload**。
4. 向下滚动找到 **Upload presets** 部分，点击 **Add upload preset**。
5. **关键设置**：
   - **Signing Mode**: 必须选择 **Unsigned**。
   - **Upload preset name**: 给它起个名字（例如 `wandermap_preset`），或者使用默认生成的。复制这个名字备用。
6. 点击 **Save** 保存。

### 第三步：部署到 Vercel

1. 将你的代码推送到 **GitHub** 仓库。
2. 访问 [Vercel](https://vercel.com/) 并登录。
3. 点击 **Add New...** -> **Project**，导入你的 GitHub 仓库。
4. 在 **Configure Project** 页面：
   - **Framework Preset**: 选择 `Vite`。
   - **Root Directory**: 保持默认 `./`。
   - **Environment Variables (环境变量)**：这是最重要的一步，请添加以下 4 个变量：

| 变量名 (Key) | 填写内容 (Value) |
| :--- | :--- |
| `VITE_SUPABASE_URL` | 你的 Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase API Key (anon/public) |
| `VITE_CLOUDINARY_CLOUD_NAME` | 你的 Cloudinary Cloud Name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | 你的 Cloudinary Upload Preset Name (Unsigned) |

5. 点击 **Deploy**。等待约 1 分钟，部署完成后即可访问你的旅行地图！

---

## 🛠 本地开发

如果你想在本地运行项目：

1. 克隆仓库：
   ```bash
   git clone <你的仓库地址>
   cd wandermap
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 创建环境变量文件：
   在根目录创建一个 `.env` 文件，填入上述的环境变量（注意：本地开发不需要加 `VITE_` 前缀是旧习惯，但本项目基于 Vite，**必须**加 `VITE_` 前缀）：
   ```env
   VITE_SUPABASE_URL=你的URL
   VITE_SUPABASE_ANON_KEY=你的Key
   VITE_CLOUDINARY_CLOUD_NAME=你的CloudName
   VITE_CLOUDINARY_UPLOAD_PRESET=你的PresetName
   ```

4. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 🔑 管理员密码

默认的编辑密码是：`travel`

可以在 `constants.ts` 文件中修改 `ADMIN_PASSWORD` 常量来更改密码。注意：由于是纯前端鉴权，此密码主要防君子不防小人，适合个人或小范围分享使用。
