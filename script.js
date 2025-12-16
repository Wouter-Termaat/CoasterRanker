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
            
            console.log('Coaster data loaded successfully');
            console.log('Luca:', coastersDataLuca.length, 'coasters');
            console.log('Wouter:', coastersDataWouter.length, 'coasters');
            
            // Initialize the app after data is loaded
            initializeApp();
        } catch (error) {
            console.error('Error loading coaster data:', error);
            console.error('Error details:', error.message);
            
            // Show a more helpful error message
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:30px;border-radius:15px;box-shadow:0 10px 40px rgba(0,0,0,0.3);max-width:500px;text-align:center;z-index:10000;';
            errorDiv.innerHTML = `
                <h2 style="color:#e74c3c;margin-bottom:15px;">⚠️ Fout bij laden data</h2>
                <p style="margin-bottom:15px;">De achtbaan data kon niet worden geladen.</p>
                <p style="font-size:0.9em;color:#666;margin-bottom:20px;">
                    Controleer of je de pagina opent via een webserver (bijv. met Live Server in VS Code).
                    <br><br>
                    <strong>Foutmelding:</strong> ${error.message}
                </p>
                <button onclick="location.reload()" style="background:#3498db;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;">
                    Probeer opnieuw
                </button>
            `;
            document.body.appendChild(errorDiv);
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
    
    // Update header height on resize
    window.addEventListener('resize', () => {
        setHeaderHeight();
    }, { passive: true });

    // Start loading data when script loads
    loadCoasterData();

    // Global variables
    let currentUser = null;
    let coasters = [];
    let coasterStats = {};
    let totalBattlesCount = 0;
    let currentBattle = null;
    let isProcessingChoice = false;
    let currentSort = { column: 'elo', ascending: false };
    // History: stores past battles for current user
    let coasterHistory = [];
    // Stack for undoing deletions (LIFO)
    let deletedHistoryStack = [];
    const MAX_UNDO_STACK = 50;
    // Exploration boost: favor coasters with few battles
    const EXPLORATION_POWER = 1; // higher => stronger preference for low-battles
    // ELO-proximity: prefer opponents whose ELO is similar (more informative matches)
    let ELO_PROXIMITY_POWER = 1; // higher => stronger preference for similar ELO
    const ELO_DIFF_SCALE = 400; // scale (in ELO points) used to normalize differences
    // Pairing strategy: 'hybrid' recommended — picks one under-sampled coaster
    // then picks a second that is ELO-similar while still favoring under-sampled ones.
    // Other options: 'exploration' (both chosen by exploration weight), 'uniform'.
    let PAIRING_STRATEGY = 'hybrid';
    let pairingControlsHidden = false;
    // Track all completed pairs to prevent duplicates
    let completedPairs = new Set();

    // User management
    function switchUser(user) {
        currentUser = user;
        
        // Update UI
        document.querySelectorAll('.user-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('btn-' + user).classList.add('active');
        document.getElementById('currentUserBadge').textContent = `Ingelogd als: ${user === 'luca' ? 'Luca' : 'Wouter'}`;
        
        // Load user-specific data
        if (user === 'luca') {
            coasters = coastersDataLuca.filter(c => c.operatief === 1);
        } else {
            coasters = coastersDataWouter.filter(c => c.operatief === 1);
        }
        
        // Load or initialize stats
        loadUserData();
        
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
            const settings = { pairingStrategy: PAIRING_STRATEGY, eloProximityPower: ELO_PROXIMITY_POWER, pairingControlsHidden: pairingControlsHidden };
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
            if (s && typeof s.pairingStrategy === 'string') PAIRING_STRATEGY = s.pairingStrategy;
            if (s && typeof s.eloProximityPower === 'number') ELO_PROXIMITY_POWER = s.eloProximityPower;
            if (s && typeof s.pairingControlsHidden === 'boolean') pairingControlsHidden = s.pairingControlsHidden;
        } catch (e) {
            // ignore
        }
        applySettingsToUI();
    }

    function setPairingStrategy(val) {
        if (!val) return;
        PAIRING_STRATEGY = val;
        saveData();
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

    function applySettingsToUI() {
        // update segmented toggle buttons
        const opts = document.querySelectorAll('.pair-option');
        opts.forEach(btn => {
            try {
                const v = btn.getAttribute('data-value');
                if (v === PAIRING_STRATEGY) btn.classList.add('active'); else btn.classList.remove('active');
            } catch (e) {}
        });
        // update range and label
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

    // close on Escape
    document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeUserMenu();
    });

    // Floating help tooltip logic (delayed show, follows cursor)
    (function setupFloatingHelp(){
        const tooltip = document.createElement('div');
        tooltip.className = 'floating-help';
        document.body.appendChild(tooltip);

        let showTimer = null;
        let visible = false;

        function show(text, x, y) {
            tooltip.textContent = text;
            tooltip.style.left = x + 'px';
            tooltip.style.top = (y + 18) + 'px';
            tooltip.classList.add('show');
            visible = true;
        }

        function move(x, y) {
            tooltip.style.left = x + 'px';
            tooltip.style.top = (y + 18) + 'px';
        }

        function hide() {
            tooltip.classList.remove('show');
            visible = false;
            clearTimeout(showTimer);
            showTimer = null;
        }

        // attach handlers to pair-option buttons
        const buttons = document.querySelectorAll('.pair-option');
        buttons.forEach(btn => {
            let localTimer = null;
            const help = btn.getAttribute('data-help') || '';

            const onEnter = (ev) => {
                // start delayed show (1s)
                localTimer = setTimeout(() => {
                    show(help, ev.clientX, ev.clientY);
                }, 1000);
                btn._localTimer = localTimer;
            };

            const onMove = (ev) => {
                if (visible) move(ev.clientX, ev.clientY);
            };

            const onLeave = () => {
                if (btn._localTimer) { clearTimeout(btn._localTimer); btn._localTimer = null; }
                hide();
            };

            btn.addEventListener('mouseenter', onEnter);
            btn.addEventListener('mousemove', onMove);
            btn.addEventListener('mouseleave', onLeave);

            // also hide on click
            btn.addEventListener('click', () => { if (btn._localTimer) { clearTimeout(btn._localTimer); btn._localTimer = null; } hide(); });
        });

        // hide tooltip on scroll or resize
        window.addEventListener('scroll', hide, { passive: true });
        window.addEventListener('resize', hide);
    })();

    // utility to make an unordered pair key (same for [A,B] and [B,A])
    function pairKey(nameA, nameB) {
        return [nameA, nameB].sort().join('|||');
    }

    // helper: record a battle into history
    function recordBattle(a, b, winnerName, loserName) {
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
        coasterHistory.push(entry);
        
        // Mark this pair as completed
        completedPairs.add(key);

        // keep history bounded if you want (optional)
        const MAX_HISTORY_KEEP = 10000;
        if (coasterHistory.length > MAX_HISTORY_KEEP) coasterHistory.splice(0, coasterHistory.length - MAX_HISTORY_KEEP);

        saveData();
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

                // strategy implementations
                if (PAIRING_STRATEGY === 'uniform') {
                    // simple uniform sampling attempts avoiding recent
                    for (let t = 0; t < attempts; t++) {
                        const i = Math.floor(randomFn() * length);
                        let j = Math.floor(randomFn() * length);
                        if (length > 1) {
                            let guard = 0;
                            while (j === i && guard++ < 8) j = Math.floor(randomFn() * length);
                            if (j === i) j = (i + 1) % length;
                        }
                        const a = coasters[i], b = coasters[j];
                        const key = pairKey(a.naam, b.naam);
                        if (!recent.has(key)) return [a, b];
                    }
                } else if (PAIRING_STRATEGY === 'exploration') {
                    // both selected from exploration-weighted distribution
                    const indexFromExploration = () => sampleIndexFromWeights(weights, randomFn);
                    for (let t = 0; t < attempts; t++) {
                        const i = indexFromExploration();
                        let j = indexFromExploration();
                        if (length > 1) {
                            let guard = 0;
                            while (j === i && guard++ < 8) j = indexFromExploration();
                            if (j === i) j = (i + 1) % length;
                        }
                        const a = coasters[i], b = coasters[j];
                        const key = pairKey(a.naam, b.naam);
                        if (!completedPairs.has(key)) return [a, b];
                    }
                }

                // default/hybrid: pick one under-sampled coaster first, then a second biased by ELO-proximity
                // (still favors under-sampled ones via base weights)
                const indexFromExploration = () => sampleIndexFromWeights(weights, randomFn);
                for (let t = 0; t < attempts; t++) {
                    const i = indexFromExploration();

                    const eloI = (coasterStats && coasterStats[coasters[i].naam] && typeof coasterStats[coasters[i].naam].elo === 'number') ? coasterStats[coasters[i].naam].elo : 1500;
                    const condWeights = new Array(length);
                    for (let k = 0; k < length; k++) {
                        if (k === i) { condWeights[k] = 0; continue; }
                        const nameK = coasters[k].naam;
                        const eloK = (coasterStats && coasterStats[nameK] && typeof coasterStats[nameK].elo === 'number') ? coasterStats[nameK].elo : 1500;
                        const diff = Math.abs(eloI - eloK) / ELO_DIFF_SCALE; // normalized diff
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

    function displayBattle() {
        if (!currentUser) {
            document.getElementById('battleContainer').innerHTML = '<div class="no-battles">Selecteer eerst een gebruiker hierboven! 👆</div>';
            return;
        }
        
        currentBattle = getRandomCoasters();
        const battleContainer = document.getElementById('battleContainer');
        
        // Check if no more pairs available
        if (!currentBattle || currentBattle.length === 0) {
            battleContainer.innerHTML = '<div class="no-battles">🎉 Gefeliciteerd!<br><br>Je hebt alle mogelijke matchups voltooid!<br><br>Check de ranking tab om je definitieve lijst te zien.</div>';
            return;
        }
        
        // Get current rankings for both coasters
        const getRanking = (coasterName) => {
            const statsArray = Object.values(coasterStats);
            const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
            const rank = sorted.findIndex(c => c.name === coasterName) + 1;
            return rank;
        };
        
        const rank1 = getRanking(currentBattle[0].naam);
        const rank2 = getRanking(currentBattle[1].naam);
        
        battleContainer.innerHTML = `
            <div class="coaster-card left-card" onclick="chooseWinner(0)">
                <div class="coaster-image">IMG</div>
                <div class="coaster-rank-badge">${rank1}</div>
                <div class="coaster-content">
                    <div class="coaster-name">${currentBattle[0].naam}</div>
                    <div class="coaster-subtitle">
                        <span>${currentBattle[0].park}</span>
                        <span class="separator">•</span>
                        <span>${currentBattle[0].fabrikant}</span>
                    </div>
                </div>
            </div>
            
            <div class="coaster-card right-card" onclick="chooseWinner(1)">
                <div class="coaster-image">IMG</div>
                <div class="coaster-rank-badge">${rank2}</div>
                <div class="coaster-content">
                    <div class="coaster-name">${currentBattle[1].naam}</div>
                    <div class="coaster-subtitle">
                        <span>${currentBattle[1].park}</span>
                        <span class="separator">•</span>
                        <span>${currentBattle[1].fabrikant}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function chooseWinner(index) {
        if (!currentUser) return;
        if (isProcessingChoice) return; // Prevent double-clicking
        
        isProcessingChoice = true; // Lock to prevent multiple submissions
        
        const winner = currentBattle[index];
        const loser = currentBattle[1 - index];
        
        // Get ranking BEFORE the battle
        const getRanking = (coasterName) => {
            const statsArray = Object.values(coasterStats);
            const sorted = [...statsArray].sort((a, b) => b.elo - a.elo);
            const rank = sorted.findIndex(c => c.name === coasterName) + 1;
            return rank;
        };
        
        const oldRank = getRanking(winner.naam);
        
        // Get current ELO ratings
        const winnerStats = coasterStats[winner.naam];
        const loserStats = coasterStats[loser.naam];
        
        // Calculate new ELO ratings
        const { newWinnerElo, newLoserElo } = calculateElo(winnerStats.elo, loserStats.elo);
        
        // Update stats
        winnerStats.elo = newWinnerElo;
        winnerStats.battles++;
        winnerStats.wins++;
        
        loserStats.elo = newLoserElo;
        loserStats.battles++;
        loserStats.losses++;
        
        totalBattlesCount++;
        
        // Get ranking AFTER the battle
        const newRank = getRanking(winner.naam);
        const rankChange = oldRank - newRank; // positive = climbed
        
        // record to history before saving (pass in battle order: left=index 0, right=index 1)
        recordBattle(currentBattle[0], currentBattle[1], winner.naam, loser.naam);

        // Save to localStorage (now also saves history)
        saveData();
        
        // Visual feedback
        const cards = document.querySelectorAll('.coaster-card');
        cards[index].classList.add('winner');
        cards[1 - index].classList.add('loser');
        
        // Show rank climb animation if winner climbed in ranking
        if (rankChange > 0) {
            const badge = document.createElement('div');
            badge.className = 'rank-change-badge';
            badge.innerHTML = `
                <span class="arrow">↑</span>
                <span>+${rankChange}</span>
            `;
            cards[index].style.position = 'relative';
            cards[index].appendChild(badge);
            
            // Remove badge after animation completes
            setTimeout(() => {
                if (badge.parentElement) {
                    badge.remove();
                }
            }, 4000);
        }
        
        // Load next battle after longer delay to show animations
        setTimeout(() => {
            displayBattle();
            isProcessingChoice = false; // Unlock for next battle
        }, 1500);
    }

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        if (!currentUser) return;
        
        const battleTab = document.getElementById('battle-tab');
        if (!battleTab.classList.contains('active')) return;
        
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            chooseWinner(0);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
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

    // Check if hint was previously dismissed
    window.addEventListener('DOMContentLoaded', () => {
        const dismissed = localStorage.getItem('keyboardHintDismissed');
        if (dismissed === 'true') {
            const hint = document.getElementById('keyboardHint');
            if (hint) hint.classList.add('hidden');
        }
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
        try { event.target.classList.add('active'); } catch (e) {}
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + '-tab').classList.add('active');
        
        if (tabName === 'ranking') {
            updateRanking();
        } else if (tabName === 'history') {
            displayHistory();
        }
    }

    // Render the history in the history tab
    function displayHistory() {
        const container = document.getElementById('historyContainer');
        if (!container) return;
        if (!coasterHistory || coasterHistory.length === 0) {
            container.innerHTML = '<div class="no-battles">Nog geen battles — start met kiezen om history op te bouwen.</div>';
            return;
        }

        const query = document.getElementById('historySearch') ? document.getElementById('historySearch').value.trim().toLowerCase() : '';

        // Render only pair, highlight winner with a green pill and add a subtle delete button
        const rows = coasterHistory.slice().reverse().map((entry, idx) => {
            const originalIndex = coasterHistory.length - 1 - idx;
            // Use stored left/right positions if available, otherwise fall back to a/b
            let a = entry.left || entry.a;
            let b = entry.right || entry.b;
            const winner = entry.winner;

            const pairText = `${a} ↔ ${b}`;
            if (query && !pairText.toLowerCase().includes(query) && !a.toLowerCase().includes(query) && !b.toLowerCase().includes(query)) {
                return '';
            }

            // If there's a search query, put the matching coaster on the left
            if (query) {
                const aMatches = a.toLowerCase().includes(query);
                const bMatches = b.toLowerCase().includes(query);
                
                // If only b matches, swap them
                if (!aMatches && bMatches) {
                    [a, b] = [b, a];
                }
            }

            const aHtml = (winner === a) ? `<span class="clickable-history-name" onclick="viewCoasterHistory('${a.replace(/'/g, "\\'")}')" style="cursor:pointer;"><span class="winner-pill">${escapeHtml(a)}</span></span>` : `<span class="clickable-history-name" onclick="viewCoasterHistory('${a.replace(/'/g, "\\'")}')" style="cursor:pointer;">${escapeHtml(a)}</span>`;
            const bHtml = (winner === b) ? `<span class="clickable-history-name" onclick="viewCoasterHistory('${b.replace(/'/g, "\\'")}')" style="cursor:pointer;"><span class="winner-pill">${escapeHtml(b)}</span></span>` : `<span class="clickable-history-name" onclick="viewCoasterHistory('${b.replace(/'/g, "\\'")}')" style="cursor:pointer;">${escapeHtml(b)}</span>`;

            return `
                <div class="history-row">
                    <div class="history-pair"><strong>${aHtml}</strong><span>↔</span><strong>${bHtml}</strong></div>
                    <div style="flex:0 0 auto;">
                        <button class="history-switch" title="Wissel winnaar" onclick="switchHistoryWinner(${originalIndex})">⇄</button>
                        <button class="history-delete" title="Verwijder deze matchup" onclick="deleteHistoryEntry(${originalIndex})">✖</button>
                    </div>
                </div>
            `;
        }).join('');

        // If filtering removed all rows, show empty state
        if (!rows || rows.trim() === '') {
            container.innerHTML = '<div class="no-battles">Geen matchups gevonden voor deze zoekopdracht.</div>';
        } else {
            container.innerHTML = rows;
        }
    }

    let selectedAutocompleteIndex = -1;

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
    }

    function clearHistorySearch() {
        const input = document.getElementById('historySearch');
        const clearBtn = document.getElementById('clearHistorySearchBtn');
        input.value = '';
        clearBtn.style.display = 'none';
        const dropdown = document.getElementById('historyAutocomplete');
        dropdown.classList.remove('show');
        displayHistory();
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
            showToast(`Verwijderd: ${removed.a} ↔ ${removed.b}`);
        } catch (e) {}
    }

    // switch the winner in a history entry
    function switchHistoryWinner(index) {
        if (typeof index !== 'number' || index < 0 || index >= coasterHistory.length) return;

        const entry = coasterHistory[index];
        const oldWinner = entry.winner;
        const newWinner = (entry.winner === entry.a) ? entry.b : entry.a;
        const oldLoser = (entry.winner === entry.a) ? entry.b : entry.a;
        
        // Update the winner in the history entry
        entry.winner = newWinner;
        
        // Update ELO ratings by reversing the previous outcome
        // First, reverse the old result
        const winnerStats = coasterStats[oldWinner];
        const loserStats = coasterStats[oldLoser];
        
        if (winnerStats && loserStats) {
            // Reverse old outcome
            winnerStats.wins--;
            loserStats.losses--;
            
            // Apply new outcome
            loserStats.wins++;
            winnerStats.losses++;
            
            // Recalculate ELO (swap who won)
            const { newWinnerElo, newLoserElo } = calculateElo(loserStats.elo, winnerStats.elo);
            loserStats.elo = newWinnerElo;
            winnerStats.elo = newLoserElo;
        }
        
        saveData();
        displayHistory();
        updateRanking();
        
        showToast(`Winnaar gewisseld: ${newWinner} wint nu van ${oldLoser}`);
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
            document.getElementById('rankingBody').innerHTML = '<tr><td colspan="9" class="no-battles">Selecteer eerst een gebruiker! 🎢</td></tr>';
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
                    aVal = a.elo;
                    bVal = b.elo;
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
            tbody.innerHTML = '<tr><td colspan="9" class="no-battles">Start met battlen om je ranking te zien! 🎢</td></tr>';
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

            rowsHtml.push(`
                <tr>
                    <td><span class="rank-medal">${medal}</span>${rank}</td>
                    <td><strong>${coaster.name}</strong></td>
                    <td>${coaster.park}</td>
                    <td>${coaster.manufacturer}</td>
                    <td><span class="elo-score">${Math.round(coaster.elo)}</span></td>
                    <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.battles}</span></td>
                    <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.wins}</span></td>
                    <td><span class="clickable-stat" onclick="viewCoasterHistory('${escapedName}')" title="View battle history">${coaster.losses}</span></td>
                    <td>${winrate}%</td>
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
                        <div class="elo">${Math.round(coaster.elo)}</div>
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
    }

    function resetRankings() {
        if (!currentUser) return;
        
        if (confirm(`Weet je zeker dat je alle data voor ${currentUser === 'luca' ? 'Luca' : 'Wouter'} wilt resetten? Dit kan niet ongedaan worden gemaakt!`)) {
            if (confirm('Laatste waarschuwing! Alle battles en rankings worden gewist. Doorgaan?')) {
                coasterStats = initializeStats();
                totalBattlesCount = 0;
                coasterHistory = [];
                completedPairs = new Set();
                saveData();
                displayBattle();
                updateRanking();
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
        alert('Selecteer eerst een gebruiker!');
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
    
    showToast('✅ CSV gedownload!');
}