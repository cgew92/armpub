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
        allPapers = data.papers.map((paper, index) => ({
            ...paper,
            pdf_url: processPdfUrl(paper.pdf_url),
            _initialIndex: index,
            _timestamp: new Date(paper.date_modified).getTime()
        }));

        filteredPapers = [...allPapers];

        sortSelect.value = 'date-desc'; // ensure UI matches the actual sort
        
        sortPapers();
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
}

// Create individual paper card HTML
function createPaperCard(paper) {
    const authorsText = Array.isArray(paper.authors) 
        ? paper.authors.join(', ') 
        : paper.authors;

    const formattedDate = formatDate(paper.date_modified);

    return `
        <div class="pub-item">
            <h1 class="pub-title">${escapeHtml(paper.title)}</h1>
            <div class="pub-meta">
                <span class="pub-authors">By ${escapeHtml(authorsText)}</span> • 
                <span class="pub-date">Last modified: ${formattedDate}</span>
            </div>
            <div class="pub-abstract-wrapper">
                <p class="pub-abstract collapsed">
                    ${escapeHtml(paper.abstract)}
                    <span class="pub-ellipsis">…</span>
                </p>
                <button class="pub-toggle">Expand abstract</button>
            </div>
            <div class="pub-actions">
                <a href="${paper.pdf_url}" class="pub-download" target="_blank">
                    <i style="color: white, width: 15, height: 15" data-feather="download"></i> Download PDF
                </a>
            </div>
        </div>
    `;
}

document.addEventListener("click", function(e) {
    if (e.target.classList.contains("pub-toggle")) {
        const abstract = e.target.previousElementSibling;
        const ellipsis = abstract.querySelector(".pub-ellipsis");
        const isCollapsed = abstract.classList.toggle("collapsed");

        if (isCollapsed) {
            e.target.textContent = "Expand abstract ↓";
            ellipsis.style.display = "inline";
        } else {
            e.target.textContent = "Collapse abstract ↑";
            ellipsis.style.display = "none";
        }
    }
});



