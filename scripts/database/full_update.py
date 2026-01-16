"""
Full Database Update
Updates ALL coasters from RCDB in one run
This will take 10-15 hours to complete
"""

import subprocess
import sys
from datetime import datetime


def full_update():
    """
    Run a complete update of the entire RCDB database
    
    This will scrape RCDB IDs 1 through 20000 (covers all existing coasters)
    Expected time: 10-15 hours
    """
    
    print("=" * 70)
    print("FULL RCDB DATABASE UPDATE")
    print("=" * 70)
    print()
    print("This will update ALL coasters from RCDB")
    print()
    print("Details:")
    print("  - RCDB ID range: 1 to 20,000")
    print("  - Delay: 3 seconds per coaster")
    print("  - Estimated time: 10-15 hours")
    print("  - Auto-resume: YES (if interrupted)")
    print("  - Auto-backup: YES (every 50 coasters)")
    print()
    print("The script will:")
    print("  ✓ Create automatic backups before saving")
    print("  ✓ Save progress every 50 coasters")
    print("  ✓ Allow you to resume if interrupted (Ctrl+C)")
    print("  ✓ Show live progress in this window")
    print()
    print("⚠️  IMPORTANT:")
    print("  - Keep this window open (minimize is OK)")
    print("  - Don't let your computer sleep")
    print("  - You can press Ctrl+C to stop anytime")
    print("  - Run again to resume from where you stopped")
    print()
    print("=" * 70)
    print()
    
    response = input("Ready to start full update? (yes/no): ").strip().lower()
    
    if response not in ['yes', 'y']:
        print("Cancelled.")
        return
    
    print()
    print("Starting full update...")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("=" * 70)
    print()
    
    # Run the update with resume enabled
    cmd = [
        sys.executable,  # Use same Python interpreter
        'update_coasters_simple.py',
        '--start', '1',
        '--end', '20000',
        '--delay', '3.0',
        '--resume'
    ]
    
    try:
        result = subprocess.run(cmd)
        
        print()
        print("=" * 70)
        if result.returncode == 0:
            print("FULL UPDATE COMPLETE!")
            print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print("Update stopped or encountered errors")
            print("You can run this script again to resume")
        print("=" * 70)
        
    except KeyboardInterrupt:
        print()
        print()
        print("=" * 70)
        print("UPDATE INTERRUPTED")
        print("=" * 70)
        print()
        print("Progress has been saved!")
        print("Run this script again to resume from where you stopped:")
        print("  python full_update.py")
        print()
        print("=" * 70)


if __name__ == "__main__":
    full_update()
