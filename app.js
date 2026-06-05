// Set up PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
}

// ============================================================
// IndexedDB — Session Storage
// ============================================================

const DB_NAME = 'BilingualReaderDB';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('sessions')) {
                db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('sessionFiles')) {
                db.createObjectStore('sessionFiles', { keyPath: 'id' });
            }
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function dbGetAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function dbGet(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function dbPut(storeName, record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(record);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

async function dbDelete(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = e => reject(e.target.error);
    });
}

async function getAllSessions() {
    const sessions = await dbGetAll('sessions');
    return sessions.sort((a, b) => b.lastOpened - a.lastOpened);
}

async function updateSessionPosition(id, currentPage, translationOffset) {
    const meta = await dbGet('sessions', id);
    if (!meta) return;
    meta.currentPage = currentPage;
    meta.translationOffset = translationOffset;
    meta.lastOpened = Date.now();
    await dbPut('sessions', meta);
}

async function deleteSession(id) {
    await dbDelete('sessions', id);
    await dbDelete('sessionFiles', id);
}

function stripExt(filename) {
    return filename.replace(/\.[^.]+$/, '');
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    if (theme === 'light') {
        body.classList.add('light-mode');
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Dark';
    } else {
        body.classList.remove('light-mode');
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Light';
    }
    
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// Initialize theme on page load
initTheme();

// Application state
const state = {
    original: {
        file: null,
        type: null,
        data: null,
        pdf: null,
        epub: null,
        currentPage: 1,
        totalPages: 0,
        rendition: null,
        allChapters: [],
        filteredChapters: []
    },
    translation: {
        file: null,
        type: null,
        data: null,
        pdf: null,
        epub: null,
        currentPage: 1,
        totalPages: 0,
        rendition: null,
        allChapters: [],
        filteredChapters: []
    },
    translationOffset: 0,
    currentBookId: null,
    currentSessionId: null,
    filterChapters: true,
    textDarkMode: false
};

// DOM elements
const elements = {
    uploadScreen: document.getElementById('upload-screen'),
    syncScreen: document.getElementById('sync-screen'),
    readerScreen: document.getElementById('reader-screen'),
    originalInput: document.getElementById('original-file'),
    translationInput: document.getElementById('translation-file'),
    originalName: document.getElementById('original-name'),
    translationName: document.getElementById('translation-name'),
    startButton: document.getElementById('start-reading'),
    closeButton: document.getElementById('close-reader'),
    closeBottomButton: document.getElementById('close-reader-bottom'),
    prevButton: document.getElementById('prev-page'),
    nextButton: document.getElementById('next-page'),
    chapterSelectOriginal: document.getElementById('chapter-select-original'),
    translationBackButton: document.getElementById('translation-back'),
    translationForwardButton: document.getElementById('translation-forward'),
    offsetDisplay: document.getElementById('offset-display'),
    themeToggle: document.getElementById('theme-toggle'),
    filterChapters: document.getElementById('filter-chapters'),
    scrollSyncToggle: document.getElementById('toggle-scroll-sync'),
    textModeToggle: document.getElementById('toggle-text-mode'),
    panelToggle: document.getElementById('panel-toggle')
};

// Theme toggle event listener
elements.themeToggle.addEventListener('click', toggleTheme);

// Filter chapters checkbox
if (elements.filterChapters) {
    elements.filterChapters.addEventListener('change', (e) => {
        state.filterChapters = e.target.checked;
        console.log('Chapter filtering:', state.filterChapters ? 'enabled' : 'disabled');
    });
}

// Scroll sync toggle
if (elements.scrollSyncToggle) {
    elements.scrollSyncToggle.addEventListener('click', () => {
        scrollSyncEnabled = !scrollSyncEnabled;
        if (scrollSyncEnabled) {
            elements.scrollSyncToggle.style.backgroundColor = 'var(--success-color)';
            elements.scrollSyncToggle.textContent = '🔗 Scroll';
        } else {
            elements.scrollSyncToggle.style.backgroundColor = 'var(--bg-tertiary)';
            elements.scrollSyncToggle.textContent = '🔓 Independent';
        }
        console.log('Scroll sync:', scrollSyncEnabled ? 'enabled' : 'disabled');
    });
}

// Text mode toggle (dark/light for reading)
if (elements.textModeToggle) {
    elements.textModeToggle.textContent = '🌙 Dark Text';

    elements.textModeToggle.addEventListener('click', () => {
        state.textDarkMode = !state.textDarkMode;
        applyTextMode();
    });
}

function applyTextMode() {
    const originalContainer = document.getElementById('epub-original');
    const translationContainer = document.getElementById('epub-translation');
    
    if (state.textDarkMode) {
        originalContainer.classList.add('text-dark-mode');
        translationContainer.classList.add('text-dark-mode');
        elements.textModeToggle.textContent = '☀️ Light Text';
    } else {
        originalContainer.classList.remove('text-dark-mode');
        translationContainer.classList.remove('text-dark-mode');
        elements.textModeToggle.textContent = '🌙 Dark Text';
    }
    console.log('Text mode:', state.textDarkMode ? 'dark' : 'light');
}

// Offset adjustment buttons
if (elements.translationBackButton) {
    elements.translationBackButton.addEventListener('click', () => {
        state.translationOffset--;
        updateOffsetDisplay();
        renderBothSides();
    });
}

if (elements.translationForwardButton) {
    elements.translationForwardButton.addEventListener('click', () => {
        state.translationOffset++;
        updateOffsetDisplay();
        renderBothSides();
    });
}

function updateOffsetDisplay() {
    const offset = state.translationOffset;
    if (offset === 0) {
        elements.offsetDisplay.textContent = '±0';
    } else if (offset > 0) {
        elements.offsetDisplay.textContent = `+${offset}`;
    } else {
        elements.offsetDisplay.textContent = `${offset}`;
    }
}

// Chapter selection dropdown
if (elements.chapterSelectOriginal) {
    elements.chapterSelectOriginal.addEventListener('change', async (e) => {
        const selectedIndex = parseInt(e.target.value);
        state.original.currentPage = selectedIndex + 1;
        await renderBothSides();
    });
}

function populateChapterDropdowns() {
    // Populate original dropdown
    if (elements.chapterSelectOriginal && state.original.filteredChapters) {
        elements.chapterSelectOriginal.innerHTML = '';
        state.original.filteredChapters.forEach((chapter, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Ch ${index + 1}: ${chapter.label}`;
            if (index === state.original.currentPage - 1) {
                option.selected = true;
            }
            elements.chapterSelectOriginal.appendChild(option);
        });
    }
}

// Bottom button handlers
if (elements.closeBottomButton) {
    elements.closeBottomButton.addEventListener('click', async () => {
        if (state.currentSessionId) {
            await updateSessionPosition(state.currentSessionId, state.original.currentPage, state.translationOffset);
        }
        showScreen('upload');
        renderLibrary();
    });
}

// File upload handling
elements.originalInput.addEventListener('change', handleFileUpload('original'));
elements.translationInput.addEventListener('change', handleFileUpload('translation'));

function handleFileUpload(side) {
    return async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const type = file.name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf';
        const badge = type === 'epub' ? 'EPUB' : 'PDF';
        
        state[side].file = file;
        state[side].type = type;
        
        if (side === 'original') {
            elements.originalName.innerHTML = `${file.name} <span class="format-badge">${badge}</span>`;
        } else {
            elements.translationName.innerHTML = `${file.name} <span class="format-badge">${badge}</span>`;
        }

        checkBothFilesSelected();
    };
}

function checkBothFilesSelected() {
    if (state.original.file && state.translation.file) {
        elements.startButton.disabled = false;
        // Also enable sync link
        const syncLink = document.getElementById('sync-link');
        if (syncLink) {
            syncLink.style.pointerEvents = 'auto';
            syncLink.style.opacity = '1';
        }
    }
}

// Start reading
elements.startButton.addEventListener('click', async () => {
    try {
        elements.startButton.disabled = true;
        elements.startButton.textContent = 'Loading...';
        
        await loadBooks();
        await saveCurrentSession();
        showScreen('reader');
        await renderBothSides();
        
        elements.startButton.disabled = false;
        elements.startButton.textContent = 'Start Reading';
    } catch (error) {
        console.error('Error loading books:', error);
        alert(`Error loading books: ${error.message}\n\nPlease check:\n- Files are valid PDFs or EPUBs\n- Files are not corrupted\n- Check browser console for details`);
        elements.startButton.disabled = false;
        elements.startButton.textContent = 'Start Reading';
    }
});

// Load books
async function loadBooks() {
    console.log('Loading books...');
    console.log('Original:', state.original.file?.name, state.original.type);
    console.log('Translation:', state.translation.file?.name, state.translation.type);
    
    // Reset scroll sync for new books
    scrollListenersAttached = false;
    
    try {
        await Promise.all([
            loadBook('original'),
            loadBook('translation')
        ]);

        console.log('Books loaded successfully');
        console.log('Original pages:', state.original.totalPages);
        console.log('Translation pages:', state.translation.totalPages);

        // Initialize offset display
        updateOffsetDisplay();
        
        // Populate chapter dropdowns
        populateChapterDropdowns();
    } catch (error) {
        console.error('Error in loadBooks:', error);
        throw error;
    }
}

async function loadBookFromBuffer(side, data) {
    const type = state[side].type;

    try {
        if (type === 'pdf') {
            state[side].pdf = await pdfjsLib.getDocument({data}).promise;
            state[side].totalPages = state[side].pdf.numPages;
            console.log(`${side} PDF loaded: ${state[side].totalPages} pages`);
        } else if (type === 'epub') {
            const book = ePub();
            await book.open(data);
            state[side].epub = book;
            await book.ready;

            state[side].allChapters = [];
            for (let i = 0; i < book.spine.spineItems.length; i++) {
                const item = book.spine.spineItems[i];
                let label = '';
                const hrefParts = item.href.split('/');
                const filename = hrefParts[hrefParts.length - 1].replace('.xhtml', '').replace('.html', '');
                if (filename.match(/^(chapter|ch|cap|capitolo|chapitre)[-_]?\d+/i)) {
                    label = filename.replace(/[-_]/g, ' ');
                } else if (filename.match(/^\d+$/)) {
                    label = `Chapter ${filename}`;
                } else if (item.idref) {
                    label = item.idref.replace(/[-_]/g, ' ');
                } else {
                    label = filename || `Section ${i + 1}`;
                }
                state[side].allChapters.push({ index: i, href: item.href, label, filename });
            }

            if (state.filterChapters) {
                state[side].filteredChapters = filterEpubChapters(state[side].allChapters);
                if (state[side].filteredChapters.length === 0) {
                    state[side].filteredChapters = state[side].allChapters;
                }
            } else {
                state[side].filteredChapters = state[side].allChapters;
            }

            state[side].totalPages = state[side].filteredChapters.length;
            console.log(`${side} EPUB loaded: ${state[side].totalPages} chapters`);
        }
    } catch (error) {
        console.error(`Error loading ${side} book:`, error);
        throw new Error(`Failed to load ${side} ${type.toUpperCase()}: ${error.message}`);
    }
}

async function loadBook(side) {
    console.log(`Loading ${side} book...`);
    const file = state[side].file;
    state[side].type = file.name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf';
    const data = await readFileAsArrayBuffer(file);
    await loadBookFromBuffer(side, data);
}

async function saveCurrentSession() {
    const origFile = state.original.file;
    const transFile = state.translation.file;
    if (!origFile || !transFile) return;

    const originalName = origFile.name;
    const translationName = transFile.name;
    const name = `${stripExt(originalName)} / ${stripExt(translationName)}`;

    const sessions = await getAllSessions();
    const existing = sessions.find(s => s.originalName === originalName && s.translationName === translationName);

    if (existing) {
        await updateSessionPosition(existing.id, state.original.currentPage, state.translationOffset);
        state.currentSessionId = existing.id;
        return;
    }

    // Enforce 20-session limit (drop least recently opened)
    if (sessions.length >= 20) {
        await deleteSession(sessions[sessions.length - 1].id);
    }

    // Read files again — first reads were consumed by PDF.js/EPUB.js
    const [originalData, translationData] = await Promise.all([
        readFileAsArrayBuffer(origFile),
        readFileAsArrayBuffer(transFile)
    ]);

    const meta = {
        name,
        originalName, originalType: state.original.type,
        translationName, translationType: state.translation.type,
        currentPage: state.original.currentPage,
        translationOffset: state.translationOffset,
        lastOpened: Date.now()
    };

    const id = await dbPut('sessions', meta);
    await dbPut('sessionFiles', { id, originalData, translationData });
    state.currentSessionId = id;
}

// Filter EPUB chapters to only include actual chapters
function filterEpubChapters(chapters) {
    return chapters.filter(chapter => {
        const label = chapter.label.toLowerCase();
        const filename = chapter.filename.toLowerCase();
        
        console.log(`Checking chapter: "${chapter.label}" (file: ${filename})`);
        
        // Keep if starts with "chapter" and a number
        if (label.match(/^chapter\s*\d+/i)) {
            console.log(`  ✓ Keep: Matches "Chapter N" pattern`);
            return true;
        }
        
        // Keep if starts with a number
        if (label.match(/^\d+/)) {
            console.log(`  ✓ Keep: Starts with number`);
            return true;
        }
        
        // Keep if file is "chapterN" or "chN" pattern
        if (filename.match(/^(chapter|ch|cap|capitolo|chapitre)[-_]?\d+/i)) {
            console.log(`  ✓ Keep: Filename matches chapter pattern`);
            return true;
        }
        
        // Keep if it's just a number
        if (filename.match(/^\d+$/)) {
            console.log(`  ✓ Keep: Filename is just a number`);
            return true;
        }
        
        // Keep if Roman numerals (common for chapters)
        if (label.match(/^[ivxlcdm]+$/i) && label.length <= 5) {
            console.log(`  ✓ Keep: Roman numeral`);
            return true;
        }
        
        // International chapter patterns
        if (label.match(/^(capitolo|chapitre|capítulo|kapitel)\s*\d+/i)) {
            console.log(`  ✓ Keep: International chapter pattern`);
            return true;
        }
        
        // Skip common frontmatter/backmatter filenames
        const skipPatterns = [
            'cover', 'title', 'copyright', 'toc', 'contents',
            'dedication', 'acknowledgment', 'preface', 'introduction',
            'prologue', 'epilogue', 'appendix', 'bibliography',
            'index', 'about', 'publisher', 'colophon', 'frontmatter',
            'backmatter', 'halftitle'
        ];
        
        for (const pattern of skipPatterns) {
            if (filename.includes(pattern)) {
                console.log(`  ✗ Skip: Matches skip pattern "${pattern}"`);
                return false;
            }
        }
        
        // If we got here and it's early in the book (first 5 items), skip it
        // (likely frontmatter)
        if (chapter.index < 5 && !filename.match(/\d/)) {
            console.log(`  ✗ Skip: Early in book with no numbers`);
            return false;
        }
        
        // Otherwise keep it (be permissive rather than filtering too much)
        console.log(`  ✓ Keep: Default (permissive)`);
        return true;
    });
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Rendering
async function renderBothSides() {
    updateNavigationButtons();

    // Calculate translation page using offset
    const translationPage = state.original.currentPage + state.translationOffset;
    state.translation.currentPage = Math.max(1, Math.min(translationPage, state.translation.totalPages));

    await Promise.all([
        renderSide('original', state.original.currentPage),
        renderSide('translation', state.translation.currentPage)
    ]);
    
    // Update dropdown to reflect current position
    if (elements.chapterSelectOriginal) {
        elements.chapterSelectOriginal.value = state.original.currentPage - 1;
    }
    
    // Setup synchronized scrolling after both sides are rendered
    setupSyncedScrolling();

    // Auto-save position (fire-and-forget — does not block navigation)
    if (state.currentSessionId) {
        updateSessionPosition(state.currentSessionId, state.original.currentPage, state.translationOffset);
    }
}

async function renderSide(side, pageNum) {
    const sideState = state[side];
    
    if (sideState.type === 'pdf') {
        await renderPDF(side, pageNum);
    } else if (sideState.type === 'epub') {
        await renderEPUB(side, pageNum);
    }
}

async function renderPDF(side, pageNum) {
    const canvas = document.getElementById(side === 'original' ? 'canvas-original' : 'canvas-translation');
    const epubContainer = document.getElementById(side === 'original' ? 'epub-original' : 'epub-translation');
    
    canvas.style.display = 'block';
    epubContainer.style.display = 'none';
    
    const context = canvas.getContext('2d');
    const pdf = state[side].pdf;

    if (pageNum > pdf.numPages || pageNum < 1) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const page = await pdf.getPage(pageNum);
    
    const viewport = page.getViewport({ scale: 1 });
    const panelWidth = canvas.parentElement.clientWidth - 40;
    const scale = Math.min(panelWidth / viewport.width, 2.0);
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({
        canvasContext: context,
        viewport: scaledViewport
    }).promise;
}

async function renderEPUB(side, chapterNum) {
    const canvas = document.getElementById(side === 'original' ? 'canvas-original' : 'canvas-translation');
    const epubContainer = document.getElementById(side === 'original' ? 'epub-original' : 'epub-translation');
    
    canvas.style.display = 'none';
    epubContainer.style.display = 'block';
    
    const book = state[side].epub;
    const chapters = state[side].filteredChapters;
    
    if (chapterNum > chapters.length || chapterNum < 1) {
        epubContainer.innerHTML = '<div style="padding: 20px; color: #666;">No corresponding chapter</div>';
        return;
    }

    // Get the chapter from filtered list
    const chapter = chapters[chapterNum - 1];
    console.log(`Rendering ${side} chapter ${chapterNum}:`, chapter.label, 'at original index:', chapter.index);
    
    try {
        // Get the spine item using the ORIGINAL index (not filtered index)
        const spineItem = book.spine.spineItems[chapter.index];
        if (!spineItem) {
            console.error(`Could not find spine item at index ${chapter.index}`);
            epubContainer.innerHTML = '<div style="padding: 20px; color: #666;">Chapter not found</div>';
            return;
        }
        
        // Load the chapter content
        const doc = await spineItem.load(book.load.bind(book));
        
        // Extract text content and render it
        const bodyContent = doc.querySelector('body');
        if (bodyContent) {
            // Clear container
            epubContainer.innerHTML = '';
            
            // Create a wrapper for styling
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'epub-content';
            contentWrapper.innerHTML = bodyContent.innerHTML;
            
            // Apply some basic styling to make it readable
            contentWrapper.style.maxWidth = '800px';
            contentWrapper.style.margin = '0 auto';
            contentWrapper.style.lineHeight = '1.8';
            contentWrapper.style.fontSize = '16px';
            contentWrapper.style.padding = '20px';
            
            epubContainer.appendChild(contentWrapper);
            
            // Scroll to top
            epubContainer.scrollTop = 0;
            
            // Apply text mode (handles initial dark mode)
            if (typeof applyTextMode === 'function') {
                applyTextMode();
            }
        } else {
            epubContainer.innerHTML = '<div style="padding: 20px; color: #666;">Could not load chapter content</div>';
        }
        
        await spineItem.unload();
    } catch (error) {
        console.error(`Error rendering ${side} EPUB:`, error);
        epubContainer.innerHTML = `<div style="padding: 20px; color: #666;">Error loading chapter: ${error.message}</div>`;
    }
}

// Sync point calculation
// Navigation
elements.prevButton.addEventListener('click', async () => {
    if (state.original.currentPage > 1) {
        state.original.currentPage--;
        await renderBothSides();
    }
});

elements.nextButton.addEventListener('click', async () => {
    if (state.original.currentPage < state.original.totalPages) {
        state.original.currentPage++;
        await renderBothSides();
    }
});

// Keyboard navigation
document.addEventListener('keydown', async (e) => {
    if (elements.readerScreen.style.display !== 'flex') return;
    
    if (e.key === 'ArrowLeft' && state.original.currentPage > 1) {
        state.original.currentPage--;
        await renderBothSides();
    } else if (e.key === 'ArrowRight' && state.original.currentPage < state.original.totalPages) {
        state.original.currentPage++;
        await renderBothSides();
    }
});

// Touch/swipe navigation for mobile/iPad
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

function handleSwipe() {
    const swipeThreshold = 50; // Minimum distance for swipe
    const maxVerticalMovement = 100; // Max vertical movement allowed
    
    const horizontalDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);
    
    // Only process horizontal swipes (not vertical scrolling)
    if (verticalDistance > maxVerticalMovement) {
        return;
    }
    
    if (Math.abs(horizontalDistance) > swipeThreshold) {
        if (horizontalDistance > 0) {
            // Swipe right -> Previous chapter
            if (state.original.currentPage > 1) {
                state.original.currentPage--;
                renderBothSides();
            }
        } else {
            // Swipe left -> Next chapter
            if (state.original.currentPage < state.original.totalPages) {
                state.original.currentPage++;
                renderBothSides();
            }
        }
    }
}

// Add touch listeners to reader screen
document.addEventListener('DOMContentLoaded', () => {
    const readerScreen = document.getElementById('reader-screen');
    
    readerScreen.addEventListener('touchstart', (e) => {
        if (elements.readerScreen.style.display !== 'flex') return;
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    readerScreen.addEventListener('touchend', (e) => {
        if (elements.readerScreen.style.display !== 'flex') return;
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
});

function updateNavigationButtons() {
    elements.prevButton.disabled = state.original.currentPage === 1;
    elements.nextButton.disabled = state.original.currentPage >= state.original.totalPages;
}

// Screen management
function showScreen(screen) {
    elements.uploadScreen.style.display = screen === 'upload' ? 'flex' : 'none';
    elements.syncScreen.style.display = screen === 'sync' ? 'flex' : 'none';
    elements.readerScreen.style.display = screen === 'reader' ? 'flex' : 'none';
}

elements.closeButton.addEventListener('click', async () => {
    if (state.currentSessionId) {
        await updateSessionPosition(state.currentSessionId, state.original.currentPage, state.translationOffset);
    }
    showScreen('upload');
    renderLibrary();
});

// ============================================================
// Library UI
// ============================================================

async function renderLibrary() {
    const section = document.getElementById('library-section');
    const list = document.getElementById('library-list');
    if (!section || !list) return;

    const sessions = await getAllSessions();
    if (sessions.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    sessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'library-item';

        const dateStr = new Date(session.lastOpened).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const typeInfo = `${session.originalType.toUpperCase()} / ${session.translationType.toUpperCase()}`;

        item.innerHTML = `
            <div class="library-item-info">
                <div class="library-item-name">${session.name}</div>
                <div class="library-item-meta">Chapter ${session.currentPage} &bull; ${typeInfo} &bull; ${dateStr}</div>
            </div>
            <button class="library-item-delete" aria-label="Delete">&times;</button>
        `;

        item.querySelector('.library-item-info').addEventListener('click', () => {
            loadSessionFromLibrary(session.id);
        });

        item.querySelector('.library-item-delete').addEventListener('click', async e => {
            e.stopPropagation();
            await deleteSession(session.id);
            renderLibrary();
        });

        list.appendChild(item);
    });
}

async function loadSessionFromLibrary(sessionId) {
    const [meta, files] = await Promise.all([
        dbGet('sessions', sessionId),
        dbGet('sessionFiles', sessionId)
    ]);
    if (!meta || !files) { alert('Saved book data not found.'); return; }

    // Save outgoing session position before switching
    if (state.currentSessionId && state.currentSessionId !== sessionId) {
        await updateSessionPosition(state.currentSessionId, state.original.currentPage, state.translationOffset);
    }

    elements.startButton.textContent = 'Loading...';
    elements.startButton.disabled = true;

    try {
        state.original.file = null;
        state.original.type = meta.originalType;
        state.translation.file = null;
        state.translation.type = meta.translationType;
        scrollListenersAttached = false;

        await Promise.all([
            loadBookFromBuffer('original', files.originalData),
            loadBookFromBuffer('translation', files.translationData)
        ]);

        state.original.currentPage = meta.currentPage;
        state.translationOffset = meta.translationOffset;
        state.currentSessionId = sessionId;

        updateOffsetDisplay();
        populateChapterDropdowns();
        showScreen('reader');
        await renderBothSides();

        // Mark as recently opened (fire-and-forget)
        updateSessionPosition(sessionId, meta.currentPage, meta.translationOffset);
    } catch (error) {
        console.error('Error loading session:', error);
        alert(`Error loading saved books: ${error.message}`);
    }

    elements.startButton.textContent = 'Start Reading';
    elements.startButton.disabled = false;
}

// Render library on page load
renderLibrary();

// ============================================================
// Panel Toggle (dual / left-only / right-only)
// ============================================================

let panelMode = null; // null = both, 'original' = left only, 'translation' = right only

function cyclePanelMode() {
    const readerScreen = elements.readerScreen;
    const btn = elements.panelToggle;

    if (panelMode === null) {
        panelMode = 'original';
        readerScreen.classList.add('show-original');
        btn.textContent = '← Left';
    } else if (panelMode === 'original') {
        panelMode = 'translation';
        readerScreen.classList.remove('show-original');
        readerScreen.classList.add('show-translation');
        btn.textContent = 'Right →';
    } else {
        panelMode = null;
        readerScreen.classList.remove('show-translation');
        btn.textContent = 'Both';
    }

    // Re-render newly visible panels so PDFs rescale to the new width
    if (panelMode !== 'translation') renderSide('original', state.original.currentPage);
    if (panelMode !== 'original') renderSide('translation', state.translation.currentPage);
}

if (elements.panelToggle) {
    elements.panelToggle.addEventListener('click', cyclePanelMode);
}

// ============================================================
// Immersive Mode (tap content area to hide/show controls)
// ============================================================

let isImmersive = false;
let isTogglingImmersive = false;

function toggleImmersiveMode() {
    isImmersive = !isImmersive;
    isTogglingImmersive = true;
    elements.readerScreen.classList.toggle('immersive', isImmersive);

    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        const { StatusBar } = Capacitor.Plugins;
        if (isImmersive) {
            StatusBar.hide();
        } else {
            StatusBar.show();
        }
    }

    // StatusBar show/hide triggers a viewport resize — suppress the re-render
    setTimeout(() => { isTogglingImmersive = false; }, 600);
}

document.getElementById('content-wrapper').addEventListener('click', e => {
    if (elements.readerScreen.style.display !== 'flex') return;
    if (e.target.closest('button, select, a, input')) return;
    toggleImmersiveMode();
});

// Synchronized scrolling for EPUBs
let scrollSyncEnabled = true;
let lastScrollSource = null;
let scrollListenersAttached = false;

function setupSyncedScrolling() {
    const originalContainer = document.getElementById('epub-original');
    const translationContainer = document.getElementById('epub-translation');
    
    // Show/hide scroll sync button based on content type
    if (state.original.type === 'epub' && state.translation.type === 'epub') {
        elements.scrollSyncToggle.style.display = 'block';
    } else {
        elements.scrollSyncToggle.style.display = 'none';
        return;
    }
    
    // Only attach listeners once
    if (scrollListenersAttached) {
        return;
    }
    
    const handleOriginalScroll = () => {
        if (!scrollSyncEnabled || lastScrollSource === 'translation') {
            lastScrollSource = null;
            return;
        }
        
        lastScrollSource = 'original';
        const translation = document.getElementById('epub-translation');
        syncScroll(originalContainer, translation);
    };
    
    const handleTranslationScroll = () => {
        if (!scrollSyncEnabled || lastScrollSource === 'original') {
            lastScrollSource = null;
            return;
        }
        
        lastScrollSource = 'translation';
        const original = document.getElementById('epub-original');
        syncScroll(translationContainer, original);
    };
    
    originalContainer.addEventListener('scroll', handleOriginalScroll, { passive: true });
    translationContainer.addEventListener('scroll', handleTranslationScroll, { passive: true });
    
    scrollListenersAttached = true;
    console.log('Scroll sync listeners attached');
}

function syncScroll(source, target) {
    if (!target || !source) return;
    
    // Calculate scroll percentage of source
    const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
    
    // Apply same percentage to target
    if (isFinite(scrollPercentage)) {
        const targetScroll = scrollPercentage * (target.scrollHeight - target.clientHeight);
        target.scrollTop = targetScroll;
    }
}

// Handle window resize
window.addEventListener('resize', async () => {
    if (isTogglingImmersive) return;
    if (elements.readerScreen.style.display === 'flex' && (state.original.pdf || state.original.epub)) {
        await renderBothSides();
    }
});

