import json
import requests
from collections import defaultdict
import os

print("=" * 60)
print("COASTER MASTER DATABASE GENERATOR")
print("=" * 60)

# Download RCDB data
print("\n[1/6] Downloading RCDB database...")
response = requests.get("https://raw.githubusercontent.com/fabianrguez/rcdb-api/main/db/coasters.json")
rcdb_data = response.json()
print(f"✓ Loaded {len(rcdb_data)} coasters from RCDB")

# ITU-T E.164 country calling codes mapping
country_codes = {
    'United States': '001',
    'Canada': '001',
    'Mexico': '052',
    'United Kingdom': '044',
    'England': '044',
    'Scotland': '044',
    'Wales': '044',
    'Northern Ireland': '044',
    'Germany': '049',
    'France': '033',
    'Italy': '039',
    'Spain': '034',
    'Catalonia': '034',  # Part of Spain
    'Basque Country': '034',  # Part of Spain
    'Andalusia': '034',  # Part of Spain
    'Valencia': '034',  # Part of Spain
    'Galicia': '034',  # Part of Spain
    'Aragon': '034',  # Part of Spain
    'Navarre': '034',  # Part of Spain
    'Canary Islands': '034',  # Part of Spain
    'Netherlands': '031',
    'Belgium': '032',
    'Flemish Region': '032',  # Part of Belgium
    'Walloon Region': '032',  # Part of Belgium
    'Brussels': '032',  # Part of Belgium
    'Switzerland': '041',
    'Austria': '043',
    'Poland': '048',
    'Sweden': '046',
    'Norway': '047',
    'Denmark': '045',
    'Finland': '358',
    'Portugal': '351',
    'Greece': '030',
    'Turkey': '090',
    'Russia': '007',
    'China': '086',
    'Japan': '081',
    'South Korea': '082',
    'Australia': '061',
    'New Zealand': '064',
    'Brazil': '055',
    'Argentina': '054',
    'Chile': '056',
    'Colombia': '057',
    'Uruguay': '598',
    'Venezuela': '058',
    'Peru': '051',
    'Ecuador': '593',
    'Bolivia': '591',
    'Dominican Republic': '809',
    'Jamaica': '876',
    'Haiti': '509',
    'Trinidad and Tobago': '868',
    'Nicaragua': '505',
    'India': '091',
    'United Arab Emirates': '971',
    'Saudi Arabia': '966',
    'Egypt': '020',
    'South Africa': '027',
    'Kenya': '254',
    'Nigeria': '234',
    'Uganda': '256',
    'Tanzania': '255',
    'Sudan': '249',
    'Madagascar': '261',
    'Zambia': '260',
    'Botswana': '267',
    'Senegal': '221',
    'Côte d\'Ivoire': '225',
    'Indonesia': '062',
    'Malaysia': '060',
    'Thailand': '066',
    'Singapore': '065',
    'Philippines': '063',
    'Vietnam': '084',
    'Myanmar': '095',
    'Brunei': '673',
    'Israel': '972',
    'Iran': '098',
    'Iraq': '964',
    'Pakistan': '092',
    'Bangladesh': '880',
    'Nepal': '977',
    'Sri Lanka': '094',
    'Palestine': '970',
    'Yemen': '967',
    'Syria': '963',
    'Taiwan': '886',
    'Afghanistan': '093',
    'Albania': '355',
    'Algeria': '213',
    'Andorra': '376',
    'Angola': '244',
    'Armenia': '374',
    'Azerbaijan': '994',
    'Bahrain': '973',
    'Belarus': '375',
    'Bosnia and Herzegovina': '387',
    'Brunei': '673',
    'Cambodia': '855',
    'Costa Rica': '506',
    'Cyprus': '357',
    'Georgia': '995',
    'Ghana': '233',
    'Guatemala': '502',
    'Guyana': '592',
    'Honduras': '504',
    'Hong Kong': '852',
    'Jordan': '962',
    'Kosovo': '383',
    'Kuwait': '965',
    'Kyrgyzstan': '996',
    'Laos': '856',
    'Lebanon': '961',
    'Libya': '218',
    'Macau': '853',
    'Maldives': '960',
    'Malta': '356',
    'Morocco': '212',
    'New Zealand': '064',
    'North Macedonia': '389',
    'Oman': '968',
    'Panama': '507',
    'Qatar': '974',
    'Rwanda': '250',
    'Tunisia': '216',
    'United Arab Emirates': '971',
    'Zimbabwe': '263',
    'Ireland': '353',
    'Czech Republic': '420',
    'Hungary': '036',
    'Romania': '040',
    'Bulgaria': '359',
    'Croatia': '385',
    'Serbia': '381',
    'Ukraine': '380',
    'Moldova': '373',
    'Montenegro': '382',
    'Estonia': '372',
    'Latvia': '371',
    'Lithuania': '370',
    'Iceland': '354',
    'Luxembourg': '352',
    'Slovakia': '421',
    'Slovenia': '386',
    'Kazakhstan': '007',
    'Uzbekistan': '998',
    'Turkmenistan': '993',
    'Tajikistan': '992',
    'Kyrgyzstan': '996',
    'Mongolia': '976',
    'Flemish Region': '032',  # Belgium
    'Wallonia': '032',  # Belgium
    'Catalonia': '034',  # Spain
    'Community of Madrid': '034',  # Spain
    'Bavaria': '049',  # Germany
    'Baden-Württemberg': '049',  # Germany
    'North Rhine-Westphalia': '049',  # Germany
    'Lower Saxony': '049',  # Germany
    'Saxony': '049',  # Germany
    'Schleswig-Holstein': '049',  # Germany
    'Hesse': '049',  # Germany
    'Berlin': '049',  # Germany
    'Guangdong': '086',  # China
    'Beijing': '086',  # China
    'Shanghai': '086',  # China
    'Zhejiang': '086',  # China
    'Jiangsu': '086',  # China
    'Sichuan': '086',  # China
    'Chongqing': '086',  # China
    'California': '001',  # USA
    'Florida': '001',  # USA
    'Texas': '001',  # USA
    'New York': '001',  # USA
    'Ohio': '001',  # USA
    'Pennsylvania': '001',  # USA
    'New Jersey': '001',  # USA
    'Illinois': '001',  # USA
    'Virginia': '001',  # USA
    'North Carolina': '001',  # USA
    'South Carolina': '001',  # USA
    'Georgia': '001',  # USA
    'Michigan': '001',  # USA
    'Indiana': '001',  # USA
    'Missouri': '001',  # USA
    'Wisconsin': '001',  # USA
    'Minnesota': '001',  # USA
    'Colorado': '001',  # USA
    'Arizona': '001',  # USA
    'Washington': '001',  # USA
    'Oregon': '001',  # USA
    'Massachusetts': '001',  # USA
    'Maryland': '001',  # USA
    'Tennessee': '001',  # USA
    'Kentucky': '001',  # USA
    'Louisiana': '001',  # USA
    'Oklahoma': '001',  # USA
    'Kansas': '001',  # USA
    'Iowa': '001',  # USA
    'Arkansas': '001',  # USA
    'Mississippi': '001',  # USA
    'Alabama': '001',  # USA
    'West Virginia': '001',  # USA
    'Idaho': '001',  # USA
    'Utah': '001',  # USA
    'Nevada': '001',  # USA
    'New Mexico': '001',  # USA
    'Montana': '001',  # USA
    'Wyoming': '001',  # USA
    'Nebraska': '001',  # USA
    'South Dakota': '001',  # USA
    'North Dakota': '001',  # USA
    'Connecticut': '001',  # USA
    'Rhode Island': '001',  # USA
    'New Hampshire': '001',  # USA
    'Vermont': '001',  # USA
    'Maine': '001',  # USA
    'Delaware': '001',  # USA
    'Ontario': '001',  # Canada
    'Quebec': '001',  # Canada
    'British Columbia': '001',  # Canada
    'Alberta': '001',  # Canada
    'Lancashire': '044',  # UK
    'Staffordshire': '044',  # UK
    'Cornwall': '044',  # UK
    'Kent': '044',  # UK
    'Essex': '044',  # UK
    'Hampshire': '044',  # UK
    'Dorset': '044',  # UK
    'Devon': '044',  # UK
    'Somerset': '044',  # UK
    'Nottinghamshire': '044',  # UK
    'Derbyshire': '044',  # UK
    'Yorkshire': '044',  # UK
    'Lincolnshire': '044',  # UK
    'Norfolk': '044',  # UK
    'Cambridgeshire': '044',  # UK
    'Bedfordshire': '044',  # UK
    'Hertfordshire': '044',  # UK
    'Buckinghamshire': '044',  # UK
    'Oxfordshire': '044',  # UK
    'Gloucestershire': '044',  # UK
    'Warwickshire': '044',  # UK
    'Worcestershire': '044',  # UK
    'Shropshire': '044',  # UK
    'Cheshire': '044',  # UK
    'Cumbria': '044',  # UK
    'Northumberland': '044',  # UK
    'Durham': '044',  # UK
    'West Midlands': '044',  # UK
    'Greater Manchester': '044',  # UK
    'Merseyside': '044',  # UK
    'South Yorkshire': '044',  # UK
    'West Yorkshire': '044',  # UK
    'Tyne and Wear': '044',  # UK
    'Aichi': '081',  # Japan
    'Tokyo': '081',  # Japan
    'Osaka': '081',  # Japan
    'Kyoto': '081',  # Japan
    'Hyōgo': '081',  # Japan
    'Kanagawa': '081',  # Japan
    'Chiba': '081',  # Japan
    'Saitama': '081',  # Japan
    'Hokkaido': '081',  # Japan
    'Miyagi': '081',  # Japan
    'Shizuoka': '081',  # Japan
    'Hiroshima': '081',  # Japan
    'Fukuoka': '081',  # Japan
    'Nagano': '081',  # Japan
    'Mie': '081',  # Japan
    'Gunma': '081',  # Japan
    'Tochigi': '081',  # Japan
    'Ibaraki': '081',  # Japan
}

