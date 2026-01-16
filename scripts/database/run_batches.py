"""
Automated Batch Runner
Runs multiple update batches automatically with configurable batch size and delays
"""

import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime

def run_batch(start, end, delay=3.0):
    """Run a single batch"""
    print("\n" + "=" * 80)
    print(f"BATCH: RCDB {start} - {end}")
    print("=" * 80)
    
    # Run update_coasters.py
    cmd = [
        sys.executable,
        "update_coasters.py",
        "--start", str(start),
        "--end", str(end),
        "--delay", str(delay)
    ]
    
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    
    if result.returncode != 0:
        print(f"❌ Batch {start}-{end} failed!")
        return False
    
    print(f"✓ Batch {start}-{end} completed successfully")
    return True


def run_batches(total_range, batch_size=200, delay=3.0, pause_between_batches=60):
    """
    Run multiple batches automatically
    
    Args:
        total_range: Tuple of (start_id, end_id) for entire range
        batch_size: Number of coasters per batch (default 200 = ~1 hour)
        delay: Delay between requests in seconds (default 3.0)
        pause_between_batches: Pause between batches in seconds (default 60)
    """
    start_id, end_id = total_range
    
    print("=" * 80)
    print("AUTOMATED BATCH UPDATE")
    print("=" * 80)
    print(f"Range: RCDB {start_id} - {end_id}")
    print(f"Batch size: {batch_size} coasters")
    print(f"Delay per request: {delay} seconds")
    print(f"Estimated time per batch: ~{(batch_size * delay) / 3600:.1f} hours")
    print(f"Pause between batches: {pause_between_batches} seconds")
    
    # Calculate batches
    batches = []
    current = start_id
    while current <= end_id:
        batch_end = min(current + batch_size - 1, end_id)
        batches.append((current, batch_end))
        current = batch_end + 1
    
    print(f"\nTotal batches: {len(batches)}")
    print(f"Estimated total time: ~{(len(batches) * batch_size * delay) / 3600:.1f} hours")
    
    # Confirm
    response = input("\nStart automated batch processing? (yes/no): ").strip().lower()
    if response != 'yes':
        print("❌ Cancelled")
        return
    
    # Run batches
    start_time = datetime.now()
    successful = 0
    failed = 0
    
    for i, (batch_start, batch_end) in enumerate(batches, 1):
        print(f"\n\n{'=' * 80}")
        print(f"BATCH {i}/{len(batches)}")
        print(f"{'=' * 80}")
        
        if run_batch(batch_start, batch_end, delay):
            successful += 1
        else:
            failed += 1
            
            # Ask if should continue after failure
            response = input("\nBatch failed. Continue with next batch? (yes/no): ").strip().lower()
            if response != 'yes':
                print("❌ Batch processing stopped")
                break
        
        # Pause between batches (except after last batch)
        if i < len(batches):
            print(f"\n⏸️  Pausing {pause_between_batches} seconds before next batch...")
            time.sleep(pause_between_batches)
    
    # Summary
    end_time = datetime.now()
    elapsed = end_time - start_time
    
    print("\n\n" + "=" * 80)
    print("BATCH PROCESSING COMPLETE")
    print("=" * 80)
    print(f"Successful batches: {successful}/{len(batches)}")
    print(f"Failed batches: {failed}/{len(batches)}")
    print(f"Total time: {elapsed}")
    print(f"Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Finished: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    # Example configurations:
    
    # Small test: first 1000 coasters
    # run_batches((1, 1000), batch_size=200, delay=3.0)
    
    # Medium: first 5000 coasters
    # run_batches((1, 5000), batch_size=200, delay=3.0)
    
    # Full database: all coasters (adjust end_id as needed)
    # run_batches((1, 25000), batch_size=200, delay=3.0)
    
    print("Automated Batch Runner")
    print("=" * 80)
    print("\nEdit this file to configure your batch run:")
    print("  1. Uncomment one of the run_batches() calls at the bottom")
    print("  2. Adjust parameters as needed:")
    print("     - Range: (start_id, end_id)")
    print("     - batch_size: coasters per batch (200 = ~1 hour)")
    print("     - delay: seconds between requests (3.0 recommended)")
    print("     - pause_between_batches: rest time (60 seconds)")
    print("\nExample:")
    print("  run_batches((1, 1000), batch_size=200, delay=3.0)")
    print("\nThen run: python run_batches.py")
