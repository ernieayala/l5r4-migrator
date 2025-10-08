# L5R4 World Migrator

A Foundry VTT v13+ module for migrating worlds from the legacy **l5r4** system to the modern **l5r4-enhanced** system.

## Features

- **Safe Migration**: Create timestamped backups with browser download
- **Complete Data Export**: Exports actors, items, scenes, journal entries, folders, and all embedded data
- **Schema Transformation**: Automatically converts snake_case → camelCase, bow → weapon, and adds new fields
- **Data Validation**: Comprehensive validation with migration readiness reports
- **Integrity Checks**: Detects duplicate IDs, legacy items, and invalid embedded documents
- **Clean Import**: Creates new documents in target world without modifying source
- **Dry Run Mode**: Test transformations before actual import
- **Progress Tracking**: Visual feedback and detailed statistics
- **Error Reporting**: Graceful failure handling with detailed logs
- **User-Friendly UI**: Step-by-step workflow with status indicators

## Installation

### From Manifest URL (Recommended)

1. Open Foundry VTT
2. Go to **Add-on Modules** tab
3. Click **Install Module**
4. Paste this URL in the **Manifest URL** field:
   ```
   https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
   ```
5. Click **Install**
6. Enable the module in your world

### Foundry VTT Module Browser

1. Open Foundry VTT
2. Go to **Add-on Modules** tab
3. Click **Install Module**
4. Search for "L5R4 World Migrator"
5. Click **Install**

### Manual Installation

1. Download the latest `l5r4-migrator.zip` from [GitHub Releases](https://github.com/ernieayala/l5r4-migrator/releases/latest)
2. Extract to `Data/modules/l5r4-migrator/`
3. Restart Foundry VTT
4. Enable the module in your world

## Usage

### Migration Workflow

#### Phase 1: Export from l5r4 System

1. **Create Backup** (Recommended)
   - Open your source world running **l5r4** system
   - Open the migrator: Settings → Module Settings → L5R4 Migration Tool
   - Click **Create Backup** → Download saves to your browser Downloads folder

2. **Export World Data**
   - Click **Export Data** button
   - Migration JSON file downloads automatically
   - Keep this file safe - it contains all your world data

3. **Switch Systems**
   - Return to world selection
   - Edit world settings
   - Change system to **l5r4-enhanced**
   - Launch the world

#### Phase 2: Import to l5r4-enhanced System

4. **Upload Export File**
   - Open the migrator in your l5r4-enhanced world
   - Click **Upload Export File**
   - Select the JSON file from step 2

5. **Validate Data**
   - Click **Validate Data** button
   - Review the migration readiness report
   - Address any errors if shown

6. **Import**
   - Click **Import Data** button
   - Confirm the operation
   - Review import statistics
   - Verify your data migrated correctly

**Total Time**: 15-30 minutes for typical worlds

### Accessing the Migrator

- **Settings Sidebar**: Click the **L5R4 World Migrator** button
- **Console**: `game.modules.get('l5r4-migrator').api.openMigrator()`

## Requirements

- **Foundry VTT**: Version 13 or higher
- **Source System**: l5r4 v1.0.0+
- **Target System**: l5r4-enhanced (when available)
- **Recommended**: [Quench](https://github.com/Ethaks/FVTT-Quench) module for integration testing

## Configuration

Access module settings in **Configure Settings > Module Settings**:

- **Backup Location**: Directory for world backups (default: `data/backups`)
- **Automatic Backup**: Auto-backup before migrations (default: enabled)
- **Log Level**: Console logging verbosity (default: info)

## Data Migration Details

### What Gets Migrated

- **Actors**: All actor types (PC, NPC) with complete system data
- **Items**: All item types with embedded items and active effects
- **Scenes**: Scene data, tokens, walls, lights
- **Journal Entries**: All journal content and structure
- **Folders**: Complete folder organization
- **Permissions**: Document ownership and permissions

### Data Transformations

The migrator handles these transformations automatically:

**Field Renames** (snake_case → camelCase):

- `system.wounds.heal_rate` → `system.wounds.healRate`
- `system.shadow_taint` → `system.shadowTaint`
- `system.initiative.roll_mod` → `system.initiative.rollMod`
- `system.armor.armor_tn` → `system.armor.armorTn`
- Skills: `roll_bonus` → `rollBonus`, `mastery_3` → `mastery3`, etc.
- Armor: `equiped` → `equipped` (typo fix)

**Item Type Conversions**:

- `bow` → `weapon` with `system.isBow: true` flag
- Size normalization: `Large` → `large`

**New Fields Added**:

- PC actors: `bonuses`, `woundsPenaltyMod`
- NPC actors: `woundMode`, `fear`
- Skills: `freeRanks`, `freeEmphasis`
- Weapons: `associatedSkill`, `fallbackTrait`, `isBow`

**Preserved**:

- All embedded items on actors
- Active Effects
- Folder structure
- Document permissions

### What Doesn't Migrate

- Compendium packs (export/import manually)
- Module settings
- World-level settings
- Macros (may need adjustment for new system APIs)

## Development

See [DEVELOPERS.md](DEVELOPERS.md) for complete development documentation, including:

- Development setup and workflow
- Project structure and architecture
- Testing guide (unit and integration tests)
- Schema transformation details
- Programmatic API examples
- Contributing guidelines

## Troubleshooting

### Migration Fails

1. Check the console for error messages
2. Verify source data exports successfully
3. Run validation before import
4. Check that target system is l5r4-enhanced
5. Restore from backup if needed

### Missing Data After Import

1. Check the import report for skipped items
2. Review validation warnings
3. Check document permissions
4. Verify embedded items were included in export

### Performance Issues

Large worlds may take time to process:

- Export: ~1-5 minutes for 100+ actors
- Validation: ~30 seconds for typical worlds
- Import: ~2-10 minutes depending on document count

## Support

- **Issues**: [GitHub Issues](https://github.com/ernieayala/l5r4-migrator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ernieayala/l5r4-migrator/discussions)

## License

[MIT License](LICENSE) - See LICENSE file for details

## Credits

**Author**: Ernie Ayala  
**System**: Based on Legend of the Five Rings 4th Edition

---

**Important**: Always back up your worlds before migration. This module is provided as-is without warranty. Test thoroughly with a copy of your world first.
