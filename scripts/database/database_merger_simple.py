"""
Simple Database Merger
Merges scraped RCDB data with existing database using rcdb_to_custom_mapping.json
Preserves your existing split coasters and custom IDs
"""

import json
import shutil
from pathlib import Path
from typing import Dict, List, Union
from datetime import datetime


class DatabaseMerger:
    """Merges scraped data into existing database"""
    
    def __init__(self, database_path: str, mapping_path: str):
        self.database_path = Path(database_path)
        self.mapping_path = Path(mapping_path)
        self.database: Dict[str, Dict] = {}  # custom_id -> coaster data
        self.mapping: Dict[str, str] = {}  # rcdb_id -> custom_id
        
        self._load_files()
    
    def _load_files(self):
        """Load database and mapping files"""
        # Load database
        if self.database_path.exists():
            with open(self.database_path, 'r', encoding='utf-8') as f:
                self.database = json.load(f)
            print(f"✓ Loaded {len(self.database)} coasters from database")
        
        # Load mapping
        if self.mapping_path.exists():
            with open(self.mapping_path, 'r', encoding='utf-8') as f:
                self.mapping = json.load(f)
            print(f"✓ Loaded {len(self.mapping)} mappings")
    
    def merge_coasters(self, scraped_coasters: List[Dict]) -> Dict:
        """
        Merge list of scraped coasters into database
        
        Args:
            scraped_coasters: List of coaster dicts from scraper
            
        Returns:
            Stats about merge operation
        """
        updated_count = 0
        added_count = 0
        preserved_splits = 0
        updated_ids = []
        added_ids = []
        
        for coaster in scraped_coasters:
            rcdb_id = str(coaster.get('rcdbId'))
            
            if not rcdb_id:
                continue
            
            # Check if we have a custom ID for this RCDB ID
            if rcdb_id in self.mapping:
                custom_id = self.mapping[rcdb_id]
                
                # Update existing coaster
                if custom_id in self.database:
                    self._update_coaster(custom_id, coaster)
                    updated_count += 1
                    updated_ids.append(custom_id)
                    
                    # Check if this is a split coaster (other tracks exist)
                    if self._is_split_coaster(rcdb_id):
                        preserved_splits += 1
                else:
                    # Mapping exists but coaster not in database (orphaned mapping)
                    print(f"⚠️  Warning: Mapping exists for RCDB {rcdb_id} → {custom_id} but coaster not in database")
            else:
                # New coaster - need to assign custom ID
                custom_id = self._assign_new_id(coaster)
                self.database[custom_id] = coaster
                self.database[custom_id]['id'] = custom_id
                self.mapping[rcdb_id] = custom_id
                added_count += 1
                added_ids.append(custom_id)
        
        return {
            "updated": updated_count,
            "added": added_count,
            "preserved_splits": preserved_splits,
            "total_coasters": len(self.database),
            "updated_ids": updated_ids,
            "added_ids": added_ids
        }
    
    def _update_coaster(self, custom_id: str, scraped_data: Dict):
        """Update existing coaster with scraped data"""
        existing = self.database[custom_id]
        
        # Fields to update from RCDB
        update_fields = [
            'name', 'parkName', 'city', 'country', 'status', 'opened',
            'manufacturer', 'model', 'type', 'design',
            'height', 'drop', 'speed', 'length', 'inversions', 'elements', 'duration'
        ]
        
        for field in update_fields:
            if field in scraped_data and scraped_data[field]:
                existing[field] = scraped_data[field]
        
        # Always update rcdbId
        if 'rcdbId' in scraped_data:
            existing['rcdbId'] = scraped_data['rcdbId']
    
    def _is_split_coaster(self, rcdb_id: str) -> bool:
        """Check if this RCDB ID has other tracks (manual splits)"""
        # Count how many custom IDs map to this RCDB ID
        count = sum(1 for rid in self.mapping.values() if self.mapping.get(rid) == rcdb_id)
        return count > 1
    
    def _assign_new_id(self, coaster: Dict) -> str:
        """Assign new custom ID for coaster"""
        # Try to extract country and park from coaster data
        # This is a simplified version - in production you'd have proper mapping
        
        # For now, use a simple sequential ID
        # Find highest ID number
        max_id = 0
        for custom_id in self.database.keys():
            if custom_id.startswith('C') and len(custom_id) >= 10:
                try:
                    # Extract numeric parts
                    num = int(custom_id[7:])
                    if num > max_id:
                        max_id = num
                except ValueError:
                    pass
        
        # Generate new ID (this is simplified - real version would use proper country/park codes)
        new_id = f"C999{max_id + 1:06d}"
        return new_id
    
    def save(self, backup: bool = True):
        """
        Save database and mapping to files
        
        Args:
            backup: If True, create backup before saving
        """
        if backup:
            self._create_backup()
        
        # Save database
        with open(self.database_path, 'w', encoding='utf-8') as f:
            json.dump(self.database, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved database: {self.database_path}")
        
        # Save mapping
        with open(self.mapping_path, 'w', encoding='utf-8') as f:
            json.dump(self.mapping, f, indent=2)
        print(f"✓ Saved mapping: {self.mapping_path}")
    
    def _create_backup(self):
        """Create timestamped backup of database files"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Backup database
        if self.database_path.exists():
            backup_path = self.database_path.parent / f"coasters_master.json.backup_{timestamp}"
            shutil.copy(self.database_path, backup_path)
            print(f"✓ Created backup: {backup_path}")
        
        # Backup mapping
        if self.mapping_path.exists():
            backup_path = self.mapping_path.parent / f"rcdb_to_custom_mapping.json.backup_{timestamp}"
            shutil.copy(self.mapping_path, backup_path)
            print(f"✓ Created backup: {backup_path}")


if __name__ == "__main__":
    print("Database Merger - Use test_merger.py for testing")
