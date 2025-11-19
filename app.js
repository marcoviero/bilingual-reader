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
        allChapters: [],  // All chapters from EPUB
        filteredChapters: []  // Filtered chapters
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
    syncPoints: [], // Array of {original: num, translation: num}
    currentBookId: null,
    filterChapters: true,  // Filter out non-chapter content
    textDarkMode: false  // Dark mode for reading text
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
    addSyncButton: document.getElementById('add-sync-point'),
    doneSyncButton: document.getElementById('done-sync'),
    editSyncButton: document.getElementById('edit-sync'),
    closeButton: document.getElementById('close-reader'),
    editSyncBottomButton: document.getElementById('edit-sync-bottom'),
    closeBottomButton: document.getElementById('close-reader-bottom'),
    prevButton: document.getElementById('prev-page'),
    nextButton: document.getElementById('next-page'),
    positionInfo: document.getElementById('position-info'),
    syncStatus: document.getElementById('sync-status'),
    syncPointsContainer: document.getElementById('sync-points-container'),
    syncCount: document.getElementById('sync-count'),
    originalLocation: document.getElementById('original-location'),
    translationLocation: document.getElementById('translation-location'),
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
    elements.textModeToggle.addEventListener('click', () => {
        state.textDarkMode = !state.textDarkMode;
        const originalContainer = document.getElementById('epub-original');
        const translationContainer = document.getElementById('epub-translation');
        
        if (state.textDarkMode) {
            originalContainer.classList.add('text-dark-mode');
            translationContainer.classList.add('text-dark-mode');
            elements.textModeToggle.textContent = '🌙 Dark Text';
        } else {
            originalContainer.classList.remove('text-dark-mode');
            translationContainer.classList.remove('text-dark-mode');
            elements.textModeToggle.textContent = '☀️ Light Text';
        }
        console.log('Text mode:', state.textDarkMode ? 'dark' : 'light');
    });
}

// Bottom button handlers
if (elements.editSyncBottomButton) {
    elements.editSyncBottomButton.addEventListener('click', () => {
        showScreen('sync');
        updateSyncPointsList();
    });
}

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

// Sync point link handler
document.addEventListener('DOMContentLoaded', () => {
    const syncLink = document.getElementById('sync-link');
    if (syncLink) {
        syncLink.style.pointerEvents = 'none';
        syncLink.style.opacity = '0.5';
        syncLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (state.original.file && state.translation.file) {
                showScreen('sync');
                updateSyncPointsList();
            }
        });
    }
});

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

// Sync point management
elements.addSyncButton.addEventListener('click', () => {
    const originalLoc = elements.originalLocation.value.trim();
    const translationLoc = elements.translationLocation.value.trim();

    if (!originalLoc || !translationLoc) {
        alert('Please enter both locations');
        return;
    }

    const originalNum = parseLocationToNumber(originalLoc, state.original.type);
    const translationNum = parseLocationToNumber(translationLoc, state.translation.type);

    if (originalNum === null || translationNum === null) {
        alert('Invalid location format. Use numbers like "1", "5", "23"');
        return;
    }

    state.syncPoints.push({
        original: originalNum,
        translation: translationNum
    });

    state.syncPoints.sort((a, b) => a.original - b.original);

    elements.originalLocation.value = '';
    elements.translationLocation.value = '';
    
    updateSyncPointsList();
    saveSyncPoints();
});

elements.doneSyncButton.addEventListener('click', () => {
    showScreen('upload');
});

elements.editSyncButton.addEventListener('click', () => {
    showScreen('sync');
    updateSyncPointsList();
});

function parseLocationToNumber(loc, type) {
    // Extract just the number from strings like "page 5", "chapter 3", "5", etc.
    const match = loc.match(/\d+/);
    return match ? parseInt(match[0]) : null;
}

