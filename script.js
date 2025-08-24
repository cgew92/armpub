// Configuration - Update these URLs for your hosting setup
const CONFIG = {
    // For GitHub repo: https://raw.githubusercontent.com/username/repo/main/papers/papers.json
    // For direct hosting: ./papers/papers.json or /papers/papers.json
    papersJsonUrl: './papers/papers.json',
    // Base URL for PDF files - adjust based on your hosting
    pdfBaseUrl: './papers/',
    // Alternative: you can set these to GitHub raw URLs for reliability
    useGitHubRaw: false, // Set to true to fetch directly from GitHub
    githubUser: 'cgew92',
    githubRepo: 'armpub',
    githubBranch: 'main'
};

// Global variables
let allPapers = [];
let filteredPapers = [];

// DOM elements
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const resetButton = document.getElementById('reset-filters');
const papersGrid = document.getElementById('papers-grid');
const noResults = document.getElementById('no-results');
const paperCount = document.getElementById('paper-count');
const authorCount = document.getElementById('author-count');
const fieldCount = document.getElementById('field-count');
const abstractTextarea = document.getElementById('abstract');
const abstractCount = document.getElementById('abstract-count');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    loadPapers();
    initSearch();
    initAbstractCounter();
    showSection('home');
});

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show specific section
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update nav
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
}

// Load papers from JSON
async function loadPapers() {
    try {
        let papersUrl = CONFIG.papersJsonUrl;
        
        // If configured to use GitHub raw URLs
        if (CONFIG.useGitHubRaw) {
            papersUrl = `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/${CONFIG.githubBranch}/papers/papers.json`;
        }
        
        console.log('Loading papers from:', papersUrl);
        
        const response = await fetch(papersUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch papers: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        allPapers = data.papers || [];
        
        // Process PDF URLs based on configuration
        allPapers = allPapers.map(paper => ({
            ...paper,
            pdf_url: processPdfUrl(paper.pdf_url)
        }));
        
        filteredPapers = [...allPapers];
        
        renderPapers();
        updateStats();
        
        console.log(`Loaded ${allPapers.length} papers successfully`);
    } catch (error) {
        console.error('Error loading papers:', error);
        showEmptyState();
    }
}

// Process PDF URL based on configuration
function processPdfUrl(originalUrl) {
    // If it's already a full URL, return as-is
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
        return originalUrl;
    }
    
    // If using GitHub raw URLs
    if (CONFIG.useGitHubRaw) {
        // Remove leading slash and papers/ if present
        const cleanPath = originalUrl.replace(/^\/?(papers\/)?/, '');
        return `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.githubRepo}/${CONFIG.githubBranch}/papers/${cleanPath}`;
    }
    
    // For local/direct hosting
    if (originalUrl.startsWith('/papers/')) {
        return originalUrl; // Absolute path
    } else if (originalUrl.startsWith('papers/')) {
        return `./${originalUrl}`; // Relative path
    } else {
        return `${CONFIG.pdfBaseUrl}${originalUrl}`; // Just filename
    }
}

// Show empty state when no papers are available
function showEmptyState() {
    papersGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <h3>No Papers Available</h3>
            <p>Papers will appear here once they are added to the repository.</p>
            <p><small>If you're the administrator, check that papers.json exists and is properly formatted.</small></p>
        </div>
    `;
    noResults.style.display = 'none';
}

// Render papers to the grid
function renderPapers() {
    if (filteredPapers.length === 0) {
        papersGrid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    papersGrid.style.display = 'grid';
    noResults.style.display = 'none';
    
    papersGrid.innerHTML = filteredPapers.map(paper => createPaperCard(paper)).join('');
    
    // Add event listeners for expand buttons
    document.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', toggleAbstract);
    });
}

// Create individual paper card HTML
function createPaperCard(paper) {
    const abstractWords = paper.abstract.split(' ');
    const previewText = abstractWords.slice(0, 50).join(' ');
    const hasMore = abstractWords.length > 50;
    
    const authorsText = Array.isArray(paper.authors) 
        ? paper.authors.join(', ') 
        : paper.authors;
    
    const formattedDate = formatDate(paper.date_modified);
    
    return `
        <div class="paper-card" data-id="${paper.id}">
            <div class="paper-header">
                <h3 class="paper-title">${escapeHtml(paper.title)}</h3>
                <div class="paper-authors">By: ${escapeHtml(authorsText)}</div>
                <div class="paper-date">Last modified: ${formattedDate}</div>
            </div>
            <div class="paper-content">
                <div class="paper-abstract">
                    <div class="abstract-preview">
                        ${escapeHtml(previewText)}${hasMore ? '...' : ''}
                    </div>
                    ${hasMore ? `
                        <div class="abstract-full">
                            ${escapeHtml(paper.abstract)}
                        </div>
                        <button class="expand-btn">Read full abstract</button>
                    ` : ''}
                </div>
                <div class="paper-actions">
                    <a href="${paper.pdf_url}" class="pdf-link" target="_blank">
                        <i class="fas fa-file-pdf"></i>
                        View PDF
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Toggle abstract expansion
function toggleAbstract(e) {
    const button = e.target;
    const card = button.closest('.paper-card');
    const preview = card.querySelector('.abstract-preview');
    const full = card.querySelector('.abstract-full');
    
    if (full.style.display === 'block') {
        full.style.display = 'none';
        preview.style.display = 'block';
        button.textContent = 'Read full abstract';
    } else {
        full.style.display = 'block';
        preview.style.display = 'none';
        button.textContent = 'Show less';
    }
}

// Initialize search and filter functionality
function initSearch() {
    searchInput.addEventListener('input', debounce(performSearch, 300));
    sortSelect.addEventListener('change', sortPapers);
    resetButton.addEventListener('click', resetFilters);
}

// Perform search
function performSearch() {
    const query = searchInput.value.toLowerCase().trim();
    
    if (!query) {
        filteredPapers = [...allPapers];
    } else {
        filteredPapers = allPapers.filter(paper => {
            const searchableText = [
                paper.title,
                Array.isArray(paper.authors) ? paper.authors.join(' ') : paper.authors,
                paper.abstract,
                ...(paper.keywords || [])
            ].join(' ').toLowerCase();
            
            return searchableText.includes(query);
        });
    }
    
    sortPapers();
    renderPapers();
}

// Sort papers
function sortPapers() {
    const sortBy = sortSelect.value;
    
    filteredPapers.sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                return new Date(b.date_modified) - new Date(a.date_modified);
            case 'date-asc':
                return new Date(a.date_modified) - new Date(b.date_modified);
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });
    
    renderPapers();
}

