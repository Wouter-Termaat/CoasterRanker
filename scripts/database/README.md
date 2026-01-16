# RCDB Database Updater

Automated system to keep your CoasterRanker database up-to-date with the latest data from RCDB.com.

## Overview

This toolset consists of three Python scripts that work together:

1. **rcdb_scraper.py** - Fetches coaster data from RCDB website
2. **database_merger.py** - Intelligently merges scraped data with your existing database
3. **update_coasters.py** - Main script you run to orchestrate everything

## Features

✅ **Automatic Split Detection** - Detects dueling/racing coasters from RCDB "Tracks" table  
✅ **Preserves Your Splits** - Never merges your existing split coasters back together  
✅ **Smart ID Assignment** - Follows C+xxx+xxxx+xx format for new coasters  
✅ **Resume Capability** - Interrupted? Just restart with --resume flag  
✅ **Progress Tracking** - Saves progress every 10 coasters  
✅ **Preview Mode** - See what changes before applying them  
✅ **Rate Limiting** - Respectful 3-second delay between requests  
✅ **Logging** - Complete log of all changes in update_log.txt  

## Installation

1. **Install Python Dependencies**

```bash
cd "c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
pip install -r requirements.txt
```

The requirements.txt contains:
```
requests>=2.31.0
beautifulsoup4>=4.12.0
```

## Usage

### Basic Update

Update a range of RCDB IDs (e.g., 1-1000):

```bash
python update_coasters.py --start 1 --end 1000
```

### Full Database Update

Update all coasters (RCDB has ~25,000 IDs, takes ~20 hours):

```bash
python update_coasters.py --start 1 --end 25000
```

⏱️ **Estimated time**: 3 seconds × 25,000 = ~20.8 hours

### Preview Changes First

See what would change without modifying your database:

```bash
python update_coasters.py --start 1 --end 100 --preview
```

### Resume Interrupted Update

If your update was interrupted (power loss, internet issue, etc.):

```bash
python update_coasters.py --start 1 --end 25000 --resume
```

This continues from where it left off using the saved progress file.

### Faster Updates (Less Respectful)

Reduce delay between requests (not recommended for large updates):

```bash
python update_coasters.py --start 1 --end 1000 --delay 1.5
```

## Command-Line Options

```
--start N          First RCDB ID to fetch (default: 1)
--end N           Last RCDB ID to fetch (default: 25000)
--delay SECONDS   Seconds between requests (default: 3.0)
--database PATH   Path to coasters_master.json (auto-detected)
--preview         Preview changes without saving
--resume          Resume from last saved progress
```

## How It Works

### 1. Scraping (rcdb_scraper.py)

- Fetches coaster page from https://rcdb.com/{id}.htm
- Parses HTML to extract name, stats, park, etc.
- Detects "Tracks" table for split coasters (dueling/racing)
- Returns single dict or list of dicts (for splits)

### 2. Merging (database_merger.py)

- Loads your existing coasters_master.json
- Matches by `rcdbId` field
- **Existing coaster**: Updates fields with new RCDB data
- **Existing split**: Preserves all IDs, updates each track
- **New coaster**: Generates C+xxx+xxxx+xx ID
- **New split**: Generates consecutive IDs (e.g., C04901160**9**, C04901161**0**)

### 3. Orchestration (update_coasters.py)

- Loops through RCDB ID range
- Calls scraper for each ID
- Determines country code and park ID
- Calls merger to update database
- Saves progress every 10 coasters
- Logs all changes to update_log.txt

## Understanding the Output

### During Update

```
[2026-01-16 14:23:45] [1/1000] Fetching RCDB 1235...
[2026-01-16 14:23:48]   Track 1: updated - C049011609
[2026-01-16 14:23:48]   Track 2: updated - C049011610
[2026-01-16 14:23:51] [2/1000] Fetching RCDB 1236...
[2026-01-16 14:23:54]   added - C049011615
```