// Toggle abstract expansion - Use data attributes for precise targeting
// Simplified toggle function - replace your existing toggleAbstract function
function toggleAbstract(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const button = e.target;
    const cardId = button.getAttribute('data-card-id');
    
    console.log('Toggling card:', cardId);
    
    if (!cardId) {
        console.error('No card ID found');
        return;
    }
    
    // Find elements by data-card-id to ensure we get the right ones
    const preview = document.querySelector(`[data-card-id="${cardId}"].abstract-preview`);
    const full = document.querySelector(`[data-card-id="${cardId}"].abstract-full`);
    
    console.log('Preview:', preview);
    console.log('Full:', full);
    
    if (!preview || !full) {
        console.error('Could not find elements for card:', cardId);
        return;
    }
    
    // Check current state
    const isExpanded = full.style.display === 'block';
    console.log('Is expanded:', isExpanded);
    
    if (isExpanded) {
        // Collapse
        full.style.display = 'none';
        preview.style.display = 'block';
        button.textContent = 'Read full abstract';
        console.log('Collapsed card:', cardId);
    } else {
        // Expand
        full.style.display = 'block';
        preview.style.display = 'none';
        button.textContent = 'Show less';
        console.log('Expanded card:', cardId);
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
        case 'date-desc': {
            const dateA = new Date(a.date_modified);
            const dateB = new Date(b.date_modified);
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;
            const diff = b._timestamp - a._timestamp;
            return diff !== 0 ? diff : a._initialIndex - b._initialIndex;
        }
        case 'date-asc': {
            const dateA = new Date(a.date_modified);
            const dateB = new Date(b.date_modified);
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;
            const diff = a._timestamp - b._timestamp;
            return diff !== 0 ? diff : a._initialIndex - b._initialIndex;
        }
        case 'title-asc': {
            const titleA = (a.title || '').trim();
            const titleB = (b.title || '').trim();
            const cmp = titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
            return cmp !== 0 ? cmp : a._initialIndex - b._initialIndex;
        }
        case 'title-desc': {
            const titleA = (a.title || '').trim();
            const titleB = (b.title || '').trim();
            const cmp = titleB.localeCompare(titleA, undefined, { numeric: true, sensitivity: 'base' });
            return cmp !== 0 ? cmp : a._initialIndex - b._initialIndex;
        }
        default:
            return a._initialIndex - b._initialIndex;
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
// Email generator handler for "Open in Mail App" and "Copy Message"
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('submission-form');
    if (!form) return;

    const titleInput = document.getElementById('paper-title');
    const authorInput = document.getElementById('author-name');
    const emailInput = document.getElementById('author-email');
    const infoInput = document.getElementById('additional-info');
    const openMailBtn = document.getElementById('open-mail-btn');
    const copyBtn = document.getElementById('copy-message-btn');
    const feedback = document.getElementById('feedback');

    // Replace this with your real editorial inbox
    const RECIPIENT_EMAIL = 'jamesche3.14@gmail.com';

    function parseAuthors(raw) {
        if (!raw) return [];
        // Split by commas, " and ", "&" — conservative splitting
        const parts = raw.split(/,| and | & /i).map(s => s.trim()).filter(Boolean);
        return parts;
    }

    function authorPhrase(authorsArr) {
        if (authorsArr.length === 0) return { who: 'An author', subjectPronoun: 'My', greeting: 'Hello,' };
        if (authorsArr.length === 1) {
            return { who: authorsArr[0], subjectPronoun: 'my', greeting: `Hello, I am ${authorsArr[0]}.` };
        }
        // multiple authors
        const names = authorsArr.join(', ');
        return { who: names, subjectPronoun: 'our', greeting: `Hello, we are ${names}.` };
    }

    function buildMessage() {
        const authorsRaw = authorInput.value.trim();
        const authorsArr = parseAuthors(authorsRaw);
        const title = titleInput.value.trim() || '[Untitled]';
        const contactEmail = emailInput.value.trim() || '';
        const extra = infoInput.value.trim();

        const ap = authorPhrase(authorsArr);
        // Use 'my' vs 'our'
        const possessive = (authorsArr.length <= 1) ? 'my' : 'our';
        const verb = (authorsArr.length <= 1) ? 'is' : 'is';

        // Construct message body
        let body = `${ap.greeting}\n\n`;
        body += `The title of ${possessive} paper ${verb} "${title}".\n\n`;

        if (extra) {
            body += `Additional message:\n${extra}\n\n`;
        }

        body += `Best regards,\n${ap.who}\nContact: ${contactEmail}\n`;

        return {
            subject: `Submission: ${title}`,
            body
        };
    }

    function openMailClient() {
        const { subject, body } = buildMessage();
        // Build mailto link (mailto:recipient?subject=...&body=...)
        // Some mail clients ignore very long mailto bodies, but for simple text it's fine
        const mailto = `mailto:${encodeURIComponent(RECIPIENT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        // Use location.href to open the user's default mail app / client
        window.location.href = mailto;
    }

    async function copyToClipboard() {
        const { subject, body } = buildMessage();
        // Full message includes subject line for convenience
        const full = `Subject: ${subject}\n\n${body}`;
        try {
            await navigator.clipboard.writeText(full);
            feedback.style.display = 'block';
            feedback.textContent = 'Message copied to clipboard. Paste it into your mail app and send.';
            setTimeout(() => { feedback.style.display = 'none'; }, 5000);
        } catch (err) {
            // Fallback: highlight text area with the composed message (create temporary)
            const ta = document.createElement('textarea');
            ta.value = full;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                feedback.style.display = 'block';
                feedback.textContent = 'Message copied to clipboard (fallback).';
                setTimeout(() => { feedback.style.display = 'none'; }, 5000);
            } catch (e2) {
                feedback.style.display = 'block';
                feedback.textContent = 'Could not copy automatically. Please select and copy the message manually.';
                setTimeout(() => { feedback.style.display = 'none'; }, 5000);
            }
            document.body.removeChild(ta);
        }
    }

    // Open mail button click
    openMailBtn.addEventListener('click', function (e) {
        // Validate required fields
        if (!authorInput.value.trim()) {
            feedback.style.display = 'block';
            feedback.textContent = 'Please enter author name(s).';
            return;
        }
        if (!emailInput.value.trim()) {
            feedback.style.display = 'block';
            feedback.textContent = 'Please enter a contact email.';
            return;
        }
        if (!titleInput.value.trim()) {
            feedback.style.display = 'block';
            feedback.textContent = 'Please enter the paper title.';
            return;
        }
        openMailClient();
    });

    // Copy message button click
    copyBtn.addEventListener('click', function (e) {
        if (!authorInput.value.trim() || !emailInput.value.trim() || !titleInput.value.trim()) {
            feedback.style.display = 'block';
            feedback.textContent = 'Please fill in authors, contact email, and paper title before copying.';
            setTimeout(() => { feedback.style.display = 'none'; }, 4000);
            return;
        }
        copyToClipboard();
    });

    // Optional: let Enter submit open-mail behavior for quick keyboard users
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        openMailBtn.click();
    });
});
