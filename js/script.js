// Coaster data - will be loaded from the database
    let coastersDataLuca = [];
    let coastersDataWouter = [];
    
    // Updated cache version to force reload with optimized image sizes (?width=800 parameter)
    const CACHE_VERSION = 'v13-optimized-images';

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
        
        // User is logged in - proceed with loading from JSON database
        try {
            // console.log('🔄 Loading database from JSON files...');
            
            // Load master database and user profiles using dataLoader.js
            if (typeof initializeDatabase === 'function') {
                await initializeDatabase();
                // console.log('✓ Database initialized successfully');
            } else {
                throw new Error('initializeDatabase function not found - make sure dataLoader.js is loaded');
            }
            
            // Get user's coasters from the database
            if (typeof getUserCoasters === 'function') {
                coastersDataLuca = getUserCoasters('luca');
                coastersDataWouter = getUserCoasters('wouter');
                console.info(`✓ Loaded profiles: Luca=${coastersDataLuca.length}, Wouter=${coastersDataWouter.length}`);
            } else {
                throw new Error('getUserCoasters function not found');
            }
            
            initializeApp();
        } catch (error) {
            console.error('Error loading database:', error.message);
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.3);max-width:560px;text-align:center;z-index:10000;font-family:sans-serif;';
            errorDiv.innerHTML = `
                <h2 style="color:#e74c3c;margin-bottom:10px;">⚠️ Error loading database</h2>
                <p style="margin:6px 0 12px;">Could not load the coaster database.</p>
                <div style="font-size:0.9em;color:#666;margin-bottom:12px;">${escapeHtml(error.message || String(error))}</div>
                <button id="errorCloseBtn" style="padding:10px 20px;border-radius:8px;border:none;background:#3498db;color:#fff;cursor:pointer;font-weight:700;">Close</button>
            `;
            document.body.appendChild(errorDiv);
            document.getElementById('errorCloseBtn').addEventListener('click', () => errorDiv.remove());
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
        
        // Load user-specific data from user credits
        // Build coasters array from userCredits + coasterDatabase
        loadUserCredits();
        
        // Build coasters array from userCredits
        if (userCredits.size > 0) {
            coasters = buildCoastersFromCredits();
            console.log(`✨ Loaded ${coasters.length} coasters from ${currentUser}'s credits`);
        } else {
            // Fallback: initialize from profile if userCredits is empty
            if (savedUser === 'luca') {
                coasters = coastersDataLuca;
            } else {
                coasters = coastersDataWouter;
            }
            // Initialize userCredits from the profile data
            if (coasters && coasters.length > 0) {
                coasters.forEach(coaster => {
                    if (coaster.id) {
                        userCredits.add(coaster.id);
                    }
                });
                saveUserCredits();
                console.log(`✓ Initialized ${userCredits.size} credits from ${savedUser}'s profile`);
            }
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
        
        // Load master database and populate coasterDatabase
        // masterDatabase should already be loaded by loadCoasterData()->initializeDatabase()
        coasterDatabase = masterDatabase || {};
        // console.log(`✓ Loaded ${Object.keys(coasterDatabase).length} coasters into database`);
        
        // Load user-specific data from user credits
        // Build coasters array from userCredits + coasterDatabase
        loadUserCredits();
        
        // Build coasters array from userCredits
        if (userCredits.size > 0) {
            coasters = buildCoastersFromCredits();
            console.log(`✨ Loaded ${coasters.length} coasters from ${currentUser}'s credits`);
        } else {
            // Fallback: initialize from profile if userCredits is empty
            if (savedUser === 'luca') {
                coasters = coastersDataLuca;
            } else {
                coasters = coastersDataWouter;
            }
            // Initialize userCredits from the profile data
            if (coasters && coasters.length > 0) {
                coasters.forEach(coaster => {
                    if (coaster.id) {
                        userCredits.add(coaster.id);
                    }
                });
                saveUserCredits();
                console.log(`✓ Initialized ${userCredits.size} credits from ${savedUser}'s profile`);
            }
        }
        
        // Populate filter dropdowns
        populateCreditsFilters();
        
        // Set header height for mobile sticky tabs
        setHeaderHeight();
        // Post-initialization UI adjustments
        postInitUISetup();
        
        // Update ranking immediately after phase setup to show seeding/waiting coasters
        updateRanking();
        
        // Load ALL images during loading screen before showing first battle
        await preloadAllCoasterImages();
        
        // Populate credits grid with dynamic colors (AFTER images are loaded)
        populateCreditsGrid();
        
        // Start background preloading of credits images (row-by-row, top-to-bottom)
        backgroundPreloadCreditsImages();
        
        // Initialize battle slot system
        initializeBattleSlots();
        
        // Now display the first battle (all images loaded)
        displayBattle();
        updateRanking(); // Update again in case battle changed anything
        displayHome();
        
        // Pre-render next battle for instant display
        setTimeout(() => preRenderNextBattle(), 100);
        
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

function getCoasterId(c) { return (c && (c.name || c.id)) || String(Math.random()); }
function getCoasterName(c) { return (c && c.name) || 'Coaster'; }

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

// Battle slot ping-pong system - 2 slots that alternate (A/B pattern)
let battleSlotA = null;          // First slot DOM element
let battleSlotB = null;          // Second slot DOM element
let currentSlotIsA = true;       // true = slotA visible, false = slotB visible
let nextBattleData = null;       // Pre-rendered battle data for hidden slot
let isPrerendering = false;      // Flag to prevent concurrent prerenders

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
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#8e9eef;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#b8a4d9;stop-opacity:1" />
            </linearGradient>
            <pattern id="trackPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 0 20 L 20 0 L 40 20 L 20 40 Z" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
            </pattern>
        </defs>
        <rect width="400" height="250" fill="url(#skyGrad)"/>
        <rect width="400" height="250" fill="url(#trackPattern)"/>
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
    
    // 6. REMOVED Junior/Mini prefix stripping to prevent false matches
    // (e.g., "Junior Red Force" should NOT match "Red Force")
    
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
        
        // Normalize spaces/hyphens for better matching (e.g., "Ferrari Land" = "FerrariLand")
        const noSpaces = cleanPark.replace(/[\s-]+/g, '');
        if (noSpaces !== cleanPark && !parkVariants.includes(noSpaces)) {
            parkVariants.push(noSpaces);
        }
        const noHyphens = cleanPark.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        if (noHyphens !== cleanPark && !parkVariants.includes(noHyphens)) {
            parkVariants.push(noHyphens);
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
    
    // Helper function to filter results by name length ratio
    // Rejects matches where Wikidata name is >1.5x longer than search name
    // This prevents "Junior Red Force" from matching "Red Force"
    const filterByNameLength = (results, searchName) => {
        if (!results || results.length === 0) return results;
        const maxRatio = 1.5;
        return results.filter(r => {
            const wikidataName = r.itemLabel?.value || '';
            if (!wikidataName) return true; // Keep if no label
            const ratio = wikidataName.length / searchName.length;
            const keep = ratio <= maxRatio;
            if (!keep) {
                console.log(`    ⏭️  Filtered out "${wikidataName}" (length ratio ${ratio.toFixed(2)} > ${maxRatio})`);
            }
            return keep;
        });
    };
    
    // SEQUENTIAL MATCHING: Exact → Word-boundary → Fuzzy
    // Prioritize accuracy over speed by trying strict matches first
    
    let parkAwareTimedOut = false; // Track timeout to skip redundant queries later
    const parkVariant = parkVariants[0];
    const escapedParkVar = escapeSPARQL(parkVariant);
    
    // LEVEL 0: Exact match with park verification (highest priority)
    console.log(`  🎯 Level 0: Exact name match with park verification`);
    const exactMatchQuery = `
        SELECT ?item ?image ?itemLabel ?parkLabel WHERE {
          ?item rdfs:label ?itemLabel .
          FILTER(REGEX(?itemLabel, "^${escapedName}$", "i"))
          ${coasterTypeFilter}
          ?item wdt:P18 ?image .
          
          # Check both "owned by" (P127) and "part of" (P361) for park
          { ?item wdt:P127 ?park } UNION { ?item wdt:P361 ?park }
          ?park rdfs:label ?parkLabel .
          FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapedParkVar}")))
        }
        LIMIT 5
    `;
    
    try {
        const results = await querySPARQLMultiple(exactMatchQuery);
        const filtered = filterByNameLength(results, variant);
        if (filtered && filtered.length > 0) {
            console.log(`✓ Found "${coasterName}" with exact name match (using "${parkVariant}")`);
            return filtered[0].image?.value;
        }
    } catch (e) {
        console.warn(`    ⚠️ Exact match search failed: ${e.message}`);
        if (e.message && e.message.includes('timeout')) {
            parkAwareTimedOut = true;
        }
    }
    
    // LEVEL 1: Word-boundary match with park verification
    if (!parkAwareTimedOut) {
        console.log(`  🎯 Level 1: Word-boundary match with park verification`);
        const wordBoundaryQuery = `
            SELECT ?item ?image ?itemLabel ?parkLabel WHERE {
              ?item rdfs:label ?itemLabel .
              FILTER(REGEX(?itemLabel, "\\b${escapedName}\\b", "i"))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              # Check both "owned by" (P127) and "part of" (P361) for park
              { ?item wdt:P127 ?park } UNION { ?item wdt:P361 ?park }
              ?park rdfs:label ?parkLabel .
              FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapedParkVar}")))
            }
            LIMIT 5
        `;
        
        try {
            const results = await querySPARQLMultiple(wordBoundaryQuery);
            const filtered = filterByNameLength(results, variant);
            if (filtered && filtered.length > 0) {
                console.log(`✓ Found "${coasterName}" with word-boundary match (using "${parkVariant}")`);
                return filtered[0].image?.value;
            }
        } catch (e) {
            console.warn(`    ⚠️ Word-boundary search failed for "${parkVariant}": ${e.message}`);
            if (e.message && e.message.includes('timeout')) {
                parkAwareTimedOut = true;
            }
        }
    }
    
    // Continue with existing fuzzy matching levels (2-4)
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
    
    // LEVEL 5: Name-only with manufacturer AND park verification
    // This catches coasters where park properties are in different fields
    if (manufacturer) {
        console.log(`  🔍 Level 5: Name with manufacturer and park verification`);
        const escapedManufacturer = escapeSPARQL(manufacturer);
        const nameManufacturerParkQuery = `
            SELECT ?item ?image ?itemLabel ?mfgLabel ?parkLabel WHERE {
              ?item rdfs:label ?itemLabel .
              FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapedName}")))
              ${coasterTypeFilter}
              ?item wdt:P18 ?image .
              
              # P176 = manufacturer
              ?item wdt:P176 ?mfg .
              ?mfg rdfs:label ?mfgLabel .
              FILTER(CONTAINS(LCASE(?mfgLabel), LCASE("${escapedManufacturer}")) || 
                     CONTAINS(LCASE("${escapedManufacturer}"), LCASE(?mfgLabel)))
              
              # Check both "owned by" (P127) and "part of" (P361) for park
              { ?item wdt:P127 ?park } UNION { ?item wdt:P361 ?park }
              ?park rdfs:label ?parkLabel .
              FILTER(CONTAINS(LCASE(?parkLabel), LCASE("${escapedParkVar}")))
            }
            LIMIT 5
        `;
        
        try {
            const results = await querySPARQLMultiple(nameManufacturerParkQuery);
            const filtered = filterByNameLength(results, variant);
            if (filtered && filtered.length > 0) {
                console.log(`✓ Found "${coasterName}" with manufacturer and park verification`);
                return filtered[0].image?.value;
            }
        } catch (e) {
            console.warn(`    ⚠️ Name+manufacturer+park search failed: ${e.message}`);
        }
    }
    
    // FINAL FALLBACK: Try pure name-only search without any constraints
    // This catches coasters where:
    // - Park data is completely absent from Wikidata
    // - Early queries timed out
    // WARNING: May return wrong park - user should use retry button
    console.log(`  🔍 Final fallback (Name-only without park verification): "${variant}"`);
    const finalNameOnlyQuery = `
        SELECT ?item ?image ?itemLabel WHERE {
          ?item rdfs:label ?itemLabel .
          FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${escapedName}")))
          ${coasterTypeFilter}
          ?item wdt:P18 ?image .
        }
        LIMIT 5
    `;
    
    try {
        const results = await querySPARQLMultiple(finalNameOnlyQuery);
        const filtered = filterByNameLength(results, variant);
        if (filtered && filtered.length > 0) {
            console.log(`⚠️ Found "${coasterName}" (park not verified - may need retry)`);
            return filtered[0].image?.value;
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
                    // Convert Commons filename to URL with optimized width parameter
                    // Request 800px width instead of full resolution for faster loading
                    const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}?width=800`;
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
    // console.log(`\n🔬 INTENSIVE SEARCH for "${coasterName}" at ${parkName}...`);
    
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
    if (!coaster?.name || !coaster?.park) return null;
    
    const coasterName = coaster.name;
    const parkName = coaster.park;
    const manufacturer = coaster.manufacturer;
    
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
// browserPreload: if true, also loads actual image into browser cache for instant display
async function getCoasterImage(coaster, browserPreload = false) {
    if (!coaster || !coaster.name) return getPlaceholderImage();
    
    const normalizedName = normalizeCoasterName(coaster.name);
    const normalizedPark = normalizeCoasterName(coaster.park);
    const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
    
    // Check cache
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            // Store in memory cache for faster access
            imageMemoryCache.set(cacheKey, cached);
            
            // Increment appropriate counter based on whether it's placeholder or real image
            if (cached.startsWith('data:image/svg+xml')) {
                // It's a cached placeholder (failed image)
                imageLoadStats.failed++;
            } else {
                // It's a real cached image (HTTP URL)
                imageLoadStats.loaded++;
                
                // If browserPreload is true, actually load the image into browser cache
                if (browserPreload && !cached.startsWith('data:')) {
                    const img = new Image();
                    img.src = cached; // Browser will cache this
                }
            }
            imageLoadStats.cached++;
            return cached;
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    
    // Fetch from Wikidata
    try {
        const imageUrl = await queryWikidataImage(coaster.name, coaster.park, coaster.manufacturer);
        
        if (imageUrl) {
            // Cache the HTTP URL directly (browser will handle image caching)
            try {
                localStorage.setItem(cacheKey, imageUrl);
                imageMemoryCache.set(cacheKey, imageUrl);
            } catch (e) {
                console.warn('Cache write error (quota?):', e);
            }
            imageLoadStats.loaded++;
            
            // If browserPreload is true, actually load the image into browser cache
            if (browserPreload) {
                const img = new Image();
                img.src = imageUrl; // Browser will cache this
                // Don't need to wait for it to load - just trigger the download
            }
            
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
        console.error('Error fetching image for', coaster.name, ':', error);
        imageLoadStats.failed++;
        return getPlaceholderImage();
    }
}

// Synchronous cache-only image retrieval (for instant display in battles)
function getCoasterImageSync(coaster) {
    if (!coaster || !coaster.name) return getPlaceholderImage();
    
    const normalizedName = normalizeCoasterName(coaster.name);
    const normalizedPark = normalizeCoasterName(coaster.park);
    const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
    
    // Check memory cache first (fastest)
    if (imageMemoryCache.has(cacheKey)) {
        return imageMemoryCache.get(cacheKey);
    }
    
    // Check localStorage
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            imageMemoryCache.set(cacheKey, cached);
            return cached;
        }
    } catch (e) {
        // Silent fail
    }
    
    // Return placeholder if not in cache
    return getPlaceholderImage();
}

// Preload a single image into browser cache (forces true caching via DOM)
function preloadImage(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // Append to hidden cache container to force browser caching
            let cacheContainer = document.getElementById('imageCacheContainer');
            if (!cacheContainer) {
                cacheContainer = document.createElement('div');
                cacheContainer.id = 'imageCacheContainer';
                cacheContainer.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
                document.body.appendChild(cacheContainer);
            }
            img.style.cssText = 'width:1px;height:1px;';
            cacheContainer.appendChild(img);
            resolve(true);
        };
        img.onerror = () => resolve(false); // Don't reject, just resolve with false
        img.src = imageUrl;
    });
}

// Preload images for a pair of coasters
async function preloadBattleImages(coaster1, coaster2) {
    const url1 = getCoasterImageSync(coaster1);
    const url2 = getCoasterImageSync(coaster2);
    
    // Load both in parallel
    await Promise.all([
        preloadImage(url1),
        preloadImage(url2)
    ]);
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
        detailsEl.textContent = `Hit: ${imageLoadStats.loaded} | No hit: ${imageLoadStats.failed}`;
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
    
    console.log(`📊 Image Loading Summary for ${currentUser}:`);
    console.log(`   Total coasters to load: ${coasters.length}`);
    console.log(`   Current user: ${currentUser}`);
    
    cleanOldCacheVersions();
    
    imageLoadStats.loaded = 0;
    imageLoadStats.failed = 0;
    imageLoadStats.cached = 0;
    imageLoadStats.total = coasters.length;
    
    // Quick check: count how many are already cached
    let cachedCount = 0;
    for (const coaster of coasters) {
        const normalizedName = normalizeCoasterName(coaster.name);
        const normalizedPark = normalizeCoasterName(coaster.park);
        const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
        if (localStorage.getItem(cacheKey)) {
            cachedCount++;
        }
    }
    
    console.log(`📦 Found ${cachedCount}/${coasters.length} images in cache`);
    
    // If all are cached, load instantly without showing loading screen
    if (cachedCount === coasters.length) {
        console.log(`✓ All images cached - instant load!`);
        // Hide loading screen immediately
        hideLoadingScreen();
        // Batch process cached images for speed (50 per batch)
        // Also browser-preload battle candidates for instant display
        const cachedBatchSize = 50;
        for (let i = 0; i < coasters.length; i += cachedBatchSize) {
            const batch = coasters.slice(i, i + cachedBatchSize);
            await Promise.all(batch.map(async coaster => {
                const stats = coasterStats[coaster.name] || { phase: 'Standby Queue' };
                const isBattleCandidate = stats.phase === 'Transfer Track' || stats.phase === 'ranked';
                const imageUrl = await getCoasterImage(coaster, isBattleCandidate); // Browser preload if battle candidate
                // Pre-populate memory cache
                const normalizedName = normalizeCoasterName(coaster.name);
                const normalizedPark = normalizeCoasterName(coaster.park);
                const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
                imageMemoryCache.set(cacheKey, imageUrl);
            }));
        }
        console.log(`✓ All ${coasters.length} coasters loaded from cache for ${currentUser}!`);
        console.log(`  Loaded: ${imageLoadStats.loaded}, Failed: ${imageLoadStats.failed}, From cache: ${imageLoadStats.cached}`);
        return;
    }
    
    // Some images need fetching - ensure loading screen is visible
    const overlay = document.getElementById('imageLoadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');
    }
    updateImageLoadStats();
    updateLoadingScreen(0, coasters.length, 0);
    
    console.log(`🚀 Loading ${coasters.length - cachedCount} new images (${cachedCount} from cache)...`);
    
    // Load in batches to avoid rate limiting while maintaining speed
    // Separate by cache status AND phase (for browser preload optimization)
    const uncachedCoasters = [];
    const cachedCoasters = [];
    const battleCandidates = []; // Transfer Track + Ranked (need browser preload for instant battles)
    const standbyQueueCoasters = []; // Standby Queue phase (URL cache only, lazy load later)
    
    // Separate cached from uncached and by phase
    for (const coaster of coasters) {
        const normalizedName = normalizeCoasterName(coaster.name);
        const normalizedPark = normalizeCoasterName(coaster.park);
        const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
        const stats = coasterStats[coaster.name] || { phase: 'Standby Queue' };
        const isBattleCandidate = stats.phase === 'Transfer Track' || stats.phase === 'ranked';
        
        if (localStorage.getItem(cacheKey)) {
            cachedCoasters.push(coaster);
        } else {
            uncachedCoasters.push(coaster);
            // Track whether this needs browser preload
            if (isBattleCandidate) {
                battleCandidates.push(coaster);
            } else {
                standbyQueueCoasters.push(coaster);
            }
        }
    }
    
    // Load cached items quickly in larger batches (they're instant from localStorage)
    // Also browser-preload battle candidates for instant display
    const cachedBatchSize = 50;
    for (let i = 0; i < cachedCoasters.length; i += cachedBatchSize) {
        const batch = cachedCoasters.slice(i, i + cachedBatchSize);
        await Promise.all(
            batch.map(async coaster => {
                try {
                    const stats = coasterStats[coaster.name] || { phase: 'Standby Queue' };
                    const isBattleCandidate = stats.phase === 'Transfer Track' || stats.phase === 'ranked';
                    const imageUrl = await getCoasterImage(coaster, isBattleCandidate); // Browser preload if battle candidate
                    // Pre-populate memory cache for instant sync reads
                    const normalizedName = normalizeCoasterName(coaster.name);
                    const normalizedPark = normalizeCoasterName(coaster.park);
                    const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
                    imageMemoryCache.set(cacheKey, imageUrl);
                    updateImageLoadStats();
                    updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                } catch (error) {
                    console.error('Error loading cached image for', coaster.name, ':', error);
                }
            })
        );
    }
    
    // Load uncached items in smaller batches with delay to avoid rate limiting
    const batchSize = 10;
    const batchDelay = 150; // Optimized: 33% faster than 250ms, still prevents throttling
    
    console.log(`🔄 Hybrid loading: ${battleCandidates.length} battle candidates (browser preload) + ${standbyQueueCoasters.length} Standby Queue (URL only)`);
    
    // First: Load battle candidates WITH browser preload (instant battles)
    console.log(`⚔️ Loading ${battleCandidates.length} battle candidates with browser preload...`);
    for (let i = 0; i < battleCandidates.length; i += batchSize) {
        const batch = battleCandidates.slice(i, i + batchSize);
        console.log(`📦 Battle batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(battleCandidates.length / batchSize)}: ${batch.length} images`);
        
        await Promise.all(
            batch.map(async coaster => {
                try {
                    const imageUrl = await getCoasterImage(coaster, true); // browserPreload=true
                    const normalizedName = normalizeCoasterName(coaster.name);
                    const normalizedPark = normalizeCoasterName(coaster.park);
                    const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
                    imageMemoryCache.set(cacheKey, imageUrl);
                    updateImageLoadStats();
                    updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                } catch (error) {
                    console.error('Error loading battle image for', coaster.name, ':', error);
                    imageLoadStats.failed++;
                    updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                }
            })
        );
        
        if (i + batchSize < battleCandidates.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
    }
    
    // Second: Load Standby Queue coasters WITHOUT browser preload (URL cache only)
    console.log(`⏳ Loading ${standbyQueueCoasters.length} Standby Queue coasters (URL cache only)...`);
    for (let i = 0; i < standbyQueueCoasters.length; i += batchSize) {
        const batch = standbyQueueCoasters.slice(i, i + batchSize);
        
        await Promise.all(
            batch.map(async coaster => {
                try {
                    const imageUrl = await getCoasterImage(coaster, false); // browserPreload=false
                    const normalizedName = normalizeCoasterName(coaster.name);
                    const normalizedPark = normalizeCoasterName(coaster.park);
                    const cacheKey = `coasterImage_${CACHE_VERSION}_${normalizedName}_${normalizedPark}`;
                    imageMemoryCache.set(cacheKey, imageUrl);
                    updateImageLoadStats();
                    updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                } catch (error) {
                    console.error('Error loading Standby Queue image for', coaster.name, ':', error);
                    imageLoadStats.failed++;
                    updateLoadingScreen(imageLoadStats.loaded, imageLoadStats.total, imageLoadStats.failed);
                }
            })
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
        coastersWithImages.add(coaster.name); // Track as loaded
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
                coastersWithImages.add(coaster.name); // Track as loaded
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
                const normalizedName = normalizeCoasterName(coaster.name);
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
    let currentSort = { column: 'rank', ascending: true };
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
    // Phases: Standby Queue (not started), Transfer Track (onboarding, boosted frequency), ranked (active)
    let TRANSFER_TRACK_TARGET_COUNT = 20;      // Target number of coasters in Transfer Track phase
    let TRANSFER_TRACK_BATCH_SIZE = 2;          // How many to promote from Standby Queue per batch (staggered)
    let TRANSFER_TRACK_MIN_BATTLES = 5;         // Minimum battles before exiting Transfer Track to Ranked
    const TRANSFER_TRACK_BOOST_FACTOR = 1.2;    // Matchmaking probability boost for Transfer Track coasters (reduced to allow ranked vs ranked)
    
    // Pairing strategy: hybrid — picks one under-sampled coaster
    // then picks a second that is ELO-similar while still favoring under-sampled ones.
    let pairingControlsHidden = true;
    // Track all completed pairs to prevent duplicates
    let completedPairs = new Set();

    // ========================================
    // CLOSE FIGHT CONFIGURATION
    // ========================================
    // Close fights are special matchups between closely-ranked, experienced coasters
    const CLOSE_FIGHT_CONFIG = {
        MIN_BATTLES: 6,           // Both coasters must have at least this many battles
        MAX_RANK_DIFFERENCE: 2,   // Coasters must be within this many ranks (e.g., rank 11 vs 13)
        REQUIRED_PHASE: 'ranked'  // Both coasters must be in this phase
    };
    
    /**
     * Centralized function to determine if two coasters qualify for a close fight
     * @param {string} coaster1Name - Name of first coaster
     * @param {string} coaster2Name - Name of second coaster
     * @returns {boolean} True if this matchup qualifies as a close fight
     */
    function isCloseFightMatchup(coaster1Name, coaster2Name) {
        const stats1 = coasterStats[coaster1Name] || { battles: 0, phase: 'Standby Queue' };
        const stats2 = coasterStats[coaster2Name] || { battles: 0, phase: 'Standby Queue' };
        
        // Both must be in ranked phase
        if (stats1.phase !== CLOSE_FIGHT_CONFIG.REQUIRED_PHASE || 
            stats2.phase !== CLOSE_FIGHT_CONFIG.REQUIRED_PHASE) {
            return false;
        }
        
        // Both must have minimum battles
        if (stats1.battles < CLOSE_FIGHT_CONFIG.MIN_BATTLES || 
            stats2.battles < CLOSE_FIGHT_CONFIG.MIN_BATTLES) {
            return false;
        }
        
        // Must be within max rank difference
        const rank1 = getCoasterRank(coaster1Name);
        const rank2 = getCoasterRank(coaster2Name);
        if (rank1 === null || rank2 === null) {
            return false;
        }
        
        return Math.abs(rank1 - rank2) <= CLOSE_FIGHT_CONFIG.MAX_RANK_DIFFERENCE;
    }

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
        
        // Reset sort to default (by rank/rating)
        currentSort = { column: 'rank', ascending: true };
        
        // Update UI
        const badge = document.getElementById('currentUserBadge');
        if (badge) badge.textContent = `Logged in as: ${user === 'luca' ? 'Luca' : 'Wouter'}`;
        
        // Load user credits and rebuild coasters array
        loadUserCredits();
        
        // Build coasters array from userCredits
        if (userCredits.size > 0) {
            coasters = buildCoastersFromCredits();
            console.log(`🎯 Switched to ${user} - Loading ${coasters.length} coasters from credits`);
        } else {
            // Fallback to profile data if no credits stored yet
            if (user === 'luca') {
                coasters = coastersDataLuca;
            } else {
                coasters = coastersDataWouter;
            }
            // Initialize userCredits
            if (coasters && coasters.length > 0) {
                coasters.forEach(coaster => {
                    if (coaster.id) userCredits.add(coaster.id);
                });
                saveUserCredits();
            }
            console.log(`🎯 Switched to ${user} - Initialized ${coasters.length} coasters from profile`);
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

        // Reset sort to default (by rank/rating)
        currentSort = { column: 'rank', ascending: true };

        coasterStats = JSON.parse(localStorage.getItem(statsKey)) || initializeStats();
        
        // Load total battles count first (needed for phase logic)
        totalBattlesCount = parseInt(localStorage.getItem(battlesKey)) || 0;
        coasterHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
        
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
            
            // Ensure phase field exists - default to Standby Queue
            if (stats.phase === undefined) {
                stats.phase = 'Standby Queue';
            }
            
            // Ensure rank field exists - will be recalculated below
            if (stats.rank === undefined) {
                stats.rank = null;
            }
        });
        
        // Phase initialization logic
        if (totalBattlesCount === 0) {
            // No battles at all - ensure all coasters start in Standby Queue, then promote 25 to Transfer Track
            Object.values(coasterStats).forEach(stats => {
                if (stats.battles === 0) {
                    stats.phase = 'Standby Queue';
                }
            });
            // Promote 25 random coasters to Transfer Track
            promoteStandbyQueueToTransferTrack(true);
            console.log('Initialized phase system: promoted 25 random coasters to Transfer Track');
        } else if (Object.values(coasterStats).some(s => s.battles > 0)) {
            // Some battles exist - reprocess phases based on stats
            reprocessAllPhases();
        }
        
        // Recalculate all ranks after loading/processing data
        recalculateAllRanks();
        
        // Save and update after phase processing (skip battle save to preserve loaded battle)
        saveData(true);
        
        // Load completed pairs with error handling
        try {
            const savedPairs = localStorage.getItem(pairsKey);
            completedPairs = savedPairs ? new Set(JSON.parse(savedPairs)) : new Set();
            
            // Limit completedPairs size to prevent quota issues (keep most recent 5000)
            if (completedPairs.size > 5000) {
                console.log(`Trimming completedPairs from ${completedPairs.size} to 5000`);
                const pairsArray = [...completedPairs];
                completedPairs = new Set(pairsArray.slice(-5000));
                // Save the trimmed version immediately
                try {
                    localStorage.setItem(pairsKey, JSON.stringify([...completedPairs]));
                } catch (e) {
                    console.warn('Could not save trimmed completedPairs:', e);
                }
            }
        } catch (e) {
            console.error('Error loading completedPairs, starting fresh:', e);
            completedPairs = new Set();
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
    }

    function initializeStats() {
        const stats = {};
        coasters.forEach(coaster => {
            stats[coaster.name] = {
                name: coaster.name,
                park: coaster.park,
                manufacturer: coaster.manufacturer,
                rating: GLICKO2_RATING_BASE,
                rd: GLICKO2_RD_INITIAL,
                volatility: GLICKO2_VOLATILITY_INITIAL,
                battles: 0,
                wins: 0,
                losses: 0,
                phase: 'Standby Queue'  // Default phase for new coasters
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
            'Standby Queue': 0,
            'Transfer Track': 0,
            ranked: 0
        };
        
        Object.values(coasterStats).forEach(stats => {
            const phase = stats.phase || 'Standby Queue';
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
        
        const currentPhase = stats.phase || 'Standby Queue';
        let transitioned = false;
        
        // Transfer Track → Ranked: minimum battles reached
        if (currentPhase === 'Transfer Track' && stats.battles >= TRANSFER_TRACK_MIN_BATTLES) {
            stats.phase = 'ranked';
            transitioned = true;
            console.log(`Phase transition: ${coasterName} Transfer Track → ranked (battles: ${stats.battles}, RD: ${Math.round(stats.rd)})`);
            
            // Recalculate ranks when a new coaster joins the ranked pool
            recalculateAllRanks();
        }
        
        return transitioned;
    }
    
    // Promote coasters from Standby Queue to Transfer Track (staggered batch)
    function promoteStandbyQueueToTransferTrack(isInitial = false) {
        const distribution = getPhaseDistribution();
        const currentTransferTrack = distribution['Transfer Track'];
        
        // Only promote if below target
        if (currentTransferTrack >= TRANSFER_TRACK_TARGET_COUNT) {
            return 0;
        }
        
        // Find Standby Queue coasters
        const standbyQueueCoasters = Object.values(coasterStats).filter(s => s.phase === 'Standby Queue');
        if (standbyQueueCoasters.length === 0) {
            console.log('⚠️ No Standby Queue coasters to promote');
            return 0;
        }
        
        // Calculate how many to promote
        const slotsAvailable = TRANSFER_TRACK_TARGET_COUNT - currentTransferTrack;
        // For initial load, promote full batch; otherwise staggered
        const batchSize = isInitial ? slotsAvailable : TRANSFER_TRACK_BATCH_SIZE;
        const toPromote = Math.min(batchSize, slotsAvailable, standbyQueueCoasters.length);
        
        // Proper Fisher-Yates shuffle for unbiased random selection
        const shuffled = [...standbyQueueCoasters];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Promote randomly selected coasters
        let promoted = 0;
        for (let i = 0; i < toPromote; i++) {
            shuffled[i].phase = 'Transfer Track';
            console.log(`Promoted to Transfer Track: ${shuffled[i].name}`);
            promoted++;
        }
        
        return promoted;
    }
    
    // Graduate Transfer Track coasters and backfill from Standby Queue (until Standby Queue is empty)
    function manageTransferTrackPool() {
        // Check all Transfer Track coasters for transitions to Ranked
        const transferTrackCoasters = Object.values(coasterStats).filter(s => s.phase === 'Transfer Track');
        transferTrackCoasters.forEach(stats => checkCoasterPhaseTransition(stats.name));
        
        // Backfill from Standby Queue to maintain target Transfer Track count
        // This naturally stops when Standby Queue is empty, allowing Transfer Track to drain to zero
        promoteStandbyQueueToTransferTrack();
    }
    
    // No dormancy tracking in simplified 3-phase system
    // Glicko-2's RD naturally tracks data staleness
    
    // Reprocess all coaster phases based on current stats (for initialization or recalculation)
    function reprocessAllPhases() {
        console.log('Reprocessing all coaster phases...');
        
        Object.values(coasterStats).forEach(stats => {
            const battles = stats.battles || 0;
            
            // Coasters with no battles stay in Standby Queue
            if (battles === 0) {
                stats.phase = 'Standby Queue';
            }
            // Coasters with few battles → Transfer Track
            else if (battles < TRANSFER_TRACK_MIN_BATTLES) {
                stats.phase = 'Transfer Track';
            }
            // 5+ battles → Ranked
            else {
                stats.phase = 'ranked';
            }
        });
        
        // Backfill Transfer Track pool to target if we have Standby Queue coasters
        const distribution = getPhaseDistribution();
        if (distribution['Standby Queue'] > 0 && distribution['Transfer Track'] < TRANSFER_TRACK_TARGET_COUNT) {
            console.log(`Transfer Track pool below target (${distribution['Transfer Track']}/${TRANSFER_TRACK_TARGET_COUNT}) - promoting from Standby Queue`);
            promoteStandbyQueueToTransferTrack(true);
        }
        
        const finalDist = getPhaseDistribution();
        console.log('Phase reprocessing complete:', finalDist);
    }

    function saveData(skipBattle = false) {
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
            
            // Try to save completedPairs, trim if too large
            try {
                localStorage.setItem(pairsKey, JSON.stringify([...completedPairs]));
            } catch (pairsError) {
                if (pairsError.name === 'QuotaExceededError') {
                    console.warn('completedPairs too large, trimming to 2000 entries');
                    const pairsArray = [...completedPairs];
                    completedPairs = new Set(pairsArray.slice(-2000));
                    localStorage.setItem(pairsKey, JSON.stringify([...completedPairs]));
                }
            }
            
            // Save current battle if it exists (unless skipBattle is true during initialization)
            if (!skipBattle) {
                if (currentBattle && currentBattle.length === 2) {
                    localStorage.setItem(battleKey, JSON.stringify(currentBattle));
                } else {
                    localStorage.removeItem(battleKey);
                }
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
    function setTransferTrackGroupSize(val) {
        const num = Number(val);
        if (isNaN(num) || num < 1) return;
        const oldTarget = TRANSFER_TRACK_TARGET_COUNT;
        TRANSFER_TRACK_TARGET_COUNT = Math.round(num);
        const el = document.getElementById('transferTrackGroupSizeValue');
        if (el) el.textContent = TRANSFER_TRACK_TARGET_COUNT;
        
        // Get current distribution
        const distribution = getPhaseDistribution();
        const currentTransferTrack = distribution['Transfer Track'];
        
        // If new target is larger, promote more coasters from Standby Queue
        if (TRANSFER_TRACK_TARGET_COUNT > currentTransferTrack && distribution['Standby Queue'] > 0) {
            const needed = TRANSFER_TRACK_TARGET_COUNT - currentTransferTrack;
            console.log(`Transfer Track target increased to ${TRANSFER_TRACK_TARGET_COUNT} - promoting ${needed} more coasters`);
            promoteStandbyQueueToTransferTrack(true);
        }
        // If new target is smaller, demote excess coasters back to Standby Queue
        else if (TRANSFER_TRACK_TARGET_COUNT < currentTransferTrack) {
            const excess = currentTransferTrack - TRANSFER_TRACK_TARGET_COUNT;
            console.log(`Transfer Track target decreased to ${TRANSFER_TRACK_TARGET_COUNT} - demoting ${excess} coasters back to Standby Queue`);
            
            // Get all Transfer Track coasters sorted by least battles first (demote those with least progress)
            const transferTrackCoasters = Object.values(coasterStats)
                .filter(s => s.phase === 'Transfer Track')
                .sort((a, b) => a.battles - b.battles);
            
            // Demote the excess coasters with fewest battles
            for (let i = 0; i < Math.min(excess, transferTrackCoasters.length); i++) {
                transferTrackCoasters[i].phase = 'Standby Queue';
                console.log(`Demoted to Standby Queue: ${transferTrackCoasters[i].name} (${transferTrackCoasters[i].battles} battles)`);
            }
        }
        
        saveData();
        updateRanking();
    }
    
    function setTransferTrackMinBattles(val) {
        const num = Number(val);
        if (isNaN(num) || num < 1) return;
        const oldMinBattles = TRANSFER_TRACK_MIN_BATTLES;
        TRANSFER_TRACK_MIN_BATTLES = Math.round(num);
        const el = document.getElementById('transferTrackMinBattlesValue');
        if (el) el.textContent = TRANSFER_TRACK_MIN_BATTLES;
        
        // Reprocess all Transfer Track coasters to check if they should graduate to ranked
        console.log(`Transfer Track min battles changed from ${oldMinBattles} to ${TRANSFER_TRACK_MIN_BATTLES} - checking phase transitions`);
        
        const transferTrackCoasters = Object.values(coasterStats).filter(s => s.phase === 'Transfer Track');
        let transitioned = 0;
        transferTrackCoasters.forEach(stats => {
            if (checkCoasterPhaseTransition(stats.name)) {
                transitioned++;
            }
        });
        
        if (transitioned > 0) {
            console.log(`${transitioned} coaster(s) transitioned from Transfer Track to Ranked`);
            // Backfill Transfer Track pool if needed
            manageTransferTrackPool();
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

    function resetTransferTrackGroupSize() {
        const defaultValue = 20;
        const rangeEl = document.getElementById('transferTrackGroupSizeRange');
        if (rangeEl) rangeEl.value = defaultValue;
        setTransferTrackGroupSize(defaultValue);
    }

    function resetTransferTrackMinBattles() {
        const defaultValue = 5;
        const rangeEl = document.getElementById('transferTrackMinBattlesRange');
        if (rangeEl) rangeEl.value = defaultValue;
        setTransferTrackMinBattles(defaultValue);
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
        const transferTrackGroupRange = document.getElementById('transferTrackGroupSizeRange');
        const transferTrackGroupVal = document.getElementById('transferTrackGroupSizeValue');
        if (transferTrackGroupRange) transferTrackGroupRange.value = TRANSFER_TRACK_TARGET_COUNT;
        if (transferTrackGroupVal) transferTrackGroupVal.textContent = TRANSFER_TRACK_TARGET_COUNT;
        
        const transferTrackBattlesRange = document.getElementById('transferTrackMinBattlesRange');
        const transferTrackBattlesVal = document.getElementById('transferTrackMinBattlesValue');
        if (transferTrackBattlesRange) transferTrackBattlesRange.value = TRANSFER_TRACK_MIN_BATTLES;
        if (transferTrackBattlesVal) transferTrackBattlesVal.textContent = TRANSFER_TRACK_MIN_BATTLES;
        
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
        
        // Reload coasters from user credits
        loadUserCredits();
        coasters = buildCoastersFromCredits();
        
        coasterStats = initializeStats();
        totalBattlesCount = 0;
        coasterHistory = [];
        completedPairs = new Set();
        
        // Initialize phase system - promote 25 random coasters to Transfer Track
        promoteStandbyQueueToTransferTrack(true);
        
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
                // achievementManager.recordExport(); // Method doesn't exist
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
                
                if (data.coasterStats) {
                    // Normalize old phase names to new names during import
                    coasterStats = data.coasterStats;
                    Object.values(coasterStats).forEach(stats => {
                        if (stats.phase === 'waiting') stats.phase = 'Standby Queue';
                        if (stats.phase === 'seeding') stats.phase = 'Transfer Track';
                    });
                }
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
                    const winnerRankBefore = getCoasterRank(winner.name);
                    const loserRankBefore = getCoasterRank(loser.name);
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
                    const winnerRankAfter = getCoasterRank(winner.name);
                    const loserRankAfter = getCoasterRank(loser.name);
                    const wasCloseMatch = isCloseFightMatchup(winner.name, loser.name);
                    
                    // Build comprehensive battle stats
                    const battleStats = {
                        statsA: {
                            ratingBefore: (pair[0].name === winner.name) ? winnerRatingBefore : loserRatingBefore,
                            ratingAfter: (pair[0].name === winner.name) ? winnerStats.rating : loserStats.rating,
                            rdBefore: (pair[0].name === winner.name) ? winnerRDBefore : loserRDBefore,
                            volatilityBefore: (pair[0].name === winner.name) ? winnerVolatilityBefore : loserVolatilityBefore
                        },
                        statsB: {
                            ratingBefore: (pair[1].name === winner.name) ? winnerRatingBefore : loserRatingBefore,
                            ratingAfter: (pair[1].name === winner.name) ? winnerStats.rating : loserStats.rating,
                            rdBefore: (pair[1].name === winner.name) ? winnerRDBefore : loserRDBefore,
                            volatilityBefore: (pair[1].name === winner.name) ? winnerVolatilityBefore : loserVolatilityBefore
                        },
                        closeFight: wasCloseMatch
                    };

                    // record battle (keeps completedPairs) — skip immediate save to batch at the end
                    recordBattle(pair[0], pair[1], winner.name, loser.name, { skipSave: true, battleStats });
                    
                    // Check phase transitions for both coasters after battle
                    checkCoasterPhaseTransition(winner.name);
                    checkCoasterPhaseTransition(loser.name);
                    
                    // Periodically manage Transfer Track pool (every 10 battles to avoid overhead)
                    if (simulated % 10 === 0) {
                        manageTransferTrackPool();
                    }

                    simulated++;
                    if (progressCallback && (simulated % 10 === 0)) progressCallback(simulated, count);
                }
                // yield to event loop between batches
                await new Promise(r => setTimeout(r, 0));
            }
            
            // Final phase updates after all battles
            manageTransferTrackPool();
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
        const leftStats = coasterStats[left.name] || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };
        const rightStats = coasterStats[right.name] || { rating:GLICKO2_RATING_BASE, rd:GLICKO2_RD_INITIAL, volatility:GLICKO2_VOLATILITY_INITIAL, battles:0, wins:0, losses:0 };
        // compute Glicko-2 scenarios once
        const leftIfWin = calculateGlicko2(leftStats, rightStats);
        const leftIfLose = calculateGlicko2(rightStats, leftStats);
        const leftGainWin = Math.round(leftIfWin.newWinnerRating - leftStats.rating);
        const leftLoseIfLose = Math.round(leftIfLose.newLoserRating - leftStats.rating);
        const rightGainWin = Math.round(leftIfLose.newWinnerRating - rightStats.rating);
        const rightLoseIfLose = Math.round(leftIfWin.newLoserRating - rightStats.rating);
        const fmt = (n) => (n >= 0 ? '+' + n : n.toString());

        const rank1 = getCoasterRank(left.name);
        const rank2 = getCoasterRank(right.name);

        const leftPhase = leftStats.phase || 'Standby Queue';
        const rightPhase = rightStats.phase || 'Standby Queue';
        
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
                <div id="imageInfo_${left.name.replace(/[^a-z0-9]/gi, '_')}" style="font-size:0.85em;color:#aaa;margin-bottom:4px;"></div>
                <button onclick="retryCoasterImage('${left.name.replace(/'/g, "\\'")}', '${left.park.replace(/'/g, "\\'")}', '${left.manufacturer.replace(/'/g, "\\'")}', '${left.name.replace(/[^a-z0-9]/gi, '_')}', event)" style="font-size:0.85em;padding:2px 6px;background:#4CA1AF;color:white;border:none;border-radius:4px;cursor:pointer;">🔄 Retry Image</button>
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
                <div id="imageInfo_${right.name.replace(/[^a-z0-9]/gi, '_')}" style="font-size:0.85em;color:#aaa;margin-bottom:4px;"></div>
                <button onclick="retryCoasterImage('${right.name.replace(/'/g, "\\'")}', '${right.park.replace(/'/g, "\\'")}', '${right.manufacturer.replace(/'/g, "\\'")}', '${right.name.replace(/[^a-z0-9]/gi, '_')}', event)" style="font-size:0.85em;padding:2px 6px;background:#4CA1AF;color:white;border:none;border-radius:4px;cursor:pointer;">🔄 Retry Image</button>
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
    // Returns the pre-calculated rank from coasterStats (single source of truth)
    function getCoasterRank(coasterName) {
        if (!coasterName || !coasterStats[coasterName]) return null;
        return coasterStats[coasterName].rank || null;
    }

    // helper: record a battle into history
    function recordBattle(a, b, winnerName, loserName, { skipSave = false, battleStats = null } = {}) {
        const key = pairKey(a.name, b.name);
        const entry = {
            pairKey: key,
            left: a.name,  // Store left position
            right: b.name, // Store right position
            a: a.name,
            b: b.name,
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
                        const name = coasters[i].name;
                        const stats = coasterStats && coasterStats[name] ? coasterStats[name] : null;
                        const battles = stats && typeof stats.battles === 'number' ? stats.battles : 0;
                        const phase = stats && stats.phase ? stats.phase : 'Standby Queue';
                        
                        // Skip coasters in Standby Queue phase (not yet active)
                        if (phase === 'Standby Queue') {
                            weights[i] = 0;
                            continue;
                        }
                        
                        // base exploration weight: inverse of (1 + battles) ^ EXPLORATION_POWER
                        // Cap battles at 10 for weight calculation to prevent ranked coasters from being too disadvantaged
                        const cappedBattles = Math.min(battles, 10);
                        let w = 1 / Math.pow(1 + Math.max(0, cappedBattles), EXPLORATION_POWER);
                        
                        // No phase multipliers - using 50% forced seeding instead for predictable drainage
                        // (See forced seeding logic below)
                        
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

                // Hybrid strategy: 50% forced Transfer Track battles, 50% normal weighted selection
                // This ensures Transfer Track pool drains predictably over time
                const transferTrackCoasters = [];
                for (let k = 0; k < length; k++) {
                    const nameK = coasters[k].name;
                    const statsK = coasterStats && coasterStats[nameK] ? coasterStats[nameK] : null;
                    const phaseK = statsK && statsK.phase ? statsK.phase : 'Standby Queue';
                    if (phaseK === 'Transfer Track') {
                        transferTrackCoasters.push(k);
                    }
                }
                
                const forceTransferTrack = transferTrackCoasters.length > 0 && randomFn() < 0.5;
                
                const indexFromExploration = () => {
                    if (forceTransferTrack) {
                        // Pick from Transfer Track pool only
                        const transferTrackIndex = Math.floor(randomFn() * transferTrackCoasters.length);
                        return transferTrackCoasters[transferTrackIndex];
                    }
                    return sampleIndexFromWeights(weights, randomFn);
                };
                
                for (let t = 0; t < attempts; t++) {
                    const i = indexFromExploration();
                    // use displayedRating (regularized) for pairing proximity calculations
                    const ratingI = (coasterStats && coasterStats[coasters[i].name]) ? displayedRating(coasterStats[coasters[i].name]) : GLICKO2_RATING_BASE;
                    const condWeights = new Array(length);
                    for (let k = 0; k < length; k++) {
                        if (k === i) { condWeights[k] = 0; continue; }
                        const nameK = coasters[k].name;
                        const statsK = coasterStats && coasterStats[nameK] ? coasterStats[nameK] : null;
                        const phaseK = statsK && statsK.phase ? statsK.phase : 'Standby Queue';
                        
                        // Skip Standby Queue coasters
                        if (phaseK === 'Standby Queue') {
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
                    const key = pairKey(a.name, b.name);
                    if (!completedPairs.has(key)) return [a, b];
                }

                // fallback scanning approach: try to find any unseen pair deterministically
                // But only among Transfer Track/ranked coasters (skip Standby Queue)
                for (let i = 0; i < length; i++) {
                    const statsI = coasterStats && coasterStats[coasters[i].name] ? coasterStats[coasters[i].name] : null;
                    const phaseI = statsI && statsI.phase ? statsI.phase : 'Standby Queue';
                    if (phaseI === 'Standby Queue') continue;
                    
                    for (let j = i + 1; j < length; j++) {
                        const statsJ = coasterStats && coasterStats[coasters[j].name] ? coasterStats[coasters[j].name] : null;
                        const phaseJ = statsJ && statsJ.phase ? statsJ.phase : 'Standby Queue';
                        if (phaseJ === 'Standby Queue') continue;
                        
                        const a = coasters[i], b = coasters[j];
                        const key = pairKey(a.name, b.name);
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

    // Conservative rating estimate (standard Glicko-2 ranking approach)
    function displayedRating(stats) {
        if (!stats) return GLICKO2_RATING_BASE;
        const n = stats.battles || 0;
        if (n === 0) return GLICKO2_RATING_BASE;
        
        // Use rating - 2*RD as conservative estimate
        // High RD (uncertain) = larger penalty, Low RD (certain) = smaller penalty
        return stats.rating - 2 * stats.rd;
    }

    // Recalculate all ranks and store them in coasterStats
    // This is the single source of truth for ranking - call after any rating change
    function recalculateAllRanks() {
        // Filter to ranked phase only
        const rankedCoasters = Object.values(coasterStats)
            .filter(s => s.phase === 'ranked');
        
        // Sort by displayedRating (conservative estimate with RD penalty)
        rankedCoasters.sort((a, b) => displayedRating(b) - displayedRating(a));
        
        // Assign ranks to ranked coasters
        rankedCoasters.forEach((stats, index) => {
            stats.rank = index + 1;
        });
        
        // Set non-ranked coasters to null
        Object.values(coasterStats).forEach(stats => {
            if (stats.phase !== 'ranked') {
                stats.rank = null;
            }
        });
    }

    // ========================================
    // END GLICKO-2 RATING SYSTEM
    // ========================================

    // Ensure a coaster has an entry in `coasterStats`. Returns the stats object.
    function ensureCoasterStats(coaster) {
        if (!coaster || !coaster.name) return null;
        const name = coaster.name;
        if (!coasterStats[name]) {
            coasterStats[name] = {
                name: name,
                park: coaster.park || (coaster.park === undefined ? '' : coaster.park),
                manufacturer: coaster.manufacturer || coaster.manufacturer || '',
                rating: GLICKO2_RATING_BASE,
                rd: GLICKO2_RD_INITIAL,
                volatility: GLICKO2_VOLATILITY_INITIAL,
                battles: 0,
                wins: 0,
                losses: 0,
                firstBattleDate: null,
                rank: null
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

        // build eligible pairs using centralized close fight rules
        const eligible = [];
        for (let i = 0; i < sorted.length; i++){
            for (let j = i+1; j < sorted.length; j++){
                const a = sorted[i], b = sorted[j];
                if (isCloseFightMatchup(a.name, b.name)) {
                    eligible.push([a, b]);
                }
            }
        }
        if (eligible.length === 0) return null;
        const idx = Math.floor(Math.random() * eligible.length);
        // return original coaster objects from coasters array (to preserve .name keys)
        const pick = eligible[idx];
        // try to map back to full coaster objects in `coasters`
        const aObj = coasters.find(c => (c.name || c.name) === pick[0].name) || pick[0];
        const bObj = coasters.find(c => (c.name || c.name) === pick[1].name) || pick[1];
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
                console.log('🎬 CLOSE INTRO START:', a.name, 'vs', b.name);
                const startTime = performance.now();
                
                // mark intro active so other flows don't re-trigger it
                closeIntroActive = true;
                // temporarily block choices to ensure user notices
                const prevProcessing = isProcessingChoice;
                isProcessingChoice = true;

                const overlay = document.getElementById('closeBattleOverlay');
                const banner = document.getElementById('closeBanner');
                const battleContainerEl = DOM.battleContainer || document.getElementById('battleContainer');
                
                // IMPORTANT: Get only the OUTER wrappers from the current visible slot
                // Use .coaster-item > .credit-card-outer to get exactly 2 cards
                const currentSlot = currentSlotIsA ? battleSlotA : battleSlotB;
                const coasterItems = currentSlot ? currentSlot.querySelectorAll('.coaster-item') : [];
                const cards = [];
                
                // Extract the first child (credit-card-outer) from each coaster-item
                coasterItems.forEach(item => {
                    const outerCard = item.querySelector('.credit-card-outer');
                    if (outerCard) cards.push(outerCard);
                });
                
                console.log(`  📦 Found ${cards.length} cards for intro (should be 2)`);
                
                if (cards.length !== 2) {
                    console.warn(`  ⚠️ Expected 2 cards, found ${cards.length} - aborting intro`);
                    closeIntroActive = false;
                    isProcessingChoice = prevProcessing;
                    resolve();
                    return;
                }
                
                // bring cards above overlay during intro
                const prevZ = battleContainerEl && battleContainerEl.style ? battleContainerEl.style.zIndex : null;
                if (battleContainerEl) battleContainerEl.style.zIndex = 10030;
                
                // FIRST: Hide both cards immediately with inline styles to prevent flash
                console.log('  🫥 Hiding both cards with inline styles...');
                if (cards[0]) { 
                    cards[0].style.opacity = '0';
                    cards[0].style.transform = 'scale(0.8)';
                    console.log('    ✓ Left card hidden (opacity=0, scale=0.8)');
                }
                if (cards[1]) { 
                    cards[1].style.opacity = '0';
                    cards[1].style.transform = 'scale(0.8)';
                    console.log('    ✓ Right card hidden (opacity=0, scale=0.8)');
                }
                
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
                // set overlay to a visible intro state (but not the banner - cards will show the yellow banner)
                console.log('  🎭 Showing overlay (without text banner)...');
                overlay.classList.add('show');
                // Explicitly hide the banner element and ensure it's not visible
                if (banner) {
                    banner.classList.remove('show');
                    banner.style.display = 'none';
                    banner.setAttribute('aria-hidden', 'true');
                }
                // highlight the two cards and add hidden class
                console.log('  ✨ Adding close-highlight and close-hidden classes...');
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
                const BANNER_MS = 1200; // faster intro
                console.log(`  ⏱️ Waiting ${BANNER_MS}ms before revealing cards...`);
                setTimeout(()=>{
                    console.log(`  🎬 ${BANNER_MS}ms elapsed - revealing slot and LEFT card now`);
                    // Restore slot opacity first
                    if (currentSlot) {
                        currentSlot.style.opacity = '';
                        console.log('    ✓ Slot opacity restored');
                    }
                    // reveal left then right with a small stagger
                    if (cards[0]) {
                        cards[0].classList.remove('close-hidden');
                        cards[0].classList.add('revealed');
                        cards[0].classList.add('pop');
                        cards[0].style.opacity = '';
                        cards[0].style.transform = '';
                        console.log('    ✓ Left card revealed (classes + styles cleared)');
                        setTimeout(()=>{ cards[0].classList.remove('pop'); }, 700);
                    }
                    setTimeout(()=>{
                        console.log(`  🎬 +300ms - revealing RIGHT card now`);
                        if (cards[1]) { 
                            cards[1].classList.remove('close-hidden'); 
                            cards[1].classList.add('revealed'); 
                            cards[1].classList.add('pop'); 
                            cards[1].style.opacity = '';
                            cards[1].style.transform = '';
                            console.log('    ✓ Right card revealed (classes + styles cleared)');
                            setTimeout(()=>{ cards[1].classList.remove('pop'); }, 700); 
                        }
                        // hide banner and overlay after a short pause so cards are visible
                        setTimeout(()=>{
                            console.log('  🎬 +400ms - cleaning up intro...');
                            // Don't need to hide banner since we never showed it
                            // banner.classList.remove('show');
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
                                const totalTime = performance.now() - startTime;
                                console.log(`✅ CLOSE INTRO COMPLETE - Total time: ${totalTime.toFixed(0)}ms`);
                        }, 400);
                    }, 300);
                }, BANNER_MS);
            }catch(e){ 
                console.error('❌ CLOSE INTRO ERROR:', e);
                isProcessingChoice = false; 
                resolve(); 
            }
        });
    }

    // Celebrate a winner by animating the existing card in-place and spawning confetti
    function celebrateWinner(cardEl, winnerName){
        return new Promise((resolve)=>{
            try {
                console.log('🎉 CONFETTI START for:', winnerName);
                if (!cardEl) {
                    console.warn('  ⚠️ No card element provided - skipping confetti');
                    return resolve();
                }

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
                
                console.log(`  🎊 Creating ${confettiCount} confetti pieces...`);
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
                console.log(`  ✓ Confetti spawned at (${cx.toFixed(0)}, ${cy.toFixed(0)})`);

                const winnerText = document.getElementById('winnerText');
                if (winnerText) winnerText.textContent = `${winnerName} WINS!`;
                if (winnerBurst) winnerBurst.classList.add('show','big');

                setTimeout(()=>{
                    console.log('  🧹 Cleaning up confetti...');
                    try{
                        if (winnerBurst) winnerBurst.classList.remove('show','big');
                        confettiEls.forEach(c => c.remove());
                        cardEl.classList.remove('celebrate-in-place');
                        console.log('  ✓ Confetti cleanup complete');
                        
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
            const aStats = coasterStats[(coasterA.name || coasterA.name)];
            const bStats = coasterStats[(coasterB.name || coasterB.name)];
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

    // Initialize battle slot DOM elements - called once at app start
    function initializeBattleSlots() {
        const battleContainer = DOM.battleContainer || document.getElementById('battleContainer');
        if (!battleContainer) return;
        
        // Create 2 slots for ping-pong alternation
        battleSlotA = document.createElement('div');
        battleSlotB = document.createElement('div');
        
        // Slot A - initially visible
        battleSlotA.id = 'battleSlotA';
        battleSlotA.className = 'battle-slot';
        battleSlotA.style.cssText = 'display: flex; flex-direction: row; gap: 20px; justify-content: center; align-items: flex-start; width: 100%; visibility: visible; position: relative;';
        
        // Slot B - initially hidden
        battleSlotB.id = 'battleSlotB';
        battleSlotB.className = 'battle-slot';
        battleSlotB.style.cssText = 'display: flex; flex-direction: row; gap: 20px; justify-content: center; align-items: flex-start; width: 100%; visibility: hidden; position: absolute; top: 0; left: 0; pointer-events: none;';
        
        // Append both to battle container
        battleContainer.appendChild(battleSlotA);
        battleContainer.appendChild(battleSlotB);
        
        console.log('✓ Battle slots initialized (2-slot ping-pong)');
    }

    // Pre-render next battle in background for instant display
    async function preRenderNextBattle() {
        if (isPrerendering || !currentUser || !coasters || coasters.length < 2) return;
        if (!battleSlotA || !battleSlotB) return;
        
        const startTime = performance.now();
        console.log('🔄 preRenderNextBattle STARTED');
        isPrerendering = true;
        try {
            // Determine hidden slot (opposite of current)
            const hiddenSlot = currentSlotIsA ? battleSlotB : battleSlotA;
            
            // Get next battle pair
            const nextPair = nextBattlePreloaded || getRandomCoasters();
            if (!nextPair || nextPair.length !== 2) {
                isPrerendering = false;
                return;
            }
            
            // Clear nextBattlePreloaded after using it
            if (nextBattlePreloaded) {
                nextBattlePreloaded = null;
            }
            
            const [left, right] = nextPair;
            
            // Get image URLs from cache (instant)
            const urlStartTime = performance.now();
            const leftImageUrl = getCoasterImageSync(left);
            const rightImageUrl = getCoasterImageSync(right);
            console.log(`  📦 Image URLs retrieved in ${(performance.now() - urlStartTime).toFixed(1)}ms`);
            
            const rank1 = getCoasterRank(left.name);
            const rank2 = getCoasterRank(right.name);
            
            // Check if close fight using centralized function
            const isCloseFightMatch = isCloseFightMatchup(left.name, right.name);
            
            // Generate battle card HTML
            const generateBattleCard = (coaster, imageUrl, rank, choice) => {
                const stats = coasterStats[coaster.name] || {};
                const battles = stats.battles || 0;
                const isFirstBattle = (battles === 0);
                
                return generateCreditCardHTML(coaster.id, {
                    showRank: true,
                    clickable: false,
                    dataChoice: choice,
                    showFirstBattle: isFirstBattle
                });
            };
            
            // Render directly into hidden slot (stays in DOM, images stay decoded)
            const renderStartTime = performance.now();
            hiddenSlot.innerHTML = `
                ${isCloseFightMatch ? '<div class="close-fight-banner">⚔️ CLOSE FIGHT ⚔️</div>' : ''}
                <div class="coaster-item">
                    ${generateBattleCard(left, leftImageUrl, rank1, 0)}
                </div>
                <div class="coaster-item">
                    ${generateBattleCard(right, rightImageUrl, rank2, 1)}
                </div>
            `;
            console.log(`  🎨 HTML rendered in ${(performance.now() - renderStartTime).toFixed(1)}ms`);
            
            // Wait for images in THIS slot to decode (not cache container)
            const decodeStartTime = performance.now();
            const imgElements = hiddenSlot.querySelectorAll('.battle-card img');
            console.log(`  🖼️ Found ${imgElements.length} img elements, starting decode...`);
            if (imgElements.length > 0) {
                await Promise.all(Array.from(imgElements).map((img, idx) => {
                    const imgStart = performance.now();
                    
                    // Skip placeholders (SVG data URIs) - they're already instant
                    if (img.src.startsWith('data:image/svg+xml')) {
                        console.log(`    ⏭️ Image ${idx} is placeholder - skipping decode`);
                        return Promise.resolve();
                    }
                    
                    if (img.complete && img.naturalWidth > 0) {
                        console.log(`    ✓ Image ${idx} already loaded (${img.naturalWidth}x${img.naturalHeight})`);
                        return Promise.resolve();
                    }
                    console.log(`    ⏳ Image ${idx} decoding... src=${img.src.substring(0, 50)}...`);
                    return img.decode().then(() => {
                        console.log(`    ✓ Image ${idx} decoded in ${(performance.now() - imgStart).toFixed(1)}ms (${img.naturalWidth}x${img.naturalHeight})`);
                    }).catch((e) => {
                        // Bad Wikimedia URL - decode failed (expected for some coasters)
                        console.log(`    ⏭️ Image ${idx} decode failed (bad URL) - using placeholder`);
                        return Promise.resolve();
                    });
                }));
            }
            console.log(`  ✅ All images decoded in ${(performance.now() - decodeStartTime).toFixed(1)}ms`);
            
            // Store battle data
            nextBattleData = {
                battle: nextPair,
                isCloseFight: isCloseFightMatch
            };
            
            console.log(`✅ Pre-rendered battle in ${(performance.now() - startTime).toFixed(1)}ms:`, left.name, 'vs', right.name);
            
        } catch (error) {
            console.error('Error pre-rendering next battle:', error);
        } finally {
            isPrerendering = false;
        }
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
            const currentSlot = currentSlotIsA ? battleSlotA : battleSlotB;
            if (currentSlot) {
                currentSlot.innerHTML = '<div class="no-battles">Not enough coasters for battles. Add more coasters in the Credits tab.</div>';
                currentSlot.style.visibility = 'visible';
            } else {
                (DOM.battleContainer || $id('battleContainer')).innerHTML = '<div class="no-battles">Not enough coasters for battles. Add more coasters in the Credits tab.</div>';
            }
            currentBattle = null;
            return;
        }

        try { if (battleContainerEl) battleContainerEl.style.display = ''; } catch (e) {}
        
        // INSTANT PING-PONG SWAP - but only if NOT currently processing a choice (to allow animations to complete)
        // AND only if currentBattle is not already set (e.g., by force close fight button)
        const hiddenSlot = currentSlotIsA ? battleSlotB : battleSlotA;
        if (!isProcessingChoice && !currentBattle && battleSlotA && battleSlotB && nextBattleData && hiddenSlot.children.length > 0) {
            // INSTANT SWAP! Toggle to pre-rendered slot
            const currentSlot = currentSlotIsA ? battleSlotA : battleSlotB;
            
            currentBattle = nextBattleData.battle;
            
            // Hide current slot
            console.log('🔄 SLOT SWAP: Hiding current, showing pre-rendered hidden slot');
            currentSlot.style.visibility = 'hidden';
            currentSlot.style.position = 'absolute';
            currentSlot.style.pointerEvents = 'none';
            
            // Show hidden slot (already has content and decoded images)
            hiddenSlot.style.visibility = 'visible';
            hiddenSlot.style.position = 'relative';
            hiddenSlot.style.pointerEvents = 'auto';
            
            // Remove any winner/loser classes from previous battles - check ALL possible class targets
            hiddenSlot.classList.remove('winner', 'loser');
            const hiddenCards = hiddenSlot.querySelectorAll('.battle-card, .coaster-item, .coaster-card, .credit-card-outer');
            hiddenCards.forEach(el => {
                el.classList.remove('winner', 'loser', 'win', 'lose');
                el.style.opacity = ''; // Clear any inline opacity
            });
            
            // Toggle flag for next battle
            currentSlotIsA = !currentSlotIsA;
            
            // Clear battle data (will be refilled by pre-render)
            nextBattleData = null;
            
            // Add click handlers to now-visible cards
            const coasterCards = hiddenSlot.querySelectorAll('.battle-card');
            coasterCards.forEach(card => {
                card.addEventListener('click', (e) => {
                    const clickedOverlay = e.target.classList.contains('dev-data-overlay') || e.target.closest('.dev-data-overlay');
                    if (clickedOverlay) return;
                    const choice = parseInt(card.getAttribute('data-choice'));
                    chooseWinner(choice);
                });
            });
            
            // Render dev overlays and other UI
            renderDevData();
            setTimeout(syncSimInputWidth, 0);
            
            // Save the battle for persistence
            saveData();
            
            // Clear old slot content and remove any leftover classes, then pre-render NEXT battle
            currentSlot.innerHTML = '';
            currentSlot.classList.remove('winner', 'loser');
            setTimeout(() => preRenderNextBattle(), 10);
            
            console.log('⚡ INSTANT ping-pong swap to', currentSlotIsA ? 'slot A' : 'slot B');
            return; // DONE - instant display!
        }
        
        // FALLBACK: First battle or no pre-render available
        if (!battleSlotA || !battleSlotB) {
            console.warn('Battle slots not initialized');
            return;
        }
        
        // If developer forced a close battle and `currentBattle` is already set, don't overwrite it.
        if (!currentBattle || (!devForceCloseBattle && currentBattle.length !== 2)) {
            if (nextBattlePreloaded && nextBattlePreloaded.length === 2) {
                currentBattle = nextBattlePreloaded;
                nextBattlePreloaded = null;
            } else {
                currentBattle = getRandomCoasters();
            }
        }
        
        // Check if no more pairs available
        if (!currentBattle || currentBattle.length === 0) {
            const currentSlot = currentSlotIsA ? battleSlotA : battleSlotB;
            currentSlot.innerHTML = '<div class="no-battles">🎉 Congratulations!<br><br>You have completed all possible matchups!<br><br>Check the ranking tab to see your final list.</div>';
            currentSlot.style.visibility = 'visible';
            return;
        }
        
        // Get current rankings for both coasters
        const rank1 = getCoasterRank(currentBattle[0].name);
        const rank2 = getCoasterRank(currentBattle[1].name);
        
        const left = currentBattle[0];
        const right = currentBattle[1];
        
        // Check if close fight using centralized function
        const isCloseFight = isCloseFightMatchup(left.name, right.name);
        
        // Render into slot0
        const leftImageUrl = getCoasterImageSync(left);
        const rightImageUrl = getCoasterImageSync(right);
        
        const generateBattleCard = (coaster, imageUrl, rank, choice) => {
            const stats = coasterStats[coaster.name] || {};
            const battles = stats.battles || 0;
            const isFirstBattle = (battles === 0);
            
            return generateCreditCardHTML(coaster.id, {
                showRank: true,
                clickable: false,
                dataChoice: choice,
                showFirstBattle: isFirstBattle
            });
        };
        
        const currentSlot = currentSlotIsA ? battleSlotA : battleSlotB;
        
        // Clear any previous winner/loser classes
        currentSlot.classList.remove('winner', 'loser');
        
        currentSlot.innerHTML = `
            ${isCloseFight ? '<div class="close-fight-banner">⚔️ CLOSE FIGHT ⚔️</div>' : ''}
            <div class="coaster-item">
                ${generateBattleCard(left, leftImageUrl, rank1, 0)}
            </div>
            <div class="coaster-item">
                ${generateBattleCard(right, rightImageUrl, rank2, 1)}
            </div>
        `;
        
        currentSlot.style.visibility = 'visible';
        currentSlot.style.position = 'relative';
        currentSlot.style.pointerEvents = 'auto';
        
        // Decode images in background (don't await - let them load while user sees the battle)
        const imgElements = currentSlot.querySelectorAll('.battle-card img');
        if (imgElements.length > 0) {
            Promise.all(Array.from(imgElements).map(img => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return img.decode().catch(() => Promise.resolve());
            })).catch(() => {}); // Fire and forget
        }
        
        // Add click handlers
        const coasterCards = currentSlot.querySelectorAll('.battle-card');
        coasterCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const clickedOverlay = e.target.classList.contains('dev-data-overlay') || e.target.closest('.dev-data-overlay');
                if (clickedOverlay) return;
                const choice = parseInt(card.getAttribute('data-choice'));
                chooseWinner(choice);
            });
        });
        
        // Start background preloading for next battles immediately
        preloadNextBattles();
        
        // If this matchup qualifies as a close fight, play the intro animation
        // Check if eligible for close fight intro using centralized function
        const isCloseEligible = isCloseFightMatchup(left.name, right.name);
        console.log(`🎯 Close fight check: ${isCloseEligible ? 'YES' : 'NO'} - ${left.name} vs ${right.name}`);
        
        // Determine whether an epic intro will fire on the next battle (rare event)
        function willEpicTriggerOnNext(){
            try{
                const counter = Number(localStorage.getItem(CR_STORAGE_COUNTER) || 0);
                const threshold = Number(localStorage.getItem(CR_STORAGE_THRESHOLD) || randInt(25,50));
                return (counter + 1) >= threshold;
            }catch(e){ return false; }
        }

        // If this is a close fight, hide the slot immediately and trigger intro
        if (devForceCloseBattle || isCloseEligible) {
            if (devForceCloseBattle) {
                console.log('🔧 DEV MODE: Force close fight triggered');
            } else {
                console.log('⚔️ Close fight detected - hiding slot and starting intro');
            }
            
            // Hide the current slot immediately to prevent flash
            currentSlot.style.opacity = '0';
            console.log('  🫥 Slot hidden (opacity=0) to prevent card flash');
            
            // Trigger intro immediately with no delay
            try { if (closeIntroTimeout) { clearTimeout(closeIntroTimeout); closeIntroTimeout = null; } } catch (e) {}
            showCloseIntro(left, right).catch(()=>{});
        } else {
            console.log('📊 Regular battle - no intro animation');
        }

        // Delegate overlay rendering to a dedicated function so we can update without reselecting the pair
        renderDevData();
        // sync input width after cards are rendered
        setTimeout(syncSimInputWidth, 0);
        
        // Pre-render next battles (don't save here - it's saved after each battle in chooseWinner)
        setTimeout(() => preRenderNextBattle(), 10);
        
        console.log('First battle rendered into slot0');
    }

    // Explicitly hide/show the battle UI (cards). Use this from tab switching
    function setBattleVisibility(visible) {
        const battleContainerEl = DOM.battleContainer;
        try {
            if (battleContainerEl) battleContainerEl.style.display = visible ? '' : 'none';
        } catch (e) {}
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

        // Get old ranks before battle (only ranked coasters have ranks)
        const oldWinnerRank = getCoasterRank(winner.name);
        const oldLoserRank = getCoasterRank(loser.name);
        
        // Track old phase for transition detection
        const oldWinnerPhase = (coasterStats[winner.name] && coasterStats[winner.name].phase) || 'Standby Queue';

        // IMPORTANT: Determine close fight status BEFORE any stats are updated
        // This uses the pre-battle state to check if it qualifies
        const wasCloseFightBeforeBattle = isCloseFightMatchup(winner.name, loser.name);
        console.log(`🔍 Pre-battle close fight check: ${wasCloseFightBeforeBattle ? 'YES' : 'NO'} (${winner.name} vs ${loser.name})`);

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
            const newWinnerRank = getCoasterRank(winner.name);
            const newLoserRank = getCoasterRank(loser.name);
            
            // Use the pre-battle close fight status (already calculated before stats changed)
            const wasCloseMatchFlag = wasCloseFightBeforeBattle;
            
            // Build minimal battle stats for storage (only essentials for history)
            const battleStats = {
                statsA: {
                    ratingBefore: (currentBattle[0].name === winner.name) ? winnerRatingBefore : loserRatingBefore,
                    ratingAfter: (currentBattle[0].name === winner.name) ? winnerStats.rating : loserStats.rating,
                    rdBefore: (currentBattle[0].name === winner.name) ? winnerRDBefore : loserRDBefore,
                    volatilityBefore: (currentBattle[0].name === winner.name) ? winnerVolatilityBefore : loserVolatilityBefore
                },
                statsB: {
                    ratingBefore: (currentBattle[1].name === winner.name) ? winnerRatingBefore : loserRatingBefore,
                    ratingAfter: (currentBattle[1].name === winner.name) ? winnerStats.rating : loserStats.rating,
                    rdBefore: (currentBattle[1].name === winner.name) ? winnerRDBefore : loserRDBefore,
                    volatilityBefore: (currentBattle[1].name === winner.name) ? winnerVolatilityBefore : loserVolatilityBefore
                },
                closeFight: wasCloseMatchFlag
            };

            // record and persist with comprehensive stats
            recordBattle(currentBattle[0], currentBattle[1], winner.name, loser.name, { battleStats });
            
            // Check phase transitions for both coasters after battle
            checkCoasterPhaseTransition(winner.name);
            checkCoasterPhaseTransition(loser.name);
            
            // Manage Transfer Track pool (graduate and backfill from Standby Queue until empty)
            manageTransferTrackPool();
            
            // Recalculate all ranks after battle and phase changes
            recalculateAllRanks();

            // Update daily quest and session stats
            updateDailyQuest();
            updateSessionStats(wasCloseMatchFlag);
            
            // Save once after all updates are complete
            saveData();
            
            // Award XP for the battle
            let xpAmount = 10; // Base XP for battle
            if (wasCloseMatchFlag) {
                xpAmount += 5; // Bonus for close fight
            }
            awardXP(xpAmount, wasCloseMatchFlag ? 'Battle (close fight)' : 'Battle');

            // Track for achievements
            // Note: Check using current stats, but close fight was determined BEFORE battle
            // so wasCloseMatchFlag (set above) is the authoritative value
            const wasCloseFight = wasCloseMatchFlag;
            const perfectMatch = (winner.park === loser.park) && 
                               (winner.manufacturer === loser.manufacturer) &&
                               winner.park && loser.park && 
                               winner.manufacturer && loser.manufacturer;
            // Check if underdog won (lower-ranked coaster won in a close fight)
            const underdogWon = wasCloseFight && (oldWinnerRank > oldLoserRank);
            
            if (typeof achievementManager !== 'undefined') {
                achievementManager.recordBattle(index, perfectMatch, wasCloseFight, currentBattle[0].name, currentBattle[1].name, underdogWon);
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

            // Start loading next battle NOW during animation (makes it instant when ready)
            console.log('⏱️ ANIMATION STARTED - triggering prerender');
            setTimeout(() => {
                console.log('⏱️ Starting preRenderNextBattle (during animation)');
                preRenderNextBattle();
            }, 10);

            // Check for Transfer Track → Ranked transition
            const newWinnerPhase = winnerStats.phase || 'Standby Queue';
            const justBecameRanked = (oldWinnerPhase === 'Transfer Track' && newWinnerPhase === 'ranked');
            
            console.log(`🏆 Phase check: ${winner.name} | Old: ${oldWinnerPhase} → New: ${newWinnerPhase} | Became ranked: ${justBecameRanked} | New rank: ${newWinnerRank}`);
            
            if (justBecameRanked && newWinnerRank !== null) {
                console.log(`✨ Showing "Now Ranked!" badge for ${winner.name} at rank #${newWinnerRank}`);
                // Show gold "Now Ranked!" badge with new rank
                const badge = document.createElement('div');
                badge.className = 'now-ranked-badge';
                badge.innerHTML = `<span class="trophy">🏆</span><span>Now Ranked! #${newWinnerRank}</span>`;
                const winnerCard = cards[index];
                if (winnerCard) {
                    const outerWrapper = winnerCard.closest('.credit-card-outer');
                    if (outerWrapper) {
                        outerWrapper.style.position = 'relative';
                        outerWrapper.appendChild(badge);
                    }
                }
                setTimeout(() => { if (badge.parentElement) badge.remove(); }, 1200);
            } else if (oldWinnerRank !== null && newWinnerRank !== null) {
                // Show rank change badge only if both old and new ranks exist (both were already ranked)
                const rankChange = oldWinnerRank - newWinnerRank; // positive = climbed
                if (rankChange > 0) {
                    const badge = document.createElement('div');
                    badge.className = 'rank-change-badge';
                    badge.innerHTML = `<span class="arrow">↑</span><span>+${rankChange}</span>`;
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
            }

            // refresh ranking table and animate swap if the relative ordering changed between these two
            updateRanking();
            // if winner and loser switched relative order compared to before, animate swap
            // (newWinnerRank and newLoserRank already calculated above)
            const wasWinnerBelow = oldWinnerRank > oldLoserRank;
            const nowWinnerAbove = newWinnerRank < newLoserRank;
            if (wasWinnerBelow && nowWinnerAbove) {
                animateSwapInRanking(winner.name, loser.name);
            }

            // after updating ranking, if this was a close matchup, show an extended celebration
            // Use the pre-battle close fight flag (calculated before stats were updated)
            const wasCloseMatch = wasCloseFightBeforeBattle;
            console.log(`🎊 Post-battle close fight check: ${wasCloseMatch ? 'YES - triggering confetti' : 'NO'}`);
            
            if (wasCloseMatch) {
                console.log('  🎉 CLOSE FIGHT WINNER - Starting confetti celebration');
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
                console.log(`  🎯 Winner card element:`, cardEl ? 'found' : 'NOT FOUND', `(index: ${index})`);
                celebrateWinner(cardEl, winner.name).then(()=>{
                    // Check achievements after celebration
                    checkAndShowAchievements();
                    // Clear current battle before displaying next one
                    currentBattle = null;
                    // Display next battle immediately for smooth, fast experience
                    displayBattle(); isProcessingChoice = false; resolvingBattle = false;
                });
            } else {
                // Normal battle (not close fight): show winner/loser animation before next battle
                // Allow time to see the glow and winner class animation
                const DELAY = 1200; // Give enough time to see winner glow animation
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
            recordBattle(currentBattle[0], currentBattle[1], winner.name, loser.name); // Basic record without stats
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
    // Level 2 = 1000 XP, Level 10 = ~25,300 XP cumulative
    function getXPForLevel(level) {
        if (level <= 0) return 0;
        if (level === 1) return 0;
        // Steeper curve (1.2) with base 1000, rounded to nearest 50 for clean numbers
        return Math.round(1000 * Math.pow(1.2, level - 2) / 50) * 50;
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
        const totalCoasters = userCredits.size; // Use userCredits instead of coasterStats
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
            const statsArray = Object.values(coasterStats);
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

    // ===== DUEL MODE FUNCTIONALITY =====

    // Duel deck state - array of 10 coaster IDs (null = empty slot)
    let duelDeck = [null, null, null, null, null, null, null, null, null, null];
    let draggedCoasterId = null;
    let draggedFromSlot = null;
    let creditsPreloadComplete = false; // Track if background preload finished
    let currentDeckParkFilter = '';
    let currentDeckManufacturerFilter = '';
    let currentDeckSort = 'name';
    let invalidCardsExpanded = false;

    // Load deck from localStorage
    function loadDuelDeck() {
        try {
            const saved = localStorage.getItem('duelDeck');
            if (saved) {
                const loaded = JSON.parse(saved);
                // Ensure it's an array of 10 elements
                if (Array.isArray(loaded) && loaded.length === 10) {
                    duelDeck = loaded.map(id => {
                        // Validate each ID exists in database
                        if (id && coasterDatabase && coasterDatabase[id]) {
                            return id;
                        }
                        return null;
                    });
                }
            }
        } catch (e) {
            console.error('Error loading duel deck:', e);
            duelDeck = [null, null, null, null, null, null, null, null, null, null];
        }
    }

    // Save deck to localStorage
    function saveDuelDeck() {
        try {
            localStorage.setItem('duelDeck', JSON.stringify(duelDeck));
        } catch (e) {
            console.error('Error saving duel deck:', e);
        }
    }

    // Load AI difficulty from localStorage
    function loadAIDifficulty() {
        try {
            const saved = localStorage.getItem('aiDifficulty');
            return saved || 'medium';
        } catch (e) {
            return 'medium';
        }
    }

    // Save AI difficulty to localStorage
    function saveAIDifficulty(difficulty) {
        try {
            localStorage.setItem('aiDifficulty', difficulty);
        } catch (e) {
            console.error('Error saving AI difficulty:', e);
        }
    }

    // Validate if a coaster has all required data for duel
    function isCoasterValidForDuel(coaster) {
        if (!coaster) return false;
        
        // Check required numeric stats
        const hasSpeed = coaster.speed && coaster.speed !== '' && coaster.speed !== '0';
        const hasHeight = coaster.height && coaster.height !== '' && coaster.height !== '0';
        const hasLength = coaster.length && coaster.length !== '' && coaster.length !== '0';
        const hasInversions = coaster.inversions !== null && coaster.inversions !== undefined && coaster.inversions !== '';
        
        // Check required classification data
        const hasManufacturer = coaster.manufacturer && coaster.manufacturer !== '' && coaster.manufacturer !== 'Unknown';
        const hasType = coaster.type && coaster.type !== '';
        const hasDesign = coaster.design && coaster.design !== '';
        
        // Check year for age-based challenges
        const hasYear = coaster.openingYear && coaster.openingYear > 0;
        
        return hasSpeed && hasHeight && hasLength && hasInversions && 
               hasManufacturer && hasType && hasDesign && hasYear;
    }

    // Build coasters array from userCredits by looking up each ID in coasterDatabase
    function buildCoastersFromCredits() {
        const result = [];
        for (const coasterId of userCredits) {
            const masterData = coasterDatabase[coasterId];
            if (masterData) {
                result.push({
                    // User-specific data
                    rank: null,
                    
                    // Master database fields
                    id: coasterId,
                    name: masterData.name,
                    park: masterData.park,
                    country: masterData.country,
                    city: masterData.city,
                    state: masterData.state,
                    region: masterData.region,
                    opening_date: masterData.openingYear,
                    manufacturer: masterData.manufacturer,
                    material_type: masterData.type,
                    coaster_build: masterData.design,
                    coaster_model: masterData.model,
                    max_speed_kmh: masterData.speed ? parseFloat(masterData.speed) : null,
                    track_height_m: masterData.height ? parseFloat(masterData.height) : null,
                    track_length_m: masterData.length ? parseFloat(masterData.length) : null,
                    inversions: masterData.inversions ? parseInt(masterData.inversions) : 0,
                    operatief: (typeof masterData.status === 'object' ? masterData.status.state === 'operating' : masterData.status === 'Operating') ? 1 : 0,
                    // Additional fields
                    duration: masterData.duration,
                    elements: masterData.elements,
                    arrangement: masterData.arrangement,
                    capacity: masterData.capacity,
                    manufactured: masterData.manufactured,
                    mainPictureUrl: masterData.mainPictureUrl,
                    rcdbLink: masterData.rcdbLink,
                    rcdbId: masterData.rcdbId,
                    openedDate: masterData.openedDate,
                    closedDate: masterData.closedDate
                });
            }
        }
        return result;
    }

    // Get user's coasters (from profile)
    function getUserCoasters() {
        // Use the global userCredits Set which contains the user's coaster IDs
        if (!userCredits || userCredits.size === 0) {
            return [];
        }
        
        const result = [...userCredits];
        return result;
    }

    // Display main duel menu
    function displayDuelMenu() {
        loadDuelDeck();
        
        // Update deck status
        const deckStatus = document.getElementById('deckStatus');
        const deckCount = duelDeck.filter(id => id !== null).length;
        
        if (deckStatus) {
            if (deckCount === 10) {
                deckStatus.innerHTML = '<p class="deck-complete">✓ Deck complete (10/10)</p>';
            } else {
                deckStatus.innerHTML = `<p class="deck-incomplete">Deck incomplete (${deckCount}/10)</p>`;
            }
        }
        
        // Update start button
        const startBtn = document.getElementById('startDuelBtn');
        const requirement = document.getElementById('duelRequirement');
        if (startBtn) {
            startBtn.disabled = deckCount !== 10;
            startBtn.onclick = startDuel;
        }
        if (requirement) {
            if (deckCount === 10) {
                requirement.textContent = 'Ready to duel!';
                requirement.style.color = '#4CA1AF';
            } else {
                requirement.textContent = 'Build a deck of 10 coasters to start';
                requirement.style.color = '#6c757d';
            }
        }
        
        // Load and set AI difficulty
        const difficultySelect = document.getElementById('aiDifficultyMain');
        if (difficultySelect) {
            difficultySelect.value = loadAIDifficulty();
            difficultySelect.onchange = function() {
                saveAIDifficulty(this.value);
            };
        }
    }

    // Open deck builder overlay
    function openDeckBuilder() {
        loadDuelDeck();
        
        const overlay = document.getElementById('deckBuilderOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            renderDeckSlots();
            renderAvailableCards();
            updateDeckCounter();
        }
    }

    // Close deck builder overlay
    function closeDeckBuilder() {
        const overlay = document.getElementById('deckBuilderOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        // Refresh main menu
        displayDuelMenu();
    }

    // Render the 10 deck slots
    function renderDeckSlots() {
        for (let i = 0; i < 10; i++) {
            const slot = document.querySelector(`.deck-slot[data-slot="${i}"]`);
            if (!slot) continue;
            
            const coasterId = duelDeck[i];
            if (coasterId) {
                // Slot has a card - make it draggable and clickable to remove
                const cardHTML = generateCreditCardHTML(coasterId, { size: 'preview', showRank: false, clickable: false });
                slot.innerHTML = `
                    <div class="deck-slot-card" 
                         draggable="true" 
                         ondragstart="dragFromSlot(event, ${i}, '${coasterId}')"
                         ondragend="dragEnd(event)"
                         onclick="removeCardFromDeck(${i})"
                         title="Click to remove, or drag to reorder">
                        ${cardHTML}
                    </div>
                `;
                
                // Force the card to scale properly
                requestAnimationFrame(() => {
                    const slotCard = slot.querySelector('.deck-slot-card');
                    const cardOuter = slot.querySelector('.credit-card-outer');
                    if (slotCard && cardOuter) {
                        // Force container size
                        slotCard.style.width = '225px';
                        slotCard.style.height = '338px';
                        slotCard.style.overflow = 'hidden';
                        
                        // Force transform scale
                        cardOuter.style.transform = 'scale(0.5625)';
                        cardOuter.style.transformOrigin = 'top left';
                        
                        console.log('✅ Card scaled - Container:', slotCard.offsetWidth, 'x', slotCard.offsetHeight, 
                                    'Card:', cardOuter.offsetWidth, 'x', cardOuter.offsetHeight);
                    }
                });
            } else {
                // Empty slot - just clear it to show the grey box
                slot.innerHTML = '';
            }
        }
    }

    // Render available cards (using same CSS as Credits tab)
    async function renderAvailableCards() {
        const availableGrid = document.getElementById('deckAvailableCards');
        if (!availableGrid) return;
        
        // Show loading state if preload not complete
        if (!creditsPreloadComplete) {
            availableGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 2rem;"><div class="spinner" style="margin: 0 auto 1rem;"></div><p>Loading coaster images...</p></div>';
            
            // Wait for preload to complete
            const checkInterval = setInterval(() => {
                if (creditsPreloadComplete) {
                    clearInterval(checkInterval);
                    renderAvailableCardsContent();
                }
            }, 100);
            return;
        }
        
        renderAvailableCardsContent();
    }
    
    function renderAvailableCardsContent() {
        const userCoasters = getUserCoasters();
        
        let validCoasters = [];
        let invalidCoasters = [];
        
        userCoasters.forEach(coasterId => {
            const coaster = coasterDatabase[coasterId];
            if (!coaster) return;
            
            if (isCoasterValidForDuel(coaster)) {
                validCoasters.push(coasterId);
            } else {
                invalidCoasters.push({ id: coasterId, coaster });
            }
        });
        
        // Apply filters to valid coasters only
        if (currentDeckParkFilter || currentDeckManufacturerFilter) {
            validCoasters = validCoasters.filter(coasterId => {
                const coaster = coasterDatabase[coasterId];
                if (!coaster) return false;
                
                if (currentDeckParkFilter && coaster.park !== currentDeckParkFilter) {
                    return false;
                }
                if (currentDeckManufacturerFilter && coaster.manufacturer !== currentDeckManufacturerFilter) {
                    return false;
                }
                return true;
            });
        }
        
        // Apply sorting to valid coasters
        const coastersWithData = validCoasters.map(id => ({
            id,
            coaster: coasterDatabase[id]
        }));
        
        coastersWithData.sort((a, b) => {
            switch (currentDeckSort) {
                case 'name':
                    return (a.coaster.name || '').localeCompare(b.coaster.name || '');
                case 'park':
                    return (a.coaster.park || '').localeCompare(b.coaster.park || '');
                case 'manufacturer':
                    return (a.coaster.manufacturer || '').localeCompare(b.coaster.manufacturer || '');
                case 'speed':
                    const speedA = a.coaster.speed ? parseFloat(a.coaster.speed) : -1;
                    const speedB = b.coaster.speed ? parseFloat(b.coaster.speed) : -1;
                    return speedB - speedA;
                case 'height':
                    const heightA = a.coaster.height ? parseFloat(a.coaster.height) : -1;
                    const heightB = b.coaster.height ? parseFloat(b.coaster.height) : -1;
                    return heightB - heightA;
                case 'length':
                    const lengthA = a.coaster.length ? parseFloat(a.coaster.length) : -1;
                    const lengthB = b.coaster.length ? parseFloat(b.coaster.length) : -1;
                    return lengthB - lengthA;
                case 'year':
                    const yearA = a.coaster.openingYear ? parseInt(a.coaster.openingYear) : -1;
                    const yearB = b.coaster.openingYear ? parseInt(b.coaster.openingYear) : -1;
                    return yearB - yearA;
                case 'inversions':
                    const invA = a.coaster.inversions || 0;
                    const invB = b.coaster.inversions || 0;
                    return invB - invA;
                default:
                    return 0;
            }
        });
        
        const sortedCoasters = coastersWithData.map(c => c.id);
        
        // Filter out coasters already in the deck
        const coastersInDeck = new Set(duelDeck.filter(id => id !== null));
        const availableCoasters = sortedCoasters.filter(id => !coastersInDeck.has(id));
        
        // Render valid cards grid
        const availableGrid = document.getElementById('deckAvailableCards');
        if (availableGrid) {
            if (availableCoasters.length === 0) {
                const allInDeck = sortedCoasters.length > 0 && sortedCoasters.every(id => coastersInDeck.has(id));
                const message = allInDeck 
                    ? 'All matching coasters are in your deck.' 
                    : 'No coasters match the current filters.';
                availableGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 2rem;">${message}</div>`;
            } else {
                availableGrid.innerHTML = availableCoasters
                    .map(coasterId => {
                        const cardHTML = generateCreditCardHTML(coasterId, { size: 'preview', showRank: false, clickable: false });
                        // Wrap in clickable div with pointer cursor and data attribute for easy finding
                        return `<div onclick="addCardToDeck('${coasterId}')" style="cursor: pointer;" class="deck-available-card" data-coaster-id="${coasterId}">${cardHTML}</div>`;
                    })
                    .filter(html => html !== '')
                    .join('');
                availableGrid.style.display = 'grid';
                availableGrid.style.visibility = 'visible';
            }
        }
        
        // Render invalid cards section
        const invalidSection = document.getElementById('deckInvalidSection');
        const invalidGrid = document.getElementById('deckInvalidCards');
        const invalidCount = document.getElementById('invalidCardsCount');
        
        if (invalidCoasters.length > 0) {
            // Show invalid section
            if (invalidSection) invalidSection.style.display = 'block';
            
            // Update count
            if (invalidCount) {
                invalidCount.textContent = `${invalidCoasters.length} Coaster${invalidCoasters.length === 1 ? '' : 's'} with Incomplete Data`;
            }
            
            // Render invalid cards (always sorted alphabetically)
            invalidCoasters.sort((a, b) => (a.coaster.name || '').localeCompare(b.coaster.name || ''));
            
            if (invalidGrid) {
                invalidGrid.innerHTML = invalidCoasters
                    .map(({ id, coaster }) => {
                        const missingStats = [];
                        if (!coaster.speed || coaster.speed === '0') missingStats.push('Speed');
                        if (!coaster.height || coaster.height === '0') missingStats.push('Height');
                        if (!coaster.length || coaster.length === '0') missingStats.push('Length');
                        
                        const cardHTML = generateCreditCardHTML(id, { size: 'preview', showRank: false, clickable: false });
                        
                        return `
                            <div class="invalid-card-wrapper" style="position: relative; opacity: 0.5;" title="Missing: ${missingStats.join(', ')}">
                                ${cardHTML}
                                <div style="position: absolute; top: 8px; right: 8px; background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 600; pointer-events: none;">Missing Data</div>
                            </div>
                        `;
                    })
                    .join('');
            }
        } else {
            // Hide invalid section if no invalid cards
            if (invalidSection) invalidSection.style.display = 'none';
        }
        
        // Populate filter dropdowns if needed
        populateDeckFilters();
    }
    
    // Populate deck filter dropdowns
    function populateDeckFilters() {
        const userCoasters = getUserCoasters();
        const parks = new Set();
        const manufacturers = new Set();
        
        userCoasters.forEach(coasterId => {
            const coaster = coasterDatabase[coasterId];
            if (coaster && isCoasterValidForDuel(coaster)) {
                if (coaster.park) parks.add(coaster.park);
                if (coaster.manufacturer) manufacturers.add(coaster.manufacturer);
            }
        });
        
        // Populate park filter
        const parkSelect = document.getElementById('deckFilterPark');
        if (parkSelect && parkSelect.options.length <= 1) {
            const sortedParks = Array.from(parks).sort();
            sortedParks.forEach(park => {
                const option = document.createElement('option');
                option.value = park;
                option.textContent = park;
                parkSelect.appendChild(option);
            });
        }
        
        // Populate manufacturer filter
        const manuSelect = document.getElementById('deckFilterManufacturer');
        if (manuSelect && manuSelect.options.length <= 1) {
            const sortedManus = Array.from(manufacturers).sort();
            sortedManus.forEach(manu => {
                const option = document.createElement('option');
                option.value = manu;
                option.textContent = manu;
                manuSelect.appendChild(option);
            });
        }
    }
    
    // Sort deck cards
    function sortDeckCards() {
        const sortBy = document.getElementById('deckSortBy')?.value || 'name';
        currentDeckSort = sortBy;
        renderAvailableCardsContent();
    }
    
    // Filter deck cards
    function filterDeckCards() {
        const parkFilter = document.getElementById('deckFilterPark')?.value || '';
        const manuFilter = document.getElementById('deckFilterManufacturer')?.value || '';
        
        currentDeckParkFilter = parkFilter;
        currentDeckManufacturerFilter = manuFilter;
        
        // Show/hide clear buttons
        const clearParkBtn = document.getElementById('clearDeckParkFilter');
        const clearManuBtn = document.getElementById('clearDeckManufacturerFilter');
        
        if (clearParkBtn) {
            clearParkBtn.style.display = parkFilter ? 'block' : 'none';
        }
        if (clearManuBtn) {
            clearManuBtn.style.display = manuFilter ? 'block' : 'none';
        }
        
        renderAvailableCardsContent();
    }
    
    // Clear deck filter
    function clearDeckFilter(filterType) {
        if (filterType === 'park') {
            const parkSelect = document.getElementById('deckFilterPark');
            if (parkSelect) {
                parkSelect.value = '';
                currentDeckParkFilter = '';
            }
            const clearBtn = document.getElementById('clearDeckParkFilter');
            if (clearBtn) clearBtn.style.display = 'none';
        } else if (filterType === 'manufacturer') {
            const manuSelect = document.getElementById('deckFilterManufacturer');
            if (manuSelect) {
                manuSelect.value = '';
                currentDeckManufacturerFilter = '';
            }
            const clearBtn = document.getElementById('clearDeckManufacturerFilter');
            if (clearBtn) clearBtn.style.display = 'none';
        }
        
        renderAvailableCardsContent();
    }
    
    // Toggle invalid cards section
    function toggleInvalidCards() {
        invalidCardsExpanded = !invalidCardsExpanded;
        const invalidGrid = document.getElementById('deckInvalidCards');
        const toggleIcon = document.getElementById('invalidToggleIcon');
        
        if (invalidGrid) {
            invalidGrid.style.display = invalidCardsExpanded ? 'grid' : 'none';
        }
        if (toggleIcon) {
            toggleIcon.textContent = invalidCardsExpanded ? '▼' : '▶';
        }
    }
    
    // Add card to deck (click handler)
    function addCardToDeck(coasterId) {
        // Check if card is already in deck
        if (duelDeck.includes(coasterId)) {
            return; // Already in deck, do nothing
        }
        
        // Find first empty slot
        const emptySlotIndex = duelDeck.findIndex(id => id === null);
        
        if (emptySlotIndex === -1) {
            // Deck is full
            alert('Deck is full! (10/10)\n\nRemove a card first or drag cards within the deck to reorder.');
            return;
        }
        
        // Add card to deck
        duelDeck[emptySlotIndex] = coasterId;
        
        // Clone the card element from available list to deck slot (preserves loaded image)
        const sourceCard = document.querySelector(`.deck-available-card[data-coaster-id="${coasterId}"]`);
        const targetSlot = document.querySelector(`.deck-slot[data-slot="${emptySlotIndex}"]`);
        
        if (sourceCard && targetSlot) {
            // Hide from available list
            sourceCard.style.display = 'none';
            
            // Clone the card HTML content
            const cardOuter = sourceCard.querySelector('.credit-card-outer');
            if (cardOuter) {
                const clonedCard = cardOuter.cloneNode(true);
                
                // Wrap in deck-slot-card with drag handlers
                targetSlot.innerHTML = `
                    <div class="deck-slot-card" 
                         draggable="true" 
                         ondragstart="dragFromSlot(event, ${emptySlotIndex}, '${coasterId}')"
                         ondragend="dragEnd(event)"
                         onclick="removeCardFromDeck(${emptySlotIndex})"
                         title="Click to remove, or drag to reorder">
                    </div>
                `;
                
                const slotCard = targetSlot.querySelector('.deck-slot-card');
                if (slotCard) {
                    slotCard.appendChild(clonedCard);
                    
                    // Force container size and scale
                    slotCard.style.width = '225px';
                    slotCard.style.height = '338px';
                    slotCard.style.overflow = 'hidden';
                    clonedCard.style.transform = 'scale(0.5625)';
                    clonedCard.style.transformOrigin = 'top left';
                }
            }
        }
        
        // Save and update
        saveDuelDeck();
        updateDeckCounter();
    }
    
    // Remove card from deck (click handler)
    function removeCardFromDeck(slotIndex) {
        if (slotIndex >= 0 && slotIndex < 10) {
            const coasterId = duelDeck[slotIndex];
            duelDeck[slotIndex] = null;
            
            // Show the card back in available list (no reload)
            if (coasterId) {
                const cardElement = document.querySelector(`.deck-available-card[data-coaster-id="${coasterId}"]`);
                if (cardElement) {
                    cardElement.style.display = '';
                }
            }
            
            saveDuelDeck();
            renderDeckSlots();
            updateDeckCounter();
        }
    }

    // Update deck counter
    function updateDeckCounter() {
        const counter = document.getElementById('deckCountDisplay');
        if (counter) {
            const count = duelDeck.filter(id => id !== null).length;
            counter.textContent = count;
        }
    }

    // Drag handlers
    function dragFromSlot(event, slotIndex, coasterId) {
        draggedCoasterId = coasterId;
        draggedFromSlot = slotIndex;
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
    }

    function dragFromAvailable(event, coasterId) {
        draggedCoasterId = coasterId;
        draggedFromSlot = null;
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'copy';
    }

    function dragEnd(event) {
        event.target.classList.remove('dragging');
    }

    function allowDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    function dragLeaveSlot(event) {
        event.currentTarget.classList.remove('drag-over');
    }

    function dropOnSlot(event, targetSlot) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        if (!draggedCoasterId) return;
        
        if (draggedFromSlot !== null) {
            // Dragging from another slot - swap or move
            const temp = duelDeck[targetSlot];
            duelDeck[targetSlot] = draggedCoasterId;
            duelDeck[draggedFromSlot] = temp;
        } else {
            // Dragging from available cards - add to slot
            duelDeck[targetSlot] = draggedCoasterId;
        }
        
        // Save and re-render
        saveDuelDeck();
        renderDeckSlots();
        renderAvailableCards();
        updateDeckCounter();
        
        // Reset drag state
        draggedCoasterId = null;
        draggedFromSlot = null;
    }

    // Drop on available cards area (remove from deck)
    function dropOnAvailable(event) {
        event.preventDefault();
        
        if (!draggedCoasterId || draggedFromSlot === null) {
            // Can only remove cards that are already in deck
            return;
        }
        
        // Remove from slot
        duelDeck[draggedFromSlot] = null;
        
        // Save and re-render
        saveDuelDeck();
        renderDeckSlots();
        updateDeckCounter();
        
        // Reset drag state
        draggedCoasterId = null;
        draggedFromSlot = null;
    }

    // Start a duel (placeholder for now)
    function startDuel() {
        const deckCount = duelDeck.filter(id => id !== null).length;
        if (deckCount !== 10) {
            alert('Please complete your deck first (10/10 cards required)');
            return;
        }
        
        console.log('Starting duel with deck:', duelDeck);
        console.log('AI Difficulty:', loadAIDifficulty());
        
        // TODO: Implement duel game logic in next step
        alert('Duel starting soon! (Step 2 coming next)');
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
            if (profileOverlay && profileOverlay.style.display === 'block') {
                hideHistoryOverlay('profile');
            }
            if (battleOverlay && battleOverlay.style.display === 'block') {
                hideHistoryOverlay('battle');
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
        const tabMap = ['home', 'credits', 'battle', 'ranking', 'duel'];
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
        } else if (tabName === 'duel') {
            displayDuelMenu();
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
                const result = calculateGlicko2(
                    winnerRatingBefore, winnerRdBefore, winnerVolatilityBefore,
                    loserRatingBefore, loserRdBefore, loserVolatilityBefore,
                    1.0 // winner wins
                );
                
                // Apply new ratings
                winnerStats.rating = result.rating1;
                winnerStats.rd = result.rd1;
                winnerStats.volatility = result.volatility1;
                loserStats.rating = result.rating2;
                loserStats.rd = result.rd2;
                loserStats.volatility = result.volatility2;
                
                // Get new ranks
                const winnerRankAfter = getCoasterRank(winner);
                const loserRankAfter = getCoasterRank(loser);
                
                // Calculate potential gains/losses (needed for logging and stats update)
                const winnerPotentialGain = result.rating1 - winnerRatingBefore;
                const loserPotentialLoss = result.rating2 - loserRatingBefore;
                
                // Calculate what would have happened if outcome was reversed
                const reversedResult = calculateGlicko2(
                    winnerRatingBefore, winnerRdBefore, winnerVolatilityBefore,
                    loserRatingBefore, loserRdBefore, loserVolatilityBefore,
                    0.0 // winner loses
                );
                const winnerPotentialLoss = reversedResult.rating1 - winnerRatingBefore;
                const loserPotentialGain = reversedResult.rating2 - loserRatingBefore;
                
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
                    entry.statsA.ratingAfter = (entry.a === winner) ? result.rating1 : result.rating2;
                    entry.statsB.ratingAfter = (entry.b === winner) ? result.rating1 : result.rating2;
                    entry.statsA.rdAfter = (entry.a === winner) ? result.rd1 : result.rd2;
                    entry.statsB.rdAfter = (entry.b === winner) ? result.rd1 : result.rd2;
                    entry.statsA.volatilityAfter = (entry.a === winner) ? result.volatility1 : result.volatility2;
                    entry.statsB.volatilityAfter = (entry.b === winner) ? result.volatility1 : result.volatility2;
                    
                    // Update ranks
                    entry.statsA.rankAfter = (entry.a === winner) ? winnerRankAfter : loserRankAfter;
                    entry.statsB.rankAfter = (entry.b === winner) ? winnerRankAfter : loserRankAfter;
                    
                    // Store potential gains/losses
                    entry.statsA.potentialGain = (entry.a === winner) ? winnerPotentialGain : loserPotentialGain;
                    entry.statsA.potentialLoss = (entry.a === winner) ? winnerPotentialLoss : loserPotentialLoss;
                    entry.statsB.potentialGain = (entry.b === winner) ? winnerPotentialGain : loserPotentialGain;
                    entry.statsB.potentialLoss = (entry.b === winner) ? winnerPotentialLoss : loserPotentialLoss;
                    
                    // Store expected win probabilities
                    entry.statsA.expectedWinProbability = (entry.a === winner) ? result.expectedScore1 : (1 - result.expectedScore1);
                    entry.statsB.expectedWinProbability = (entry.b === winner) ? result.expectedScore1 : (1 - result.expectedScore1);
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
                case 'rank':
                    // Rank is based on rating (higher rating = lower rank number)
                    // So for ascending rank (1, 2, 3...), we want descending rating
                    aVal = displayedRating(a);
                    bVal = displayedRating(b);
                    // Invert comparison for rank column
                    return currentSort.ascending ? bVal - aVal : aVal - bVal;
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
        let transferTrackSection = document.getElementById('transferTrackSection');
        if (!transferTrackSection) {
            const section = document.createElement('div');
            section.id = 'transferTrackSection';
            section.style.marginTop = '24px';
            section.innerHTML = '<h3 style="color: #2C3E50; font-size: 1.2em; margin-bottom: 15px;">Transfer Track</h3>';
            const container = document.createElement('div');
            container.id = 'transferTrackList';
            section.appendChild(container);
            const table = document.querySelector('.ranking-table');
            table.parentNode.appendChild(section);
            transferTrackSection = section;
        }
        
        let unrankedSection = document.getElementById('unrankedSection');
        if (!unrankedSection) {
            const section = document.createElement('div');
            section.id = 'unrankedSection';
            section.style.marginTop = '24px';
            section.innerHTML = '<h3 style="color: #95a5a6; font-size: 1.2em; margin-bottom: 15px;">Standby Queue</h3>';
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
            const phase = c.phase || 'Standby Queue';
            return phase === 'ranked';
        });
        const transferTrackCoasters = statsArray.filter(c => {
            const phase = c.phase || 'Standby Queue';
            return phase === 'Transfer Track';
        });
        const standbyQueueCoasters = statsArray.filter(c => {
            const phase = c.phase || 'Standby Queue';
            return phase === 'Standby Queue';
        });

        // Use pre-calculated ranks from coasterStats (single source of truth)
        // Ranks are calculated by recalculateAllRanks() and stored in stats.rank
        const rankMap = {};
        rankedCoasters.forEach((coaster) => {
            rankMap[coaster.name] = coaster.rank;
        });
        
        // Sort ranked coasters according to current sort settings
        const sortedRanked = [...rankedCoasters].sort((a, b) => {
            let aVal, bVal;
            
            switch(currentSort.column) {
                case 'rank':
                    // Use the true rank from rankMap (based on displayedRating)
                    aVal = rankMap[a.name];
                    bVal = rankMap[b.name];
                    break;
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
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', 'all')" title="View battle history">${coaster.battles}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', 'wins')" title="View battle history">${coaster.wins}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', 'losses')" title="View battle history">${coaster.losses}</span></td>
                    </tr>
                `);

            // Card for mobile
            const rankBadgeClass = rank <= 3 ? 'rank-badge top-3' : 'rank-badge';
            cardsHtml.push(`
                <div class="ranking-card" data-rank="${rank}">
                    <div class="${rankBadgeClass}">${rank}</div>
                    <div class="ranking-left">
                        <div class="name">${coaster.name}</div>
                        <div class="meta">${coaster.park} • ${coaster.manufacturer} • <span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', 'all')" title="View battle history">${coaster.wins}-${coaster.losses}</span></div>
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
        
        // Build Transfer Track section
        const transferTrackList = document.getElementById('transferTrackList');
        if (transferTrackCoasters.length > 0) {
            // Sort by number of battles (most battles first to show progress)
            const sortedTransferTrack = [...transferTrackCoasters].sort((a, b) => b.battles - a.battles);
            
            let transferTrackTableHtml = '<table class="ranking-table" style="width: 100%; margin-top: 10px; table-layout: fixed;"><thead><tr>';
            transferTrackTableHtml += '<th style="width: 60px;">Rank</th>';
            transferTrackTableHtml += '<th style="min-width: 140px;">Name</th>';
            transferTrackTableHtml += '<th style="min-width: 120px;">Park</th>';
            transferTrackTableHtml += '<th style="min-width: 110px;">Manufacturer</th>';
            transferTrackTableHtml += '<th style="width: 140px;">Rating</th>';
            transferTrackTableHtml += '<th style="width: 75px;">Battles</th>';
            transferTrackTableHtml += '<th style="width: 65px;">Wins</th>';
            transferTrackTableHtml += '<th style="width: 75px;">Losses</th>';
            transferTrackTableHtml += '</tr></thead><tbody>';
            
            sortedTransferTrack.forEach(coaster => {
                const escapedName = coaster.name.replace(/'/g, "\\'");
                const dataId = (coaster.name || '').replace(/"/g, '&quot;');
                
                transferTrackTableHtml += `
                    <tr data-id="${dataId}">
                        <td style="color: #f59e0b;">-</td>
                        <td><strong>${coaster.name}</strong></td>
                        <td>${coaster.park}</td>
                        <td>${coaster.manufacturer}</td>
                        <td><span class="elo-score">${Math.round(displayedRating(coaster))} ± ${Math.round(coaster.rd)}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', 'all')" title="View battle history">${coaster.battles}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', 'wins')" title="View battle history">${coaster.wins}</span></td>
                        <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}', 'losses')" title="View battle history">${coaster.losses}</span></td>
                    </tr>
                `;
            });
            
            transferTrackTableHtml += '</tbody></table>';
            transferTrackList.innerHTML = transferTrackTableHtml;
            transferTrackSection.style.display = 'block';
        } else {
            transferTrackSection.style.display = 'none';
        }
        
        // Build Standby Queue section
        const unrankedList = document.getElementById('unrankedList');
        if (standbyQueueCoasters.length > 0) {
            // Sort alphabetically by name
            const sortedStandbyQueue = [...standbyQueueCoasters].sort((a, b) => a.name.localeCompare(b.name));
            
            let standbyQueueTableHtml = '<table class="ranking-table" style="width: 100%; margin-top: 10px; table-layout: fixed; opacity: 0.7;"><thead><tr>';
            standbyQueueTableHtml += '<th style="width: 60px;">Rank</th>';
            standbyQueueTableHtml += '<th style="min-width: 140px;">Name</th>';
            standbyQueueTableHtml += '<th style="min-width: 120px;">Park</th>';
            standbyQueueTableHtml += '<th style="min-width: 110px;">Manufacturer</th>';
            standbyQueueTableHtml += '<th style="width: 140px;">Rating</th>';
            standbyQueueTableHtml += '<th style="width: 75px;">Battles</th>';
            standbyQueueTableHtml += '<th style="width: 65px;">Wins</th>';
            standbyQueueTableHtml += '<th style="width: 75px;">Losses</th>';
            standbyQueueTableHtml += '</tr></thead><tbody>';
            
            sortedStandbyQueue.forEach(coaster => {
                const escapedName = coaster.name.replace(/'/g, "\\'");
                const dataId = (coaster.name || '').replace(/"/g, '&quot;');
                
                standbyQueueTableHtml += `
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
            
            standbyQueueTableHtml += '</tbody></table>';
            unrankedList.innerHTML = standbyQueueTableHtml;
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

    function viewCoasterHistory(coasterName, filterType = 'all') {
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
            const suffix = inOverlay === 'profile' ? 'Profile' : (inOverlay === 'battle' ? 'Battle' : 'Ranking');
            const historySearch = document.getElementById('historySearch' + suffix);
            const clearBtn = document.getElementById('clearHistorySearchBtn' + suffix);
            if (historySearch && clearBtn) {
                historySearch.value = coasterName;
                clearBtn.style.display = 'block';
                coasterSelected = true;
                currentHistoryFilter = filterType;
                displayHistoryInOverlay(inOverlay);
                updateHistoryFilterUI(inOverlay);
            }
        } else {
            // Check if we're on the ranking tab
            const rankingTab = document.getElementById('ranking-tab');
            if (rankingTab && rankingTab.classList.contains('active')) {
                // Open ranking overlay instead of switching tabs
                showHistoryOverlay('ranking');
                
                // Set the search box and filter
                const historySearch = document.getElementById('historySearchRanking');
                const clearBtn = document.getElementById('clearHistorySearchBtnRanking');
                if (historySearch && clearBtn) {
                    historySearch.value = coasterName;
                    clearBtn.style.display = 'block';
                    coasterSelected = true;
                    currentHistoryFilter = filterType;
                    displayHistoryInOverlay('ranking');
                    updateHistoryFilterUI('ranking');
                }
            } else {
                // Not in an overlay and not on ranking tab, switch to history tab
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
        
        // Initialize Transfer Track phase: promote 25 random coasters to Transfer Track
        promoteStandbyQueueToTransferTrack(true);
        console.log('Reset ranking: promoted initial batch to Transfer Track phase');
        
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
        
        // Reload coasters from user credits
        loadUserCredits();
        coasters = buildCoastersFromCredits();
        
        // Perform the full reset
        coasterStats = initializeStats();
        totalBattlesCount = 0;
        coasterHistory = [];
        completedPairs = new Set();
        
        // Reset sort to default (by rank/rating)
        currentSort = { column: 'rank', ascending: true };
        
        // Initialize Transfer Track phase with coasters (like on first load)
        promoteStandbyQueueToTransferTrack(true);
        
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
        
        // Recalculate all ranks after reset
        recalculateAllRanks();
        
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
    const uniqueParks = new Set(battledCoasters.map(s => s.park).filter(Boolean)).size;
    const uniqueManufacturers = new Set(battledCoasters.map(s => s.manufacturer).filter(Boolean)).size;
    
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
        uniqueParks,
        uniqueManufacturers,
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
            showAchievementToast(achievement);
        }, index * 600); // Stagger by 600ms
    });
    
    // Always update pins display (not just when new pins)
    updatePinsDisplay();
}

// Render the pins display (in profile overlay)
function updatePinsDisplay() {
    console.log('updatePinsDisplay called');
    console.log('achievementManager exists:', typeof achievementManager !== 'undefined');
    
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
    
    console.log('Updating pins display:', { unlockedCount, totalCount, percentage });
    
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
    
    console.log('Pin cards rendered:', pins.length);
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
        const rankingTab = document.getElementById('ranking-tab');
        const rankingTable = document.querySelector('.ranking-table-wrapper');
        const rankingCards = document.querySelector('.ranking-cards-container');
        const transferTrackSection = document.getElementById('transferTrackSection');
        const standbyQueueSection = document.getElementById('unrankedSection');
        if (!overlay) return;
        
        // Update history display before showing
        updateHistoryDisplay('ranking');
        
        // Prevent scrolling on the tab content
        if (rankingTab) rankingTab.style.overflow = 'hidden';
        
        // Hide ranking content and show overlay
        if (rankingTable) rankingTable.style.display = 'none';
        if (rankingCards) rankingCards.style.display = 'none';
        if (transferTrackSection) transferTrackSection.style.display = 'none';
        if (standbyQueueSection) standbyQueueSection.style.display = 'none';
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
        const rankingTab = document.getElementById('ranking-tab');
        const rankingTable = document.querySelector('.ranking-table-wrapper');
        const rankingCards = document.querySelector('.ranking-cards-container');
        const transferTrackSection = document.getElementById('transferTrackSection');
        const standbyQueueSection = document.getElementById('unrankedSection');
        if (!overlay) return;
        
        overlay.style.display = 'none';
        
        // Restore scrolling on the tab content
        if (rankingTab) rankingTab.style.overflow = '';
        
        if (rankingTable) rankingTable.style.display = '';
        if (rankingCards) rankingCards.style.display = '';
        if (transferTrackSection) transferTrackSection.style.display = '';
        if (standbyQueueSection) standbyQueueSection.style.display = '';
    }
}

// Update history display for overlay
function updateHistoryDisplay(source) {
    displayHistoryInOverlay(source);
}

// Display history in overlay
function displayHistoryInOverlay(source) {
    const suffix = source === 'profile' ? 'Profile' : (source === 'battle' ? 'Battle' : 'Ranking');
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
            // Don't show reset events when filtering for a specific coaster
            if (hasSelected) {
                return '';
            }
            
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

        // Skip entries with missing coaster names
        if (!a || !b) {
            return '';
        }

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

// Single source of truth for credit card HTML generation
function generateCreditCardHTML(coasterId, options = {}) {
    const {
        size = 'preview', // 'preview' or 'full'
        showRank = true,
        clickable = true,
        dataChoice = null, // for battle cards
        showFirstBattle = false,
        draggable = false, // for deck builder
        dragHandler = '', // ondragstart handler
        customStyle = '', // additional inline styles
        customClass = '' // additional classes
    } = options;
    
    const coaster = coasterDatabase[coasterId];
    if (!coaster) return '';
    
    // Manufacturer display name mapping (abbreviated names for display)
    const manufacturerDisplayNames = {
        'ART Engineering GmbH': 'Art Engineering',
        'Arrow Dynamics': 'Arrow Dynamics',
        'BHS': 'BHS',
        'Bolliger & Mabillard': 'B&M',
        'Cordes Holzbau': 'Cordes Holzbau',
        'Custom Coasters International, Inc.': 'CCI',
        'Gerstlauer Amusement Rides GmbH': 'Gerstlauer',
        'Great Coasters International': 'GCI',
        'Intamin Amusement Rides': 'Intamin',
        'KumbaK The Amusement Engineers': 'KumbaK',
        'Mack Rides GmbH & Co KG': 'Mack Rides',
        'Maurer Rides GmbH': 'Maurer',
        'Preston & Barbieri': 'Preston & Barbieri',
        'RMC': 'RMC',
        'Roller Coaster Corporation of America': 'RCCA',
        'SBF Visa Group': 'SBF Visa',
        'Schwarzkopf': 'Schwarzkopf',
        'Vekoma': 'Vekoma',
        'Zamperla': 'Zamperla',
        'Zierer': 'Zierer'
    };
    
    // Get display name (use abbreviated if available, otherwise use original)
    const manufacturerDisplayName = manufacturerDisplayNames[coaster.manufacturer] || coaster.manufacturer || 'Unknown';
    
    // Get manufacturer color (use original full name for color lookup)
    const bgColor = manufacturerColors[coaster.manufacturer] || manufacturerColors['Unknown'];
    
    // Get border color (darker, more saturated)
    const borderColors = {
        'B&M': '#A8AAAC',
        'Bolliger & Mabillard': '#A8AAAC',
        'Intamin': '#C42424',
        'Intamin Amusement Rides': '#C42424',
        'Vekoma': '#D97316',
        'Mack Rides': '#2563EB',
        'Mack Rides GmbH & Co KG': '#2563EB',
        'Gerstlauer': '#3D7A47',
        'Gerstlauer Amusement Rides': '#3D7A47',
        'Gerstlauer Amusement Rides GmbH': '#3D7A47',
        'RMC': '#7A4A1F',
        'Rocky Mountain Construction': '#7A4A1F',
        'GCI': '#D9A616',
        'Great Coasters International': '#D9A616',
        'Maurer Rides': '#6F3FA8',
        'Maurer': '#6F3FA8',
        'Maurer Söhne': '#6F3FA8',
        'Maurer Rides GmbH': '#6F3FA8',
        'S&S': '#B8A471',
        'S&S - Sansei Technologies': '#B8A471',
        'S&S Worldwide': '#B8A471',
        'Sansei Technologies': '#B8A471',
        'Zamperla': '#C45A85',
        'Antonio Zamperla': '#C45A85',
        'Zierer': '#2E9494',
        'Schwarzkopf': '#9F9A8F',
        'Anton Schwarzkopf': '#9F9A8F',
        'Premier Rides': '#C4568A',
        'Arrow Dynamics': '#8A7AC4',
        'Other': '#827D78',
        'Unknown': '#827D78'
    };
    const borderColor = borderColors[coaster.manufacturer] || borderColors['Unknown'];
    
    // Get rank from coasterStats (ranking system)
    let rankClass = '';
    let rankBadge = '';
    if (showRank) {
        let rank = null;
        
        // Use stored rank from coasterStats (pre-calculated by recalculateAllRanks)
        if (typeof coasterStats !== 'undefined' && coasterStats[coaster.name]) {
            rank = coasterStats[coaster.name].rank;
        }
        
        // Display rank or '-' for unranked
        if (rank !== null) {
            if (rank === 1) rankClass = 'rank-gold';
            else if (rank === 2) rankClass = 'rank-silver';
            else if (rank === 3) rankClass = 'rank-bronze';
            else rankClass = 'rank-other';
            rankBadge = `<div class="credit-rank-badge ${rankClass}">${rank}</div>`;
        } else {
            rankClass = 'rank-unranked';
            rankBadge = `<div class="credit-rank-badge ${rankClass}">-</div>`;
        }
    }
    
    // Format stats
    const displaySpeed = coaster.speed ? Math.round(parseFloat(coaster.speed)) : '-';
    const displayHeight = coaster.height ? Math.round(parseFloat(coaster.height)) : '-';
    const displayLength = coaster.length ? Math.round(parseFloat(coaster.length)) : '-';
    const displayInversions = coaster.inversions || 0;
    
    // Check if defunct
    const isDefunct = coaster.status !== 'Operating';
    const defunctMarker = isDefunct ? '<span class="defunct-marker">†</span>' : '';
    
    // Get model info if available
    const modelInfo = coaster.model ? ` - ${coaster.model}` : '';
    
    // Get image URL from Wikidata cache (sync lookup)
    const imageCoaster = {
        name: coaster.name,
        park: coaster.park,
        manufacturer: coaster.manufacturer
    };
    const imageUrl = getCoasterImageSync(imageCoaster);
    const isPlaceholder = imageUrl.startsWith('data:image/svg+xml');
    
    // Create responsive image HTML with srcset for different screen densities
    // Extract base URL (without ?width= parameter) to generate multiple sizes
    let imageHTML;
    if (!isPlaceholder) {
        // Check if URL contains Wikimedia FilePath (supports ?width parameter)
        if (imageUrl.includes('Special:FilePath')) {
            const baseUrl = imageUrl.split('?')[0]; // Remove existing params
            // Generate srcset with multiple sizes for responsive loading
            // 400w for mobile, 800w for desktop, 1200w for high-DPI displays
            imageHTML = `<img src="${baseUrl}?width=800" 
                             srcset="${baseUrl}?width=400 400w, ${baseUrl}?width=800 800w, ${baseUrl}?width=1200 1200w"
                             sizes="(max-width: 768px) 400px, 800px"
                             alt="${escapeHtml(coaster.name)}" 
                             class="credit-card-img" />`;
        } else {
            // Fallback for non-Wikimedia images (direct URLs)
            imageHTML = `<img src="${imageUrl}" alt="${escapeHtml(coaster.name)}" class="credit-card-img" />`;
        }
    } else {
        imageHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg, #8e9eef 0%, #b8a4d9 100%);">
                <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="trackPattern-${coasterId}" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 0 20 L 20 0 L 40 20 L 20 40 Z" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.4"/>
                        </pattern>
                    </defs>
                    <rect width="400" height="250" fill="url(#trackPattern-${coasterId})"/>
                </svg>
           </div>`;
    }

    
    const onclickAttr = clickable ? `onclick="openCreditCard('${coasterId}')"` : '';
    const dataChoiceAttr = dataChoice !== null ? `data-choice="${dataChoice}"` : '';
    const battleCardClass = dataChoice !== null ? ' battle-card' : '';
    const draggableAttr = draggable ? `draggable="true" ondragstart="${dragHandler}" ondragend="dragEnd(event)" style="cursor: grab; ${customStyle}"` : (customStyle ? `style="${customStyle}"` : '');
    const additionalClass = customClass ? ` ${customClass}` : '';
    
    return `
        <div class="credit-card-outer${additionalClass}" style="border: 6px solid ${bgColor};" ${onclickAttr} ${draggableAttr} data-coaster-id="${coasterId}">
            <div class="credit-card${battleCardClass}" style="background-color: ${bgColor}; border: 9px solid ${borderColor};" ${dataChoiceAttr}>
                <div class="credit-card-image" style="border-color: ${borderColor};">
                    ${imageHTML}
                    ${rankBadge}
                    ${showFirstBattle ? '<div class="first-battle-badge">🆕 First Battle!</div>' : ''}
                </div>
                <div class="credit-card-info">
                    <h1 class="credit-card-name">${escapeHtml(coaster.name)}${defunctMarker}</h1>
                    <div class="credit-card-divider"></div>
                    <p class="credit-card-location">${escapeHtml(coaster.park || 'Unknown')} - ${escapeHtml(coaster.country || 'Unknown')}${coaster.openingYear ? ' - ' + coaster.openingYear : ''}</p>
                    <p class="credit-card-meta">${escapeHtml(manufacturerDisplayName)} - ${escapeHtml(coaster.type || 'Unknown')}${escapeHtml(modelInfo)}</p>
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
}

// Manufacturer color mapping - background colors (lighter)
const manufacturerColors = {
    'B&M': '#DCDCDE',
    'Bolliger & Mabillard': '#DCDCDE',
    'Intamin': '#E9BFC0',
    'Intamin Amusement Rides': '#E9BFC0',
    'Vekoma': '#F5D2B9',
    'Mack Rides': '#C4D3EA',
    'Mack Rides GmbH & Co KG': '#C4D3EA',
    'Gerstlauer': '#CFE3D1',
    'Gerstlauer Amusement Rides': '#CFE3D1',
    'Gerstlauer Amusement Rides GmbH': '#CFE3D1',
    'RMC': '#E8D9C6',
    'Rocky Mountain Construction': '#E8D9C6',
    'GCI': '#F5EABF',
    'Great Coasters International': '#F5EABF',
    'Maurer Rides': '#D6C8E3',
    'Maurer': '#D6C8E3',
    'Maurer Söhne': '#D6C8E3',
    'Maurer Rides GmbH': '#D6C8E3',
    'S&S': '#EBE4D2',
    'S&S - Sansei Technologies': '#EBE4D2',
    'S&S Worldwide': '#EBE4D2',
    'Sansei Technologies': '#EBE4D2',
    'Zamperla': '#EDD4DF',
    'Antonio Zamperla': '#EDD4DF',
    'Zierer': '#C8E4E4',
    'Schwarzkopf': '#E3DFD9',
    'Anton Schwarzkopf': '#E3DFD9',
    'Premier Rides': '#E8C8D9',
    'Arrow Dynamics': '#D9D4E8',
    'Other': '#DBD8D4',
    'Unknown': '#DBD8D4'
};

// Coaster database - will be populated from masterDatabase after loading
let coasterDatabase = {};

// Track user's selected credits (separate from their ranked coasters)
let userCredits = new Set(); // Set of coaster IDs the user has marked as credits

// Load user credits from localStorage
function loadUserCredits() {
    if (!currentUser) return;
    const key = `userCredits_${currentUser}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const creditsArray = JSON.parse(saved);
            // Sort alphabetically by coaster name
            const sortedCredits = creditsArray
                .map(id => ({id, name: coasterDatabase[id]?.name || ''}))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(item => item.id);
            userCredits = new Set(sortedCredits);
            console.log(`✓ Loaded ${userCredits.size} credits for ${currentUser} (sorted alphabetically)`);
        } catch (e) {
            console.error('Error loading user credits:', e);
            userCredits = new Set();
        }
    } else {
        userCredits = new Set();
    }
}

// Save user credits to localStorage
function saveUserCredits() {
    if (!currentUser) return;
    const key = `userCredits_${currentUser}`;
    const creditsArray = [...userCredits];
    localStorage.setItem(key, JSON.stringify(creditsArray));
    console.log(`✓ Saved ${userCredits.size} credits for ${currentUser}`);
}

function openCreditCard(coasterId) {
    const coaster = coasterDatabase[coasterId];
    if (!coaster) return;

    const overlay = document.getElementById('creditCardOverlay');
    const container = document.getElementById('creditCardContainer');
    
    // Use the single template to generate the card HTML
    container.innerHTML = generateCreditCardHTML(coasterId, { size: 'full', showRank: true, clickable: false });
    
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('show'), 10);
}

function closeCreditCard(event) {
    // If event is passed, check if clicking overlay (not card content)
    if (event && event.target.closest('.credit-card-popup') && event.target !== event.currentTarget) {
        return;
    }
    
    const overlay = document.getElementById('creditCardOverlay');
    overlay.classList.remove('show');
    setTimeout(() => overlay.style.display = 'none', 300);
}

// Populate credits grid with dynamic colors (displays cached images only)
function populateCreditsGrid() {
    const creditsGrid = document.getElementById('creditsGrid');
    if (!creditsGrid) return;
    
    // Get user coasters - preserve the order from userCredits (which may have been sorted)
    const userCoasterIds = [...userCredits];
    
    // Generate and display grid immediately (all images should be preloaded)
    creditsGrid.innerHTML = userCoasterIds
        .map(coasterId => generateCreditCardHTML(coasterId, { size: 'preview', showRank: true, clickable: true }))
        .filter(html => html !== '')
        .join('');
    creditsGrid.style.display = 'grid';
    creditsGrid.style.visibility = 'visible';
}

// Populate credits grid with filtered coaster IDs
function populateCreditsGridFiltered(coasterIds) {
    const creditsGrid = document.getElementById('creditsGrid');
    if (!creditsGrid) return;
    
    // Generate and display grid with filtered IDs (preserving sort order)
    creditsGrid.innerHTML = coasterIds
        .map(coasterId => generateCreditCardHTML(coasterId, { size: 'preview', showRank: true, clickable: true }))
        .filter(html => html !== '')
        .join('');
    creditsGrid.style.display = 'grid';
    creditsGrid.style.visibility = 'visible';
}

// Background preload credits images (row-by-row, top-to-bottom)
async function backgroundPreloadCreditsImages() {
    const userCoasterIds = [...userCredits];
    if (userCoasterIds.length === 0) return;
    
    const startTime = performance.now();
    console.log(`🎢 [PRELOAD] Starting background preload of ${userCoasterIds.length} credits images (row-by-row)...`);
    console.log(`🎢 [PRELOAD] Flag before start: creditsPreloadComplete = ${creditsPreloadComplete}`);
    
    const imagesPerRow = 5; // Credits grid has 5 columns
    const delayBetweenRows = 100; // 100ms delay between rows
    
    // Process images row by row (5 at a time)
    for (let i = 0; i < userCoasterIds.length; i += imagesPerRow) {
        const rowBatch = userCoasterIds.slice(i, i + imagesPerRow);
        const rowNumber = Math.floor(i / imagesPerRow) + 1;
        const totalRows = Math.ceil(userCoasterIds.length / imagesPerRow);
        
        // Load all images in this row in parallel
        await Promise.all(
            rowBatch.map(async coasterId => {
                try {
                    const coaster = getCoasterById(coasterId);
                    if (!coaster) return;
                    
                    // Use getCoasterImage with browserPreload=true (same as battle candidates)
                    await getCoasterImage(coaster, true);
                } catch (error) {
                    console.warn(`Failed to preload credit image for coaster ${coasterId}:`, error);
                }
            })
        );
        
        // Log progress every 5 rows or at the end
        // if (rowNumber % 5 === 0 || i + imagesPerRow >= userCoasterIds.length) {
        //     console.log(`📸 Preloaded credits row ${rowNumber}/${totalRows} (${Math.min(i + imagesPerRow, userCoasterIds.length)}/${userCoasterIds.length} images)`);
        // }
        
        // Small delay before next row to avoid blocking UI
        if (i + imagesPerRow < userCoasterIds.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenRows));
        }
    }
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    // console.log(`✅ [PRELOAD] Credits images preloading complete - ${userCoasterIds.length} images loaded in ${duration}s`);
    creditsPreloadComplete = true;
    // console.log(`✅ [PRELOAD] Flag set: creditsPreloadComplete = ${creditsPreloadComplete}`);
}

// ===== ADD CREDITS FUNCTIONS =====

// Track changes for unsaved warning
let hasUnsavedCredits = false;
let tempUserCredits = new Set(); // Temporary copy for editing

// Open the Add Credits overlay
function addCredits() {
    const overlay = document.getElementById('creditsOverlay');
    if (!overlay) return;
    
    // Make a temporary copy of current credits for editing
    tempUserCredits = new Set(userCredits);
    hasUnsavedCredits = false;
    
    // Build and display the hierarchy
    populateCreditsHierarchy();
    
    // Setup search input listener
    const searchInput = document.getElementById('creditsSearchInput');
    const autocompleteDropdown = document.getElementById('creditsAutocomplete');
    if (searchInput) {
        searchInput.value = ''; // Clear previous search
        searchInput.oninput = () => searchCreditsHierarchy();
        searchInput.onfocus = () => {
            if (searchInput.value.trim()) {
                searchCreditsHierarchy();
            }
        };
    }
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', function hideAutocomplete(e) {
        if (autocompleteDropdown && !searchInput?.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.style.display = 'none';
        }
    });
    
    // Hide credits tab content (header and grid)
    const creditsTab = document.getElementById('credits-tab');
    const rankingHeader = creditsTab?.querySelector('.ranking-header');
    const creditsGrid = creditsTab?.querySelector('.credits-grid');
    if (rankingHeader) rankingHeader.style.display = 'none';
    if (creditsGrid) creditsGrid.style.display = 'none';
    
    // Show overlay
    overlay.style.display = 'block';
    setTimeout(() => overlay.classList.add('show'), 10);
}

// Close Add Credits overlay
function handleCreditsBack() {
    if (hasUnsavedCredits) {
        // Show unsaved changes modal
        const modal = document.getElementById('creditsUnsavedModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    } else {
        closeCreditsOverlay();
    }
}

// Close overlay without saving
function closeCreditsOverlay() {
    const overlay = document.getElementById('creditsOverlay');
    if (!overlay) return;
    
    overlay.classList.remove('show');
    setTimeout(() => overlay.style.display = 'none', 300);
    
    // Show credits tab content again (header and grid)
    const creditsTab = document.getElementById('credits-tab');
    const rankingHeader = creditsTab?.querySelector('.ranking-header');
    const creditsGrid = creditsTab?.querySelector('.credits-grid');
    if (rankingHeader) rankingHeader.style.display = 'flex';
    if (creditsGrid) creditsGrid.style.display = 'grid';
    
    // Reset temp credits
    tempUserCredits = new Set();
    hasUnsavedCredits = false;
}

// Close unsaved changes modal
function closeCreditsUnsavedModal() {
    const modal = document.getElementById('creditsUnsavedModal');
    if (modal) modal.style.display = 'none';
}

// Confirm discard changes
function confirmDiscardCreditsChanges() {
    closeCreditsUnsavedModal();
    closeCreditsOverlay();
}

// Save credits changes
function saveCreditsChanges() {
    // Copy temp credits to actual credits
    userCredits = new Set(tempUserCredits);
    
    // Save to localStorage
    saveUserCredits();
    
    // Rebuild coasters array from updated credits
    coasters = buildCoastersFromCredits();
    console.log(`✨ Rebuilt coasters array: ${coasters.length} coasters`);
    
    // Reinitialize stats for any new coasters
    const currentStats = { ...coasterStats };
    coasterStats = initializeStats();
    // Preserve existing stats
    for (const name in currentStats) {
        if (coasterStats[name]) {
            coasterStats[name] = currentStats[name];
        }
    }
    
    // Update the profile count display
    updateProfileCreditsCount();
    
    // Repopulate credits grid to show new credits
    populateCreditsGrid();
    
    // Update ranking display
    updateRanking();
    
    // Close overlay
    closeCreditsOverlay();
    
    // Show success message
    showToast('✓ Credits saved successfully!', 2000);
}

// Confirm save from modal
function confirmSaveCredits() {
    const modal = document.getElementById('saveCreditsConfirmModal');
    if (modal) modal.style.display = 'none';
    
    saveCreditsChanges();
}

// Close save confirmation modal
function closeSaveCreditsModal() {
    const modal = document.getElementById('saveCreditsConfirmModal');
    if (modal) modal.style.display = 'none';
}

// Close success modal
function closeCreditsSuccessModal() {
    const modal = document.getElementById('creditsSuccessModal');
    if (modal) modal.style.display = 'none';
}

// Populate the credits hierarchy
function populateCreditsHierarchy(searchTerm = '') {
    const container = document.getElementById('creditsHierarchyContainer');
    if (!container) return;
    
    // Build hierarchy from coasterDatabase using buildCreditsHierarchy from dataLoader
    const hierarchy = typeof buildCreditsHierarchy === 'function' 
        ? buildCreditsHierarchy() 
        : buildCreditsHierarchyLocal();
    
    // Normalize search term
    const search = searchTerm.toLowerCase().trim();
    
    // Generate HTML
    let html = '';
    
    // Sort continents
    const sortedContinents = Object.keys(hierarchy).sort();
    
    for (const continent of sortedContinents) {
        const continentData = hierarchy[continent];
        const continentId = `continent-${continent.replace(/\s+/g, '-')}`;
        
        html += `
            <div class="hierarchy-row indent-0" data-level="continent" onclick="toggleHierarchyRow('${continentId}')">
                <span class="chevron">▶</span>
                <span class="hierarchy-label">${continent}</span>
                <span class="count-badge">${continentData.coasterCount}</span>
            </div>
            <div id="${continentId}" class="hierarchy-children" style="display: none;">
        `;
        
        // Sort countries
        const sortedCountries = Object.keys(continentData.countries).sort();
        
        for (const country of sortedCountries) {
            const countryData = continentData.countries[country];
            const countryId = `country-${continent.replace(/\s+/g, '-')}-${country.replace(/\s+/g, '-')}`;
            
            html += `
                <div class="hierarchy-row indent-1" data-level="country" onclick="toggleHierarchyRow('${countryId}')">
                    <span class="chevron">▶</span>
                    <span class="hierarchy-label">${country}</span>
                    <span class="count-badge">${countryData.coasterCount}</span>
                </div>
                <div id="${countryId}" class="hierarchy-children" style="display: none;">
            `;
            
            // Sort parks
            const sortedParks = Object.keys(countryData.parks).sort();
            
            for (const park of sortedParks) {
                const parkData = countryData.parks[park];
                const parkId = `park-${continent.replace(/\s+/g, '-')}-${country.replace(/\s+/g, '-')}-${park.replace(/\s+/g, '-')}`;
                
                // Filter coasters based on search
                let filteredCoasters = parkData.coasters;
                if (search) {
                    filteredCoasters = parkData.coasters.filter(c => 
                        c.name.toLowerCase().includes(search) ||
                        park.toLowerCase().includes(search) ||
                        country.toLowerCase().includes(search)
                    );
                }
                
                // Skip park if no coasters match search
                if (filteredCoasters.length === 0) continue;
                
                // Check if all coasters in this park are selected
                const allChecked = filteredCoasters.every(c => tempUserCredits.has(c.id));
                const parkCheckboxId = `park-checkbox-${parkId}`;
                
                html += `
                    <div class="hierarchy-row indent-2" data-level="park" onclick="event.target.tagName !== 'INPUT' && toggleHierarchyRow('${parkId}')">
                        <input type="checkbox" id="${parkCheckboxId}" ${allChecked ? 'checked' : ''}
                               onclick="event.stopPropagation()" 
                               onchange="toggleParkCredits('${parkId}', ${JSON.stringify(filteredCoasters.map(c => c.id))})" />
                        <span class="chevron">▶</span>
                        <span class="hierarchy-label">${park}</span>
                        <span class="count-badge">${filteredCoasters.length}</span>
                    </div>
                    <div id="${parkId}" class="hierarchy-children" style="display: none;">
                `;
                
                // Sort coasters
                const sortedCoasters = filteredCoasters.sort((a, b) => a.name.localeCompare(b.name));
                
                for (const coaster of sortedCoasters) {
                    const isChecked = tempUserCredits.has(coaster.id);
                    const checkboxId = `credit-${coaster.id}`;
                    
                    html += `
                        <div class="hierarchy-row indent-3 leaf" data-level="coaster">
                            <input type="checkbox" id="${checkboxId}" ${isChecked ? 'checked' : ''} 
                                   onchange="toggleCoasterCredit('${coaster.id}')" />
                            <label for="${checkboxId}" class="hierarchy-label">${coaster.name}</label>
                            ${coaster.operational === 0 ? '<span class="defunct-badge">DEFUNCT</span>' : ''}
                        </div>
                    `;
                }
                
                html += `
                    </div>
                `;
            }
            
            html += `
                </div>
            `;
        }
        
        html += `
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Build credits hierarchy locally if dataLoader function not available
function buildCreditsHierarchyLocal() {
    const hierarchy = {};
    
    // Use countriesData if available, otherwise create basic hierarchy
    for (const coasterId in coasterDatabase) {
        const coaster = coasterDatabase[coasterId];
        
        // Get continent from countries data or use Unknown
        const continent = (typeof countriesData !== 'undefined' && countriesData[coaster.country]) 
            ? countriesData[coaster.country].continent 
            : 'Unknown';
        const country = coaster.country || 'Unknown';
        const park = coaster.park || 'Unknown';
        
        // Initialize continent
        if (!hierarchy[continent]) {
            hierarchy[continent] = {
                name: continent,
                countries: {},
                coasterCount: 0
            };
        }
        
        // Initialize country
        if (!hierarchy[continent].countries[country]) {
            hierarchy[continent].countries[country] = {
                name: country,
                parks: {},
                coasterCount: 0
            };
        }
        
        // Initialize park
        if (!hierarchy[continent].countries[country].parks[park]) {
            hierarchy[continent].countries[country].parks[park] = {
                name: park,
                coasters: [],
                coasterCount: 0
            };
        }
        
        // Add coaster
        hierarchy[continent].countries[country].parks[park].coasters.push({
            id: coasterId,
            name: coaster.name,
            operational: coaster.status === 'Operating' ? 1 : 0
        });
        
        // Increment counts
        hierarchy[continent].countries[country].parks[park].coasterCount++;
        hierarchy[continent].countries[country].coasterCount++;
        hierarchy[continent].coasterCount++;
    }
    
    return hierarchy;
}

// Toggle hierarchy row expansion
function toggleHierarchyRow(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const parentRow = row.previousElementSibling;
    if (!parentRow) return;
    
    const isExpanded = row.style.display !== 'none';
    
    if (isExpanded) {
        row.style.display = 'none';
        const chevron = parentRow.querySelector('.chevron');
        if (chevron) chevron.textContent = '▶';
        parentRow.classList.remove('expanded');
    } else {
        row.style.display = 'block';
        const chevron = parentRow.querySelector('.chevron');
        if (chevron) chevron.textContent = '▼';
        parentRow.classList.add('expanded');
    }
}

// Toggle coaster credit checkbox
function toggleCoasterCredit(coasterId) {
    if (tempUserCredits.has(coasterId)) {
        tempUserCredits.delete(coasterId);
    } else {
        tempUserCredits.add(coasterId);
    }
    
    hasUnsavedCredits = true;
}

// Toggle all credits for a park
function toggleParkCredits(parkId, coasterIds) {
    const checkbox = document.getElementById(`park-checkbox-${parkId}`);
    const isChecked = checkbox?.checked || false;
    
    coasterIds.forEach(coasterId => {
        if (isChecked) {
            tempUserCredits.add(coasterId);
        } else {
            tempUserCredits.delete(coasterId);
        }
    });
    
    // Update all coaster checkboxes in this park
    coasterIds.forEach(coasterId => {
        const coasterCheckbox = document.getElementById(`credit-${coasterId}`);
        if (coasterCheckbox) {
            coasterCheckbox.checked = isChecked;
        }
    });
    
    hasUnsavedCredits = true;
}

// Search credits hierarchy with autocomplete
function searchCreditsHierarchy() {
    const searchInput = document.getElementById('creditsSearchInput');
    const searchTerm = searchInput?.value || '';
    const autocompleteDropdown = document.getElementById('creditsAutocomplete');
    
    if (!searchInput || !autocompleteDropdown) return;
    
    // If search is empty, hide autocomplete and show all
    if (searchTerm.trim() === '') {
        autocompleteDropdown.style.display = 'none';
        populateCreditsHierarchy('');
        return;
    }
    
    // Build suggestions from hierarchy
    const suggestions = [];
    const search = searchTerm.toLowerCase();
    
    // Search through coasterDatabase for matches
    for (const coasterId in coasterDatabase) {
        const coaster = coasterDatabase[coasterId];
        const name = coaster.name || '';
        const park = coaster.park || '';
        const country = coaster.country || '';
        
        if (name.toLowerCase().includes(search)) {
            suggestions.push({
                type: 'coaster',
                text: name,
                subtext: `${park} - ${country}`,
                coasterId: coasterId,
                park: park,
                country: country
            });
        } else if (park.toLowerCase().includes(search)) {
            const existing = suggestions.find(s => s.type === 'park' && s.text === park);
            if (!existing) {
                suggestions.push({
                    type: 'park',
                    text: park,
                    subtext: country,
                    park: park,
                    country: country
                });
            }
        } else if (country.toLowerCase().includes(search)) {
            const existing = suggestions.find(s => s.type === 'country' && s.text === country);
            if (!existing) {
                suggestions.push({
                    type: 'country',
                    text: country,
                    subtext: '',
                    country: country
                });
            }
        }
    }
    
    // Limit to 10 suggestions
    const limitedSuggestions = suggestions.slice(0, 10);
    
    // Show autocomplete dropdown
    if (limitedSuggestions.length > 0) {
        console.log('📋 Showing autocomplete with', limitedSuggestions.length, 'suggestions');
        autocompleteDropdown.innerHTML = limitedSuggestions.map((s, idx) => {
            const icon = s.type === 'coaster' ? '🎢' : s.type === 'park' ? '🏞️' : '🌍';
            return `
                <div class="autocomplete-item" data-index="${idx}">
                    <span class="autocomplete-icon">${icon}</span>
                    <div class="autocomplete-text">
                        <div class="autocomplete-main">${escapeHtml(s.text)}</div>
                        ${s.subtext ? `<div class="autocomplete-sub">${escapeHtml(s.subtext)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach click handlers
        autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach((item, idx) => {
            item.addEventListener('click', () => {
                const s = limitedSuggestions[idx];
                console.log('🖱️ Autocomplete item clicked:', s.type, s.text, {park: s.park, country: s.country, coasterId: s.coasterId});
                selectCreditsAutocomplete(s.type, s.text, s.park || null, s.country || null, s.coasterId || null);
            });
        });
        console.log('✅ Attached', autocompleteDropdown.querySelectorAll('.autocomplete-item').length, 'click handlers');
        
        autocompleteDropdown.style.display = 'block';
    } else {
        autocompleteDropdown.style.display = 'none';
    }
    
    // Also filter the hierarchy
    populateCreditsHierarchy(searchTerm);
}

// Select an autocomplete suggestion and navigate to it
function selectCreditsAutocomplete(type, text, park, country, coasterId) {
    console.log('🎯 selectCreditsAutocomplete called:', {type, text, park, country, coasterId});
    
    const autocompleteDropdown = document.getElementById('creditsAutocomplete');
    const searchInput = document.getElementById('creditsSearchInput');
    
    // Hide autocomplete
    if (autocompleteDropdown) {
        autocompleteDropdown.style.display = 'none';
        console.log('✅ Autocomplete dropdown hidden');
    }
    
    // Clear search input to show all results
    if (searchInput) {
        searchInput.value = '';
        console.log('✅ Search input cleared');
    }
    
    // Populate hierarchy without filtering to show all coasters
    console.log('🔄 Repopulating hierarchy without filter');
    populateCreditsHierarchy('');
    
    // Navigate to the item by expanding hierarchy and highlighting
    setTimeout(() => {
        if (type === 'coaster' && coasterId) {
            console.log('🎢 Looking for coaster:', text);
            
            // Find the coaster in the database to get its location
            const coaster = coasterDatabase[coasterId];
            if (!coaster) {
                console.error('❌ Coaster not found in database:', coasterId);
                return;
            }
            
            const coasterPark = coaster.park;
            const coasterCountry = coaster.country;
            // Look up continent from countriesData
            const coasterContinent = (typeof countriesData !== 'undefined' && countriesData[coasterCountry]) 
                ? countriesData[coasterCountry].continent 
                : 'Unknown';
            
            console.log('📍 Coaster location:', {continent: coasterContinent, country: coasterCountry, park: coasterPark});
            
            // Manually expand the path: continent -> country -> park
            const continentId = `continent-${coasterContinent.replace(/\s+/g, '-')}`;
            const countryId = `country-${coasterContinent.replace(/\s+/g, '-')}-${coasterCountry.replace(/\s+/g, '-')}`;
            const parkId = `park-${coasterContinent.replace(/\s+/g, '-')}-${coasterCountry.replace(/\s+/g, '-')}-${coasterPark.replace(/\s+/g, '-')}`;
            
            console.log('🔍 Looking for IDs:', {continentId, countryId, parkId});
            
            // Expand continent
            const continentContainer = document.getElementById(continentId);
            const continentRow = document.querySelector(`[onclick*="${continentId}"]`);
            if (continentContainer && continentRow) {
                continentContainer.style.display = 'block';
                const continentChevron = continentRow.querySelector('.chevron');
                if (continentChevron) continentChevron.textContent = '▼';
                console.log('✅ Expanded continent:', coasterContinent);
            } else {
                console.error('❌ Could not find continent container or row:', continentId);
            }
            
            // Expand country
            const countryContainer = document.getElementById(countryId);
            const countryRow = document.querySelector(`[onclick*="${countryId}"]`);
            if (countryContainer && countryRow) {
                countryContainer.style.display = 'block';
                const countryChevron = countryRow.querySelector('.chevron');
                if (countryChevron) countryChevron.textContent = '▼';
                console.log('✅ Expanded country:', coasterCountry);
            } else {
                console.error('❌ Could not find country container or row:', countryId);
            }
            
            // Expand park
            const parkContainer = document.getElementById(parkId);
            const parkRow = document.querySelector(`[onclick*="${parkId}"]`);
            if (parkContainer && parkRow) {
                parkContainer.style.display = 'block';
                const parkChevron = parkRow.querySelector('.chevron');
                if (parkChevron) parkChevron.textContent = '▼';
                console.log('✅ Expanded park:', coasterPark);
            } else {
                console.error('❌ Could not find park container or row:', parkId);
            }
            
            // Now find and highlight the coaster
            const checkbox = document.getElementById(`credit-${coasterId}`);
            if (checkbox) {
                console.log('✅ Found checkbox:', checkbox);
                const row = checkbox.closest('.hierarchy-row');
                if (row) {
                    console.log('✅ Found row, scrolling and highlighting');
                    // Scroll to the row
                    row.scrollIntoView({ behavior: 'instant', block: 'center' });
                    
                    // Add green highlight with fade
                    row.classList.add('highlight-flash');
                    setTimeout(() => row.classList.remove('highlight-flash'), 4000);
                    console.log('✅ Applied highlight-flash class');
                } else {
                    console.error('❌ Could not find row for checkbox');
                }
            } else {
                console.error('❌ Could not find checkbox with id:', `credit-${coasterId}`);
            }
        } else if (type === 'park' && park && country) {
            console.log('🏞️ Looking for park:', park, 'in country:', country);
            
            // Find the park continent from countriesData
            const parkContinent = (typeof countriesData !== 'undefined' && countriesData[country]) 
                ? countriesData[country].continent 
                : 'Unknown';
            
            console.log('📍 Park location:', {continent: parkContinent, country, park});
            
            const continentId = `continent-${parkContinent.replace(/\s+/g, '-')}`;
            const countryId = `country-${parkContinent.replace(/\s+/g, '-')}-${country.replace(/\s+/g, '-')}`;
            const parkId = `park-${parkContinent.replace(/\s+/g, '-')}-${country.replace(/\s+/g, '-')}-${park.replace(/\s+/g, '-')}`;
            
            // Expand continent
            const continentContainer = document.getElementById(continentId);
            const continentRow = document.querySelector(`[onclick*="${continentId}"]`);
            if (continentContainer && continentRow) {
                continentContainer.style.display = 'block';
                const continentChevron = continentRow.querySelector('.chevron');
                if (continentChevron) continentChevron.textContent = '▼';
            }
            
            // Expand country
            const countryContainer = document.getElementById(countryId);
            const countryRow = document.querySelector(`[onclick*="${countryId}"]`);
            if (countryContainer && countryRow) {
                countryContainer.style.display = 'block';
                const countryChevron = countryRow.querySelector('.chevron');
                if (countryChevron) countryChevron.textContent = '▼';
            }
            
            // Expand park to show coasters
            const parkContainer = document.getElementById(parkId);
            const parkRow = document.querySelector(`[onclick*="${parkId}"]`);
            if (parkContainer && parkRow) {
                parkContainer.style.display = 'block';
                const parkChevron = parkRow.querySelector('.chevron');
                if (parkChevron) parkChevron.textContent = '▼';
                console.log('✅ Expanded park:', park);
                
                // Scroll to and highlight the park row
                parkRow.scrollIntoView({ behavior: 'instant', block: 'center' });
                parkRow.classList.add('highlight-flash');
                setTimeout(() => parkRow.classList.remove('highlight-flash'), 4000);
                console.log('✅ Scrolled and highlighted park');
            } else {
                console.error('❌ Could not find park container or row:', parkId);
            }
        } else if (type === 'country' && country) {
            console.log('🌍 Looking for country:', country);
            
            // Find continent for this country from countriesData
            const countryContinent = (typeof countriesData !== 'undefined' && countriesData[country]) 
                ? countriesData[country].continent 
                : 'Unknown';
            
            console.log('📍 Country location:', {continent: countryContinent, country});
            
            const continentId = `continent-${countryContinent.replace(/\s+/g, '-')}`;
            const countryId = `country-${countryContinent.replace(/\s+/g, '-')}-${country.replace(/\s+/g, '-')}`;
            
            // Expand continent
            const continentContainer = document.getElementById(continentId);
            const continentRow = document.querySelector(`[onclick*="${continentId}"]`);
            if (continentContainer && continentRow) {
                continentContainer.style.display = 'block';
                const continentChevron = continentRow.querySelector('.chevron');
                if (continentChevron) continentChevron.textContent = '▼';
            }
            
            // Find and highlight the country row
            const countryRow = document.querySelector(`[onclick*="${countryId}"]`);
            if (countryRow) {
                countryRow.scrollIntoView({ behavior: 'instant', block: 'center' });
                countryRow.classList.add('highlight-flash');
                setTimeout(() => countryRow.classList.remove('highlight-flash'), 4000);
                console.log('✅ Scrolled and highlighted country');
            }
        }
    }, 300);
}

// Update profile credits count display
function updateProfileCreditsCount() {
    const totalCoasters = userCredits.size;
    const homeTotalCoastersEl = document.getElementById('homeTotalCoasters');
    const rankingTotalCoastersEl = document.getElementById('rankingTotalCoasters');
    
    if (homeTotalCoastersEl) homeTotalCoastersEl.textContent = totalCoasters;
    if (rankingTotalCoastersEl) rankingTotalCoastersEl.textContent = totalCoasters;
    
    console.log(`Updated profile count: ${totalCoasters} credits`);
}

// ===== CREDITS TAB SORT AND FILTER FUNCTIONS =====

// State tracking for credits tab
let currentCreditsSort = 'name'; // Current sort option
let currentParkFilter = ''; // Current park filter
let currentManufacturerFilter = ''; // Current manufacturer filter

// Sort credits
function sortCredits() {
    const sortBy = document.getElementById('creditsSortBy')?.value || 'name';
    
    // Update state
    currentCreditsSort = sortBy;
    
    const userCoasterIds = [...userCredits];
    
    // Get all coasters with their data and rank from coasterStats
    const coastersWithData = userCoasterIds
        .map(id => {
            const coaster = coasterDatabase[id];
            if (!coaster) return null;
            
            // Get rank from coasterStats (pre-calculated by recalculateAllRanks)
            let rank = null;
            if (typeof coasterStats !== 'undefined' && coasterStats[coaster.name]) {
                rank = coasterStats[coaster.name].rank;
            }
            
            return {
                id,
                coaster,
                rank
            };
        })
        .filter(c => c !== null);
    
    // Sort based on selected option
    coastersWithData.sort((a, b) => {
        switch (sortBy) {
            case 'rank':
                // Ranked coasters first, sorted by rank
                // Then unranked coasters sorted alphabetically
                if (a.rank !== null && b.rank !== null) {
                    return a.rank - b.rank;
                } else if (a.rank !== null) {
                    return -1; // a is ranked, b is not - a comes first
                } else if (b.rank !== null) {
                    return 1; // b is ranked, a is not - b comes first
                } else {
                    // Both unranked - sort alphabetically
                    return (a.coaster.name || '').localeCompare(b.coaster.name || '');
                }
            case 'name':
                return (a.coaster.name || '').localeCompare(b.coaster.name || '');
            case 'park':
                return (a.coaster.park || '').localeCompare(b.coaster.park || '');
            case 'manufacturer':
                return (a.coaster.manufacturer || '').localeCompare(b.coaster.manufacturer || '');
            case 'speed':
                const speedA = a.coaster.speed ? parseFloat(a.coaster.speed) : -1;
                const speedB = b.coaster.speed ? parseFloat(b.coaster.speed) : -1;
                return speedB - speedA;
            case 'height':
                const heightA = a.coaster.height ? parseFloat(a.coaster.height) : -1;
                const heightB = b.coaster.height ? parseFloat(b.coaster.height) : -1;
                return heightB - heightA;
            case 'length':
                const lengthA = a.coaster.length ? parseFloat(a.coaster.length) : -1;
                const lengthB = b.coaster.length ? parseFloat(b.coaster.length) : -1;
                return lengthB - lengthA;
            case 'year':
                const yearA = a.coaster.openingYear ? parseInt(a.coaster.openingYear) : -1;
                const yearB = b.coaster.openingYear ? parseInt(b.coaster.openingYear) : -1;
                return yearB - yearA;
            case 'inversions':
                const invA = a.coaster.inversions || 0;
                const invB = b.coaster.inversions || 0;
                return invB - invA;
            default:
                return 0;
        }
    });
    
    // Update userCredits with sorted order (permanent)
    userCredits = new Set(coastersWithData.map(c => c.id));
    
    // Update display with current filters applied
    updateCreditsDisplay();
}

// Filter credits
function filterCredits() {
    const parkFilter = document.getElementById('creditsFilterPark')?.value || '';
    const manuFilter = document.getElementById('creditsFilterManufacturer')?.value || '';
    
    // Update state
    currentParkFilter = parkFilter;
    currentManufacturerFilter = manuFilter;
    
    // Update sort dropdown options based on filters
    updateCreditsSortOptions();
    
    // Show/hide clear buttons based on filter selection
    const clearParkBtn = document.getElementById('clearParkFilter');
    const clearManuBtn = document.getElementById('clearManufacturerFilter');
    
    if (clearParkBtn) {
        clearParkBtn.style.display = parkFilter ? 'block' : 'none';
    }
    if (clearManuBtn) {
        clearManuBtn.style.display = manuFilter ? 'block' : 'none';
    }
    
    // Populate dropdowns if they're empty
    if (!document.getElementById('creditsFilterPark')?.options.length || document.getElementById('creditsFilterPark')?.options.length <= 1) {
        populateCreditsFilters();
    }
    
    // Update display with current filters
    updateCreditsDisplay();
}

// Update sort dropdown options based on active filters
function updateCreditsSortOptions() {
    const sortDropdown = document.getElementById('creditsSortBy');
    if (!sortDropdown) return;
    
    const parkOption = Array.from(sortDropdown.options).find(opt => opt.value === 'park');
    const manuOption = Array.from(sortDropdown.options).find(opt => opt.value === 'manufacturer');
    
    // Hide park option if park filter is active
    if (parkOption) {
        parkOption.style.display = currentParkFilter !== '' ? 'none' : '';
    }
    
    // Hide manufacturer option if manufacturer filter is active
    if (manuOption) {
        manuOption.style.display = currentManufacturerFilter !== '' ? 'none' : '';
    }
    
    // If current sort is hidden, switch to 'name'
    if ((sortDropdown.value === 'park' && currentParkFilter) || 
        (sortDropdown.value === 'manufacturer' && currentManufacturerFilter)) {
        sortDropdown.value = 'name';
        currentCreditsSort = 'name';
        // Re-sort with name
        sortCredits();
    }
}

// Unified display function that applies filters to the sorted userCredits
function updateCreditsDisplay() {
    // Get all user coasters (already sorted in userCredits)
    const allUserCoasters = [...userCredits].map(id => {
        const coaster = coasterDatabase[id];
        if (!coaster) return null;
        return { id, coaster };
    }).filter(c => c !== null);
    
    // Apply filters
    let filtered = allUserCoasters;
    
    if (currentParkFilter) {
        filtered = filtered.filter(c => c.coaster.park === currentParkFilter);
    }
    
    if (currentManufacturerFilter) {
        filtered = filtered.filter(c => c.coaster.manufacturer === currentManufacturerFilter);
    }
    
    // Display filtered results
    populateCreditsGridFiltered(filtered.map(c => c.id));
}

// Clear specific filter
function clearCreditsFilter(filterType) {
    if (filterType === 'park') {
        const parkSelect = document.getElementById('creditsFilterPark');
        if (parkSelect) {
            parkSelect.value = '';
            currentParkFilter = '';
        }
    } else if (filterType === 'manufacturer') {
        const manuSelect = document.getElementById('creditsFilterManufacturer');
        if (manuSelect) {
            manuSelect.value = '';
            currentManufacturerFilter = '';
        }
    }
    
    // Update sort dropdown options
    updateCreditsSortOptions();
    
    // Re-run filter to update display and button visibility
    filterCredits();
}

// Populate filter dropdowns
function populateCreditsFilters() {
    const parkSelect = document.getElementById('creditsFilterPark');
    const manuSelect = document.getElementById('creditsFilterManufacturer');
    
    if (!parkSelect || !manuSelect) return;
    
    // Get unique parks and manufacturers from user's credits
    const parks = new Set();
    const manufacturers = new Set();
    
    [...userCredits].forEach(id => {
        const coaster = coasterDatabase[id];
        if (coaster) {
            if (coaster.park) parks.add(coaster.park);
            if (coaster.manufacturer) manufacturers.add(coaster.manufacturer);
        }
    });
    
    // Populate parks
    parkSelect.innerHTML = '<option value="">All Parks</option>' +
        [...parks].sort().map(park => `<option value="${escapeHtml(park)}">${escapeHtml(park)}</option>`).join('');
    
    // Populate manufacturers
    manuSelect.innerHTML = '<option value="">All Manufacturers</option>' +
        [...manufacturers].sort().map(manu => `<option value="${escapeHtml(manu)}">${escapeHtml(manu)}</option>`).join('');
}


// Export functions to window for HTML onclick handlers (ES Module compatibility)
window.toggleUserMenu = typeof toggleUserMenu !== 'undefined' ? toggleUserMenu : null;
window.openSettings = typeof openSettings !== 'undefined' ? openSettings : null;
window.toggleDarkMode = typeof toggleDarkMode !== 'undefined' ? toggleDarkMode : null;
window.logoutUser = typeof logoutUser !== 'undefined' ? logoutUser : null;
window.switchTab = typeof switchTab !== 'undefined' ? switchTab : null;
window.selectUser = typeof selectUser !== 'undefined' ? selectUser : null;
window.chooseWinner = typeof chooseWinner !== 'undefined' ? chooseWinner : null;
window.closeResetModal = typeof closeResetModal !== 'undefined' ? closeResetModal : null;
window.closeResetRankingModal = typeof closeResetRankingModal !== 'undefined' ? closeResetRankingModal : null;
window.ModalManager = ModalManager;
window.imageCache = imageCache;
