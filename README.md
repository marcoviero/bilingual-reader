# 📚 Dual Language Reader - PWA

A Progressive Web App for reading books side-by-side in two languages with smart alignment. Perfect for language learners!

## ✨ Features

- **Side-by-side reading** - Original language and translation displayed together
- **PDF & EPUB support** - Works with both formats, mix and match
- **Smart sync points** - Manually mark matching locations for perfect alignment
- **Dark/Light mode** - Toggle between themes with dark mode as default
- **Offline capable** - Works without internet after first load
- **Install as app** - Add to home screen on iPad/iPhone for native-like experience
- **Keyboard navigation** - Use arrow keys to turn pages
- **Responsive design** - Adapts to laptop, tablet, and phone screens
- **Private** - All processing happens in your browser, files stay on your device

## 🚀 Quick Start (GitHub Pages)

### 1. Create a GitHub Repository

1. Go to GitHub and create a new repository
2. Name it something like `dual-language-reader`
3. Make it public (required for GitHub Pages free tier)

### 2. Upload Files

Upload these files to your repository:
- `index.html`
- `app.js`
- `sw.js`
- `manifest.json`
- `icon-192.png`
- `icon-512.png`
- `README.md` (this file)

You can do this via:
- GitHub web interface (drag and drop)
- Git command line:
  ```bash
  git clone https://github.com/YOUR-USERNAME/dual-language-reader.git
  cd dual-language-reader
  # Copy all files here
  git add .
  git commit -m "Initial commit"
  git push
  ```

### 3. Enable GitHub Pages

1. Go to your repository settings
2. Navigate to **Pages** section (left sidebar)
3. Under **Source**, select `main` branch and `/ (root)` folder
4. Click **Save**
5. Wait a few minutes for deployment
6. Your app will be available at: `https://YOUR-USERNAME.github.io/dual-language-reader/`

## 📱 Install on iPad

### Method 1: Safari (Recommended)

1. Open your deployed URL in Safari on iPad
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Give it a name (e.g., "Language Reader")
5. Tap **Add**
6. The app icon will appear on your home screen!

### Method 2: Chrome/Edge

1. Open your deployed URL in Chrome or Edge
2. Tap the **⋮** menu (three dots)
3. Tap **"Add to Home screen"** or **"Install app"**
4. Follow the prompts

## 📖 How to Use

### Basic Reading (No Sync)

1. Open the app
2. Upload your original language file (PDF or EPUB)
3. Upload your English translation file (PDF or EPUB)
4. Click **"Start Reading"**
5. Use arrow buttons or keyboard (← →) to navigate

The app will display page 1 next to page 1, page 2 next to page 2, etc.

### Smart Alignment with Sync Points (Recommended)

For books where the pagination doesn't match:

1. Upload both files
2. Click **"Set Sync Points"**
3. Add matching locations:
   - For PDFs: Use page numbers
   - For EPUBs: Use chapter numbers
   - Example: "Italian page 1 = English page 1", "Italian page 50 = English page 58"
4. Add at least 3-5 sync points throughout the book
5. Click **Done**, then **Start Reading**

The app will smoothly interpolate between your sync points!

**Tips for good sync points:**
- Start of each chapter
- Major scene breaks
- Every 20-50 pages
- Beginning and end of the book

### Keyboard Shortcuts

- `←` Previous page/chapter
- `→` Next page/chapter

### Theme Toggle

Click the theme button (top right corner) to switch between:
- 🌙 **Dark Mode** (default) - Easy on the eyes for long reading sessions
- ☀️ **Light Mode** - Bright background for daytime reading

Your preference is saved automatically and persists across sessions.

## 🎨 Customization

### Change Colors

Edit the CSS in `index.html`:
- Background: Search for `#1c1c1e`
- Accent color: Search for `#007AFF`
- Success color: Search for `#34C759`

### Change App Icon

Replace `icon-192.png` and `icon-512.png` with your own icons. They should be:
- Square (192x192 and 512x512 pixels)
- PNG format
- Simple design that works at small sizes

## 🔧 Technical Details

### Browser Support

- **iOS Safari** 11.3+ (iPad, iPhone)
- **Chrome** 67+ (Desktop, Android)
- **Firefox** 63+
- **Edge** 79+

### File Size Limits

- Depends on device memory
- PDFs: Tested up to 100MB
- EPUBs: Tested up to 50MB
- Larger files may work but could be slow

### Privacy & Security

- **All processing happens locally** in your browser
- Files are **never uploaded** to any server
- Sync points are saved in browser's local storage
- No tracking, no analytics, no accounts needed

## 🐛 Troubleshooting

### App won't install on iPad

- Make sure you're using Safari (works best)
- Try clearing Safari cache and reopening
- Check that the manifest.json file is accessible

### PDFs not rendering

- Ensure PDF.js CDN is loading (check browser console)
- Try a different PDF file to rule out file corruption
- Some encrypted PDFs may not work

### EPUBs not rendering

- Ensure epub.js CDN is loading
- Some DRM-protected EPUBs won't work
- Try opening the EPUB in another reader to verify it's valid

### Sync points not saving

- Check browser's local storage isn't disabled
- Local storage is per-origin, so same URL is needed
- Try different browser if issues persist

## 🆕 Future Enhancements

Potential features to add:
- [ ] Automatic alignment using NLP/embeddings
- [ ] Text-to-speech in both languages
- [ ] Dictionary lookup on tap
- [ ] Bookmarks and notes
- [ ] Progress tracking
- [ ] Multiple book library
- [ ] Export highlights

## 📝 License

MIT License - Feel free to modify and distribute!

## 🙏 Credits

Built with:
- [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla
- [Epub.js](https://github.com/futurepress/epub.js/) by FuturePress
- Love for language learning ❤️

---

**Enjoy your language learning journey! 🚀**