// Reset all filters
function resetFilters() {
    searchInput.value = '';
    sortSelect.value = 'date-desc';
    filteredPapers = [...allPapers];
    sortPapers();
}

// Update statistics on home page
function updateStats() {
    // Update paper count
    paperCount.textContent = allPapers.length;
    
    // Update author count (unique authors)
    const uniqueAuthors = new Set();
    allPapers.forEach(paper => {
        const authors = Array.isArray(paper.authors) ? paper.authors : [paper.authors];
        authors.forEach(author => uniqueAuthors.add(author.trim()));
    });
    authorCount.textContent = uniqueAuthors.size;
    
    // Update field count (unique keywords)
    const uniqueFields = new Set();
    allPapers.forEach(paper => {
        if (paper.keywords) {
            paper.keywords.forEach(keyword => uniqueFields.add(keyword.toLowerCase()));
        }
    });
    fieldCount.textContent = uniqueFields.size;
}

// Initialize abstract word counter
function initAbstractCounter() {
    if (abstractTextarea && abstractCount) {
        abstractTextarea.addEventListener('input', updateAbstractCount);
        updateAbstractCount(); // Initial count
    }
}

// Update abstract word count
function updateAbstractCount() {
    const text = abstractTextarea.value.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    abstractCount.textContent = wordCount;
    
    // Change color based on word count
    if (wordCount > 300) {
        abstractCount.style.color = '#e74c3c'; // Red
    } else if (wordCount > 250) {
        abstractCount.style.color = '#f39c12'; // Orange
    } else {
        abstractCount.style.color = '#27ae60'; // Green
    }
}

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function for debouncing search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('submission-form');
    if (form) {
        // Generate filename on form field changes
        const titleInput = document.getElementById('paper-title');
        const authorInput = document.getElementById('author-name');
        const filenamePreview = document.getElementById('filename-preview');
        const filenameText = document.getElementById('filename-text');
        const suggestedFilename = document.getElementById('suggested-filename');
        
        function updateFilename() {
            const title = titleInput.value.trim();
            const authors = authorInput.value.trim();
            
            if (title && authors) {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                
                // Get first author's last name
                const firstAuthor = authors.split(',')[0].trim();
                const authorParts = firstAuthor.split(' ');
                const lastName = authorParts[authorParts.length - 1].toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
                
                // Get first 2-3 words from title
                const titleWords = title.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .split(' ')
                    .filter(word => word.length > 2)
                    .slice(0, 3)
                    .join('-');
                
                const filename = `${year}-${month}-${lastName}-${titleWords}.pdf`;
                
                filenameText.textContent = filename;
                suggestedFilename.value = filename;
                filenamePreview.style.display = 'block';
            } else {
                filenamePreview.style.display = 'none';
                suggestedFilename.value = '';
            }
        }
        
        titleInput.addEventListener('input', updateFilename);
        authorInput.addEventListener('input', updateFilename);
        
        form.addEventListener('submit', function(e) {
            // Add loading state
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;
            
            // Re-enable after 3 seconds (form will redirect/reload)
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }, 3000);
        });
    }
});