# L5R4 World Migrator

Migrate Foundry VTT worlds from **l5r4** to **l5r4-enhanced** system (v13+).

## Why This Module?

Foundry doesn't allow changing system IDs. This module exports your l5r4 world data and imports it into a new l5r4-enhanced world.

Automatically detects your source version and applies correct transformations:
- **Original v12/v13** → Full schema transformation
- **New v13** → As-is import

## Features

- **Auto-detection** - Identifies schema version and routes data correctly
- **Safe** - Timestamped backups, dry-run mode, validation before import
- **Complete** - Migrates actors, items, scenes, journals, folders, embedded data
- **Smart Assets** - Updates default PNG icons to WEBP, preserves custom artwork

## Installation

**Manifest URL:**
```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

Or search "L5R4 World Migrator" in Foundry's module browser.

## Usage

### Quick Start

**In your l5r4 world:**
1. Press F12, run: `game.modules.get('l5r4-migrator').api.openMigrator()`
2. Click **Create Backup** (saves to Downloads)
3. Click **Export Data** (saves JSON file)

**Create new world:**
4. Return to setup, create NEW world with **l5r4-enhanced** system

**In your new l5r4-enhanced world:**
5. Press F12, run: `game.modules.get('l5r4-migrator').api.openMigrator()`
6. Click **Upload Export File**, select JSON from step 3
7. Click **Validate Data**, review report
8. Click **Import Data**, confirm, done

**Time:** 15-30 minutes typical

## Requirements

- Foundry VTT v13+
- Source: l5r4 system
- Target: l5r4-enhanced system

## Settings

Configure in **Module Settings**:
- Backup location (default: `data/backups`)
- Auto-backup before migrations (default: on)
- Log level (default: info)

## What Migrates

**Included:** Actors, items, scenes, journals, folders, permissions, embedded items, Active Effects

**Not Included:** Compendiums, module/world settings, macros

**Transformations (Original v12/v13 only):**
- Field renames: snake_case → camelCase (`heal_rate` → `healRate`)
- Item conversions: `bow` → `weapon` with `isBow: true`
- Icon updates: Default PNG → WEBP (custom artwork preserved)
- New fields added with defaults

## Documentation

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Troubleshooting and FAQs
- [DEVELOPERS.md](DEVELOPERS.md) - API and development


## Troubleshooting

**Migration fails:** Check console (F12), run validation first, verify target is l5r4-enhanced

**Missing data:** Check import report and validation warnings

**Slow:** Large worlds take 5-10 minutes to process

## Support

[GitHub Issues](https://github.com/ernieayala/l5r4-migrator/issues) • [Discussions](https://github.com/ernieayala/l5r4-migrator/discussions)

## License

MIT License - See LICENSE file

**Author:** Ernie Ayala

---

⚠️ **Always back up before migrating. Test with a world copy first.**