# Additional state/region mappings for fallback when country is empty
country_codes.update({
    # Russian regions/states
    'Russia': '007',
    'Moscow City': '007',
    'Saint Petersburg': '007',
    # Indian states
    'Tamil Nadu': '091',
    'Maharashtra': '091',
    'Gujarat': '091',
    'Delhi': '091',
    'Karnataka': '091',
    # Indonesian regions
    'Jakarta': '062',
    'West Java': '062',
    # Iraqi regions
    'Baghdad': '964',
    'Kirkuk': '964',
    # Other common regions that might appear
    'Seoul': '082',  # South Korea
    'Gyeongsangnam-do': '082',  # South Korea
})

# Build park and coaster registries
print("\n[2/6] Building park registry...")
country_parks = defaultdict(lambda: defaultdict(list))  # country -> park_name -> [coasters]

# Regions to merge into parent countries
region_mapping = {
    # Spain regions
    'Catalonia': 'Spain',
    'Basque Country': 'Spain',
    'Andalusia': 'Spain',
    'Valencia': 'Spain',
    'Valencian Community': 'Spain',
    'Galicia': 'Spain',
    'Aragon': 'Spain',
    'Navarre': 'Spain',
    'Canary Islands': 'Spain',
    'Community of Madrid': 'Spain',
    'Castile and León': 'Spain',
    'Castile-La Mancha': 'Spain',
    'Murcia': 'Spain',
    'Asturias': 'Spain',
    'Extremadura': 'Spain',
    'Balearic Islands': 'Spain',
    'Cantabria': 'Spain',
    'La Rioja': 'Spain',
    # Belgium regions
    'Flemish Region': 'Belgium',
    'Walloon Region': 'Belgium',
    'Wallonia': 'Belgium',
    'Brussels': 'Belgium',
    # United Kingdom regions
    'England': 'United Kingdom',
    'Scotland': 'United Kingdom',
    'Wales': 'United Kingdom',
    'Northern Ireland': 'United Kingdom',
    # Chinese provinces
    'Guangdong': 'China',
    'Jiangsu': 'China',
    'Shandong': 'China',
    'Henan': 'China',
    'Zhejiang': 'China',
    'Sichuan': 'China',
    'Hebei': 'China',
    'Hunan': 'China',
    'Anhui': 'China',
    'Hubei': 'China',
    'Guangxi': 'China',
    'Jiangxi': 'China',
    'Fujian': 'China',
    'Shaanxi': 'China',
    'Yunnan': 'China',
    'Nei Mongol': 'China',
    'Inner Mongolia': 'China',
    'Liaoning': 'China',
    'Guizhou': 'China',
    'Shanxi': 'China',
    'Heilongjiang': 'China',
    'Jilin': 'China',
    'Gansu': 'China',
    'Xinjiang Uygur': 'China',
    'Xinjiang': 'China',
    'Tianjin': 'China',
    'Chongqing': 'China',
    'Shanghai': 'China',
    'Beijing': 'China',
    'Hainan': 'China',
    'Ningxia Hui': 'China',
    'Qinghai': 'China',
    'Tibet': 'China',
    'Xizang': 'China',
    # Japanese prefectures/regions
    'Hokkaido': 'Japan',
    'Tokyo': 'Japan',
    'Osaka': 'Japan',
    'Aichi': 'Japan',
    'Hyogo': 'Japan',
    'Hyōgo': 'Japan',
    'Kanagawa': 'Japan',
    'Saitama': 'Japan',
    'Chiba': 'Japan',
    'Kyoto': 'Japan',
    'Fukuoka': 'Japan',
    'Hiroshima': 'Japan',
    'Shizuoka': 'Japan',
    'Mie': 'Japan',
    'Gunma': 'Japan',
    'Tochigi': 'Japan',
    'Ibaraki': 'Japan',
    'Nagano': 'Japan',
    'Niigata': 'Japan',
    'Yamanashi': 'Japan',
    'Nara': 'Japan',
    'Wakayama': 'Japan',
    'Shiga': 'Japan',
    'Okayama': 'Japan',
    'Gifu': 'Japan',
    'Yamaguchi': 'Japan',
    'Ōita': 'Japan',
    'Shiribeshi': 'Japan',
    'Gifu': 'Japan',
    'Fukushima': 'Japan',
    'Aomori': 'Japan',
    'Miyagi': 'Japan',
    'Ishikawa': 'Japan',
    'Okinawa': 'Japan',
    'Kumamoto': 'Japan',
    'Kagoshima': 'Japan',
    'Ehime': 'Japan',
    'Nagasaki': 'Japan',
    'Yamaguchi': 'Japan',
    'Toyama': 'Japan',
    'Akita': 'Japan',
    'Iwate': 'Japan',
    'Yamagata': 'Japan',
    'Saga': 'Japan',
    'Oita': 'Japan',
    'Miyazaki': 'Japan',
    'Kochi': 'Japan',
    'Kagawa': 'Japan',
    'Tokushima': 'Japan',
    'Tottori': 'Japan',
    'Shimane': 'Japan',
    'Fukui': 'Japan',
    # South Korean regions
    'Seoul': 'South Korea',
    'Gyeongsangnam-do': 'South Korea',
    'Changnyeong': 'South Korea',
    'Songdong-Gu': 'South Korea',
    # Turkish regions
    'Istanbul': 'Turkey',
    'İzmir': 'Turkey',
    'Gaziantep': 'Turkey',
    'Kütahya': 'Turkey',
    # Czech regions
    'South Moravian': 'Czech Republic',
    # Indian states
    'Karnataka': 'India',
    'Tamil Nadu': 'India',
    'Maharashtra': 'India',
    'Gujarat': 'India',
    'Delhi': 'India',
    # Brazilian states
    'Rio De Janeiro': 'Brazil',
    'São Paulo': 'Brazil',
    'Rio Grande do Sul': 'Brazil',
    # Russian regions
    'Russia': 'Russia',
    'Moscow City': 'Russia',
    'Saint Petersburg': 'Russia',
    # Indonesian regions
    'Jakarta': 'Indonesia',
    'West Java': 'Indonesia',
    # Iraqi regions
    'Baghdad': 'Iraq',
    'Kirkuk': 'Iraq',
    # Saudi Arabian regions
    'Ar Riyadh': 'Saudi Arabia',
    # Vietnamese regions
    'Đà Nẵng': 'Vietnam',
    # Iranian regions
    'Qom': 'Iran',
    # Israeli regions
    'Jerusalem': 'Israel',
    # Croatian regions
    'Zadar': 'Croatia',
    # Malaysian regions
    'Pahang': 'Malaysia',
    # UK regions
    'Isle of Man': 'United Kingdom',
    # Tanzanian regions
    'Dar es Salaam': 'Tanzania',
    # Other regions
    'Lima Province': 'Peru',
    'Czechia': 'Czech Republic',
}

