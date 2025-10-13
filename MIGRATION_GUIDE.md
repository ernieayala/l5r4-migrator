# Migration Guide

Migrate from **l5r4** to **l5r4-enhanced** system.

## Before You Start

⚠️ **Critical:**
- Don't change system ID directly
- Always create backup first
- Test with world copy first
- Allow 30-60 minutes

**Included:** Actors, items, scenes, journals, folders, permissions, embedded items, Active Effects

**Not Included:** Compendiums, settings, macros, chat history

## How It Works

Module auto-detects your schema:

**Original v12/v13:** snake_case fields → Full transformation (renames, conversions, icon updates)

**New v13:** camelCase fields → As-is import (no changes)

**Confidence levels:**
- High (≥90%) - Proceed
- Medium (70-89%) - Safe to proceed
- Low (<70%) - Review carefully

## Migration Steps

### 1. Export from l5r4 World

1. In l5r4 world, press F12, run: `game.modules.get('l5r4-migrator').api.openMigrator()`
2. Click **Create Backup** (downloads to browser)
3. Click **Export Data** (saves JSON file)

### 2. Create New World

4. Return to setup, create NEW world with **l5r4-enhanced** system

### 3. Import to l5r4-enhanced World

5. In new world, press F12, run: `game.modules.get('l5r4-migrator').api.openMigrator()`
6. Click **Upload Export File**
7. Click **Validate Data**, review report (check confidence %)
8. Click **Import Data**, confirm
9. Verify actors, scenes, journals work correctly


## Troubleshooting

**Export fails:** Check console (F12), verify module enabled, refresh page

**Validation errors:**
- Unknown/mixed schema → Contact support
- Low confidence (<70%) → Review manually before proceeding
- Invalid data → Fix issues, re-export

**Import fails:** Check console, verify target is l5r4-enhanced, try validation first

**Missing data:** Check import stats and console errors

## FAQ

**Do I need to migrate?** Only if you want l5r4-enhanced. Legacy l5r4 still works.

**Can I undo?** No, but your old world is untouched. Keep your backup.

**How long?** 15-60 minutes depending on world size.

**Multiple worlds?** Yes, repeat for each.

**Need both systems?** Yes, during migration.

**Custom icons?** Preserved. Only default PNG icons update to WEBP.

**Active Effects?** Migrate but may need adjustment if they reference old field names.

**Dry run test?**
```javascript
await game.modules.get('l5r4-migrator').api.ImportService.importWorld(exportData, { dryRun: true });
```

## Emergency Recovery

**Import fails:** Source world is safe. Delete new world, check console errors, contact support.

**Source world corrupted:** Restore from backup:
```javascript
const backupData = /* backup JSON */;
await game.modules.get('l5r4-migrator').api.BackupService.restoreBackup(backupData);
```

**New world corrupted:** Delete it, create fresh world, re-import.

## Support

[GitHub Issues](https://github.com/ernieayala/l5r4-migrator/issues) • [Discussions](https://github.com/ernieayala/l5r4-migrator/discussions)

**When reporting:** Include Foundry version, module version, console errors (F12), and steps to reproduce.

---

⚠️ **Always back up before migrating. Test with world copy first.**
