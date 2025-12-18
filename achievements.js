// ============================================
// ACHIEVEMENT SYSTEM
// ============================================

const ACHIEVEMENTS = {
    // Battle-based achievements
    firstBlood: {
        id: 'firstBlood',
        name: 'First Blood',
        description: 'Complete your first battle',
        icon: '🎯',
        rarity: 'common',
        condition: (stats) => stats.totalBattles >= 1
    },
    warmingUp: {
        id: 'warmingUp',
        name: 'Warming Up',
        description: 'Complete 25 battles',
        icon: '🔥',
        rarity: 'common',
        condition: (stats) => stats.totalBattles >= 25
    },
    committed: {
        id: 'committed',
        name: 'Committed',
        description: 'Complete 100 battles',
        icon: '💯',
        rarity: 'uncommon',
        condition: (stats) => stats.totalBattles >= 100
    },
    centuryClub: {
        id: 'centuryClub',
        name: 'Century Club',
        description: 'Complete 250 battles',
        icon: '⭐',
        rarity: 'rare',
        condition: (stats) => stats.totalBattles >= 250
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary Voter',
        description: 'Complete 500 battles',
        icon: '👑',
        rarity: 'epic',
        condition: (stats) => stats.totalBattles >= 500
    },
    thousandClub: {
        id: 'thousandClub',
        name: 'Thousand Club',
        description: 'Complete 1000 battles',
        icon: '🔥',
        rarity: 'legendary',
        condition: (stats) => stats.totalBattles >= 1000
    },
    speedDemon: {
        id: 'speedDemon',
        name: 'Speed Demon',
        description: 'Complete 50 battles in one session',
        icon: '⚡',
        rarity: 'epic',
        condition: (stats) => stats.sessionBattles >= 50
    },
    marathonRunner: {
        id: 'marathonRunner',
        name: 'Marathon Runner',
        description: 'Complete 100 battles in one session',
        icon: '🏃',
        rarity: 'legendary',
        condition: (stats) => stats.sessionBattles >= 100
    },
    
    // Close fight achievements
    clashOfTitans: {
        id: 'clashOfTitans',
        name: 'Clash of Titans',
        description: 'Experience your first close fight',
        icon: '💥',
        rarity: 'uncommon',
        condition: (stats) => stats.closeFights >= 1
    },
    dramaQueen: {
        id: 'dramaQueen',
        name: 'Drama Queen',
        description: 'Experience 10 close fights',
        icon: '🎭',
        rarity: 'rare',
        condition: (stats) => stats.closeFights >= 10
    },
    arenaChampion: {
        id: 'arenaChampion',
        name: 'Arena Champion',
        description: 'Experience 25 close fights',
        icon: '🎪',
        rarity: 'epic',
        condition: (stats) => stats.closeFights >= 25
    },
    
    // Ranking achievements
    balancedJudge: {
        id: 'balancedJudge',
        name: 'Balanced Judge',
        description: 'Have all coasters with at least 5 battles',
        icon: '⚖️',
        rarity: 'epic',
        condition: (stats) => stats.allCoastersMinBattles >= 5
    },
    completionist: {
        id: 'completionist',
        name: 'Completionist',
        description: 'Complete all possible matchups',
        icon: '🏆',
        rarity: 'legendary',
        condition: (stats) => stats.allPairsCompleted
    },
    
    // Pattern achievements - card position streaks
    leftHanded: {
        id: 'leftHanded',
        name: 'Left Handed',
        description: 'Pick the left card 7 times in a row',
        icon: '👈',
        rarity: 'rare',
        condition: (stats) => stats.leftStreak >= 7
    },
    rightHanded: {
        id: 'rightHanded',
        name: 'Right Handed',
        description: 'Pick the right card 7 times in a row',
        icon: '👉',
        rarity: 'rare',
        condition: (stats) => stats.rightStreak >= 7
    },
    
    // Collection achievements
    worldTraveler: {
        id: 'worldTraveler',
        name: 'World Traveler',
        description: 'Have coasters from 10+ parks in battles',
        icon: '🌍',
        rarity: 'uncommon',
        condition: (stats) => stats.uniqueParks >= 10
    },
    manufacturerExpert: {
        id: 'manufacturerExpert',
        name: 'Manufacturer Expert',
        description: 'Have coasters from 10+ manufacturers in battles',
        icon: '🏭',
        rarity: 'uncommon',
        condition: (stats) => stats.uniqueManufacturers >= 10
    },
    perfectMatch: {
        id: 'perfectMatch',
        name: 'Perfect Match',
        description: 'Complete a battle where both coasters share the same park and manufacturer',
        icon: '🎪',
        rarity: 'rare',
        condition: (stats) => stats.perfectMatches >= 1
    },
    
    // Special achievements
    consistentVoter: {
        id: 'consistentVoter',
        name: 'Consistent Voter',
        description: 'Vote daily for 3 days in a row',
        icon: '📅',
        rarity: 'rare',
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
        this.closeFights = 0;
        this.perfectMatches = 0;
        this.lastBattleDate = null;
        this.consecutiveDays = 1;
        this.dailyBattleDates = new Set();
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
                this.closeFights = stats.closeFights || 0;
                this.perfectMatches = stats.perfectMatches || 0;
                this.lastBattleDate = stats.lastBattleDate || null;
                this.consecutiveDays = stats.consecutiveDays || 1;
                this.dailyBattleDates = new Set(stats.dailyBattleDates || []);
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
                perfectMatches: this.perfectMatches,
                closeFights: this.closeFights,
                lastBattleDate: this.lastBattleDate,
                consecutiveDays: this.consecutiveDays,
                dailyBattleDates: [...this.dailyBattleDates]
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
    recordBattle(cardPosition, perfectMatch, wasCloseFight) {
        this.sessionBattles++;
        
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
    
    const rarityClass = achievement.rarity || 'common';
    toast.classList.add(`rarity-${rarityClass}`);
    
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
