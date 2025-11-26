// Set up PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
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
    translationOffset: 0,  // How many chapters ahead/behind translation is
    currentBookId: null,
    filterChapters: true,
    textDarkMode: true
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
    textModeToggle: document.getElementById('toggle-text-mode')
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
    // Set initial state (dark text by default)
    elements.textModeToggle.textContent = '☀️ Light Text';
    
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
    elements.closeBottomButton.addEventListener('click', () => {
        showScreen('upload');
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

async function loadBook(side) {
    console.log(`Loading ${side} book...`);
    const file = state[side].file;
    const type = state[side].type;

    try {
        if (type === 'pdf') {
            const data = await readFileAsArrayBuffer(file);
            state[side].pdf = await pdfjsLib.getDocument({data}).promise;
            state[side].totalPages = state[side].pdf.numPages;
            console.log(`${side} PDF loaded: ${state[side].totalPages} pages`);
        } else if (type === 'epub') {
            const data = await readFileAsArrayBuffer(file);
            const book = ePub();
            await book.open(data);
            state[side].epub = book;
            
            // Get spine (reading order)
            await book.ready;
            
            // Store all chapters with better label detection
            state[side].allChapters = [];
            for (let i = 0; i < book.spine.spineItems.length; i++) {
                const item = book.spine.spineItems[i];
                
                // Try to get a meaningful label from multiple sources
                let label = '';
                
                // Try the href filename first (often descriptive)
                const hrefParts = item.href.split('/');
                const filename = hrefParts[hrefParts.length - 1].replace('.xhtml', '').replace('.html', '');
                
                // Clean up common patterns
                if (filename.match(/^(chapter|ch|cap|capitolo|chapitre)[-_]?\d+/i)) {
                    label = filename.replace(/[-_]/g, ' ');
                } else if (filename.match(/^\d+$/)) {
                    label = `Chapter ${filename}`;
                } else if (item.idref) {
                    label = item.idref.replace(/[-_]/g, ' ');
                } else {
                    label = filename || `Section ${i + 1}`;
                }
                
                state[side].allChapters.push({
                    index: i,
                    href: item.href,
                    label: label,
                    filename: filename
                });
            }
            
            console.log(`${side} EPUB all chapters:`, state[side].allChapters.length);
            console.log(`First few chapters:`, state[side].allChapters.slice(0, 5).map(c => `[${c.index}] ${c.label} (${c.filename})`));
            
            // Filter chapters if enabled
            if (state.filterChapters) {
                state[side].filteredChapters = filterEpubChapters(state[side].allChapters);
                console.log(`${side} EPUB filtered chapters:`, state[side].filteredChapters.length);
                console.log('Filtered chapter indices:', state[side].filteredChapters.map(c => `[${c.index}] ${c.label}`));
                
                // Fallback: if filtering removed everything, don't filter
                if (state[side].filteredChapters.length === 0) {
                    console.warn(`${side}: Filtering removed all chapters! Using all chapters instead.`);
                    state[side].filteredChapters = state[side].allChapters;
                }
            } else {
                state[side].filteredChapters = state[side].allChapters;
            }
            
            state[side].totalPages = state[side].filteredChapters.length;
            console.log(`${side} EPUB loaded: ${state[side].totalPages} chapters (after filtering)`);
        }
    } catch (error) {
        console.error(`Error loading ${side} book:`, error);
        throw new Error(`Failed to load ${side} ${type.toUpperCase()}: ${error.message}`);
    }
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

elements.closeButton.addEventListener('click', () => {
    showScreen('upload');
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
    if (elements.readerScreen.style.display === 'flex' && (state.original.pdf || state.original.epub)) {
        await renderBothSides();
    }
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    });
}
