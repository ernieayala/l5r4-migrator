# L5R4 World Migration Guide

Complete step-by-step guide for migrating your world from the legacy **l5r4** system to the modern **l5r4-enhanced** system.

## Table of Contents

1. [Before You Begin](#before-you-begin)
2. [Understanding the Migration](#understanding-the-migration)
3. [Step-by-Step Migration Process](#step-by-step-migration-process)
4. [Schema Detection Deep Dive](#schema-detection-deep-dive)
5. [Troubleshooting](#troubleshooting)
6. [Frequently Asked Questions](#frequently-asked-questions)
7. [Emergency Recovery](#emergency-recovery)
8. [Support](#support)

---

## Before You Begin

### Critical Information

⚠️ **READ THIS FIRST**:

- **DO NOT** attempt to change your existing world's system ID directly
- **DO NOT** skip the backup step
- **DO** test the migration with a world copy first
- **DO** allocate 30-60 minutes for the complete process

### Why You Need This Module

Foundry VTT does not allow changing a world to a different system ID. Since the Enhanced system uses `l5r4-enhanced` instead of `l5r4`, you cannot simply "switch system" in your world settings.

This module provides a safe migration path by:
1. Exporting your data from the l5r4 world
2. Creating a NEW world with the l5r4-enhanced system
3. Importing your data into the new world

### Prerequisites

- **Foundry VTT**: Version 13 or higher
- **Source System**: l5r4 (legacy system) installed
- **Target System**: l5r4-enhanced installed
- **Disk Space**: 2x your world size (for backups and exports)
- **Time**: 30-60 minutes for typical worlds

### What Gets Migrated

✅ **Included**:
- All actors (PCs and NPCs) with complete system data
- All items with embedded items and active effects
- Scenes with tokens, walls, lighting, and notes
- Journal entries with all content and organization
- Folder structure and hierarchy
- Document permissions and ownership

❌ **Not Included**:
- Compendium packs (must be exported/imported manually)
- Module settings (reconfigure in new world)
- World-level settings (reconfigure in new world)
- Macros (may need adjustment for new system APIs)
- Chat log history

---

## Understanding the Migration

### The Two Schema States

The module automatically detects which version of l5r4 your world is using:

#### Original v12/v13 Schema (snake_case)

**Characteristics**:
- Uses snake_case field names: `heal_rate`, `shadow_taint`, `armor_tn`
- Missing modern fields: `bonuses`, `woundMode`, `freeRanks`
- Bow items have type `bow`
- Armor items use `equiped` (typo)

**Migration Path**: Full transformation applied
- Field renames: snake_case → camelCase
- Bow conversion: `bow` → `weapon` with `isBow: true`
- Icon migration: PNG → WEBP (default icons only)
- New fields added with defaults
- Schema fully updated to l5r4-enhanced

#### New v13 Schema (camelCase)

**Characteristics**:
- Uses camelCase field names: `healRate`, `shadowTaint`, `armorTn`
- Has modern fields: `bonuses`, `woundMode`, `freeRanks`
- Bow items already `weapon` type with `isBow: true`
- Armor items use `equipped` (correct)

**Migration Path**: As-is import
- NO transformation applied
- NO field renames
- NO defaults added
- Data preserved exactly as-is

### Schema Detection Process

The module automatically:
1. Samples your export data (first 10 actors and items)
2. Analyzes field patterns and naming conventions
3. Calculates a confidence score (0.3 to 0.95)
4. Determines the schema state
5. Routes to the appropriate import path

**Confidence Levels**:
- **High (≥0.9)**: Strong pattern detected, proceed with confidence
- **Medium (0.7-0.89)**: Reasonable confidence, safe to proceed
- **Low (<0.7)**: Weak pattern, manual review recommended

---

## Step-by-Step Migration Process

### Phase 1: Preparation and Export

#### Step 1: Install the Migrator Module

1. Open Foundry VTT
2. Go to **Add-on Modules** tab
3. Click **Install Module**
4. Paste manifest URL: `https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json`
5. Click **Install**

#### Step 2: Create Backup (CRITICAL)

1. Launch your **existing l5r4 world**
2. Enable **L5R4 World Migrator** module
3. Press **F12** to open browser console
4. Run: `game.modules.get('l5r4-migrator').api.openMigrator()`
5. Click **Create Backup**
6. Verify backup file downloads to your Downloads folder

**Backup File**: `l5r4-backup-YYYY-MM-DD-HHMMSS.json`

#### Step 3: Export World Data

1. In the Migration Dialog, click **Export Data**
2. Wait for export to complete (1-5 minutes)
3. File downloads: `l5r4-export-YYYY-MM-DD-HHMMSS.json`
4. Verify the export file exists

#### Step 4: Create New World

1. Return to Foundry setup screen
2. Click **Create World**
3. **Title**: Choose a new name (e.g., "My World Enhanced")
4. **Game System**: Select **l5r4-enhanced**
5. Click **Create World**
6. Launch the new world

### Phase 2: Validation and Import

#### Step 5: Upload Export File

1. In new **l5r4-enhanced** world, enable the module
2. Open console (F12)
3. Run: `game.modules.get('l5r4-migrator').api.openMigrator()`
4. Click **Upload Export File**
5. Select your export JSON file

#### Step 6: Validate Data (IMPORTANT)

1. Click **Validate Data**
2. Wait for validation (30-60 seconds)
3. Review the **Migration Readiness Report**:
   - **Schema State**: original, new-v13, mixed, or unknown
   - **Confidence**: 0-100%
   - **Import Strategy**: with-transform or as-is

**If confidence ≥ 70% and no errors**: Proceed to import
**If confidence < 70%**: Review carefully before proceeding
**If mixed/unknown**: DO NOT import, contact support

#### Step 7: Import Data

1. Click **Import Data**
2. Review confirmation dialog:
   - Schema state
   - Confidence score
   - Import strategy
3. Confirm the operation
4. Wait for import (2-10 minutes)
5. Review import statistics

#### Step 8: Verify Your Data

Manually check your imported world:
- Open several actors, verify attributes and items
- Check scenes and tokens
- Verify journal entries
- Test functionality

---

## Schema Detection Deep Dive

### How Detection Works

1. **Sampling**: First 10 actors and items analyzed
2. **Pattern Analysis**: Checks for field indicators
3. **State Determination**: Assigns schema state
4. **Confidence Score**: Based on indicator strength

### Field Indicators

**Snake Case (Original)**:
- `heal_rate`, `armor_tn`, `roll_mod`, `mastery_3`, `equiped`

**Camel Case (New v13)**:
- `healRate`, `armorTn`, `rollMod`, `mastery3`, `equipped`

**New Fields (New v13)**:
- `bonuses`, `woundMode`, `fear`, `freeRanks`, `isBow`

### Detection States

**original**: Full transformation applied (snake_case → camelCase)
**new-v13**: As-is import (no transformation)
**mixed**: Error - cannot safely import
**unknown**: Error - indeterminate schema

---

## Troubleshooting

### Export Issues

**Export button does nothing**:
- Check browser console (F12) for errors
- Verify module is enabled
- Refresh page

**Export file is very small**:
- World may have no data
- Verify actors/items exist
- Try exporting again

**Export freezes**:
- Large worlds take 5-10 minutes
- Close other browser tabs
- Be patient

### Validation Issues

**"Unknown schema" error**:
- World may have minimal data
- Check if actors have system data
- Contact support if persists

**"Mixed schema" error**:
- Data may be corrupted
- DO NOT proceed
- Restore from backup
- Contact support

**Low confidence (<70%)**:
- Small worlds may have few indicators
- Review indicators manually
- Verify schema in source world
- Proceed if confident

**Invalid data errors**:
- Check problematic documents
- Fill in missing data
- Re-export

### Import Issues

**Import fails**:
- Check console for errors
- Verify target system is l5r4-enhanced
- Try dry run mode

**Missing actors after import**:
- Check import statistics
- Review console errors
- Manually re-create if needed

**Embedded items missing**:
- Verify source had embedded items
- Check validation report
- Re-export if needed

**Folder structure broken**:
- May conflict with existing folders
- Manually reorganize

---

## Frequently Asked Questions

### Q1: Do I need to migrate?

Only if you want to use l5r4-enhanced. The legacy l5r4 system continues to work.

### Q2: Can I undo the migration?

You cannot undo, but you can delete the new world and keep using the old one. Always keep your backup!

### Q3: How long does it take?

- Small worlds (<50 actors): 15-20 minutes
- Medium worlds (50-200 actors): 20-30 minutes
- Large worlds (200-500 actors): 30-60 minutes

### Q4: Can I migrate multiple worlds?

Yes! Repeat the process for each world independently.

### Q5: Do I need both systems installed?

Yes. l5r4 for source world, l5r4-enhanced for target world.

### Q6: What about my players?

Players just need to connect to your new world. Permissions migrate automatically.

### Q7: What happens to my old world?

Nothing. It remains untouched. You can keep it as backup or delete it later.

### Q8: What is schema detection?

Automatic identification of whether your world uses Original (snake_case) or New v13 (camelCase) schema.

### Q9: What's "with-transform" vs "as-is"?

- **with-transform**: Applies field renames and updates (Original schema)
- **as-is**: No changes, preserves everything (New v13 schema)

### Q10: Can I force a specific path?

Yes, via console API with `skipDetection: true` option. Only do this if certain.

### Q11: Are custom fields preserved?

Yes. Both import paths preserve custom fields.

### Q12: What about Active Effects?

Active Effects migrate, but may need manual adjustment if they reference old field names.

### Q13: Can I test without creating documents?

Yes! Use dry run mode:
```javascript
const result = await game.modules.get('l5r4-migrator').api.ImportService.importWorld(exportData, { dryRun: true });
```

### Q14: What transformations are applied?

For Original schema: field renames (snake_case → camelCase), bow conversion, new fields added. See DEVELOPERS.md for details.

### Q15: Does this work with Foundry v12?

No. Requires Foundry VTT v13 or higher.

### Q16: What happens to actor and item icons?

**Automatic Migration**: Default system icons are automatically migrated from PNG to WEBP format.

**Preserved**:
- Custom/external icons (remain unchanged)
- Module icons (remain unchanged)
- URLs and data URIs (remain unchanged)
- Foundry core icons (remain unchanged)

**Migrated Icons**:
- Actor defaults: `helm.png` → `pc.webp`, `ninja.png` → `npc.webp`
- Item defaults: `yin-yang.png` → `advantage.webp`, `sword.png` → `weapon.webp`, etc.
- Token images (if using default system icons)

The migration is **extremely conservative**: it only changes exact default PNG filenames, protecting your custom artwork. All .webp files, non-system paths (tokenizer, modules), and custom PNG files are preserved unchanged.

---

## Emergency Recovery

### If Import Fails Catastrophically

1. **Stay Calm** - Your source world is safe
2. **Close Foundry VTT**
3. **Delete the new world** (it's corrupted)
4. **Restart Foundry**
5. **Check your source world** (should be unchanged)
6. **Review error logs** (F12 console)
7. **Contact support** with error details

### If Source World is Corrupted

1. **DO NOT PANIC**
2. **Locate your backup file**: `l5r4-backup-YYYY-MM-DD-HHMMSS.json`
3. **Use BackupService to restore**:
   ```javascript
   // Upload backup file contents
   const backupData = /* paste backup JSON */;
   const result = await game.modules.get('l5r4-migrator').api.BackupService.restoreBackup(backupData);
   ```
4. **Verify restoration**
5. **Contact support** if issues persist

### If New World is Corrupted

1. **Delete the new world**
2. **Create a fresh l5r4-enhanced world**
3. **Re-run the import** (you still have the export file)
4. **If problem persists**, contact support

---

## Support

### Getting Help

**GitHub Issues**: [Report bugs and issues](https://github.com/ernieayala/l5r4-migrator/issues)
**GitHub Discussions**: [Ask questions and discuss](https://github.com/ernieayala/l5r4-migrator/discussions)

### When Reporting Issues

Include:
1. Foundry VTT version
2. Module version
3. Source system version
4. Error messages from console (F12)
5. Validation report (if applicable)
6. Steps to reproduce

### Additional Resources

- **README.md**: Quick start guide
- **DEVELOPERS.md**: Technical documentation and API
- **CHANGELOG.md**: Version history and features

---

**Always back up your worlds before migration. This module is provided as-is without warranty. Test thoroughly with a copy of your world first.**