for coaster in rcdb_data:
    # Use fallback chain: country -> region -> state -> 'Unknown'
    country = coaster.get('country', '') or coaster.get('region', '') or coaster.get('state', '') or 'Unknown'
    # Map regions to parent countries
    country = region_mapping.get(country, country)
    park_name = coaster['park'].get('name', 'Unknown')
    country_parks[country][park_name].append(coaster)

print(f"✓ Found {len(country_parks)} countries")
print(f"✓ Found {sum(len(parks) for parks in country_parks.values())} unique parks")

# Debug: Check for our problem parks
catalonia_parks = [p for p in country_parks.get('Catalonia', {}).keys() if 'portaventura' in p.lower() or 'ferrari' in p.lower()]
flemish_parks = [p for p in country_parks.get('Flemish Region', {}).keys() if 'bobbejaan' in p.lower()]
if catalonia_parks:
    print(f"✓ Found Catalonia parks: {', '.join(catalonia_parks)}")
if flemish_parks:
    print(f"✓ Found Flemish parks: {', '.join(flemish_parks)}")

# Country to continent mapping
country_to_continent = {
    # North America
    'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
    'Costa Rica': 'North America', 'Guatemala': 'North America', 'Honduras': 'North America',
    'Nicaragua': 'North America', 'Panama': 'North America', 'El Salvador': 'North America',
    'Dominican Republic': 'North America', 'Jamaica': 'North America', 'Haiti': 'North America',
    'Trinidad and Tobago': 'North America', 'Cuba': 'North America',
    
    # South America
    'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America',
    'Colombia': 'South America', 'Uruguay': 'South America', 'Venezuela': 'South America',
    'Peru': 'South America', 'Ecuador': 'South America', 'Bolivia': 'South America',
    'Guyana': 'South America',
    
    # Europe
    'United Kingdom': 'Europe', 'England': 'Europe', 'Scotland': 'Europe', 'Wales': 'Europe',
    'Northern Ireland': 'Europe', 'Germany': 'Europe', 'France': 'Europe', 'Italy': 'Europe',
    'Spain': 'Europe', 'Catalonia': 'Europe', 'Basque Country': 'Europe', 'Andalusia': 'Europe',
    'Valencia': 'Europe', 'Galicia': 'Europe', 'Aragon': 'Europe', 'Navarre': 'Europe',
    'Canary Islands': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe', 'Flemish Region': 'Europe',
    'Walloon Region': 'Europe', 'Brussels': 'Europe', 'Switzerland': 'Europe', 'Austria': 'Europe',
    'Poland': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe', 'Denmark': 'Europe',
    'Finland': 'Europe', 'Portugal': 'Europe', 'Greece': 'Europe', 'Ireland': 'Europe',
    'Czech Republic': 'Europe', 'Hungary': 'Europe', 'Romania': 'Europe', 'Bulgaria': 'Europe',
    'Ukraine': 'Europe', 'Russia': 'Europe', 'Estonia': 'Europe', 'Latvia': 'Europe',
    'Lithuania': 'Europe', 'Slovakia': 'Europe', 'Slovenia': 'Europe', 'Croatia': 'Europe',
    'Serbia': 'Europe', 'Albania': 'Europe', 'North Macedonia': 'Europe', 'Bosnia and Herzegovina': 'Europe',
    'Kosovo': 'Europe', 'Montenegro': 'Europe', 'Belarus': 'Europe', 'Armenia': 'Europe',
    'Georgia': 'Europe', 'Azerbaijan': 'Europe', 'Iceland': 'Europe', 'Andorra': 'Europe',
    'Malta': 'Europe', 'Cyprus': 'Europe', 'Luxembourg': 'Europe', 'Monaco': 'Europe',
    'Liechtenstein': 'Europe', 'San Marino': 'Europe', 'Moldova': 'Europe',
    
    # Asia
    'China': 'Asia', 'Japan': 'Asia', 'South Korea': 'Asia', 'India': 'Asia',
    'Indonesia': 'Asia', 'Malaysia': 'Asia', 'Thailand': 'Asia', 'Singapore': 'Asia',
    'Philippines': 'Asia', 'Vietnam': 'Asia', 'Myanmar': 'Asia', 'Taiwan': 'Asia',
    'Hong Kong': 'Asia', 'Macau': 'Asia', 'Cambodia': 'Asia', 'Laos': 'Asia',
    'Brunei': 'Asia', 'Pakistan': 'Asia', 'Bangladesh': 'Asia', 'Nepal': 'Asia',
    'Sri Lanka': 'Asia', 'Afghanistan': 'Asia', 'Kyrgyzstan': 'Asia', 'Maldives': 'Asia',
    'North Korea': 'Asia', 'Mongolia': 'Asia', 'Tajikistan': 'Asia', 'Turkmenistan': 'Asia',
    'Uzbekistan': 'Asia',
    
    # Middle East
    'Turkey': 'Middle East', 'United Arab Emirates': 'Middle East', 'Saudi Arabia': 'Middle East',
    'Israel': 'Middle East', 'Iran': 'Middle East', 'Iraq': 'Middle East', 'Palestine': 'Middle East',
    'Yemen': 'Middle East', 'Syria': 'Middle East', 'Bahrain': 'Middle East', 'Jordan': 'Middle East',
    'Kuwait': 'Middle East', 'Lebanon': 'Middle East', 'Oman': 'Middle East', 'Qatar': 'Middle East',
    
    # Africa
    'Egypt': 'Africa', 'South Africa': 'Africa', 'Kenya': 'Africa', 'Nigeria': 'Africa',
    'Uganda': 'Africa', 'Tanzania': 'Africa', 'Sudan': 'Africa', 'Madagascar': 'Africa',
    'Zambia': 'Africa', 'Botswana': 'Africa', 'Senegal': 'Africa', "Côte d'Ivoire": 'Africa',
    'Morocco': 'Africa', 'Tunisia': 'Africa', 'Algeria': 'Africa', 'Libya': 'Africa',
    'Angola': 'Africa', 'Ghana': 'Africa', 'Rwanda': 'Africa', 'Zimbabwe': 'Africa',
    'Malawi': 'Africa', 'Mozambique': 'Africa', 'Mauritius': 'Africa',
    'Democratic Republic of the Congo': 'Africa', 'Ethiopia': 'Africa', 'Togo': 'Africa',
    
    # Oceania
    'Australia': 'Oceania', 'New Zealand': 'Oceania',
}

