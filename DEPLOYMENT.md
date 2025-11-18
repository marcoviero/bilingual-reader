# 🚀 Quick Deployment Guide

## Option 1: GitHub Pages (Free & Easy) ⭐

### Step 1: Create Repository
1. Go to https://github.com/new
2. Repository name: `dual-language-reader` (or any name you like)
3. Choose **Public**
4. Click **Create repository**

### Step 2: Upload Files
**Via Web Interface (easiest):**
1. Click **"uploading an existing file"** on the repository page
2. Drag and drop ALL 7 files:
   - index.html
   - app.js
   - sw.js
   - manifest.json
   - icon-192.png
   - icon-512.png
   - README.md
3. Click **Commit changes**

**Or via Command Line:**
```bash
git clone https://github.com/YOUR-USERNAME/dual-language-reader.git
cd dual-language-reader
# Copy all 7 files to this folder
git add .
git commit -m "Initial commit"
git push
```

### Step 3: Enable GitHub Pages
1. Go to repository **Settings** → **Pages** (left sidebar)
2. Under **Source**: Select `main` branch and `/ (root)`
3. Click **Save**
4. Wait 2-3 minutes

### Step 4: Access Your App
Your app is now live at:
```
https://YOUR-USERNAME.github.io/dual-language-reader/
```

## Option 2: Netlify Drop (Even Easier!)

1. Go to https://app.netlify.com/drop
2. Drag the folder containing all 7 files
3. Done! You'll get a URL like `https://random-name-12345.netlify.app/`

## Option 3: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. In your folder: `vercel`
3. Follow prompts
4. Deploy!

## Installing on iPad

Once deployed to ANY of the above:

1. **Open the URL in Safari on your iPad**
2. Tap the **Share** button (bottom middle)
3. Scroll and tap **"Add to Home Screen"**
4. Tap **Add**
5. App appears on home screen like a native app!

## Testing Locally First (Optional)

Before deploying, you can test locally:

```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js
npx serve

# Then open: http://localhost:8000
```

**Note:** Service worker (offline mode) only works on HTTPS or localhost.

---

## Troubleshooting

**"App doesn't work after deployment"**
- Check browser console for errors
- Ensure all files uploaded correctly
- CDN links might be blocked - check your network

**"Can't add to home screen"**
- Must use Safari on iOS (Chrome doesn't support this well)
- Make sure manifest.json and icons are accessible
- Try clearing cache and reopening

**"Sync points not saving"**
- Check browser allows local storage
- Make sure accessing via same URL every time

---

Need help? Check the full README.md for details!
