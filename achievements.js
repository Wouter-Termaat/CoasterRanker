// ============================================
// ACHIEVEMENT SYSTEM
// ============================================

const ACHIEVEMENTS = {
    // Battle achievements
    firstBlood: {
        id: 'firstBlood',
        name: 'First Blood',
        description: 'Complete your first battle',
        icon: '🎯',
        category: 'battles',
        condition: (stats) => stats.totalBattles >= 1
    },
    warmingUp: {
        id: 'warmingUp',
        name: 'Warming Up',
        description: 'Complete 25 battles',
        icon: '🔥',
        category: 'battles',
        condition: (stats) => stats.totalBattles >= 25
    },
    committed: {
        id: 'committed',
        name: 'Committed',
        description: 'Complete 100 battles',
        icon: '💯',
        category: 'battles',
        condition: (stats) => stats.totalBattles >= 100
    },
    centuryClub: {
        id: 'centuryClub',
        name: 'Century Club',
        description: 'Complete 250 battles',
        icon: '⭐',
        category: 'battles',
        condition: (stats) => stats.totalBattles >= 250
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary Voter',
        description: 'Complete 500 battles',
        icon: '👑',
        category: 'battles',
        condition: (stats) => stats.totalBattles >= 500
    },
    thousandClub: {
        id: 'thousandClub',
        name: 'Thousand Club',
        description: 'Complete 1000 battles',
        icon: '🔥',
        category: 'battles',
        condition: (stats) => stats.totalBattles >= 1000
    },
    speedDemon: {
        id: 'speedDemon',
        name: 'Speed Demon',
        description: 'Complete 50 battles in one session',
        icon: '⚡',
        category: 'battles',
        condition: (stats) => stats.sessionBattles >= 50
    },
    marathonRunner: {
        id: 'marathonRunner',
        name: 'Marathon Runner',
        description: 'Complete 100 battles in one session',
        icon: '🏃',
        category: 'battles',
        condition: (stats) => stats.sessionBattles >= 100
    },
    
    // Close fights
    clashOfTitans: {
        id: 'clashOfTitans',
        name: 'Clash of Titans',
        description: 'Experience your first close fight',
        icon: '💥',
        category: 'close-fights',
        condition: (stats) => stats.closeFights >= 1
    },
    dramaQueen: {
        id: 'dramaQueen',
        name: 'Drama Queen',
        description: 'Experience 10 close fights',
        icon: '🎭',
        category: 'close-fights',
        condition: (stats) => stats.closeFights >= 10
    },
    arenaChampion: {
        id: 'arenaChampion',
        name: 'Arena Champion',
        description: 'Experience 25 close fights',
        icon: '🎪',
        category: 'close-fights',
        condition: (stats) => stats.closeFights >= 25
    },
    
    // Ranking
    balancedJudge: {
        id: 'balancedJudge',
        name: 'Balanced Judge',
        description: 'Have all coasters with at least 5 battles',
        icon: '⚖️',
        category: 'ranking',
        condition: (stats) => stats.allCoastersMinBattles >= 5
    },
    
    // Patterns
    leftHanded: {
        id: 'leftHanded',
        name: 'Left Handed',
        description: 'Pick the left card 7 times in a row',
        icon: '👈',
        category: 'patterns',
        condition: (stats) => stats.leftStreak >= 7
    },
    rightHanded: {
        id: 'rightHanded',
        name: 'Right Handed',
        description: 'Choose the right card 5 times in a row',
        icon: '👉',
        category: 'patterns',
        condition: (stats) => stats.rightStreak >= 5
    },
    alternatingPattern: {
        id: 'alternatingPattern',
        name: 'Indecisive',
        description: 'Alternate between left and right for 10 battles in a row',
        icon: '🔀',
        category: 'patterns',
        condition: (stats) => stats.alternatingStreak >= 10
    },
    
    // Collection
    worldTraveler: {
        id: 'worldTraveler',
        name: 'World Traveler',
        description: 'Have coasters from 10+ parks in battles',
        icon: '🌍',
        category: 'collection',
        condition: (stats) => stats.uniqueParks >= 10
    },
    manufacturerExpert: {
        id: 'manufacturerExpert',
        name: 'Manufacturer Expert',
        description: 'Have coasters from 10+ manufacturers in battles',
        icon: '🏭',
        category: 'collection',
        condition: (stats) => stats.uniqueManufacturers >= 10
    },
    perfectMatch: {
        id: 'perfectMatch',
        name: 'Perfect Match',
        description: 'Complete a battle where both coasters share the same park and manufacturer',
        icon: '🎪',
        category: 'collection',
        condition: (stats) => stats.perfectMatches >= 1
    },
    
    // Sibling Rivalries
    jorisShowdown: {
        id: 'jorisShowdown',
        name: 'Dragon Duel',
        description: 'Battle Joris en de Draak - Water vs Joris en de Draak - Vuur',
        icon: '🐉',
        category: 'siblings',
        condition: (stats) => stats.siblingBattles?.joris >= 1
    },
    winjasWar: {
        id: 'winjasWar',
        name: 'Winja\'s War',
        description: 'Battle Winja\'s Fear vs Winja\'s Force',
        icon: '🌪️',
        category: 'siblings',
        condition: (stats) => stats.siblingBattles?.winjas >= 1
    },
    maxMoritzMadness: {
        id: 'maxMoritzMadness',
        name: 'Max & Moritz Madness',
        description: 'Battle Max vs Moritz',
        icon: '👬',
        category: 'siblings',
        condition: (stats) => stats.siblingBattles?.maxMoritz >= 1
    },
    halsVolldampf: {
        id: 'halsVolldampf',
        name: 'Hals über Kopf Clash',
        description: 'Battle Hals-über-Kopf vs Volldampf',
        icon: '🎢',
        category: 'siblings',
        condition: (stats) => stats.siblingBattles?.halsVolldampf >= 1
    },
    redForceFamily: {
        id: 'redForceFamily',
        name: 'Red Force Family',
        description: 'Battle Red Force vs Junior Red Force',
        icon: '🔴',
        category: 'siblings',
        condition: (stats) => stats.siblingBattles?.redForce >= 1
    },
    taronRaik: {
        id: 'taronRaik',
        name: 'Taron vs Raik',
        description: 'Battle Taron vs Raik',
        icon: '⚔️',
        category: 'siblings',
        condition: (stats) => stats.siblingBattles?.taronRaik >= 1
    },
    yoyBattle: {
        id: 'yoyBattle',
        name: 'Yoy Showdown',
        description: 'Battle Yoy Thrill vs Yoy Chill',
        icon: '🎡',
        category: 'siblings',
        condition: (stats) => stats.siblingBattles?.yoy >= 1
    },
    
    // Special
    keyboardWarrior: {
        id: 'keyboardWarrior',
        name: 'Keyboard Warrior',
        description: 'Use arrow keys to vote in a battle',
        icon: '⌨️',
        category: 'special',
        condition: (stats) => stats.usedKeyboard >= 1
    },
    tabMaster: {
        id: 'tabMaster',
        name: 'Tab Master',
        description: 'Use number keys (1-4) to navigate tabs',
        icon: '🔢',
        category: 'special',
        condition: (stats) => stats.usedNumberKeys >= 1
    },
    consistentVoter: {
        id: 'consistentVoter',
        name: 'Consistent Voter',
        description: 'Vote daily for 3 days in a row',
        icon: '📅',
        category: 'special',
        condition: (stats) => stats.consecutiveDays >= 3
    }
};