# Generate country codes table
print("\n[3/6] Generating country codes...")
countries_table = {}
unmapped_countries = []
for country in sorted(country_parks.keys()):
    code = country_codes.get(country, '999')  # 999 for unmapped countries
    if code == '999':
        unmapped_countries.append(country)
    continent = country_to_continent.get(country, 'Unknown')
    countries_table[country] = {
        'code': code,
        'name': country,
        'continent': continent,
        'parkCount': len(country_parks[country])
    }
print(f"✓ Mapped {len([c for c in countries_table.values() if c['code'] != '999'])}/{len(countries_table)} countries")
if unmapped_countries:
    print(f"⚠ Unmapped countries ({len(unmapped_countries)}): {', '.join(unmapped_countries[:10])}{'...' if len(unmapped_countries) > 10 else ''}")

# Generate park codes table
print("\n[4/6] Generating park codes...")
parks_table = {}
park_counter = defaultdict(int)  # country -> next available park code
skipped_parks = []

for country in sorted(country_parks.keys()):
    country_code = countries_table[country]['code']
    
    # Debug for Catalonia and Flemish Region
    if country in ['Catalonia', 'Flemish Region']:
        print(f"  Processing {country} (code: {country_code}) with {len(country_parks[country])} parks")
    
    for park_name in sorted(country_parks[country].keys()):
        park_counter[country] += 1
        
        # Check if we exceed 9999 parks per country
        if park_counter[country] > 9999:
            skipped_parks.append(f"{park_name} ({country})")
            continue
        
        # Debug for specific parks
        if 'portaventura' in park_name.lower() or 'ferrari land' in park_name.lower() or 'bobbejaan' in park_name.lower():
            print(f"    Adding {park_name} with code {country_code}{park_counter[country]:04d}")
            
        park_code = f"{park_counter[country]:04d}"
        park_id = f"{country_code}{park_code}"
        
        parks_table[park_id] = {
            'parkCode': park_code,
            'parkId': park_id,
            'name': park_name,
            'country': country,
            'countryCode': country_code,
            'coasterCount': len(country_parks[country][park_name])
        }

