"""
RCDB Database Updater
Main script for updating coaster database from RCDB
"""

import json
import argparse
import time
from pathlib import Path
from typing import List, Dict
from rcdb_scraper import RCDBScraper
from database_merger_simple import DatabaseMerger


class ProgressTracker:
    """Track progress of update to enable resuming"""
    
    def __init__(self, progress_file: str = "update_progress.json"):
        self.progress_file = Path(progress_file)
        self.completed: List[int] = []
        self.failed: List[int] = []
        self.load()
    
    def load(self):
        """Load progress from file"""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                data = json.load(f)
                self.completed = data.get('completed', [])
                self.failed = data.get('failed', [])
    
    def save(self):
        """Save progress to file"""
        with open(self.progress_file, 'w') as f:
            json.dump({
                'completed': self.completed,
                'failed': self.failed
            }, f, indent=2)
    
    def mark_completed(self, rcdb_id: int):
        """Mark RCDB ID as completed"""
        if rcdb_id not in self.completed:
            self.completed.append(rcdb_id)
    
    def mark_failed(self, rcdb_id: int):
        """Mark RCDB ID as failed"""
        if rcdb_id not in self.failed:
            self.failed.append(rcdb_id)
    
    def is_completed(self, rcdb_id: int) -> bool:
        """Check if RCDB ID was already completed"""
        return rcdb_id in self.completed


def update_database(
    start_id: int,
    end_id: int,
    delay: float = 3.0,
    preview: bool = False,
    resume: bool = False,
    save_interval: int = 50
):
    """
    Update database from RCDB
    
    Args:
        start_id: First RCDB ID to scrape
        end_id: Last RCDB ID to scrape (inclusive)
        delay: Delay between requests in seconds
        preview: If True, don't save changes
        resume: If True, skip already completed IDs
        save_interval: Save database every N coasters
    """
    
    print("=" * 70)
    print("RCDB DATABASE UPDATER")
    print("=" * 70)
    print(f"Range: RCDB {start_id} to {end_id}")
    print(f"Delay: {delay} seconds")
    print(f"Preview mode: {preview}")
    print(f"Resume mode: {resume}")
    print("=" * 70)
    print()
    
    # Setup paths
    database_dir = Path(__file__).parent.parent.parent / "database" / "data"
    database_path = database_dir / "coasters_master.json"
    mapping_path = database_dir / "rcdb_to_custom_mapping.json"
    
    # Initialize
    scraper = RCDBScraper(delay=delay)
    merger = DatabaseMerger(str(database_path), str(mapping_path))
    progress = ProgressTracker()
    
    # Stats
    scraped_count = 0
    not_found_count = 0
    split_count = 0
    total_coasters = 0
    scraped_batch = []
    
    # Process range
    total_ids = end_id - start_id + 1
    
    for i, rcdb_id in enumerate(range(start_id, end_id + 1), 1):
        # Skip if already completed (resume mode)
        if resume and progress.is_completed(rcdb_id):
            print(f"[{i}/{total_ids}] RCDB {rcdb_id}: SKIPPED (already completed)")
            continue
        
        # Scrape coaster
        print(f"[{i}/{total_ids}] RCDB {rcdb_id}: Scraping...", end=" ", flush=True)
        
        result = scraper.fetch_coaster(rcdb_id)
        
        if result is None:
            print("NOT FOUND")
            not_found_count += 1
            progress.mark_completed(rcdb_id)
            continue
        
        # Handle result
        if isinstance(result, list):
            # Split coaster
            print(f"✓ SPLIT ({len(result)} tracks)")
            for coaster in result:
                scraped_batch.append(coaster)
            split_count += 1
            total_coasters += len(result)
        else:
            # Single coaster
            print(f"✓ {result.get('name', 'Unknown')}")
            scraped_batch.append(result)
            total_coasters += 1
        
        scraped_count += 1
        progress.mark_completed(rcdb_id)
        
        # Save periodically
        if len(scraped_batch) >= save_interval:
            print()
            print(f"--- Saving batch of {len(scraped_batch)} coasters ---")
            stats = merger.merge_coasters(scraped_batch)
            
            if not preview:
                merger.save(backup=True)
                progress.save()
            
            print(f"Updated: {stats['updated']}, Added: {stats['added']}, Preserved splits: {stats['preserved_splits']}")
            print()
            
            scraped_batch = []
    
    # Final save
    if scraped_batch:
        print()
        print(f"--- Final save: {len(scraped_batch)} coasters ---")
        stats = merger.merge_coasters(scraped_batch)
        
        if not preview:
            merger.save(backup=True)
            progress.save()
        
        print(f"Updated: {stats['updated']}, Added: {stats['added']}, Preserved splits: {stats['preserved_splits']}")
    
    # Summary
    print()
    print("=" * 70)
    print("UPDATE COMPLETE!")
    print("=" * 70)
    print(f"RCDB IDs processed: {scraped_count}")
    print(f"Not found: {not_found_count}")
    print(f"Split coasters: {split_count}")
    print(f"Total coasters: {total_coasters}")
    print(f"Database size: {len(merger.database)} coasters")
    print("=" * 70)
    
    if preview:
        print()
        print("⚠️  PREVIEW MODE - No changes were saved")
        print("Run without --preview to save changes")


def main():
    parser = argparse.ArgumentParser(
        description="Update coaster database from RCDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Update first 100 coasters
  python update_coasters.py --start 1 --end 100
  
  # Update with custom delay
  python update_coasters.py --start 1 --end 100 --delay 5.0
  
  # Preview without saving
  python update_coasters.py --start 1 --end 10 --preview
  
  # Resume after interruption
  python update_coasters.py --start 1 --end 1000 --resume
        """
    )
    
    parser.add_argument('--start', type=int, required=True,
                        help='First RCDB ID to scrape')
    parser.add_argument('--end', type=int, required=True,
                        help='Last RCDB ID to scrape (inclusive)')
    parser.add_argument('--delay', type=float, default=3.0,
                        help='Delay between requests in seconds (default: 3.0)')
    parser.add_argument('--preview', action='store_true',
                        help='Preview mode - do not save changes')
    parser.add_argument('--resume', action='store_true',
                        help='Resume mode - skip already completed IDs')
    parser.add_argument('--save-interval', type=int, default=50,
                        help='Save database every N coasters (default: 50)')
    
    args = parser.parse_args()
    
    # Validate
    if args.start < 1:
        parser.error("--start must be >= 1")
    if args.end < args.start:
        parser.error("--end must be >= --start")
    if args.delay < 0:
        parser.error("--delay must be >= 0")
    
    # Run update
    try:
        update_database(
            start_id=args.start,
            end_id=args.end,
            delay=args.delay,
            preview=args.preview,
            resume=args.resume,
            save_interval=args.save_interval
        )
    except KeyboardInterrupt:
        print()
        print()
        print("=" * 70)
        print("INTERRUPTED BY USER")
        print("=" * 70)
        print("Progress has been saved.")
        print("Run with --resume to continue from where you left off.")
        print("=" * 70)


if __name__ == "__main__":
    main()
