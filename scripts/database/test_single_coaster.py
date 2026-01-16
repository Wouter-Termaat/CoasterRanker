"""
Test scraper with a single coaster
Usage: python test_single_coaster.py <rcdb_id>
"""

import sys
import json
from rcdb_scraper import RCDBScraper
import re


def debug_tracks_table(rcdb_id: int):
    """Debug: show raw HTML around Tracks section"""
    import requests
    response = requests.get(f"https://rcdb.com/{rcdb_id}.htm")
    html = response.text
    
    # Find Tracks section
    idx = html.find('<h3>Tracks</h3>')
    if idx != -1:
        print("Found <h3>Tracks</h3>")
        print("\nRaw HTML (next 800 chars):")
        print(repr(html[idx:idx+800]))
        print("\n")
        
        # Test the pattern
        pattern = r'<h3>Tracks</h3><table[^>]*>(.*?)(?:</section>|<section>)'
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            print("✓ Pattern matched!")
            table_html = match.group(1)
            print(f"Table HTML length: {len(table_html)}")
            print("First 500 chars of table:")
            print(repr(table_html[:500]))
            
            # Check for Name: pattern
            if re.search(r'<th>Name<td>[^<]+<td>[^<]+', table_html, re.IGNORECASE):
                print("\n✓ Found split coaster pattern (Name with 2 tracks)")
            else:
                print("\n✗ No split coaster pattern found")
        else:
            print("✗ Pattern did NOT match")


def test_coaster(rcdb_id: int):
    """Test scraping a single coaster and display all fields"""
    scraper = RCDBScraper(delay=1.0)
    
    print(f"\nFetching RCDB {rcdb_id}...")
    print("=" * 70)
    
    result = scraper.fetch_coaster(rcdb_id)
    
    if result is None:
        print(f"❌ Failed to fetch coaster {rcdb_id} - may not exist")
        return
    
    # Check if it's a split coaster (list) or single (dict)
    if isinstance(result, list):
        print(f"\n🎢 SPLIT COASTER detected - {len(result)} tracks:\n")
        for i, track in enumerate(result, 1):
            print(f"{'=' * 70}")
            print(f"TRACK {i}: {track.get('name', 'N/A')}")
            print(f"{'=' * 70}")
            display_coaster(track)
            print()
    else:
        print(f"\n✓ Successfully fetched coaster data:\n")
        display_coaster(result)


def display_coaster(result: dict):
    """Display coaster data in readable format"""
    print(f"\n✓ Successfully fetched coaster data:\n")
    
    # Basic info
    print("BASIC INFO:")
    print(f"  Name:         {result.get('name', 'N/A')}")
    print(f"  Park:         {result.get('parkName', 'N/A')}")
    print(f"  Location:     {result.get('city', 'N/A')}, {result.get('country', 'N/A')}")
    print(f"  Status:       {result.get('status', 'N/A')}")
    print(f"  Opened:       {result.get('opened', 'N/A') or 'Unknown'}")
    
    # Technical specs
    print("\nTECHNICAL SPECS:")
    print(f"  Manufacturer: {result.get('manufacturer', 'N/A')}")
    print(f"  Model:        {result.get('model', 'N/A')}")
    print(f"  Type:         {result.get('type', 'N/A')}")
    print(f"  Design:       {result.get('design', 'N/A')}")
    
    # Statistics
    print("\nSTATISTICS:")
    print(f"  Height:       {result.get('height', 'N/A')} ft")
    print(f"  Drop:         {result.get('drop', 'N/A')} ft")
    print(f"  Speed:        {result.get('speed', 'N/A')} mph")
    print(f"  Length:       {result.get('length', 'N/A')} ft")
    print(f"  Inversions:   {result.get('inversions', 'N/A')}")
    print(f"  Duration:     {result.get('duration', 'N/A')}")
    
    # Elements
    elements = result.get('elements', '')
    if elements:
        print(f"\nELEMENTS:")
        print(f"  {elements}")
    
    # Raw JSON for verification
    print("\n" + "=" * 70)
    print("RAW JSON:")
    print(json.dumps(result, indent=2))
    print("=" * 70)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            rcdb_id = int(sys.argv[1])
            print("\n" + "="*70)
            print("DEBUG: Checking Tracks table HTML")
            print("="*70)
            debug_tracks_table(rcdb_id)
            print("\n" + "="*70)
            print("SCRAPER TEST")
            print("="*70)
            test_coaster(rcdb_id)
        except ValueError:
            print("Error: Please provide a valid RCDB ID number")
            print("Usage: python test_single_coaster.py <rcdb_id>")
    else:
        print("Test a few different coasters to verify the scraper:")
        print("=" * 70)
        
        # Test different coasters with different characteristics
        test_cases = [
            775,   # The Big One - single coaster
            4521,  # Twisted Colossus - split coaster (dueling)
            1697,  # Intimidator 305 - single coaster
        ]
        
        for rcdb_id in test_cases:
            test_coaster(rcdb_id)
            print("\n" + "=" * 70 + "\n")