// Achievement state manager
class AchievementManager {
    constructor() {
        this.unlockedAchievements = new Map(); // id -> { unlockedDate, achievementData }
        this.sessionBattles = 0;
        this.leftStreak = 0;
        this.rightStreak = 0;
        this.alternatingStreak = 0;
        this.lastCardPosition = null;
        this.closeFights = 0;
        this.perfectMatches = 0;
        this.lastBattleDate = null;
        this.consecutiveDays = 1;
        this.dailyBattleDates = new Set();
        this.siblingBattles = {};
        this.usedKeyboard = 0;
        this.usedNumberKeys = 0;
    }
    
    // Load unlocked achievements from localStorage
    load(username) {
        if (!username) return;
        const key = `achievements_${username}`;
        const statsKey = `achievementStats_${username}`;
        
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedAchievements = new Map(Object.entries(data));
            } else {
                this.unlockedAchievements = new Map();
            }
            
            // Load stats
            const savedStats = localStorage.getItem(statsKey);
            if (savedStats) {
                const stats = JSON.parse(savedStats);
                this.leftStreak = stats.leftStreak || 0;
                this.rightStreak = stats.rightStreak || 0;
                this.alternatingStreak = stats.alternatingStreak || 0;
                this.lastCardPosition = stats.lastCardPosition !== undefined ? stats.lastCardPosition : null;
                this.closeFights = stats.closeFights || 0;
                this.perfectMatches = stats.perfectMatches || 0;
                this.lastBattleDate = stats.lastBattleDate || null;
                this.consecutiveDays = stats.consecutiveDays || 1;
                this.dailyBattleDates = new Set(stats.dailyBattleDates || []);
                this.siblingBattles = stats.siblingBattles || {};
                this.usedKeyboard = stats.usedKeyboard || 0;
                this.usedNumberKeys = stats.usedNumberKeys || 0;
            }
        } catch (e) {
            console.error('Failed to load achievements:', e);
            this.unlockedAchievements = new Map();
        }
        
        this.sessionBattles = 0; // Reset session counter
    }
    
    // Save unlocked achievements
    save(username) {
        if (!username) return;
        const key = `achievements_${username}`;
        const statsKey = `achievementStats_${username}`;
        
        try {
            const data = Object.fromEntries(this.unlockedAchievements);
            localStorage.setItem(key, JSON.stringify(data));
            
            // Save stats
            const stats = {
                leftStreak: this.leftStreak,
                rightStreak: this.rightStreak,
                alternatingStreak: this.alternatingStreak,
                lastCardPosition: this.lastCardPosition,
                perfectMatches: this.perfectMatches,
                closeFights: this.closeFights,
                lastBattleDate: this.lastBattleDate,
                consecutiveDays: this.consecutiveDays,
                dailyBattleDates: [...this.dailyBattleDates],
                siblingBattles: this.siblingBattles,
                usedKeyboard: this.usedKeyboard,
                usedNumberKeys: this.usedNumberKeys
            };
            localStorage.setItem(statsKey, JSON.stringify(stats));
        } catch (e) {
            console.error('Failed to save achievements:', e);
        }
    }
    
    // Check achievements after a battle or action
    checkAchievements(gameStats, username) {
        const newUnlocks = [];
        
        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            // Skip if already unlocked
            if (this.unlockedAchievements.has(id)) continue;
            
            // Check condition
            try {
                if (achievement.condition(gameStats)) {
                    const unlockData = {
                        unlockedDate: new Date().toISOString(),
                        achievementData: { ...achievement }
                    };
                    this.unlockedAchievements.set(id, unlockData);
                    newUnlocks.push(achievement);
                }
            } catch (e) {
                console.error(`Error checking achievement ${id}:`, e);
            }
        }
        
        if (newUnlocks.length > 0) {
            this.save(username);
        }
        
        return newUnlocks;
    }
    
    // Get all achievements with unlock status
    getAllAchievements() {
        return Object.values(ACHIEVEMENTS).map(achievement => {
            const unlockData = this.unlockedAchievements.get(achievement.id);
            return {
                ...achievement,
                unlocked: !!unlockData,
                unlockedDate: unlockData ? unlockData.unlockedDate : null
            };
        });
    }
    
    // Get unlocked count
    getUnlockedCount() {
        return this.unlockedAchievements.size;
    }
    
    // Get total count
    getTotalCount() {
        return Object.keys(ACHIEVEMENTS).length;
    }
    
    // Record a battle outcome for achievement tracking
    recordBattle(cardPosition, perfectMatch, wasCloseFight, coasterA, coasterB) {
        this.sessionBattles++;
        
        // Track alternating pattern
        if (this.lastCardPosition !== null && this.lastCardPosition !== cardPosition) {
            this.alternatingStreak++;
        } else if (this.lastCardPosition === cardPosition) {
            this.alternatingStreak = 0;
        }
        this.lastCardPosition = cardPosition;
        
        // Track left/right streak
        if (cardPosition === 0) { // Left card chosen
            this.leftStreak++;
            this.rightStreak = 0;
        } else { // Right card chosen
            this.rightStreak++;
            this.leftStreak = 0;
        }
        
        // Track perfect matches (same park AND manufacturer)
        if (perfectMatch) {
            this.perfectMatches++;
        }
        
        // Track close fights
        if (wasCloseFight) {
            this.closeFights++;
        }
        
        // Track sibling battles
        if (coasterA && coasterB) {
            const siblings = [
                { key: 'joris', names: ['Joris en de Draak - Water', 'Joris en de Draak - Vuur'] },
                { key: 'winjas', names: ['Winja\'s Fear', 'Winja\'s Force'] },
                { key: 'maxMoritz', names: ['Max', 'Moritz'] },
                { key: 'halsVolldampf', names: ['Hals-über-Kopf', 'Volldampf'] },
                { key: 'redForce', names: ['Red Force', 'Junior Red Force'] },
                { key: 'taronRaik', names: ['Taron', 'Raik'] },
                { key: 'yoy', names: ['Yoy Thrill', 'Yoy Chill'] }
            ];
            
            for (const sibling of siblings) {
                const [name1, name2] = sibling.names;
                if ((coasterA === name1 && coasterB === name2) || (coasterA === name2 && coasterB === name1)) {
                    if (!this.siblingBattles[sibling.key]) {
                        this.siblingBattles[sibling.key] = 0;
                    }
                    this.siblingBattles[sibling.key]++;
                    break;
                }
            }
        }
        
        // Track consecutive days
        const today = new Date().toDateString();
        this.dailyBattleDates.add(today);
        
        if (this.lastBattleDate) {
            const lastDate = new Date(this.lastBattleDate);
            const todayDate = new Date();
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                this.consecutiveDays++;
            } else if (diffDays > 1) {
                this.consecutiveDays = 1;
            }
        }
        
        this.lastBattleDate = today;
    }
}

// Global achievement manager instance
const achievementManager = new AchievementManager();

// Toast notification for achievement unlock
function showAchievementToast(achievement) {
    // Remove any existing achievement toast
    const existing = document.querySelector('.achievement-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    
    const categoryClass = achievement.category || 'battles';
    toast.classList.add(`category-${categoryClass}`);
    
    toast.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-content">
            <div class="achievement-header">🎉 Achievement Unlocked!</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
    
    // Play sound effect (optional)
    try {
        playAchievementSound();
    } catch (e) {
        // Silent fail if sound doesn't work
    }
}

function playAchievementSound() {
    // Optional: Add achievement unlock sound
    // For now, we'll use a simple beep via Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        // Silent fail
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ACHIEVEMENTS, AchievementManager, achievementManager, showAchievementToast };
}
