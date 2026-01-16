import json
import re
from collections import defaultdict

# Paths
DB_PATH = r"c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\database\data\coasters_master.json"
LUCA_PATH = r"c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\database\profiles\luca.json"
WOUTER_PATH = r"c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\database\profiles\wouter.json"

def load_database():
    """Load the coasters master database"""
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_database(data):
    """Save the coasters master database"""
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_profile(path):
    """Load a user profile"""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_profile(path, data):
    """Save a user profile"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def is_malformed_id(coaster_id):
    """Check if a coaster ID is malformed (>10 characters)"""
    return len(coaster_id) > 10

def extract_park_info_from_data(coaster_data):
    """Extract country and park code from coaster data fields"""
    country_code = coaster_data.get('countryCode', '')
    park_id = coaster_data.get('parkId', '')
    
    # ParkId format is 7 digits: first 3 are country duplicate, last 4 are park code
    # e.g., "0310033" for Netherlands park 0033
    if len(park_id) == 7:
        park = park_id[3:7]  # Get the last 4 digits
        return country_code, park
    elif len(park_id) == 4:
        # Some might only have 4 digits
        return country_code, park_id
    return None, None

def get_next_available_coaster_number(database, country, park, used_numbers):
    """Find the next available coaster number for a park"""
    park_prefix = f"C{country}{park}"
    
    # Find all existing coaster numbers at this park (ONLY properly formatted ones)
    existing_numbers = set()
    for coaster_id in database.keys():
        # Only count properly formatted IDs (exactly 10 characters)
        if coaster_id.startswith(park_prefix) and len(coaster_id) == 10:
            try:
                coaster_num = int(coaster_id[8:10])
                existing_numbers.add(coaster_num)
            except ValueError:
                continue
    
    # Add numbers we're using in this fix
    existing_numbers.update(used_numbers)
    
    # Find next available
    for num in range(1, 100):
        if num not in existing_numbers:
            return num
    
    raise ValueError(f"No available coaster numbers for park {park_prefix}")

def fix_malformed_ids():
    """Main function to fix all malformed coaster IDs"""
    print("Loading database...")
    database = load_database()
    
    # Step 1: Find all malformed IDs
    print("\nFinding malformed IDs...")
    malformed_entries = {}
    for coaster_id, coaster_data in database.items():
        if is_malformed_id(coaster_id):
            malformed_entries[coaster_id] = coaster_data
    
    print(f"Found {len(malformed_entries)} malformed IDs")
    
    # Step 2: Group by park and RCDB ID to keep tracks together
    print("\nGrouping by park and coaster...")
    from collections import defaultdict
    park_groups = defaultdict(list)
    
    for old_id, data in malformed_entries.items():
        country, park = extract_park_info_from_data(data)
        rcdb_id = data.get('rcdbId', '')
        if country and park:
            # Group by park and RCDB ID to keep dueling tracks together
            key = (country, park, rcdb_id)
            park_groups[key].append((old_id, data))
    
    print(f"Found {len(park_groups)} coaster groups")
    
    # Step 3: Assign new consecutive IDs
    print("\nAssigning new IDs...")
    id_mapping = {}
    
    # Process each park separately to track used numbers
    park_used_numbers = defaultdict(set)
    
    for (country, park, rcdb_id), coasters in sorted(park_groups.items()):
        # Sort tracks by old ID to maintain order
        coasters.sort(key=lambda x: x[0])
        
        # Get used numbers for this park
        used_numbers = park_used_numbers[(country, park)]
        
        # Assign consecutive numbers for this coaster's tracks
        for old_id, data in coasters:
            coaster_num = get_next_available_coaster_number(database, country, park, used_numbers)
            used_numbers.add(coaster_num)
            park_used_numbers[(country, park)] = used_numbers
            
            new_id = f"C{country}{park}{coaster_num:02d}"
            id_mapping[old_id] = new_id
            
            name = data.get('name', 'Unknown')
            park_name = data.get('park', '')
            print(f"  {old_id} -> {new_id} ({name} at {park_name})")
    
    print(f"\nTotal ID mappings created: {len(id_mapping)}")
    
    # Step 3: Create new database with corrected IDs
    print("\nRebuilding database...")
    new_database = {}
    
    for old_id, coaster_data in database.items():
        if old_id in id_mapping:
            # Use new ID
            new_id = id_mapping[old_id]
            # Update the internal id field to match
            coaster_data['id'] = new_id
            new_database[new_id] = coaster_data
        else:
            # Keep as is
            new_database[old_id] = coaster_data
    
    # Step 4: Verify no duplicate keys
    if len(new_database) != len(database):
        print(f"ERROR: Database size mismatch! Original: {len(database)}, New: {len(new_database)}")
        return
    
    # Verify all IDs are exactly 10 characters
    invalid_ids = [cid for cid in new_database.keys() if len(cid) != 10]
    if invalid_ids:
        print(f"ERROR: Found {len(invalid_ids)} invalid IDs after fix!")
        for cid in invalid_ids[:10]:
            print(f"  {cid} (length: {len(cid)})")
        return
    
    print("Database validation passed!")
    
    # Step 5: Save new database
    print("\nSaving database...")
    save_database(new_database)
    print("Database saved successfully!")
    
    # Step 6: Update profiles
    print("\nUpdating Luca's profile...")
    luca = load_profile(LUCA_PATH)
    luca_updates = 0
    for credit in luca.get('credits', []):
        old_id = credit['coasterId']
        if old_id in id_mapping:
            credit['coasterId'] = id_mapping[old_id]
            luca_updates += 1
            print(f"  Updated: {old_id} -> {id_mapping[old_id]}")
    save_profile(LUCA_PATH, luca)
    print(f"Updated {luca_updates} credits in Luca's profile")
    
    print("\nUpdating Wouter's profile...")
    wouter = load_profile(WOUTER_PATH)
    wouter_updates = 0
    for credit in wouter.get('credits', []):
        old_id = credit['coasterId']
        if old_id in id_mapping:
            credit['coasterId'] = id_mapping[old_id]
            wouter_updates += 1
            print(f"  Updated: {old_id} -> {id_mapping[old_id]}")
    save_profile(WOUTER_PATH, wouter)
    print(f"Updated {wouter_updates} credits in Wouter's profile")
    
    # Step 7: Final validation
    print("\n" + "="*60)
    print("FINAL VALIDATION")
    print("="*60)
    print(f"✓ Fixed {len(id_mapping)} malformed IDs")
    print(f"✓ All {len(new_database)} coaster IDs are exactly 10 characters")
    print(f"✓ Updated {luca_updates} credits in Luca's profile")
    print(f"✓ Updated {wouter_updates} credits in Wouter's profile")
    print("\nID Mapping Summary (first 20):")
    for i, (old, new) in enumerate(list(id_mapping.items())[:20]):
        coaster_name = new_database[new].get('name', 'Unknown')
        print(f"  {old} -> {new} ({coaster_name})")
    if len(id_mapping) > 20:
        print(f"  ... and {len(id_mapping) - 20} more")

if __name__ == "__main__":
    fix_malformed_ids()
