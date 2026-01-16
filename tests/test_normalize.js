// Test manufacturer normalization
const manufacturerColors = {
    'B&M': '#DCDCDE',
    'Intamin': '#E9BFC0',
    'Vekoma': '#F5D2B9',
    'Mack': '#C4D3EA',
    'Gerstlauer': '#CAE0D2',
    'Maurer': '#DACFEB',
    'Unknown': '#DED7CC'
};

function normalizeManufacturer(manufacturer) {
    if (!manufacturer) return 'Unknown';
    
    const normalized = manufacturer
        .replace(/\s+GmbH.*$/i, '')
        .replace(/\s+Amusement Rides.*$/i, '')
        .replace(/\s+Rides.*$/i, '')
        .replace(/\s+Inc\.?.*$/i, '')
        .replace(/\s+Ltd\.?.*$/i, '')
        .replace(/\s+Limited.*$/i, '')
        .replace(/\s+Corporation.*$/i, '')
        .replace(/\s+Corp\.?.*$/i, '')
        .replace(/\s+Company.*$/i, '')
        .replace(/\s+Co\..*$/i, '')
        .replace(/\s+International.*$/i, '')
        .replace(/\s+Manufacturing.*$/i, '')
        .replace(/\s+Equipment.*$/i, '')
        .trim();
    
    if (manufacturerColors[manufacturer]) return manufacturer;
    if (manufacturerColors[normalized]) return normalized;
    
    return normalized || 'Unknown';
}

// Test cases
const tests = [
    'Gerstlauer Amusement Rides GmbH',
    'Mack Rides GmbH & Co KG',
    'Maurer Rides GmbH',
    'Intamin Amusement Rides',
    'Vekoma',
    'B&M',
    'Beijing Jiuhua Amusement Rides Manufacturing Co., Ltd.',
    'Custom Coasters International, Inc.'
];

console.log('\n✅ Testing manufacturer normalization:\n');
tests.forEach(test => {
    const result = normalizeManufacturer(test);
    const color = manufacturerColors[result] || manufacturerColors['Unknown'];
    const status = color !== manufacturerColors['Unknown'] ? '✓' : '?';
    console.log(`  ${status} ${test}`);
    console.log(`     → ${result} → ${color}\n`);
});