function updateSyncPointsList() {
    elements.syncCount.textContent = `(${state.syncPoints.length})`;
    
    if (state.syncPoints.length === 0) {
        elements.syncPointsContainer.innerHTML = '<p style="color: #666; font-style: italic;">No sync points set. Add at least 2 for best results.</p>';
        return;
    }

    elements.syncPointsContainer.innerHTML = state.syncPoints.map((point, index) => `
        <div class="sync-point-item">
            <div class="location">
                <strong>Original:</strong> ${formatLocation(point.original, state.original.type)} 
                ↔️ 
                <strong>Translation:</strong> ${formatLocation(point.translation, state.translation.type)}
            </div>
            <button onclick="removeSyncPoint(${index})">Remove</button>
        </div>
    `).join('');
}

function formatLocation(num, type) {
    return type === 'epub' ? `Chapter ${num}` : `Page ${num}`;
}

window.removeSyncPoint = function(index) {
    state.syncPoints.splice(index, 1);
    updateSyncPointsList();
    saveSyncPoints();
};

// Load books
async function loadBooks() {
    console.log('Loading books...');
    console.log('Original:', state.original.file?.name, state.original.type);
    console.log('Translation:', state.translation.file?.name, state.translation.type);
    
    try {
        await Promise.all([
            loadBook('original'),
            loadBook('translation')
        ]);

        console.log('Books loaded successfully');
        console.log('Original pages:', state.original.totalPages);
        console.log('Translation pages:', state.translation.totalPages);

        // Load saved sync points
        loadSyncPoints();
        updateSyncStatus();
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
            
            // Store all chapters
            state[side].allChapters = book.spine.spineItems.map((item, index) => ({
                index: index,
                href: item.href,
                label: item.idref || `Chapter ${index + 1}`
            }));
            
            console.log(`${side} EPUB all chapters:`, state[side].allChapters.length);
            
            // Filter chapters if enabled
            if (state.filterChapters) {
                state[side].filteredChapters = filterEpubChapters(state[side].allChapters);
                console.log(`${side} EPUB filtered chapters:`, state[side].filteredChapters.length);
                console.log('Filtered chapter labels:', state[side].filteredChapters.map(c => c.label));
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
        
        // Keep if starts with "chapter" or a number
        if (label.match(/^chapter\s*\d+/i)) return true;
        if (label.match(/^\d+/)) return true;
        if (label.match(/^capitolo\s*\d+/i)) return true;  // Italian
        if (label.match(/^chapitre\s*\d+/i)) return true;  // French
        if (label.match(/^capítulo\s*\d+/i)) return true;  // Spanish
        if (label.match(/^kapitel\s*\d+/i)) return true;   // German
        
        // Skip common frontmatter/backmatter
        if (label.match(/^(title|copyright|toc|contents|cover|dedication|acknowledgment|preface|introduction|prologue|epilogue|appendix|bibliography|index|about|publisher)/i)) {
            return false;
        }
        
        // If it's just a number or letter, keep it
        if (label.match(/^[0-9]+$/)) return true;
        if (label.match(/^[ivxlcdm]+$/i) && label.length <= 5) return true; // Roman numerals
        
        return false;
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
    updatePositionInfo();
    updateNavigationButtons();

    const translationPage = calculateCorrespondingPage(state.original.currentPage);
    state.translation.currentPage = translationPage;

    await Promise.all([
        renderSide('original', state.original.currentPage),
        renderSide('translation', state.translation.currentPage)
    ]);
    
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
function calculateCorrespondingPage(originalPage) {
    if (state.syncPoints.length === 0) {
        // No sync points - simple 1:1 mapping
        return originalPage;
    }

    if (state.syncPoints.length === 1) {
        // Only one sync point - use offset
        const offset = state.syncPoints[0].translation - state.syncPoints[0].original;
        return Math.max(1, originalPage + offset);
    }

    // Find the surrounding sync points
    let before = null;
    let after = null;

    for (let i = 0; i < state.syncPoints.length; i++) {
        if (state.syncPoints[i].original <= originalPage) {
            before = state.syncPoints[i];
        }
        if (state.syncPoints[i].original >= originalPage && !after) {
            after = state.syncPoints[i];
        }
    }

    // Before first sync point
    if (!before) {
        const firstPoint = state.syncPoints[0];
        const offset = firstPoint.translation - firstPoint.original;
        return Math.max(1, originalPage + offset);
    }

    // After last sync point
    if (!after) {
        const lastPoint = state.syncPoints[state.syncPoints.length - 1];
        const offset = lastPoint.translation - lastPoint.original;
        return originalPage + offset;
    }

    // Interpolate between two sync points
    if (before.original === originalPage) {
        return before.translation;
    }

    const ratio = (originalPage - before.original) / (after.original - before.original);
    const translationPage = Math.round(before.translation + ratio * (after.translation - before.translation));
    
    return Math.max(1, translationPage);
}

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

function updatePositionInfo() {
    const originalLabel = state.original.type === 'epub' ? 'Ch' : 'Pg';
    const translationLabel = state.translation.type === 'epub' ? 'Ch' : 'Pg';
    
    const originalLoc = `${originalLabel} ${state.original.currentPage}/${state.original.totalPages}`;
    const translationLoc = `${translationLabel} ${state.translation.currentPage}/${state.translation.totalPages}`;
    
    elements.positionInfo.textContent = `${originalLoc} ↔️ ${translationLoc}`;
}

function updateNavigationButtons() {
    const isPdf = state.original.type === 'pdf';
    const prevText = isPdf ? '← Previous' : '← Previous Chapter';
    const nextText = isPdf ? 'Next →' : 'Next Chapter →';
    
    elements.prevButton.textContent = prevText;
    elements.nextButton.textContent = nextText;
    
    elements.prevButton.disabled = state.original.currentPage === 1;
    elements.nextButton.disabled = state.original.currentPage >= state.original.totalPages;
}

function updateSyncStatus() {
    if (state.syncPoints.length > 0) {
        elements.syncStatus.textContent = `✓ ${state.syncPoints.length} sync points active`;
    } else {
        elements.syncStatus.textContent = 'No sync points (1:1 mapping)';
    }
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

// Local storage for sync points
function saveSyncPoints() {
    if (state.currentBookId) {
        const data = {
            syncPoints: state.syncPoints,
            originalName: state.original.file?.name,
            translationName: state.translation.file?.name
        };
        localStorage.setItem(`sync_${state.currentBookId}`, JSON.stringify(data));
    }
}

function loadSyncPoints() {
    // Generate a simple book ID based on filenames
    state.currentBookId = `${state.original.file.name}_${state.translation.file.name}`.replace(/[^a-zA-Z0-9]/g, '_');
    
    const saved = localStorage.getItem(`sync_${state.currentBookId}`);
    if (saved) {
        const data = JSON.parse(saved);
        state.syncPoints = data.syncPoints || [];
        updateSyncStatus();
    }
}

// Synchronized scrolling for EPUBs
let scrollSyncEnabled = true;
let lastScrollSource = null;

function setupSyncedScrolling() {
    const originalContainer = document.getElementById('epub-original');
    const translationContainer = document.getElementById('epub-translation');
    
    // Show/hide scroll sync button based on content type
    if (state.original.type === 'epub' && state.translation.type === 'epub') {
        elements.scrollSyncToggle.style.display = 'block';
    } else {
        elements.scrollSyncToggle.style.display = 'none';
        return; // Don't set up syncing for non-EPUB content
    }
    
    // Remove any existing listeners by cloning
    const newOriginal = originalContainer.cloneNode(true);
    const newTranslation = translationContainer.cloneNode(true);
    originalContainer.parentNode.replaceChild(newOriginal, originalContainer);
    translationContainer.parentNode.replaceChild(newTranslation, translationContainer);
    
    const original = document.getElementById('epub-original');
    const translation = document.getElementById('epub-translation');
    
    original.addEventListener('scroll', () => {
        if (!scrollSyncEnabled || lastScrollSource === 'translation') {
            lastScrollSource = null;
            return;
        }
        
        lastScrollSource = 'original';
        syncScroll(original, translation);
    });
    
    translation.addEventListener('scroll', () => {
        if (!scrollSyncEnabled || lastScrollSource === 'original') {
            lastScrollSource = null;
            return;
        }
        
        lastScrollSource = 'translation';
        syncScroll(translation, original);
    });
}

function syncScroll(source, target) {
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