- **updated** - Existing coaster, fields were updated
- **preserved** - Existing coaster, no changes needed
- **added** - New coaster added to database

### Progress Summary (Every 10 Coasters)

```
Progress: 100/1000 (10.0%)
  Added: 15, Updated: 80, Errors: 5
  Rate: 0.28 coasters/sec, ETA: 53.2 min
```

## Files Created

- **update_progress.json** - Resume point (RCDB ID, counts, timestamp)
- **update_log.txt** - Complete log of all operations
- **coasters_master.json** - Your updated database (backed up automatically)

## Important Notes

### Split Coasters

Your existing 246 split coasters are **preserved forever**. The system:
- Detects splits by `rcdbId` having multiple entries in database
- Never merges them back together
- Updates each track independently

### New Split Coasters

When RCDB has a new split coaster (e.g., new dueling coaster opens):
- Scraper detects "Tracks" table in HTML
- Creates separate entry for each track
- Assigns consecutive IDs: C049011615, C049011616

### Country Codes

The script uses your existing country codes from the database. For new countries:
- Edit the `COUNTRY_CODES` dict in update_coasters.py
- Or the system will load from database/data/countries.json if it exists

### Park IDs

- Existing parks: Uses park ID from your database
- New parks: Generates next available 4-digit ID for that country

## Troubleshooting

### "Unknown country: XYZ"

Add the country to `COUNTRY_CODES` in update_coasters.py:

```python
COUNTRY_CODES = {
    "Germany": "049",
    "Netherlands": "031",
    "Your Country": "XXX",  # Add this
    # ...
}
```

### Update Too Slow

You can reduce the delay, but be respectful to RCDB:

```bash
python update_coasters.py --start 1 --end 1000 --delay 2.0
```

### Resume Not Working

Delete `update_progress.json` to start fresh:

```bash
del update_progress.json
python update_coasters.py --start 1 --end 25000
```

### Preview vs Live Mode

Always test with `--preview` first on a small range:

```bash
# Test first
python update_coasters.py --start 1 --end 10 --preview

# Then run for real
python update_coasters.py --start 1 --end 10
```

## Recommended Workflow

### Monthly Update

1. **Backup your database** (just in case)
   ```bash
   copy "..\..\database\data\coasters_master.json" "..\..\database\data\coasters_master.backup.json"
   ```

2. **Preview a small range** to verify everything works
   ```bash
   python update_coasters.py --start 1 --end 100 --preview
   ```

3. **Run full update** (plan for overnight)
   ```bash
   python update_coasters.py --start 1 --end 25000
   ```

4. **Check the log** for any issues
   ```bash
   type update_log.txt
   ```

### Quick Update (New Coasters Only)

If you just updated last month, only check the latest IDs:

```bash
# RCDB's highest ID is usually around 22000-23000
python update_coasters.py --start 22000 --end 25000
```

This takes ~2.5 hours instead of 20 hours.

## Example Sessions

### First Time Setup

```bash
cd "c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
pip install requests beautifulsoup4
python update_coasters.py --start 1 --end 100 --preview
# Review output, looks good?
python update_coasters.py --start 1 --end 25000
```

### Monthly Refresh

```bash
cd "c:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
python update_coasters.py --start 20000 --end 25000
```

### Fix Interrupted Update

```bash
# Power went out at RCDB ID 5432?
python update_coasters.py --start 1 --end 25000 --resume
# Continues from 5433
```

## Testing the Scripts

Each script has a built-in test function:

```bash
# Test scraper
python rcdb_scraper.py

# Test merger
python database_merger.py

# Test updater
python update_coasters.py --start 1 --end 5 --preview
```

## Support

If you encounter issues:
1. Check update_log.txt for error messages
2. Run with --preview first to see what would happen
3. Test with a small range (--start 1 --end 10)
4. Verify your internet connection to rcdb.com

---

**Happy coaster hunting! 🎢**
