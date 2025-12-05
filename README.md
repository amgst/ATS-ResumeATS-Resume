<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ATS Resume Converter

Transform your creative PDF resume into a clean, machine-readable format optimized for Applicant Tracking Systems.

View your app in AI Studio: https://ai.studio/apps/drive/1CwEJ7wefzfdAqJXxr0NGtH45nOb0sQTD

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   Or for Vercel compatibility:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Deploy to Vercel

This project is ready to deploy to Vercel with zero configuration!

### Quick Deploy

1. **Push your code to GitHub** (if not already)

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will automatically detect Vite and configure the build settings

3. **Add Environment Variable:**
   - In your Vercel project settings, go to "Environment Variables"
   - Add a new variable:
     - **Name:** `VITE_GEMINI_API_KEY`
     - **Value:** Your Gemini API key
   - Or use `GEMINI_API_KEY` (both are supported)

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your app automatically

### Manual Deploy

If you prefer using the Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add VITE_GEMINI_API_KEY
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready to be served by any static hosting service.

## Features

- 📄 Convert PDF resumes to ATS-friendly HTML format
- 🎨 Clean, linear layout optimized for ATS systems
- 📥 Download as PDF directly (no print dialog needed)
- 📋 Copy HTML to clipboard
- ✨ Modern, responsive UI