print(f"✓ Generated codes for {len(parks_table)} parks")
if skipped_parks:
    print(f"⚠ Skipped {len(skipped_parks)} parks (exceeded 9999 parks per country limit)")
    print(f"   First 5: {', '.join(skipped_parks[:5])}")

# Generate coaster IDs and master database
print("\n[5/6] Generating coaster IDs and master database...")
master_database = {}
coaster_counter = defaultdict(int)  # park_id -> next coaster number
id_mapping = {}  # rcdb_id -> custom_id

for coaster in rcdb_data:
    # Use fallback chain: country -> region -> state -> 'Unknown'
    original_country = coaster.get('country', '') or coaster.get('region', '') or coaster.get('state', '') or 'Unknown'
    country = region_mapping.get(original_country, original_country)  # Map regions to parent
    park_name = coaster['park'].get('name', 'Unknown')
    country_code = countries_table.get(country, {}).get('code', '999')
    
    # Find park_id
    park_id = None
    for pid, pdata in parks_table.items():
        if pdata['name'] == park_name and pdata['country'] == country:
            park_id = pid
            break
    
    if not park_id:
        continue
    
    # Generate coaster number
    coaster_counter[park_id] += 1
    coaster_num = f"{coaster_counter[park_id]:02d}"
    
    # Generate custom ID
    custom_id = f"C{park_id}{coaster_num}"
    
    # Extract opening year
    def extract_year(date_str):
        if not date_str:
            return None
        if isinstance(date_str, str):
            for part in date_str.split('-'):
                if len(part) == 4 and part.isdigit():
                    return int(part)
        return None
    
    status = coaster.get('status', {})
    date_info = status.get('date', {})
    opened = date_info.get('opened', '')
    opening_year = extract_year(opened)
    
    # Build master entry - extract ALL available fields from RCDB
    stats = coaster.get('stats', {})
    main_picture = coaster.get('mainPicture', {})
    
    master_database[custom_id] = {
        'id': custom_id,
        'rcdbId': coaster.get('id'),
        'name': coaster.get('name', ''),
        'park': park_name,
        'parkId': park_id,
        'country': country,
        'countryCode': country_code,
        'city': coaster.get('city', ''),
        'state': coaster.get('state', ''),
        'region': coaster.get('region', ''),
        'manufacturer': coaster.get('make', ''),
        'model': coaster.get('model', ''),
        'type': coaster.get('type', ''),  # Material: Steel/Wood/Hybrid
        'design': coaster.get('design', ''),  # Sit Down/Inverted/etc
        'openingYear': opening_year,
        'status': status.get('state', ''),
        'openedDate': date_info.get('opened', ''),
        'closedDate': date_info.get('closed', ''),
        # Stats - all available fields
        'height': stats.get('height', ''),
        'speed': stats.get('speed', ''),
        'length': stats.get('length', ''),
        'inversions': stats.get('inversions', ''),
        'duration': stats.get('duration', ''),
        'elements': stats.get('elements', ''),
        'arrangement': stats.get('arrangement', ''),
        'manufactured': stats.get('manufactured', ''),
        'capacity': stats.get('capacity', ''),
        'dimensions': stats.get('dimensions', ''),
        # Image data
        'mainPictureUrl': main_picture.get('url', ''),
        'mainPictureId': main_picture.get('id', ''),
        'mainPictureName': main_picture.get('name', ''),
        # RCDB link
        'rcdbLink': coaster.get('link', '')
    }
    
    id_mapping[coaster.get('id')] = custom_id

