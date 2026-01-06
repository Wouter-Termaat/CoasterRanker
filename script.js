// Coaster data - will be loaded from CSV files
    let coastersDataLuca = [];
    let coastersDataWouter = [];
    
    // Updated cache version for improved image fetching with fuzzy matching and park-first strategy
    const CACHE_VERSION = 'v11-fuzzy-park-first';

    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const data = [];
        const seen = new Set(); // Track unique coasters to avoid duplicates
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            if (values.length >= 5) {
                // Parse operatief field more carefully
                const operatiefValue = (values[4] || '').trim();
                const operatiefNum = parseInt(operatiefValue, 10);
                
                const naam = (values[1] || '').trim();
                const park = (values[2] || '').trim();
                const fabrikant = (values[3] || '').trim();
                
                // Create unique key based on name + park to avoid duplicates
                const uniqueKey = `${naam.toLowerCase()}|${park.toLowerCase()}`;
                
                // Only add if we haven't seen this coaster before
                if (!seen.has(uniqueKey)) {
                    seen.add(uniqueKey);
                    data.push({
                        naam: naam,
                        park: park,
                        fabrikant: fabrikant,
                        operatief: isNaN(operatiefNum) ? 0 : operatiefNum
                    });
                }
            }
        }
        
        return data;
    }

    // Helper function to reload CSV data from files
    async function reloadCoasterCSVData() {
        try {
            const [lucaResponse, wouterResponse] = await Promise.all([
                fetch('Top List Coasters v Luca - List of Coaster.csv'),
                fetch('Top List Coasters Wouter - List of Coaster.csv')
            ]);
            
            if (!lucaResponse.ok || !wouterResponse.ok) {
                throw new Error(`HTTP error! Luca: ${lucaResponse.status}, Wouter: ${wouterResponse.status}`);
            }
            
            const lucaText = await lucaResponse.text();
            const wouterText = await wouterResponse.text();
            
            coastersDataLuca = parseCSV(lucaText);
            coastersDataWouter = parseCSV(wouterText);
            
            console.info(`Reloaded CSV: Luca=${coastersDataLuca.length}, Wouter=${coastersDataWouter.length}`);
        } catch (error) {
            console.error('Error reloading CSV data:', error.message);
            // Don't throw - keep existing data if reload fails
        }
    }

    async function loadCoasterData() {
        // FIRST: Check if user is logged in
        const savedUser = localStorage.getItem('lastUser');
        const hasValidUser = savedUser === 'luca' || savedUser === 'wouter';
        
        // If no user is logged in, hide loading overlay immediately and show login screen
        if (!hasValidUser) {
            const overlay = document.getElementById('imageLoadingOverlay');
            if (overlay) {
                overlay.classList.add('hidden');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            }
            
            // Show user selection screen
            const selectionScreen = document.getElementById('userSelectionScreen');
            const profileContent = document.getElementById('profileContent');
            if (selectionScreen) selectionScreen.style.display = 'flex';
            if (profileContent) profileContent.style.display = 'none';
            
            // Disable tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach((tab, index) => {
                if (index !== 0) {
                    tab.style.opacity = '0.5';
                    tab.style.pointerEvents = 'none';
                    tab.style.cursor = 'not-allowed';
                }
            });
            
            // Update badge
            const badge = document.getElementById('currentUserBadge');
            if (badge) badge.textContent = 'Select a user';
            
            // Set header height (if function exists)
            if (typeof setHeaderHeight === 'function') {
                try {
                    setHeaderHeight();
                } catch (e) {
                    console.warn('setHeaderHeight failed:', e);
                }
            }
            
            // Don't proceed with data loading - wait for user to select
            return;
        }
        
        // User is logged in - proceed with normal loading
        try {
            const [lucaResponse, wouterResponse] = await Promise.all([
                fetch('Top List Coasters v Luca - List of Coaster.csv'),
                fetch('Top List Coasters Wouter - List of Coaster.csv')
            ]);
            
            if (!lucaResponse.ok || !wouterResponse.ok) {
                throw new Error(`HTTP error! Luca: ${lucaResponse.status}, Wouter: ${wouterResponse.status}`);
            }
            
            const lucaText = await lucaResponse.text();
            const wouterText = await wouterResponse.text();
            
            coastersDataLuca = parseCSV(lucaText);
            coastersDataWouter = parseCSV(wouterText);
            
            initializeApp();
        } catch (error) {
            console.error('Error loading data:', error.message);
            
            // Show a more helpful error message and offer a file-input fallback
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.3);max-width:560px;text-align:center;z-index:10000;font-family:sans-serif;';
            errorDiv.innerHTML = `
                <h2 style="color:#e74c3c;margin-bottom:10px;">⚠️ Error loading data</h2>
                <p style="margin:6px 0 12px;">The coaster CSVs could not be loaded with fetch (often when opened via <em>file://</em>).</p>
                <div style="font-size:0.9em;color:#666;margin-bottom:12px;">${escapeHtml(error.message || String(error))}</div>
                <div style="display:flex;gap:8px;justify-content:center;flex-direction:column;align-items:stretch;">
                    <label style="font-weight:700;text-align:left;margin-bottom:6px;">Upload CSV for Luca</label>
                    <input id="fallbackLucaFile" type="file" accept=".csv" />
                    <label style="font-weight:700;text-align:left;margin-bottom:6px;margin-top:8px;">Upload CSV for Wouter</label>
                    <input id="fallbackWouterFile" type="file" accept=".csv" />
                    <button id="fallbackLoadBtn" style="margin-top:10px;padding:10px;border-radius:8px;border:none;background:#3498db;color:#fff;cursor:pointer;font-weight:700;">Load selected files</button>
                    <button id="fallbackCloseBtn" style="margin-top:6px;padding:8px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#333;cursor:pointer;">Close</button>
                </div>
            `;
            document.body.appendChild(errorDiv);

            document.getElementById('fallbackCloseBtn').addEventListener('click', () => { errorDiv.remove(); displayBattle(); });
            document.getElementById('fallbackLoadBtn').addEventListener('click', () => {
                const fL = document.getElementById('fallbackLucaFile');
                const fW = document.getElementById('fallbackWouterFile');
                const fileL = fL && fL.files && fL.files[0] ? fL.files[0] : null;
                const fileW = fW && fW.files && fW.files[0] ? fW.files[0] : null;
                if (!fileL && !fileW) {
                    alert('Select at least one CSV file to load.');
                    return;
                }

                const readFile = (file) => new Promise((res, rej) => {
                    const fr = new FileReader();
                    fr.onload = () => res(fr.result);
                    fr.onerror = rej;
                    fr.readAsText(file);
                });

                Promise.all([
                    fileL ? readFile(fileL) : Promise.resolve(null),
                    fileW ? readFile(fileW) : Promise.resolve(null)
                ]).then(([lText, wText]) => {
                    try {
                        if (lText) coastersDataLuca = parseCSV(lText);
                        if (wText) coastersDataWouter = parseCSV(wText);
                        errorDiv.remove();
                        initializeApp();
                    } catch (e) {
                        alert('Error processing CSV: ' + (e && e.message ? e.message : String(e)));
                    }
                }).catch(e => {
                    alert('Error reading files: ' + (e && e.message ? e.message : String(e)));
                });
            });

            // Also ensure the battle UI updates (hide VS) when CSV loading fails
            try { displayBattle(); } catch (e) { /* ignore */ }
        }
    }

    // Initialize app after data is loaded (only called when user IS logged in)
    async function initializeApp() {
        // Get the saved user (we know it exists because loadCoasterData checked)
        const savedUser = localStorage.getItem('lastUser');
        
        // Set current user
        currentUser = savedUser;
        
        // Hide user selection screen, show profile content
        const selectionScreen = document.getElementById('userSelectionScreen');
        const profileContent = document.getElementById('profileContent');
        if (selectionScreen) selectionScreen.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
        
        // Enable tabs
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.style.opacity = '1';
            tab.style.pointerEvents = 'auto';
            tab.style.cursor = 'pointer';
        });
        
        // Load user-specific data - including all coasters (operational and defunct)
        if (savedUser === 'luca') {
            coasters = coastersDataLuca;
            console.log(`Selected user: Luca - Loading ${coasters.length} coasters`);
        } else {
            coasters = coastersDataWouter;
            console.log(`Selected user: Wouter - Loading ${coasters.length} coasters`);
        }
        
        // Load user data
        loadUserData();
        
        // Load level/XP data
        loadLevelData();
        
        // Update badge with level
        const badge = document.getElementById('currentUserBadge');
        const userName = savedUser === 'luca' ? 'Luca' : 'Wouter';
        if (badge) badge.textContent = `${userName} - Level ${userLevel}`;
        
        // Load achievements
        if (typeof achievementManager !== 'undefined') {
            achievementManager.load(savedUser);
            updatePinsDisplay();
        }
        
        // Populate credits grid with dynamic colors
        populateCreditsGrid();
        
        // Set header height for mobile sticky tabs
        setHeaderHeight();
        // Post-initialization UI adjustments
        postInitUISetup();
        
        // Update ranking immediately after phase setup to show seeding/waiting coasters
        updateRanking();
        
        // Load ALL images during loading screen before showing first battle
        await preloadAllCoasterImages();
        
        // Now display the first battle (all images loaded)
        displayBattle();
        updateRanking(); // Update again in case battle changed anything
        displayHome();
        
        // Restore the last active tab
        try {
            const savedTab = localStorage.getItem('lastActiveTab');
            const validTabs = ['profile', 'home', 'battle', 'ranking', 'history', 'achievements'];
            if (savedTab && validTabs.includes(savedTab)) {
                switchTab(savedTab);
            }
        } catch (e) { /* ignore */ }
        
        // Match tab heights after initialization
        setTimeout(() => matchTabHeights(), 100);
    }

    // Set header height CSS variable for sticky tabs positioning
    function setHeaderHeight() {
        if (window.innerWidth <= 600) {
            const header = document.querySelector('.header');
            if (header) {
                const headerHeight = header.offsetHeight;
                document.documentElement.style.setProperty('--header-height', headerHeight + 'px');
            }
        }
    }

    // Post-initialization UI setup: safe no-op if features missing
    function postInitUISetup() {
        try {
            // Apply pairing/dev settings to UI if functions exist
            try { applySettingsToUI(); } catch (e) {}
            try { loadDevSettings(); } catch (e) {}
            // Ensure correct battle visibility initially (hide until user selects).
            // If a user is already selected, keep the battle visible.
            try { if (!currentUser) setBattleVisibility(false); } catch (e) {}
            // Sync sim input width
            try { syncSimInputWidth(); } catch (e) {}
            // Hide any close battle overlay that might be showing from previous session
            try {
                const overlay = document.getElementById('closeBattleOverlay');
                if (overlay) {
                    overlay.classList.remove('show');
                    overlay.style.display = 'none';
                }
            } catch (e) {}
            // Cancel any pending close intro animations
            try { cancelCloseIntro(); } catch (e) {}
            
            // Safety mechanism: periodically check and hide overlay if it appears unexpectedly
            setInterval(() => {
                try {
                    const overlay = document.getElementById('closeBattleOverlay');
                    // Only hide if we're not currently in a battle resolution
                    if (overlay && !resolvingBattle && !isProcessingChoice) {
                        if (overlay.classList.contains('show') || overlay.style.display !== 'none') {
                            overlay.classList.remove('show');
                            overlay.style.display = 'none';
                        }
                    }
                } catch (e) { /* ignore */ }
            }, 500);
        } catch (e) {
            // swallow any unexpected errors to avoid breaking initialization
            console.warn('postInitUISetup error', e);
        }
    }

function debounce(fn, wait = 120) {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), wait);
    };
}

const $id = (id) => document.getElementById(id);

const CR_STORAGE_COUNTER = 'cr_rareBattleCounter';
const CR_STORAGE_THRESHOLD = 'cr_rareBattleThreshold';

function getCoasterId(c) { return (c && (c.naam || c.name || c.id)) || String(Math.random()); }
function getCoasterName(c) { return (c && (c.naam || c.name)) || 'Coaster'; }

// Global stats for image loading progress (visible in dev menu)
let imageLoadStats = {
    loaded: 0,
    total: 0,
    failed: 0,
    cached: 0
};

// In-memory cache for super-fast image retrieval during rapid battles
const imageMemoryCache = new Map();

// Preload queue for background loading of next battles
let preloadQueue = [];
let isPreloading = false;
let keyboardUsageDetected = false;
const PRELOAD_QUEUE_SIZE_NORMAL = 8;
const PRELOAD_QUEUE_SIZE_FAST = 15;
let nextBattlePreloaded = null; // Cache for next fully loaded battle

// Normalize coaster/park name for cache key matching
// Helper function to remove accents and diacritics
function removeAccents(str) {
    if (!str) return '';
    // Normalize to NFD (decomposed form) and remove combining diacritical marks
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCoasterName(name) {
    if (!name) return '';
    return removeAccents(name)  // Remove accents first
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
        .replace(/\s+/g, ' ');     // Normalize whitespace
}

// Calculate Levenshtein distance between two strings (fuzzy matching)
function levenshteinDistance(str1, str2) {
    if (!str1 || !str2) return Infinity;
    
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 0;
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    // Quick exit for very different lengths
    if (Math.abs(len1 - len2) > 5) return Infinity;
    
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    
    return matrix[len1][len2];
}

// Check if two strings are similar (fuzzy match with threshold)
function isFuzzyMatch(str1, str2, maxDistance = 3) {
    if (!str1 || !str2) return false;
    
    // Remove accents before comparing for more flexible matching
    const s1 = removeAccents(str1).toLowerCase();
    const s2 = removeAccents(str2).toLowerCase();
    
    // Exact match (after accent removal)
    if (s1 === s2) return true;
    
    // Substring match
    if (s1.includes(s2) || s2.includes(s1)) return true;
    
    // Levenshtein distance check
    const distance = levenshteinDistance(s1, s2);
    return distance <= maxDistance;
}

// Calculate similarity percentage between two strings
function getSimilarityScore(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Remove accents before comparing to be more flexible
    const s1 = removeAccents(str1).toLowerCase();
    const s2 = removeAccents(str2).toLowerCase();
    
    if (s1 === s2) return 100;
    
    // Substring bonus
    if (s1.includes(s2) || s2.includes(s1)) {
        const longerLen = Math.max(s1.length, s2.length);
        const shorterLen = Math.min(s1.length, s2.length);
        return Math.round((shorterLen / longerLen) * 100);
    }
    
    // Levenshtein-based similarity
    const distance = levenshteinDistance(str1, str2);
    const maxLen = Math.max(s1.length, s2.length);
    const similarity = (1 - (distance / maxLen)) * 100;
    
    return Math.max(0, Math.round(similarity));
}

function getPlaceholderImage() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#d1d5db;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="400" height="250" fill="url(#grad)"/>
        <circle cx="200" cy="125" r="40" fill="#9ca3af" opacity="0.3"/>
        <rect x="180" y="100" width="40" height="50" rx="5" fill="#9ca3af" opacity="0.5"/>
    </svg>`;
    // Use encodeURIComponent instead of btoa to handle all characters safely
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

async function queryWikidataImage(coasterName, parkName, manufacturer) {
    if (!coasterName) return null;
    
    const escapeSPARQL = (str) => str.replace(/["\\]/g, '\\$&');
    
    // Roller coaster and amusement ride type validation
    // Q204832 = roller coaster, Q186441 = amusement ride
    // Some coasters are only labeled as amusement rides in Wikidata
    const coasterTypeFilter = `{ ?item wdt:P31/wdt:P279* wd:Q204832 } UNION { ?item wdt:P31/wdt:P279* wd:Q186441 }`;
    
    // Generate name variants to try (most specific to least specific)
    const nameVariants = [];
    let cleanName = coasterName.trim().replace(/\s+/g, ' ');
    nameVariants.push(cleanName);
    
    if (/\([^)]+\)/.test(cleanName)) {
        const variant = cleanName.replace(/\s*\([^)]+\)\s*/g, ' ').trim();
        if (variant && !nameVariants.includes(variant)) nameVariants.push(variant);
    }
    
    if (/ - [A-Z][a-z]+$/.test(cleanName)) {
        const variant = cleanName.replace(/ - [A-Z][a-z]+$/, '').trim();
        if (!nameVariants.includes(variant)) nameVariants.push(variant);
    }
    
    // 4. Remove descriptive suffixes after dash (e.g., "Colossos - Kampf der Giganten" → "Colossos")
    if (/ - .+$/.test(cleanName) && cleanName.split(' - ').length === 2) {
        const variant = cleanName.split(' - ')[0].trim();
        if (!nameVariants.includes(variant)) nameVariants.push(variant);
    }
    
    // 5. Remove subtitle after colon (e.g., "Xpress: Platform 13" → "Xpress")
    if (/: .+$/.test(cleanName)) {
        const variant = cleanName.split(':')[0].trim();
        if (!nameVariants.includes(variant)) nameVariants.push(variant);
    }
    
    // 6. Remove "Junior" or "Mini" prefix (e.g., "Junior Red Force" → "Red Force")
    if (/^(Junior|Mini) /i.test(cleanName)) {
        const variant = cleanName.replace(/^(Junior|Mini) /i, '').trim();
        if (!nameVariants.includes(variant)) nameVariants.push(variant);
    }
    
    // 7. Remove Dutch/German articles (e.g., "Joris en de draak" → "Joris draak")
    if (/ en de /i.test(cleanName)) {
        const variant = cleanName.replace(/ en de /ig, ' ').trim();
        if (!nameVariants.includes(variant)) nameVariants.push(variant);
        // Also try just first word (e.g., "Joris")
        const firstWord = cleanName.split(' ')[0];
        if (firstWord.length > 3 && !nameVariants.includes(firstWord)) {
            nameVariants.push(firstWord);
        }
    }
    
    // 8. Remove possessive 's (e.g., "Winja's" → "Winja")
    if (/'s\b/i.test(cleanName)) {
        const variant = cleanName.replace(/'s\b/ig, '').trim();
        if (!nameVariants.includes(variant)) nameVariants.push(variant);
    }
    
    // NEW: 8b. Handle slash alternatives (e.g., "Superman / la Atracción" → "Superman")
    if (/\s*\/\s*/.test(cleanName)) {
        const parts = cleanName.split(/\s*\/\s*/);
        // Add first part
        if (parts[0] && !nameVariants.includes(parts[0].trim())) {
            nameVariants.push(parts[0].trim());
        }
        // Add without slashes
        const noSlash = cleanName.replace(/\s*\/\s*/g, ' ').trim();
        if (!nameVariants.includes(noSlash)) {
            nameVariants.push(noSlash);
        }
    }
    
    // NEW: 8c. Handle "&" and "and" variations
    if (/\s+&\s+/.test(cleanName)) {
        const withAnd = cleanName.replace(/\s+&\s+/g, ' and ');
        if (!nameVariants.includes(withAnd)) nameVariants.push(withAnd);
    }
    if (/\s+and\s+/i.test(cleanName)) {
        const withAmpersand = cleanName.replace(/\s+and\s+/gi, ' & ');
        if (!nameVariants.includes(withAmpersand)) nameVariants.push(withAmpersand);
    }
    
    // NEW: 8d. Handle umlauts and special characters
    const deaccented = cleanName
        .replace(/ä/g, 'a').replace(/Ä/g, 'A')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ß/g, 'ss');
    if (deaccented !== cleanName && !nameVariants.includes(deaccented)) {
        nameVariants.push(deaccented);
    }
    
    // 9. Remove generic "Roller Coaster" suffix in various languages
    const genericSuffixes = [
        / Roller Coaster$/i,
        / Rollercoaster$/i,
        / Achterbahn$/i,
        / Coaster$/i
    ];
    for (const suffix of genericSuffixes) {
        if (suffix.test(cleanName)) {
            const variant = cleanName.replace(suffix, '').trim();
            if (variant && !nameVariants.includes(variant)) nameVariants.push(variant);
        }
    }
    
    // 10. Remove "The" prefix (e.g., "The Ride" → "Ride")
    if (/^The /i.test(cleanName) && cleanName.split(' ').length > 2) {
        const variant = cleanName.replace(/^The /i, '').trim();
        if (!nameVariants.includes(variant)) nameVariants.push(variant);
    }
    
    // 11. Add space variations for compound names
    if (cleanName.includes(' ') && cleanName.split(' ').length === 2) {
        // Try without space (e.g., "Black Mamba" → "BlackMamba")
        const noSpace = cleanName.replace(/ /g, '');
        if (!nameVariants.includes(noSpace)) nameVariants.push(noSpace);
    } else if (!cleanName.includes(' ') && cleanName.length > 6) {
        // Try adding space for common patterns (e.g., "BlackMamba" → "Black Mamba")
        const withSpace = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2');
        if (withSpace !== cleanName && !nameVariants.includes(withSpace)) {
            nameVariants.push(withSpace);
        }
    }
    
    // Generate park name variants for better matching
    const parkVariants = [];
    if (parkName) {
        let cleanPark = parkName.trim().replace(/\s+/g, ' ');
        parkVariants.push(cleanPark);
        
        // Remove "Park" suffix variations
        const parkSuffixes = [/ Park$/i, / Parque$/i, /-Park$/i, /park$/i];
        for (const suffix of parkSuffixes) {
            if (suffix.test(cleanPark)) {
                const variant = cleanPark.replace(suffix, '').trim();
                if (variant && !parkVariants.includes(variant)) parkVariants.push(variant);
            }
        }
        
        // Handle special characters in park names
        const deaccentedPark = cleanPark
            .replace(/ä/g, 'a').replace(/Ä/g, 'A')
            .replace(/ö/g, 'o').replace(/Ö/g, 'O')
            .replace(/ü/g, 'u').replace(/Ü/g, 'U')
            .replace(/ß/g, 'ss');
        if (deaccentedPark !== cleanPark && !parkVariants.includes(deaccentedPark)) {
            parkVariants.push(deaccentedPark);
        }
    }
    
    // Helper function: Fuzzy name matching with scoring
    // Returns {bestMatch: imageUrl, bestScore: number} or null
    const fuzzyMatchCoasterName = (results, coasterName) => {
        if (!results || results.length === 0) return null;
        
        // Helper function to normalize strings for flexible matching
        const normalizeForMatching = (str) => {
            return str.toLowerCase()
                .replace(/['`´]/g, '')  // Remove apostrophes
                .replace(/[-–—]/g, ' ')  // Replace hyphens with spaces
                .replace(/\s+/g, ' ')    // Normalize spaces
                .trim();
        };
        
        // Get normalized version of search name
        const normalizedSearchName = normalizeForMatching(coasterName);
        // Also get base name (before dash/colon)
        const baseSearchName = normalizeForMatching(
            coasterName.split(/\s*[-:]\s*/)[0]
        );
        
        // Score each candidate by name similarity
        let bestMatch = null;
        let bestScore = 0;
        
        for (const candidate of results) {
            const candidateName = candidate.itemLabel?.value || '';
            const normalizedCandidate = normalizeForMatching(candidateName);
            
            let score = 0;
            
            // Strategy 1: Check if normalized names match exactly
            if (normalizedSearchName === normalizedCandidate) {
                score = 100;
            }
            // Strategy 2: Check if candidate contains the base name
            else if (baseSearchName && baseSearchName.length > 3 && normalizedCandidate.includes(baseSearchName)) {
                score = 90;
            }
            // Strategy 3: Check if base name contains the candidate
            else if (baseSearchName && baseSearchName.length > 3 && baseSearchName.includes(normalizedCandidate) && normalizedCandidate.length > 3) {
                score = 85;
            }
            // Strategy 4: Check if candidate contains the full search name
            else if (normalizedCandidate.includes(normalizedSearchName)) {
                score = 80;
            }
            // Strategy 5: Check if search name contains candidate
            else if (normalizedSearchName.includes(normalizedCandidate) && normalizedCandidate.length > 4) {
                score = 75;
            }
            // Strategy 6: Use similarity score for partial matches
            else {
                const similarity = getSimilarityScore(coasterName, candidateName);
                if (similarity >= 50) {
                    score = similarity;
                }
            }
            
            if (score > 0) {
                const locationLabel = candidate.locationLabel?.value || candidate.parkLabel?.value || '';
                console.log(`    Found potential match: "${candidateName}"${locationLabel ? ' at ' + locationLabel : ''} (score: ${score})`);
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = candidate.image?.value;
            }
        }
        
        return (bestMatch && bestScore >= 50) ? {bestMatch, bestScore} : null;
    };
    
    // Direct label/alias matching - much more reliable than EntitySearch
    console.log(`  📝 Generated ${nameVariants.length} name variants:`, nameVariants.slice(0, 5).join(', ') + (nameVariants.length > 5 ? '...' : ''));
    if (parkVariants.length > 1) {
        console.log(`  📝 Park variants:`, parkVariants.join(', '));
    }
    
    // Helper to add delay between requests to avoid rate limiting
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // FAST PATH: Try park-aware search first (most accurate), then fallback to name-only
    // This prevents wrong matches like "iSpeed" when searching for "Speed"
    const variant = nameVariants[0];
    const escapedName = escapeSPARQL(variant);
    const escapedPark = escapeSPARQL(parkVariants[0] || parkName);
    
    // Extract base name (before dash/colon) for fuzzy matching queries
    // E.g., "Joris en de draak - Water" → "Joris en de draak"
    // This casts a wider net in SPARQL to find variants like "Joris en de Draak"
    // The fuzzy matcher handles case differences, accents, and scoring
    const baseName = variant.split(/\s*[-:]\s*/)[0];
    const escapedBaseName = escapeSPARQL(baseName);
    
    if (variant.length < 3) {
        console.log(`✗ Name too short: "${variant}"`);
        return null;
    }
    
    // PARALLEL OPTIMIZATION: Run Level 1 (park-aware) and Level 5 (name-only) simultaneously
    // This eliminates 30-40s wait for coasters that eventually succeed at Level 5
    console.log(`  🚀 Parallel search: Park-aware + Name-only`);
    
    let parkAwareTimedOut = false; // Track timeout to skip redundant queries later
    let locationQueryReturnedEmpty = false; // Track empty results to skip Level 4
    const parkVariant = parkVariants[0];
    const escapedParkVar = escapeSPARQL(parkVariant);
    
    // Define Level 1: Park-aware query
    const parkAwareQuery = `
        SELECT ?item ?image ?parkLabel WHERE {
          ?item rdfs:label ?itemLabel .
          FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapedName}")))
          ${coasterTypeFilter}
          ?item wdt:P18 ?image .
          
          # Check both "owned by" (P127) and "part of" (P361) for park
          { ?item wdt:P127 ?park } UNION { ?item wdt:P361 ?park }
          ?park rdfs:label ?parkLabel .
          FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapedParkVar}")))
        }
        LIMIT 1
    `;
    
    // Define Level 5: Name-only query (with manufacturer if available)
    let nameOnlyQuery;
    if (manufacturer) {
        const escapedManufacturer = escapeSPARQL(manufacturer);
        nameOnlyQuery = `
            SELECT ?item ?image ?mfgLabel WHERE {
              ?item rdfs:label ?label .
              FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              # P176 = manufacturer
              ?item wdt:P176 ?mfg .
              ?mfg rdfs:label ?mfgLabel .
              FILTER(CONTAINS(LCASE(?mfgLabel), LCASE("${escapedManufacturer}")) || 
                     CONTAINS(LCASE("${escapedManufacturer}"), LCASE(?mfgLabel)))
            }
            LIMIT 1
        `;
    } else {
        nameOnlyQuery = `
            SELECT ?item ?image WHERE {
              ?item rdfs:label ?label .
              FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
            }
            LIMIT 1
        `;
    }
    
    // Execute both queries in parallel
    const parkAwarePromise = querySPARQL(parkAwareQuery).then(result => {
        if (result) {
            return {source: 'park-aware', result};
        }
        return null;
    }).catch(e => {
        console.warn(`    ⚠️ Park-aware search failed for "${parkVariant}": ${e.message}`);
        if (e.message && e.message.includes('timeout')) {
            parkAwareTimedOut = true;
        }
        return null;
    });
    
    const nameOnlyPromise = querySPARQL(nameOnlyQuery).then(result => {
        if (result) {
            return {source: 'name-only', result};
        }
        return null;
    }).catch(e => {
        console.warn(`    ⚠️ Name-only search failed: ${e.message}`);
        return null;
    });
    
    // Wait for first successful result
    const parallelResult = await Promise.race([
        parkAwarePromise,
        nameOnlyPromise,
        Promise.all([parkAwarePromise, nameOnlyPromise]).then(results => {
            // Both completed - return first non-null
            return results.find(r => r !== null) || null;
        })
    ]);
    
    if (parallelResult && parallelResult.result) {
        const sourceMsg = parallelResult.source === 'park-aware' 
            ? `with park verification (using "${parkVariant}")`
            : manufacturer ? 'with manufacturer verification' : '(park not verified - may need retry)';
        console.log(`✓ Found "${coasterName}" ${sourceMsg}`);
        return parallelResult.result;
    }
    
    // Both parallel queries failed - continue with Levels 2-4
    console.log(`  🔍 Trying park-aware search with location properties...`);
    const parkLocationQuery = `
        SELECT ?item ?image ?locationLabel WHERE {
          ?item rdfs:label ?itemLabel .
          FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapedName}")))
          ${coasterTypeFilter}
          ?item wdt:P18 ?image .
          
          # Check location properties P276 (location) and P131 (located in)
          { ?item wdt:P276 ?location } UNION { ?item wdt:P131 ?location }
          ?location rdfs:label ?locationLabel .
          FILTER(CONTAINS(LCASE(?locationLabel), LCASE("${escapedParkVar}")))
        }
        LIMIT 1
    `;
    
    try {
        const result = await querySPARQL(parkLocationQuery);
        if (result) {
            console.log(`✓ Found "${coasterName}" with location verification (using "${parkVariant}")`);
            return result;
        }
    } catch (e) {
        console.warn(`    ⚠️ Park location search failed for "${parkVariant}": ${e.message}`);
    }
    
    // LEVEL 3: Try fuzzy matching at park (using P127/P361) unless park-aware timed out
    // Level 2 (P276/P131) and Level 3 (P127/P361) are independent - park can exist in one but not the other
    if (!parkAwareTimedOut) {
        console.log(`  🔍 Trying looser name match at "${parkVariant}"...`);
        const looseNameQuery = `
            SELECT ?item ?image ?itemLabel ?parkLabel WHERE {
              ?item rdfs:label ?itemLabel .
              FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapedBaseName}")))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              # Check both "owned by" (P127) and "part of" (P361) for park
              { ?item wdt:P127 ?park } UNION { ?item wdt:P361 ?park }
              ?park rdfs:label ?parkLabel .
              FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapedParkVar}")))
            }
            LIMIT 15
        `;
        
        try {
            const results = await querySPARQLMultiple(looseNameQuery);
            const matchResult = fuzzyMatchCoasterName(results, coasterName);
            if (matchResult) {
                console.log(`✓ Found "${coasterName}" with loosened name matching (score: ${matchResult.bestScore})`);
                const {bestMatch} = matchResult;
                return bestMatch.startsWith('http://') ? bestMatch.replace('http://', 'https://') : bestMatch;
            }
        } catch (e) {
            console.warn(`    ⚠️ Loose name search failed: ${e.message}`);
        }
    } else {
        console.log(`  ⏭️  Skipping Level 3 (park query timed out - park not in Wikidata)`);
    }
    
    // LEVEL 4: Try fuzzy matching with location properties
    console.log(`  🔍 Trying looser name match with location properties...`);
    const looseLocationQuery = `
        SELECT ?item ?image ?itemLabel ?locationLabel WHERE {
          ?item rdfs:label ?itemLabel .
          FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapedBaseName}")))
          ${coasterTypeFilter}
          ?item wdt:P18 ?image .
          
          # Check location properties P276 (location) and P131 (located in)
          { ?item wdt:P276 ?location } UNION { ?item wdt:P131 ?location }
          ?location rdfs:label ?locationLabel .
          FILTER(CONTAINS(LCASE(?locationLabel), LCASE("${escapedParkVar}")))
        }
        LIMIT 15
    `;
    
    try {
        const results = await querySPARQLMultiple(looseLocationQuery);
        const matchResult = fuzzyMatchCoasterName(results, coasterName);
        if (matchResult) {
            console.log(`✓ Found "${coasterName}" with location-based loosened matching (score: ${matchResult.bestScore})`);
            const {bestMatch} = matchResult;
            return bestMatch.startsWith('http://') ? bestMatch.replace('http://', 'https://') : bestMatch;
        }
    } catch (e) {
        console.warn(`    ⚠️ Loose location search failed: ${e.message}`);
    }
    
    // FINAL FALLBACK: Try pure name-only search without manufacturer filter
    // This catches coasters where:
    // - Parallel search's manufacturer check was too strict
    // - Park data is completely absent from Wikidata
    // - Early queries timed out
    console.log(`  🔍 Final fallback (Name-only without constraints): "${variant}"`);
    const finalNameOnlyQuery = `
        SELECT ?item ?image WHERE {
          ?item rdfs:label ?label .
          FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
          ${coasterTypeFilter}
          ?item wdt:P18 ?image .
        }
        LIMIT 1
    `;
    
    try {
        const result = await querySPARQL(finalNameOnlyQuery);
        if (result) {
            console.log(`✓ Found "${coasterName}" with final name-only search (no park/manufacturer verification)`);
            return result;
        }
    } catch (e) {
        console.warn(`    ⚠️ Final fallback failed: ${e.message}`);
    }
    
    // All search strategies exhausted
    console.log(`✗ No image found for "${coasterName}" (use retry button for intensive search)`);
    return null;
}

// Wikidata EntitySearch API - finds entities by name (more forgiving than SPARQL)
async function searchWikidataEntity(coasterName, validateType = true) {
    if (!coasterName || coasterName.length < 3) return null;
    
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(coasterName)}&language=en&limit=5&format=json&origin=*`;
    
    // Roller coaster parent class for validation
    const rollerCoasterClassId = 'Q204832';
    
    try {
        const response = await fetchWithTimeout(searchUrl, {}, 10000);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data.search || data.search.length === 0) return null;
        
        // Check each result for an image
        for (const entity of data.search) {
            const entityId = entity.id;
            
            // Fetch entity data to check for image and type
            const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json&origin=*`;
            const entityResponse = await fetchWithTimeout(entityUrl, {}, 10000);
            if (!entityResponse.ok) continue;
            
            const entityData = await entityResponse.json();
            const claims = entityData?.entities?.[entityId]?.claims;
            
            if (!claims) continue;
            
            // If validation required, check if it's a roller coaster
            if (validateType && claims.P31) {
                const instanceOfClaims = claims.P31;
                // Check if entity is directly a roller coaster or any of its subclasses
                const hasCoasterType = instanceOfClaims.some(claim => {
                    const typeId = claim.mainsnak?.datavalue?.value?.id;
                    return typeId === rollerCoasterClassId;
                });
                
                // If not directly a roller coaster, check P279 (subclass of) chain
                if (!hasCoasterType && claims.P279) {
                    const subclassOfClaims = claims.P279;
                    const isCoasterSubclass = subclassOfClaims.some(claim => {
                        const parentId = claim.mainsnak?.datavalue?.value?.id;
                        return parentId === rollerCoasterClassId;
                    });
                    
                    if (!isCoasterSubclass) {
                        console.log(`    ⚠️ EntitySearch: ${entity.label} is not a roller coaster, skipping`);
                        continue;
                    }
                } else if (!hasCoasterType) {
                    console.log(`    ⚠️ EntitySearch: ${entity.label} is not a roller coaster, skipping`);
                    continue;
                }
            }
            
            // Check for image (P18 property)
            if (claims.P18 && claims.P18.length > 0) {
                const imageFile = claims.P18[0].mainsnak?.datavalue?.value;
                if (imageFile) {
                    // Convert Commons filename to URL
                    const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
                    return imageUrl;
                }
            }
        }
        
        return null;
    } catch (error) {
        console.warn('EntitySearch error:', error.message);
        return null;
    }
}

// Intensive image search with park/manufacturer verification (triggered by retry button)
async function intensiveImageSearch(coasterName, parkName, manufacturer) {
    console.log(`\n🔬 INTENSIVE SEARCH for "${coasterName}" at ${parkName}...`);
    
    const escapeSPARQL = (str) => str.replace(/["\\]/g, '\\$&');
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Roller coaster and amusement ride type validation
    const coasterTypeFilter = `{ ?item wdt:P31/wdt:P279* wd:Q204832 } UNION { ?item wdt:P31/wdt:P279* wd:Q186441 }`;
    
    // Generate all name variants (not just first 3)
    const nameVariants = [];
    let cleanName = coasterName.trim().replace(/\s+/g, ' ');
    
    nameVariants.push(cleanName);
    
    if (cleanName.includes('(')) {
        nameVariants.push(cleanName.replace(/\s*\([^)]*\)/g, ''));
    }
    if (cleanName.includes(' - ')) {
        nameVariants.push(cleanName.split(' - ')[0].trim());
    }
    if (cleanName.includes(':')) {
        nameVariants.push(cleanName.split(':')[0].trim());
    }
    
    // Generate park variants
    const parkVariants = [];
    if (parkName) {
        let cleanPark = parkName.trim().replace(/\s+/g, ' ');
        parkVariants.push(cleanPark);
        
        const parkSuffixes = [/ Park$/i, / Parque$/i, /-Park$/i, /park$/i];
        for (const suffix of parkSuffixes) {
            if (suffix.test(cleanPark)) {
                const variant = cleanPark.replace(suffix, '').trim();
                if (variant && !parkVariants.includes(variant)) parkVariants.push(variant);
            }
        }
    }
    
    console.log(`  📝 Trying ${nameVariants.length} name variants with park filtering...`);
    
    const allCandidates = [];
    
    // Strategy: CONTAINS with park verification (check both P361 and P127)
    for (const variant of nameVariants) {
        const escapedName = escapeSPARQL(variant);
        
        if (variant.length < 3) continue;
        
        console.log(`  🔍 Searching "${variant}" with park context...`);
        
        // Query with park and manufacturer metadata - check both P127 and P361
        const query = `
            SELECT ?item ?image ?itemLabel ?parkLabel ?mfgLabel WHERE {
              ?item rdfs:label ?label .
              FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              OPTIONAL { 
                { ?item wdt:P127 ?park } UNION { ?item wdt:P361 ?park }
                ?park rdfs:label ?parkLabel . 
                FILTER(lang(?parkLabel) = "en" || lang(?parkLabel) = "de" || lang(?parkLabel) = "nl")
              }
              OPTIONAL { 
                ?item wdt:P176 ?mfg . 
                ?mfg rdfs:label ?mfgLabel . 
                FILTER(lang(?mfgLabel) = "en")
              }
              ?item rdfs:label ?itemLabel . 
              FILTER(lang(?itemLabel) = "en" || lang(?itemLabel) = "de" || lang(?itemLabel) = "nl")
            }
            LIMIT 5
        `;
        
        try {
            const results = await querySPARQLMultiple(query);
            
            if (results && results.length > 0) {
                console.log(`  ✓ Found ${results.length} candidates for "${variant}"`);
                
                // Score and collect all candidates
                for (const result of results) {
                    const itemLabel = result.itemLabel?.value || '';
                    const parkLabel = result.parkLabel?.value || '';
                    const mfgLabel = result.mfgLabel?.value || '';
                    const imageUrl = result.image?.value;
                    
                    if (!imageUrl) continue;
                    
                    // Calculate matching scores
                    let score = 0;
                    let matchDetails = [];
                    
                    // Name similarity (0-70 points)
                    const nameSimilarity = getSimilarityScore(coasterName, itemLabel);
                    score += Math.round(nameSimilarity * 0.7);
                    matchDetails.push(`name:${nameSimilarity}%`);
                    
                    // Park matching with fuzzy logic (0-80 points)
                    if (parkLabel && parkName) {
                        let parkScore = 0;
                        const parkSimilarity = getSimilarityScore(parkName, parkLabel);
                        
                        // Try fuzzy matching against park variants
                        let bestParkMatch = parkSimilarity;
                        for (const parkVar of parkVariants) {
                            const varSim = getSimilarityScore(parkVar, parkLabel);
                            if (varSim > bestParkMatch) bestParkMatch = varSim;
                        }
                        
                        if (bestParkMatch === 100) {
                            parkScore = 80; // Exact match
                            matchDetails.push('park:exact');
                        } else if (bestParkMatch >= 70) {
                            parkScore = 60; // Fuzzy match
                            matchDetails.push(`park:fuzzy(${bestParkMatch}%)`);
                        } else if (parkLabel.toLowerCase().includes(parkName.toLowerCase()) || 
                                   parkName.toLowerCase().includes(parkLabel.toLowerCase())) {
                            parkScore = 40; // Substring match
                            matchDetails.push('park:substring');
                        }
                        
                        score += parkScore;
                    }
                    
                    // Manufacturer matching (0-10 points)
                    if (mfgLabel && manufacturer) {
                        const mfgSimilarity = getSimilarityScore(manufacturer, mfgLabel);
                        if (mfgSimilarity >= 70) {
                            score += 10;
                            matchDetails.push('mfg:match');
                        }
                    }
                    
                    console.log(`    Candidate: ${itemLabel} at ${parkLabel || '(unknown)'} - Score: ${score} (${matchDetails.join(', ')})`);
                    
                    allCandidates.push({
                        url: imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl,
                        metadata: {
                            name: itemLabel,
                            park: parkLabel,
                            manufacturer: mfgLabel,
                            verified: score >= 80, // High confidence if score >= 80
                            score: score,
                            matchDetails: matchDetails.join(', ')
                        }
                    });
                }
            }
            
            await delay(200);
        } catch (e) {
            console.warn(`    ⚠️ Query failed: ${e.message}`);
            await delay(200);
        }
    }
    
    // Sort candidates by score (highest first)
    allCandidates.sort((a, b) => b.metadata.score - a.metadata.score);
    
    if (allCandidates.length > 0) {
        console.log(`\n  📊 Top candidate: ${allCandidates[0].metadata.name} (score: ${allCandidates[0].metadata.score})`);
        return allCandidates; // Return all candidates for cycling
    }
    
    // FALLBACK: If no results found, try with location properties (P276, P131) instead
    console.log(`  🔍 Trying fallback with location properties (P276, P131)...`);
    
    for (const variant of nameVariants.slice(0, 3)) {
        const escapedName = escapeSPARQL(variant);
        
        if (variant.length < 3) continue;
        
        // Try with location properties as fallback
        const locationQuery = `
            SELECT ?item ?image ?itemLabel ?locationLabel ?mfgLabel WHERE {
              ?item rdfs:label ?label .
              FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              OPTIONAL { 
                { ?item wdt:P276 ?location } UNION { ?item wdt:P131 ?location }
                ?location rdfs:label ?locationLabel . 
                FILTER(lang(?locationLabel) = "en" || lang(?locationLabel) = "de" || lang(?locationLabel) = "nl")
              }
              OPTIONAL { 
                ?item wdt:P176 ?mfg . 
                ?mfg rdfs:label ?mfgLabel . 
                FILTER(lang(?mfgLabel) = "en")
              }
              ?item rdfs:label ?itemLabel . 
              FILTER(lang(?itemLabel) = "en" || lang(?itemLabel) = "de" || lang(?itemLabel) = "nl")
            }
            LIMIT 3
        `;
        
        try {
            const results = await querySPARQLMultiple(locationQuery);
            
            if (results && results.length > 0) {
                for (const result of results) {
                    const itemLabel = result.itemLabel?.value || '';
                    const locationLabel = result.locationLabel?.value || '';
                    const mfgLabel = result.mfgLabel?.value || '';
                    const imageUrl = result.image?.value;
                    
                    if (!imageUrl) continue;
                    
                    let score = 0;
                    let matchDetails = [];
                    
                    const nameSimilarity = getSimilarityScore(coasterName, itemLabel);
                    score += Math.round(nameSimilarity * 0.7);
                    matchDetails.push(`name:${nameSimilarity}%`);
                    
                    // Check if location contains park name
                    if (locationLabel && parkName) {
                        for (const parkVar of parkVariants) {
                            if (isFuzzyMatch(locationLabel, parkVar, 3)) {
                                score += 40;
                                matchDetails.push(`location:fuzzy`);
                                break;
                            }
                        }
                    }
                    
                    console.log(`    Fallback candidate: ${itemLabel} at ${locationLabel || '(unknown)'} - Score: ${score}`);
                    
                    if (score >= 50) { // Only accept if reasonable match
                        allCandidates.push({
                            url: imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl,
                            metadata: {
                                name: itemLabel,
                                park: locationLabel || '(location-based)',
                                manufacturer: mfgLabel,
                                verified: false,
                                score: score,
                                matchDetails: matchDetails.join(', ') + ' (fallback)'
                            }
                        });
                    }
                }
            }
            
            await delay(200);
        } catch (e) {
            console.warn(`    ⚠️ Fallback query failed: ${e.message}`);
        }
    }
    
    // Sort all candidates including fallback
    allCandidates.sort((a, b) => b.metadata.score - a.metadata.score);
    
    if (allCandidates.length > 0) {
        console.log(`\n  📊 Found ${allCandidates.length} candidate(s) with fallback`);
        return allCandidates;
    }
    
    console.log(`  ✗ No image found after intensive search with fallback`);
    return null;
}

// Query SPARQL endpoint and return multiple results
async function querySPARQLMultiple(query, timeoutMs = 10000) {
    const url = 'https://query.wikidata.org/sparql';
    const fullUrl = `${url}?query=${encodeURIComponent(query)}&format=json`;
    
    try {
        const response = await fetchWithTimeout(fullUrl, {
            headers: {
                'Accept': 'application/sparql-results+json',
                'User-Agent': 'CoasterRanker/1.0 (Educational Project)'
            }
        }, timeoutMs); // Reduced to 10s for standard queries, 20s for intensive
        
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('429 Rate limit');
            }
            return null;
        }
        
        const data = await response.json();
        return data?.results?.bindings || null;
    } catch (error) {
        console.error('SPARQL query error:', error);
        return null;
    }
}

// Track retry attempts per coaster
const retryAttempts = new Map();

// Retry button handler (called from dev-data overlay)
window.retryCoasterImage = async function(coasterName, parkName, manufacturer, elementId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const button = event ? event.target : null;
    const infoDiv = document.getElementById(`imageInfo_${elementId}`);
    
    const attemptKey = normalizeCoasterName(coasterName);
    const currentAttempt = retryAttempts.get(attemptKey) || 0;
    retryAttempts.set(attemptKey, currentAttempt + 1);
    
    if (button) {
        button.disabled = true;
        button.textContent = '⏳ Searching...';
    }
    
    if (infoDiv) {
        infoDiv.textContent = 'Searching...';
        infoDiv.style.color = '#ffffff';
    }
    
    try {
        const allResults = await intensiveImageSearch(coasterName, parkName, manufacturer, true);
        
        let result = null;
        if (allResults && allResults.length > 0) {
            if (currentAttempt < allResults.length) {
                result = allResults[currentAttempt];
            } else {
                retryAttempts.set(attemptKey, 0);
                result = null;
            }
        }
        
        if (result && result.url) {
            const normalizedName = normalizeCoasterName(coasterName);
            const normalizedPark = normalizeCoasterName(parkName);
            const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
            localStorage.setItem(cacheKey, result.url);
            
            // Update in-memory cache
            imageMemoryCache.set(cacheKey, result.url);
            
            // Update all visible cards (both .coaster-card and .battle-card)
            const cards = document.querySelectorAll('.coaster-card, .battle-card');
            cards.forEach(card => {
                // Check both .coaster-name (old style) and .credit-card-name (new battle cards)
                const nameEl = card.querySelector('.coaster-name') || card.querySelector('.credit-card-name');
                if (nameEl && nameEl.textContent.trim() === coasterName) {
                    // Update both .coaster-img (old style) and .credit-card-img (new battle cards)
                    const img = card.querySelector('.coaster-img') || card.querySelector('.credit-card-img');
                    if (img) {
                        img.src = result.url;
                        // Force image reload in case it's cached
                        img.onload = () => {
                            console.log(`✓ Image updated for ${coasterName}`);
                        };
                    }
                }
            });
            
            // Display verification result with enhanced details
            if (infoDiv) {
                const score = result.metadata.score || 0;
                let icon = '✓✓';
                let color = '#10b981'; // green
                let statusText = 'High confidence match';
                
                if (score >= 120) {
                    icon = '✓✓✓';
                    statusText = 'Perfect match';
                } else if (score >= 80) {
                    icon = '✓✓';
                    statusText = 'High confidence';
                } else if (score >= 50) {
                    icon = '✓';
                    color = '#f59e0b'; // amber
                    statusText = 'Fuzzy match';
                } else {
                    icon = '⚠️';
                    color = '#ef4444'; // red
                    statusText = 'Low confidence';
                }
                
                const parkInfo = result.metadata.park ? `at ${result.metadata.park}` : '';
                const imageNum = allResults?.length > 1 ? ` [${currentAttempt + 1}/${allResults.length}]` : '';
                const scoreDisplay = ` (${score} pts)`;
                
                infoDiv.innerHTML = `${icon} ${result.metadata.name} ${parkInfo}${imageNum}${scoreDisplay}`;
                infoDiv.style.color = color;
                
                // Show match details
                if (result.metadata.matchDetails) {
                    infoDiv.innerHTML += `<br><span style="font-size:0.75em;color:#9ca3af;">${statusText}: ${result.metadata.matchDetails}</span>`;
                }
                
                // Add warning for mismatched park
                if (result.metadata.park && parkName && 
                    !result.metadata.park.toLowerCase().includes(parkName.toLowerCase()) &&
                    !parkName.toLowerCase().includes(result.metadata.park.toLowerCase())) {
                    infoDiv.innerHTML += `<br><span style="font-size:0.8em;color:#ef4444;">⚠️ Expected: ${parkName}</span>`;
                }
                
                // Show that image is saved
                infoDiv.innerHTML += `<br><span style="font-size:0.75em;color:#6b7280;">💾 Cached for future use</span>`;
            }
            
            if (button) {
                button.textContent = '✓ Updated';
                setTimeout(() => {
                    button.textContent = '🔄 Retry Image';
                    button.disabled = false;
                }, 2000);
            }
            
            console.log('  ✓ Retry complete!');
        } else {
            const placeholderUrl = getPlaceholderImage();
            
            const normalizedName = normalizeCoasterName(coasterName);
            const normalizedPark = normalizeCoasterName(parkName);
            const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
            localStorage.setItem(cacheKey, placeholderUrl);
            
            // Update in-memory cache
            imageMemoryCache.set(cacheKey, placeholderUrl);
            
            // Update all visible cards (both .coaster-card and .battle-card)
            const cards = document.querySelectorAll('.coaster-card, .battle-card');
            cards.forEach(card => {
                // Check both .coaster-name (old style) and .credit-card-name (new battle cards)
                const nameEl = card.querySelector('.coaster-name') || card.querySelector('.credit-card-name');
                if (nameEl && nameEl.textContent.trim() === coasterName) {
                    // Update both .coaster-img (old style) and .credit-card-img (new battle cards)
                    const img = card.querySelector('.coaster-img') || card.querySelector('.credit-card-img');
                    if (img) {
                        img.src = placeholderUrl;
                    }
                }
            });
            
            if (infoDiv) {
                const message = allResults?.length > 0 ? `All ${allResults.length} images tried` : 'No image found';
                infoDiv.textContent = `🔄 ${message} - Using placeholder`;
                infoDiv.style.color = '#ffffff';
            }
            if (button) {
                button.textContent = '🔄 Try Again';
                button.disabled = false;
            }
        }
    } catch (error) {
        console.error('Retry image error:', error);
        if (infoDiv) {
            infoDiv.textContent = '✗ Search failed';
            infoDiv.style.color = '#ef4444';
        }
        if (button) {
            button.textContent = '✗ Error';
            setTimeout(() => {
                button.textContent = '🔄 Retry Image';
                button.disabled = false;
            }, 2000);
        }
    }
};

// Intensive image search with park/manufacturer verification (triggered by retry button)
// Verify if park exists in Wikidata (cache results to avoid redundant queries)
const parkVerificationCache = new Map();

async function verifyParkInWikidata(parkName) {
    if (!parkName || parkName.trim() === '') return false;
    
    // Check cache first
    const cacheKey = parkName.toLowerCase().trim();
    if (parkVerificationCache.has(cacheKey)) {
        return parkVerificationCache.get(cacheKey);
    }
    
    const escapeSPARQL = (str) => str.replace(/["\\]/g, '\\$&');
    const escapedPark = escapeSPARQL(parkName);
    
    const query = `
        SELECT DISTINCT ?park WHERE {
            {
                ?park wdt:P31/wdt:P279* wd:Q194195 .
                ?park rdfs:label ?parkLabel .
                FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapedPark}")))
            } UNION {
                ?park wdt:P31/wdt:P279* wd:Q194195 .
                ?park skos:altLabel ?parkAlt .
                FILTER(CONTAINS(LCASE(?parkAlt), LCASE("${escapedPark}")))
            }
        } LIMIT 1
    `;
    
    try {
        const response = await fetch('https://query.wikidata.org/sparql?query=' + encodeURIComponent(query), {
            headers: { 'Accept': 'application/sparql-results+json' },
            signal: AbortSignal.timeout(8000)
        });
        const data = await response.json();
        const verified = data.results.bindings.length > 0;
        parkVerificationCache.set(cacheKey, verified);
        return verified;
    } catch (error) {
        console.warn(`    ⚠️ Park verification failed: ${error.message}`);
        parkVerificationCache.set(cacheKey, false);
        return false;
    }
}

async function intensiveImageSearch(coasterName, parkName, manufacturer, returnAll = false) {
    
    const escapeSPARQL = (str) => str.replace(/["\\]/g, '\\$&');
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Verify park in Wikidata first (affects search strategy)
    const parkVerified = await verifyParkInWikidata(parkName);
    console.log(`  🏢 Park "${parkName}" verification: ${parkVerified ? '✅ FOUND in Wikidata' : '❌ NOT FOUND'}`);
    console.log(`  📋 Search strategy: ${parkVerified ? 'LOOSE name matching (park verified)' : 'STRICT name matching (park unverified)'}`);
    
    // Roller coaster type validation
    const coasterTypeFilter = `?item wdt:P31/wdt:P279* wd:Q204832 .`;
    
    // Collection for all found results when returnAll=true
    const allFoundMatches = [];
    
    // Helper function to process results with scoring (defined early for use in all strategies)
    const processResults = (results, strategy) => {
        if (!results || results.length === 0) return returnAll ? [] : null;
        
        console.log(`  ✓ ${strategy}: Found ${results.length} candidates`);
        
        // If returnAll is true, collect all valid results
        if (returnAll) {
            const allMatches = [];
            const seenUrls = new Set(); // Track URLs to avoid duplicates
            
            for (const result of results) {
                const itemLabel = result.itemLabel?.value || '';
                const parkLabel = result.parkLabel?.value || '';
                const mfgLabel = result.mfgLabel?.value || '';
                const imageUrl = result.image?.value;
                
                if (!imageUrl) continue; // Skip results without images
                
                // Normalize URL and check for duplicates
                const normalizedUrl = imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl;
                if (seenUrls.has(normalizedUrl)) {
                    console.log(`    ⏭️ Skipping duplicate image`);
                    continue;
                }
                seenUrls.add(normalizedUrl);
                
                console.log(`    Candidate: ${itemLabel} at ${parkLabel || '(unknown)'} by ${mfgLabel || '(unknown)'}`);
                
                const parkMatches = parkLabel && (
                    parkLabel.toLowerCase().includes(parkName.toLowerCase()) ||
                    parkName.toLowerCase().includes(parkLabel.toLowerCase())
                );
                
                const mfgMatches = mfgLabel && manufacturer && (
                    mfgLabel.toLowerCase().includes(manufacturer.toLowerCase()) ||
                    manufacturer.toLowerCase().includes(mfgLabel.toLowerCase())
                );
                
                // Check name similarity - be LOOSE if park matches
                const normalizedInputName = coasterName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedItemName = itemLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                // Name matching: either direction contains the other (e.g., "Flucht" in "Flucht von Novgorod")
                const namePartialMatch = parkMatches && (
                    normalizedItemName.includes(normalizedInputName) ||
                    normalizedInputName.includes(normalizedItemName) ||
                    normalizedItemName.length >= 4 && normalizedInputName.includes(normalizedItemName)
                );
                
                // Calculate match score - PRIORITIZE PARK + NAME MATCHES
                let score = 0;
                let qualityLabel = '';
                if (parkMatches && mfgMatches) {
                    score = 100;
                    qualityLabel = 'PERFECT MATCH';
                    console.log(`    ✅✅ PERFECT MATCH!`);
                } else if (parkMatches && namePartialMatch) {
                    score = 80;
                    qualityLabel = 'PARK+NAME';
                    console.log(`    ✅✅ Park verified + name match!`);
                } else if (parkMatches) {
                    score = 50;
                    qualityLabel = 'PARK VERIFIED';
                    console.log(`    ✅ Park verified`);
                } else if (mfgMatches) {
                    score = 1;
                    qualityLabel = 'MFG ONLY';
                    console.log(`    ⚠️ Manufacturer only`);
                } else {
                    score = 0;
                    qualityLabel = 'UNVERIFIED';
                }
                
                allMatches.push({
                    url: normalizedUrl,
                    metadata: {
                        name: itemLabel,
                        park: parkLabel,
                        manufacturer: mfgLabel,
                        verified: score >= 80,
                        parkMatch: parkMatches,
                        mfgMatch: mfgMatches,
                        qualityLabel: qualityLabel,
                        score: score
                    },
                    score: score
                });
            }
            
            // Sort by score (best first)
            allMatches.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const aParkLen = a.metadata.park?.length || 999;
                const bParkLen = b.metadata.park?.length || 999;
                return aParkLen - bParkLen;
            });
            
            console.log(`  📊 Sorted results: ${allMatches.map(m => `${m.metadata.qualityLabel} (${m.score})`).join(', ')}`);
            return allMatches;
        }
        
        // Original logic for returning single best match (when returnAll=false)
        let bestMatch = null;
        let bestScore = 0;
        
        for (const result of results) {
            const itemLabel = result.itemLabel?.value || '';
            const parkLabel = result.parkLabel?.value || '';
            const mfgLabel = result.mfgLabel?.value || '';
            const imageUrl = result.image?.value;
            
            console.log(`    Candidate: ${itemLabel} at ${parkLabel || '(unknown)'} by ${mfgLabel || '(unknown)'}`);
            
            const parkMatches = parkLabel && (
                parkLabel.toLowerCase().includes(parkName.toLowerCase()) ||
                parkName.toLowerCase().includes(parkLabel.toLowerCase())
            );
            
            const mfgMatches = mfgLabel && manufacturer && (
                mfgLabel.toLowerCase().includes(manufacturer.toLowerCase()) ||
                manufacturer.toLowerCase().includes(mfgLabel.toLowerCase())
            );
            
            // Check name similarity - be LOOSE if park matches
            const normalizedInputName = coasterName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedItemName = itemLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Name matching: either direction contains the other (e.g., "Flucht" in "Flucht von Novgorod")
            const namePartialMatch = parkMatches && (
                normalizedItemName.includes(normalizedInputName) ||
                normalizedInputName.includes(normalizedItemName) ||
                normalizedItemName.length >= 4 && normalizedInputName.includes(normalizedItemName)
            );
            
            // Calculate match score
            let score = 0;
            if (parkMatches && mfgMatches) {
                score = 100;
                console.log(`    ✅✅ PERFECT MATCH!`);
            } else if (parkMatches && namePartialMatch) {
                score = 80;
                console.log(`    ✅✅ Park verified + name match!`);
            } else if (parkMatches) {
                score = 50;
                console.log(`    ✅ Park verified`);
            } else if (mfgMatches) {
                score = 1;
                console.log(`    ⚠️ Manufacturer only`);
            }
            
            if (score > bestScore && imageUrl) {
                bestScore = score;
                bestMatch = {
                    url: imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl,
                    metadata: {
                        name: itemLabel,
                        park: parkLabel,
                        manufacturer: mfgLabel,
                        verified: score >= 80,
                        parkMatch: parkMatches,
                        mfgMatch: mfgMatches,
                        score: score
                    }
                };
                
                // Return immediately on perfect match (including park+name matches)
                if (score >= 80) {
                    console.log(`    🎯 Using high-quality match (score: ${score})!`);
                    return bestMatch;
                }
            }
        }
        
        // Use first result if no matches
        if (!bestMatch && results[0]?.image?.value) {
            const firstResult = results[0];
            const imageUrl = firstResult.image.value;
            bestMatch = {
                url: imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl,
                metadata: {
                    name: firstResult.itemLabel?.value || '',
                    park: firstResult.parkLabel?.value || '',
                    manufacturer: firstResult.mfgLabel?.value || '',
                    verified: false,
                    parkMatch: false,
                    mfgMatch: false
                }
            };
            console.log(`    ⚠️ Using first result (unverified)`);
        }
        
        return bestMatch;
    };
    
    // STRATEGY 0: Combined Park+Name query (HIGHEST PRIORITY - most accurate)
    console.log(`  🎯 STRATEGY 0: Combined Park+Name filter (${parkVerified ? 'LOOSE' : 'STRICT'} name matching)`);
    
    // Generate SMART basic name variants for Strategy 0 (avoid over-generation)
    const basicVariants = new Set();
    let cleanName = coasterName.trim().replace(/\s+/g, ' ');
    basicVariants.add(cleanName);
    
    // If park is verified, also add first word only for very loose matching
    if (parkVerified && cleanName.includes(' ')) {
        const firstWord = cleanName.split(' ')[0];
        if (firstWord.length >= 4) {
            basicVariants.add(firstWord);
        }
    }
    
    // First try with just the basic name and variants
    let foundBasicResults = false;
    
    // Try more variants when park is verified (5 vs 3)
    const variantLimit = parkVerified ? 5 : 3;
    for (const nameVariant of Array.from(basicVariants).slice(0, variantLimit)) {
        console.log(`  🔍 COMBINED: "${nameVariant}" + "${parkName}"`);
        
        // Use bidirectional CONTAINS when park is verified (e.g., "Flucht" matches "Flucht von Novgorod")
        const nameFilter = parkVerified 
            ? `FILTER(
                CONTAINS(LCASE(?itemLabel), LCASE("${escapeSPARQL(nameVariant)}")) ||
                CONTAINS(LCASE("${escapeSPARQL(nameVariant)}"), LCASE(?itemLabel))
              )`
            : `FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapeSPARQL(nameVariant)}")))`;
        
        const combinedQuery = `
            SELECT ?item ?image ?itemLabel ?parkLabel ?mfgLabel WHERE {
              ?item rdfs:label ?itemLabel .
              ${nameFilter}
              
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              ?item wdt:P127 ?park .
              ?park rdfs:label ?parkLabel .
              FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapeSPARQL(parkName)}")))
              
              OPTIONAL { 
                ?item wdt:P176 ?mfg . 
                ?mfg rdfs:label ?mfgLabel . 
                FILTER(lang(?mfgLabel) = "en")
              }
            }
            LIMIT ${parkVerified ? 15 : 10}
        `;
        
        try {
            const results = await querySPARQLMultiple(combinedQuery, 15000);
            console.log(`    📊 Combined query results: ${results?.length || 0}`);
            
            if (results && results.length > 0) {
                const match = processResults(results, 'COMBINED');
                if (returnAll && Array.isArray(match) && match.length > 0) {
                    allFoundMatches.push(...match);
                    foundBasicResults = true;
                    console.log(`    ✓ COMBINED found ${match.length} results`);
                } else if (!returnAll && match) {
                    console.log(`    🎯 COMBINED found best match!`);
                    return match;
                }
            }
            await delay(200);
        } catch (e) {
            console.warn(`    ⚠️ COMBINED failed: ${e.message}`);
            await delay(200);
        }
    }
    
    // Always try accent variants early (not just when basic search fails)
    console.log(`  🔤 Adding accent-free and simplified variants...`);
    
    // Add accent-free version (tarántula -> tarantula, Fénix -> fenix)
    const accentFree = removeAccents(cleanName);
    if (accentFree !== cleanName && accentFree.length >= 3) {
        basicVariants.add(accentFree);
        console.log(`    Added accent-free: "${accentFree}"`);
    }
    
    // Simplify (remove punctuation) - often helps
    const simplified = cleanName.replace(/[']/g, '').replace(/ - /g, ' ').trim();
    if (simplified !== cleanName && simplified.length >= 3) {
        basicVariants.add(simplified);
        console.log(`    Added simplified: "${simplified}"`);
    }
    
    // Add accent-free version of simplified
    const simplifiedAccentFree = removeAccents(simplified);
    if (simplifiedAccentFree !== simplified && simplifiedAccentFree.length >= 3) {
        basicVariants.add(simplifiedAccentFree);
        console.log(`    Added simplified+accent-free: "${simplifiedAccentFree}"`);
    }
    
    // Only use KNOWN accent substitutions (not random combinations)
    const knownAccentMap = {
        'fenix': 'Fénix',
        'phoenix': 'Fénix',
        'geforce': 'G-Force',
        'baron': 'Baron 1898',
        'joris': 'Joris en de Draak'
    };
    
    const lowerName = cleanName.toLowerCase();
    for (const [from, to] of Object.entries(knownAccentMap)) {
        if (lowerName.includes(from)) {
            basicVariants.add(to);
        }
    }
    
    // Now search with all variants (up to 5)
    if (!foundBasicResults && returnAll) {
        
        // Try accent variants (skip first one as it was already tried)
        for (const nameVariant of Array.from(basicVariants).slice(1, 3)) {
            console.log(`  🔍 COMBINED VARIANT: "${nameVariant}" + "${parkName}"`);
            
            const combinedQuery = `
                SELECT ?item ?image ?itemLabel ?parkLabel ?mfgLabel WHERE {
                  ?item rdfs:label ?itemLabel .
                  FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapeSPARQL(nameVariant)}")))
                  
                  ${coasterTypeFilter}
                  ?item wdt:P18 ?image .
                  
                  ?item wdt:P127 ?park .
                  ?park rdfs:label ?parkLabel .
                  FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapeSPARQL(parkName)}")))
                  
                  OPTIONAL { 
                    ?item wdt:P176 ?mfg . 
                    ?mfg rdfs:label ?mfgLabel . 
                    FILTER(lang(?mfgLabel) = "en")
                  }
                }
                LIMIT 10
            `;
            
            try {
                const results = await querySPARQLMultiple(combinedQuery, 15000);
                console.log(`    📊 Combined variant query results: ${results?.length || 0}`);
                
                if (results && results.length > 0) {
                    const match = processResults(results, 'COMBINED');
                    if (Array.isArray(match) && match.length > 0) {
                        allFoundMatches.push(...match);
                        console.log(`    ✓ COMBINED VARIANT found ${match.length} results`);
                    }
                }
                await delay(200);
            } catch (e) {
                console.warn(`    ⚠️ COMBINED VARIANT failed: ${e.message}`);
                await delay(200);
            }
        }
    } else if (foundBasicResults) {
        console.log(`  ⚡ Basic search found results, skipping accent variants for speed`);
    }
    
    // If combined search succeeded and returnAll, we can return early
    if (returnAll && allFoundMatches.length >= 3) {
        console.log(`  ✓ Strategy 0 found ${allFoundMatches.length} good matches, skipping other strategies`);
        // Still deduplicate and sort
        const uniqueMatches = [];
        const seenUrls = new Set();
        for (const match of allFoundMatches) {
            if (!seenUrls.has(match.url)) {
                seenUrls.add(match.url);
                uniqueMatches.push(match);
            }
        }
        uniqueMatches.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const aParkLen = a.metadata.park?.length || 999;
            const bParkLen = b.metadata.park?.length || 999;
            return aParkLen - bParkLen;
        });
        return uniqueMatches;
    }
    
    // Continue with original strategies if Strategy 0 didn't find enough
    console.log(`  📝 Strategy 0 found ${allFoundMatches.length} results, continuing with fallback strategies...`);
    
    // Generate smart name variants and deduplicate
    const nameVariants = new Set();
    cleanName = coasterName.trim().replace(/\s+/g, ' ');
    
    nameVariants.add(cleanName);
    
    // Remove parentheses (e.g., "Crazy Bats (VR)" → "Crazy Bats")
    if (cleanName.includes('(')) {
        nameVariants.add(cleanName.replace(/\s*\([^)]*\)/g, '').trim());
    }
    
    // Remove subtitle after dash (e.g., "Colossos - Kampf" → "Colossos")
    if (cleanName.includes(' - ')) {
        nameVariants.add(cleanName.split(' - ')[0].trim());
    }
    
    // Remove subtitle after colon (e.g., "Xpress: Platform 13" → "Xpress")
    if (cleanName.includes(':')) {
        nameVariants.add(cleanName.split(':')[0].trim());
    }
    
    // Remove "Der/Die/Das" German articles (e.g., "Der Schwur des Kärnan" → "Schwur des Kärnan")
    if (/^(Der|Die|Das) /i.test(cleanName)) {
        nameVariants.add(cleanName.replace(/^(Der|Die|Das) /i, '').trim());
    }
    
    // Remove "The" English article (e.g., "The Smiler" → "Smiler")
    if (/^The /i.test(cleanName)) {
        nameVariants.add(cleanName.replace(/^The /i, '').trim());
    }
    
    // Remove hyphens (e.g., "Hals-über-Kopf" → "Hals uber Kopf")
    if (cleanName.includes('-')) {
        nameVariants.add(cleanName.replace(/-/g, ' ').trim());
    }
    
    // Remove apostrophes (e.g., "Winja's" → "Winjas")
    if (cleanName.includes("'")) {
        nameVariants.add(cleanName.replace(/'/g, '').trim());
    }
    
    // Try without special characters/accents (e.g., "Köln" → "Koln", "über" → "uber")
    const normalized = cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized !== cleanName) {
        nameVariants.add(normalized);
    }
    
    // Try common English/German spellings (e.g., "ü" → "ue", "ö" → "oe", "ä" → "ae")
    const germanized = cleanName
        .replace(/ü/g, 'ue')
        .replace(/ö/g, 'oe')
        .replace(/ä/g, 'ae')
        .replace(/ß/g, 'ss')
        .replace(/Ü/g, 'Ue')
        .replace(/Ö/g, 'Oe')
        .replace(/Ä/g, 'Ae');
    if (germanized !== cleanName) {
        nameVariants.add(germanized);
    }
    
    // REMOVED: Random accent generation - too many useless variants
    // Only use known substitutions below
    
    // Common name variations (TARGETED - only known coasters)
    const nameSubstitutions = {
        'fenix': 'Fénix',
        'phoenix': 'Fénix',
        'geforce': 'G-Force',
        'baron': 'Baron 1898'
    };
    
    const lowerCleanName = cleanName.toLowerCase();
    for (const [from, to] of Object.entries(nameSubstitutions)) {
        if (lowerCleanName === from || lowerCleanName.includes(from)) {
            const replaced = cleanName.replace(new RegExp(from, 'gi'), to);
            if (replaced !== cleanName && replaced.length >= 3) {
                nameVariants.add(replaced);
            }
        }
    }
    
    // Convert to array and filter out short names (< 3 chars)
    const variants = Array.from(nameVariants).filter(v => v.length >= 3);
    
    // Limit to top 3-4 most promising variants to avoid excessive searches
    // Use more variants when park is verified (allows looser matching)
    const limitedVariants = variants.slice(0, parkVerified ? 5 : 3);
    
    console.log(`  📝 Using ${limitedVariants.length} name variants for fallback:`, limitedVariants);
    console.log(`  🎯 Fallback Strategies: CONTAINS (${parkVerified ? 'LOOSE' : 'NORMAL'}), RELAXED (${parkVerified ? 'ENABLED' : 'DISABLED'})`);
    
    // Strategy 1: CONTAINS search (all languages automatically, no need for EXACT multi-lang)
    for (const variant of limitedVariants) {
        const escapedName = escapeSPARQL(variant);
        console.log(`  🔍 CONTAINS: "${variant}"`);
        
        // When park is verified, increase result limit to catch more potential matches
        const resultLimit = parkVerified ? 15 : 10;
        
        const containsQuery = `
            SELECT ?item ?image ?itemLabel ?parkLabel ?mfgLabel WHERE {
              ?item rdfs:label ?label .
              FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              OPTIONAL { 
                ?item wdt:P127 ?park . 
                ?park rdfs:label ?parkLabel . 
                FILTER(lang(?parkLabel) = "en")
              }
              OPTIONAL { 
                ?item wdt:P176 ?mfg . 
                ?mfg rdfs:label ?mfgLabel . 
                FILTER(lang(?mfgLabel) = "en")
              }
              ?item rdfs:label ?itemLabel . 
              FILTER(lang(?itemLabel) = "en")
            }
            LIMIT ${resultLimit}
        `;
        
        try {
            const results = await querySPARQLMultiple(containsQuery);
            const match = processResults(results, 'CONTAINS');
            if (returnAll && Array.isArray(match) && match.length > 0) {
                // Collect all results for cycling
                allFoundMatches.push(...match);
                // Early exit if we found enough good results
                if (allFoundMatches.length >= 5) {
                    console.log(`  ✓ Found ${allFoundMatches.length} images, stopping search`);
                    break;
                }
            } else if (!returnAll && match) {
                // Return single best result
                return match;
            }
            await delay(150);
        } catch (e) {
            console.warn(`    ⚠️ CONTAINS failed: ${e.message}`);
            await delay(150);
        }
    }
    
    // Strategy 2: Relaxed search without strict type filter (ONLY if park is verified)
    if (parkVerified && returnAll && allFoundMatches.length === 0) {
        console.log(`  🔓 RELAXED: Park verified, trying without strict type filter...`);
        for (const variant of limitedVariants.slice(0, 2)) { // Try first 2 variants only
            const escapedName = escapeSPARQL(variant);
            console.log(`  🔍 RELAXED: "${variant}"`);
            
            // More targeted relaxed query - add park filter to narrow results
            const parkFilter = parkName ? `
              OPTIONAL { 
                ?item wdt:P127 ?park . 
                ?park rdfs:label ?parkLabel . 
                FILTER(lang(?parkLabel) = "en")
              }
              FILTER(!BOUND(?park) || CONTAINS(LCASE(?parkLabel), LCASE("${escapeSPARQL(parkName)}")))
            ` : '';
            
            const relaxedQuery = `
                SELECT ?item ?image ?itemLabel ?parkLabel ?mfgLabel WHERE {
                  ?item rdfs:label ?label .
                  FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
                  ?item wdt:P18 ?image .
                  ${parkFilter}
                  OPTIONAL { 
                    ?item wdt:P176 ?mfg . 
                    ?mfg rdfs:label ?mfgLabel . 
                    FILTER(lang(?mfgLabel) = "en")
                  }
                  ?item rdfs:label ?itemLabel . 
                  FILTER(lang(?itemLabel) = "en")
                }
                LIMIT 10
            `;
            
            try {
                const results = await querySPARQLMultiple(relaxedQuery, 30000); // 30 second timeout for relaxed
                const match = processResults(results, 'RELAXED');
                if (Array.isArray(match) && match.length > 0) {
                    allFoundMatches.push(...match);
                    console.log(`    ✓ RELAXED found ${match.length} results`);
                }
                await delay(200);
            } catch (e) {
                console.warn(`    ⚠️ RELAXED failed: ${e.message}`);
                // Don't block on RELAXED failures - continue with what we have
                await delay(200);
            }
        }
    } else if (!parkVerified) {
        console.log(`  🔒 RELAXED: Skipped (park not verified - staying strict)`);
    }
    
    // Return all collected results
    if (returnAll) {
        // Deduplicate by URL
        const uniqueMatches = [];
        const seenUrls = new Set();
        for (const match of allFoundMatches) {
            if (!seenUrls.has(match.url)) {
                seenUrls.add(match.url);
                uniqueMatches.push(match);
            }
        }
        
        // Re-sort after combining strategies
        uniqueMatches.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const aParkLen = a.metadata.park?.length || 999;
            const bParkLen = b.metadata.park?.length || 999;
            return aParkLen - bParkLen;
        });
        
        console.log(`  ✓ Total unique images found: ${uniqueMatches.length}`);
        return uniqueMatches.length > 0 ? uniqueMatches : [];
    }
    
    console.log(`  ✗ No image found after intensive search`);
    return returnAll ? [] : null;
}

// Enhanced search for second round bulk loading (combines coaster name + park for better results)
async function enhancedCoasterImageSearch(coaster) {
    if (!coaster?.naam || !coaster?.park) return null;
    
    const coasterName = coaster.naam;
    const parkName = coaster.park;
    const manufacturer = coaster.fabrikant;
    
    console.log(`  🔍 Enhanced search: "${coasterName}" at ${parkName}`);
    
    const escapeSPARQL = (str) => str.replace(/["\\]/g, '\\$&');
    // Include both roller coasters and amusement rides
    const coasterTypeFilter = `{ ?item wdt:P31/wdt:P279* wd:Q204832 } UNION { ?item wdt:P31/wdt:P279* wd:Q186441 }`;
    
    // Generate park variants
    const parkVariants = [];
    let cleanPark = parkName.trim().replace(/\s+/g, ' ');
    parkVariants.push(cleanPark);
    
    const parkSuffixes = [/ Park$/i, / Parque$/i, /-Park$/i, /park$/i];
    for (const suffix of parkSuffixes) {
        if (suffix.test(cleanPark)) {
            const variant = cleanPark.replace(suffix, '').trim();
            if (variant && !parkVariants.includes(variant)) parkVariants.push(variant);
        }
    }
    
    // Try with different park variants
    for (const parkVariant of parkVariants.slice(0, 2)) {
        // Create a targeted query that searches for BOTH coaster name AND park name
        // Check both P361 (part of) and P127 (owned by) for park
        const enhancedQuery = `
            SELECT ?item ?image ?itemLabel ?parkLabel ?mfgLabel WHERE {
              ?item rdfs:label ?itemLabel .
              FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapeSPARQL(coasterName)}")))
              FILTER(lang(?itemLabel) = "en" || lang(?itemLabel) = "de" || lang(?itemLabel) = "nl")
              
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              { ?item wdt:P127 ?park } UNION { ?item wdt:P361 ?park }
              ?park rdfs:label ?parkLabel .
              FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapeSPARQL(parkVariant)}")))
              FILTER(lang(?parkLabel) = "en" || lang(?parkLabel) = "de" || lang(?parkLabel) = "nl")
              
              OPTIONAL { 
                ?item wdt:P176 ?mfg . 
                ?mfg rdfs:label ?mfgLabel . 
                FILTER(lang(?mfgLabel) = "en")
              }
            }
            LIMIT 5
        `;
        
        try {
            const results = await querySPARQLMultiple(enhancedQuery, 15000);
            
            if (results && results.length > 0) {
                console.log(`    ✓ Enhanced search found ${results.length} results with park "${parkVariant}"`);
                
                // Score results and pick best match
                let bestMatch = null;
                let bestScore = 0;
                
                for (const result of results) {
                    const itemLabel = result.itemLabel?.value || '';
                    const parkLabel = result.parkLabel?.value || '';
                    const mfgLabel = result.mfgLabel?.value || '';
                    
                    let score = 50; // Base score
                    
                    // Name similarity
                    const nameSimilarity = getSimilarityScore(coasterName, itemLabel);
                    score += Math.round(nameSimilarity * 0.4);
                    
                    // Park match (already filtered, but check exactness)
                    if (parkLabel.toLowerCase() === parkName.toLowerCase()) {
                        score += 30;
                    } else {
                        score += 15; // Partial match
                    }
                    
                    // Manufacturer bonus
                    if (manufacturer && mfgLabel) {
                        const mfgSimilarity = getSimilarityScore(manufacturer, mfgLabel);
                        if (mfgSimilarity >= 70) score += 10;
                    }
                    
                    console.log(`      Candidate: ${itemLabel} (score: ${score})`);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = result;
                    }
                }
                
                if (bestMatch) {
                    const imageUrl = bestMatch.image?.value;
                    if (imageUrl) {
                        const finalUrl = imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl;
                        
                        // Cache the found image
                        const normalizedName = normalizeCoasterName(coasterName);
                        const normalizedPark = normalizeCoasterName(parkName);
                        const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
                        localStorage.setItem(cacheKey, finalUrl);
                        
                        console.log(`    ✓ Cached enhanced result for "${coasterName}" (score: ${bestScore})`);
                        return finalUrl;
                    }
                }
            }
        } catch (error) {
            console.warn(`    ⚠️ Enhanced search failed for park "${parkVariant}": ${error.message}`);
        }
    }
    
    return null;
}

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

// Execute SPARQL query against Wikidata
async function querySPARQL(query, timeoutMs = 10000) {
    const endpoint = 'https://query.wikidata.org/sparql';
    const url = `${endpoint}?query=${encodeURIComponent(query)}&format=json`;
    
    try {
        const response = await fetchWithTimeout(url, {
            headers: {
                'Accept': 'application/sparql-results+json',
                'User-Agent': 'CoasterRanker/1.0 (Educational Project)'
            }
        }, timeoutMs); // Reduced to 10s for standard queries, 20s for intensive
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('SPARQL query failed:', response.status, response.statusText);
            console.error('Error details:', errorText.substring(0, 500));
            // Check for rate limiting
            if (response.status === 429) {
                throw new Error('RATE_LIMIT');
            }
            throw new Error(`SPARQL query failed: ${response.status}`);
        }
        
        const data = await response.json();
        const bindings = data?.results?.bindings;
        
        if (bindings && bindings.length > 0 && bindings[0].image) {
            let imageUrl = bindings[0].image.value;
            // Ensure HTTPS to avoid mixed content warnings
            if (imageUrl.startsWith('http://')) {
                imageUrl = imageUrl.replace('http://', 'https://');}
            return imageUrl;
        }
        
        return null;
    } catch (error) {
        console.error('SPARQL fetch error:', error.message);
        throw error;
    }
}

// Get coaster image (from cache or fetch from Wikidata)
async function getCoasterImage(coaster) {
    if (!coaster || !coaster.naam) return getPlaceholderImage();
    
    const normalizedName = normalizeCoasterName(coaster.naam);
    const normalizedPark = normalizeCoasterName(coaster.park);
    const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
    
    // Check cache first
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            // Increment appropriate counter based on whether it's placeholder or real image
            if (cached.startsWith('data:image/svg+xml')) {
                // It's a cached placeholder (failed image)
                imageLoadStats.failed++;
            } else {
                // It's a real cached image
                imageLoadStats.loaded++;
            }
            imageLoadStats.cached++;
            return cached;
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    
    // Fetch from Wikidata
    try {
        const imageUrl = await queryWikidataImage(coaster.naam, coaster.park, coaster.fabrikant);
        
        if (imageUrl) {
            // Cache the result
            try {
                localStorage.setItem(cacheKey, imageUrl);
            } catch (e) {
                console.warn('Cache write error (quota?):', e);
            }
            imageLoadStats.loaded++;
            return imageUrl;
        } else {
            // No image found - cache placeholder to avoid repeated queries
            const placeholder = getPlaceholderImage();
            try {
                localStorage.setItem(cacheKey, placeholder);
            } catch (e) {
                console.warn('Cache write error:', e);
            }
            imageLoadStats.failed++;
            return placeholder;
        }
    } catch (error) {
        console.error('Error fetching image for', coaster.naam, ':', error);
        imageLoadStats.failed++;
        return getPlaceholderImage();
    }
}

// Synchronous cache-only image retrieval (for instant display in battles)
function getCoasterImageSync(coaster) {
    if (!coaster || !coaster.naam) return getPlaceholderImage();
    
    const normalizedName = normalizeCoasterName(coaster.naam);
    const normalizedPark = normalizeCoasterName(coaster.park);
    const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
    
    // Check memory cache first (fastest)
    if (imageMemoryCache.has(cacheKey)) {
        return imageMemoryCache.get(cacheKey);
    }
    
    // Check localStorage (slower)
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            // Store in memory cache for next time
            imageMemoryCache.set(cacheKey, cached);
            return cached;
        }
    } catch (e) {
        // Silent fail
    }
    
    // Return placeholder if not in cache
    return getPlaceholderImage();
}

// Preload a single image (returns promise that resolves when loaded)
function preloadImage(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false); // Don't reject, just resolve with false
        img.src = imageUrl;
    });
}

// Preload images for a pair of coasters
async function preloadBattleImages(coaster1, coaster2) {
    if (!coaster1 || !coaster2) return;
    const url1 = getCoasterImageSync(coaster1);
    const url2 = getCoasterImageSync(coaster2);
    
    // Load both in parallel
    const results = await Promise.all([
        preloadImage(url1),
        preloadImage(url2)
    ]);
    return results.every(r => r); // Return true only if both loaded successfully
}

// Background preloader - loads images for next potential battles
async function preloadNextBattles() {
    if (isPreloading || !currentUser || !coasters || coasters.length < 2) return;
    
    isPreloading = true;
    const queueSize = keyboardUsageDetected ? PRELOAD_QUEUE_SIZE_FAST : PRELOAD_QUEUE_SIZE_NORMAL;
    
    try {
        // Generate and cache the immediate next battle first for instant display
        if (!nextBattlePreloaded) {
            const nextPair = getRandomCoasters();
            if (nextPair && nextPair.length === 2) {
                await preloadBattleImages(nextPair[0], nextPair[1]);
                nextBattlePreloaded = nextPair;
            }
        }
        
        // Generate additional potential battles for queue
        const battlesToPreload = [];
        for (let i = 0; i < queueSize; i++) {
            const pair = getRandomCoasters();
            if (pair && pair.length === 2) {
                battlesToPreload.push(pair);
            }
        }
        
        // Preload all images
        for (const [c1, c2] of battlesToPreload) {
            await preloadBattleImages(c1, c2);
        }
    } catch (e) {
        console.warn('Preload error:', e);
    } finally {
        isPreloading = false;
    }
}

// Clear all cached images from localStorage
function clearImageCache() {
    if (!confirm('Clear all cached coaster images? They will be re-fetched on next page refresh.')) {
        return;
    }
    
    try {
        const keys = Object.keys(localStorage);
        let cleared = 0;
        
        keys.forEach(key => {
            if (key.startsWith('coasterImage_')) {
                localStorage.removeItem(key);
                cleared++;
            }
        });
        
        // Reset stats
        imageLoadStats = {
            loaded: 0,
            total: 0,
            failed: 0,
            cached: 0
        };
        
        updateImageLoadStats();
        showToast(`✅ Cleared ${cleared} cached images. Refresh page to reload.`);
        
        // Don't reload immediately - only after page refresh
        // This prevents unnecessary API calls when user is just clearing cache
    } catch (e) {
        console.error('Error clearing cache:', e);
        showToast('❌ Failed to clear cache');
    }
}

// Auto-clean old cache versions (called on startup)
function cleanOldCacheVersions() {
    try {
        const keys = Object.keys(localStorage);
        let cleaned = 0;
        
        keys.forEach(key => {
            // Remove old version caches (anything not matching current version)
            if (key.startsWith('coasterImage_') && !key.startsWith(`coasterImage_${CACHE_VERSION}_`)) {
                localStorage.removeItem(key);
                cleaned++;
            }
        });
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} old cache entries (outdated version)`);
        }
    } catch (e) {
        console.warn('Error cleaning old cache:', e);
    }
}

// Update dev menu with current image loading stats
function updateImageLoadStats() {
    const detailsEl = document.getElementById('imageLoadDetails');
    
    if (detailsEl) {
        detailsEl.textContent = `Hit: ${imageLoadStats.cached} | Error: ${imageLoadStats.failed}`;
    }
}

// Preload all coaster images in background
// Update loading screen progress
    function updateLoadingScreen(loaded, total, failed, customMessage = null) {
        requestAnimationFrame(() => {
            const overlay = document.getElementById('imageLoadingOverlay');
            const train = document.getElementById('coasterTrain');
            const progressText = document.getElementById('loadingProgressText');
    
    if (!overlay || !train || !progressText) return;
    
    const processed = loaded + failed;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    
    // Move train horizontally across the track
    const container = train.parentElement;
    const maxPosition = container ? container.offsetWidth - 60 : 340; // Leave space for train length
    train.style.left = `${(percentage / 100) * maxPosition}px`;
    
    if (customMessage) {
        progressText.textContent = `${customMessage} (${processed}/${total})`;
    } else {
        progressText.textContent = `Loading images: ${loaded} found, ${failed} not found (${processed}/${total})`;
    }
        });
    }

// Hide loading screen
function hideLoadingScreen() {
    const overlay = document.getElementById('imageLoadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Progressive loading: load priority coasters first, then background load rest
// Preload all coaster images during loading screen
async function preloadAllCoasterImages() {
    if (!currentUser || !coasters || coasters.length === 0) {
        console.warn('⚠️ preloadAllCoasterImages: No user or coasters available');
        hideLoadingScreen();
        return;
    }
    
    console.log(`Image Loading Summary: ${coasters.length} coasters`);
    
    cleanOldCacheVersions();
    
    imageLoadStats.loaded = 0;
    imageLoadStats.failed = 0;
    imageLoadStats.cached = 0;
    imageLoadStats.total = coasters.length;
    
    // Quick check: count how many are already cached
    let cachedCount = 0;
    for (const coaster of coasters) {
        const normalizedName = normalizeCoasterName(coaster.naam);
        const normalizedPark = normalizeCoasterName(coaster.park);
        const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
        if (localStorage.getItem(cacheKey)) {
            cachedCount++;
        }
    }
    
    // If all are cached, load instantly without showing loading screen progress
    if (cachedCount === coasters.length) {
        // Just increment stats for cached images
        for (const coaster of coasters) {
            await getCoasterImage(coaster); // Will return from cache instantly
        }
        hideLoadingScreen();
        return;
    }
    
    // Some images need fetching - show loading screen
    updateImageLoadStats();
    updateLoadingScreen(0, coasters.length, 0);
    
    console.log(`Loading ${coasters.length - cachedCount} new images (${cachedCount} cached)...`);
    
    // Load in batches to avoid rate limiting while maintaining speed
    // Larger batches for cached items, smaller for API calls
    const uncachedCoasters = [];
    const cachedCoasters = [];
    
    // Separate cached from uncached
    for (const coaster of coasters) {
        const normalizedName = normalizeCoasterName(coaster.naam);
        const normalizedPark = normalizeCoasterName(coaster.park);
        const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
        if (localStorage.getItem(cacheKey)) {
            cachedCoasters.push(coaster);
        } else {
            uncachedCoasters.push(coaster);
        }
    }
    
    // Load cached items quickly in larger batches (they're instant)
    const cachedBatchSize = 20;
    for (let i = 0; i < cachedCoasters.length; i += cachedBatchSize) {
        const batch = cachedCoasters.slice(i, i + cachedBatchSize);
        await Promise.all(
            batch.map(coaster => 
                getCoasterImage(coaster).then(() => {
                    updateImageLoadStats();
                    updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                })
            )
        );
    }
    
    // Load uncached items in smaller batches with delay to avoid rate limiting
    const batchSize = 10; // Increased from 5 to 10 for faster loading (optimized queries)
    const batchDelay = 250; // Reduced from 300ms to 250ms for faster loading
    
    for (let i = 0; i < uncachedCoasters.length; i += batchSize) {
        const batch = uncachedCoasters.slice(i, i + batchSize);
        
        await Promise.all(
            batch.map(coaster => 
                getCoasterImage(coaster).then(() => {
                    updateImageLoadStats();
                    updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                })
            )
        );
        
        // Wait between batches only if there are more uncached items to load
        if (i + batchSize < uncachedCoasters.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
    }
    
    console.log(`✓ All ${coasters.length} coasters loaded for ${currentUser}!`);
    console.log(`  Loaded: ${imageLoadStats.loaded}, Failed: ${imageLoadStats.failed}, From cache: ${imageLoadStats.cached}`);
    
    hideLoadingScreen();
}

// OLD: Progressive loading function (removed - kept for reference)
async function preloadCoasterImagesProgressive() {
    if (!currentUser || !coasters || coasters.length === 0) {
        hideLoadingScreen();
        return;
    }
    
    cleanOldCacheVersions();
    
    imageLoadStats.loaded = 0;
    imageLoadStats.failed = 0;
    imageLoadStats.cached = 0;
    imageLoadStats.total = coasters.length;
    
    updateImageLoadStats();
    updateLoadingScreen(0, coasters.length, 0);
    
    console.log(`🚀 Progressive loading: Loading first 20 coasters immediately...`);
    
    // PRIORITY: Load first 20 coasters that will show in initial battles
    const priorityCount = Math.min(20, coasters.length);
    const priorityCoasters = coasters.slice(0, priorityCount);
    
    // Load priority coasters with minimal delay
    for (const coaster of priorityCoasters) {
        await getCoasterImage(coaster);
        coastersWithImages.add(coaster.naam); // Track as loaded
        updateImageLoadStats();
        updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to avoid instant rate limit
    }
    
    console.log(`✓ First ${priorityCount} coasters loaded - starting battles!`);
    hideLoadingScreen();
    
    // BACKGROUND: Load remaining coasters slowly to avoid rate limits
    if (coasters.length > priorityCount) {
        console.log(`📦 Background loading remaining ${coasters.length - priorityCount} coasters...`);
        backgroundLoadRemainingImages(priorityCount);
    }
}

// Background loader - loads remaining images slowly without blocking UI
async function backgroundLoadRemainingImages(startIndex) {
    const remainingCoasters = coasters.slice(startIndex);
    const batchSize = 5; // Balanced batch size for speed without rate limiting
    const batchDelay = 800; // 800ms delay - completes ~100 coasters in under 1 minute
    
    for (let i = 0; i < remainingCoasters.length; i += batchSize) {
        const batch = remainingCoasters.slice(i, i + batchSize);
        
        // Process batch
        await Promise.all(
            batch.map(async (coaster) => {
                await getCoasterImage(coaster);
                coastersWithImages.add(coaster.naam); // Track as loaded
                // Silently update stats without UI noise
            })
        );
        
        // Wait between batches to avoid rate limiting
        if (i + batchSize < remainingCoasters.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
    }
    
    allCoastersLoadingComplete = true;
    console.log(`✓ Background loading complete - all ${coasters.length} coasters ready! Returning to normal selection.`);
}

// Original full preload function (kept for fallback/manual use)
async function preloadCoasterImages() {
    if (!currentUser || !coasters || coasters.length === 0) {
        hideLoadingScreen();
        return;
    }
    
    // Auto-clean old cache versions before starting
    cleanOldCacheVersions();
    
    // IMPORTANT: Reset ALL stats including cached to avoid showing stale numbers
    imageLoadStats.loaded = 0;
    imageLoadStats.failed = 0;
    imageLoadStats.cached = 0;
    imageLoadStats.total = coasters.length;
    
    updateImageLoadStats();
    updateLoadingScreen(0, coasters.length, 0);
    
    console.log(`Starting image preload for ${coasters.length} coasters...`);
    
    // Track failed coasters for second round
    const failedCoasters = [];
    
    // Smaller batches to avoid overwhelming the API
    const batchSize = 5; // Reduced to avoid rate limiting
    const delay = 300; // Increased delay between batches
    
    // FIRST ROUND: Standard search
    for (let i = 0; i < coasters.length; i += batchSize) {
        const batch = coasters.slice(i, i + batchSize);
        const startCached = imageLoadStats.cached;
        const startFailed = imageLoadStats.failed;
        
        // Process batch in parallel
        await Promise.all(
            batch.map(async (coaster) => {
                await getCoasterImage(coaster);
                updateImageLoadStats();
                updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
            })
        );
        
        // Track which coasters in this batch failed
        const newFailures = imageLoadStats.failed - startFailed;
        if (newFailures > 0) {
            // Check which ones failed and add to retry list
            for (const coaster of batch) {
                const normalizedName = normalizeCoasterName(coaster.naam);
                const normalizedPark = normalizeCoasterName(coaster.park);
                const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
                const cached = localStorage.getItem(cacheKey);
                // If it's a placeholder, mark for retry
                if (cached && cached.includes('data:image/svg+xml')) {
                    failedCoasters.push(coaster);
                }
            }
        }
        
        // Only delay if this batch made API calls (not all cached)
        const newlyCached = imageLoadStats.cached - startCached;
        if (i + batchSize < coasters.length && newlyCached < batch.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    const firstRoundSuccess = imageLoadStats.loaded;
    const firstRoundFailed = imageLoadStats.failed;
    console.log(`First round complete: ${firstRoundSuccess} found, ${firstRoundFailed} failed`);
    
    // SECOND ROUND: Enhanced search for failed coasters with park+name combined query
    // Only run if there are actually failed coasters (efficiency first!)
    if (failedCoasters.length > 0 && firstRoundFailed > 0) {
        console.log(`🔄 Starting second round for ${failedCoasters.length} failed coasters...`);
        updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed, 'Retrying failed images...');
        
        let secondRoundSuccess = 0;
        
        for (let i = 0; i < failedCoasters.length; i += batchSize) {
            const batch = failedCoasters.slice(i, i + batchSize);
            
            await Promise.all(
                batch.map(async (coaster) => {
                    const result = await enhancedCoasterImageSearch(coaster);
                    if (result) {
                        secondRoundSuccess++;
                        imageLoadStats.loaded++;
                        imageLoadStats.failed--;
                        updateImageLoadStats();
                        updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                    }
                })
            );
            
            // Delay between batches
            if (i + batchSize < failedCoasters.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.log(`Second round complete: ${secondRoundSuccess} additional images found`);
    } else if (firstRoundFailed === 0) {
        console.log(`✓ All images found in first round - skipping second round!`);
    }
    
    const successRate = Math.round((imageLoadStats.loaded / imageLoadStats.total) * 100);
    console.info(`Image preloading complete: ${successRate}% success (${imageLoadStats.loaded} found, ${imageLoadStats.failed} not found, ${imageLoadStats.cached} cached)`, imageLoadStats);
    
    // Hide loading screen after all images are processed
    hideLoadingScreen();
}

// ========================================
// END IMAGE FETCHING SERVICE
// ========================================
    
    function syncSimInputWidth() {
        try {
            const btn = DOM.simulateBtn || $id('simulateBtn');
            const input = DOM.simulateCount || $id('simulateCount');
            if (btn && input) {
                const w = btn.offsetWidth;
                // use box-sizing aware width
                input.style.width = w + 'px';
            }
        } catch (e) { /* ignore */ }
    }

// Consolidated debounced resize handler (handles header, sim input and dev-data positioning)
const onResize = debounce(() => {
    setHeaderHeight();
    syncSimInputWidth();
    if (devShowData) {
        renderDevData();
        setTimeout(positionDevData, 0);
    }
}, 120);

window.addEventListener('resize', onResize, { passive: true });
    let currentUser = null;
    let coasters = [];
    let coastersWithImages = new Set(); // Track coasters that have images loaded
    let allCoastersLoadingComplete = false; // True when all coasters have been attempted
    let coasterStats = {};
    let totalBattlesCount = 0;
    let currentBattle = null;
    let closeIntroTimeout = null; // handle for scheduled close-intro so we can cancel it
    let closeIntroActive = false; // true while the intro animation is running
    let resolvingBattle = false; // true while a winner choice is being processed
    let closeIntroPrevVSDisplay = null;

    // Cancel any pending or active close-intro/overlay immediately
    function cancelCloseIntro(){
        try{
            closeIntroActive = false;
            if (closeIntroTimeout) { clearTimeout(closeIntroTimeout); closeIntroTimeout = null; }
            // hide overlay/banner/burst immediately and remove visible classes
            const overlay = document.getElementById('closeBattleOverlay');
            const banner = document.getElementById('closeBanner');
            const burst = document.getElementById('winnerBurst');
            const vs = document.querySelector('.vs-divider');
            if (banner) { banner.classList.remove('show'); banner.style.removeProperty('display'); }
            if (burst) { burst.classList.remove('show','big'); burst.style.removeProperty('display'); }
            if (overlay) {
                overlay.classList.remove('show');
                overlay.style.setProperty('display','none','important');
                overlay.style.setProperty('opacity','0','important');
                overlay.style.removeProperty('z-index');
                overlay.setAttribute('aria-hidden','true');
            }
            // hide the original VS marker while overlay/intro is hidden
            try{ if (vs) { vs.style.setProperty('display','none','important'); vs.setAttribute('data-cr-hidden','true'); } }catch(e){}
            // clear dev force so it doesn't accidentally retrigger after hiding
            try{ devForceCloseBattle = false; }catch(e){}
        }catch(e){ /* swallow */ }
    }

    // Restore the original VS divider (remove any forced hiding)
    function restoreVsDivider(){
        try{
            const vs = document.querySelector('.vs-divider');
            if (!vs) return;
            if (closeIntroPrevVSDisplay !== null && closeIntroPrevVSDisplay !== '') vs.style.display = closeIntroPrevVSDisplay; else vs.style.removeProperty('display');
            vs.removeAttribute('data-cr-hidden');
            // also remove any !important hide if present
            try { vs.style.removeProperty('display'); } catch(e) {}
            closeIntroPrevVSDisplay = null;
        }catch(e){}
    }
    let isProcessingChoice = false;
    let currentSort = { column: 'rating', ascending: false };
    // History: stores past battles for current user
    let coasterHistory = [];
    // Stack for undoing deletions (LIFO)
    let deletedHistoryStack = [];
    const MAX_UNDO_STACK = 50;
    const MAX_HISTORY_KEEP = 10000; // Maximum history entries to keep
    // Exploration boost: favor coasters with few battles
    let EXPLORATION_POWER = 2; // higher => stronger preference for low-battles
    // Glicko-2 rating system parameters
    const GLICKO2_RATING_BASE = 1500;     // Initial rating (same scale as ELO for compatibility)
    let GLICKO2_RD_INITIAL = 350;         // Initial rating deviation (high uncertainty)
    const GLICKO2_RD_MIN = 35;            // Minimum RD floor (prevents complete rating lock-in)
    const GLICKO2_VOLATILITY_INITIAL = 0.06; // Initial volatility
    let GLICKO2_TAU = 0.5;                // System constant (constrains volatility change, 0.3-1.2)
    const GLICKO2_EPSILON = 0.000001;     // Convergence tolerance
    const GLICKO2_SCALE_FACTOR = 173.7178; // Conversion factor from Glicko to Glicko-2 scale
    const RD_INCREASE_PER_BATTLE = 0.5;   // Small RD increase per battle (creates equilibrium, prevents freeze)
    const PRIOR_WEIGHT = 6;  // pseudo-battles pulling displayed rating toward mean (for display only)
    // Rating-proximity: prefer opponents whose rating is similar (more informative matches)
    let RATING_PROXIMITY_POWER = 0.1; // higher => stronger preference for similar rating
    const RATING_DIFF_SCALE = 400; // scale (in rating points) used to normalize differences
    
    // ========================================
    // PHASE SYSTEM CONFIGURATION
    // ========================================
    // Phases: waiting (not started), seeding (onboarding, boosted frequency), ranked (active)
    let SEEDING_TARGET_COUNT = 20;      // Target number of coasters in Seeding phase
    let SEEDING_BATCH_SIZE = 2;          // How many to promote from Waiting per batch (staggered)
    let SEEDING_MIN_BATTLES = 5;         // Minimum battles before exiting Seeding to Ranked
    const SEEDING_BOOST_FACTOR = 1.2;    // Matchmaking probability boost for Seeding coasters (reduced to allow ranked vs ranked)
    
    // Pairing strategy: hybrid — picks one under-sampled coaster
    // then picks a second that is ELO-similar while still favoring under-sampled ones.
    let pairingControlsHidden = true;
    // Track all completed pairs to prevent duplicates
    let completedPairs = new Set();

    // Dev UI: whether to show debug data beside cards
    let devShowData = false;

// Lightweight DOM cache for frequently used elements (populated on DOMContentLoaded)
const DOM = {};

    // Show user selection screen (on first load or after logout)
    function showUserSelectionScreen() {
        const selectionScreen = document.getElementById('userSelectionScreen');
        const profileContent = document.getElementById('profileContent');
        
        if (selectionScreen) {
            selectionScreen.style.display = 'flex';
        }
        if (profileContent) {
            profileContent.style.display = 'none';
        }
        
        // Make sure we're on the profile/home tab
        switchTab('home');
        
        // Update current user badge
        const badge = document.getElementById('currentUserBadge');
        if (badge) badge.textContent = 'Select a user';
    }
    
    // Hide user selection screen, show profile content
    function hideUserSelectionScreen() {
        const selectionScreen = document.getElementById('userSelectionScreen');
        const profileContent = document.getElementById('profileContent');
        
        if (selectionScreen) {
            selectionScreen.style.display = 'none';
        }
        if (profileContent) {
            profileContent.style.display = 'block';
        }
    }
    
    // Hide the loading overlay
    function hideLoadingOverlay() {
        const overlay = document.getElementById('imageLoadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    }
    
    // Disable tabs (except profile) when no user is logged in
    function disableTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach((tab, index) => {
            if (index !== 0) { // Don't disable the first tab (profile)
                tab.style.opacity = '0.5';
                tab.style.pointerEvents = 'none';
                tab.style.cursor = 'not-allowed';
            }
        });
    }
    
    // Enable all tabs when user is logged in
    function enableTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.style.opacity = '1';
            tab.style.pointerEvents = 'auto';
            tab.style.cursor = 'pointer';
        });
    }
    
    // User selection from the selection screen - save user and reload
    function selectUser(user) {
        if (!user || (user !== 'luca' && user !== 'wouter')) return;
        
        // Save the selected user
        localStorage.setItem('lastUser', user);
        
        // Reload the page to initialize with the selected user
        window.location.reload();
    }
    
    // Modified switchUser function to optionally trigger image loading
    async function switchUser(user, triggerImageLoad = true) {
        currentUser = user;
        
        // Save user preference
        localStorage.setItem('lastUser', user);
        
        // Update UI
        const badge = document.getElementById('currentUserBadge');
        if (badge) badge.textContent = `Logged in as: ${user === 'luca' ? 'Luca' : 'Wouter'}`;
        
        // Reload CSV data to ensure we have the latest coasters
        await reloadCoasterCSVData();
        
        // Load user-specific data - including all coasters (operational and defunct)
        if (user === 'luca') {
            coasters = coastersDataLuca;
            console.log(`🎯 Switched to Luca - Loading ${coasters.length} coasters`);
        } else {
            coasters = coastersDataWouter;
            console.log(`🎯 Switched to Wouter - Loading ${coasters.length} coasters`);
        }
        
        // Load or initialize stats
        loadUserData();
        
        // Load achievements
        if (typeof achievementManager !== 'undefined') {
            achievementManager.load(user);
            updatePinsDisplay();
        }
        
        // Reset session stats when switching users
        resetSessionStats();
        
        // Hide user selection screen, show profile
        hideUserSelectionScreen();
        
        // Enable tabs now that user is logged in
        enableTabs();
        
        // If triggered from user selection, load all images with loading screen
        if (triggerImageLoad) {
            // Show loading overlay
            const overlay = document.getElementById('imageLoadingOverlay');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.remove('hidden');
            }
            
            // Set header height for mobile sticky tabs
            setHeaderHeight();
            // Post-initialization UI adjustments
            postInitUISetup();
            
            // Load ALL images during loading screen
            await preloadAllCoasterImages();
            
            // Now display the first battle and refresh displays
            displayBattle();
            updateRanking();
            displayHome();
        } else {
            // Just refresh displays without loading images
            displayBattle();
            updateRanking();
            displayHome();
        }
    }
    
    // Logout function - clear user and reload
    function logoutUser() {
        // Clear user preference
        localStorage.removeItem('lastUser');
        
        // Close menu
        try { closeUserMenu(); } catch (e) {}
        
        // Reload page to reset to login screen
        window.location.reload();
    }
    
    // Placeholder functions for settings and dark mode
    function openSettings() {
        showToast('⚙️ Settings coming soon!');
        closeUserMenu();
    }
    
    function toggleDarkMode() {
        const body = document.body;
        const btn = document.getElementById('btn-darkmode');
        
        if (body.classList.contains('dark-mode')) {
            // Switch to light mode
            body.classList.remove('dark-mode');
            if (btn) btn.textContent = 'Dark Mode';
            localStorage.setItem('darkMode', 'false');
            showToast('☀️ Light mode activated');
        } else {
            // Switch to dark mode
            body.classList.add('dark-mode');
            if (btn) btn.textContent = 'Light Mode';
            localStorage.setItem('darkMode', 'true');
            showToast('🌙 Dark mode activated');
        }
        
        closeUserMenu();
    }
    
    // Load dark mode preference on page load
    function loadDarkModePreference() {
        const darkMode = localStorage.getItem('darkMode');
        const body = document.body;
        const btn = document.getElementById('btn-darkmode');
        
        if (darkMode === 'true') {
            body.classList.add('dark-mode');
            if (btn) btn.textContent = 'Light Mode';
        }
    }

    function loadUserData() {
        const statsKey = `coasterStats_${currentUser}`;
        const battlesKey = `totalBattles_${currentUser}`;
        const historyKey = `coasterHistory_${currentUser}`;
        const pairsKey = `completedPairs_${currentUser}`;
        const battleKey = `currentBattle_${currentUser}`;

        try {
            coasterStats = JSON.parse(localStorage.getItem(statsKey)) || initializeStats();
        } catch (e) {
            console.error('Failed to parse coaster stats from localStorage:', e);
            coasterStats = initializeStats();
        }
        
        // Load total battles count first (needed for phase logic)
        totalBattlesCount = parseInt(localStorage.getItem(battlesKey)) || 0;
        
        try {
            coasterHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
        } catch (e) {
            console.error('Failed to parse coaster history from localStorage:', e);
            coasterHistory = [];
        }
        
        // Migrate from ELO to Glicko-2 if necessary
        Object.values(coasterStats).forEach(stats => {
            if (stats.elo !== undefined && stats.rating === undefined) {
                // Migrate old ELO data to Glicko-2
                stats.rating = stats.elo;
                stats.rd = GLICKO2_RD_INITIAL;
                stats.volatility = GLICKO2_VOLATILITY_INITIAL;
                delete stats.elo;
            }
            // Ensure all Glicko-2 fields exist
            if (stats.rating === undefined) stats.rating = GLICKO2_RATING_BASE;
            if (stats.rd === undefined) stats.rd = GLICKO2_RD_INITIAL;
            if (stats.volatility === undefined) stats.volatility = GLICKO2_VOLATILITY_INITIAL;
            
            // Ensure phase field exists - default to waiting
            if (stats.phase === undefined) {
                stats.phase = 'waiting';
            }
        });
        
        // Phase initialization logic
        // Check if any coasters already have seeding status (from previous session)
        const hasExistingSeedingCoasters = Object.values(coasterStats).some(s => s.phase === 'seeding');
        
        if (totalBattlesCount === 0) {
            // No battles at all
            if (!hasExistingSeedingCoasters) {
                // First time initialization - ensure all coasters start in waiting, then promote 25 to seeding
                Object.values(coasterStats).forEach(stats => {
                    if (stats.battles === 0) {
                        stats.phase = 'waiting';
                    }
                });
                // Promote 25 random coasters to Seeding
                promoteWaitingToSeeding(true);
                console.log('Initialized phase system: promoted 25 random coasters to Seeding');
            } else {
                // Phases already exist from localStorage, just ensure consistency
            }
        } else if (Object.values(coasterStats).some(s => s.battles > 0)) {
            // Some battles exist - reprocess phases based on stats
            reprocessAllPhases();
        }
        
        // Load completed pairs
        const savedPairs = localStorage.getItem(pairsKey);
        completedPairs = savedPairs ? new Set(JSON.parse(savedPairs)) : new Set();
        
        // Rebuild completedPairs from history if it's empty but we have battles
        if (completedPairs.size === 0 && coasterHistory.length > 0) {
            console.log('Rebuilding completedPairs from history...');
            coasterHistory.forEach(entry => {
                if (entry.pairKey) {
                    completedPairs.add(entry.pairKey);
                } else if (entry.a && entry.b) {
                    // Legacy entry without pairKey - generate it
                    const key = pairKey(entry.a, entry.b);
                    completedPairs.add(key);
                }
            });
            console.log(`Rebuilt ${completedPairs.size} pairs from ${coasterHistory.length} battles`);
            // Save the rebuilt set
            localStorage.setItem(pairsKey, JSON.stringify([...completedPairs]));
        }
        
        // Load current battle if it exists
        try {
            const savedBattle = localStorage.getItem(battleKey);
            if (savedBattle) {
                currentBattle = JSON.parse(savedBattle);
            }
        } catch (e) {
            currentBattle = null;
        }
        
        // load pairing settings for this user (if any)
        loadPairingSettings();
        // load developer UI settings for this user
        loadDevSettings();
        
        // Save and update after all data is loaded (including current battle)
        saveData();
    }

    function initializeStats() {
        const stats = {};
        coasters.forEach(coaster => {
            stats[coaster.naam] = {
                name: coaster.naam,
                park: coaster.park,
                manufacturer: coaster.fabrikant,
                rating: GLICKO2_RATING_BASE,
                rd: GLICKO2_RD_INITIAL,
                volatility: GLICKO2_VOLATILITY_INITIAL,
                battles: 0,
                wins: 0,
                losses: 0,
                phase: 'waiting'  // Default phase for new coasters
            };
        });
        return stats;
    }

    // ========================================
    // PHASE MANAGEMENT SYSTEM
    // ========================================
    
    // Get phase distribution stats
    function getPhaseDistribution() {
        const distribution = {
            waiting: 0,
            seeding: 0,
            ranked: 0
        };
        
        Object.values(coasterStats).forEach(stats => {
            const phase = stats.phase || 'waiting';
            if (distribution.hasOwnProperty(phase)) {
                distribution[phase]++;
            }
        });
        
        return distribution;
    }
    
    // Check and update phase for a single coaster
    function checkCoasterPhaseTransition(coasterName) {
        const stats = coasterStats[coasterName];
        if (!stats) return false;
        
        const currentPhase = stats.phase || 'waiting';
        let transitioned = false;
        
        // Seeding → Ranked: minimum battles reached
        if (currentPhase === 'seeding' && stats.battles >= SEEDING_MIN_BATTLES) {
            stats.phase = 'ranked';
            transitioned = true;
            console.log(`${coasterName} moved from seeding to ranked (${stats.battles} battles)`);
        }
        
        return transitioned;
    }
    
    // Promote coasters from Waiting to Seeding (staggered batch)
    function promoteWaitingToSeeding(isInitial = false) {
        const distribution = getPhaseDistribution();
        const currentSeeding = distribution.seeding;
        
        // Only promote if below target
        if (currentSeeding >= SEEDING_TARGET_COUNT) {
            return 0;
        }
        
        // Find waiting coasters
        const waitingCoasters = Object.values(coasterStats).filter(s => s.phase === 'waiting');
        if (waitingCoasters.length === 0) {
            return 0;
        }
        
        // Calculate how many to promote
        const slotsAvailable = SEEDING_TARGET_COUNT - currentSeeding;
        // For initial load, promote full batch; otherwise staggered
        const batchSize = isInitial ? slotsAvailable : SEEDING_BATCH_SIZE;
        const toPromote = Math.min(batchSize, slotsAvailable, waitingCoasters.length);
        
        // Proper Fisher-Yates shuffle for unbiased random selection
        const shuffled = [...waitingCoasters];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Promote randomly selected coasters
        let promoted = 0;
        for (let i = 0; i < toPromote; i++) {
            shuffled[i].phase = 'seeding';
            console.log(`Promoted to Seeding: ${shuffled[i].name}`);
            promoted++;
        }
        
        return promoted;
    }
    
    // Check if any Seeding coasters graduated and backfill
    function manageSeedingPool() {
        // First check all Seeding coasters for transitions to Ranked
        const seedingCoasters = Object.values(coasterStats).filter(s => s.phase === 'seeding');
        seedingCoasters.forEach(stats => checkCoasterPhaseTransition(stats.name));
        
        // Then backfill if we're below target
        promoteWaitingToSeeding();
    }
    
    // No dormancy tracking in simplified 3-phase system
    // Glicko-2's RD naturally tracks data staleness
    
    // Reprocess all coaster phases based on current stats (for initialization or recalculation)
    function reprocessAllPhases() {
        console.log('Reprocessing all coaster phases...');
        
        Object.values(coasterStats).forEach(stats => {
            const battles = stats.battles || 0;
            
            // Coasters with no battles stay in Waiting
            if (battles === 0) {
                stats.phase = 'waiting';
            }
            // Coasters with few battles → Seeding
            else if (battles < SEEDING_MIN_BATTLES) {
                stats.phase = 'seeding';
            }
            // 5+ battles → Ranked
            else {
                stats.phase = 'ranked';
            }
        });
        
        // Ensure we maintain the target number of Seeding coasters
        const distribution = getPhaseDistribution();
        
        // Always try to fill Seeding pool to target count if we have Waiting coasters
        if (distribution.waiting > 0 && distribution.seeding < SEEDING_TARGET_COUNT) {
            console.log(`Seeding pool below target (${distribution.seeding}/${SEEDING_TARGET_COUNT}) - promoting from Waiting`);
            promoteWaitingToSeeding(true); // Promote enough to reach target
        }
        
        const finalDist = getPhaseDistribution();
        console.log('Phase reprocessing complete:', finalDist);
    }

    function saveData() {
        if (!currentUser) return;
        const statsKey = `coasterStats_${currentUser}`;
        const battlesKey = `totalBattles_${currentUser}`;
        const historyKey = `coasterHistory_${currentUser}`;
        const pairsKey = `completedPairs_${currentUser}`;
        const battleKey = `currentBattle_${currentUser}`;

        try {
            localStorage.setItem(statsKey, JSON.stringify(coasterStats));
            localStorage.setItem(battlesKey, totalBattlesCount.toString());
            localStorage.setItem(historyKey, JSON.stringify(coasterHistory));
            localStorage.setItem(pairsKey, JSON.stringify([...completedPairs]));
            // Save current battle if it exists
            if (currentBattle && currentBattle.length === 2) {
                localStorage.setItem(battleKey, JSON.stringify(currentBattle));
            } else {
                localStorage.removeItem(battleKey);
            }
        } catch (error) {
            // Handle localStorage quota exceeded
            if (error.name === 'QuotaExceededError') {
                console.error('LocalStorage quota exceeded. Consider clearing old data.');
                showToast('Storage limit reached. Some data may not be saved.', 3000);
            } else {
                console.error('Error saving data:', error);
            }
        }
        
        // persist pairing settings per-user
        try {
            const settingsKey = `pairingSettings_${currentUser}`;
            const settings = { explorationPower: EXPLORATION_POWER, eloProximityPower: RATING_PROXIMITY_POWER, pairingControlsHidden: pairingControlsHidden };
            localStorage.setItem(settingsKey, JSON.stringify(settings));
        } catch (e) {
            // ignore
        }
    }

    // Persist/load pairing settings per user
    function loadPairingSettings() {
        if (!currentUser) return;
        try {
            const settingsKey = `pairingSettings_${currentUser}`;
            const raw = localStorage.getItem(settingsKey);
            if (!raw) return applySettingsToUI();
            const s = JSON.parse(raw);
            if (s && typeof s.explorationPower === 'number') EXPLORATION_POWER = s.explorationPower;
            if (s && typeof s.eloProximityPower === 'number') RATING_PROXIMITY_POWER = s.eloProximityPower;
            if (s && typeof s.pairingControlsHidden === 'boolean') pairingControlsHidden = s.pairingControlsHidden;
        } catch (e) {
            // ignore
        }
        applySettingsToUI();
    }

    function setEloProximityPower(val) {
        const num = Number(val);
        if (isNaN(num)) return;
        RATING_PROXIMITY_POWER = num;
        const el = document.getElementById('eloProximityValue');
        if (el) el.textContent = num.toFixed(1);
        saveData();
    }

    function setExplorationPower(val) {
        const num = Number(val);
        if (isNaN(num)) return;
        EXPLORATION_POWER = num;
        const el = document.getElementById('explorationPowerValue');
        if (el) el.textContent = num.toFixed(1);
        saveData();
    }
    
    // Phase system controls
    function setSeedingGroupSize(val) {
        const num = Number(val);
        if (isNaN(num) || num < 1) return;
        const oldTarget = SEEDING_TARGET_COUNT;
        SEEDING_TARGET_COUNT = Math.round(num);
        const el = document.getElementById('seedingGroupSizeValue');
        if (el) el.textContent = SEEDING_TARGET_COUNT;
        
        // Get current distribution
        const distribution = getPhaseDistribution();
        const currentSeeding = distribution.seeding;
        
        // If new target is larger, promote more coasters from waiting
        if (SEEDING_TARGET_COUNT > currentSeeding && distribution.waiting > 0) {
            const needed = SEEDING_TARGET_COUNT - currentSeeding;
            console.log(`Seeding target increased to ${SEEDING_TARGET_COUNT} - promoting ${needed} more coasters`);
            promoteWaitingToSeeding(true);
        }
        // If new target is smaller, demote excess coasters back to waiting
        else if (SEEDING_TARGET_COUNT < currentSeeding) {
            const excess = currentSeeding - SEEDING_TARGET_COUNT;
            console.log(`Seeding target decreased to ${SEEDING_TARGET_COUNT} - demoting ${excess} coasters back to waiting`);
            
            // Get all seeding coasters sorted by least battles first (demote those with least progress)
            const seedingCoasters = Object.values(coasterStats)
                .filter(s => s.phase === 'seeding')
                .sort((a, b) => a.battles - b.battles);
            
            // Demote the excess coasters with fewest battles
            for (let i = 0; i < Math.min(excess, seedingCoasters.length); i++) {
                seedingCoasters[i].phase = 'waiting';
                console.log(`Demoted to Waiting: ${seedingCoasters[i].name} (${seedingCoasters[i].battles} battles)`);
            }
        }
        
        saveData();
        updateRanking();
    }
    
    function setSeedingMinBattles(val) {
        const num = Number(val);
        if (isNaN(num) || num < 1) return;
        const oldMinBattles = SEEDING_MIN_BATTLES;
        SEEDING_MIN_BATTLES = Math.round(num);
        const el = document.getElementById('seedingMinBattlesValue');
        if (el) el.textContent = SEEDING_MIN_BATTLES;
        
        // Reprocess all seeding coasters to check if they should graduate to ranked
        console.log(`Seeding min battles changed from ${oldMinBattles} to ${SEEDING_MIN_BATTLES} - checking phase transitions`);
        
        const seedingCoasters = Object.values(coasterStats).filter(s => s.phase === 'seeding');
        let transitioned = 0;
        seedingCoasters.forEach(stats => {
            if (checkCoasterPhaseTransition(stats.name)) {
                transitioned++;
            }
        });
        
        if (transitioned > 0) {
            console.log(`${transitioned} coaster(s) transitioned from Seeding to Ranked`);
            // Backfill seeding pool if needed
            manageSeedingPool();
        }
        
        saveData();
        updateRanking();
    }

    function setGlickoTau(val) {
        const num = Number(val);
        if (isNaN(num) || num < 0.1 || num > 2.0) return;
        GLICKO2_TAU = num;
        const el = document.getElementById('glickoTauValue');
        if (el) el.textContent = num.toFixed(2);
        console.log(`Glicko-2 TAU changed to ${num.toFixed(2)}`);
        saveData();
    }

    function setGlickoInitialRD(val) {
        const num = Number(val);
        if (isNaN(num) || num < 50 || num > 500) return;
        GLICKO2_RD_INITIAL = Math.round(num);
        const el = document.getElementById('glickoInitialRDValue');
        if (el) el.textContent = GLICKO2_RD_INITIAL;
        console.log(`Glicko-2 Initial RD changed to ${GLICKO2_RD_INITIAL}`);
        saveData();
    }

    function resetSeedingGroupSize() {
        const defaultValue = 20;
        const rangeEl = document.getElementById('seedingGroupSizeRange');
        if (rangeEl) rangeEl.value = defaultValue;
        setSeedingGroupSize(defaultValue);
    }

    function resetSeedingMinBattles() {
        const defaultValue = 5;
        const rangeEl = document.getElementById('seedingMinBattlesRange');
        if (rangeEl) rangeEl.value = defaultValue;
        setSeedingMinBattles(defaultValue);
    }

    function resetGlickoTau() {
        const defaultValue = 0.5;
        const rangeEl = document.getElementById('glickoTauRange');
        if (rangeEl) rangeEl.value = defaultValue;
        setGlickoTau(defaultValue);
    }

    function resetGlickoInitialRD() {
        const defaultValue = 350;
        const rangeEl = document.getElementById('glickoInitialRDRange');
        if (rangeEl) rangeEl.value = defaultValue;
        setGlickoInitialRD(defaultValue);
    }

    async function recalculateRanking() {
        if (!currentUser) {
            alert('Please select a user first.');
            return;
        }
        
        if (!coasterHistory || coasterHistory.length === 0) {
            alert('No battle history to recalculate!');
            return;
        }
        
        const btn = document.getElementById('recalculateRankingBtn');
        if (btn) btn.disabled = true;
        
        console.log('🔄 Recalculating rankings with current Glicko-2 parameters...');
        console.log(`TAU: ${GLICKO2_TAU}, Initial RD: ${GLICKO2_RD_INITIAL}`);
        
        try {
            // Reset all coaster stats to initial values
            Object.keys(coasterStats).forEach(name => {
                coasterStats[name].rating = GLICKO2_RATING_BASE;
                coasterStats[name].rd = GLICKO2_RD_INITIAL;
                coasterStats[name].volatility = GLICKO2_VOLATILITY_INITIAL;
                coasterStats[name].battles = 0;
                coasterStats[name].wins = 0;
                coasterStats[name].losses = 0;
            });
            
            // Replay all battles
            for (let i = 0; i < coasterHistory.length; i++) {
                const entry = coasterHistory[i];
                const winner = entry.winner;
                const loser = entry.loser || (entry.winner === entry.a ? entry.b : entry.a);
                
                const winnerStats = coasterStats[winner];
                const loserStats = coasterStats[loser];
                
                if (!winnerStats || !loserStats) continue;
                
                const glickoOutcome = calculateGlicko2(winnerStats, loserStats);
                
                winnerStats.rating = glickoOutcome.newWinnerRating;
                winnerStats.rd = glickoOutcome.newWinnerRD;
                winnerStats.volatility = glickoOutcome.newWinnerVolatility;
                winnerStats.battles++;
                winnerStats.wins++;
                
                loserStats.rating = glickoOutcome.newLoserRating;
                loserStats.rd = glickoOutcome.newLoserRD;
                loserStats.volatility = glickoOutcome.newLoserVolatility;
                loserStats.battles++;
                loserStats.losses++;
            }
            
            saveData();
            updateRanking();
            
            console.log('✅ Rankings recalculated successfully!');
            showToast('✅ Rankings recalculated with current parameters!', 2500);
        } catch (error) {
            console.error('Error recalculating rankings:', error);
            alert('An error occurred during recalculation. Check console for details.');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function applySettingsToUI() {
        // update range and label for exploration power (if still present)
        const expRange = document.getElementById('explorationPowerRange');
        const expVal = document.getElementById('explorationPowerValue');
        if (expRange) expRange.value = EXPLORATION_POWER;
        if (expVal) expVal.textContent = (Number(EXPLORATION_POWER) || 0).toFixed(1);
        
        // update range and label for elo proximity (if still present)
        const range = document.getElementById('eloProximityRange');
        const val = document.getElementById('eloProximityValue');
        if (range) range.value = RATING_PROXIMITY_POWER;
        if (val) val.textContent = (Number(RATING_PROXIMITY_POWER) || 0).toFixed(1);
        
        // update phase system controls
        const seedingGroupRange = document.getElementById('seedingGroupSizeRange');
        const seedingGroupVal = document.getElementById('seedingGroupSizeValue');
        if (seedingGroupRange) seedingGroupRange.value = SEEDING_TARGET_COUNT;
        if (seedingGroupVal) seedingGroupVal.textContent = SEEDING_TARGET_COUNT;
        
        const seedingBattlesRange = document.getElementById('seedingMinBattlesRange');
        const seedingBattlesVal = document.getElementById('seedingMinBattlesValue');
        if (seedingBattlesRange) seedingBattlesRange.value = SEEDING_MIN_BATTLES;
        if (seedingBattlesVal) seedingBattlesVal.textContent = SEEDING_MIN_BATTLES;
        
        // apply pairing controls hidden state
        const pairingDiv = document.getElementById('pairingControls');
        const toggleBtn = document.getElementById('pairingControlsToggle');
        if (pairingDiv) {
            if (pairingControlsHidden) pairingDiv.classList.add('collapsed'); else pairingDiv.classList.remove('collapsed');
        }
        if (toggleBtn) {
            if (pairingControlsHidden) {
                toggleBtn.classList.add('collapsed');
                toggleBtn.setAttribute('aria-expanded', 'false');
                toggleBtn.title = 'Toon instellingen';
            } else {
                toggleBtn.classList.remove('collapsed');
                toggleBtn.setAttribute('aria-expanded', 'true');
                toggleBtn.title = 'Verberg instellingen';
            }
        }
    }

    function togglePairingControls() {
        pairingControlsHidden = !pairingControlsHidden;
        applySettingsToUI();
        saveData();
    }

    // Developer UI settings (per-user)
    function toggleDevData() {
        // toggle state directly (do not refresh the current battle)
        devShowData = !devShowData;
        saveDevSettings();
        const btn = document.getElementById('devToggleDataBtn');
        if (btn) {
            if (devShowData) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); } else { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
        }
        renderDevData();
        // Refresh ranking to show/hide phase labels
        updateRanking();
    }

    function saveDevSettings() {
        if (!currentUser) return;
        localStorage.setItem(`devShowData_${currentUser}`, JSON.stringify(devShowData));
    }

    function loadDevSettings() {
        if (!currentUser) return;
        try {
            const raw = localStorage.getItem(`devShowData_${currentUser}`);
            devShowData = raw ? JSON.parse(raw) : false;
        } catch (e) { devShowData = false; }
        const btn = document.getElementById('devToggleDataBtn');
        if (btn) {
            if (devShowData) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); } else { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
        }
    }

    async function resetAllUserData() {
        if (!currentUser) return;
        const ok = confirm('Are you sure? This will delete rankings, history and pairing progress for the user.');
        if (!ok) return;
        
        // Reload CSV data to ensure we have the latest coasters
        await reloadCoasterCSVData();
        
        // Update coasters array for current user
        if (currentUser === 'luca') {
            coasters = coastersDataLuca;
        } else {
            coasters = coastersDataWouter;
        }
        
        coasterStats = initializeStats();
        totalBattlesCount = 0;
        coasterHistory = [];
        completedPairs = new Set();
        
        // Initialize phase system - promote 25 random coasters to Seeding
        promoteWaitingToSeeding(true);
        
        saveData();
        updateRanking();
        displayHistory();
        displayBattle();
        showToast('✅ Data reset for ' + currentUser);
    }

    // Export all user data as a downloadable JSON file
    function exportUserData() {
        if (!currentUser) {
            showToast('⚠️ Please select a user first');
            return;
        }

        try {
            // Collect all relevant data for the current user
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                user: currentUser,
                data: {
                    coasterStats: coasterStats,
                    totalBattlesCount: totalBattlesCount,
                    coasterHistory: coasterHistory,
                    completedPairs: [...completedPairs],
                    pairingSettings: {
                        explorationPower: EXPLORATION_POWER,
                        eloProximityPower: RATING_PROXIMITY_POWER,
                        pairingControlsHidden: pairingControlsHidden
                    },
                    closeBattleCounters: {
                        counter: localStorage.getItem(CR_STORAGE_COUNTER) || '0',
                        threshold: localStorage.getItem(CR_STORAGE_THRESHOLD) || '25'
                    },
                    achievements: {
                        unlocked: typeof achievementManager !== 'undefined' 
                            ? Object.fromEntries(achievementManager.unlockedAchievements)
                            : {},
                        stats: {
                            leftStreak: typeof achievementManager !== 'undefined' ? achievementManager.leftStreak : 0,
                            rightStreak: typeof achievementManager !== 'undefined' ? achievementManager.rightStreak : 0,
                            perfectMatches: typeof achievementManager !== 'undefined' ? achievementManager.perfectMatches : 0,
                            closeFights: typeof achievementManager !== 'undefined' ? achievementManager.closeFights : 0,
                            sessionBattles: typeof achievementManager !== 'undefined' ? achievementManager.sessionBattles : 0,
                            lastBattleDate: typeof achievementManager !== 'undefined' ? achievementManager.lastBattleDate : null,
                            consecutiveDays: typeof achievementManager !== 'undefined' ? achievementManager.consecutiveDays : 0,
                            dailyBattleDates: typeof achievementManager !== 'undefined' ? [...achievementManager.dailyBattleDates] : []
                        }
                    }
                }
            };

            // Convert to JSON string
            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Create a blob and download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `coaster-ranker-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Track export for achievements
            if (typeof achievementManager !== 'undefined') {
                achievementManager.recordExport();
                checkAndShowAchievements();
            }
            
            showToast(`✅ Data exported for ${currentUser}`);
        } catch (error) {
            console.error('Export failed:', error);
            showToast('❌ Export failed. Check console for details.');
        }
    }

    // Import user data from a JSON file
    function importUserData(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset the file input so the same file can be selected again
        event.target.value = '';

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // Validate the import data structure
                if (!importData.version || !importData.data) {
                    throw new Error('Invalid file format');
                }

                // Confirm import (especially if different user)
                const importUser = importData.user || 'unknown';
                const confirmMessage = currentUser 
                    ? `Import data for user "${importUser}"?\n\nThis will overwrite all current data for ${currentUser}.`
                    : `Import data for user "${importUser}"?`;
                
                if (!confirm(confirmMessage)) {
                    showToast('❌ Import cancelled');
                    return;
                }

                // If no user selected, switch to the imported user
                if (!currentUser && importUser) {
                    switchUser(importUser);
                }

                // Restore the data
                const data = importData.data;
                
                if (data.coasterStats) coasterStats = data.coasterStats;
                if (typeof data.totalBattlesCount === 'number') totalBattlesCount = data.totalBattlesCount;
                if (Array.isArray(data.coasterHistory)) coasterHistory = data.coasterHistory;
                if (Array.isArray(data.completedPairs)) completedPairs = new Set(data.completedPairs);
                
                // Restore settings
                if (data.pairingSettings) {
                    if (typeof data.pairingSettings.explorationPower === 'number') EXPLORATION_POWER = data.pairingSettings.explorationPower;
                    if (typeof data.pairingSettings.eloProximityPower === 'number') RATING_PROXIMITY_POWER = data.pairingSettings.eloProximityPower;
                    if (typeof data.pairingSettings.pairingControlsHidden === 'boolean') pairingControlsHidden = data.pairingSettings.pairingControlsHidden;
                }

                // Restore close battle counters
                if (data.closeBattleCounters) {
                    localStorage.setItem(CR_STORAGE_COUNTER, data.closeBattleCounters.counter || '0');
                    localStorage.setItem(CR_STORAGE_THRESHOLD, data.closeBattleCounters.threshold || '25');
                }

                // Restore achievements
                if (data.achievements && typeof achievementManager !== 'undefined') {
                    // Restore unlocked achievements
                    if (data.achievements.unlocked) {
                        achievementManager.unlockedAchievements = new Map(Object.entries(data.achievements.unlocked));
                    }
                    
                    // Restore achievement stats
                    if (data.achievements.stats) {
                        const stats = data.achievements.stats;
                        achievementManager.leftStreak = stats.leftStreak || 0;
                        achievementManager.rightStreak = stats.rightStreak || 0;
                        achievementManager.perfectMatches = stats.perfectMatches || 0;
                        achievementManager.closeFights = stats.closeFights || 0;
                        achievementManager.sessionBattles = stats.sessionBattles || 0;
                        achievementManager.lastBattleDate = stats.lastBattleDate || null;
                        achievementManager.consecutiveDays = stats.consecutiveDays || 0;
                        achievementManager.dailyBattleDates = new Set(stats.dailyBattleDates || []);
                    }
                    
                    achievementManager.save(currentUser);
                }

                // Save to localStorage
                saveData();
                
                // Refresh UI
                updateRanking();
                displayHistory();
                displayBattle();
                applySettingsToUI();
                updatePinsDisplay();
                
                showToast(`✅ Data imported successfully for ${importUser}`);
            } catch (error) {
                console.error('Import failed:', error);
                showToast('❌ Import failed. Invalid file or corrupted data.');
            }
        };
        
        reader.onerror = function() {
            showToast('❌ Failed to read file');
        };
        
        reader.readAsText(file);
    }

    // User menu (hamburger) toggle and outside-click handling
    function toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        const btn = document.getElementById('userMenuToggle');
        if (!menu || !btn) return;
        const open = menu.classList.toggle('open');
        menu.setAttribute('aria-hidden', (!open).toString());
        btn.setAttribute('aria-expanded', open.toString());
        if (open) {
            // attach a one-time outside click listener
            setTimeout(() => {
                document.addEventListener('click', outsideClickHandler);
            }, 0);
        } else {
            document.removeEventListener('click', outsideClickHandler);
        }
    }

    function closeUserMenu() {
        const menu = document.getElementById('userMenu');
        const btn = document.getElementById('userMenuToggle');
        if (!menu || !btn) return;
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', outsideClickHandler);
    }

    function outsideClickHandler(ev) {
        const menu = document.getElementById('userMenu');
        const btn = document.getElementById('userMenuToggle');
        if (!menu || !btn) return;
        if (!menu.contains(ev.target) && ev.target !== btn) {
            closeUserMenu();
        }
    }

    // Developer menu (bottom-left) toggle and outside-click handling
    function toggleDevMenu() {
        const menu = $id('devMenu');
        const btn = $id('devToggleBtn');
        if (!menu || !btn) return;
        const open = menu.classList.toggle('open');
        menu.setAttribute('aria-hidden', (!open).toString());
        btn.setAttribute('aria-expanded', open.toString());
        if (open) {
            document.addEventListener('click', devOutsideClickHandler);
            // sync the simulate input width when menu opens; use rAF to avoid layout thrash
            try {
                requestAnimationFrame(() => {
                    try { syncSimInputWidth(); } catch (e) {}
                    requestAnimationFrame(() => { try { syncSimInputWidth(); } catch (e) {} });
                });
            } catch (e) { /* ignore */ }
        } else {
            document.removeEventListener('click', devOutsideClickHandler);
        }
    }

    function closeDevMenu() {
        const menu = document.getElementById('devMenu');
        const btn = document.getElementById('devToggleBtn');
        if (!menu || !btn) return;
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', devOutsideClickHandler);
    }

    function devOutsideClickHandler(ev) {
        const menu = document.getElementById('devMenu');
        const btn = document.getElementById('devToggleBtn');
        if (!menu || !btn) return;
        if (!menu.contains(ev.target) && !btn.contains(ev.target)) {
            closeDevMenu();
        }
    }

    // Simulation: simulate X battles for the current user (updates ELO, history, rankings)
    async function simulateBattlesFromUI() {
        const input = document.getElementById('simulateCount');
        const btn = document.getElementById('simulateBtn');
        if (!input || !btn) return;
        const count = parseInt(input.value, 10);
        if (!currentUser) { showToast('Select a user first'); return; }
        if (isNaN(count) || count <= 0) { showToast('Enter a valid number (≥1)'); return; }
        btn.disabled = true;
        try {
            const result = await simulateBattles(count, (progress, total) => {
                const el = document.getElementById('simulateProgress');
                if (el) { el.style.display = 'block'; el.textContent = `Progress: ${progress} / ${total}`; }
            });
            showToast(`✅ Simulated: ${result} battles`);
        } catch (e) {
            showToast('Simulation error');
            console.error(e);
        } finally {
            const el = document.getElementById('simulateProgress'); if (el) el.style.display = 'none';
            btn.disabled = false;
            // refresh UI
            updateRanking();
            displayHistory();
            displayBattle();
            displayHome();
        }
    }

    async function simulateBattles(count, progressCallback) {
        if (!currentUser) throw new Error('No user selected');
        let simulated = 0;
        // process in small batches to keep UI responsive
        const batchSize = 200;
        try {
            for (let offset = 0; offset < count; offset += batchSize) {
                const end = Math.min(count, offset + batchSize);
                for (let i = offset; i < end; i++) {
                    const pair = getRandomCoasters();
                    if (!pair) {
                        // no more unique pairs available
                        return simulated;
                    }

                    // pick winner probabilistically according to current ratings (using Glicko-2)
                    const a = pair[0], b = pair[1];
                    // ensure stats exist for both coasters
                    const aStats = ensureCoasterStats(a);
                    const bStats = ensureCoasterStats(b);
                    // Calculate win probability using Glicko-2 expected score
                    const mu_a = glicko2Scale(aStats.rating);
                    const phi_a = glicko2ScaleRD(aStats.rd);
                    const mu_b = glicko2Scale(bStats.rating);
                    const phi_b = glicko2ScaleRD(bStats.rd);
                    const probA = glicko2_E(mu_a, mu_b, phi_b);
                    const rnd = (typeof rng === 'function') ? rng() : Math.random();
                    const winnerIdx = (rnd < probA) ? 0 : 1;
                    const winner = pair[winnerIdx], loser = pair[1 - winnerIdx];

                    // update stats
                    const winnerStats = ensureCoasterStats(winner);
                    const loserStats = ensureCoasterStats(loser);
                    
                    // Capture data before battle
                    const winnerRatingBefore = winnerStats.rating;
                    const loserRatingBefore = loserStats.rating;
                    const winnerRDBefore = winnerStats.rd;
                    const loserRDBefore = loserStats.rd;
                    const winnerVolatilityBefore = winnerStats.volatility;
                    const loserVolatilityBefore = loserStats.volatility;
                    const winnerRankBefore = getCoasterRank(winner.naam);
                    const loserRankBefore = getCoasterRank(loser.naam);
                    const winnerBattlesBefore = winnerStats.battles;
                    const loserBattlesBefore = loserStats.battles;
                    
                    const glickoOutcome = calculateGlicko2(winnerStats, loserStats);
                    const { newWinnerRating, newWinnerRD, newWinnerVolatility, newLoserRating, newLoserRD, newLoserVolatility } = glickoOutcome;
                    
                    // Calculate expected probabilities and potential changes
                    const mu_w = glicko2Scale(winnerRatingBefore);
                    const phi_w = glicko2ScaleRD(winnerRDBefore);
                    const mu_l = glicko2Scale(loserRatingBefore);
                    const phi_l = glicko2ScaleRD(loserRDBefore);
                    const expectedWinnerProb = glicko2_E(mu_w, mu_l, phi_l);
                    const expectedLoserProb = 1 - expectedWinnerProb;
                    const winnerPotentialGain = newWinnerRating - winnerRatingBefore;
                    const loserPotentialLoss = newLoserRating - loserRatingBefore;
                    const loserIfWinOutcome = calculateGlicko2(loserStats, winnerStats);
                    const loserPotentialGain = loserIfWinOutcome.newWinnerRating - loserRatingBefore;
                    const winnerPotentialLoss = loserIfWinOutcome.newLoserRating - winnerRatingBefore;
                    
                    winnerStats.rating = newWinnerRating; winnerStats.rd = newWinnerRD; winnerStats.volatility = newWinnerVolatility;
                    winnerStats.battles++; winnerStats.wins++;
                    loserStats.rating = newLoserRating; loserStats.rd = newLoserRD; loserStats.volatility = newLoserVolatility;
                    loserStats.battles++; loserStats.losses++;
                    totalBattlesCount++;
                    
                    // Get ranks after battle
                    const winnerRankAfter = getCoasterRank(winner.naam);
                    const loserRankAfter = getCoasterRank(loser.naam);
                    const wasCloseMatch = Math.abs(winnerRankBefore - loserRankBefore) < 3;
                    
                    // Build comprehensive battle stats
                    const battleStats = {
                        statsA: {
                            ratingBefore: (pair[0].naam === winner.naam) ? winnerRatingBefore : loserRatingBefore,
                            ratingAfter: (pair[0].naam === winner.naam) ? winnerStats.rating : loserStats.rating,
                            rdBefore: (pair[0].naam === winner.naam) ? winnerRDBefore : loserRDBefore,
                            rdAfter: (pair[0].naam === winner.naam) ? winnerStats.rd : loserStats.rd,
                            volatilityBefore: (pair[0].naam === winner.naam) ? winnerVolatilityBefore : loserVolatilityBefore,
                            volatilityAfter: (pair[0].naam === winner.naam) ? winnerStats.volatility : loserStats.volatility,
                            potentialGain: (pair[0].naam === winner.naam) ? winnerPotentialGain : loserPotentialGain,
                            potentialLoss: (pair[0].naam === winner.naam) ? winnerPotentialLoss : loserPotentialLoss,
                            rankBefore: (pair[0].naam === winner.naam) ? winnerRankBefore : loserRankBefore,
                            rankAfter: (pair[0].naam === winner.naam) ? winnerRankAfter : loserRankAfter,
                            expectedWinProbability: (pair[0].naam === winner.naam) ? expectedWinnerProb : expectedLoserProb,
                            totalBattlesBefore: (pair[0].naam === winner.naam) ? winnerBattlesBefore : loserBattlesBefore
                        },
                        statsB: {
                            ratingBefore: (pair[1].naam === winner.naam) ? winnerRatingBefore : loserRatingBefore,
                            ratingAfter: (pair[1].naam === winner.naam) ? winnerStats.rating : loserStats.rating,
                            rdBefore: (pair[1].naam === winner.naam) ? winnerRDBefore : loserRDBefore,
                            rdAfter: (pair[1].naam === winner.naam) ? winnerStats.rd : loserStats.rd,
                            volatilityBefore: (pair[1].naam === winner.naam) ? winnerVolatilityBefore : loserVolatilityBefore,
                            volatilityAfter: (pair[1].naam === winner.naam) ? winnerStats.volatility : loserStats.volatility,
                            potentialGain: (pair[1].naam === winner.naam) ? winnerPotentialGain : loserPotentialGain,
                            potentialLoss: (pair[1].naam === winner.naam) ? winnerPotentialLoss : loserPotentialLoss,
                            rankBefore: (pair[1].naam === winner.naam) ? winnerRankBefore : loserRankBefore,
                            rankAfter: (pair[1].naam === winner.naam) ? winnerRankAfter : loserRankAfter,
                            expectedWinProbability: (pair[1].naam === winner.naam) ? expectedWinnerProb : expectedLoserProb,
                            totalBattlesBefore: (pair[1].naam === winner.naam) ? winnerBattlesBefore : loserBattlesBefore
                        },
                        closeFight: wasCloseMatch
                    };

                    // record battle (keeps completedPairs) — skip immediate save to batch at the end
                    recordBattle(pair[0], pair[1], winner.naam, loser.naam, { skipSave: true, battleStats });
                    
                    // Check phase transitions for both coasters after battle
                    checkCoasterPhaseTransition(winner.naam);
                    checkCoasterPhaseTransition(loser.naam);
                    
                    // Periodically manage Seeding pool (every 10 battles to avoid overhead)
                    if (simulated % 10 === 0) {
                        manageSeedingPool();
                    }

                    simulated++;
                    if (progressCallback && (simulated % 10 === 0)) progressCallback(simulated, count);
                }
                // yield to event loop between batches
                await new Promise(r => setTimeout(r, 0));
            }
            
            // Final phase updates after all battles
            manageSeedingPool();
        } finally {
            // ensure we persist progress even if an error occurs mid-run
            try { saveData(); } catch (e) { /* ignore save errors */ }
        }
        return simulated;
    }

    // Render or remove dev-data overlays based on currentBattle and viewport
    function renderDevData() {
        const battleContainer = DOM.battleContainer || $id('battleContainer');
        if (!battleContainer) return;
        // remove existing overlays
        battleContainer.querySelectorAll('.dev-data-overlay').forEach(n => n.remove());

        if (!devShowData) return;
        if (!currentBattle || currentBattle.length < 2) return;

        // compute the same dev-html used when battle is first rendered
        const left = currentBattle[0], right = currentBattle[1];
        const leftStats = coasterStats[left.naam] || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };
        const rightStats = coasterStats[right.naam] || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };
        // compute Glicko-2 scenarios once
        const leftIfWin = calculateGlicko2(leftStats, rightStats);
        const leftIfLose = calculateGlicko2(rightStats, leftStats);
        const leftGainWin = Math.round(leftIfWin.newWinnerRating - leftStats.rating);
        const leftLoseIfLose = Math.round(leftIfLose.newLoserRating - leftStats.rating);
        const rightGainWin = Math.round(leftIfLose.newWinnerRating - rightStats.rating);
        const rightLoseIfLose = Math.round(leftIfWin.newLoserRating - rightStats.rating);
        const fmt = (n) => (n >= 0 ? '+' + n : n.toString());

        const rank1 = getCoasterRank(left.naam);
        const rank2 = getCoasterRank(right.naam);

        const leftPhase = leftStats.phase || 'waiting';
        const rightPhase = rightStats.phase || 'waiting';
        
        const devLeftHtml = `
            <div><strong>Rank:</strong> ${rank1 || '-'}</div>
            <div><strong>Phase:</strong> ${leftPhase}</div>
            <div><strong>Rating:</strong> ${Math.round(leftStats.rating)} ± ${Math.round(leftStats.rd)}</div>
            <div><strong>σ:</strong> ${leftStats.volatility.toFixed(4)}</div>
            <div><strong>Δ (win):</strong> ${fmt(leftGainWin)}</div>
            <div><strong>Δ (lose):</strong> ${fmt(leftLoseIfLose)}</div>
            <div><strong>Battles:</strong> ${leftStats.battles}</div>
            <div><strong>Wins:</strong> ${leftStats.wins}</div>
            <div><strong>Losses:</strong> ${leftStats.losses}</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.2);">
                <div id="imageInfo_${left.naam.replace(/[^a-z0-9]/gi, '_')}" style="font-size:0.85em;color:#aaa;margin-bottom:4px;"></div>
                <button onclick="retryCoasterImage('${left.naam.replace(/'/g, "\\'")}', '${left.park.replace(/'/g, "\\'")}', '${left.fabrikant.replace(/'/g, "\\'")}', '${left.naam.replace(/[^a-z0-9]/gi, '_')}', event)" style="font-size:0.85em;padding:2px 6px;background:#4CA1AF;color:white;border:none;border-radius:4px;cursor:pointer;">🔄 Retry Image</button>
            </div>
        `;
        const devRightHtml = `
            <div><strong>Rank:</strong> ${rank2 || '-'}</div>
            <div><strong>Phase:</strong> ${rightPhase}</div>
            <div><strong>Rating:</strong> ${Math.round(rightStats.rating)} ± ${Math.round(rightStats.rd)}</div>
            <div><strong>σ:</strong> ${rightStats.volatility.toFixed(4)}</div>
            <div><strong>Δ (win):</strong> ${fmt(rightGainWin)}</div>
            <div><strong>Δ (lose):</strong> ${fmt(rightLoseIfLose)}</div>
            <div><strong>Battles:</strong> ${rightStats.battles}</div>
            <div><strong>Wins:</strong> ${rightStats.wins}</div>
            <div><strong>Losses:</strong> ${rightStats.losses}</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.2);">
                <div id="imageInfo_${right.naam.replace(/[^a-z0-9]/gi, '_')}" style="font-size:0.85em;color:#aaa;margin-bottom:4px;"></div>
                <button onclick="retryCoasterImage('${right.naam.replace(/'/g, "\\'")}', '${right.park.replace(/'/g, "\\'")}', '${right.fabrikant.replace(/'/g, "\\'")}', '${right.naam.replace(/[^a-z0-9]/gi, '_')}', event)" style="font-size:0.85em;padding:2px 6px;background:#4CA1AF;color:white;border:none;border-radius:4px;cursor:pointer;">🔄 Retry Image</button>
            </div>
        `;

        // Place overlay inside image wrapper (which has overflow:visible) at the top
        const cards = battleContainer.querySelectorAll('.coaster-card, .battle-card');
        if (cards[0]) {
            const imageWrapper = cards[0].querySelector('.credit-card-image-wrapper') || cards[0].querySelector('.credit-card-image');
            if (imageWrapper) {
                const leftOverlay = document.createElement('div');
                leftOverlay.className = 'dev-data-overlay';
                leftOverlay.innerHTML = devLeftHtml;
                imageWrapper.appendChild(leftOverlay);
            }
        }
        if (cards[1]) {
            const imageWrapper = cards[1].querySelector('.credit-card-image-wrapper') || cards[1].querySelector('.credit-card-image');
            if (imageWrapper) {
                const rightOverlay = document.createElement('div');
                rightOverlay.className = 'dev-data-overlay';
                rightOverlay.innerHTML = devRightHtml;
                imageWrapper.appendChild(rightOverlay);
            }
        }
    }

    // Position dev-data boxes next to the cards (desktop) or inline (mobile)
    function positionDevData() {
        const battleContainer = DOM.battleContainer || $id('battleContainer');
        if (!battleContainer) return;
        const leftCard = battleContainer.querySelector('.coaster-card.left-card');
        const rightCard = battleContainer.querySelector('.coaster-card.right-card');
        const leftBox = battleContainer.querySelector('.dev-data-side.left');
        const rightBox = battleContainer.querySelector('.dev-data-side.right');
        if (!leftCard || !rightCard || !leftBox || !rightBox) return;

        // compute positions relative to container
        const containerRect = battleContainer.getBoundingClientRect();
        const leftRect = leftCard.getBoundingClientRect();
        const rightRect = rightCard.getBoundingClientRect();

        // left box: place to the left of the left card
        const leftTop = leftRect.top - containerRect.top + (leftRect.height - leftBox.offsetHeight) / 2;
        const leftLeft = leftRect.left - containerRect.left - leftBox.offsetWidth - 12; // 12px gap
        leftBox.style.top = Math.max(4, leftTop) + 'px';
        leftBox.style.left = leftLeft + 'px';

        // right box: place to the right of the right card
        const rightTop = rightRect.top - containerRect.top + (rightRect.height - rightBox.offsetHeight) / 2;
        const rightLeft = rightRect.right - containerRect.left + 12; // 12px gap
        rightBox.style.top = Math.max(4, rightTop) + 'px';
        rightBox.style.left = rightLeft + 'px';
    }

    // (resize handling consolidated into debounced onResize) // no-op

    // close on Escape
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { closeUserMenu(); closeDevMenu(); }
    });

    // utility to make an unordered pair key (same for [A,B] and [B,A])
    function pairKey(nameA, nameB) {
        return [nameA, nameB].sort().join('|||');
    }

    // Helper function to get the rank/position of a coaster by name
    function getCoasterRank(coasterName) {
        if (!coasterName || !coasterStats[coasterName]) return null;
        
        const stats = coasterStats[coasterName];
        const phase = stats.phase || 'waiting';
        
        // Only ranked coasters have ranks
        if (phase !== 'ranked') return null;
        
        // Filter to only ranked phase coasters
        const statsArray = Object.values(coasterStats).filter(s => (s.phase || 'waiting') === 'ranked');
        const sorted = [...statsArray].sort((a, b) => b.rating - a.rating);
        
        return sorted.findIndex(c => c.name === coasterName) + 1;
    }

    // helper: record a battle into history
    function recordBattle(a, b, winnerName, loserName, { skipSave = false, battleStats = null } = {}) {
        const key = pairKey(a.naam, b.naam);
        const entry = {
            pairKey: key,
            left: a.naam,  // Store left position
            right: b.naam, // Store right position
            a: a.naam,
            b: b.naam,
            winner: winnerName,
            loser: loserName,
            timestamp: new Date().toISOString(),
            seed: (typeof seedNumber !== 'undefined') ? seedNumber : null
        };
        
        // Add comprehensive battle stats if provided
        if (battleStats) {
            entry.statsA = battleStats.statsA;
            entry.statsB = battleStats.statsB;
            entry.closeFight = battleStats.closeFight;
        }
        
        coasterHistory.push(entry);
        
        // Mark this pair as completed
        completedPairs.add(key);

        // keep history bounded (using predefined constant)
        if (coasterHistory.length > MAX_HISTORY_KEEP) coasterHistory.splice(0, coasterHistory.length - MAX_HISTORY_KEEP);

        if (!skipSave) saveData();
    }

    // Get total possible unique pairs
    function getTotalPossiblePairs() {
        const n = coasters.length;
        return (n * (n - 1)) / 2;
    }
    
    // Get remaining pairs count
    function getRemainingPairsCount() {
        return getTotalPossiblePairs() - completedPairs.size;
    }
    
    // Check if all pairs are completed
    function areAllPairsCompleted() {
        return getRemainingPairsCount() === 0;
    }

    // Pick a pair that hasn't been completed yet
    function getPairAvoidingDuplicates({ attempts = 200 } = {}) {
                const length = coasters.length;
                if (length < 2) return [];
                
                // Check if all pairs are completed
                if (areAllPairsCompleted()) {
                    return null; // Signal that no more pairs available
                }

                const randomFn = (typeof rng === 'function') ? rng : Math.random;

                // build base weights that give higher probability to coasters with fewer battles
                const weights = new Array(length);
                for (let i = 0; i < length; i++) {
                    try {
                        const name = coasters[i].naam;
                        const stats = coasterStats && coasterStats[name] ? coasterStats[name] : null;
                        const battles = stats && typeof stats.battles === 'number' ? stats.battles : 0;
                        const phase = stats && stats.phase ? stats.phase : 'waiting';
                        
                        // Skip coasters in Waiting phase (not yet active)
                        if (phase === 'waiting') {
                            weights[i] = 0;
                            continue;
                        }
                        
                        // base exploration weight: inverse of (1 + battles) ^ EXPLORATION_POWER
                        // Cap battles at 10 for weight calculation to prevent ranked coasters from being too disadvantaged
                        const cappedBattles = Math.min(battles, 10);
                        let w = 1 / Math.pow(1 + Math.max(0, cappedBattles), EXPLORATION_POWER);
                        
                        // Apply phase-based multipliers
                        if (phase === 'seeding') {
                            // Boost Seeding coasters to ensure frequent battles until they graduate
                            w *= SEEDING_BOOST_FACTOR;
                        }
                        // Ranked coasters: no multiplier (normal frequency, Glicko-2 RD handles staleness)
                        
                        weights[i] = w;
                    } catch (e) {
                        weights[i] = 1;
                    }
                }

                // helper: sample an index from a weight array
                const sampleIndexFromWeights = (arr, rnd) => {
                    const tot = arr.reduce((s, v) => s + (isFinite(v) && v > 0 ? v : 0), 0);
                    if (!tot || !isFinite(tot) || tot <= 0) return Math.floor((rnd()) * length);
                    let r = rnd() * tot;
                    for (let k = 0; k < arr.length; k++) {
                        const val = isFinite(arr[k]) && arr[k] > 0 ? arr[k] : 0;
                        r -= val;
                        if (r <= 0) return k;
                    }
                    return arr.length - 1;
                };

                // Hybrid strategy: pick one under-sampled coaster first, then a second biased by rating-proximity
                // (still favors under-sampled ones via base weights)
                const indexFromExploration = () => sampleIndexFromWeights(weights, randomFn);
                for (let t = 0; t < attempts; t++) {
                    const i = indexFromExploration();
                    // use displayedRating (regularized) for pairing proximity calculations
                    const ratingI = (coasterStats && coasterStats[coasters[i].naam]) ? displayedRating(coasterStats[coasters[i].naam]) : GLICKO2_RATING_BASE;
                    const condWeights = new Array(length);
                    for (let k = 0; k < length; k++) {
                        if (k === i) { condWeights[k] = 0; continue; }
                        const nameK = coasters[k].naam;
                        const statsK = coasterStats && coasterStats[nameK] ? coasterStats[nameK] : null;
                        const phaseK = statsK && statsK.phase ? statsK.phase : 'waiting';
                        
                        // Skip Waiting coasters
                        if (phaseK === 'waiting') {
                            condWeights[k] = 0;
                            continue;
                        }
                        
                        const ratingK = statsK ? displayedRating(statsK) : GLICKO2_RATING_BASE;
                        const diff = Math.abs(ratingI - ratingK) / RATING_DIFF_SCALE; // normalized diff (using displayed rating)
                        const proximityFactor = 1 / Math.pow(1 + diff, RATING_PROXIMITY_POWER);
                        const base = isFinite(weights[k]) && weights[k] > 0 ? weights[k] : 1;
                        condWeights[k] = base * proximityFactor;
                    }

                    let j = sampleIndexFromWeights(condWeights, randomFn);
                    // Ensure j is different from i
                    if (j === i) {
                        let guard = 0;
                        while (j === i && guard++ < 8) j = sampleIndexFromWeights(condWeights, randomFn);
                        // If still the same, find first different index
                        if (j === i) {
                            for (let offset = 1; offset < length; offset++) {
                                j = (i + offset) % length;
                                if (j !== i) break;
                            }
                        }
                    }
                    
                    // Additional safety check: never allow same coaster in a battle
                    if (i === j) continue;

                    const a = coasters[i], b = coasters[j];
                    const key = pairKey(a.naam, b.naam);
                    if (!completedPairs.has(key)) return [a, b];
                }

                // fallback scanning approach: try to find any unseen pair deterministically
                // But only among seeding/ranked coasters (skip waiting)
                for (let i = 0; i < length; i++) {
                    const statsI = coasterStats && coasterStats[coasters[i].naam] ? coasterStats[coasters[i].naam] : null;
                    const phaseI = statsI && statsI.phase ? statsI.phase : 'waiting';
                    if (phaseI === 'waiting') continue;
                    
                    for (let j = i + 1; j < length; j++) {
                        const statsJ = coasterStats && coasterStats[coasters[j].naam] ? coasterStats[coasters[j].naam] : null;
                        const phaseJ = statsJ && statsJ.phase ? statsJ.phase : 'waiting';
                        if (phaseJ === 'waiting') continue;
                        
                        const a = coasters[i], b = coasters[j];
                        const key = pairKey(a.naam, b.naam);
                        if (!completedPairs.has(key)) {
                            if (randomFn() < 0.5) return [a, b]; else return [b, a];
                        }
                    }
                }

                // No more pairs available
                return null;
            }

    // Replace getRandomCoasters() with duplicate-avoiding wrapper
    function getRandomCoasters() {
        return getPairAvoidingDuplicates();
    }

    // ========================================
    // GLICKO-2 RATING SYSTEM IMPLEMENTATION
    // ========================================

    // Convert rating to Glicko-2 scale (μ)
    function glicko2Scale(rating) {
        return (rating - GLICKO2_RATING_BASE) / GLICKO2_SCALE_FACTOR;
    }

    // Convert Glicko-2 scale back to rating
    function glicko2Unscale(mu) {
        return mu * GLICKO2_SCALE_FACTOR + GLICKO2_RATING_BASE;
    }

    // Convert RD to Glicko-2 scale (φ)
    function glicko2ScaleRD(rd) {
        return rd / GLICKO2_SCALE_FACTOR;
    }

    // Convert Glicko-2 scale back to RD
    function glicko2UnscaleRD(phi) {
        return phi * GLICKO2_SCALE_FACTOR;
    }

    // Apply small RD increase before battle (prevents rating lock-in at high battle counts)
    // Creates natural equilibrium: more battles per coaster = lower equilibrium RD = more stability
    function applyPreBattleRDIncrease(stats) {
        if (!stats) return;
        stats.rd = Math.min(stats.rd + RD_INCREASE_PER_BATTLE, GLICKO2_RD_INITIAL);
    }

    // g(φ) function - measures impact of opponent's RD
    function glicko2_g(phi) {
        return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
    }

    // E(μ, μ_j, φ_j) - expected score against opponent
    function glicko2_E(mu, mu_j, phi_j) {
        return 1 / (1 + Math.exp(-glicko2_g(phi_j) * (mu - mu_j)));
    }

    // Calculate new Glicko-2 ratings after a match
    // Returns: { newWinnerRating, newWinnerRD, newWinnerVolatility, newLoserRating, newLoserRD, newLoserVolatility }
    function calculateGlicko2(winnerStats, loserStats) {
        // Apply small RD increase before battle (prevents rating freeze)
        applyPreBattleRDIncrease(winnerStats);
        applyPreBattleRDIncrease(loserStats);
        
        // Extract current values
        const r1 = winnerStats.rating || GLICKO2_RATING_BASE;
        const rd1 = winnerStats.rd || GLICKO2_RD_INITIAL;
        const vol1 = winnerStats.volatility || GLICKO2_VOLATILITY_INITIAL;
        
        const r2 = loserStats.rating || GLICKO2_RATING_BASE;
        const rd2 = loserStats.rd || GLICKO2_RD_INITIAL;
        const vol2 = loserStats.volatility || GLICKO2_VOLATILITY_INITIAL;

        // Convert to Glicko-2 scale
        const mu1 = glicko2Scale(r1);
        const phi1 = glicko2ScaleRD(rd1);
        const mu2 = glicko2Scale(r2);
        const phi2 = glicko2ScaleRD(rd2);

        // Calculate winner's new rating (won against loser)
        const result1 = calculateGlicko2Single(mu1, phi1, vol1, [{ mu: mu2, phi: phi2, score: 1 }]);
        
        // Calculate loser's new rating (lost against winner)
        const result2 = calculateGlicko2Single(mu2, phi2, vol2, [{ mu: mu1, phi: phi1, score: 0 }]);

        return {
            newWinnerRating: glicko2Unscale(result1.mu),
            newWinnerRD: glicko2UnscaleRD(result1.phi),
            newWinnerVolatility: result1.sigma,
            newLoserRating: glicko2Unscale(result2.mu),
            newLoserRD: glicko2UnscaleRD(result2.phi),
            newLoserVolatility: result2.sigma
        };
    }

    // Core Glicko-2 calculation for a single player against opponents
    function calculateGlicko2Single(mu, phi, sigma, opponents) {
        // Step 1: Calculate v (estimated variance)
        let v = 0;
        for (const opp of opponents) {
            const g_phi_j = glicko2_g(opp.phi);
            const E_val = glicko2_E(mu, opp.mu, opp.phi);
            v += g_phi_j * g_phi_j * E_val * (1 - E_val);
        }
        v = 1 / v;

        // Step 2: Calculate Δ (estimated improvement in rating)
        let delta = 0;
        for (const opp of opponents) {
            const g_phi_j = glicko2_g(opp.phi);
            const E_val = glicko2_E(mu, opp.mu, opp.phi);
            delta += g_phi_j * (opp.score - E_val);
        }
        delta *= v;

        // Step 3: Determine new volatility (σ')
        const sigma_new = calculateVolatility(sigma, phi, v, delta, GLICKO2_TAU);

        // Step 4: Update rating deviation to new pre-rating period value
        const phi_star = Math.sqrt(phi * phi + sigma_new * sigma_new);

        // Step 5: Update rating and RD
        const phi_new = 1 / Math.sqrt(1 / (phi_star * phi_star) + 1 / v);
        
        // Apply minimum RD floor (prevents complete rating lock-in)
        const phi_new_clamped = Math.max(phi_new, glicko2ScaleRD(GLICKO2_RD_MIN));
        
        let mu_new = mu;
        for (const opp of opponents) {
            const g_phi_j = glicko2_g(opp.phi);
            const E_val = glicko2_E(mu, opp.mu, opp.phi);
            mu_new += phi_new_clamped * phi_new_clamped * g_phi_j * (opp.score - E_val);
        }

        return {
            mu: mu_new,
            phi: phi_new_clamped,
            sigma: sigma_new
        };
    }

    // Illinois algorithm to determine new volatility
    function calculateVolatility(sigma, phi, v, delta, tau) {
        const a = Math.log(sigma * sigma);
        const delta_sq = delta * delta;
        const phi_sq = phi * phi;
        
        // Define f(x)
        const f = (x) => {
            const ex = Math.exp(x);
            const phi_sq_ex = phi_sq + v + ex;
            const term1 = ex * (delta_sq - phi_sq - v - ex) / (2 * phi_sq_ex * phi_sq_ex);
            const term2 = (x - a) / (tau * tau);
            return term1 - term2;
        };

        // Initial values
        let A = a;
        let B;
        
        if (delta_sq > phi_sq + v) {
            B = Math.log(delta_sq - phi_sq - v);
        } else {
            let k = 1;
            while (f(a - k * tau) < 0) {
                k++;
            }
            B = a - k * tau;
        }

        let fA = f(A);
        let fB = f(B);

        // Iterate using Illinois algorithm
        while (Math.abs(B - A) > GLICKO2_EPSILON) {
            const C = A + (A - B) * fA / (fB - fA);
            const fC = f(C);

            if (fC * fB < 0) {
                A = B;
                fA = fB;
            } else {
                fA = fA / 2;
            }

            B = C;
            fB = fC;
        }

        return Math.exp(A / 2);
    }

    // Displayed rating with Bayesian-like shrinkage towards population mean (for ranking display)
    function displayedRating(stats) {
        if (!stats) return GLICKO2_RATING_BASE;
        const n = stats.battles || 0;
        if (n === 0) return GLICKO2_RATING_BASE;
        return (stats.rating * n + GLICKO2_RATING_BASE * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);
    }

    // ========================================
    // END GLICKO-2 RATING SYSTEM
    // ========================================

    // Ensure a coaster has an entry in `coasterStats`. Returns the stats object.
    function ensureCoasterStats(coaster) {
        if (!coaster || !coaster.naam) return null;
        const name = coaster.naam;
        if (!coasterStats[name]) {
            coasterStats[name] = {
                name: name,
                park: coaster.park || (coaster.park === undefined ? '' : coaster.park),
                manufacturer: coaster.fabrikant || coaster.manufacturer || '',
                rating: GLICKO2_RATING_BASE,
                rd: GLICKO2_RD_INITIAL,
                volatility: GLICKO2_VOLATILITY_INITIAL,
                battles: 0,
                wins: 0,
                losses: 0,
                firstBattleDate: null
            };
        }
        return coasterStats[name];
    }

    /* ===== Close-battle system =====
       - Rare epic overlay when two coasters are within 3 ranking spots
       - Only for coasters with more than 3 battles
       - Rare trigger once every 25-50 battles (per localStorage)
       - If adjacent and triggered, force a visible swap in ranking
    */
    function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    
    function initCloseBattleSystem(){
        if (localStorage.getItem(CR_STORAGE_COUNTER)===null) localStorage.setItem(CR_STORAGE_COUNTER,'0');
        if (localStorage.getItem(CR_STORAGE_THRESHOLD)===null) localStorage.setItem(CR_STORAGE_THRESHOLD,String(randInt(25,50)));
    }

    // Developer override: force the next matchup to be treated as a close battle (one-time)
    let devForceCloseBattle = false;

    // Find a random eligible close matchup (both >3 battles and rank difference <3)
    function findCloseMatchup() {
        const statsArray = Object.values(coasterStats || {});
        if (!statsArray || statsArray.length < 2) return null;
        // compute sorted ranks by displayedRating
        const sorted = [...statsArray].sort((a,b) => displayedRating(b) - displayedRating(a));
        const nameToRank = {};
        sorted.forEach((s, idx) => { nameToRank[s.name] = idx + 1; });

        // build eligible pairs
        const eligible = [];
        for (let i = 0; i < sorted.length; i++){
            for (let j = i+1; j < sorted.length; j++){
                const a = sorted[i], b = sorted[j];
                if ((a.battles||0) <= 3 || (b.battles||0) <= 3) continue;
                const diff = Math.abs(nameToRank[a.name] - nameToRank[b.name]);
                if (diff < 3) eligible.push([a, b]);
            }
        }
        if (eligible.length === 0) return null;
        const idx = Math.floor(Math.random() * eligible.length);
        // return original coaster objects from coasters array (to preserve .naam keys)
        const pick = eligible[idx];
        // try to map back to full coaster objects in `coasters`
        const aObj = coasters.find(c => (c.naam || c.name) === pick[0].name) || pick[0];
        const bObj = coasters.find(c => (c.naam || c.name) === pick[1].name) || pick[1];
        return [aObj, bObj];
    }

    // Dev action: set up a close fight for the next displayed battle
    function forceNextCloseFight(){
        if (!currentUser) { showToast('Select a user first'); return; }
        const pair = findCloseMatchup();
        if (!pair) { showToast('No suitable close matchup available'); return; }
        // set dev flag so triggerCloseBattleIfNeeded triggers the epic one-time
        devForceCloseBattle = true;
        // set currentBattle to the pair and re-render
        currentBattle = pair;
        displayBattle();
        showToast('Close fight forced — choose winner');
    }

    function subtleCloseFlourish(a,b,winnerId){
        return new Promise((res)=>{
            try{
                const overlay = document.getElementById('closeBattleOverlay');
                const leftName = document.getElementById('cLeftName');
                const rightName = document.getElementById('cRightName');
                leftName.textContent = getCoasterName(a);
                rightName.textContent = getCoasterName(b);
                overlay.classList.add('show');
                // stronger celebratory burst for close fights (longer)
                const winnerBurst = document.getElementById('winnerBurst');
                winnerBurst.classList.add('show');
                // add slight scale/pop on winner text for effect
                const winnerText = document.getElementById('winnerText');
                winnerText.style.transform = 'scale(0.95)';
                setTimeout(()=>{ winnerText.style.transform = 'scale(1.12)'; }, 80);
                setTimeout(()=>{ winnerText.style.transform = ''; winnerBurst.classList.remove('show'); overlay.classList.remove('show'); res(); }, 1200);
            }catch(e){ res(); }
        });
    }

    function epicCloseBattleSequence(a,b, rankA, rankB, winnerId){
        return new Promise((resolve)=>{
            const overlay = document.getElementById('closeBattleOverlay');
            const leftName = document.getElementById('cLeftName');
            const rightName = document.getElementById('cRightName');
            const cLeft = document.getElementById('cLeft');
            const cRight = document.getElementById('cRight');
            const winnerBurst = document.getElementById('winnerBurst');
            const winnerText = document.getElementById('winnerText');

            leftName.textContent = getCoasterName(a);
            rightName.textContent = getCoasterName(b);
            overlay.classList.add('show');

            cLeft.classList.remove('win','lose');
            cRight.classList.remove('win','lose');
            winnerBurst.classList.remove('show');

            setTimeout(()=>{
                const leftIsWinner = (winnerId === getCoasterId(a));
                if (leftIsWinner){ cLeft.classList.add('win'); cRight.classList.add('lose'); winnerText.textContent = `${getCoasterName(a)} wins!`; }
                else { cRight.classList.add('win'); cLeft.classList.add('lose'); winnerText.textContent = `${getCoasterName(b)} wins!`; }
                winnerBurst.classList.add('show');

                const CELEBRATE_MS = 1600;
                setTimeout(()=>{
                    winnerBurst.classList.remove('show');
                    overlay.classList.remove('show');
                    const diff = Math.abs(rankA - rankB);
                    const forcedSwap = diff === 1; // adjacent -> force swap
                    resolve(forcedSwap);
                }, CELEBRATE_MS);
            }, 420);
        });
    }

    // Show an intro animation/banner when a close fight appears
    function showCloseIntro(a,b){
        return new Promise((resolve)=>{
            try{
                // mark intro active so other flows don't re-trigger it
                closeIntroActive = true;
                // temporarily block choices to ensure user notices
                const prevProcessing = isProcessingChoice;
                isProcessingChoice = true;

                const overlay = document.getElementById('closeBattleOverlay');
                const banner = document.getElementById('closeBanner');
                const cards = document.querySelectorAll('.coaster-card, .battle-card, .credit-card-outer');
                const battleContainerEl = DOM.battleContainer || document.getElementById('battleContainer');
                // bring cards above overlay during intro
                const prevZ = battleContainerEl && battleContainerEl.style ? battleContainerEl.style.zIndex : null;
                if (battleContainerEl) battleContainerEl.style.zIndex = 10030;
                // ensure any forced inline hiding is removed so the overlay can appear
                try {
                    if (overlay) {
                        overlay.style.removeProperty('display');
                        overlay.style.removeProperty('opacity');
                        overlay.style.removeProperty('z-index');
                        overlay.removeAttribute('aria-hidden');
                    }
                    if (banner) {
                        banner.style.removeProperty('display');
                        banner.removeAttribute('aria-hidden');
                    }
                } catch (e) {}
                // set overlay to a visible intro state
                overlay.classList.add('show');
                banner.classList.add('show');
                // highlight the two cards
                if (cards[0]) { cards[0].classList.add('close-highlight'); cards[0].classList.add('close-hidden'); }
                if (cards[1]) { cards[1].classList.add('close-highlight'); cards[1].classList.add('close-hidden'); }

                // small attention animation on VS marker; hide the original VS while overlay shows its own
                const vs = document.querySelector('.vs-divider');
                try{
                    if (vs) {
                        closeIntroPrevVSDisplay = (vs.style && vs.style.display) ? vs.style.display : '';
                        vs.style.setProperty('display','none','important');
                        vs.setAttribute('data-cr-hidden','true');
                        vs.animate([
                            { transform: 'scale(1)', offset: 0 },
                            { transform: 'scale(1.12)', offset: 0.5 },
                            { transform: 'scale(1)', offset: 1 }
                        ], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1)' });
                    }
                }catch(e){}

                // play intro for a bit longer, then reveal cards one by one
                const BANNER_MS = 2200; // slower intro
                setTimeout(()=>{
                    // reveal left then right with a small stagger
                    if (cards[0]) {
                        cards[0].classList.remove('close-hidden');
                        cards[0].classList.add('revealed');
                        cards[0].classList.add('pop');
                        setTimeout(()=>{ cards[0].classList.remove('pop'); }, 700);
                    }
                    setTimeout(()=>{
                        if (cards[1]) { cards[1].classList.remove('close-hidden'); cards[1].classList.add('revealed'); cards[1].classList.add('pop'); setTimeout(()=>{ cards[1].classList.remove('pop'); }, 700); }
                        // hide banner and overlay after a short pause so cards are visible
                        setTimeout(()=>{
                            banner.classList.remove('show');
                                overlay.classList.remove('show');
                                if (cards[0]) cards[0].classList.remove('close-highlight');
                                if (cards[1]) cards[1].classList.remove('close-highlight');
                                // restore battle container z-index
                                if (battleContainerEl) battleContainerEl.style.zIndex = prevZ || '';
                                isProcessingChoice = prevProcessing;
                                // mark intro finished
                                closeIntroActive = false;
                                // restore original VS marker display if we saved it
                                try {
                                    if (vs) {
                                        if (closeIntroPrevVSDisplay !== null && closeIntroPrevVSDisplay !== '') vs.style.display = closeIntroPrevVSDisplay; else vs.style.removeProperty('display');
                                        vs.removeAttribute('data-cr-hidden');
                                        closeIntroPrevVSDisplay = null;
                                    }
                                } catch(e) {}
                                resolve();
                        }, 800);
                    }, 520);
                }, BANNER_MS);
            }catch(e){ isProcessingChoice = false; resolve(); }
        });
    }

    // Celebrate a winner by animating the existing card in-place and spawning confetti
    function celebrateWinner(cardEl, winnerName){
        return new Promise((resolve)=>{
            try {
                if (!cardEl) return resolve();

                const overlayEl = document.getElementById('closeBattleOverlay');
                const bannerEl = document.getElementById('closeBanner');
                const winnerBurst = document.getElementById('winnerBurst');
                const prev = {};
                
                if (overlayEl) {
                    prev.overlayDisplay = overlayEl.style.display;
                    prev.overlayOpacity = overlayEl.style.opacity;
                    prev.overlayZ = overlayEl.style.zIndex;
                    overlayEl.classList.remove('show');
                    overlayEl.style.setProperty('display', 'none', 'important');
                    overlayEl.style.setProperty('opacity', '0', 'important');
                    overlayEl.style.zIndex = '';
                    overlayEl.setAttribute('aria-hidden', 'true');
                }
                if (bannerEl) bannerEl.classList.remove('show');
                if (winnerBurst) winnerBurst.classList.remove('show','big');
                cardEl._closeOverlayPrev = prev;

                cardEl.classList.add('celebrate-in-place');

                const rect = cardEl.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 3;

                const colors = ['#ff3f6e','#ffd86b','#6ee7b7','#7dd3fc','#c084fc','#ffc4d6','#ffb86b'];
                const confettiCount = 36;
                const confettiEls = [];
                
                for (let i = 0; i < confettiCount; i++){
                    const c = document.createElement('div');
                    c.className = 'confetti-piece';
                    const size = 6 + Math.floor(Math.random()*12);
                    c.style.width = size + 'px';
                    c.style.height = Math.floor(size*1.2) + 'px';
                    c.style.left = (cx + (Math.random()*rect.width - rect.width/2)) + 'px';
                    c.style.top = (cy + (Math.random()*rect.height/2 - rect.height/4)) + 'px';
                    c.style.background = colors[Math.floor(Math.random()*colors.length)];
                    c.style.transform = `translateY(-6px) rotate(${Math.random()*360}deg)`;
                    c.style.animationDuration = (900 + Math.floor(Math.random()*900)) + 'ms';
                    document.body.appendChild(c);
                    confettiEls.push(c);
                }

                const winnerText = document.getElementById('winnerText');
                if (winnerText) winnerText.textContent = `${winnerName} WINS!`;
                if (winnerBurst) winnerBurst.classList.add('show','big');

                setTimeout(()=>{
                    try{
                        if (winnerBurst) winnerBurst.classList.remove('show','big');
                        confettiEls.forEach(c => c.remove());
                        cardEl.classList.remove('celebrate-in-place');
                        
                        const prev = cardEl._closeOverlayPrev;
                        const overlayEl = document.getElementById('closeBattleOverlay');
                        if (prev && overlayEl) {
                            if (prev.overlayDisplay) overlayEl.style.display = prev.overlayDisplay; 
                            else overlayEl.style.removeProperty('display');
                            if (prev.overlayOpacity) overlayEl.style.opacity = prev.overlayOpacity; 
                            else overlayEl.style.removeProperty('opacity');
                            if (prev.overlayZ) overlayEl.style.zIndex = prev.overlayZ; 
                            else overlayEl.style.removeProperty('z-index');
                            overlayEl.removeAttribute('aria-hidden');
                            delete cardEl._closeOverlayPrev;
                        }
                        try { restoreVsDivider(); } catch(e) {}
                    }catch(e){}
                    resolve();
                }, 800);
            } catch(e) { 
                resolve(); 
            }
        });
    }

    function triggerCloseBattleIfNeeded(coasterA, coasterB, rankA, rankB, winnerId){
        return new Promise((resolve)=>{
            // require >3 battles each
            const aStats = coasterStats[(coasterA.naam || coasterA.name)];
            const bStats = coasterStats[(coasterB.naam || coasterB.name)];
            if (!aStats || !bStats) return resolve({triggered:false, forcedSwap:false});
            if ((aStats.battles||0) <= 3 || (bStats.battles||0) <= 3) return resolve({triggered:false, forcedSwap:false});

            const diff = Math.abs(rankA - rankB);
            if (!(diff < 3)) return resolve({triggered:false, forcedSwap:false});

            // If we're currently resolving a winner choice, don't trigger the intro
            if (resolvingBattle) {
                // ensure any visible overlay is hidden and don't trigger epic
                try { cancelCloseIntro(); } catch(e){}
                return resolve({triggered:false, forcedSwap:false});
            }

            // dev override: if developer forced a close battle, trigger epic once
            if (typeof devForceCloseBattle !== 'undefined' && devForceCloseBattle) {
                devForceCloseBattle = false; // one-time
                // reset stored counters so rarity doesn't immediately retrigger
                localStorage.setItem(CR_STORAGE_COUNTER,'0');
                localStorage.setItem(CR_STORAGE_THRESHOLD,String(randInt(25,50)));
                epicCloseBattleSequence(coasterA, coasterB, rankA, rankB, winnerId).then((forcedSwap)=>{
                    resolve({triggered:true, forcedSwap: !!forcedSwap});
                });
                return;
            }

            // If the intro is already active or the overlay is visible, treat the epic as already shown
            try {
                const overlayCheck = document.getElementById('closeBattleOverlay');
                if (closeIntroActive || (overlayCheck && overlayCheck.classList.contains('show'))) {
                    // reset counter/threshold as if epic triggered
                    localStorage.setItem(CR_STORAGE_COUNTER,'0');
                    localStorage.setItem(CR_STORAGE_THRESHOLD,String(randInt(25,50)));
                    const forcedSwap = diff === 1;
                    return resolve({triggered:true, forcedSwap: !!forcedSwap});
                }
            } catch (e) { /* ignore */ }

            let counter = Number(localStorage.getItem(CR_STORAGE_COUNTER) || 0);
            let threshold = Number(localStorage.getItem(CR_STORAGE_THRESHOLD) || randInt(25,50));
            counter++;
            localStorage.setItem(CR_STORAGE_COUNTER, String(counter));

            const shouldTrigger = counter >= threshold;
            if (!shouldTrigger){
                return subtleCloseFlourish(coasterA, coasterB, winnerId).then(()=> resolve({triggered:false, forcedSwap:false}));
            }

            // reset counter and set new threshold
            localStorage.setItem(CR_STORAGE_COUNTER,'0');
            localStorage.setItem(CR_STORAGE_THRESHOLD,String(randInt(25,50)));

            // Show the intro overlay first, then the epic sequence
            showCloseIntro(coasterA, coasterB).then(() => {
                epicCloseBattleSequence(coasterA, coasterB, rankA, rankB, winnerId).then((forcedSwap)=>{
                    resolve({triggered:true, forcedSwap: !!forcedSwap});
                });
            }).catch(() => {
                // If intro fails, still show epic sequence
                epicCloseBattleSequence(coasterA, coasterB, rankA, rankB, winnerId).then((forcedSwap)=>{
                    resolve({triggered:true, forcedSwap: !!forcedSwap});
                });
            });
        });
    }

    function animateSwapInRanking(idA, idB){
        try{
            const rowA = document.querySelector(`#rankingBody tr[data-id="${idA}"]`);
            const rowB = document.querySelector(`#rankingBody tr[data-id="${idB}"]`);
            if (!rowA || !rowB) return;
            rowA.classList.add('cr-swap-animate'); rowB.classList.add('cr-swap-animate');
            setTimeout(()=>{ rowA.classList.remove('cr-swap-animate'); rowB.classList.remove('cr-swap-animate'); }, 900);
            const parent = rowA.parentNode;
            if (parent && rowA && rowB){
                const next = rowA.nextElementSibling === rowB ? rowB.nextElementSibling : rowA.nextElementSibling;
                parent.insertBefore(rowB, rowA);
                if (next) parent.insertBefore(rowA, next);
            }
        }catch(e){ console.warn('animateSwapInRanking failed',e); }
    }

    // initialize storage counters
    initCloseBattleSystem();

    async function displayBattle() {
        // Reset resolving state and hide any overlays from previous battles
        resolvingBattle = false;
        try {
            cancelCloseIntro();
            const overlay = document.getElementById('closeBattleOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                overlay.style.display = 'none';
            }
        } catch (e) { /* ignore */ }
        
        const battleContainerEl = DOM.battleContainer;
        // If no user selected, skip display
        if (!currentUser) {
            try { if (battleContainerEl) battleContainerEl.style.display = 'none'; } catch (e) {}
            currentBattle = null;
            return;
        }

        // if there aren't enough active coasters, show a helpful message
        if (!coasters || coasters.length < 2) {
            (DOM.battleContainer || $id('battleContainer')).innerHTML = '<div class="no-battles">No active coasters found for this user. Check your CSV or the "operational" column.</div>';
            currentBattle = null;
            return;
        }

        // If developer forced a close battle and `currentBattle` is already set, don't overwrite it.
        // Also check if we have a saved battle from previous session/tab switch
        let needNewBattle = false;
        
        if (!currentBattle || (!devForceCloseBattle && currentBattle.length !== 2)) {
            needNewBattle = true;
        } else if (currentBattle.length === 2) {
            // Validate that the saved battle hasn't already been completed
            const key = pairKey(currentBattle[0].naam, currentBattle[1].naam);
            if (completedPairs.has(key)) {
                needNewBattle = true;
            }
        }
        
        if (needNewBattle) {
            // Use pre-cached battle if available for instant display
            if (nextBattlePreloaded && nextBattlePreloaded.length === 2) {
                currentBattle = nextBattlePreloaded;
                nextBattlePreloaded = null; // Clear cache after use
            } else {
                currentBattle = getRandomCoasters();
            }
            console.log('Generated new battle');
        }
        const battleContainer = DOM.battleContainer || $id('battleContainer');
        
        // Save the battle for persistence
        saveData();
        
        // Check if no more pairs available
        if (!currentBattle || currentBattle.length === 0) {
            battleContainer.innerHTML = '<div class="no-battles">🎉 Congratulations!<br><br>You have completed all possible matchups!<br><br>Check the ranking tab to see your final list.</div>';
            return;
        }

        try { if (battleContainerEl) battleContainerEl.style.display = ''; } catch (e) {}
        
        // Get current rankings for both coasters (only ranked coasters have ranks)
        const rank1 = getCoasterRank(currentBattle[0].naam);
        const rank2 = getCoasterRank(currentBattle[1].naam);
        
        // dev data calculations
        const left = currentBattle[0], right = currentBattle[1];
        const leftStats = coasterStats[left.naam] || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };
        const rightStats = coasterStats[right.naam] || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };
        // compute Glicko-2 scenarios once
        const leftIfWin = calculateGlicko2(leftStats, rightStats);
        const leftIfLose = calculateGlicko2(rightStats, leftStats);
        const leftGainWin = Math.round(leftIfWin.newWinnerRating - leftStats.rating);
        const leftLoseIfLose = Math.round(leftIfLose.newLoserRating - leftStats.rating);
        const rightGainWin = Math.round(leftIfLose.newWinnerRating - rightStats.rating);
        const rightLoseIfLose = Math.round(leftIfWin.newLoserRating - rightStats.rating);
        const fmt = (n) => (n >= 0 ? '+' + n : n.toString());
        
        const devLeftHtml = `
            <div><strong>Rank:</strong> ${rank1}</div>
            <div><strong>Rating:</strong> ${Math.round(leftStats.rating)} ± ${Math.round(leftStats.rd)}</div>
            <div><strong>Δ (win):</strong> ${fmt(leftGainWin)}</div>
            <div><strong>Δ (lose):</strong> ${fmt(leftLoseIfLose)}</div>
            <div><strong>Battles:</strong> ${leftStats.battles}</div>
            <div><strong>Wins:</strong> ${leftStats.wins}</div>
            <div><strong>Losses:</strong> ${leftStats.losses}</div>
        `;
        const devRightHtml = `
            <div><strong>Rank:</strong> ${rank2}</div>
            <div><strong>Rating:</strong> ${Math.round(rightStats.rating)} ± ${Math.round(rightStats.rd)}</div>
            <div><strong>Δ (win):</strong> ${fmt(rightGainWin)}</div>
            <div><strong>Δ (lose):</strong> ${fmt(rightLoseIfLose)}</div>
            <div><strong>Battles:</strong> ${rightStats.battles}</div>
            <div><strong>Wins:</strong> ${rightStats.wins}</div>
            <div><strong>Losses:</strong> ${rightStats.losses}</div>
        `;
        
        // Check for matching park or manufacturer
        const matchingPark = left.park && right.park && left.park.toLowerCase() === right.park.toLowerCase();
        const matchingFabrikant = left.fabrikant && right.fabrikant && left.fabrikant.toLowerCase() === right.fabrikant.toLowerCase();
        const parkClass = matchingPark ? 'match-highlight' : '';
        const fabrikantClass = matchingFabrikant ? 'match-highlight' : '';
        
        // Load images first and wait for them to be ready
        const leftImageUrl = getCoasterImageSync(left);
        const rightImageUrl = getCoasterImageSync(right);
        
        // Preload both images to ensure they're ready before rendering
        await Promise.all([
            preloadImage(leftImageUrl),
            preloadImage(rightImageUrl)
        ]);
        
        // Start background preloading for next battles immediately (no delay)
        preloadNextBattles();
        
        // ===== CLOSE FIGHT CHECK - SINGLE SOURCE OF TRUTH =====
        // Check if this is a close fight (used for banner, intro, points, achievements, celebration)
        // Both coasters must have 3+ battles AND be in ranked phase for a close fight to be valid
        const leftStatsForCheck = coasterStats[left.naam] || { battles: 0, phase: 'waiting' };
        const rightStatsForCheck = coasterStats[right.naam] || { battles: 0, phase: 'waiting' };
        const leftPhase = leftStatsForCheck.phase || 'waiting';
        const rightPhase = rightStatsForCheck.phase || 'waiting';
        const isCloseFight = (
            (Math.abs(rank1 - rank2) <= 3) && 
            (leftStatsForCheck.battles >= 3) && 
            (rightStatsForCheck.battles >= 3) &&
            (leftPhase === 'ranked') &&
            (rightPhase === 'ranked')
        );
        
        // Helper function to generate credit card for battle
        const generateBattleCard = (coaster, imageUrl, rank, choice) => {
            const bgColor = manufacturerColors[coaster.fabrikant] || manufacturerColors['Unknown'];
            const borderColors = {
                'B&M': '#A8AAAC', 'Bolliger & Mabillard': '#A8AAAC',
                'Intamin': '#C42424', 'Vekoma': '#D97316', 'Mack Rides': '#2563EB',
                'Gerstlauer': '#3D7A47', 'RMC': '#7A4A1F', 'Rocky Mountain Construction': '#7A4A1F',
                'GCI': '#D9A616', 'Great Coasters International': '#D9A616',
                'Maurer Rides': '#6F3FA8', 'S&S': '#B8A471', 'Zamperla': '#C45A85',
                'Zierer': '#2E9494', 'Schwarzkopf': '#9F9A8F', 'Other': '#827D78', 'Unknown': '#827D78'
            };
            const borderColor = borderColors[coaster.fabrikant] || borderColors['Unknown'];
            
            // Check phase - only show rank for 'ranked' phase, show ? for 'seeding'
            const stats = coasterStats[coaster.naam] || {};
            const phase = stats.phase || 'waiting';
            const battles = stats.battles || 0;
            let rankDisplay = rank;
            let rankClass = 'rank-other';
            
            // Check if this is the first battle (0 battles)
            const isFirstBattle = (battles === 0);
            
            if (phase === 'seeding') {
                rankDisplay = '?';
                rankClass = 'rank-other';
            } else if (phase === 'ranked') {
                rankDisplay = rank;
                if (rank === 1) rankClass = 'rank-gold';
                else if (rank === 2) rankClass = 'rank-silver';
                else if (rank === 3) rankClass = 'rank-bronze';
            } else {
                // waiting or unknown phase - don't show rank
                rankDisplay = '-';
                rankClass = 'rank-other';
            }
            
            const displaySpeed = coaster.max_speed_kmh || '-';
            const displayHeight = coaster.track_height_m || '-';
            const displayLength = coaster.track_length_m || '-';
            const displayInversions = (coaster.inversions !== undefined && coaster.inversions !== null) ? coaster.inversions : '-';
            
            let locationLine = coaster.park || '';
            if (coaster.country) locationLine += (locationLine ? ' - ' : '') + coaster.country;
            if (coaster.opening_date) locationLine += (locationLine ? ' - ' : '') + coaster.opening_date;
            
            let manuLine = coaster.fabrikant || '';
            if (coaster.coaster_build) manuLine += (manuLine ? ' - ' : '') + coaster.coaster_build;
            if (coaster.coaster_model) manuLine += (manuLine ? ' - ' : '') + coaster.coaster_model;
            
            return `
                <div class="credit-card-outer" style="border: 6px solid ${bgColor};">
                    <div class="credit-card battle-card" style="background-color: ${bgColor}; border: 9px solid ${borderColor};" data-choice="${choice}">
                        <div class="credit-card-image" style="border-color: ${borderColor};">
                            <img src="${imageUrl}" alt="${escapeHtml(coaster.naam)}" class="credit-card-img" />
                            <div class="credit-rank-badge ${rankClass}">${rankDisplay}</div>
                            ${isFirstBattle ? '<div class="first-battle-badge">🆕 First Battle!</div>' : ''}
                        </div>
                        <div class="credit-card-info">
                            <h1 class="credit-card-name">${escapeHtml(coaster.naam)}${coaster.operatief === 0 ? '<span class="defunct-marker">†</span>' : ''}</h1>
                            <div class="credit-card-divider"></div>
                            <p class="credit-card-location">${escapeHtml(locationLine)}</p>
                            <p class="credit-card-meta">${escapeHtml(manuLine)}</p>
                            <div class="credit-card-divider"></div>
                        </div>
                        <div class="credit-card-stats">
                            <div class="credit-stat">
                                <div class="credit-stat-label">speed</div>
                                <div class="credit-stat-value">${displaySpeed}${displaySpeed !== '-' ? 'km/h' : ''}</div>
                            </div>
                            <div class="credit-stat">
                                <div class="credit-stat-label">height</div>
                                <div class="credit-stat-value">${displayHeight}${displayHeight !== '-' ? 'm' : ''}</div>
                            </div>
                            <div class="credit-stat">
                                <div class="credit-stat-label">length</div>
                                <div class="credit-stat-value">${displayLength}${displayLength !== '-' ? 'm' : ''}</div>
                            </div>
                            <div class="credit-stat">
                                <div class="credit-stat-label">inversions</div>
                                <div class="credit-stat-value">${displayInversions}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };
        
        // Render cards with images already loaded
        battleContainer.innerHTML = `
            ${isCloseFight ? '<div class="close-fight-banner">⚔️ CLOSE FIGHT ⚔️</div>' : ''}
            <div class="coaster-item">
                ${generateBattleCard(left, leftImageUrl, rank1, 0)}
            </div>
            <div class="coaster-item">
                ${generateBattleCard(right, rightImageUrl, rank2, 1)}
            </div>
        `;
        
        // Add click handlers AFTER rendering (gives better control over event propagation)
        const coasterCards = battleContainer.querySelectorAll('.battle-card');
        coasterCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // STRICT CHECK: Do NOT trigger if clicking inside dev-data overlay
                const clickedOverlay = e.target.classList.contains('dev-data-overlay') || e.target.closest('.dev-data-overlay');
                if (clickedOverlay) {
                    return; // Do nothing
                }
                
                const choice = parseInt(card.getAttribute('data-choice'));
                chooseWinner(choice);
            });
        });

        // ===== CLOSE FIGHT INTRO ANIMATION =====
        // If this matchup is a close fight, play the intro animation
        // If dev forced a close battle, show intro immediately (before cards are visible)
        if (devForceCloseBattle) {
            try { if (closeIntroTimeout) { clearTimeout(closeIntroTimeout); closeIntroTimeout = null; } } catch (e) {}
            // Trigger intro immediately with no delay
            showCloseIntro(left, right).catch(()=>{});
        } else if (isCloseFight) {
            // Always show the full intro sequence for close fights
            try { if (closeIntroTimeout) { clearTimeout(closeIntroTimeout); closeIntroTimeout = null; } } catch (e) {}
            closeIntroTimeout = setTimeout(() => { closeIntroTimeout = null; showCloseIntro(left, right).catch(()=>{}); }, 60);
        }

        // Delegate overlay rendering to a dedicated function so we can update without reselecting the pair
        renderDevData();
        // sync input width after cards are rendered
        setTimeout(syncSimInputWidth, 0);
    }

    // Explicitly hide/show the battle UI (cards). Use this from tab switching
    function setBattleVisibility(visible) {
        const battleContainerEl = DOM.battleContainer || document.getElementById('battleContainer');
        if (!battleContainerEl) return;
        try {
            battleContainerEl.style.display = visible ? '' : 'none';
        } catch (e) {
            console.warn('Error setting battle visibility:', e);
        }
    }

    function chooseWinner(index) {
        if (!currentUser) return;
        if (isProcessingChoice) return; // Prevent double-clicking
        isProcessingChoice = true;

        // Mark we're resolving so intros won't re-run and cancel any pending/active intro immediately
        resolvingBattle = true;
        try { cancelCloseIntro(); } catch (e) { /* ignore */ }

        const winner = currentBattle[index];
        const loser = currentBattle[1 - index];

        // ranking helper (cache sorted array for efficiency)
        const statsArray = Object.values(coasterStats);
        const sortedStats = [...statsArray].sort((a, b) => b.rating - a.rating);
        const getRanking = (coasterName) => {
            return sortedStats.findIndex(c => c.name === coasterName) + 1;
        };

        const oldWinnerRank = getRanking(winner.naam);
        const oldLoserRank = getRanking(loser.naam);

        // ensure stats exist
        const winnerStats = ensureCoasterStats(winner) || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };
        const loserStats = ensureCoasterStats(loser) || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };

        // Capture rating values BEFORE battle
        const winnerRatingBefore = winnerStats.rating;
        const loserRatingBefore = loserStats.rating;
        const winnerRDBefore = winnerStats.rd;
        const loserRDBefore = loserStats.rd;
        const winnerVolatilityBefore = winnerStats.volatility;
        const loserVolatilityBefore = loserStats.volatility;

        // compute Glicko-2 outcome
        const glickoOutcome = calculateGlicko2(winnerStats, loserStats);
        const { newWinnerRating, newWinnerRD, newWinnerVolatility, newLoserRating, newLoserRD, newLoserVolatility } = glickoOutcome;
        
        // Calculate expected win probabilities (using Glicko-2 scale)
        const mu1 = glicko2Scale(winnerRatingBefore);
        const phi1 = glicko2ScaleRD(winnerRDBefore);
        const mu2 = glicko2Scale(loserRatingBefore);
        const phi2 = glicko2ScaleRD(loserRDBefore);
        const expectedWinnerProb = glicko2_E(mu1, mu2, phi2);
        const expectedLoserProb = 1 - expectedWinnerProb;
        
        // Calculate potential gains/losses for both outcomes
        const winnerPotentialGain = newWinnerRating - winnerRatingBefore;
        const loserPotentialLoss = newLoserRating - loserRatingBefore;
        
        // Calculate what would happen if loser won instead
        const loserIfWinOutcome = calculateGlicko2(loserStats, winnerStats);
        const loserPotentialGain = loserIfWinOutcome.newWinnerRating - loserRatingBefore;
        const winnerPotentialLoss = loserIfWinOutcome.newLoserRating - winnerRatingBefore;

        const winnerId = getCoasterId(winner);

        // trigger close-battle flow (may show overlay). Wait for it before applying model updates so animation aligns with visible change
        triggerCloseBattleIfNeeded(winner, loser, oldWinnerRank, oldLoserRank, winnerId).then(({triggered, forcedSwap}) => {
            // apply ranking changes
            if (forcedSwap) {
                // Check if normal Glicko-2 calculation would already cause a position swap
                if (newWinnerRating > newLoserRating) {
                    // Normal calculation already results in winner being above loser - use it to maintain consistency
                    winnerStats.rating = newWinnerRating;
                    winnerStats.rd = newWinnerRD;
                    winnerStats.volatility = newWinnerVolatility;
                    loserStats.rating = newLoserRating;
                    loserStats.rd = newLoserRD;
                    loserStats.volatility = newLoserVolatility;
                } else {
                    // Force winner to be above loser (only when necessary)
                    const baseLoserRating = (loserStats && typeof loserStats.rating === 'number') ? loserStats.rating : GLICKO2_RATING_BASE;
                    winnerStats.rating = baseLoserRating + 2;
                    winnerStats.rd = newWinnerRD;
                    winnerStats.volatility = newWinnerVolatility;
                    loserStats.rating = baseLoserRating - 1;
                    loserStats.rd = newLoserRD;
                    loserStats.volatility = newLoserVolatility;
                }
            } else {
                winnerStats.rating = newWinnerRating;
                winnerStats.rd = newWinnerRD;
                winnerStats.volatility = newWinnerVolatility;
                loserStats.rating = newLoserRating;
                loserStats.rd = newLoserRD;
                loserStats.volatility = newLoserVolatility;
            }

            // Track first battle date
            if (winnerStats.battles === 0) {
                winnerStats.firstBattleDate = new Date().toISOString();
            }
            if (loserStats.battles === 0) {
                loserStats.firstBattleDate = new Date().toISOString();
            }
            
            winnerStats.battles++; winnerStats.wins++;
            loserStats.battles++; loserStats.losses++;
            totalBattlesCount++;

            // Get ranks after rating changes
            const newWinnerRank = getCoasterRank(winner.naam);
            const newLoserRank = getCoasterRank(loser.naam);
            
            // Use the centralized close fight check (already calculated at the beginning)
            const wasCloseMatchFlag = isCloseFight;
            
            // Build comprehensive battle stats for storage
            const battleStats = {
                statsA: {
                    ratingBefore: (currentBattle[0].naam === winner.naam) ? winnerRatingBefore : loserRatingBefore,
                    ratingAfter: (currentBattle[0].naam === winner.naam) ? winnerStats.rating : loserStats.rating,
                    rdBefore: (currentBattle[0].naam === winner.naam) ? winnerRDBefore : loserRDBefore,
                    rdAfter: (currentBattle[0].naam === winner.naam) ? winnerStats.rd : loserStats.rd,
                    volatilityBefore: (currentBattle[0].naam === winner.naam) ? winnerVolatilityBefore : loserVolatilityBefore,
                    volatilityAfter: (currentBattle[0].naam === winner.naam) ? winnerStats.volatility : loserStats.volatility,
                    potentialGain: (currentBattle[0].naam === winner.naam) ? winnerPotentialGain : loserPotentialGain,
                    potentialLoss: (currentBattle[0].naam === winner.naam) ? winnerPotentialLoss : loserPotentialLoss,
                    rankBefore: (currentBattle[0].naam === winner.naam) ? oldWinnerRank : oldLoserRank,
                    rankAfter: (currentBattle[0].naam === winner.naam) ? newWinnerRank : newLoserRank,
                    expectedWinProbability: (currentBattle[0].naam === winner.naam) ? expectedWinnerProb : expectedLoserProb,
                    totalBattlesBefore: (currentBattle[0].naam === winner.naam) ? winnerStats.battles - 1 : loserStats.battles - 1
                },
                statsB: {
                    ratingBefore: (currentBattle[1].naam === winner.naam) ? winnerRatingBefore : loserRatingBefore,
                    ratingAfter: (currentBattle[1].naam === winner.naam) ? winnerStats.rating : loserStats.rating,
                    rdBefore: (currentBattle[1].naam === winner.naam) ? winnerRDBefore : loserRDBefore,
                    rdAfter: (currentBattle[1].naam === winner.naam) ? winnerStats.rd : loserStats.rd,
                    volatilityBefore: (currentBattle[1].naam === winner.naam) ? winnerVolatilityBefore : loserVolatilityBefore,
                    volatilityAfter: (currentBattle[1].naam === winner.naam) ? winnerStats.volatility : loserStats.volatility,
                    potentialGain: (currentBattle[1].naam === winner.naam) ? winnerPotentialGain : loserPotentialGain,
                    potentialLoss: (currentBattle[1].naam === winner.naam) ? winnerPotentialLoss : loserPotentialLoss,
                    rankBefore: (currentBattle[1].naam === winner.naam) ? oldWinnerRank : oldLoserRank,
                    rankAfter: (currentBattle[1].naam === winner.naam) ? newWinnerRank : newLoserRank,
                    expectedWinProbability: (currentBattle[1].naam === winner.naam) ? expectedWinnerProb : expectedLoserProb,
                    totalBattlesBefore: (currentBattle[1].naam === winner.naam) ? winnerStats.battles - 1 : loserStats.battles - 1
                },
                closeFight: wasCloseMatchFlag
            };

            // record and persist with comprehensive stats
            recordBattle(currentBattle[0], currentBattle[1], winner.naam, loser.naam, { battleStats });
            saveData();
            
            // Check phase transitions for both coasters after battle
            checkCoasterPhaseTransition(winner.naam);
            checkCoasterPhaseTransition(loser.naam);
            
            // Manage Seeding pool (check if any graduated and backfill from Waiting)
            manageSeedingPool();
            
            // Save again after phase updates
            saveData();

            // Update daily quest and session stats
            updateDailyQuest();
            updateSessionStats(wasCloseMatchFlag);
            
            // Award XP for the battle
            let xpAmount = 10; // Base XP for battle
            if (wasCloseMatchFlag) {
                xpAmount += 5; // Bonus for close fight
            }
            awardXP(xpAmount, wasCloseMatchFlag ? 'Battle (close fight)' : 'Battle');

            // Track for achievements
            // Use the centralized close fight check (already calculated at the beginning)
            const wasCloseFight = isCloseFight;
            const perfectMatch = (winner.park === loser.park) && 
                               (winner.fabrikant === loser.fabrikant) &&
                               winner.park && loser.park && 
                               winner.fabrikant && loser.fabrikant;
            // Check if underdog won (lower-ranked coaster won in a close fight)
            const underdogWon = wasCloseFight && (oldWinnerRank > oldLoserRank);
            
            if (typeof achievementManager !== 'undefined') {
                achievementManager.recordBattle(index, perfectMatch, wasCloseFight, currentBattle[0].naam, currentBattle[1].naam, underdogWon);
            }

            // Visual feedback on cards (apply to outer wrapper for proper animation)
            const outerWrappers = document.querySelectorAll('.credit-card-outer');
            const cards = document.querySelectorAll('.coaster-card, .battle-card');
            
            // Apply animation classes to outer wrapper
            if (outerWrappers[index]) outerWrappers[index].classList.add('winner');
            if (outerWrappers[1 - index]) outerWrappers[1 - index].classList.add('loser');
            
            // Also apply to inner card for backwards compatibility
            if (cards[index]) cards[index].classList.add('winner');
            if (cards[1 - index]) cards[1 - index].classList.add('loser');

            // compute rank change (newWinnerRank already calculated above)
            const rankChange = oldWinnerRank - newWinnerRank; // positive = climbed

            // Only show rank change badge if winner is in ranked phase (seeding coasters don't have ranks yet)
            const winnerPhase = winnerStats.phase || 'waiting';
            if (rankChange > 0 && winnerPhase === 'ranked' && newWinnerRank !== null && oldWinnerRank !== null) {
                const badge = document.createElement('div');
                badge.className = 'rank-change-badge';
                badge.innerHTML = `<span class="arrow">↑</span><span>+${rankChange}</span>`;
                // Append to outer wrapper (which has overflow:visible) to be fully visible above card
                const winnerCard = cards[index];
                if (winnerCard) {
                    const outerWrapper = winnerCard.closest('.credit-card-outer');
                    if (outerWrapper) {
                        outerWrapper.style.position = 'relative';
                        outerWrapper.appendChild(badge);
                    }
                }
                setTimeout(() => { if (badge.parentElement) badge.remove(); }, 800);
            }

            // refresh ranking table and animate swap if the relative ordering changed between these two
            updateRanking();
            // if winner and loser switched relative order compared to before, animate swap
            // (newWinnerRank and newLoserRank already calculated above)
            const wasWinnerBelow = oldWinnerRank > oldLoserRank;
            const nowWinnerAbove = newWinnerRank < newLoserRank;
            if (wasWinnerBelow && nowWinnerAbove) {
                animateSwapInRanking(winner.naam, loser.naam);
            }

            // ===== CLOSE FIGHT CELEBRATION =====
            // If this was a close fight, show an extended celebration
            // Use the centralized close fight check (already calculated at the beginning)
            if (isCloseFight) {
                // ensure any intro overlay/banner/burst is hidden before celebration (force-hide immediately)
                try {
                    const overlayEl = document.getElementById('closeBattleOverlay');
                    const bannerEl = document.getElementById('closeBanner');
                    const winnerBurstEl = document.getElementById('winnerBurst');
                    if (bannerEl) bannerEl.classList.remove('show');
                    if (winnerBurstEl) winnerBurstEl.classList.remove('show','big');
                    if (overlayEl) {
                        overlayEl.classList.remove('show');
                        // forcefully hide overlay (use !important so CSS transitions or async re-add don't briefly show it)
                        overlayEl.style.setProperty('display', 'none', 'important');
                        overlayEl.style.setProperty('opacity', '0', 'important');
                        overlayEl.style.zIndex = '';
                        overlayEl.setAttribute('aria-hidden', 'true');
                    }
                } catch (e) { /* ignore */ }

                const cardEl = (document.querySelectorAll('.coaster-card, .battle-card') || [])[index];
                celebrateWinner(cardEl, winner.naam).then(()=>{
                    // Check achievements after celebration
                    checkAndShowAchievements();
                    // Clear current battle before displaying next one
                    currentBattle = null;
                    // Display next battle immediately for smooth, fast experience
                    displayBattle(); isProcessingChoice = false; resolvingBattle = false;
                });
            } else {
                // delay before next battle: shorter delays for smooth experience
                const DELAY = triggered ? 500 : 400;
                // Clear current battle before displaying next one
                currentBattle = null;
                setTimeout(()=>{ 
                    displayBattle(); 
                    isProcessingChoice = false; 
                    resolvingBattle = false;
                    // Check achievements after battle completes
                    checkAndShowAchievements();
                }, DELAY);
            }
        }).catch((e)=>{
            console.error('close-battle flow error', e);
            // fallback apply normally (without comprehensive stats since this is error recovery)
            winnerStats.rating = newWinnerRating; loserStats.rating = newLoserRating;
            winnerStats.rd = newWinnerRd; loserStats.rd = newLoserRd;
            winnerStats.volatility = newWinnerVolatility; loserStats.volatility = newLoserVolatility;
            winnerStats.battles++; winnerStats.wins++; loserStats.battles++; loserStats.losses++; totalBattlesCount++;
            recordBattle(currentBattle[0], currentBattle[1], winner.naam, loser.naam); // Basic record without stats
            saveData(); updateRanking(); displayBattle(); isProcessingChoice = false;
            resolvingBattle = false;
        });
    }

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (!currentUser) return;
        
        // Number key navigation (1-4 for tabs)
        if (['1', '2', '3', '4', '5'].includes(event.key)) {
            event.preventDefault();
            const tabMap = {
                '1': 'home',
                '2': 'battle',
                '3': 'ranking',
                '4': 'history',
                '5': 'achievements'
            };
            achievementManager.usedNumberKeys = 1;
            switchTab(tabMap[event.key]);
            achievementManager.save(currentUser);
            checkAndShowAchievements();
            return;
        }
        
        const battleTab = document.getElementById('battle-tab');
        if (!battleTab.classList.contains('active')) return;
        
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            achievementManager.usedKeyboard = 1;
            // Detect keyboard usage for more aggressive preloading
            if (!keyboardUsageDetected) {
                keyboardUsageDetected = true;
                console.log('🚀 Keyboard mode detected - increasing preload queue');
            }
            chooseWinner(0);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            achievementManager.usedKeyboard = 1;
            // Detect keyboard usage for more aggressive preloading
            if (!keyboardUsageDetected) {
                keyboardUsageDetected = true;
                console.log('🚀 Keyboard mode detected - increasing preload queue');
            }
            chooseWinner(1);
        }
    });

    // Close keyboard hint and persist preference
    function closeKeyboardHint() {
        const hint = document.getElementById('keyboardHint');
        if (hint) {
            hint.classList.add('hidden');
            localStorage.setItem('keyboardHintDismissed', 'true');
        }
    }

    // Check if hint was previously dismissed and sync simulate input width on load
    window.addEventListener('DOMContentLoaded', () => {
        // Load dark mode preference
        loadDarkModePreference();
        
        const dismissed = localStorage.getItem('keyboardHintDismissed');
        if (dismissed === 'true') {
            const hint = document.getElementById('keyboardHint');
            if (hint) hint.classList.add('hidden');
        }
        // sync simulate input to button width immediately after DOM ready
        try { syncSimInputWidth(); } catch (e) {}
        // populate lightweight DOM cache
        try {
            DOM.battleContainer = $id('battleContainer');
            DOM.simulateBtn = $id('simulateBtn');
            DOM.simulateCount = $id('simulateCount');
        } catch (e) { /* ignore */ }
        // attempt to load coaster CSV data (fetch). If this fails, a fallback file-input UI will be shown.
        try {
            loadCoasterData();
        } catch (e) {
            // ensure the battle view is consistent even if loadCoasterData throws
            try { displayBattle(); } catch (ee) {}
        }

        // Initialize pins display if a user was previously selected
        const lastUser = localStorage.getItem('lastUser');
        if (lastUser && typeof achievementManager !== 'undefined') {
            setTimeout(() => {
                if (currentUser) {
                    updatePinsDisplay();
                }
            }, 100);
        }

        // Dev toggle uses inline onclick; no extra listener needed here.
    });

    // Global undo for history deletes: Cmd+Z / Ctrl+Z (but not when typing in an input)
    function undoLastDelete() {
        if (!deletedHistoryStack || deletedHistoryStack.length === 0) return false;
        const item = deletedHistoryStack.pop();
        if (!item || !item.entry) return false;

        // Re-insert at original index where possible, otherwise append
        const insertIndex = (typeof item.index === 'number' && item.index >= 0 && item.index <= coasterHistory.length) ? item.index : coasterHistory.length;
        coasterHistory.splice(insertIndex, 0, item.entry);
        saveData();
        displayHistory();
        // Show a small toast confirming undo (include restored pair)
        try {
            const a = item.entry && item.entry.a ? item.entry.a : '';
            const b = item.entry && item.entry.b ? item.entry.b : '';
            showToast(`Hersteld: ${a} ↔ ${b}`);
        } catch (e) {
            showToast('Hersteld: matchup teruggezet');
        }
        return true;
    }

    document.addEventListener('keydown', (ev) => {
        // Ignore undo while focused on text inputs or contenteditable areas
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

        const isUndo = (ev.key && ev.key.toLowerCase() === 'z') && (ev.metaKey || ev.ctrlKey);
        if (!isUndo) return;

        // Only act when there's a history tab or current user
        if (!currentUser) return;

        const handled = undoLastDelete();
        if (handled) {
            ev.preventDefault();
        }
    });

    // ============================================
    // HOME TAB FUNCTIONALITY
    // ============================================

    // ============================================
    // LEVEL & XP SYSTEM
    // ============================================
    
    const MAX_LEVEL = 100;
    let userLevel = 1;
    let totalXPEarned = 0;
    
    // Calculate required XP for a given level (steeper exponential curve with rounded numbers)
    // Level 2 = 500 XP, Level 10 = ~11,250 XP cumulative
    function getXPForLevel(level) {
        if (level <= 0) return 0;
        if (level === 1) return 0;
        // Steeper curve (1.2) with base 500, rounded to nearest 50 for clean numbers
        return Math.round(500 * Math.pow(1.2, level - 2) / 50) * 50;
    }
    
    // Get cumulative XP needed to reach a level
    function getCumulativeXPForLevel(level) {
        let cumulative = 0;
        for (let i = 2; i <= level; i++) {
            cumulative += getXPForLevel(i);
        }
        return cumulative;
    }
    
    // Calculate current level from total XP
    function calculateLevel(xp) {
        let level = 1;
        let cumulativeXP = 0;
        
        while (level < MAX_LEVEL) {
            const xpForNextLevel = getXPForLevel(level + 1);
            if (cumulativeXP + xpForNextLevel > xp) {
                break;
            }
            cumulativeXP += xpForNextLevel;
            level++;
        }
        
        return level;
    }
    
    // Get XP progress within current level (returns {current, required})
    function getXPProgressInLevel(xp, level) {
        if (level >= MAX_LEVEL) {
            return { current: 0, required: 0, totalXP: xp };
        }
        
        const cumulativeForCurrentLevel = getCumulativeXPForLevel(level);
        const currentXPInLevel = xp - cumulativeForCurrentLevel;
        const requiredForNextLevel = getXPForLevel(level + 1);
        
        return {
            current: currentXPInLevel,
            required: requiredForNextLevel,
            totalXP: xp
        };
    }
    
    // Load level/XP data from localStorage
    function loadLevelData() {
        if (!currentUser) return;
        
        const savedLevel = parseInt(localStorage.getItem(`userLevel_${currentUser}`)) || 1;
        const savedXP = parseInt(localStorage.getItem(`totalXPEarned_${currentUser}`)) || 0;
        
        userLevel = savedLevel;
        totalXPEarned = savedXP;
        
        // Recalculate level from XP to ensure consistency
        const calculatedLevel = calculateLevel(totalXPEarned);
        if (calculatedLevel !== userLevel) {
            userLevel = calculatedLevel;
            localStorage.setItem(`userLevel_${currentUser}`, userLevel.toString());
        }
    }
    
    // Save level/XP data to localStorage
    function saveLevelData() {
        if (!currentUser) return;
        
        localStorage.setItem(`userLevel_${currentUser}`, userLevel.toString());
        localStorage.setItem(`totalXPEarned_${currentUser}`, totalXPEarned.toString());
    }
    
    // Award XP and check for level up
    function awardXP(amount, reason) {
        if (!currentUser || amount <= 0) return;
        
        const oldLevel = userLevel;
        totalXPEarned += amount;
        
        // Recalculate level
        userLevel = calculateLevel(totalXPEarned);
        
        // Save to localStorage
        saveLevelData();
        
        // Update session XP tracking
        if (typeof sessionXP !== 'undefined') {
            sessionXP += amount;
        }
        
        // Check for level up
        if (userLevel > oldLevel) {
            showLevelUpToast(userLevel);
            
            // Update level displays
            updateLevelDisplays();
        } else {
            // Just update XP progress bar
            updateXPProgressBar();
        }
    }
    
    // Show level-up celebration toast
    function showLevelUpToast(newLevel) {
        // Remove any existing level-up toast
        const existing = document.querySelector('.levelup-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'levelup-toast';
        
        toast.innerHTML = `
            <div class="levelup-icon">🎉</div>
            <div class="levelup-content">
                <div class="levelup-header">Level Up!</div>
                <div class="levelup-level">Now Level ${newLevel}</div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
    
    // Update all level displays in the UI
    function updateLevelDisplays() {
        // Update header badge
        const badge = document.getElementById('currentUserBadge');
        if (badge && currentUser) {
            const userName = currentUser === 'luca' ? 'Luca' : 'Wouter';
            badge.textContent = `${userName} - Level ${userLevel}`;
        }
        
        // Update profile tab level display
        updateProfileLevelDisplay();
        
        // Update XP progress bar
        updateXPProgressBar();
    }
    
    // Update the XP progress bar in profile tab
    function updateXPProgressBar() {
        const progressBar = document.getElementById('xpProgressFill');
        const progressText = document.getElementById('xpProgressText');
        const currentLevelText = document.getElementById('currentLevelText');
        const nextLevelText = document.getElementById('nextLevelText');
        
        if (userLevel >= MAX_LEVEL) {
            // Max level reached
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = `MAX LEVEL`;
            if (currentLevelText) currentLevelText.textContent = `${MAX_LEVEL}`;
            if (nextLevelText) nextLevelText.textContent = 'MAX';
            return;
        }
        
        // Calculate total cumulative XP for display
        const cumulativeXPForNextLevel = getCumulativeXPForLevel(userLevel + 1);
        const progress = getXPProgressInLevel(totalXPEarned, userLevel);
        const percentage = progress.required > 0 ? (progress.current / progress.required * 100) : 0;
        
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        
        if (progressText) {
            progressText.textContent = `${totalXPEarned.toLocaleString()}/${cumulativeXPForNextLevel.toLocaleString()} XP`;
        }
        
        if (currentLevelText) {
            currentLevelText.textContent = `${userLevel}`;
        }
        
        if (nextLevelText) {
            nextLevelText.textContent = `${userLevel + 1}`;
        }
    }
    
    // Update profile tab with username and level badge
    function updateProfileLevelDisplay() {
        const welcomeEl = document.getElementById('homeWelcome');
        if (welcomeEl && currentUser) {
            const userName = currentUser === 'luca' ? 'Luca' : 'Wouter';
            welcomeEl.innerHTML = `${userName} <span class="level-badge">${userLevel}</span>`;
        }
        
        updateXPProgressBar();
    }

    // Daily quest tracking
    let dailyQuestProgress = 0;
    let lastQuestResetDate = null;

    function loadDailyQuest() {
        if (!currentUser) return;
        
        const today = new Date().toDateString();
        const savedDate = localStorage.getItem(`dailyQuestDate_${currentUser}`);
        const savedProgress = parseInt(localStorage.getItem(`dailyQuestProgress_${currentUser}`)) || 0;
        
        // Reset if it's a new day
        if (savedDate !== today) {
            dailyQuestProgress = 0;
            localStorage.setItem(`dailyQuestDate_${currentUser}`, today);
            localStorage.setItem(`dailyQuestProgress_${currentUser}`, '0');
        } else {
            dailyQuestProgress = savedProgress;
        }
        
        lastQuestResetDate = today;
    }

    function updateDailyQuest() {
        if (!currentUser) return;
        
        const today = new Date().toDateString();
        
        // Check if we need to reset for a new day
        if (lastQuestResetDate !== today) {
            loadDailyQuest();
        }
        
        const wasCompleted = (dailyQuestProgress === 25);
        dailyQuestProgress = Math.min(dailyQuestProgress + 1, 25);
        localStorage.setItem(`dailyQuestProgress_${currentUser}`, dailyQuestProgress.toString());
        
        // Award XP if quest just completed
        if (!wasCompleted && dailyQuestProgress === 25) {
            awardXP(50, 'Daily quest completed');
        }
        
        // Update UI if on home tab
        const questFill = document.getElementById('questProgressFill');
        const questText = document.getElementById('questProgressText');
        
        if (questFill && questText) {
            const percentage = (dailyQuestProgress / 25) * 100;
            questFill.style.width = percentage + '%';
            questText.textContent = `${dailyQuestProgress}/25 battles`;
        }
    }

    // Session stats tracking
    let sessionBattles = 0;
    let sessionCloseFights = 0;
    let sessionXP = 0;
    let sessionStartLevel = 1;

    function resetSessionStats() {
        sessionBattles = 0;
        sessionCloseFights = 0;
        sessionXP = 0;
        sessionStartLevel = userLevel;
    }

    function updateSessionStats(isCloseFight = false) {
        sessionBattles++;
        if (isCloseFight) sessionCloseFights++;
        
        // Update UI if on home tab
        const sessionBattlesEl = document.getElementById('sessionBattles');
        const sessionCloseFightsEl = document.getElementById('sessionCloseFights');
        const sessionXPEl = document.getElementById('sessionXP');
        const sessionLevelsEl = document.getElementById('sessionLevels');
        
        if (sessionBattlesEl) sessionBattlesEl.textContent = sessionBattles;
        if (sessionCloseFightsEl) sessionCloseFightsEl.textContent = sessionCloseFights;
        if (sessionXPEl) sessionXPEl.textContent = `${sessionXP} XP`;
        
        // Show levels gained if any
        const levelsGained = userLevel - sessionStartLevel;
        if (sessionLevelsEl) {
            if (levelsGained > 0) {
                sessionLevelsEl.textContent = `${levelsGained} level${levelsGained > 1 ? 's' : ''}`;
                sessionLevelsEl.parentElement.style.display = 'flex';
            } else {
                sessionLevelsEl.parentElement.style.display = 'none';
            }
        }
    }

    function displayHome() {
        if (!currentUser) {
            // Show welcome state without user
            const welcomeEl = document.getElementById('homeWelcome');
            if (welcomeEl) welcomeEl.textContent = 'Welcome to Coaster Ranker!';
            
            // Show placeholder content
            document.getElementById('homeTotalBattles').textContent = '0';
            document.getElementById('homeTotalCoasters').textContent = '0';
            document.getElementById('homeProgressMatchups').textContent = '0/0';
            document.getElementById('homeProgressPercentage').textContent = '0%';
            document.getElementById('questProgressFill').style.width = '0%';
            document.getElementById('questProgressText').textContent = '0/25 battles';
            document.getElementById('homeTop3').innerHTML = '';
            document.getElementById('homeAchievementCount').textContent = '0/0';
            document.getElementById('homeRecentAchievements').innerHTML = '';
            document.getElementById('sessionBattles').textContent = '0';
            document.getElementById('sessionCloseFights').textContent = '0';
            return;
        }

        // Load level/XP data
        loadLevelData();
        
        // Update welcome message with level badge
        updateProfileLevelDisplay();

        // Update profile stats (moved from ranking tab)
        const statsArray = Object.values(coasterStats);
        const totalCoasters = statsArray.length;
        const totalBattles = totalBattlesCount;
        
        const totalPossible = getTotalPossiblePairs();
        const completed = completedPairs.size;
        const progressPercentage = totalPossible > 0 ? ((completed / totalPossible) * 100).toFixed(1) : 0;
        
        document.getElementById('homeTotalBattles').textContent = totalBattles;
        document.getElementById('homeTotalCoasters').textContent = totalCoasters;
        document.getElementById('homeProgressMatchups').textContent = `${completed}/${totalPossible}`;
        document.getElementById('homeProgressPercentage').textContent = `${progressPercentage}%`;

    // Update ranking tab stats bar
    const rankingTotalCoasters = document.getElementById('rankingTotalCoasters');
    const rankingProgressMatchups = document.getElementById('rankingProgressMatchups');
    if (rankingTotalCoasters) rankingTotalCoasters.textContent = totalCoasters;
    if (rankingProgressMatchups) rankingProgressMatchups.textContent = `${completed}/${totalPossible}`;

        // Update daily quest
        loadDailyQuest();
        const questPercentage = (dailyQuestProgress / 25) * 100;
        document.getElementById('questProgressFill').style.width = questPercentage + '%';
        document.getElementById('questProgressText').textContent = `${dailyQuestProgress}/25 battles`;

        // Update top 3 coasters
        const top3Container = document.getElementById('homeTop3');
        if (totalBattles === 0) {
            top3Container.innerHTML = '<div class="no-battles">Start battling to see your favorites!</div>';
        } else {
            // Only include ranked coasters in top 3
            const rankedOnly = statsArray.filter(s => (s.phase || 'waiting') === 'ranked');
            const sorted = [...rankedOnly].sort((a, b) => displayedRating(b) - displayedRating(a));
            const top3 = sorted.slice(0, 3);
            
            const html = top3.map((coaster, index) => {
                const rank = index + 1;
                const rankClass = `rank-${rank}`;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                return `
                    <div class="top-coaster-item">
                        <div class="top-coaster-rank ${rankClass}">${medal}</div>
                        <div class="top-coaster-info">
                            <div class="top-coaster-name">${coaster.name}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            top3Container.innerHTML = html;
        }

        // Update pins
        try {
            const totalPins = Object.keys(ACHIEVEMENTS).length;
            const unlockedCount = achievementManager.getUnlockedCount();
            document.getElementById('homeAchievementCount').textContent = `${unlockedCount}/${totalPins}`;
            
            // Show 3 most recent pins
            const recent = achievementManager.getRecentAchievements(3);
            const recentHtml = recent.map(ach => 
                `<div class="recent-achievement-icon" title="${ach.name}">${ach.icon}</div>`
            ).join('');
            document.getElementById('homeRecentAchievements').innerHTML = recentHtml || '<div style="text-align:center;color:#999;font-size:0.9em;">No pins yet</div>';
        } catch (e) {
            document.getElementById('homeAchievementCount').textContent = '0/0';
            document.getElementById('homeRecentAchievements').innerHTML = '';
        }

        // Update session stats
        document.getElementById('sessionBattles').textContent = sessionBattles;
        document.getElementById('sessionCloseFights').textContent = sessionCloseFights;
        
        // Match tab heights after content is rendered
        setTimeout(() => matchTabHeights(), 50);
    }

    function matchTabHeights() {
        // Match all tabs to profile tab height
        const profileTab = document.getElementById('home-tab');
        const battleTab = document.getElementById('battle-tab');
        const rankingTab = document.getElementById('ranking-tab');
        const historyTab = document.getElementById('history-tab');
        
        if (profileTab) {
            // Temporarily make profile visible to measure it
            const wasProfileActive = profileTab.classList.contains('active');
            
            // Make profile visible (but keep it off-screen if it wasn't active)
            if (!wasProfileActive) {
                profileTab.style.position = 'absolute';
                profileTab.style.visibility = 'hidden';
                profileTab.style.display = 'block';
            }
            
            // Force a reflow to ensure measurement is accurate
            profileTab.offsetHeight;
            
            // Get the actual computed height of the profile tab
            const profileHeight = profileTab.scrollHeight;
            
            // Restore profile tab state
            if (!wasProfileActive) {
                profileTab.style.position = '';
                profileTab.style.visibility = '';
                profileTab.style.display = '';
            }
            
            // Set all tabs to match (use height, not min-height, to force exact match)
            // Enable overflow-y auto so content scrolls instead of the page
            if (battleTab) {
                battleTab.style.height = profileHeight + 'px';
                battleTab.style.overflowY = 'hidden';
            }
            if (rankingTab) {
                rankingTab.style.height = profileHeight + 'px';
                rankingTab.style.overflowY = 'auto';
            }
            if (historyTab) {
                historyTab.style.height = profileHeight + 'px';
                historyTab.style.overflowY = 'auto';
            }
        }
    }

    function switchTab(tabName) {
        // Save the current tab to localStorage
        try {
            localStorage.setItem('lastActiveTab', tabName);
        } catch (e) { /* ignore */ }
        
        // Hide pins overlay when switching tabs (especially when clicking profile tab)
        try {
            hidePinsOverlay();
        } catch (e) { /* ignore */ }
        
        // Hide history overlays when switching tabs
        try {
            const profileOverlay = document.getElementById('historyOverlayProfile');
            const battleOverlay = document.getElementById('historyOverlayBattle');
            const rankingOverlay = document.getElementById('historyOverlayRanking');
            if (profileOverlay && profileOverlay.style.display === 'block') {
                hideHistoryOverlay('profile');
            }
            if (battleOverlay && battleOverlay.style.display === 'block') {
                hideHistoryOverlay('battle');
            }
            if (rankingOverlay && rankingOverlay.style.display === 'block') {
                hideHistoryOverlay('ranking');
            }
        } catch (e) { /* ignore */ }
        
        // Always hide close battle overlay when switching tabs
        try {
            cancelCloseIntro();
            const overlay = document.getElementById('closeBattleOverlay');
            if (overlay) {
                overlay.classList.remove('show');
                overlay.style.display = 'none';
            }
        } catch (e) { /* ignore */ }
        
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Find and activate the corresponding tab button
        const tabButtons = document.querySelectorAll('.tab');
        const tabMap = ['home', 'credits', 'battle', 'ranking', 'history'];
        const tabIndex = tabMap.indexOf(tabName);
        if (tabIndex >= 0 && tabButtons[tabIndex]) {
            tabButtons[tabIndex].classList.add('active');
        }
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + '-tab').classList.add('active');
        // Refresh relevant tab content
        if (tabName === 'battle') {
            // Ensure battle view is up-to-date
            try { displayBattle(); } catch (e) {}
            // show battle UI
            try { setBattleVisibility(true); } catch (e) {}
        } else {
            // Hide battle cards when not on the battle tab
            try { setBattleVisibility(false); } catch (e) {}
        }

        if (tabName === 'home') {
            displayHome();
        } else if (tabName === 'ranking') {
            updateRanking();
        } else if (tabName === 'history') {
            displayHistory();
        } else if (tabName === 'credits') {
            // Credits tab - placeholder for future functionality
        }
        
        // Match tab heights after switching and content is rendered
        setTimeout(() => matchTabHeights(), 50);
    }

    // Render the history in the history tab
    function displayHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        if (!coasterHistory || coasterHistory.length === 0) {
            container.innerHTML = '<div class="no-battles">No battles yet — start choosing to build your history.</div>';
            return;
        }
        const query = document.getElementById('historySearch') ? document.getElementById('historySearch').value.trim() : '';
        const qLower = (query || '').toLowerCase();
        const hasSelected = !!qLower;

        // Ensure filter UI reflects whether a coaster is selected
        updateHistoryFilterUI();

        // Render only pair, highlight winner with a green pill and add a subtle delete button
        const rows = coasterHistory.slice().reverse().map((entry, idx) => {
            const originalIndex = coasterHistory.length - 1 - idx;
            
            // Handle reset event specially
            if (entry.isResetEvent) {
                const date = new Date(entry.timestamp);
                const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                
                return `
                    <div class="history-row reset-event">
                        <div class="history-pair" style="justify-content: center;">
                            <div style="color: #f59e0b; font-weight: 700; text-align: center;">
                                🔄 Ranking Reset - ${dateStr} ${timeStr}
                            </div>
                        </div>
                        <div class="history-actions">
                            <button class="history-delete" title="Delete this entry" onclick="deleteHistoryEntry(${originalIndex})">✖</button>
                        </div>
                    </div>
                `;
            }
            
            // Use stored left/right positions if available, otherwise fall back to a/b
            let a = entry.left || entry.a;
            let b = entry.right || entry.b;
            const winner = entry.winner;

            const pairText = `${a} ↔ ${b}`;
            // If there's a search query, only show rows that include the query
            if (qLower && !pairText.toLowerCase().includes(qLower) && !a.toLowerCase().includes(qLower) && !b.toLowerCase().includes(qLower)) {
                return '';
            }

            // If there's a search query, put the matching coaster on the left
            if (qLower) {
                const aMatches = a.toLowerCase().includes(qLower);
                const bMatches = b.toLowerCase().includes(qLower);
                // If only b matches, swap them so the selected coaster appears left
                if (!aMatches && bMatches) {
                    [a, b] = [b, a];
                }
            }

            // Apply active filter
            if (typeof historyFilter !== 'undefined' && historyFilter && historyFilter !== 'all') {
                const selectedName = query;
                if (historyFilter === 'wins') {
                    // only show battles where selectedName is the winner (requires selected coaster)
                    if (!hasSelected || winner !== selectedName) return '';
                } else if (historyFilter === 'losses') {
                    // only show battles where selectedName lost (requires selected coaster)
                    if (!hasSelected || winner === selectedName) return '';
                    if (a !== selectedName && b !== selectedName) return '';
                } else if (historyFilter === 'close') {
                    // show all close fights (or only those involving selected coaster if one is selected)
                    if (!entry.closeFight) return '';
                    if (hasSelected && a !== selectedName && b !== selectedName) return '';
                }
            }

            const winnerClass = (entry && entry.closeFight) ? 'winner-pill close-win' : 'winner-pill';
            const aHtml = (winner === a) ? `<span class="clickable-history-name" onclick="viewCoasterHistory('${a.replace(/'/g, "\\'")}')" style="cursor:pointer;"><span class="${winnerClass}">${escapeHtml(a)}</span></span>` : `<span class="clickable-history-name" onclick="viewCoasterHistory('${a.replace(/'/g, "\\'")}')" style="cursor:pointer;">${escapeHtml(a)}</span>`;
            const bHtml = (winner === b) ? `<span class="clickable-history-name" onclick="viewCoasterHistory('${b.replace(/'/g, "\\'")}')" style="cursor:pointer;"><span class="${winnerClass}">${escapeHtml(b)}</span></span>` : `<span class="clickable-history-name" onclick="viewCoasterHistory('${b.replace(/'/g, "\\'")}')" style="cursor:pointer;">${escapeHtml(b)}</span>`;

            const arrowHtml = entry && entry.closeFight ? `<span class="close-fight-icon" title="Close fight">⚔️</span>` : '↔';

            return `
                <div class="history-row">
                    <div class="history-pair">
                        <div class="history-name left"><strong>${aHtml}</strong></div>
                        <div class="history-arrow">${arrowHtml}</div>
                        <div class="history-name right"><strong>${bHtml}</strong></div>
                    </div>
                    <div class="history-actions">
                        <button class="history-switch" title="Switch winner" onclick="switchHistoryWinner(${originalIndex})">⇄</button>
                        <button class="history-delete" title="Delete this matchup" onclick="deleteHistoryEntry(${originalIndex})">✖</button>
                    </div>
                </div>
            `;
        }).join('');

        // If filtering removed all rows, show empty state
        if (!rows || rows.trim() === '') {
            container.innerHTML = '<div class="no-battles">No matchups found for this search.</div>';
        } else {
            container.innerHTML = rows;
        }
        
        // Match tab heights after content is rendered
        setTimeout(() => matchTabHeights(), 50);
    }

    let selectedAutocompleteIndex = -1;
    // History filter state: 'all' | 'wins' | 'losses' | 'close'
    let historyFilter = 'all';
    // Track if user actually selected a coaster (vs just typing)
    let coasterSelected = false;

    function setHistoryFilter(filter, source) {
        if (!filter) return;
        historyFilter = filter;
        // update active class on buttons
        const suffix = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';
        const btns = document.querySelectorAll('#historyFilters' + suffix + ' .filter-btn');
        btns.forEach(b => {
            const f = b.getAttribute('data-filter');
            if (f === filter) b.classList.add('active'); else b.classList.remove('active');
        });
        // refresh displayed history
        if (source) {
            displayHistoryInOverlay(source);
        } else {
            displayHistory();
        }
    }

    function updateHistoryFilterUI(source) {
        const suffix = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';
        const input = document.getElementById('historySearch' + suffix);
        const historyFilters = document.getElementById('historyFilters' + suffix);
        if (!historyFilters) return;
        if (coasterSelected) {
            document.body.classList.add('coaster-selected');
        } else {
            document.body.classList.remove('coaster-selected');
            // reset to 'all' when no coaster selected (wins/losses won't make sense)
            if (historyFilter === 'wins' || historyFilter === 'losses') {
                historyFilter = 'all';
                const btns = historyFilters.querySelectorAll('.filter-btn');
                btns.forEach(b => { b.classList.remove('active'); });
                const first = historyFilters.querySelector('.filter-btn[data-filter="all"]');
                if (first) first.classList.add('active');
            }
        }
    }

    function getHistoryAutocompleteSuggestions() {
        const coasterNames = new Set();
        Object.keys(coasterStats).forEach(name => coasterNames.add(name));
        return Array.from(coasterNames).sort();
    }

    function handleHistorySearchInput(source) {
        const suffix = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';
        const input = document.getElementById('historySearch' + suffix);
        const clearBtn = document.getElementById('clearHistorySearchBtn' + suffix);
        if (!input || !clearBtn) return;
        clearBtn.style.display = input.value.trim() ? 'block' : 'none';
        coasterSelected = false; // Reset when typing
        showHistoryAutocomplete(source);
        updateHistoryFilterUI(source);
    }

    function clearHistorySearch(source) {
        const suffix = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';
        const input = document.getElementById('historySearch' + suffix);
        const clearBtn = document.getElementById('clearHistorySearchBtn' + suffix);
        const dropdown = document.getElementById('historyAutocomplete' + suffix);
        if (!input || !clearBtn || !dropdown) return;
        input.value = '';
        clearBtn.style.display = 'none';
        dropdown.classList.remove('show');
        coasterSelected = false;
        if (source) {
            displayHistoryInOverlay(source);
        } else {
            displayHistory();
        }
        updateHistoryFilterUI(source);
    }

    function showHistoryAutocomplete(source) {
        const suffix = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';
        const input = document.getElementById('historySearch' + suffix);
        const dropdown = document.getElementById('historyAutocomplete' + suffix);
        if (!input || !dropdown) return;
        const query = input.value.trim().toLowerCase();
        
        const allSuggestions = getHistoryAutocompleteSuggestions();
        const filteredSuggestions = query === '' 
            ? allSuggestions 
            : allSuggestions.filter(name => name.toLowerCase().includes(query));
        
        if (filteredSuggestions.length === 0) {
            dropdown.classList.remove('show');
            return;
        }
        
        dropdown.innerHTML = filteredSuggestions.map((name, idx) => 
            `<div class="autocomplete-item" data-index="${idx}" onclick="selectHistorySuggestion('${name.replace(/'/g, "\\'")}', '${source || ''}')">${escapeHtml(name)}</div>`
        ).join('');
        
        dropdown.classList.add('show');
        selectedAutocompleteIndex = -1;
    }

    function selectHistorySuggestion(name, source) {
        const suffix = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';
        const input = document.getElementById('historySearch' + suffix);
        const clearBtn = document.getElementById('clearHistorySearchBtn' + suffix);
        const dropdown = document.getElementById('historyAutocomplete' + suffix);
        if (!input || !clearBtn || !dropdown) return;
        input.value = name;
        clearBtn.style.display = 'block';
        dropdown.classList.remove('show');
        coasterSelected = true;
        if (source) {
            displayHistoryInOverlay(source);
        } else {
            displayHistory();
        }
        updateHistoryFilterUI(source);
    }

    function handleHistorySearchKeydown(event, source) {
        const suffix = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';
        const dropdown = document.getElementById('historyAutocomplete' + suffix);
        if (!dropdown) return;
        const items = dropdown.querySelectorAll('.autocomplete-item');
        
        if (!dropdown.classList.contains('show') || items.length === 0) return;
        
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, items.length - 1);
            updateAutocompleteSelection(items);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
            updateAutocompleteSelection(items);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (selectedAutocompleteIndex >= 0 && selectedAutocompleteIndex < items.length) {
                items[selectedAutocompleteIndex].click();
            }
        } else if (event.key === 'Escape') {
            dropdown.classList.remove('show');
        }
    }

    function updateAutocompleteSelection(items) {
        items.forEach((item, idx) => {
            if (idx === selectedAutocompleteIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        // Handle main history tab dropdown
        const dropdown = document.getElementById('historyAutocomplete');
        const input = document.getElementById('historySearch');
        if (dropdown && input && !input.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
        
        // Handle profile overlay dropdown
        const dropdownProfile = document.getElementById('historyAutocompleteProfile');
        const inputProfile = document.getElementById('historySearchProfile');
        if (dropdownProfile && inputProfile && !inputProfile.contains(event.target) && !dropdownProfile.contains(event.target)) {
            dropdownProfile.classList.remove('show');
        }
        
        // Handle battle overlay dropdown
        const dropdownBattle = document.getElementById('historyAutocompleteBattle');
        const inputBattle = document.getElementById('historySearchBattle');
        if (dropdownBattle && inputBattle && !inputBattle.contains(event.target) && !dropdownBattle.contains(event.target)) {
            dropdownBattle.classList.remove('show');
        }
    });

    // delete a single history entry by its index in coasterHistory
    function deleteHistoryEntry(index) {
        if (typeof index !== 'number' || index < 0 || index >= coasterHistory.length) return;

        const removed = coasterHistory.splice(index, 1)[0];
        
        // Remove from completed pairs to allow re-matching
        if (removed.pairKey) {
            completedPairs.delete(removed.pairKey);
        }

        // push onto undo stack
        try {
            deletedHistoryStack.push({ entry: removed, index });
            if (deletedHistoryStack.length > MAX_UNDO_STACK) deletedHistoryStack.shift();
        } catch (e) {
            // fallback: if something goes wrong with stack, ignore
        }

        saveData();
        displayHistory();
        displayBattle(); // Refresh battle view in case new pairs are available
        
        // Also refresh overlays if they're visible
        const profileOverlay = document.getElementById('historyOverlayProfile');
        const battleOverlay = document.getElementById('historyOverlayBattle');
        if (profileOverlay && profileOverlay.style.display === 'block') {
            displayHistoryInOverlay('profile');
        }
        if (battleOverlay && battleOverlay.style.display === 'block') {
            displayHistoryInOverlay('battle');
        }
        
        // show toast confirming deletion
        try {
            if (removed.isResetEvent) {
                showToast('Removed: Ranking Reset Event');
            } else {
                showToast(`Removed: ${removed.a} ↔ ${removed.b}`);
            }
        } catch (e) {}
    }

    // switch the winner in a history entry
    function switchHistoryWinner(index) {
        if (typeof index !== 'number' || index < 0 || index >= coasterHistory.length) return;

        const entry = coasterHistory[index];
        
        // Cannot switch winner for reset events
        if (entry.isResetEvent) {
            showToast('⚠️ Cannot switch reset events');
            return;
        }
        
        const oldWinner = entry.winner;
        const newWinner = (entry.winner === entry.a) ? entry.b : entry.a;
        const oldLoser = newWinner; // The new winner was the old loser
        
        console.log('=== SWITCHING WINNER ===');
        console.log('Old winner:', oldWinner);
        console.log('New winner:', newWinner);
        
        // Get current ranks before switching
        const oldWinnerRankBefore = getCoasterRank(oldWinner);
        const newWinnerRankBefore = getCoasterRank(newWinner);
        
        console.log('Current ranks before switch:', {
            [oldWinner]: oldWinnerRankBefore,
            [newWinner]: newWinnerRankBefore
        });
        
        // Update the winner in the history entry
        entry.winner = newWinner;
        entry.loser = oldWinner;
        
        // Update ratings by reversing the previous outcome
        const winnerStats = coasterStats[oldWinner];
        const loserStats = coasterStats[newWinner];
        
        if (winnerStats && loserStats && entry.statsA && entry.statsB) {
            console.log('Current rating before restoration:', {
                [oldWinner]: winnerStats.rating,
                [newWinner]: loserStats.rating
            });
            
            // Restore rating to BEFORE this battle happened (to avoid compounding errors)
            const aStats = coasterStats[entry.a];
            const bStats = coasterStats[entry.b];
            
            if (aStats && bStats) {
                // Restore from stored battle stats (support both old ELO and new Glicko-2)
                aStats.rating = entry.statsA.ratingBefore || entry.statsA.eloBefore || aStats.rating;
                aStats.rd = entry.statsA.rdBefore || GLICKO2_RD_INITIAL;
                aStats.volatility = entry.statsA.volatilityBefore || GLICKO2_VOLATILITY_INITIAL;
                bStats.rating = entry.statsB.ratingBefore || entry.statsB.eloBefore || bStats.rating;
                bStats.rd = entry.statsB.rdBefore || GLICKO2_RD_INITIAL;
                bStats.volatility = entry.statsB.volatilityBefore || GLICKO2_VOLATILITY_INITIAL;
                
                console.log('Restored rating to pre-battle state:', {
                    [entry.a]: aStats.rating,
                    [entry.b]: bStats.rating
                });
            }
            
            // Reverse old outcome
            winnerStats.wins--;
            loserStats.losses--;
            
            console.log('Reversed win/loss counts:', {
                [oldWinner]: { wins: winnerStats.wins, losses: winnerStats.losses },
                [newWinner]: { wins: loserStats.wins, losses: loserStats.losses }
            });
            
            // Apply new outcome
            loserStats.wins++;
            winnerStats.losses++;
            
            console.log('Applied new outcome:', {
                [oldWinner]: { wins: winnerStats.wins, losses: winnerStats.losses },
                [newWinner]: { wins: loserStats.wins, losses: loserStats.losses }
            });
            
            // Now recalculate rating from the original before-battle state with new winner
            const newWinnerStats = coasterStats[newWinner];
            const oldWinnerStats = coasterStats[oldWinner];
            
            const glickoOutcome = calculateGlicko2(newWinnerStats, oldWinnerStats);
            const { newWinnerRating, newWinnerRD, newWinnerVolatility, newLoserRating, newLoserRD, newLoserVolatility } = glickoOutcome;
            
            console.log('Recalculated rating:', {
                [newWinner]: `${newWinnerStats.rating} → ${newWinnerRating}`,
                [oldWinner]: `${oldWinnerStats.rating} → ${newLoserRating}`
            });
            
            newWinnerStats.rating = newWinnerRating;
            newWinnerStats.rd = newWinnerRD;
            newWinnerStats.volatility = newWinnerVolatility;
            oldWinnerStats.rating = newLoserRating;
            oldWinnerStats.rd = newLoserRD;
            oldWinnerStats.volatility = newLoserVolatility;
            
            // Update comprehensive battle stats if they exist
            if (entry.statsA && entry.statsB) {
                // Get new ranks after switching
                const oldWinnerRankAfter = getCoasterRank(oldWinner);
                const newWinnerRankAfter = getCoasterRank(newWinner);
                
                // Swap the winner/loser data in statsA and statsB
                const isAtheNewWinner = (entry.a === newWinner);
                
                // Store original values before swapping
                const origStatsA = {
                    potentialGain: entry.statsA.potentialGain,
                    potentialLoss: entry.statsA.potentialLoss
                };
                const origStatsB = {
                    potentialGain: entry.statsB.potentialGain,
                    potentialLoss: entry.statsB.potentialLoss
                };
                
                if (isAtheNewWinner) {
                    // A is now winner, B is now loser - update their after-battle values
                    entry.statsA.ratingAfter = newWinnerStats.rating;
                    entry.statsA.rdAfter = newWinnerStats.rd;
                    entry.statsA.volatilityAfter = newWinnerStats.volatility;
                    entry.statsA.rankAfter = newWinnerRankAfter;
                    // Swap: A's new potentialGain/Loss comes from B's old values
                    entry.statsA.potentialGain = origStatsB.potentialGain;
                    entry.statsA.potentialLoss = origStatsB.potentialLoss;
                    
                    entry.statsB.ratingAfter = oldWinnerStats.rating;
                    entry.statsB.rdAfter = oldWinnerStats.rd;
                    entry.statsB.volatilityAfter = oldWinnerStats.volatility;
                    entry.statsB.rankAfter = oldWinnerRankAfter;
                    // Swap: B's new potentialGain/Loss comes from A's old values
                    entry.statsB.potentialGain = origStatsA.potentialGain;
                    entry.statsB.potentialLoss = origStatsA.potentialLoss;
                } else {
                    // B is now winner, A is now loser
                    entry.statsB.ratingAfter = newWinnerStats.rating;
                    entry.statsB.rdAfter = newWinnerStats.rd;
                    entry.statsB.volatilityAfter = newWinnerStats.volatility;
                    entry.statsB.rankAfter = newWinnerRankAfter;
                    // Swap: B's new potentialGain/Loss comes from A's old values
                    entry.statsB.potentialGain = origStatsA.potentialGain;
                    entry.statsB.potentialLoss = origStatsA.potentialLoss;
                    
                    entry.statsA.ratingAfter = oldWinnerStats.rating;
                    entry.statsA.rdAfter = oldWinnerStats.rd;
                    entry.statsA.volatilityAfter = oldWinnerStats.volatility;
                    entry.statsA.rankAfter = oldWinnerRankAfter;
                    // Swap: A's new potentialGain/Loss comes from B's old values
                    entry.statsA.potentialGain = origStatsB.potentialGain;
                    entry.statsA.potentialLoss = origStatsB.potentialLoss;
                }
                
                console.log('Updated battle stats:', {
                    statsA: {
                        name: entry.a,
                        ratingAfter: entry.statsA.ratingAfter,
                        rankAfter: entry.statsA.rankAfter,
                        potentialGain: entry.statsA.potentialGain,
                        potentialLoss: entry.statsA.potentialLoss
                    },
                    statsB: {
                        name: entry.b,
                        ratingAfter: entry.statsB.ratingAfter,
                        rankAfter: entry.statsB.rankAfter,
                        potentialGain: entry.statsB.potentialGain,
                        potentialLoss: entry.statsB.potentialLoss
                    }
                });
            }
        }
        
        saveData();
        displayHistory();
        updateRanking();
        
        // Also refresh overlays if they're visible
        const profileOverlay = document.getElementById('historyOverlayProfile');
        const battleOverlay = document.getElementById('historyOverlayBattle');
        if (profileOverlay && profileOverlay.style.display === 'block') {
            displayHistoryInOverlay('profile');
        }
        if (battleOverlay && battleOverlay.style.display === 'block') {
            displayHistoryInOverlay('battle');
        }
        
        // Get new ranks after switching for toast message
        const oldWinnerRankAfter = getCoasterRank(oldWinner);
        const newWinnerRankAfter = getCoasterRank(newWinner);
        
        console.log('Final ranks after switch:', {
            [oldWinner]: oldWinnerRankAfter,
            [newWinner]: newWinnerRankAfter
        });
        console.log('=== SWITCH COMPLETE ===\n');
        
        // Simple toast message
        showToast(`Winner switched: ${newWinner} now wins against ${oldWinner}`);
    }

    // small helper to escape HTML in names
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (s) {
            return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s];
        });
    }

    // Toast helper: show a small non-blocking message at bottom-center
    function showToast(message, duration = 2400) {
        try {
            const existing = document.querySelector('.toast');
            if (existing) {
                existing.remove();
            }
            const t = document.createElement('div');
            t.className = 'toast';
            t.textContent = message;
            document.body.appendChild(t);
            // Force layout then add class to trigger transition
            void t.offsetWidth;
            t.classList.add('show');
            setTimeout(() => {
                t.classList.remove('show');
                setTimeout(() => t.remove(), 300);
            }, duration);
        } catch (e) {
            // ignore failures silently
        }
    }

    // clear history for user
    function clearHistory() {
        if (!currentUser) return;
        coasterHistory = [];
        saveData();
        displayHistory();
    }

    // export history JSON
    function exportHistory() {
        if (!coasterHistory || coasterHistory.length === 0) {
            alert('Geen history om te exporteren.');
            return;
        }
        const blob = new Blob([JSON.stringify(coasterHistory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coaster_history_${currentUser || 'anonymous'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Ranking Wizard: Recalculate all battles using current K-factors to correct for "lucky start"
    async function runRankingWizard() {
        if (!currentUser) {
            return;
        }
        
        if (!coasterHistory || coasterHistory.length === 0) {
            alert('No battle history to recalculate!');
            return;
        }
        
        console.log('🧙 === RANKING WIZARD STARTED ===');
        console.log(`Total battles to recalculate: ${coasterHistory.length}`);
        
        const progressEl = document.getElementById('rankingWizardProgress');
        const wizardBtn = document.getElementById('rankingWizardBtn');
        
        if (wizardBtn) wizardBtn.disabled = true;
        
        let totalIterations = 0;
        let totalChanges = 0;
        const startTime = performance.now();
        
        try {
            // Keep running iterations until no coasters change position
            while (true) {
                totalIterations++;
                console.log(`\n🧙 === ITERATION ${totalIterations} ===`);
                
                // Capture ranking positions before recalculation
                const ranksBefore = {};
                Object.values(coasterStats).forEach(stats => {
                    ranksBefore[stats.name] = getCoasterRank(stats.name);
                });
                
                if (progressEl) {
                    progressEl.style.display = 'block';
                    progressEl.textContent = `Iteration ${totalIterations}...`;
                }
                
                // Process each battle in chronological order
                for (let i = 0; i < coasterHistory.length; i++) {
                const entry = coasterHistory[i];
                const winner = entry.winner;
                const loser = entry.loser || (entry.winner === entry.a ? entry.b : entry.a);
                
                // Skip battles without comprehensive stats (from before the update)
                if (!entry.statsA || !entry.statsB) {
                    console.log(`Battle ${i+1}: Missing statsA/statsB (old battle), skipping...`);
                    continue;
                }
                
                // Get stats (they should exist, but check anyway)
                const winnerStats = coasterStats[winner];
                const loserStats = coasterStats[loser];
                
                if (!winnerStats || !loserStats) {
                    console.warn(`Battle ${i+1}: Missing stats for ${winner} or ${loser}, skipping...`);
                    continue;
                }
                
                // Step A: Restore rating/RD/volatility to BEFORE this battle by using stored values
                // Support backward compatibility: check both old (eloBefore) and new (ratingBefore) fields
                const winnerRatingBefore = entry.statsA && entry.a === winner ? 
                                          (entry.statsA.ratingBefore !== undefined ? entry.statsA.ratingBefore : entry.statsA.eloBefore) :
                                          entry.statsB && entry.b === winner ?
                                          (entry.statsB.ratingBefore !== undefined ? entry.statsB.ratingBefore : entry.statsB.eloBefore) :
                                          winnerStats.rating;
                const loserRatingBefore = entry.statsA && entry.a === loser ?
                                         (entry.statsA.ratingBefore !== undefined ? entry.statsA.ratingBefore : entry.statsA.eloBefore) :
                                         entry.statsB && entry.b === loser ?
                                         (entry.statsB.ratingBefore !== undefined ? entry.statsB.ratingBefore : entry.statsB.eloBefore) :
                                         loserStats.rating;
                
                const winnerRdBefore = entry.statsA && entry.a === winner ? 
                                      (entry.statsA.rdBefore || GLICKO2_RD_INITIAL) :
                                      entry.statsB && entry.b === winner ?
                                      (entry.statsB.rdBefore || GLICKO2_RD_INITIAL) :
                                      winnerStats.rd;
                const loserRdBefore = entry.statsA && entry.a === loser ?
                                     (entry.statsA.rdBefore || GLICKO2_RD_INITIAL) :
                                     entry.statsB && entry.b === loser ?
                                     (entry.statsB.rdBefore || GLICKO2_RD_INITIAL) :
                                     loserStats.rd;
                
                const winnerVolatilityBefore = entry.statsA && entry.a === winner ?
                                              (entry.statsA.volatilityBefore || GLICKO2_VOLATILITY_INITIAL) :
                                              entry.statsB && entry.b === winner ?
                                              (entry.statsB.volatilityBefore || GLICKO2_VOLATILITY_INITIAL) :
                                              winnerStats.volatility;
                const loserVolatilityBefore = entry.statsA && entry.a === loser ?
                                             (entry.statsA.volatilityBefore || GLICKO2_VOLATILITY_INITIAL) :
                                             entry.statsB && entry.b === loser ?
                                             (entry.statsB.volatilityBefore || GLICKO2_VOLATILITY_INITIAL) :
                                             loserStats.volatility;
                
                // Recalculate using Glicko-2
                const tempWinnerStats = { rating: winnerRatingBefore, rd: winnerRdBefore, volatility: winnerVolatilityBefore };
                const tempLoserStats = { rating: loserRatingBefore, rd: loserRdBefore, volatility: loserVolatilityBefore };
                const result = calculateGlicko2(tempWinnerStats, tempLoserStats);
                
                // Apply new ratings
                winnerStats.rating = result.newWinnerRating;
                winnerStats.rd = result.newWinnerRD;
                winnerStats.volatility = result.newWinnerVolatility;
                loserStats.rating = result.newLoserRating;
                loserStats.rd = result.newLoserRD;
                loserStats.volatility = result.newLoserVolatility;
                
                // Get new ranks
                const winnerRankAfter = getCoasterRank(winner);
                const loserRankAfter = getCoasterRank(loser);
                
                // Calculate potential gains/losses (needed for logging and stats update)
                const winnerPotentialGain = result.newWinnerRating - winnerRatingBefore;
                const loserPotentialLoss = result.newLoserRating - loserRatingBefore;
                
                // Calculate what would have happened if outcome was reversed
                const reversedResult = calculateGlicko2(tempLoserStats, tempWinnerStats);
                const winnerPotentialLoss = reversedResult.newLoserRating - winnerRatingBefore;
                const loserPotentialGain = reversedResult.newWinnerRating - loserRatingBefore;
                
                // Update battle stats in history
                if (entry.statsA && entry.statsB) {
                    // Update ratingBefore/rdBefore/volatilityBefore with the restored values
                    entry.statsA.ratingBefore = (entry.a === winner) ? winnerRatingBefore : loserRatingBefore;
                    entry.statsB.ratingBefore = (entry.b === winner) ? winnerRatingBefore : loserRatingBefore;
                    entry.statsA.rdBefore = (entry.a === winner) ? winnerRdBefore : loserRdBefore;
                    entry.statsB.rdBefore = (entry.b === winner) ? winnerRdBefore : loserRdBefore;
                    entry.statsA.volatilityBefore = (entry.a === winner) ? winnerVolatilityBefore : loserVolatilityBefore;
                    entry.statsB.volatilityBefore = (entry.b === winner) ? winnerVolatilityBefore : loserVolatilityBefore;
                    
                    // Update ratingAfter/rdAfter/volatilityAfter with recalculated values
                    entry.statsA.ratingAfter = (entry.a === winner) ? result.newWinnerRating : result.newLoserRating;
                    entry.statsB.ratingAfter = (entry.b === winner) ? result.newWinnerRating : result.newLoserRating;
                    entry.statsA.rdAfter = (entry.a === winner) ? result.newWinnerRD : result.newLoserRD;
                    entry.statsB.rdAfter = (entry.b === winner) ? result.newWinnerRD : result.newLoserRD;
                    entry.statsA.volatilityAfter = (entry.a === winner) ? result.newWinnerVolatility : result.newLoserVolatility;
                    entry.statsB.volatilityAfter = (entry.b === winner) ? result.newWinnerVolatility : result.newLoserVolatility;
                    
                    // Update ranks
                    entry.statsA.rankAfter = (entry.a === winner) ? winnerRankAfter : loserRankAfter;
                    entry.statsB.rankAfter = (entry.b === winner) ? winnerRankAfter : loserRankAfter;
                    
                    // Store potential gains/losses
                    entry.statsA.potentialGain = (entry.a === winner) ? winnerPotentialGain : loserPotentialGain;
                    entry.statsA.potentialLoss = (entry.a === winner) ? winnerPotentialLoss : loserPotentialLoss;
                    entry.statsB.potentialGain = (entry.b === winner) ? winnerPotentialGain : loserPotentialGain;
                    entry.statsB.potentialLoss = (entry.b === winner) ? winnerPotentialLoss : loserPotentialLoss;
                    
                    // Calculate expected win probabilities
                    const mu_w = glicko2Scale(winnerRatingBefore);
                    const phi_l = glicko2ScaleRD(loserRdBefore);
                    const expectedScore1 = glicko2_E(mu_w, glicko2Scale(loserRatingBefore), phi_l);
                    entry.statsA.expectedWinProbability = (entry.a === winner) ? expectedScore1 : (1 - expectedScore1);
                    entry.statsB.expectedWinProbability = (entry.b === winner) ? expectedScore1 : (1 - expectedScore1);
                }
                
                // Update progress every 50 battles
                if (progressEl && (i + 1) % 50 === 0) {
                    progressEl.textContent = `Iteration ${totalIterations}: Processing battle ${i + 1}/${coasterHistory.length}...`;
                    await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
                }
            }
            
            // Save and update UI after each iteration
            saveData();
            updateRanking();
            
            // Count how many coasters changed ranking positions in this iteration
            let changedPositions = 0;
            Object.values(coasterStats).forEach(stats => {
                const rankAfter = getCoasterRank(stats.name);
                const rankBefore = ranksBefore[stats.name];
                if (rankBefore !== rankAfter) {
                    changedPositions++;
                    console.log(`${stats.name}: #${rankBefore} → #${rankAfter}`);
                }
            });
            
            totalChanges += changedPositions;
            console.log(`🧙 Iteration ${totalIterations} complete: ${changedPositions} coasters changed position.`);
            
            // If no changes, we're done
            if (changedPositions === 0) {
                console.log('🧙 No more changes detected. Wizard converged!');
                break;
            }
            
            // Small delay between iterations for UI updates
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Calculate total time
        const endTime = performance.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(2); // Convert to seconds
        
        // Final summary
        if (progressEl) {
            progressEl.textContent = `✅ Complete! ${totalIterations} iteration${totalIterations !== 1 ? 's' : ''}, ${totalChanges} total changes.`;
            setTimeout(() => {
                progressEl.style.display = 'none';
                progressEl.textContent = '';
            }, 3000);
        }
        
        console.log('🧙 === RANKING WIZARD COMPLETE ===');
        console.log(`Completed ${totalIterations} iterations with ${totalChanges} total ranking changes.`);
        console.log(`⏱️ Total calculation time: ${totalTime}s`);
        
        showToast(`🧙 Wizard complete! ${totalIterations} iteration${totalIterations !== 1 ? 's' : ''}, ${totalChanges} change${totalChanges !== 1 ? 's' : ''} in ${totalTime}s.`, 3500);
            
        } catch (error) {
            console.error('Ranking Wizard error:', error);
            if (progressEl) {
                progressEl.textContent = '❌ Error during recalculation';
                progressEl.style.color = '#e74c3c';
                setTimeout(() => {
                    progressEl.style.color = '';
                }, 3000);
            }
            alert('An error occurred during recalculation. Check console for details.');
        } finally {
            if (wizardBtn) wizardBtn.disabled = false;
        }
    }

    function sortRanking(column) {
        if (currentSort.column === column) {
            currentSort.ascending = !currentSort.ascending;
        } else {
            currentSort.column = column;
            currentSort.ascending = false;
        }
        updateRanking();
    }

    function updateRanking() {
        if (!currentUser) {
            document.getElementById('rankingBody').innerHTML = '';
            return;
        }
        
        const statsArray = Object.values(coasterStats);
        const totalCoasters = statsArray.length;
        const totalBattles = totalBattlesCount;
        const avgBattles = totalBattles > 0 ? (totalBattles * 2 / totalCoasters).toFixed(1) : 0;
        
        const totalPossible = getTotalPossiblePairs();
        const completed = completedPairs.size;
        const progressPercentage = totalPossible > 0 ? ((completed / totalPossible) * 100).toFixed(1) : 0;
        
        const totalBattlesEl = document.getElementById('totalBattles');
        const totalCoastersEl = document.getElementById('totalCoasters');
        const avgBattlesEl = document.getElementById('avgBattlesPerCoaster');
        const progressMatchupsEl = document.getElementById('progressMatchups');
        const progressPercentageEl = document.getElementById('progressPercentage');
        
        if (totalBattlesEl) totalBattlesEl.textContent = totalBattles;
        if (totalCoastersEl) totalCoastersEl.textContent = totalCoasters;
        if (avgBattlesEl) avgBattlesEl.textContent = avgBattles;
        if (progressMatchupsEl) progressMatchupsEl.textContent = `${completed}/${totalPossible}`;
        if (progressPercentageEl) progressPercentageEl.textContent = `${progressPercentage}%`;
        
        const sorted = [...statsArray].sort((a, b) => {
            let aVal, bVal;
            
            switch(currentSort.column) {
                case 'name':
                    aVal = a.name;
                    bVal = b.name;
                    break;
                case 'park':
                    aVal = a.park;
                    bVal = b.park;
                    break;
                case 'manufacturer':
                    aVal = a.manufacturer;
                    bVal = b.manufacturer;
                    break;
                case 'rating':
                case 'elo':
                    aVal = displayedRating(a);
                    bVal = displayedRating(b);
                    break;
                case 'battles':
                    aVal = a.battles;
                    bVal = b.battles;
                    break;
                case 'wins':
                    aVal = a.wins;
                    bVal = b.wins;
                    break;
                case 'losses':
                    aVal = a.losses;
                    bVal = b.losses;
                    break;
                case 'winrate':
                    aVal = a.battles > 0 ? (a.wins / a.battles) : 0;
                    bVal = b.battles > 0 ? (b.wins / b.battles) : 0;
                    break;
                default:
                    aVal = a.rating;
                    bVal = b.rating;
            }
            
            if (typeof aVal === 'string') {
                return currentSort.ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return currentSort.ascending ? aVal - bVal : bVal - aVal;
            }
        });
        
        document.querySelectorAll('.ranking-table th').forEach(th => {
            const text = th.textContent.replace(' ⬆️', '').replace(' ⬇️', '');
            th.textContent = text;
        });
        // Only add arrow for columns except 'rating'
        if (currentSort.column !== 'rating' && currentSort.column !== 'elo') {
            const activeHeader = Array.from(document.querySelectorAll('.ranking-table th'))
                .find(th => th.textContent.toLowerCase().includes(currentSort.column));
            if (activeHeader) {
                const text = activeHeader.textContent.replace(' ⬆️', '').replace(' ⬇️', '');
                activeHeader.textContent = text + (currentSort.ascending ? ' ⬆️' : ' ⬇️');
            }
        }
        
        const tbody = document.getElementById('rankingBody');
        // Mobile card container
        let rankingCardsContainer = document.getElementById('rankingCards');
        if (!rankingCardsContainer) {
            const container = document.createElement('div');
            container.id = 'rankingCards';
            container.className = 'ranking-cards';
            const table = document.querySelector('.ranking-table');
            table.parentNode.insertBefore(container, table.nextSibling);
            rankingCardsContainer = container;
        }
        
        // Unranked section containers
        let seedingSection = document.getElementById('seedingSection');
        if (!seedingSection) {
            const section = document.createElement('div');
            section.id = 'seedingSection';
            section.style.marginTop = '24px';
            section.innerHTML = '<h3 style="color: #2C3E50; font-size: 1.2em; margin-bottom: 15px;">Seeding Coasters (Being Ranked)</h3>';
            const container = document.createElement('div');
            container.id = 'seedingList';
            section.appendChild(container);
            const table = document.querySelector('.ranking-table');
            table.parentNode.appendChild(section);
            seedingSection = section;
        }
        
        let unrankedSection = document.getElementById('unrankedSection');
        if (!unrankedSection) {
            const section = document.createElement('div');
            section.id = 'unrankedSection';
            section.style.marginTop = '24px';
            section.innerHTML = '<h3 style="color: #95a5a6; font-size: 1.2em; margin-bottom: 15px;">Waiting Coasters</h3>';
            const container = document.createElement('div');
            container.id = 'unrankedList';
            container.style.color = '#7f8c8d';
            container.style.fontSize = '0.95em';
            container.style.lineHeight = '1.8';
            section.appendChild(container);
            const table = document.querySelector('.ranking-table');
            table.parentNode.appendChild(section);
            unrankedSection = section;
        }

        
        // Split coasters by phase: ranked (5+ battles) vs seeding vs waiting
        const rankedCoasters = statsArray.filter(c => {
            const phase = c.phase || 'waiting';
            return phase === 'ranked';
        });
        const seedingCoasters = statsArray.filter(c => {
            const phase = c.phase || 'waiting';
            return phase === 'seeding';
        });
        const waitingCoasters = statsArray.filter(c => {
            const phase = c.phase || 'waiting';
            return phase === 'waiting';
        });

        // First, calculate true ranks based on rating (not sort position) - only for ranked coasters
        const ratingsSorted = [...rankedCoasters].sort((a, b) => b.rating - a.rating);
        const rankMap = {};
        ratingsSorted.forEach((coaster, index) => {
            rankMap[coaster.name] = index + 1;
        });
        
        // Sort ranked coasters according to current sort settings
        const sortedRanked = [...rankedCoasters].sort((a, b) => {
            let aVal, bVal;
            
            switch(currentSort.column) {
                case 'name':
                    aVal = a.name;
                    bVal = b.name;
                    break;
                case 'park':
                    aVal = a.park;
                    bVal = b.park;
                    break;
                case 'manufacturer':
                    aVal = a.manufacturer;
                    bVal = b.manufacturer;
                    break;
                case 'rating':
                case 'elo':
                    aVal = displayedRating(a);
                    bVal = displayedRating(b);
                    break;
                case 'battles':
                    aVal = a.battles;
                    bVal = b.battles;
                    break;
                case 'wins':
                    aVal = a.wins;
                    bVal = b.wins;
                    break;
                case 'losses':
                    aVal = a.losses;
                    bVal = b.losses;
                    break;
                case 'winrate':
                    aVal = a.battles > 0 ? (a.wins / a.battles) : 0;
                    bVal = b.battles > 0 ? (b.wins / b.battles) : 0;
                    break;
                default:
                    aVal = a.rating;
                    bVal = b.rating;
            }
            
            if (typeof aVal === 'string') {
                return currentSort.ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return currentSort.ascending ? aVal - bVal : bVal - aVal;
            }
        });

        // Build table rows and mobile cards for RANKED coasters only
        const rowsHtml = [];
        const cardsHtml = [];

        sortedRanked.forEach((coaster, index) => {
            const rank = rankMap[coaster.name]; // Use true rank, not sorted position
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            const winrate = coaster.battles > 0 ? ((coaster.wins / coaster.battles) * 100).toFixed(1) : '0.0';
            const escapedName = coaster.name.replace(/'/g, "\\'");

                const dataId = (coaster.name || '').replace(/"/g, '&quot;');
                // For top 3, show only medal; for others show rank number
                const rankDisplay = rank <= 3 ? `<span class="rank-medal">${medal}</span>` : rank;
                rowsHtml.push(`
                    <tr data-id="${dataId}">
                        <td>${rankDisplay}</td>
                        <td><strong>${coaster.name}</strong></td>
                        <td>${coaster.park}</td>
                        <td>${coaster.manufacturer}</td>
                        <td><span class="elo-score">${Math.round(displayedRating(coaster))} ± ${Math.round(coaster.rd)}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.battles}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.wins}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.losses}</span></td>
                    </tr>
                `);

            // Card for mobile
            const rankBadgeClass = rank <= 3 ? 'rank-badge top-3' : 'rank-badge';
            cardsHtml.push(`
                <div class="ranking-card" data-rank="${rank}">
                    <div class="${rankBadgeClass}">${rank}</div>
                    <div class="ranking-left">
                        <div class="name">${coaster.name}</div>
                        <div class="meta">${coaster.park} • ${coaster.manufacturer} • <span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', null)" title="View battle history">${coaster.wins}-${coaster.losses}</span></div>
                    </div>
                    <div class="ranking-right">
                            <div class="elo">${Math.round(displayedRating(coaster))}</div>
                        </div>
                </div>
            `);
        });

        // If no ranked coasters yet, show message in table but continue to populate seeding/waiting sections
        if (rankedCoasters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-battles">Start met battlen om je ranking te zien! 🎢</td></tr>';
            rankingCardsContainer.innerHTML = '';
        } else {
            tbody.innerHTML = rowsHtml.join('');
            rankingCardsContainer.innerHTML = cardsHtml.join('');
        }
        
        // Build seeding section (Seeding coasters - being actively ranked)
        const seedingList = document.getElementById('seedingList');
        if (seedingCoasters.length > 0) {
            // Sort by number of battles (most battles first to show progress)
            const sortedSeeding = [...seedingCoasters].sort((a, b) => b.battles - a.battles);
            
            let seedingTableHtml = '<table class="ranking-table" style="width: 100%; margin-top: 10px; table-layout: fixed;"><thead><tr>';
            seedingTableHtml += '<th style="width: 60px;">Rank</th>';
            seedingTableHtml += '<th style="min-width: 140px;">Name</th>';
            seedingTableHtml += '<th style="min-width: 120px;">Park</th>';
            seedingTableHtml += '<th style="min-width: 110px;">Manufacturer</th>';
            seedingTableHtml += '<th style="width: 140px;">Rating</th>';
            seedingTableHtml += '<th style="width: 75px;">Battles</th>';
            seedingTableHtml += '<th style="width: 65px;">Wins</th>';
            seedingTableHtml += '<th style="width: 75px;">Losses</th>';
            seedingTableHtml += '</tr></thead><tbody>';
            
            sortedSeeding.forEach(coaster => {
                const escapedName = coaster.name.replace(/'/g, "\\'");
                const dataId = (coaster.name || '').replace(/"/g, '&quot;');
                
                seedingTableHtml += `
                    <tr data-id="${dataId}">
                        <td style="color: #f59e0b;">-</td>
                        <td><strong>${coaster.name}</strong></td>
                        <td>${coaster.park}</td>
                        <td>${coaster.manufacturer}</td>
                        <td><span class="elo-score">${Math.round(displayedRating(coaster))} ± ${Math.round(coaster.rd)}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.battles}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.wins}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.losses}</span></td>
                    </tr>
                `;
            });
            
            seedingTableHtml += '</tbody></table>';
            seedingList.innerHTML = seedingTableHtml;
            seedingSection.style.display = 'block';
        } else {
            seedingSection.style.display = 'none';
        }
        
        // Build waiting section (Waiting coasters - not yet started)
        const unrankedList = document.getElementById('unrankedList');
        if (waitingCoasters.length > 0) {
            // Sort alphabetically by name
            const sortedWaiting = [...waitingCoasters].sort((a, b) => a.name.localeCompare(b.name));
            
            let waitingTableHtml = '<table class="ranking-table" style="width: 100%; margin-top: 10px; table-layout: fixed; opacity: 0.7;"><thead><tr>';
            waitingTableHtml += '<th style="width: 60px;">Rank</th>';
            waitingTableHtml += '<th style="min-width: 140px;">Name</th>';
            waitingTableHtml += '<th style="min-width: 120px;">Park</th>';
            waitingTableHtml += '<th style="min-width: 110px;">Manufacturer</th>';
            waitingTableHtml += '<th style="width: 140px;">Rating</th>';
            waitingTableHtml += '<th style="width: 75px;">Battles</th>';
            waitingTableHtml += '<th style="width: 65px;">Wins</th>';
            waitingTableHtml += '<th style="width: 75px;">Losses</th>';
            waitingTableHtml += '</tr></thead><tbody>';
            
            sortedWaiting.forEach(coaster => {
                const escapedName = coaster.name.replace(/'/g, "\\'");
                const dataId = (coaster.name || '').replace(/"/g, '&quot;');
                
                waitingTableHtml += `
                    <tr data-id="${dataId}" style="color: #95a5a6;">
                        <td>-</td>
                        <td><strong>${coaster.name}</strong></td>
                        <td>${coaster.park}</td>
                        <td>${coaster.manufacturer}</td>
                        <td><span class="elo-score" style="color: #95a5a6;">-</span></td>
                        <td>0</td>
                        <td>0</td>
                        <td>0</td>
                    </tr>
                `;
            });
            
            waitingTableHtml += '</tbody></table>';
            unrankedList.innerHTML = waitingTableHtml;
            unrankedSection.style.display = 'block';
        } else {
            unrankedSection.style.display = 'none';
        }
        
        // Match tab heights after content is rendered
        setTimeout(() => matchTabHeights(), 50);
    }

    function filterRanking() {
        const searchTerm = document.getElementById('searchBox').value.toLowerCase();
        const rows = document.querySelectorAll('#rankingBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    function viewCoasterHistory(coasterName, filterType = null) {
        // Check if we're in an overlay
        const profileOverlay = document.getElementById('historyOverlayProfile');
        const battleOverlay = document.getElementById('historyOverlayBattle');
        const rankingOverlay = document.getElementById('historyOverlayRanking');
        
        let inOverlay = null;
        if (profileOverlay && profileOverlay.style.display === 'block') {
            inOverlay = 'profile';
        } else if (battleOverlay && battleOverlay.style.display === 'block') {
            inOverlay = 'battle';
        } else if (rankingOverlay && rankingOverlay.style.display === 'block') {
            inOverlay = 'ranking';
        }
        
        if (inOverlay) {
            // We're in an overlay, update that overlay's search
            const suffix = inOverlay.charAt(0).toUpperCase() + inOverlay.slice(1);
            const historySearch = document.getElementById('historySearch' + suffix);
            const clearBtn = document.getElementById('clearHistorySearchBtn' + suffix);
            if (historySearch && clearBtn) {
                historySearch.value = coasterName;
                clearBtn.style.display = 'block';
                coasterSelected = true;
                
                // Apply filter if specified (wins or losses)
                if (filterType && (filterType === 'wins' || filterType === 'losses')) {
                    setHistoryFilter(filterType, inOverlay);
                } else {
                    displayHistoryInOverlay(inOverlay);
                    updateHistoryFilterUI(inOverlay);
                }
            }
        } else {
            // Not in an overlay, check which tab is active
            const rankingTab = document.getElementById('ranking-tab');
            const isRankingActive = rankingTab && rankingTab.classList.contains('active');
            
            if (isRankingActive) {
                // We're on ranking tab, open ranking overlay
                const historySearch = document.getElementById('historySearchRanking');
                const clearBtn = document.getElementById('clearHistorySearchBtnRanking');
                if (historySearch && clearBtn) {
                    historySearch.value = coasterName;
                    clearBtn.style.display = 'block';
                    coasterSelected = true;
                    
                    // Show the overlay
                    showHistoryOverlay('ranking');
                    
                    // Apply filter if specified (wins or losses)
                    if (filterType && (filterType === 'wins' || filterType === 'losses')) {
                        setHistoryFilter(filterType, 'ranking');
                    } else {
                        updateHistoryFilterUI('ranking');
                    }
                }
            } else {
                // Not on ranking tab, switch to history tab (legacy behavior)
                switchTab('history');
                
                // Set the search box value to the coaster name
                const historySearch = document.getElementById('historySearch');
                const clearBtn = document.getElementById('clearHistorySearchBtn');
                if (historySearch && clearBtn) {
                    historySearch.value = coasterName;
                    clearBtn.style.display = 'block';
                    
                    // Mark as selected
                    coasterSelected = true;
                    
                    // Trigger the search/filter
                    displayHistory();
                    updateHistoryFilterUI();
                }
            }
        }
    }

    function resetRankingOnly() {
        if (!currentUser) return;
        
        // Show custom modal for ranking reset
        const modal = document.getElementById('resetRankingModal');
        const userName = currentUser === 'luca' ? 'Luca' : 'Wouter';
        document.getElementById('resetRankingUserName').textContent = userName;
        modal.classList.add('show');
    }

    function closeResetRankingModal() {
        const modal = document.getElementById('resetRankingModal');
        modal.classList.remove('show');
    }

    function confirmResetRanking() {
        closeResetRankingModal();
        
        // Add a history entry for the reset event
        const resetEntry = {
            pairKey: 'RESET_EVENT',
            left: null,
            right: null,
            a: null,
            b: null,
            winner: null,
            loser: null,
            timestamp: new Date().toISOString(),
            seed: null,
            isResetEvent: true
        };
        coasterHistory.push(resetEntry);
        
        // Reset only ranking stats, preserve history, level, XP, and achievements
        coasterStats = initializeStats();
        totalBattlesCount = 0;
        completedPairs = new Set();
        
        // Initialize seeding phase: promote 25 random coasters to seeding
        promoteWaitingToSeeding(true);
        console.log('Reset ranking: promoted initial batch to seeding phase');
        
        // DO NOT reset level, XP, or achievements - they are preserved
        
        saveData();
        displayBattle();
        updateRanking();
        displayHome(); // Refresh to update level display
        displayHistory(); // Refresh history to show reset entry
        alert('Ranking is gereset! History, XP, level en achievements zijn behouden. 🔄');
    }

    function resetAllData() {
        if (!currentUser) return;
        
        // Show custom modal for full reset
        const modal = document.getElementById('resetModal');
        const userName = currentUser === 'luca' ? 'Luca' : 'Wouter';
        document.getElementById('resetUserName').textContent = userName;
        modal.classList.add('show');
    }

    function closeResetModal() {
        const modal = document.getElementById('resetModal');
        modal.classList.remove('show');
    }

    async function confirmReset() {
        closeResetModal();
        
        // Show loading overlay
        const overlay = document.getElementById('imageLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.remove('hidden');
        }
        
        // Clear all image cache
        const keys = Object.keys(localStorage);
        let clearedImages = 0;
        keys.forEach(key => {
            if (key.startsWith('coasterImage_')) {
                localStorage.removeItem(key);
                clearedImages++;
            }
        });
        console.log(`🧹 Cleared ${clearedImages} cached images during reset`);
        
        // Reset image load stats
        imageLoadStats = {
            loaded: 0,
            total: 0,
            failed: 0,
            cached: 0
        };
        
        // Reload CSV data to ensure we have the latest coasters
        await reloadCoasterCSVData();
        
        // Update coasters array for current user
        if (currentUser === 'luca') {
            coasters = coastersDataLuca;
        } else {
            coasters = coastersDataWouter;
        }
        
        // Perform the full reset
        coasterStats = initializeStats();
        totalBattlesCount = 0;
        coasterHistory = [];
        completedPairs = new Set();
        
        // Initialize seeding phase with coasters (like on first load)
        promoteWaitingToSeeding(true);
        
        // Reset level and XP
        userLevel = 1;
        totalXPEarned = 0;
        localStorage.removeItem(`userLevel_${currentUser}`);
        localStorage.removeItem(`totalXPEarned_${currentUser}`);
        
        // Reset achievements
        if (typeof achievementManager !== 'undefined') {
            achievementManager.unlockedAchievements.clear();
            achievementManager.leftStreak = 0;
            achievementManager.rightStreak = 0;
            achievementManager.perfectMatches = 0;
            achievementManager.closeFights = 0;
            achievementManager.sessionBattles = 0;
            achievementManager.lastBattleDate = null;
            achievementManager.consecutiveDays = 0;
            achievementManager.dailyBattleDates = new Set();
            achievementManager.save(currentUser);
            
            // Clear localStorage for achievements
            localStorage.removeItem(`achievements_${currentUser}`);
            localStorage.removeItem(`achievementStats_${currentUser}`);
        }
        
        saveData();
        
        // Reload all images from scratch
        await preloadAllCoasterImages();
        
        // Now refresh displays
        displayBattle();
        updateRanking();
        displayHome(); // Refresh to update level display
        updatePinsDisplay();
        alert('Alle data is gereset! 🔄');
    }

    // Save user preference when switching (wrap original function)
    const originalSwitchUser = switchUser;
    switchUser = function(user) {
        originalSwitchUser(user);
        localStorage.setItem('lastUser', user);
    };

    // Creating a downloadable CSV of the current ranking
function downloadRankingCSV() {
    if (!currentUser) {
        return;
    }
    
    if (Object.keys(coasterStats).length === 0) {
        alert('Geen ranking data om te downloaden.');
        return;
    }
    
    // Sort by rating (same as default ranking view)
    const statsArray = Object.values(coasterStats);
    const sorted = [...statsArray].sort((a, b) => b.rating - a.rating);
    
    // Create CSV header
    let csv = 'Rank,Naam,Park,Fabrikant,Rating,RD,Volatility,Battles,Wins,Losses,Win%\n';
    
    // Add data rows
    sorted.forEach((coaster, index) => {
        const rank = index + 1;
        const winrate = coaster.battles > 0 ? ((coaster.wins / coaster.battles) * 100).toFixed(1) : '0.0';
        
        // Escape commas and quotes in text fields
        const escapeCsv = (text) => {
            if (typeof text !== 'string') return text;
            if (text.includes(',') || text.includes('"') || text.includes('\n')) {
                return '"' + text.replace(/"/g, '""') + '"';
            }
            return text;
        };
        
        csv += `${rank},${escapeCsv(coaster.name)},${escapeCsv(coaster.park)},${escapeCsv(coaster.manufacturer)},${Math.round(coaster.rating)},${Math.round(coaster.rd)},${coaster.volatility.toFixed(6)},${coaster.battles},${coaster.wins},${coaster.losses},${winrate}\n`;
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    link.href = url;
    link.download = `coaster_ranking_${currentUser}_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('✅ CSV downloaded!');
}

// ============================================
// ACHIEVEMENTS SYSTEM INTEGRATION
// ============================================

// Gather current game statistics for achievement checking
function getGameStats() {
    const statsArray = Object.values(coasterStats);
    
    // Check if any coaster is ranked #1
    const sorted = [...statsArray].sort((a, b) => b.rating - a.rating);
    const hasTopRankedCoaster = sorted.length > 0;
    
    // Check if all coasters have minimum battles
    const allCoastersMinBattles = statsArray.length > 0 ? 
        Math.min(...statsArray.map(s => s.battles)) : 0;
    
    // Check if all pairs completed
    const allPairsCompleted = areAllPairsCompleted();
    
    // Get unique parks and manufacturers from battled coasters
    const battledCoasters = statsArray.filter(s => s.battles > 0);
    const uniqueParks = new Set();
    const uniqueManufacturers = new Set();
    for (const coaster of battledCoasters) {
        if (coaster.park) uniqueParks.add(coaster.park);
        if (coaster.manufacturer) uniqueManufacturers.add(coaster.manufacturer);
    }
    
    return {
        totalBattles: totalBattlesCount,
        sessionBattles: achievementManager.sessionBattles,
        closeFights: achievementManager.closeFights,
        underdogWins: achievementManager.underdogWins,
        underdogWinStreak: achievementManager.underdogWinStreak,
        hasTopRankedCoaster,
        allCoastersMinBattles,
        allPairsCompleted,
        leftStreak: achievementManager.leftStreak,
        rightStreak: achievementManager.rightStreak,
        alternatingStreak: achievementManager.alternatingStreak,
        perfectMatches: achievementManager.perfectMatches,
        uniqueParks: uniqueParks.size,
        uniqueManufacturers: uniqueManufacturers.size,
        consecutiveDays: achievementManager.consecutiveDays,
        siblingBattles: achievementManager.siblingBattles,
        usedKeyboard: achievementManager.usedKeyboard,
        usedNumberKeys: achievementManager.usedNumberKeys
    };
}

// Check for new achievements and show toasts
function checkAndShowAchievements() {
    if (!currentUser || typeof achievementManager === 'undefined') return;
    
    const stats = getGameStats();
    const newAchievements = achievementManager.checkAchievements(stats, currentUser);
    
    // Show toast for each new achievement with staggered timing
    newAchievements.forEach((achievement, index) => {
        setTimeout(() => {
            console.log(`Achievement unlocked: ${achievement.name}`);
            showAchievementToast(achievement);
        }, index * 600); // Stagger by 600ms
    });
    
    // Always update pins display (not just when new pins)
    updatePinsDisplay();
}

// Render the pins display (in profile overlay)
function updatePinsDisplay() {
    
    if (typeof achievementManager === 'undefined') {
        console.warn('achievementManager is undefined');
        return;
    }
    
    const grid = document.getElementById('pinsGrid');
    const filterCounter = document.getElementById('achievementFilterCounter');
    
    if (!grid) {
        console.warn('pinsGrid element not found');
        return;
    }
    
    const pins = achievementManager.getAllAchievements();
    const unlockedCount = achievementManager.getUnlockedCount();
    const totalCount = achievementManager.getTotalCount();
    const percentage = Math.round((unlockedCount / totalCount) * 100);
    
    // Update filter counter
    if (filterCounter) filterCounter.textContent = `${unlockedCount}/${totalCount} unlocked`;
    
    // Render pin cards
    grid.innerHTML = pins.map(pin => {
        const lockedClass = pin.unlocked ? 'unlocked' : 'locked';
        const categoryClass = `category-${pin.category || 'battles'}`;
        
        let dateHtml = '';
        if (pin.unlocked && pin.unlockedDate) {
            try {
                const date = new Date(pin.unlockedDate);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                dateHtml = `<div class="achievement-date">Unlocked ${dateStr}</div>`;
            } catch (e) {
                // Ignore date formatting errors
            }
        }
        
        return `
            <div class="achievement-card ${lockedClass} ${categoryClass}" data-category="${pin.category || 'battles'}">
                <div class="achievement-icon">${pin.icon}</div>
                <div class="achievement-name">${pin.name}</div>
                <div class="achievement-desc">${pin.description}</div>
                ${dateHtml}
            </div>
        `;
    }).join('');
}

// Filter pins by category
function filterPins(category) {
    const grid = document.getElementById('pinsGrid');
    if (!grid) return;
    
    const cards = grid.querySelectorAll('.achievement-card');
    const filterButtons = document.querySelectorAll('.filter-tag');
    
    // Update active state on filter buttons
    filterButtons.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide cards based on filter
    cards.forEach(card => {
        if (category === 'all') {
            card.style.display = '';
        } else {
            const hasCategory = card.classList.contains(`category-${category}`);
            card.style.display = hasCategory ? '' : 'none';
        }
    });
}

// Show pins overlay
function showPinsOverlay() {
    const overlay = document.getElementById('pinsOverlay');
    const profileContent = document.getElementById('profileContent');
    if (!overlay) return;
    
    // Update pins display before showing
    updatePinsDisplay();
    
    // Hide profile content and show overlay
    if (profileContent) profileContent.style.display = 'none';
    overlay.style.display = 'block';
    
    // Scroll to top of overlay
    setTimeout(() => {
        overlay.scrollTop = 0;
    }, 0);
}

// Hide pins overlay
function hidePinsOverlay() {
    const overlay = document.getElementById('pinsOverlay');
    const profileContent = document.getElementById('profileContent');
    if (!overlay) return;
    
    overlay.style.display = 'none';
    if (profileContent) profileContent.style.display = 'block';
}

// Show history overlay
function showHistoryOverlay(source) {
    const currentUser = localStorage.getItem('lastUser');
    if (!currentUser) {
        return;
    }

    if (source === 'profile') {
        const overlay = document.getElementById('historyOverlayProfile');
        const profileContent = document.getElementById('profileContent');
        if (!overlay) return;
        
        // Update history display before showing
        updateHistoryDisplay('profile');
        
        // Hide profile content and show overlay
        if (profileContent) profileContent.style.display = 'none';
        overlay.style.display = 'block';
        
        // Scroll to top of overlay
        setTimeout(() => {
            overlay.scrollTop = 0;
        }, 0);
    } else if (source === 'battle') {
        const overlay = document.getElementById('historyOverlayBattle');
        const battleArea = document.querySelector('#battle-tab .battle-area');
        const historyBtn = document.querySelector('#battle-tab .history-nav-btn');
        if (!overlay) return;
        
        // Update history display before showing
        updateHistoryDisplay('battle');
        
        // Hide battle area and button, show overlay
        if (battleArea) battleArea.style.display = 'none';
        if (historyBtn) historyBtn.style.display = 'none';
        overlay.style.display = 'block';
        
        // Scroll to top of overlay
        setTimeout(() => {
            overlay.scrollTop = 0;
        }, 0);
    } else if (source === 'ranking') {
        const overlay = document.getElementById('historyOverlayRanking');
        if (!overlay) return;
        
        // Update history display before showing
        updateHistoryDisplay('ranking');
        
        // Hide ranking content
        const rankingHeader = document.querySelector('#ranking-tab .ranking-header');
        const rankingTable = document.querySelector('#ranking-tab .ranking-table');
        if (rankingHeader) rankingHeader.style.display = 'none';
        if (rankingTable) rankingTable.style.display = 'none';
        
        overlay.style.display = 'block';
        
        // Scroll to top of overlay
        setTimeout(() => {
            overlay.scrollTop = 0;
        }, 0);
    }
}

// Hide history overlay
function hideHistoryOverlay(source) {
    if (source === 'profile') {
        const overlay = document.getElementById('historyOverlayProfile');
        const profileContent = document.getElementById('profileContent');
        if (!overlay) return;
        
        overlay.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
    } else if (source === 'battle') {
        const overlay = document.getElementById('historyOverlayBattle');
        const battleArea = document.querySelector('#battle-tab .battle-area');
        const historyBtn = document.querySelector('#battle-tab .history-nav-btn');
        if (!overlay) return;
        
        overlay.style.display = 'none';
        if (battleArea) battleArea.style.display = '';
        if (historyBtn) historyBtn.style.display = '';
    } else if (source === 'ranking') {
        const overlay = document.getElementById('historyOverlayRanking');
        if (!overlay) return;
        
        overlay.style.display = 'none';
        
        // Restore ranking content
        const rankingHeader = document.querySelector('#ranking-tab .ranking-header');
        const rankingTable = document.querySelector('#ranking-tab .ranking-table');
        if (rankingHeader) rankingHeader.style.display = '';
        if (rankingTable) rankingTable.style.display = '';
    }
}

// Update history display for overlay
function updateHistoryDisplay(source) {
    displayHistoryInOverlay(source);
}

// Display history in overlay
function displayHistoryInOverlay(source) {
    let suffix;
    if (source === 'profile') {
        suffix = 'Profile';
    } else if (source === 'battle') {
        suffix = 'Battle';
    } else if (source === 'ranking') {
        suffix = 'Ranking';
    } else {
        return;
    }
    const container = document.getElementById('historyContainer' + suffix);
    if (!container) return;
    if (!coasterHistory || coasterHistory.length === 0) {
        container.innerHTML = '<div class="no-battles">No battles yet — start choosing to build your history.</div>';
        return;
    }
    const input = document.getElementById('historySearch' + suffix);
    const query = input ? input.value.trim() : '';
    const qLower = (query || '').toLowerCase();
    const hasSelected = !!qLower;

    // Ensure filter UI reflects whether a coaster is selected
    updateHistoryFilterUI(source);

    // Render only pair, highlight winner with a green pill and add a subtle delete button
    const rows = coasterHistory.slice().reverse().map((entry, idx) => {
        const originalIndex = coasterHistory.length - 1 - idx;
        
        // Handle reset event specially
        if (entry.isResetEvent) {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="history-row reset-event">
                    <div class="history-pair" style="justify-content: center;">
                        <div style="color: #f59e0b; font-weight: 700; text-align: center;">
                            🔄 Ranking Reset - ${dateStr} ${timeStr}
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="history-delete" title="Delete this entry" onclick="deleteHistoryEntry(${originalIndex})">✖</button>
                    </div>
                </div>
            `;
        }
        
        // Use stored left/right positions if available, otherwise fall back to a/b
        let a = entry.left || entry.a;
        let b = entry.right || entry.b;
        const winner = entry.winner;

        const pairText = `${a} ↔ ${b}`;
        // If there's a search query, only show rows that include the query
        if (qLower && !pairText.toLowerCase().includes(qLower) && !a.toLowerCase().includes(qLower) && !b.toLowerCase().includes(qLower)) {
            return '';
        }

        // If there's a search query, put the matching coaster on the left
        if (qLower) {
            const aMatches = a.toLowerCase().includes(qLower);
            const bMatches = b.toLowerCase().includes(qLower);
            // If only b matches, swap them so the selected coaster appears left
            if (!aMatches && bMatches) {
                [a, b] = [b, a];
            }
        }

        // Apply active filter
        if (typeof historyFilter !== 'undefined' && historyFilter && historyFilter !== 'all') {
            const selectedName = query;
            if (historyFilter === 'wins') {
                // only show battles where selectedName is the winner (requires selected coaster)
                if (!hasSelected || winner !== selectedName) return '';
            } else if (historyFilter === 'losses') {
                // only show battles where selectedName lost (requires selected coaster)
                if (!hasSelected || winner === selectedName) return '';
                if (a !== selectedName && b !== selectedName) return '';
            } else if (historyFilter === 'close') {
                // show all close fights (or only those involving selected coaster if one is selected)
                if (!entry.closeFight) return '';
                if (hasSelected && a !== selectedName && b !== selectedName) return '';
            }
        }

        const winnerClass = (entry && entry.closeFight) ? 'winner-pill close-win' : 'winner-pill';
        const aHtml = (winner === a) ? `<span class="clickable-history-name" onclick="viewCoasterHistory('${a.replace(/'/g, "\\'")}')" style="cursor:pointer;"><span class="${winnerClass}">${escapeHtml(a)}</span></span>` : `<span class="clickable-history-name" onclick="viewCoasterHistory('${a.replace(/'/g, "\\'")}')" style="cursor:pointer;">${escapeHtml(a)}</span>`;
        const bHtml = (winner === b) ? `<span class="clickable-history-name" onclick="viewCoasterHistory('${b.replace(/'/g, "\\'")}')" style="cursor:pointer;"><span class="${winnerClass}">${escapeHtml(b)}</span></span>` : `<span class="clickable-history-name" onclick="viewCoasterHistory('${b.replace(/'/g, "\\'")}')" style="cursor:pointer;">${escapeHtml(b)}</span>`;

        const arrowHtml = entry && entry.closeFight ? `<span class="close-fight-icon" title="Close fight">⚔️</span>` : '↔';

        return `
            <div class="history-row">
                <div class="history-pair">
                    <div class="history-name left"><strong>${aHtml}</strong></div>
                    <div class="history-arrow">${arrowHtml}</div>
                    <div class="history-name right"><strong>${bHtml}</strong></div>
                </div>
                <div class="history-actions">
                    <button class="history-switch" title="Switch winner" onclick="switchHistoryWinner(${originalIndex})">⇄</button>
                    <button class="history-delete" title="Delete this matchup" onclick="deleteHistoryEntry(${originalIndex})">✖</button>
                </div>
            </div>
        `;
    }).join('');

    // If filtering removed all rows, show empty state
    if (!rows || rows.trim() === '') {
        container.innerHTML = '<div class="no-battles">No matchups found for this search.</div>';
    } else {
        container.innerHTML = rows;
    }
}

// ===== CREDIT CARD FUNCTIONS =====

// Manufacturer color mapping (25% more saturated and 10% darker, then reduced by 20% saturation)
const manufacturerColors = {
    'B&M': '#DCDCDE',
    'Bolliger & Mabillard': '#DCDCDE',
    'Intamin': '#E9BFC0',
    'Vekoma': '#F5D2B9',
    'Mack Rides': '#C4D3EA',
    'Gerstlauer': '#CAE0D2',
    'RMC': '#D6CABB',
    'Rocky Mountain Construction': '#D6CABB',
    'GCI': '#F5EAB9',
    'Great Coasters International': '#F5EAB9',
    'Maurer Rides': '#DACFEB',
    'S&S': '#E3DFD3',
    'Zamperla': '#EACEDE',
    'Zierer': '#CAE0E0',
    'Schwarzkopf': '#DED7CC',
    'Other': '#DED7CC',
    'Unknown': '#DED7CC'
};

// Sample coaster database (will be replaced with real data later)
const coasterDatabase = {
    'steelvengeance': {
        id: 'steelvengeance',
        name: 'Steel Vengeance',
        park: 'Cedar Point',
        country: 'USA',
        manufacturer: 'Rocky Mountain Construction',
        type: 'Hybrid',
        models: ['I-Box Hybrid'],
        topSpeed: 119,
        height: 62,
        length: 1790,
        inversions: 4,
        playerRank: 2,
        openingYear: 2018,
        image: 'images/steel-vengeance.jpg'
    },
    'bluefire': {
        id: 'bluefire',
        name: 'Blue Fire Megacoaster',
        park: 'Europa-Park',
        country: 'Germany',
        manufacturer: 'Mack Rides',
        type: 'Steel',
        models: ['Launch coaster'],
        topSpeed: 100,
        height: 38,
        length: 1056,
        inversions: 4,
        playerRank: 14,
        openingYear: 2009,
        image: 'images/blue-fire.jpg'
    },
    'thesmiler': {
        id: 'thesmiler',
        name: 'The Smiler',
        park: 'Alton Towers',
        country: 'UK',
        manufacturer: 'Gerstlauer',
        type: 'Steel',
        models: ['Infinity coaster'],
        topSpeed: 85,
        height: 30,
        length: 1170,
        inversions: 14,
        playerRank: 29,
        openingYear: 2013,
        image: 'images/the-smiler.jpg'
    }
};

function openCreditCard(coasterId) {
    const coaster = coasterDatabase[coasterId];
    if (!coaster) return;

    const overlay = document.getElementById('creditCardOverlay');
    const container = document.getElementById('creditCardContainer');
    
    // Get manufacturer color
    const bgColor = manufacturerColors[coaster.manufacturer] || manufacturerColors['Unknown'];
    
    // Get border color (25% more saturated and 10% darker)
    const borderColors = {
        'B&M': '#A8AAAC',
        'Bolliger & Mabillard': '#A8AAAC',
        'Intamin': '#C42424',
        'Vekoma': '#D97316',
        'Mack Rides': '#2563EB',
        'Gerstlauer': '#3D7A47',
        'RMC': '#7A4A1F',
        'Rocky Mountain Construction': '#7A4A1F',
        'GCI': '#D9A616',
        'Great Coasters International': '#D9A616',
        'Maurer Rides': '#6F3FA8',
        'S&S': '#B8A471',
        'Zamperla': '#C45A85',
        'Zierer': '#2E9494',
        'Schwarzkopf': '#9F9A8F',
        'Other': '#827D78',
        'Unknown': '#827D78'
    };
    const borderColor = borderColors[coaster.manufacturer] || borderColors['Unknown'];
    
    // Build rank badge
    let rankClass = 'rank-other';
    let rankDisplay = coaster.playerRank;
    if (coaster.playerRank === 1) rankClass = 'rank-gold';
    else if (coaster.playerRank === 2) rankClass = 'rank-silver';
    else if (coaster.playerRank === 3) rankClass = 'rank-bronze';
    
    // Type emoji
    const typeEmoji = coaster.type === 'Wood' ? '🌲' : coaster.type === 'Steel' ? '⚔️' : '🔄';
    
    // Check if stats qualify for metallic shine
    const speedShine = coaster.topSpeed >= 100;
    const heightShine = coaster.height >= 50;
    const lengthShine = coaster.length >= 1250;
    const inversionsShine = coaster.inversions >= 5;
    
    // Display values or small dash
    const displaySpeed = coaster.topSpeed ? coaster.topSpeed : '-';
    const displayHeight = coaster.height ? coaster.height : '-';
    const displayLength = coaster.length ? coaster.length : '-';
    const displayInversions = coaster.inversions !== undefined && coaster.inversions !== null ? coaster.inversions : '-';
    
    container.innerHTML = `
        <div class="credit-card-outer" style="border: 6px solid ${bgColor};">
            <div class="credit-card" style="background-color: ${bgColor}; border: 9px solid ${borderColor};">
                <div class="credit-card-image" style="border-color: ${borderColor};">
                    ${coaster.image ? `<img src="${coaster.image}" alt="${coaster.name}" class="credit-card-img" />` : `
                        <div class="credit-card-placeholder">
                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M40 10L45 30H65L50 42L55 62L40 50L25 62L30 42L15 30H35L40 10Z" fill="#D1D5DB" opacity="0.3"/>
                            </svg>
                        </div>
                    `}
                    <div class="credit-rank-badge ${rankClass}">${rankDisplay}</div>
                </div>
                
                <div class="credit-card-info">
                    <h1 class="credit-card-name">${coaster.name}${coaster.defunct ? '<span class="defunct-marker">†</span>' : ''}</h1>
                    <div class="credit-card-divider"></div>
                    <p class="credit-card-location">${coaster.park} - ${coaster.country}${coaster.openingYear ? ' - ' + coaster.openingYear : ''}</p>
                    <p class="credit-card-meta">${coaster.manufacturer} - ${coaster.type}${coaster.models.length > 0 ? ' - ' + coaster.models.join(' / ') : ''}</p>
                    <div class="credit-card-divider"></div>
                </div>
                
                <div class="credit-card-stats">
                    <div class="credit-stat">
                        <div class="credit-stat-label">speed</div>
                        <div class="credit-stat-value">${displaySpeed}${displaySpeed !== '-' ? 'km/h' : ''}</div>
                    </div>
                    <div class="credit-stat">
                        <div class="credit-stat-label">height</div>
                        <div class="credit-stat-value">${displayHeight}${displayHeight !== '-' ? 'm' : ''}</div>
                    </div>
                    <div class="credit-stat">
                        <div class="credit-stat-label">length</div>
                        <div class="credit-stat-value">${displayLength}${displayLength !== '-' ? 'm' : ''}</div>
                    </div>
                    <div class="credit-stat">
                        <div class="credit-stat-label">inversions</div>
                        <div class="credit-stat-value">${displayInversions}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('show'), 10);
    
    // Setup 3D tilt effect
    const cardOuter = container.querySelector('.credit-card-outer');
    const popup = document.querySelector('.credit-card-popup');
    const maxTilt = 35; // degrees
    
    // Mouse tracking for desktop - track across entire overlay
    function handleMouseMove(e) {
        const rect = overlay.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Normalize to -1 to 1 range based on full overlay
        const mouseX = (e.clientX - centerX) / (rect.width / 2);
        const mouseY = (e.clientY - centerY) / (rect.height / 2);
        
        // Mouse left (negative mouseX) -> left side tilts back (needs positive rotateY)
        // Mouse right (positive mouseX) -> right side tilts back (needs negative rotateY)
        // Mouse top (negative mouseY) -> top tilts back (needs negative rotateX)
        // Mouse bottom (positive mouseY) -> bottom tilts back (needs positive rotateX)
        const rotateY = -mouseX * maxTilt;
        const rotateX = mouseY * maxTilt;
        
        // Apply transform with translateZ for enhanced perspective
        cardOuter.style.transform = `translateZ(30px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        // Update shine position and angle based on tilt (inverse - simulates fixed light reflecting off tilted surface)
        // When card tilts left (negative rotateY), shine appears on right side
        const shineX = 50 - (rotateY / maxTilt) * 30;
        const shineY = 50 - (rotateX / maxTilt) * 30;
        
        // Calculate diagonal angle based on tilt direction
        const shineAngle = 135 + rotateY * 1.5 + rotateX * 1.5;
        
        cardOuter.style.setProperty('--shine-x', `${shineX}%`);
        cardOuter.style.setProperty('--shine-y', `${shineY}%`);
        cardOuter.style.setProperty('--shine-angle', `${shineAngle}deg`);
        
        // Dynamic shadow based on tilt (reduced by half)
        const shadowX = rotateY * 0.75;
        const shadowY = -rotateX * 0.75;
        const shadowBlur = 20 + (Math.abs(rotateX) + Math.abs(rotateY)) * 0.6;
        cardOuter.style.boxShadow = `
            ${shadowX}px ${shadowY}px 6px rgba(0, 0, 0, 0.05),
            ${shadowX * 2}px ${shadowY * 2}px 15px rgba(0, 0, 0, 0.08),
            ${shadowX * 3}px ${shadowY * 3}px 28px rgba(0, 0, 0, 0.1),
            ${shadowX * 4}px ${shadowY * 4}px ${shadowBlur}px rgba(0, 0, 0, 0.12)
        `;
    }
    
    // Reset on mouse leave
    function handleMouseLeave() {
        cardOuter.style.transform = 'translateZ(30px) rotateX(0deg) rotateY(0deg)';
        cardOuter.style.setProperty('--shine-x', '50%');
        cardOuter.style.setProperty('--shine-y', '50%');
        cardOuter.style.setProperty('--shine-angle', '135deg');
        cardOuter.style.boxShadow = '';
    }
    
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseleave', handleMouseLeave);
    
    // Gyroscope support for mobile
    let gyroEnabled = false;
    
    async function enableGyroscope() {
        if (typeof DeviceOrientationEvent !== 'undefined') {
            // Check if permission is needed (iOS 13+)
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        gyroEnabled = true;
                        attachGyroscope();
                    }
                } catch (error) {
                    console.log('Gyroscope permission denied or not supported');
                }
            } else {
                // Permission not needed (Android, older iOS)
                gyroEnabled = true;
                attachGyroscope();
            }
        }
    }
    
    function handleOrientation(e) {
        if (!gyroEnabled) return;
        
        // beta: front-to-back tilt (-180 to 180)
        // gamma: left-to-right tilt (-90 to 90)
        const beta = e.beta || 0;
        const gamma = e.gamma || 0;
        
        // Normalize and limit to maxTilt
        const rotateX = Math.max(-maxTilt, Math.min(maxTilt, beta * 0.3));
        const rotateY = Math.max(-maxTilt, Math.min(maxTilt, gamma * 0.5));
        
        // Apply transform
        cardOuter.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        // Update shine based on tilt (inverse - fixed light reflecting off tilted surface)
        const shineX = 50 - (rotateY / maxTilt) * 30;
        const shineY = 50 - (rotateX / maxTilt) * 30;
        const shineAngle = 135 + rotateY * 1.5 + rotateX * 1.5;
        
        cardOuter.style.setProperty('--shine-x', `${shineX}%`);
        cardOuter.style.setProperty('--shine-y', `${shineY}%`);
        cardOuter.style.setProperty('--shine-angle', `${shineAngle}deg`);
        
        // Dynamic shadow based on tilt (reduced by half)
        const shadowX = rotateY * 0.75;
        const shadowY = -rotateX * 0.75;
        const shadowBlur = 20 + (Math.abs(rotateX) + Math.abs(rotateY)) * 0.6;
        cardOuter.style.boxShadow = `
            ${shadowX}px ${shadowY}px 6px rgba(0, 0, 0, 0.05),
            ${shadowX * 2}px ${shadowY * 2}px 15px rgba(0, 0, 0, 0.08),
            ${shadowX * 3}px ${shadowY * 3}px 28px rgba(0, 0, 0, 0.1),
            ${shadowX * 4}px ${shadowY * 4}px ${shadowBlur}px rgba(0, 0, 0, 0.12)
        `;
    }
    
    function attachGyroscope() {
        window.addEventListener('deviceorientation', handleOrientation);
    }
    
    // Request gyroscope permission on first touch (mobile)
    function requestGyroOnTouch() {
        enableGyroscope();
        popup.removeEventListener('touchstart', requestGyroOnTouch);
    }
    
    popup.addEventListener('touchstart', requestGyroOnTouch, { once: true });
    
    // Store cleanup functions
    overlay._cleanup = () => {
        overlay.removeEventListener('mousemove', handleMouseMove);
        overlay.removeEventListener('mouseleave', handleMouseLeave);
        popup.removeEventListener('touchstart', requestGyroOnTouch);
        if (gyroEnabled) {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
    };
}

function closeCreditCard(event) {
    // If event is passed, check if clicking overlay (not card content)
    if (event && event.target.closest('.credit-card-popup') && event.target !== event.currentTarget) {
        return;
    }
    
    const overlay = document.getElementById('creditCardOverlay');
    
    // Cleanup event listeners
    if (overlay._cleanup) {
        overlay._cleanup();
        overlay._cleanup = null;
    }
    
    overlay.classList.remove('show');
    setTimeout(() => overlay.style.display = 'none', 300);
}

// Populate credits grid with dynamic colors
function populateCreditsGrid() {
    const creditsGrid = document.querySelector('.credits-grid');
    if (!creditsGrid) return;
    
    // Get border colors (25% more saturated and 10% darker)
    const borderColors = {
        'B&M': '#A8AAAC',
        'Bolliger & Mabillard': '#A8AAAC',
        'Intamin': '#C42424',
        'Vekoma': '#D97316',
        'Mack Rides': '#2563EB',
        'Gerstlauer': '#3D7A47',
        'RMC': '#7A4A1F',
        'Rocky Mountain Construction': '#7A4A1F',
        'GCI': '#D9A616',
        'Great Coasters International': '#D9A616',
        'Maurer Rides': '#6F3FA8',
        'S&S': '#B8A471',
        'Zamperla': '#C45A85',
        'Zierer': '#2E9494',
        'Schwarzkopf': '#9F9A8F',
        'Other': '#827D78',
        'Unknown': '#827D78'
    };
    
    // Generate HTML for each coaster in the database
    creditsGrid.innerHTML = Object.keys(coasterDatabase).map(coasterId => {
        const coaster = coasterDatabase[coasterId];
        const bgColor = manufacturerColors[coaster.manufacturer] || manufacturerColors['Unknown'];
        const borderColor = borderColors[coaster.manufacturer] || borderColors['Unknown'];
        
        // Create image HTML - use coaster image or placeholder
        const imageHTML = coaster.image 
            ? `<img src="${coaster.image}" alt="${coaster.name}" loading="lazy" />` 
            : `<div class="preview-image-placeholder">
                    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M40 10L45 30H65L50 42L55 62L40 50L25 62L30 42L15 30H35L40 10Z" fill="#D1D5DB" opacity="0.3"/>
                    </svg>
               </div>`;
        
        return `
            <div class="coaster-card" onclick="openCreditCard('${coasterId}')" style="--card-bg: ${bgColor}; --card-border: ${borderColor};">
                <div class="preview-image" style="background-color: ${bgColor}; border-color: ${borderColor};">
                    ${imageHTML}
                </div>
                <div class="coaster-name">${coaster.name}</div>
            </div>
        `;
    }).join('');
}
