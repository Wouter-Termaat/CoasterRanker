"""
Test scraper with batch of coasters
"""

from rcdb_scraper import RCDBScraper
import json

def test_batch():
    """Test with 10 random coasters including singles and potential splits"""
    scraper = RCDBScraper(delay=1.0)
    
    # Mix of coasters - some single, some potentially split
    test_ids = [775, 1697, 4526, 606, 1320, 20549, 85, 1235, 531, 930]
    
    results = []
    total_coasters = 0
    
    print("Testing batch of 10 RCDB IDs...")
    print("=" * 80)
    
    for rcdb_id in test_ids:
        print(f"\nFetching RCDB {rcdb_id}...", end=" ")
        
        result = scraper.fetch_coaster(rcdb_id)
        
        if result is None:
            print("❌ NOT FOUND")
            results.append({
                "rcdb_id": rcdb_id,
                "status": "not_found",
                "count": 0
            })
        elif isinstance(result, list):
            # Split coaster
            print(f"✓ SPLIT COASTER ({len(result)} tracks)")
            for track in result:
                print(f"  - {track['name']}")
            results.append({
                "rcdb_id": rcdb_id,
                "status": "split",
                "count": len(result),
                "data": result
            })
            total_coasters += len(result)
        else:
            # Single coaster
            print(f"✓ {result['name']}")
            results.append({
                "rcdb_id": rcdb_id,
                "status": "single",
                "count": 1,
                "data": result
            })
            total_coasters += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    single_count = sum(1 for r in results if r['status'] == 'single')
    split_count = sum(1 for r in results if r['status'] == 'split')
    not_found = sum(1 for r in results if r['status'] == 'not_found')
    
    print(f"Total RCDB IDs tested: {len(test_ids)}")
    print(f"  Single coasters: {single_count}")
    print(f"  Split coasters: {split_count}")
    print(f"  Not found: {not_found}")
    print(f"\nTotal coasters extracted: {total_coasters}")
    
    # Detailed results
    print("\n" + "=" * 80)
    print("DETAILED RESULTS")
    print("=" * 80)
    
    for r in results:
        if r['status'] == 'not_found':
            print(f"\nRCDB {r['rcdb_id']}: NOT FOUND")
        elif r['status'] == 'split':
            print(f"\nRCDB {r['rcdb_id']}: SPLIT COASTER ({r['count']} tracks)")
            for track in r['data']:
                print(f"\n  Track: {track['name']}")
                print(f"    Height: {track.get('height', 'N/A')} ft")
                print(f"    Speed: {track.get('speed', 'N/A')} mph")
                print(f"    Length: {track.get('length', 'N/A')} ft")
                print(f"    Inversions: {track.get('inversions', 'N/A')}")
        else:
            track = r['data']
            print(f"\nRCDB {r['rcdb_id']}: {track['name']}")
            print(f"  Park: {track.get('parkName', 'N/A')}")
            print(f"  Height: {track.get('height', 'N/A')} ft")
            print(f"  Speed: {track.get('speed', 'N/A')} mph")
            print(f"  Length: {track.get('length', 'N/A')} ft")
            print(f"  Inversions: {track.get('inversions', 'N/A')}")
    
    print("\n" + "=" * 80)
    print(f"✓ Batch test complete! Successfully processed {total_coasters} coasters from {len(test_ids)} RCDB IDs")
    print("=" * 80)


if __name__ == "__main__":
    test_batch()
