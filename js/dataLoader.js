// Data Loader for Master Database + User Profiles
// This module replaces CSV parsing with JSON database loading

let masterDatabase = {};
let userProfiles = {};
let countriesData = {};
let parksData = {};

/**
 * Load master coaster database
 */
async function loadMasterDatabase() {
    try {
        const response = await fetch('database/data/coasters_master.json');
        if (!response.ok) {
            throw new Error(`Failed to load master database: ${response.status}`);
        }
        masterDatabase = await response.json();
        console.info(`✓ Loaded master database: ${Object.keys(masterDatabase).length} coasters`);
        return masterDatabase;
    } catch (error) {
        console.error('Error loading master database:', error);
        throw error;
    }
}

/**
 * Load countries data
 */
async function loadCountriesData() {
    try {
        const response = await fetch('database/data/countries.json');
        if (!response.ok) {
            throw new Error(`Failed to load countries data: ${response.status}`);
        }
        countriesData = await response.json();
        console.info(`✓ Loaded countries data: ${Object.keys(countriesData).length} countries`);
        return countriesData;
    } catch (error) {
        console.error('Error loading countries data:', error);
        throw error;
    }
}

/**
 * Load parks data
 */
async function loadParksData() {
    try {
        const response = await fetch('database/data/parks.json');
        if (!response.ok) {
            throw new Error(`Failed to load parks data: ${response.status}`);
        }
        parksData = await response.json();
        console.info(`✓ Loaded parks data: ${Object.keys(parksData).length} parks`);
        return parksData;
    } catch (error) {
        console.error('Error loading parks data:', error);
        throw error;
    }
}

/**
 * Load a user profile
 */
async function loadUserProfile(userId) {
    try {
        const response = await fetch(`database/profiles/${userId}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load profile for ${userId}: ${response.status}`);
        }
        const profile = await response.json();
        userProfiles[userId] = profile;
        console.info(`✓ Loaded profile for ${userId}: ${profile.coasters.length} coasters`);
        return profile;
    } catch (error) {
        console.error(`Error loading profile for ${userId}:`, error);
        throw error;
    }
}

/**
 * Get coaster data by ID from master database
 */
function getCoasterById(coasterId) {
    return masterDatabase[coasterId] || null;
}

/**
 * Get user's coaster list with full details from master database
 */
function getUserCoasters(userId) {
    const profile = userProfiles[userId];
    if (!profile) {
        console.warn(`No profile loaded for user: ${userId}`);
        return [];
    }

    return profile.coasters.map((entry, index) => {
        const masterData = getCoasterById(entry.coasterId);
        if (!masterData) {
            console.warn(`Coaster ${entry.coasterId} not found in master database`);
            return null;
        }

        return {
            // User-specific data
            rank: null,
            
            // Master database fields mapped to English property names
            id: entry.coasterId,
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
        };
    }).filter(c => c !== null); // Remove any coasters not found in master DB
}

/**
 * Initialize data loading
 */
async function initializeDatabase() {
    try {
        // Load master database first
        await loadMasterDatabase();
        
        // Load countries and parks data
        await Promise.all([
            loadCountriesData(),
            loadParksData()
        ]);
        
        // Load both user profiles
        await Promise.all([
            loadUserProfile('luca'),
            loadUserProfile('wouter')
        ]);
        
        console.info('✓ Database initialization complete');
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

/**
 * Set current user and return their coasters (uses global currentUser from script.js)
 */
function setCurrentUser(userId) {
    if (!userProfiles[userId]) {
        console.error(`User profile not loaded: ${userId}`);
        return [];
    }
    if (typeof window !== 'undefined' && window.currentUser !== undefined) {
        window.currentUser = userId;
    }
    return getUserCoasters(userId);
}

/**
 * Get stats for a user
 */
function getUserStats(userId) {
    const profile = userProfiles[userId];
    if (!profile) return null;

    const coasters = getUserCoasters(userId);
    const operational = coasters.filter(c => c.operational === 1).length;
    const total = coasters.length;

    return {
        total,
        operational,
        nonOperational: total - operational,
        username: profile.username
    };
}

/**
 * Build credits hierarchy: Continent → Country → Park → Coaster
 * Returns nested structure with counts for UI display
 */
function buildCreditsHierarchy() {
    const hierarchy = {};
    
    // Iterate through all coasters in master database
    for (const coasterId in masterDatabase) {
        const coaster = masterDatabase[coasterId];
        
        // Get continent from countries data
        const countryData = countriesData[coaster.country] || {};
        const continent = countryData.continent || 'Unknown';
        const country = coaster.country || 'Unknown';
        const park = coaster.park || 'Unknown';
        
        // Initialize continent if needed
        if (!hierarchy[continent]) {
            hierarchy[continent] = {
                name: continent,
                countries: {},
                coasterCount: 0
            };
        }
        
        // Initialize country if needed
        if (!hierarchy[continent].countries[country]) {
            hierarchy[continent].countries[country] = {
                name: country,
                continent: continent,
                parks: {},
                coasterCount: 0
            };
        }
        
        // Initialize park if needed
        if (!hierarchy[continent].countries[country].parks[park]) {
            hierarchy[continent].countries[country].parks[park] = {
                name: park,
                country: country,
                coasters: [],
                coasterCount: 0
            };
        }
        
        // Add coaster to park
        hierarchy[continent].countries[country].parks[park].coasters.push({
            id: coasterId,
            name: coaster.name,
            operational: (typeof coaster.status === 'object' ? coaster.status.state === 'operating' : coaster.status === 'Operating') ? 1 : 0,
            manufacturer: coaster.manufacturer,
            speed: coaster.speed,
            height: coaster.height
        });
        
        // Increment counts
        hierarchy[continent].countries[country].parks[park].coasterCount++;
        hierarchy[continent].countries[country].coasterCount++;
        hierarchy[continent].coasterCount++;
    }
    
    // Sort everything alphabetically
    const sortedHierarchy = {};
    Object.keys(hierarchy).sort().forEach(continent => {
        sortedHierarchy[continent] = hierarchy[continent];
        
        const sortedCountries = {};
        Object.keys(hierarchy[continent].countries).sort().forEach(country => {
            sortedCountries[country] = hierarchy[continent].countries[country];
            
            const sortedParks = {};
            Object.keys(hierarchy[continent].countries[country].parks).sort().forEach(park => {
                const parkData = hierarchy[continent].countries[country].parks[park];
                // Sort coasters by name
                parkData.coasters.sort((a, b) => a.name.localeCompare(b.name));
                sortedParks[park] = parkData;
            });
            
            sortedCountries[country].parks = sortedParks;
        });
        
        sortedHierarchy[continent].countries = sortedCountries;
    });
    
    console.info('✓ Built credits hierarchy:', {
        continents: Object.keys(sortedHierarchy).length,
        totalCoasters: Object.values(sortedHierarchy).reduce((sum, c) => sum + c.coasterCount, 0)
    });
    
    return sortedHierarchy;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeDatabase,
        loadMasterDatabase,
        loadUserProfile,
        getCoasterById,
        getUserCoasters,
        setCurrentUser,
        getUserStats
    };
}