print(f"✓ Generated {len(master_database)} coaster records")

# Save files
print("\n[6/6] Saving database files...")

# Create data directory
os.makedirs('data', exist_ok=True)

# Save master database
with open('data/coasters_master.json', 'w', encoding='utf-8') as f:
    json.dump(master_database, f, indent=2, ensure_ascii=False)
print(f"✓ Saved master database: data/coasters_master.json ({len(master_database)} coasters)")

# Save countries table
with open('data/countries.json', 'w', encoding='utf-8') as f:
    json.dump(countries_table, f, indent=2, ensure_ascii=False)
print(f"✓ Saved countries table: data/countries.json ({len(countries_table)} countries)")

# Save parks table
with open('data/parks.json', 'w', encoding='utf-8') as f:
    json.dump(parks_table, f, indent=2, ensure_ascii=False)
print(f"✓ Saved parks table: data/parks.json ({len(parks_table)} parks)")

# Save ID mapping for migration
with open('data/rcdb_to_custom_mapping.json', 'w', encoding='utf-8') as f:
    json.dump(id_mapping, f, indent=2)
print(f"✓ Saved ID mapping: data/rcdb_to_custom_mapping.json")

print("\n" + "=" * 60)
print("DATABASE GENERATION COMPLETE")
print("=" * 60)
print(f"\nStatistics:")
print(f"  Countries: {len(countries_table)}")
print(f"  Parks: {len(parks_table)}")
print(f"  Coasters: {len(master_database)}")
print(f"\nFiles created:")
print(f"  - data/coasters_master.json")
print(f"  - data/countries.json")
print(f"  - data/parks.json")
print(f"  - data/rcdb_to_custom_mapping.json")
print(f"\nNext step: Run migration script to convert user CSVs")
