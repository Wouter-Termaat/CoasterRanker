# PowerShell Commands - Quick Reference

## Navigate to Scripts Folder

```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
```

## 1. Test the System (SAFE - uses copies)

```powershell
python test_merger.py
```

## 2. Clean Up Test Files

```powershell
cd ..\..\database\data
Remove-Item test_database.json, test_mapping.json
cd ..\..\scripts\database
```

## 3. Run First Real Batch (200 coasters)

```powershell
python update_coasters_simple.py --start 1 --end 200
```

## 4. Continue with More Batches

```powershell
# Next 200
python update_coasters_simple.py --start 201 --end 400

# Next 200
python update_coasters_simple.py --start 401 --end 600

# Bigger batch (500 coasters)
python update_coasters_simple.py --start 601 --end 1100
```

## 5. Resume After Interruption

```powershell
python update_coasters_simple.py --start 1 --end 1000 --resume
```

## 6. Preview Mode (see what would change)

```powershell
python update_coasters_simple.py --start 1 --end 10 --preview
```

## 7. Custom Delay (slower/faster)

```powershell
# Slower (5 seconds between requests)
python update_coasters_simple.py --start 1 --end 200 --delay 5.0

# Faster (2 seconds) - not recommended
python update_coasters_simple.py --start 1 --end 200 --delay 2.0
```

## 8. Check Backups

```powershell
cd ..\..\database\data
Get-ChildItem *.backup* | Sort-Object LastWriteTime -Descending | Select-Object -First 10
```

## 9. Restore from Backup

```powershell
cd ..\..\database\data

# Find latest backup
$latest = Get-ChildItem coasters_master.json.backup_* | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Restore database
Copy-Item coasters_master.json coasters_master.json.broken
Copy-Item $latest.FullName coasters_master.json

# Restore mapping
$latest_map = Get-ChildItem rcdb_to_custom_mapping.json.backup_* | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item rcdb_to_custom_mapping.json rcdb_to_custom_mapping.json.broken
Copy-Item $latest_map.FullName rcdb_to_custom_mapping.json

cd ..\..\scripts\database
```

## 10. Clean Up Old Backups (keep last 10)

```powershell
cd ..\..\database\data
Get-ChildItem *.backup_* | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 | Remove-Item
cd ..\..\scripts\database
```

## 11. Check Progress

```powershell
Get-Content update_progress.json
```

## 12. Reset Progress (start fresh)

```powershell
Remove-Item update_progress.json
```

## 13. Test Single Coaster

```powershell
# Big One
python test_single_coaster.py 775

# Joris en de Draak (split coaster)
python test_single_coaster.py 4526
```

## 14. Run Automated Batches (overnight)

```powershell
# First, edit run_batches.py to configure your range
# Then run:
python run_batches.py
```

## Common Workflows

### Initial Testing
```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
python test_merger.py
cd ..\..\database\data
Remove-Item test_*.json
cd ..\..\scripts\database
python update_coasters_simple.py --start 1 --end 100
```

### Regular Update Session
```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
python update_coasters_simple.py --start 1 --end 500
python update_coasters_simple.py --start 501 --end 1000
python update_coasters_simple.py --start 1001 --end 1500
```

### Overnight Automated Run
```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
# Edit run_batches.py first!
python run_batches.py
```

### Fix After Error
```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
python update_coasters_simple.py --start 1 --end 1000 --resume
```

## Install Dependencies

```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"
pip install requests beautifulsoup4
```

## One-Liner: Full Test to First Batch

```powershell
cd "C:\Users\Wouter Termaat\OneDrive - Topicus\Documenten\Privé\CoasterRanker\scripts\database"; python test_merger.py; cd ..\..\database\data; Remove-Item test_*.json; cd ..\..\scripts\database; python update_coasters_simple.py --start 1 --end 200
```
