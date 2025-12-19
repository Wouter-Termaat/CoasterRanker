// Coaster data - will be loaded from CSV files
    let coastersDataLuca = [];
    let coastersDataWouter = [];

    // Function to parse CSV data
    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const data = [];
        
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            if (values.length >= 5) {
                data.push({
                    naam: (values[1] || '').trim(),
                    park: (values[2] || '').trim(),
                    fabrikant: (values[3] || '').trim(),
                    operatief: parseInt(values[4]) || 0
                });
            }
        }
        
        return data;
    }

    // Load CSV files
    async function loadCoasterData() {
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
            
            console.info(`Loaded coaster data: Luca=${coastersDataLuca.length}, Wouter=${coastersDataWouter.length}`);
            
            // Initialize the app after data is loaded
            initializeApp();
        } catch (error) {
            console.error('Error loading coaster data:', error);
            console.error('Error details:', error.message);
            
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

    // Initialize app after data is loaded
    function initializeApp() {
        // Check if there's a saved user preference
        const savedUser = localStorage.getItem('lastUser');
        if (savedUser && (savedUser === 'luca' || savedUser === 'wouter')) {
            switchUser(savedUser);
        }
        
        // Set header height for mobile sticky tabs
        setHeaderHeight();
        // Post-initialization UI adjustments
        postInitUISetup();
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
        } catch (e) {
            // swallow any unexpected errors to avoid breaking initialization
            console.warn('postInitUISetup error', e);
        }
    }

// Utility: debounce function to reduce frequency of hot handlers
function debounce(fn, wait = 120) {
    let t = null;
    return (...args) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => { t = null; fn(...args); }, wait);
    };
}

// Small DOM helper (convenience wrapper)
const $id = (id) => document.getElementById(id);
    
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
    let currentSort = { column: 'elo', ascending: false };
    // History: stores past battles for current user
    let coasterHistory = [];
    // Stack for undoing deletions (LIFO)
    let deletedHistoryStack = [];
    const MAX_UNDO_STACK = 50;
    // Exploration boost: favor coasters with few battles
    let EXPLORATION_POWER = 2; // higher => stronger preference for low-battles
    // Automatic ELO tuning parameters (internal, no UI required)
    const ELO_BASE = 1500;
    const K0 = 64;           // initial K scale
    const K_DECAY_C = 10;    // decay constant (larger -> slower decay)
    const K_MIN = 8;         // minimum K to keep movement
    const PRIOR_WEIGHT = 6;  // pseudo-battles pulling displayed ELO toward mean
    // ELO-proximity: prefer opponents whose ELO is similar (more informative matches)
    let ELO_PROXIMITY_POWER = 0.1; // higher => stronger preference for similar ELO
    const ELO_DIFF_SCALE = 400; // scale (in ELO points) used to normalize differences
    // Pairing strategy: hybrid — picks one under-sampled coaster
    // then picks a second that is ELO-similar while still favoring under-sampled ones.
    let pairingControlsHidden = true;
    // Track all completed pairs to prevent duplicates
    let completedPairs = new Set();

    // Dev UI: whether to show debug data beside cards
    let devShowData = false;

