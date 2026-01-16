"""
RCDB Database Updater
Main script to update coaster database with latest RCDB data
Supports resume, progress tracking, and preview mode
"""

import argparse
import json
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from rcdb_scraper import RCDBScraper
from database_merger import DatabaseMerger


class UpdateProgress:
    """Tracks and saves progress for resume capability"""
    
    def __init__(self, progress_file: str = "update_progress.json"):
        self.progress_file = Path(progress_file)
        self.data = self._load()
    
    def _load(self) -> Dict:
        """Load progress from file"""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                return json.load(f)
        return {
            "last_rcdb_id": 0,
            "processed_count": 0,
            "added_count": 0,
            "updated_count": 0,
            "error_count": 0,
            "start_time": None,
            "last_save_time": None
        }
    
    def save(self):
        """Save progress to file"""
        self.data["last_save_time"] = datetime.now().isoformat()
        with open(self.progress_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def update(self, rcdb_id: int, action: str):
        """Update progress after processing a coaster"""
        self.data["last_rcdb_id"] = rcdb_id
        self.data["processed_count"] += 1
        
        if action == "added":
            self.data["added_count"] += 1
        elif action == "updated":
            self.data["updated_count"] += 1
        elif action == "error":
            self.data["error_count"] += 1
    
    def reset(self):
        """Reset progress (start fresh)"""
        self.data = {
            "last_rcdb_id": 0,
            "processed_count": 0,
            "added_count": 0,
            "updated_count": 0,
            "error_count": 0,
            "start_time": datetime.now().isoformat(),
            "last_save_time": None
        }
        self.save()


class CoasterUpdater:
    """Main updater orchestrator"""
    
    # Map of country names to codes (extend as needed)
    COUNTRY_CODES = {
        "Germany": "049",
        "Netherlands": "031",
        "Belgium": "032",
        "United Kingdom": "044",
        "France": "033",
        "Spain": "034",
        "Italy": "039",
        "United States": "001",
        # Add more as needed
    }
    
    def __init__(self, database_path: str, delay: float = 3.0, preview: bool = False):
        """
        Initialize updater
        
        Args:
            database_path: Path to coasters_master.json
            delay: Seconds between RCDB requests
            preview: If True, show changes but don't save
        """
        self.database_path = Path(database_path)
        self.delay = delay
        self.preview = preview
        
        self.scraper = RCDBScraper(delay=delay)
        self.merger = DatabaseMerger(str(database_path))
        self.progress = UpdateProgress()
        
        self.log_file = Path("update_log.txt")
        
        # Load country/park mappings
        self._load_mappings()
    
    def _load_mappings(self):
        """Load country and park ID mappings"""
        # Load from existing database to build mappings
        db_dir = self.database_path.parent
        
        # Try to load countries.json if it exists
        countries_file = db_dir / "countries.json"
        if countries_file.exists():
            with open(countries_file, 'r', encoding='utf-8') as f:
                countries_data = json.load(f)
                # Build name -> code mapping
                for country in countries_data:
                    name = country.get('name', '')
                    code = country.get('code', '')
                    if name and code:
                        self.COUNTRY_CODES[name] = code
        
        # Build park name -> ID mapping from existing database
        self.park_ids = {}
        for coaster in self.merger.database:
            park_name = coaster.get('parkName', '')
            park_id = coaster.get('parkId', '')
            if park_name and park_id:
                self.park_ids[park_name] = park_id
    
    def _get_country_code(self, country_name: str) -> Optional[str]:
        """Get country code from name"""
        return self.COUNTRY_CODES.get(country_name)
    
    def _get_or_create_park_id(self, park_name: str, country_code: str) -> str:
        """Get existing park ID or generate new one"""
        if park_name in self.park_ids:
            return self.park_ids[park_name]
        
        # Generate new park ID (find next available for country)
        existing_parks = [
            pid for pname, pid in self.park_ids.items()
            if pid.startswith(country_code)
        ]
        
        if existing_parks:
            # Find highest number
            numbers = [int(pid[3:]) for pid in existing_parks if len(pid) >= 7]
            next_num = max(numbers) + 1 if numbers else 1
        else:
            next_num = 1
        
        new_park_id = f"{next_num:04d}"
        self.park_ids[park_name] = new_park_id
        
        return new_park_id
    
    def _log(self, message: str):
        """Write to log file and print"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_message + "\n")
    
    def update_range(self, start_id: int, end_id: int, resume: bool = False):
        """
        Update coasters in RCDB ID range
        
        Args:
            start_id: First RCDB ID to fetch
            end_id: Last RCDB ID to fetch (inclusive)
            resume: If True, continue from last saved progress
        """
        if resume and self.progress.data["last_rcdb_id"] > 0:
            start_id = self.progress.data["last_rcdb_id"] + 1
            self._log(f"Resuming from RCDB ID {start_id}")
        else:
            self.progress.reset()
            self._log(f"Starting fresh update from {start_id} to {end_id}")
        
        total = end_id - start_id + 1
        start_time = time.time()
        
        for rcdb_id in range(start_id, end_id + 1):
            current = rcdb_id - start_id + 1
            
            # Fetch from RCDB
            self._log(f"[{current}/{total}] Fetching RCDB {rcdb_id}...")
            
            scraped_data = self.scraper.fetch_coaster(rcdb_id)
            
            if scraped_data is None:
                # Coaster doesn't exist or fetch failed
                self.progress.update(rcdb_id, "error")
                continue
            
            # Check if it's a split coaster (scraper returns list)
            is_split = isinstance(scraped_data, list)
            
            if is_split:
                # Process each track
                results = self._process_split_coaster(scraped_data)
                
                # Log results
                for i, result in enumerate(results):
                    action = result.get('action', 'error')
                    coaster_id = result.get('id', 'unknown')
                    self._log(f"  Track {i+1}: {action} - {coaster_id}")
                    
                    if i == 0:  # Only count once per RCDB ID
                        self.progress.update(rcdb_id, action)
            else:
                # Process single coaster
                result = self._process_single_coaster(scraped_data)
                action = result.get('action', 'error')
                coaster_id = result.get('id', 'unknown')
                
                self._log(f"  {action} - {coaster_id}")
                self.progress.update(rcdb_id, action)
            
            # Save progress every 10 coasters
            if current % 10 == 0:
                self.progress.save()
                if not self.preview:
                    self.merger.save_database()
                
                # Print statistics
                elapsed = time.time() - start_time
                rate = current / elapsed if elapsed > 0 else 0
                remaining = (total - current) / rate if rate > 0 else 0
                
                self._log(f"Progress: {current}/{total} ({current/total*100:.1f}%)")
                self._log(f"  Added: {self.progress.data['added_count']}, "
                         f"Updated: {self.progress.data['updated_count']}, "
                         f"Errors: {self.progress.data['error_count']}")
                self._log(f"  Rate: {rate:.2f} coasters/sec, ETA: {remaining/60:.1f} min")
        
        # Final save
        self.progress.save()
        if not self.preview:
            self.merger.save_database()
        
        self._log(f"Update complete!")
        self._log(f"  Processed: {self.progress.data['processed_count']}")
        self._log(f"  Added: {self.progress.data['added_count']}")
        self._log(f"  Updated: {self.progress.data['updated_count']}")
        self._log(f"  Errors: {self.progress.data['error_count']}")
    
    def _process_single_coaster(self, scraped_data: Dict) -> Dict:
        """Process a single coaster"""
        country_name = scraped_data.get('country', '')
        park_name = scraped_data.get('parkName', '')
        
        # Get country code
        country_code = self._get_country_code(country_name)
        if not country_code:
            return {
                "action": "error",
                "message": f"Unknown country: {country_name}"
            }
        
        # Get or create park ID
        park_id = self._get_or_create_park_id(park_name, country_code)
        
        # Merge into database
        result = self.merger.merge_coaster(scraped_data, country_code, park_id, 
                                          preview=self.preview)
        
        return result
    
    def _process_split_coaster(self, scraped_data_list: List[Dict]) -> List[Dict]:
        """Process a split coaster (dueling/racing)"""
        if not scraped_data_list:
            return []
        
        country_name = scraped_data_list[0].get('country', '')
        park_name = scraped_data_list[0].get('parkName', '')
        
        # Get country code
        country_code = self._get_country_code(country_name)
        if not country_code:
            return [{
                "action": "error",
                "message": f"Unknown country: {country_name}"
            }]
        
        # Get or create park ID
        park_id = self._get_or_create_park_id(park_name, country_code)
        
        # Merge into database
        results = self.merger.merge_split_coasters(scraped_data_list, country_code, 
                                                   park_id, preview=self.preview)
        
        return results


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Update CoasterRanker database with latest RCDB data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Update full range (may take 20+ hours)
  python update_coasters.py --start 1 --end 25000
  
  # Update specific range
  python update_coasters.py --start 10000 --end 11000
  
  # Preview changes without saving
  python update_coasters.py --start 1 --end 100 --preview
  
  # Resume interrupted update
  python update_coasters.py --start 1 --end 25000 --resume
  
  # Faster update (less respectful to RCDB)
  python update_coasters.py --start 1 --end 1000 --delay 1
        """
    )
    
    parser.add_argument('--start', type=int, default=1,
                       help='First RCDB ID to fetch (default: 1)')
    parser.add_argument('--end', type=int, default=25000,
                       help='Last RCDB ID to fetch (default: 25000)')
    parser.add_argument('--delay', type=float, default=3.0,
                       help='Seconds between requests (default: 3.0)')
    parser.add_argument('--database', type=str,
                       default='../../database/data/coasters_master.json',
                       help='Path to coasters_master.json')
    parser.add_argument('--preview', action='store_true',
                       help='Preview changes without saving')
    parser.add_argument('--resume', action='store_true',
                       help='Resume from last saved progress')
    
    args = parser.parse_args()
    
    # Resolve database path relative to script location
    script_dir = Path(__file__).parent
    database_path = (script_dir / args.database).resolve()
    
    if not database_path.exists():
        print(f"Error: Database not found at {database_path}")
        sys.exit(1)
    
    print("=" * 60)
    print("RCDB Database Updater")
    print("=" * 60)
    print(f"Database: {database_path}")
    print(f"RCDB ID Range: {args.start} - {args.end}")
    print(f"Delay: {args.delay} seconds")
    print(f"Mode: {'PREVIEW (no changes saved)' if args.preview else 'LIVE'}")
    print(f"Resume: {'Yes' if args.resume else 'No'}")
    print("=" * 60)
    print()
    
    # Estimate time
    total = args.end - args.start + 1
    estimated_hours = (total * args.delay) / 3600
    print(f"Estimated time: {estimated_hours:.1f} hours for {total} coasters")
    print()
    
    if not args.preview:
        response = input("This will modify your database. Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)
    
    print()
    print("Starting update...")
    print()
    
    # Run update
    updater = CoasterUpdater(str(database_path), delay=args.delay, preview=args.preview)
    
    try:
        updater.update_range(args.start, args.end, resume=args.resume)
    except KeyboardInterrupt:
        print()
        print("Update interrupted by user.")
        print("Progress has been saved. Use --resume to continue.")
        sys.exit(0)
    except Exception as e:
        print()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
