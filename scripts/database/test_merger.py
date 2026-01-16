"""
Test Database Merger - Safe Testing with Sample Data
Tests the merge logic on a COPY of your database before running on real data
"""

import json
import shutil
from pathlib import Path
from rcdb_scraper import RCDBScraper
from database_merger import DatabaseMerger

def test_merger():
    """Test merger with real scraped data on a database copy"""
    
    print("=" * 80)
    print("DATABASE MERGER TEST")
    print("=" * 80)
    
    # Paths
    base_dir = Path(__file__).parent.parent.parent
    db_path = base_dir / "database" / "data" / "coasters_master.json"
    mapping_path = base_dir / "database" / "data" / "rcdb_to_custom_mapping.json"
    test_db_path = base_dir / "scripts" / "database" / "test_database.json"
    test_mapping_path = base_dir / "scripts" / "database" / "test_mapping.json"
    
    # Step 1: Create copies of database files
    print("\nStep 1: Creating test database copies...")
    shutil.copy(db_path, test_db_path)
    shutil.copy(mapping_path, test_mapping_path)
    print(f"✓ Created test database at: {test_db_path}")
    
    # Step 2: Scrape test coasters
    print("\nStep 2: Scraping test coasters...")
    scraper = RCDBScraper(delay=1.0)
    
    test_rcdb_ids = [
        775,    # Big One - single coaster, exists in your DB
        4526,   # Joris en de Draak - split coaster, exists in your DB
        1697,   # Dinosaur Coaster - single, should exist
        20549,  # Stardust Racers - split, might be new
    ]
    
    scraped_data = []
    for rcdb_id in test_rcdb_ids:
        print(f"  Fetching RCDB {rcdb_id}...", end=" ")
        result = scraper.fetch_coaster(rcdb_id)
        if result:
            if isinstance(result, list):
                print(f"✓ Split ({len(result)} tracks)")
                scraped_data.extend(result)
            else:
                print(f"✓ {result['name']}")
                scraped_data.append(result)
        else:
            print("✗ Not found")
    
    print(f"\n✓ Scraped {len(scraped_data)} total coasters")
    
    # Step 3: Show what was scraped
    print("\nStep 3: Scraped data preview:")
    print("-" * 80)
    for coaster in scraped_data:
        print(f"  {coaster['name']} (RCDB {coaster['rcdbId']})")
        print(f"    Height: {coaster.get('height', 'N/A')} | Speed: {coaster.get('speed', 'N/A')} | Length: {coaster.get('length', 'N/A')}")
    
    # Step 4: Load existing data from TEST copies
    print("\nStep 4: Loading test database...")
    with open(test_db_path, 'r', encoding='utf-8') as f:
        existing_db = json.load(f)
    with open(test_mapping_path, 'r', encoding='utf-8') as f:
        existing_mapping = json.load(f)
    
    print(f"✓ Test database has {len(existing_db)} coasters")
    print(f"✓ Test mapping has {len(existing_mapping)} RCDB IDs")
    
    # Step 5: Show what will happen
    print("\nStep 5: Analyzing merge operations...")
    print("-" * 80)
    
    for coaster in scraped_data:
        rcdb_id = str(coaster['rcdbId'])
        
        # Check if this RCDB ID exists in mapping
        if rcdb_id in existing_mapping:
            custom_id = existing_mapping[rcdb_id]
            if custom_id in existing_db:
                existing = existing_db[custom_id]
                print(f"\n✏️  UPDATE: {coaster['name']} (RCDB {rcdb_id} → {custom_id})")
                
                # Show what will change
                changes = []
                for field in ['height', 'speed', 'length', 'inversions']:
                    old_val = existing.get(field, 'N/A')
                    new_val = coaster.get(field, 'N/A')
                    if old_val != new_val:
                        changes.append(f"    {field}: {old_val} → {new_val}")
                
                if changes:
                    print("  Changes:")
                    for change in changes:
                        print(change)
                else:
                    print("  No stat changes (same data)")
            else:
                print(f"\n⚠️  ORPHAN MAPPING: RCDB {rcdb_id} maps to {custom_id} but coaster not in DB")
        else:
            print(f"\n➕ NEW: {coaster['name']} (RCDB {rcdb_id})")
            print(f"  Will assign new custom ID")
    
    # Step 6: Ask for confirmation
    print("\n" + "=" * 80)
    response = input("\nProceed with TEST merge? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print("❌ Test cancelled")
        return
    
    # Step 7: Run merger on TEST database
    print("\nStep 7: Running merger on TEST database...")
    merger = DatabaseMerger(
        str(test_db_path),
        str(test_mapping_path)
    )
    
    result = merger.merge_coasters(scraped_data)
    
    print("\n" + "=" * 80)
    print("MERGE RESULTS")
    print("=" * 80)
    print(f"✓ Updated: {result['updated']} coasters")
    print(f"✓ Added: {result['added']} new coasters")
    print(f"✓ Preserved: {result['preserved_splits']} existing split coasters")
    print(f"✓ Total in database: {result['total_coasters']}")
    
    if result['updated'] > 0:
        print("\nUpdated coasters:")
        for custom_id in result.get('updated_ids', []):
            print(f"  - {custom_id}")
    
    if result['added'] > 0:
        print("\nAdded coasters:")
        for custom_id in result.get('added_ids', []):
            print(f"  - {custom_id}")
    
    # Step 8: Verify test database
    print("\nStep 8: Verifying merged test database...")
    with open(test_db_path, 'r', encoding='utf-8') as f:
        merged_db = json.load(f)
    
    print(f"✓ Test database now has {len(merged_db)} coasters")
    
    # Show a few merged coasters
    print("\nSample merged coasters:")
    for i, (custom_id, coaster) in enumerate(list(merged_db.items())[:5]):
        print(f"  {custom_id}: {coaster['name']} (RCDB {coaster.get('rcdbId', 'N/A')})")
        if i >= 4:
            break
    
    print("\n" + "=" * 80)
    print("✅ TEST COMPLETE!")
    print("=" * 80)
    print(f"\nTest database saved at: {test_db_path}")
    print("Review the test database to verify merge logic.")
    print("If everything looks good, you can run the full update!")
    print("\nTo clean up test files:")
    print(f"  Remove: {test_db_path}")
    print(f"  Remove: {test_mapping_path}")


if __name__ == "__main__":
    test_merger()
