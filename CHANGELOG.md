# Changelog

## Version 1.1 - Dark Mode Toggle Added

### What's New
- ✨ **Theme Toggle Button** - Switch between dark and light modes
- 🌙 **Dark Mode** set as default (easier on the eyes for reading)
- ☀️ **Light Mode** available with one click
- 💾 **Preference Saved** - Your choice persists across sessions
- 🎨 **Smooth Transitions** - Theme changes animate smoothly

### Design Changes
- All colors now use CSS variables for easy theming
- Theme toggle button appears in top-right corner on all screens
- Button shows current mode and switches to opposite (e.g., shows "☀️ Light" when in dark mode)
- Consistent styling across upload, sync, and reader screens

### Technical Details
- Theme preference stored in localStorage
- Uses CSS custom properties (variables) for theming
- No external dependencies
- Smooth 0.3s transition animations

### Updated Files
- `index.html` - Added CSS variables and theme toggle button
- `app.js` - Added theme management functions
- `README.md` - Documented the new feature

---

## Version 1.0 - Initial Release

### Features
- Side-by-side reading with PDF and EPUB support
- Manual sync points for alignment
- PWA support for offline use
- Install as app on iPad/iPhone
- Keyboard navigation
- Responsive design
