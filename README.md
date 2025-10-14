# L5R4 World Migrator

[![FoundryVTT version](https://img.shields.io/badge/FVTT-v13.x-informational)](https://foundryvtt.com/)
[![Version](https://img.shields.io/badge/Version-1.0.1-blue)](https://github.com/ernieayala/l5r4-migrator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/ernieayala/l5r4-migrator)](https://github.com/ernieayala/l5r4-migrator/issues)

Migrate Foundry VTT worlds from **l5r4** to **l5r4-enhanced** system (v13+).

## Why This Module?

You can't switch an existing world from l5r4 to l5r4-enhanced - Foundry doesn't allow it. Instead, this module:

1. Copies all your characters, items, and scenes from your old world
2. Creates them in a new l5r4-enhanced world
3. Automatically handles any format differences between the systems

Your original world stays untouched as a backup.

## Features

- **Automatic** - Detects your world version and handles conversion automatically
- **Safe** - Creates backups and checks everything before importing
- **Complete** - Copies characters, items, scenes, journals, and folder organization
- **Smart** - Updates system icons while keeping your custom artwork

## Installation

**Manifest URL:**

```
https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
```

Or search "L5R4 World Migrator" in Foundry's module browser.

## Usage

### Quick Start

**In your l5r4 world:**

1. Open Settings (⚙️), click **L5R4 World Migrator** button
2. Click **Create Backup** - saves a safety copy to your Downloads folder
3. Click **Export Data** - saves your world data file to Downloads

**Create new world:** 4. Exit to main menu (Return to Setup) 5. Click **Create World**, select **l5r4-enhanced** system, name it, and create 6. Launch your new world

**In your new l5r4-enhanced world:** 7. Open Settings (⚙️), click **L5R4 World Migrator** button 8. Click **Upload Export File**, choose the file from step 3 9. Click **Validate Data** - checks if everything looks good 10. Click **Import Data**, confirm - your characters and items are now copied over 11. Check a few characters and scenes to make sure everything looks right

## Requirements

- Foundry VTT v13+
- Source: l5r4 system
- Target: l5r4-enhanced system

## Settings

Configure in **Module Settings**:

- Backup location (default: `data/backups`)
- Auto-backup before migrations (default: on)
- Log level (default: info)

## What Gets Copied

**Included:**

- Characters (PCs and NPCs) with all their stats and items
- Standalone items in your world
- Scenes (maps, tokens, lighting, walls)
- Journal entries and notes
- Folder organization
- Permissions (who owns what)

**Not Included:**

- Compendium packs (system-provided content)
- Module settings
- Macros (may need manual recreation)
- Chat history

**Note:** The module automatically updates data format for older worlds. Your custom character portraits and item images are preserved.

## Documentation

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Troubleshooting and FAQs
- [DEVELOPERS.md](DEVELOPERS.md) - API and development

## Troubleshooting

**Migration fails:**

- Make sure you ran Validate Data first
- Verify the new world is using l5r4-enhanced system
- Press F12 to see error details, share them when asking for help

**Missing characters or items:**

- Check the import report shown after import completes
- Look for warnings during the Validate Data step

## Support

[GitHub Issues](https://github.com/ernieayala/l5r4-migrator/issues) • [Discussions](https://github.com/ernieayala/l5r4-migrator/discussions)

## License

MIT License - See LICENSE file

**Author:** Ernie Ayala

---

⚠️ **Always back up before migrating. Test with a world copy first.**