// Lightweight DOM cache for frequently used elements (populated on DOMContentLoaded)
const DOM = {};
    function switchUser(user) {
        currentUser = user;
        
        // Update UI
        document.querySelectorAll('.user-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('btn-' + user).classList.add('active');
        document.getElementById('currentUserBadge').textContent = `Logged in as: ${user === 'luca' ? 'Luca' : 'Wouter'}`;
        
        // Load user-specific data
        if (user === 'luca') {
            coasters = coastersDataLuca.filter(c => c.operatief === 1);
        } else {
            coasters = coastersDataWouter.filter(c => c.operatief === 1);
        }
        
        // Load or initialize stats
        loadUserData();
        
        // Load achievements
        if (typeof achievementManager !== 'undefined') {
            achievementManager.load(user);
            updateAchievementsTab();
        }
        
        // Refresh displays
        displayBattle();
        updateRanking();
        // close menu after selection (if open)
        try { closeUserMenu(); } catch (e) {}
    }

    function loadUserData() {
        const statsKey = `coasterStats_${currentUser}`;
        const battlesKey = `totalBattles_${currentUser}`;
        const historyKey = `coasterHistory_${currentUser}`;
        const pairsKey = `completedPairs_${currentUser}`;

        coasterStats = JSON.parse(localStorage.getItem(statsKey)) || initializeStats();
        totalBattlesCount = parseInt(localStorage.getItem(battlesKey)) || 0;
        coasterHistory = JSON.parse(localStorage.getItem(historyKey)) || [];
        
        // Load completed pairs
        const savedPairs = localStorage.getItem(pairsKey);
        completedPairs = savedPairs ? new Set(JSON.parse(savedPairs)) : new Set();
        
        // load pairing settings for this user (if any)
        loadPairingSettings();
        // load developer UI settings for this user
        loadDevSettings();
    }

    function initializeStats() {
        const stats = {};
        coasters.forEach(coaster => {
            stats[coaster.naam] = {
                name: coaster.naam,
                park: coaster.park,
                manufacturer: coaster.fabrikant,
                elo: 1500,
                battles: 0,
                wins: 0,
                losses: 0
            };
        });
        return stats;
    }

    function saveData() {
        if (!currentUser) return;
        const statsKey = `coasterStats_${currentUser}`;
        const battlesKey = `totalBattles_${currentUser}`;
        const historyKey = `coasterHistory_${currentUser}`;
        const pairsKey = `completedPairs_${currentUser}`;

        localStorage.setItem(statsKey, JSON.stringify(coasterStats));
        localStorage.setItem(battlesKey, totalBattlesCount.toString());
        localStorage.setItem(historyKey, JSON.stringify(coasterHistory));
        localStorage.setItem(pairsKey, JSON.stringify([...completedPairs]));
        
        // persist pairing settings per-user
        try {
            const settingsKey = `pairingSettings_${currentUser}`;
            const settings = { explorationPower: EXPLORATION_POWER, eloProximityPower: ELO_PROXIMITY_POWER, pairingControlsHidden: pairingControlsHidden };
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
            if (s && typeof s.eloProximityPower === 'number') ELO_PROXIMITY_POWER = s.eloProximityPower;
            if (s && typeof s.pairingControlsHidden === 'boolean') pairingControlsHidden = s.pairingControlsHidden;
        } catch (e) {
            // ignore
        }
        applySettingsToUI();
    }

    function setEloProximityPower(val) {
        const num = Number(val);
        if (isNaN(num)) return;
        ELO_PROXIMITY_POWER = num;
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

    function applySettingsToUI() {
        // update range and label for exploration power
        const expRange = document.getElementById('explorationPowerRange');
        const expVal = document.getElementById('explorationPowerValue');
        if (expRange) expRange.value = EXPLORATION_POWER;
        if (expVal) expVal.textContent = (Number(EXPLORATION_POWER) || 0).toFixed(1);
        
        // update range and label for elo proximity
        const range = document.getElementById('eloProximityRange');
        const val = document.getElementById('eloProximityValue');
        if (range) range.value = ELO_PROXIMITY_POWER;
        if (val) val.textContent = (Number(ELO_PROXIMITY_POWER) || 0).toFixed(1);
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

    function resetAllUserData() {
        if (!currentUser) return;
        const ok = confirm('Are you sure? This will delete rankings, history and pairing progress for the user.');
        if (!ok) return;
        coasterStats = initializeStats();
        totalBattlesCount = 0;
        coasterHistory = [];
        completedPairs = new Set();
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
                        eloProximityPower: ELO_PROXIMITY_POWER,
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
                    if (typeof data.pairingSettings.eloProximityPower === 'number') ELO_PROXIMITY_POWER = data.pairingSettings.eloProximityPower;
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
                updateAchievementsTab();
                
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
        if (!menu.contains(ev.target) && ev.target !== btn) {
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

                    // pick winner probabilistically according to current ELOs
                    const a = pair[0], b = pair[1];
                    // ensure stats exist for both coasters
                    const aStats = ensureCoasterStats(a);
                    const bStats = ensureCoasterStats(b);
                    const aE = aStats.elo, bE = bStats.elo;
                    const probA = 1 / (1 + Math.pow(10, (bE - aE) / 400));
                    const rnd = (typeof rng === 'function') ? rng() : Math.random();
                    const winnerIdx = (rnd < probA) ? 0 : 1;
                    const winner = pair[winnerIdx], loser = pair[1 - winnerIdx];

                    // update stats
                    const winnerStats = ensureCoasterStats(winner);
                    const loserStats = ensureCoasterStats(loser);
                    
                    // Capture data before battle
                    const winnerEloBefore = winnerStats.elo;
                    const loserEloBefore = loserStats.elo;
                    const winnerRankBefore = getCoasterRank(winner.naam);
                    const loserRankBefore = getCoasterRank(loser.naam);
                    const winnerBattlesBefore = winnerStats.battles;
                    const loserBattlesBefore = loserStats.battles;
                    
                    const eloOutcome = calculateEloAdaptiveFromStats(winnerStats, loserStats);
                    const { newWinnerElo, newLoserElo, K } = eloOutcome;
                    
                    // Calculate expected probabilities and potential changes
                    const expectedWinnerProb = 1 / (1 + Math.pow(10, (loserEloBefore - winnerEloBefore) / 400));
                    const expectedLoserProb = 1 - expectedWinnerProb;
                    const winnerPotentialGain = newWinnerElo - winnerEloBefore;
                    const loserPotentialLoss = newLoserElo - loserEloBefore;
                    const loserIfWinOutcome = calculateEloAdaptiveFromStats(loserStats, winnerStats);
                    const loserPotentialGain = loserIfWinOutcome.newWinnerElo - loserEloBefore;
                    const winnerPotentialLoss = loserIfWinOutcome.newLoserElo - winnerEloBefore;
                    
                    winnerStats.elo = newWinnerElo; winnerStats.battles++; winnerStats.wins++;
                    loserStats.elo = newLoserElo; loserStats.battles++; loserStats.losses++;
                    totalBattlesCount++;
                    
                    // Get ranks after battle
                    const winnerRankAfter = getCoasterRank(winner.naam);
                    const loserRankAfter = getCoasterRank(loser.naam);
                    const wasCloseMatch = Math.abs(winnerRankBefore - loserRankBefore) < 3;
                    
                    // Build comprehensive battle stats
                    const battleStats = {
                        statsA: {
                            eloBefore: (pair[0].naam === winner.naam) ? winnerEloBefore : loserEloBefore,
                            eloAfter: (pair[0].naam === winner.naam) ? winnerStats.elo : loserStats.elo,
                            kFactor: K,
                            potentialGain: (pair[0].naam === winner.naam) ? winnerPotentialGain : loserPotentialGain,
                            potentialLoss: (pair[0].naam === winner.naam) ? winnerPotentialLoss : loserPotentialLoss,
                            rankBefore: (pair[0].naam === winner.naam) ? winnerRankBefore : loserRankBefore,
                            rankAfter: (pair[0].naam === winner.naam) ? winnerRankAfter : loserRankAfter,
                            expectedWinProbability: (pair[0].naam === winner.naam) ? expectedWinnerProb : expectedLoserProb,
                            totalBattlesBefore: (pair[0].naam === winner.naam) ? winnerBattlesBefore : loserBattlesBefore
                        },
                        statsB: {
                            eloBefore: (pair[1].naam === winner.naam) ? winnerEloBefore : loserEloBefore,
                            eloAfter: (pair[1].naam === winner.naam) ? winnerStats.elo : loserStats.elo,
                            kFactor: K,
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

                    simulated++;
                    if (progressCallback && (simulated % 10 === 0)) progressCallback(simulated, count);
                }
                // yield to event loop between batches
                await new Promise(r => setTimeout(r, 0));
            }
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
        const leftStats = coasterStats[left.naam] || { elo:1500, battles:0, wins:0, losses:0 };
        const rightStats = coasterStats[right.naam] || { elo:1500, battles:0, wins:0, losses:0 };
        // compute ELO scenarios once
        const leftIfWin = calculateEloAdaptiveFromStats(leftStats, rightStats);
        const leftIfLose = calculateEloAdaptiveFromStats(rightStats, leftStats);
        const rightIfWin = calculateEloAdaptiveFromStats(rightStats, leftStats);
        const rightIfLose = calculateEloAdaptiveFromStats(leftStats, rightStats);
        const leftGainWin = Math.round(leftIfWin.newWinnerElo - leftStats.elo);
        const leftLoseIfLose = Math.round(leftIfLose.newLoserElo - leftStats.elo);
        const rightGainWin = Math.round(rightIfWin.newWinnerElo - rightStats.elo);
        const rightLoseIfLose = Math.round(rightIfLose.newLoserElo - rightStats.elo);
        const fmt = (n) => (n >= 0 ? '+' + n : n.toString());

        const rank1 = (() => { const statsArray = Object.values(coasterStats); const sorted = [...statsArray].sort((a, b) => b.elo - a.elo); return sorted.findIndex(c => c.name === left.naam) + 1; })();
        const rank2 = (() => { const statsArray = Object.values(coasterStats); const sorted = [...statsArray].sort((a, b) => b.elo - a.elo); return sorted.findIndex(c => c.name === right.naam) + 1; })();

        const devLeftHtml = `
            <div><strong>Rank:</strong> ${rank1}</div>
            <div><strong>ELO:</strong> ${Math.round(leftStats.elo)}</div>
            <div><strong>Δ (win):</strong> ${fmt(leftGainWin)}</div>
            <div><strong>Δ (lose):</strong> ${fmt(leftLoseIfLose)}</div>
            <div><strong>Battles:</strong> ${leftStats.battles}</div>
            <div><strong>Wins:</strong> ${leftStats.wins}</div>
            <div><strong>Losses:</strong> ${leftStats.losses}</div>
        `;
        const devRightHtml = `
            <div><strong>Rank:</strong> ${rank2}</div>
            <div><strong>ELO:</strong> ${Math.round(rightStats.elo)}</div>
            <div><strong>Δ (win):</strong> ${fmt(rightGainWin)}</div>
            <div><strong>Δ (lose):</strong> ${fmt(rightLoseIfLose)}</div>
            <div><strong>Battles:</strong> ${rightStats.battles}</div>
            <div><strong>Wins:</strong> ${rightStats.wins}</div>
            <div><strong>Losses:</strong> ${rightStats.losses}</div>
        `;

        // Place overlay inside coaster cards, over the images
        const cards = battleContainer.querySelectorAll('.coaster-card');
        if (cards[0]) {
            const leftOverlay = document.createElement('div');
            leftOverlay.className = 'dev-data-overlay';
            leftOverlay.innerHTML = devLeftHtml;
            cards[0].appendChild(leftOverlay);
        }
        if (cards[1]) {
            const rightOverlay = document.createElement('div');
            rightOverlay.className = 'dev-data-overlay';
            rightOverlay.innerHTML = devRightHtml;
            cards[1].appendChild(rightOverlay);
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
        
        const statsArray = Object.values(coasterStats);
        const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
        
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

        // keep history bounded if you want (optional)
        const MAX_HISTORY_KEEP = 10000;
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
                        // base exploration weight: inverse of (1 + battles) ^ EXPLORATION_POWER
                        const w = 1 / Math.pow(1 + Math.max(0, battles), EXPLORATION_POWER);
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

                // Hybrid strategy: pick one under-sampled coaster first, then a second biased by ELO-proximity
                // (still favors under-sampled ones via base weights)
                const indexFromExploration = () => sampleIndexFromWeights(weights, randomFn);
                for (let t = 0; t < attempts; t++) {
                    const i = indexFromExploration();
                    // use displayedElo (regularized) for pairing proximity calculations
                    const eloI = (coasterStats && coasterStats[coasters[i].naam]) ? displayedElo(coasterStats[coasters[i].naam]) : ELO_BASE;
                    const condWeights = new Array(length);
                    for (let k = 0; k < length; k++) {
                        if (k === i) { condWeights[k] = 0; continue; }
                        const nameK = coasters[k].naam;
                        const eloK = (coasterStats && coasterStats[nameK]) ? displayedElo(coasterStats[nameK]) : ELO_BASE;
                        const diff = Math.abs(eloI - eloK) / ELO_DIFF_SCALE; // normalized diff (using displayed ELO)
                        const proximityFactor = 1 / Math.pow(1 + diff, ELO_PROXIMITY_POWER);
                        const base = isFinite(weights[k]) && weights[k] > 0 ? weights[k] : 1;
                        condWeights[k] = base * proximityFactor;
                    }

                    let j = sampleIndexFromWeights(condWeights, randomFn);
                    if (j === i) {
                        let guard = 0;
                        while (j === i && guard++ < 8) j = sampleIndexFromWeights(condWeights, randomFn);
                        if (j === i) j = (i + 1) % length;
                    }

                    const a = coasters[i], b = coasters[j];
                    const key = pairKey(a.naam, b.naam);
                    if (!completedPairs.has(key)) return [a, b];
                }

                // fallback scanning approach: try to find any unseen pair deterministically
                for (let i = 0; i < length; i++) {
                    for (let j = i + 1; j < length; j++) {
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

    function calculateElo(winnerElo, loserElo, K = 32) {
        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
        const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
        
        const newWinnerElo = winnerElo + K * (1 - expectedWinner);
        const newLoserElo = loserElo + K * (0 - expectedLoser);
        
        return { newWinnerElo, newLoserElo };
    }

    // Compute adaptive K based on number of battles (automatic, internal)
    function computeAdaptiveK(battles) {
        return Math.max(K_MIN, K0 / (1 + (battles || 0) / K_DECAY_C));
    }

    // Displayed ELO with Bayesian-like shrinkage towards population mean
    function displayedElo(stats) {
        if (!stats) return ELO_BASE;
        const n = stats.battles || 0;
        if (n === 0) return ELO_BASE;
        return (stats.elo * n + ELO_BASE * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);
    }

    // Adaptive ELO calculation using each coaster's battle count to pick K
    function calculateEloAdaptiveFromStats(winnerStats, loserStats) {
        const wElo = (winnerStats && typeof winnerStats.elo === 'number') ? winnerStats.elo : ELO_BASE;
        const lElo = (loserStats && typeof loserStats.elo === 'number') ? loserStats.elo : ELO_BASE;
        const wBattles = (winnerStats && typeof winnerStats.battles === 'number') ? winnerStats.battles : 0;
        const lBattles = (loserStats && typeof loserStats.battles === 'number') ? loserStats.battles : 0;

        const Kw = computeAdaptiveK(wBattles);
        const Kl = computeAdaptiveK(lBattles);
        const K = Math.max(Kw, Kl);

        const expectedWinner = 1 / (1 + Math.pow(10, (lElo - wElo) / 400));
        const expectedLoser = 1 - expectedWinner;

        const newWinnerElo = wElo + K * (1 - expectedWinner);
        const newLoserElo = lElo + K * (0 - expectedLoser);

        return { newWinnerElo, newLoserElo, K };
    }

    // Ensure a coaster has an entry in `coasterStats`. Returns the stats object.
    function ensureCoasterStats(coaster) {
        if (!coaster || !coaster.naam) return null;
        const name = coaster.naam;
        if (!coasterStats[name]) {
            coasterStats[name] = {
                name: name,
                park: coaster.park || (coaster.park === undefined ? '' : coaster.park),
                manufacturer: coaster.fabrikant || coaster.manufacturer || '',
                elo: 1500,
                battles: 0,
                wins: 0,
                losses: 0
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
    const CR_STORAGE_COUNTER = 'cr_rareBattleCounter';
    const CR_STORAGE_THRESHOLD = 'cr_rareBattleThreshold';
    function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
    function getCoasterId(c){ return (c && (c.naam || c.name || c.id)) || String(Math.random()); }
    function getCoasterName(c){ return (c && (c.naam || c.name)) || 'Coaster'; }

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
        // compute sorted ranks by displayedElo
        const sorted = [...statsArray].sort((a,b) => displayedElo(b) - displayedElo(a));
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
                const cards = document.querySelectorAll('.coaster-card');
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
            try{
                if (!cardEl) return resolve();

                // Ensure intro overlay, banner and burst are hidden during celebration.
                // Save inline styles so we can restore them after celebration (if needed).
                try {
                    const overlayEl = document.getElementById('closeBattleOverlay');
                    const bannerEl = document.getElementById('closeBanner');
                    const winnerBurst = document.getElementById('winnerBurst');
                    // store previous inline styles
                    const prev = {};
                    if (overlayEl) {
                        prev.overlayDisplay = overlayEl.style.display;
                        prev.overlayOpacity = overlayEl.style.opacity;
                        prev.overlayZ = overlayEl.style.zIndex;
                        // Remove any visible state and force-hide the overlay immediately using !important
                        overlayEl.classList.remove('show');
                        overlayEl.style.setProperty('display', 'none', 'important');
                        overlayEl.style.setProperty('opacity', '0', 'important');
                        overlayEl.style.zIndex = '';
                        overlayEl.setAttribute('aria-hidden', 'true');
                    }
                    if (bannerEl) { bannerEl.classList.remove('show'); }
                    if (winnerBurst) { winnerBurst.classList.remove('show','big'); }
                    // attach prev store on the card element so we can restore later
                    cardEl._closeOverlayPrev = prev;
                } catch (e) {}

                // apply in-place celebration class to scale and bring forward
                cardEl.classList.add('celebrate-in-place');

                // spawn confetti pieces around center of the card
                const rect = cardEl.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 3;

                const colors = ['#ff3f6e','#ffd86b','#6ee7b7','#7dd3fc','#c084fc','#ffc4d6','#ffb86b'];
                const confettiCount = 36;
                const confettiEls = [];
                for (let i=0;i<confettiCount;i++){
                    const c = document.createElement('div');
                    c.className = 'confetti-piece';
                    const size = 6 + Math.floor(Math.random()*12);
                    c.style.width = size + 'px'; c.style.height = Math.floor(size*1.2) + 'px';
                    // randomize start position near the card center
                    const left = cx + (Math.random()*rect.width - rect.width/2);
                    const top = cy + (Math.random()*rect.height/2 - rect.height/4);
                    c.style.left = left + 'px';
                    c.style.top = top + 'px';
                    c.style.background = colors[Math.floor(Math.random()*colors.length)];
                    c.style.transform = `translateY(-6px) rotate(${Math.random()*360}deg)`;
                    c.style.animationDuration = (900 + Math.floor(Math.random()*900)) + 'ms';
                    document.body.appendChild(c);
                    confettiEls.push(c);
                }

                // show winner burst briefly
                const winnerBurst = document.getElementById('winnerBurst');
                const winnerText = document.getElementById('winnerText');
                if (winnerText) winnerText.textContent = `${winnerName} WINS!`;
                if (winnerBurst) winnerBurst.classList.add('show','big');

                const CELEBRATE_MS = 1400;
                setTimeout(()=>{
                    // cleanup
                    try{
                        if (winnerBurst) winnerBurst.classList.remove('show','big');
                        confettiEls.forEach(c => c.remove());
                        cardEl.classList.remove('celebrate-in-place');
                        // restore overlay inline styles if we saved them
                        const prev = cardEl._closeOverlayPrev;
                        const overlayEl = document.getElementById('closeBattleOverlay');
                        if (prev && overlayEl) {
                            // restore prior inline values if they existed, otherwise remove the inline property
                            if (typeof prev.overlayDisplay !== 'undefined' && prev.overlayDisplay !== null && prev.overlayDisplay !== '') overlayEl.style.display = prev.overlayDisplay; else overlayEl.style.removeProperty('display');
                            if (typeof prev.overlayOpacity !== 'undefined' && prev.overlayOpacity !== null && prev.overlayOpacity !== '') overlayEl.style.opacity = prev.overlayOpacity; else overlayEl.style.removeProperty('opacity');
                            if (typeof prev.overlayZ !== 'undefined' && prev.overlayZ !== null && prev.overlayZ !== '') overlayEl.style.zIndex = prev.overlayZ; else overlayEl.style.removeProperty('z-index');
                            overlayEl.removeAttribute('aria-hidden');
                            delete cardEl._closeOverlayPrev;
                        }
                        // restore original VS divider if we hid it earlier
                        try { restoreVsDivider(); } catch(e) {}
                    }catch(e){}
                    resolve();
                }, CELEBRATE_MS);
            }catch(e){ resolve(); }
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

            epicCloseBattleSequence(coasterA, coasterB, rankA, rankB, winnerId).then((forcedSwap)=>{
                resolve({triggered:true, forcedSwap: !!forcedSwap});
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

    function displayBattle() {
        const vsEl = $id('vsDivider') || document.querySelector('.vs-divider');
        // ensure battle container visibility helper exists
        const battleContainerEl = DOM.battleContainer || $id('battleContainer');
        // If no user selected, show hint and hide VS
        if (!currentUser) {
            (DOM.battleContainer || $id('battleContainer')).innerHTML = '<div class="no-battles">Select a user above first! 👆</div>';
            if (vsEl) vsEl.style.display = 'none';
            try { if (battleContainerEl) battleContainerEl.style.display = 'none'; } catch (e) {}
            currentBattle = null;
            return;
        }

        // if there aren't enough active coasters, show a helpful message
        if (!coasters || coasters.length < 2) {
            (DOM.battleContainer || $id('battleContainer')).innerHTML = '<div class="no-battles">No active coasters found for this user. Check your CSV or the "operational" column.</div>';
            if (vsEl) vsEl.style.display = 'none';
            currentBattle = null;
            return;
        }

        // If developer forced a close battle and `currentBattle` is already set, don't overwrite it.
        if (!devForceCloseBattle || !currentBattle) {
            currentBattle = getRandomCoasters();
        }
        const battleContainer = DOM.battleContainer || $id('battleContainer');
        
        // Check if no more pairs available
        if (!currentBattle || currentBattle.length === 0) {
            battleContainer.innerHTML = '<div class="no-battles">🎉 Congratulations!<br><br>You have completed all possible matchups!<br><br>Check the ranking tab to see your final list.</div>';
            if (vsEl) vsEl.style.display = 'none';
            return;
        }

        // show VS divider when an active battle is present
        if (vsEl) vsEl.style.display = 'flex';
        try { if (battleContainerEl) battleContainerEl.style.display = ''; } catch (e) {}
        
        // Get current rankings for both coasters
        const getRanking = (coasterName) => {
            const statsArray = Object.values(coasterStats);
            const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
            const rank = sorted.findIndex(c => c.name === coasterName) + 1;
            return rank;
        };
        
        const rank1 = getRanking(currentBattle[0].naam);
        const rank2 = getRanking(currentBattle[1].naam);
        
        // dev data calculations
        const left = currentBattle[0], right = currentBattle[1];
        const leftStats = coasterStats[left.naam] || { elo:1500, battles:0, wins:0, losses:0 };
        const rightStats = coasterStats[right.naam] || { elo:1500, battles:0, wins:0, losses:0 };
        // compute ELO scenarios once
        const leftIfWin = calculateEloAdaptiveFromStats(leftStats, rightStats);
        const leftIfLose = calculateEloAdaptiveFromStats(rightStats, leftStats);
        const rightIfWin = calculateEloAdaptiveFromStats(rightStats, leftStats);
        const rightIfLose = calculateEloAdaptiveFromStats(leftStats, rightStats);
        const leftGainWin = Math.round(leftIfWin.newWinnerElo - leftStats.elo);
        const leftLoseIfLose = Math.round(leftIfLose.newLoserElo - leftStats.elo);
        const rightGainWin = Math.round(rightIfWin.newWinnerElo - rightStats.elo);
        const rightLoseIfLose = Math.round(rightIfLose.newLoserElo - rightStats.elo);
        const fmt = (n) => (n >= 0 ? '+' + n : n.toString());
        
        const devLeftHtml = `
            <div><strong>Rank:</strong> ${rank1}</div>
            <div><strong>ELO:</strong> ${Math.round(leftStats.elo)}</div>
            <div><strong>Δ (win):</strong> ${fmt(leftGainWin)}</div>
            <div><strong>Δ (lose):</strong> ${fmt(leftLoseIfLose)}</div>
            <div><strong>Battles:</strong> ${leftStats.battles}</div>
            <div><strong>Wins:</strong> ${leftStats.wins}</div>
            <div><strong>Losses:</strong> ${leftStats.losses}</div>
        `;
        const devRightHtml = `
            <div><strong>Rank:</strong> ${rank2}</div>
            <div><strong>ELO:</strong> ${Math.round(rightStats.elo)}</div>
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
        
        // Render only the cards; dev-data will be positioned separately (desktop) or in-flow (mobile)
        battleContainer.innerHTML = `
            <div class="coaster-item">
                <div class="coaster-card left-card" onclick="chooseWinner(0)">
                    <div class="coaster-image">IMG</div>
                    <div class="coaster-rank-badge">${rank1}</div>
                    <div class="coaster-content">
                        <div class="coaster-name">${left.naam}</div>
                        <div class="coaster-subtitle">
                            <span class="${parkClass}">${left.park}</span>
                            <span class="separator">•</span>
                            <span class="${fabrikantClass}">${left.fabrikant}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="coaster-item">
                <div class="coaster-card right-card" onclick="chooseWinner(1)">
                    <div class="coaster-image">IMG</div>
                    <div class="coaster-rank-badge">${rank2}</div>
                    <div class="coaster-content">
                        <div class="coaster-name">${right.naam}</div>
                        <div class="coaster-subtitle">
                            <span class="${parkClass}">${right.park}</span>
                            <span class="separator">•</span>
                            <span class="${fabrikantClass}">${right.fabrikant}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // If this matchup qualifies as a close fight, play the intro animation
        const getRankingNum = (coasterName) => {
            const statsArray = Object.values(coasterStats);
            const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
            return sorted.findIndex(c => c.name === coasterName) + 1;
        };
        const r1 = getRankingNum(left.naam);
        const r2 = getRankingNum(right.naam);
        const leftStatsObj = coasterStats[left.naam] || { battles: 0 };
        const rightStatsObj = coasterStats[right.naam] || { battles: 0 };
        const isCloseEligible = ((Math.abs(r1 - r2) < 3) && (leftStatsObj.battles > 3) && (rightStatsObj.battles > 3));
        // Determine whether an epic intro will fire on the next battle (rare event)
        function willEpicTriggerOnNext(){
            try{
                const counter = Number(localStorage.getItem(CR_STORAGE_COUNTER) || 0);
                const threshold = Number(localStorage.getItem(CR_STORAGE_THRESHOLD) || randInt(25,50));
                return (counter + 1) >= threshold;
            }catch(e){ return false; }
        }

        const willEpic = devForceCloseBattle || willEpicTriggerOnNext();

        if (isCloseEligible) {
            if (willEpic) {
                // full intro sequence only for epic or dev forced
                try { if (closeIntroTimeout) { clearTimeout(closeIntroTimeout); closeIntroTimeout = null; } } catch (e) {}
                closeIntroTimeout = setTimeout(() => { closeIntroTimeout = null; showCloseIntro(left, right).catch(()=>{}); }, 60);
            } else {
                // regular close matchup: subtle highlight only
                const cards = document.querySelectorAll('.coaster-card');
                if (cards[0]) cards[0].classList.add('close-subtle');
                if (cards[1]) cards[1].classList.add('close-subtle');
                // remove subtle after a short while so it doesn't persist
                setTimeout(()=>{ if (cards[0]) cards[0].classList.remove('close-subtle'); if (cards[1]) cards[1].classList.remove('close-subtle'); }, 1600);
            }
        }

        // Delegate overlay rendering to a dedicated function so we can update without reselecting the pair
        renderDevData();
        // sync input width after cards are rendered
        setTimeout(syncSimInputWidth, 0);
    }

    // Explicitly hide/show the battle UI (cards + VS badge). Use this from tab switching
    function setBattleVisibility(visible) {
        const battleContainerEl = DOM.battleContainer || $id('battleContainer');
        const vsEl = $id('vsDivider') || document.querySelector('.vs-divider');
        try {
            if (battleContainerEl) battleContainerEl.style.display = visible ? '' : 'none';
        } catch (e) {}
        try { if (vsEl) vsEl.style.display = visible ? 'flex' : 'none'; } catch (e) {}
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

        // ranking helper
        const getRanking = (coasterName) => {
            const statsArray = Object.values(coasterStats);
            const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
            const rank = sorted.findIndex(c => c.name === coasterName) + 1;
            return rank;
        };

        const oldWinnerRank = getRanking(winner.naam);
        const oldLoserRank = getRanking(loser.naam);

        // ensure stats exist
        const winnerStats = ensureCoasterStats(winner) || { elo:1500, battles:0, wins:0, losses:0 };
        const loserStats = ensureCoasterStats(loser) || { elo:1500, battles:0, wins:0, losses:0 };

        // Capture ELO values BEFORE battle
        const winnerEloBefore = winnerStats.elo;
        const loserEloBefore = loserStats.elo;

        // compute ELO outcome and potential changes
        const eloOutcome = calculateEloAdaptiveFromStats(winnerStats, loserStats);
        const { newWinnerElo, newLoserElo, K } = eloOutcome;
        
        // Calculate expected win probabilities
        const expectedWinnerProb = 1 / (1 + Math.pow(10, (loserEloBefore - winnerEloBefore) / 400));
        const expectedLoserProb = 1 - expectedWinnerProb;
        
        // Calculate potential gains/losses for both outcomes
        const winnerPotentialGain = newWinnerElo - winnerEloBefore;
        const loserPotentialLoss = newLoserElo - loserEloBefore;
        
        // Calculate what would happen if loser won instead
        const loserIfWinOutcome = calculateEloAdaptiveFromStats(loserStats, winnerStats);
        const loserPotentialGain = loserIfWinOutcome.newWinnerElo - loserEloBefore;
        const winnerPotentialLoss = loserIfWinOutcome.newLoserElo - winnerEloBefore;

        const winnerId = getCoasterId(winner);

        // trigger close-battle flow (may show overlay). Wait for it before applying model updates so animation aligns with visible change
        triggerCloseBattleIfNeeded(winner, loser, oldWinnerRank, oldLoserRank, winnerId).then(({triggered, forcedSwap}) => {
            // apply ranking changes
            if (forcedSwap) {
                // force winner to be above loser regardless of ELO calculation
                const baseLoserElo = (loserStats && typeof loserStats.elo === 'number') ? loserStats.elo : ELO_BASE;
                winnerStats.elo = baseLoserElo + 2;
                loserStats.elo = baseLoserElo - 1;
            } else {
                winnerStats.elo = newWinnerElo;
                loserStats.elo = newLoserElo;
            }

            winnerStats.battles++; winnerStats.wins++;
            loserStats.battles++; loserStats.losses++;
            totalBattlesCount++;

            // Get ranks after ELO changes
            const newWinnerRank = getRanking(winner.naam);
            const newLoserRank = getRanking(loser.naam);
            
            // Determine if this was a close fight
            const wasCloseMatchFlag = Math.abs(oldWinnerRank - oldLoserRank) < 3;
            
            // Build comprehensive battle stats for storage
            const battleStats = {
                statsA: {
                    eloBefore: (currentBattle[0].naam === winner.naam) ? winnerEloBefore : loserEloBefore,
                    eloAfter: (currentBattle[0].naam === winner.naam) ? winnerStats.elo : loserStats.elo,
                    kFactor: K,
                    potentialGain: (currentBattle[0].naam === winner.naam) ? winnerPotentialGain : loserPotentialGain,
                    potentialLoss: (currentBattle[0].naam === winner.naam) ? winnerPotentialLoss : loserPotentialLoss,
                    rankBefore: (currentBattle[0].naam === winner.naam) ? oldWinnerRank : oldLoserRank,
                    rankAfter: (currentBattle[0].naam === winner.naam) ? newWinnerRank : newLoserRank,
                    expectedWinProbability: (currentBattle[0].naam === winner.naam) ? expectedWinnerProb : expectedLoserProb,
                    totalBattlesBefore: (currentBattle[0].naam === winner.naam) ? winnerStats.battles - 1 : loserStats.battles - 1
                },
                statsB: {
                    eloBefore: (currentBattle[1].naam === winner.naam) ? winnerEloBefore : loserEloBefore,
                    eloAfter: (currentBattle[1].naam === winner.naam) ? winnerStats.elo : loserStats.elo,
                    kFactor: K,
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

            // Track for achievements
            const wasCloseFight = Math.abs(oldWinnerRank - oldLoserRank) < 3;
            const perfectMatch = (winner.park === loser.park) && 
                               (winner.fabrikant === loser.fabrikant) &&
                               winner.park && loser.park && 
                               winner.fabrikant && loser.fabrikant;
            
            if (typeof achievementManager !== 'undefined') {
                achievementManager.recordBattle(index, perfectMatch, wasCloseFight, currentBattle[0].naam, currentBattle[1].naam);
            }

            // Visual feedback on cards
            const cards = document.querySelectorAll('.coaster-card');
            if (cards[index]) cards[index].classList.add('winner');
            if (cards[1 - index]) cards[1 - index].classList.add('loser');

            // compute rank change (newWinnerRank already calculated above)
            const rankChange = oldWinnerRank - newWinnerRank; // positive = climbed

            if (rankChange > 0) {
                const badge = document.createElement('div');
                badge.className = 'rank-change-badge';
                badge.innerHTML = `<span class="arrow">↑</span><span>+${rankChange}</span>`;
                if (cards[index]) { cards[index].style.position = 'relative'; cards[index].appendChild(badge); }
                setTimeout(() => { if (badge.parentElement) badge.remove(); }, 4000);
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

            // after updating ranking, if this was a close matchup, show an extended celebration
            const wasCloseMatch = Math.abs(oldWinnerRank - oldLoserRank) < 3;
            if (wasCloseMatch) {
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

                const cardEl = (document.querySelectorAll('.coaster-card') || [])[index];
                celebrateWinner(cardEl, winner.naam).then(()=>{
                    // Check achievements after celebration
                    checkAndShowAchievements();
                    // small pause then continue
                    setTimeout(()=>{ try{ restoreVsDivider(); }catch(e){} displayBattle(); isProcessingChoice = false; resolvingBattle = false; }, 220);
                });
            } else {
                // delay before next battle: celebrate longer if we triggered epic
                const DELAY = triggered ? 1800 : 1500;
                setTimeout(()=>{ 
                    try{ restoreVsDivider(); }catch(e){} 
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
            winnerStats.elo = newWinnerElo; loserStats.elo = newLoserElo;
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
        if (['1', '2', '3', '4'].includes(event.key)) {
            event.preventDefault();
            const tabMap = {
                '1': 'battle',
                '2': 'ranking',
                '3': 'history',
                '4': 'achievements'
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
            chooseWinner(0);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            achievementManager.usedKeyboard = 1;
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

        // Initialize achievements display if a user was previously selected
        const lastUser = localStorage.getItem('lastUser');
        if (lastUser && typeof achievementManager !== 'undefined') {
            setTimeout(() => {
                if (currentUser) {
                    updateAchievementsTab();
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

    function switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Find and activate the corresponding tab button
        const tabButtons = document.querySelectorAll('.tab');
        const tabMap = ['battle', 'ranking', 'history', 'achievements'];
        const tabIndex = tabMap.indexOf(tabName);
        if (tabIndex >= 0 && tabButtons[tabIndex]) {
            tabButtons[tabIndex].classList.add('active');
        }
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + '-tab').classList.add('active');
        // Hide VS divider on non-battle tabs and refresh relevant tab content
        const vsEl = $id('vsDivider') || document.querySelector('.vs-divider');
        if (tabName === 'battle') {
            // Ensure battle view is up-to-date (displayBattle will show VS if appropriate)
            try { displayBattle(); } catch (e) {}
            // show battle UI
            try { setBattleVisibility(true); } catch (e) {}
        } else {
            // Hide the VS badge and battle cards when not on the battle tab
            try { setBattleVisibility(false); } catch (e) { try { if (vsEl) vsEl.style.display = 'none'; } catch (ee) {} }
        }

        if (tabName === 'ranking') {
            updateRanking();
        } else if (tabName === 'history') {
            displayHistory();
        } else if (tabName === 'achievements') {
            console.log('Switching to achievements tab');
            const achievementsTab = document.getElementById('achievements-tab');
            console.log('Achievements tab element:', achievementsTab);
            console.log('Achievements tab has active class:', achievementsTab ? achievementsTab.classList.contains('active') : 'element not found');
            updateAchievementsTab();
        }
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

            // Apply active filter when a coaster is selected
            if (hasSelected && typeof historyFilter !== 'undefined' && historyFilter && historyFilter !== 'all') {
                const selectedName = query;
                if (historyFilter === 'wins') {
                    // only show battles where selectedName is the winner
                    if (winner !== selectedName) return '';
                } else if (historyFilter === 'losses') {
                    // only show battles where selectedName lost
                    if (winner === selectedName) return '';
                    if (a !== selectedName && b !== selectedName) return '';
                } else if (historyFilter === 'close') {
                    if (!entry.closeFight) return '';
                    if (a !== selectedName && b !== selectedName) return '';
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

    let selectedAutocompleteIndex = -1;
    // History filter state: 'all' | 'wins' | 'losses' | 'close'
    let historyFilter = 'all';

    function setHistoryFilter(filter) {
        if (!filter) return;
        historyFilter = filter;
        // update active class on buttons
        const btns = document.querySelectorAll('#historyFilters .filter-btn');
        btns.forEach(b => {
            const f = b.getAttribute('data-filter');
            if (f === filter) b.classList.add('active'); else b.classList.remove('active');
        });
        // refresh displayed history
        displayHistory();
    }

    function updateHistoryFilterUI() {
        const input = document.getElementById('historySearch');
        const has = input && input.value && input.value.trim() !== '';
        const historyFilters = document.getElementById('historyFilters');
        if (!historyFilters) return;
        if (has) {
            document.body.classList.add('coaster-selected');
            historyFilters.setAttribute('aria-hidden', 'false');
        } else {
            document.body.classList.remove('coaster-selected');
            historyFilters.setAttribute('aria-hidden', 'true');
            // reset to 'all' visually when nothing selected
            historyFilter = 'all';
            const btns = historyFilters.querySelectorAll('.filter-btn');
            btns.forEach(b => { b.classList.remove('active'); });
            const first = historyFilters.querySelector('.filter-btn[data-filter="all"]');
            if (first) first.classList.add('active');
        }
    }

    function getHistoryAutocompleteSuggestions() {
        const coasterNames = new Set();
        Object.keys(coasterStats).forEach(name => coasterNames.add(name));
        return Array.from(coasterNames).sort();
    }

    function handleHistorySearchInput() {
        const input = document.getElementById('historySearch');
        const clearBtn = document.getElementById('clearHistorySearchBtn');
        clearBtn.style.display = input.value.trim() ? 'block' : 'none';
        showHistoryAutocomplete();
        updateHistoryFilterUI();
    }

    function clearHistorySearch() {
        const input = document.getElementById('historySearch');
        const clearBtn = document.getElementById('clearHistorySearchBtn');
        input.value = '';
        clearBtn.style.display = 'none';
        const dropdown = document.getElementById('historyAutocomplete');
        dropdown.classList.remove('show');
        displayHistory();
        updateHistoryFilterUI();
    }

    function showHistoryAutocomplete() {
        const input = document.getElementById('historySearch');
        const dropdown = document.getElementById('historyAutocomplete');
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
            `<div class="autocomplete-item" data-index="${idx}" onclick="selectHistorySuggestion('${name.replace(/'/g, "\\'")}')">${escapeHtml(name)}</div>`
        ).join('');
        
        dropdown.classList.add('show');
        selectedAutocompleteIndex = -1;
    }

    function selectHistorySuggestion(name) {
        const input = document.getElementById('historySearch');
        const clearBtn = document.getElementById('clearHistorySearchBtn');
        input.value = name;
        clearBtn.style.display = 'block';
        document.getElementById('historyAutocomplete').classList.remove('show');
        displayHistory();
        updateHistoryFilterUI();
    }

    function handleHistorySearchKeydown(event) {
        const dropdown = document.getElementById('historyAutocomplete');
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
        const dropdown = document.getElementById('historyAutocomplete');
        const input = document.getElementById('historySearch');
        if (dropdown && input && !input.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
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
        // show toast confirming deletion
        try {
            showToast(`Removed: ${removed.a} ↔ ${removed.b}`);
        } catch (e) {}
    }

    // switch the winner in a history entry
    function switchHistoryWinner(index) {
        if (typeof index !== 'number' || index < 0 || index >= coasterHistory.length) return;

        const entry = coasterHistory[index];
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
        
        // Update ELO ratings by reversing the previous outcome
        const winnerStats = coasterStats[oldWinner];
        const loserStats = coasterStats[newWinner];
        
        if (winnerStats && loserStats && entry.statsA && entry.statsB) {
            console.log('Current ELO before restoration:', {
                [oldWinner]: winnerStats.elo,
                [newWinner]: loserStats.elo
            });
            
            // Restore ELO to BEFORE this battle happened (to avoid compounding errors)
            const aStats = coasterStats[entry.a];
            const bStats = coasterStats[entry.b];
            
            if (aStats && bStats) {
                aStats.elo = entry.statsA.eloBefore;
                bStats.elo = entry.statsB.eloBefore;
                
                console.log('Restored ELO to pre-battle state:', {
                    [entry.a]: aStats.elo,
                    [entry.b]: bStats.elo
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
            
            // Now recalculate ELO from the original before-battle state with new winner
            const newWinnerStats = coasterStats[newWinner];
            const oldWinnerStats = coasterStats[oldWinner];
            
            const eloOutcome = calculateEloAdaptiveFromStats(newWinnerStats, oldWinnerStats);
            const { newWinnerElo, newLoserElo, K } = eloOutcome;
            
            console.log('Recalculated ELO:', {
                kFactor: K,
                [newWinner]: `${newWinnerStats.elo} → ${newWinnerElo}`,
                [oldWinner]: `${oldWinnerStats.elo} → ${newLoserElo}`
            });
            
            newWinnerStats.elo = newWinnerElo;
            oldWinnerStats.elo = newLoserElo;
            
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
                    entry.statsA.eloAfter = newWinnerStats.elo;
                    entry.statsA.rankAfter = newWinnerRankAfter;
                    // Swap: A's new potentialGain/Loss comes from B's old values
                    entry.statsA.potentialGain = origStatsB.potentialGain;
                    entry.statsA.potentialLoss = origStatsB.potentialLoss;
                    
                    entry.statsB.eloAfter = oldWinnerStats.elo;
                    entry.statsB.rankAfter = oldWinnerRankAfter;
                    // Swap: B's new potentialGain/Loss comes from A's old values
                    entry.statsB.potentialGain = origStatsA.potentialGain;
                    entry.statsB.potentialLoss = origStatsA.potentialLoss;
                } else {
                    // B is now winner, A is now loser
                    entry.statsB.eloAfter = newWinnerStats.elo;
                    entry.statsB.rankAfter = newWinnerRankAfter;
                    // Swap: B's new potentialGain/Loss comes from A's old values
                    entry.statsB.potentialGain = origStatsA.potentialGain;
                    entry.statsB.potentialLoss = origStatsA.potentialLoss;
                    
                    entry.statsA.eloAfter = oldWinnerStats.elo;
                    entry.statsA.rankAfter = oldWinnerRankAfter;
                    // Swap: A's new potentialGain/Loss comes from B's old values
                    entry.statsA.potentialGain = origStatsB.potentialGain;
                    entry.statsA.potentialLoss = origStatsB.potentialLoss;
                }
                
                console.log('Updated battle stats:', {
                    statsA: {
                        name: entry.a,
                        eloAfter: entry.statsA.eloAfter,
                        rankAfter: entry.statsA.rankAfter,
                        potentialGain: entry.statsA.potentialGain,
                        potentialLoss: entry.statsA.potentialLoss
                    },
                    statsB: {
                        name: entry.b,
                        eloAfter: entry.statsB.eloAfter,
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
            alert('Select a user first!');
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
                
                // Step A: Restore ELO to BEFORE this battle by reversing the old outcome
                // Get the old potential gains/losses from stored stats
                const winnerOldPotentialGain = entry.statsA && entry.a === winner ? entry.statsA.potentialGain : 
                                              entry.statsB && entry.b === winner ? entry.statsB.potentialGain : 0;
                const loserOldPotentialLoss = entry.statsA && entry.a === loser ? entry.statsA.potentialLoss : 
                                              entry.statsB && entry.b === loser ? entry.statsB.potentialLoss : 0;
                
                // Reverse the old ELO changes to get eloBefore
                const winnerEloBefore = winnerStats.elo - winnerOldPotentialGain;
                const loserEloBefore = loserStats.elo - loserOldPotentialLoss;
                
                // Get current battle counts (this represents how many battles they had BEFORE this one)
                const winnerBattlesBefore = entry.statsA && entry.a === winner ? entry.statsA.totalBattlesBefore : 
                                           entry.statsB && entry.b === winner ? entry.statsB.totalBattlesBefore : 
                                           winnerStats.battles - 1;
                const loserBattlesBefore = entry.statsA && entry.a === loser ? entry.statsA.totalBattlesBefore : 
                                          entry.statsB && entry.b === loser ? entry.statsB.totalBattlesBefore : 
                                          loserStats.battles - 1;
                
                // Calculate K-factors based on battles at that time
                const winnerK = computeAdaptiveK(winnerBattlesBefore);
                const loserK = computeAdaptiveK(loserBattlesBefore);
                const K = Math.max(winnerK, loserK);
                
                // Calculate expected probabilities with the restored eloBefore values
                const expectedWinner = 1 / (1 + Math.pow(10, (loserEloBefore - winnerEloBefore) / 400));
                const expectedLoser = 1 - expectedWinner;
                
                // Calculate new ELO with current K-factors
                const newWinnerElo = winnerEloBefore + K * (1 - expectedWinner);
                const newLoserElo = loserEloBefore + K * (0 - expectedLoser);
                
                // Apply new ELO
                winnerStats.elo = newWinnerElo;
                loserStats.elo = newLoserElo;
                
                // Update the global ELO state for subsequent battles
                // This ensures the next battle uses the recalculated values
                
                // Get new ranks
                const winnerRankAfter = getCoasterRank(winner);
                const loserRankAfter = getCoasterRank(loser);
                
                // Calculate potential gains/losses (needed for logging and stats update)
                const winnerPotentialGain = newWinnerElo - winnerEloBefore;
                const loserPotentialLoss = newLoserElo - loserEloBefore;
                
                // Calculate what would have happened if outcome was reversed
                const loserIfWinElo = loserEloBefore + K * (1 - expectedLoser);
                const winnerIfLoseElo = winnerEloBefore + K * (0 - expectedWinner);
                const loserPotentialGain = loserIfWinElo - loserEloBefore;
                const winnerPotentialLoss = winnerIfLoseElo - winnerEloBefore;
                
                // Update battle stats in history if they exist
                if (entry.statsA && entry.statsB) {
                    const isAWinner = (entry.a === winner);
                    
                    // Update eloBefore with the restored values
                    entry.statsA.eloBefore = (entry.a === winner) ? winnerEloBefore : loserEloBefore;
                    entry.statsB.eloBefore = (entry.b === winner) ? winnerEloBefore : loserEloBefore;
                    
                    // Update eloAfter with recalculated values
                    entry.statsA.eloAfter = (entry.a === winner) ? newWinnerElo : newLoserElo;
                    entry.statsB.eloAfter = (entry.b === winner) ? newWinnerElo : newLoserElo;
                    
                    // Update K-factor
                    entry.statsA.kFactor = K;
                    entry.statsB.kFactor = K;
                    
                    // Update ranks
                    entry.statsA.rankAfter = (entry.a === winner) ? winnerRankAfter : loserRankAfter;
                    entry.statsB.rankAfter = (entry.b === winner) ? winnerRankAfter : loserRankAfter;
                    
                    // Store potential gains/losses
                    entry.statsA.potentialGain = (entry.a === winner) ? winnerPotentialGain : loserPotentialGain;
                    entry.statsA.potentialLoss = (entry.a === winner) ? winnerPotentialLoss : loserPotentialLoss;
                    entry.statsB.potentialGain = (entry.b === winner) ? winnerPotentialGain : loserPotentialGain;
                    entry.statsB.potentialLoss = (entry.b === winner) ? winnerPotentialLoss : loserPotentialLoss;
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
            document.getElementById('rankingBody').innerHTML = '<tr><td colspan="8" class="no-battles">Select a user first! 🎢</td></tr>';
            return;
        }
        
        const statsArray = Object.values(coasterStats);
        const totalCoasters = statsArray.length;
        const totalBattles = totalBattlesCount;
        const avgBattles = totalBattles > 0 ? (totalBattles * 2 / totalCoasters).toFixed(1) : 0;
        
        // Calculate progression
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
                case 'elo':
                    aVal = displayedElo(a);
                    bVal = displayedElo(b);
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
                    aVal = a.elo;
                    bVal = b.elo;
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
        
        const activeHeader = Array.from(document.querySelectorAll('.ranking-table th'))
            .find(th => th.textContent.toLowerCase().includes(currentSort.column) || 
                        (currentSort.column === 'elo' && th.textContent.includes('ELO')));
        
        if (activeHeader) {
            const text = activeHeader.textContent.replace(' ⬆️', '').replace(' ⬇️', '');
            activeHeader.textContent = text + (currentSort.ascending ? ' ⬆️' : ' ⬇️');
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


        
        if (totalBattles === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-battles">Start met battlen om je ranking te zien! 🎢</td></tr>';
            rankingCardsContainer.innerHTML = '';
            return;
        }

        // Build table rows and mobile cards
        const rowsHtml = [];
        const cardsHtml = [];

        sorted.forEach((coaster, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            const winrate = coaster.battles > 0 ? ((coaster.wins / coaster.battles) * 100).toFixed(1) : '0.0';
            const escapedName = coaster.name.replace(/'/g, "\\'");

                const dataId = (coaster.name || '').replace(/"/g, '&quot;');
                rowsHtml.push(`
                    <tr data-id="${dataId}">
                        <td><span class="rank-medal">${medal}</span>${rank}</td>
                        <td><strong>${coaster.name}</strong></td>
                        <td>${coaster.park}</td>
                        <td>${coaster.manufacturer}</td>
                        <td><span class="elo-score">${Math.round(displayedElo(coaster))}</span></td>
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
                        <div class="meta">${coaster.park} • ${coaster.manufacturer} • <span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.wins}-${coaster.losses}</span></div>
                    </div>
                    <div class="ranking-right">
                            <div class="elo">${Math.round(displayedElo(coaster))}</div>
                        </div>
                </div>
            `);
        });

        tbody.innerHTML = rowsHtml.join('');
        rankingCardsContainer.innerHTML = cardsHtml.join('');
    }

    function filterRanking() {
        const searchTerm = document.getElementById('searchBox').value.toLowerCase();
        const rows = document.querySelectorAll('#rankingBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    function viewCoasterHistory(coasterName) {
        // Switch to history tab
        switchTab('history');
        
        // Set the search box value to the coaster name
        const historySearch = document.getElementById('historySearch');
        const clearBtn = document.getElementById('clearHistorySearchBtn');
        historySearch.value = coasterName;
        clearBtn.style.display = 'block';
        
        // Trigger the search/filter
        displayHistory();
        updateHistoryFilterUI();
    }

    function resetRankings() {
        if (!currentUser) return;
        
        if (confirm(`Are you sure you want to reset all data for ${currentUser === 'luca' ? 'Luca' : 'Wouter'}? This cannot be undone!`)) {
            if (confirm('Last warning! All battles and rankings will be deleted. Continue?')) {
                coasterStats = initializeStats();
                totalBattlesCount = 0;
                coasterHistory = [];
                completedPairs = new Set();
                
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
                displayBattle();
                updateRanking();
                updateAchievementsTab();
                alert('Alle data is gereset! 🔄');
            }
        }
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
        alert('Select a user first!');
        return;
    }
    
    if (Object.keys(coasterStats).length === 0) {
        alert('Geen ranking data om te downloaden.');
        return;
    }
    
    // Sort by ELO (same as default ranking view)
    const statsArray = Object.values(coasterStats);
    const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
    
    // Create CSV header
    let csv = 'Rank,Naam,Park,Fabrikant,ELO,Battles,Wins,Losses,Win%\n';
    
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
        
        csv += `${rank},${escapeCsv(coaster.name)},${escapeCsv(coaster.park)},${escapeCsv(coaster.manufacturer)},${Math.round(coaster.elo)},${coaster.battles},${coaster.wins},${coaster.losses},${winrate}\n`;
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
    const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
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
    
    // Always update achievements tab display (not just when new achievements)
    updateAchievementsTab();
}

// Render the achievements tab
function updateAchievementsTab() {
    console.log('updateAchievementsTab called');
    console.log('achievementManager exists:', typeof achievementManager !== 'undefined');
    
    if (typeof achievementManager === 'undefined') {
        console.warn('achievementManager is undefined');
        return;
    }
    
    const grid = document.getElementById('achievementsGrid');
    const progressText = document.getElementById('achievementProgress');
    const progressPercentage = document.getElementById('achievementPercentage');
    const progressBar = document.getElementById('achievementProgressBar');
    const tabCounter = document.getElementById('achievementCount');
    
    if (!grid) {
        console.warn('achievementsGrid element not found');
        return;
    }
    
    const achievements = achievementManager.getAllAchievements();
    const unlockedCount = achievementManager.getUnlockedCount();
    const totalCount = achievementManager.getTotalCount();
    const percentage = Math.round((unlockedCount / totalCount) * 100);
    
    console.log('Updating achievements tab:', { unlockedCount, totalCount, percentage });
    
    // Update progress indicators
    if (progressText) progressText.textContent = `${unlockedCount} / ${totalCount}`;
    if (progressPercentage) progressPercentage.textContent = `(${percentage}%)`;
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (tabCounter) tabCounter.textContent = `${unlockedCount}/${totalCount}`;
    
    // Render achievement cards
    grid.innerHTML = achievements.map(achievement => {
        const lockedClass = achievement.unlocked ? 'unlocked' : 'locked';
        const categoryClass = `category-${achievement.category || 'battles'}`;
        
        let dateHtml = '';
        if (achievement.unlocked && achievement.unlockedDate) {
            try {
                const date = new Date(achievement.unlockedDate);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                dateHtml = `<div class="achievement-date">Unlocked ${dateStr}</div>`;
            } catch (e) {
                // Ignore date formatting errors
            }
        }
        
        return `
            <div class="achievement-card ${lockedClass} ${categoryClass}" data-category="${achievement.category || 'battles'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
                ${dateHtml}
            </div>
        `;
    }).join('');
    
    console.log('Achievement cards rendered:', achievements.length);
}

// Filter achievements by category
function filterAchievements(category) {
    const grid = document.getElementById('achievementsGrid');
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
