---
trigger: always_on
---

# Windsurf AI Instructions - L5R4 Migration Module

## Acknowledgment Protocol
**FIRST MESSAGE ONLY**: Begin with "I read all your migration module instructions Ernie."

## Critical Constraints

### File Paths
- **CRITICAL**: Verify complete absolute path before every MultiEdit call
- **NEVER** submit truncated paths
- Format: `[project_root]\path\to\file.ext`

### Project Rules
- **NEVER** touch `node_modules`
- **NO** downloadable items
- **NO** unsolicited refactoring
- **ALWAYS** show diffs for changes
- Change only what's required

---

## Project Overview

**Purpose**: Module to migrate Foundry VTT worlds from legacy `l5r4` to modern `l5r4-enhanced` system

**Key Difference**: Legacy system uses older Foundry APIs, enhanced uses v13+ ApplicationV2 architecture

**Your Job**: Build tools to help users backup, export, validate, and import world data between systems

---

## Reference Materials

### Foundry VTT API
https://foundryvtt.com/api/

Focus on:
- Document classes (Actor, Item, Scene, JournalEntry)
- World and Compendium management
- File operations
- ApplicationV2 and DialogV2

### Source System Structure
Base: `C:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4\`

**Study these files:**
- `module\setup\migrations.js` - Migration patterns
- `module\setup\schema-map.js` - Field transformations
- `module\documents\actor.js` - Actor structure
- `module\documents\item.js` - Item structure
- `template.json` - Schema definitions

**Important**: Existing migrations handle same-world updates. Your module handles cross-world transfers.

---

## Data Structures

### Actor System Data
Essential fields under `system`:
- `traits.*` - 8 traits (sta, wil, str, per, ref, awa, agi, int)
- `rings.*` - Elemental rings
- `xp`, `insight.*`, `honor.*`, `glory.*`, `status.*`
- `wounds.*`, `armor.*`, `initiative.*`
- Embedded `items` array
- `effects` array (Active Effects)
- `flags.l5r4.*`

### Item System Data
Type-specific under `system`:
- **skill**: `rank`, `trait`, `emphasis`, `*Bonus`
- **weapon**: `damage*`, `explodesOn`, `associatedSkill`, `isBow`
- **armor**: `bonus`, `reduction`, `equipped`
- **spell**: `mastery`, `ring`

### Legacy Issues
- Old snake_case fields may exist (check schema-map.js for transformations)
- "bow" type items converted to "weapon" with `isBow` flag in target system
- Some fields have different structures between systems

---

## Testing

### Vitest
For pure JS without Foundry runtime:
- Transformation functions
- Validation logic
- Utilities

### Quench
For Foundry-dependent operations:
- Document CRUD
- World/Compendium access
- Full workflows

### Required Coverage
- Data integrity through export/import cycle
- Edge cases: nulls, missing fields, legacy formats
- Document/item counts match
- Embedded documents preserved
- Active Effects intact
- Rollback works

---

## Ground Rules

### Safety Protocol
1. Backup before ALL operations
2. Never modify source world
3. Validate before import
4. Provide rollback
5. Log critical operations

### User Communication
- Status updates at each stage
- Progress indicators for long ops
- Detailed success/failure reports
- Use i18n keys for UI text
- Console.log technical details

### Development Standards
- Check actual file contents before changes
- Show accurate diffs with existing code
- Don't fabricate structures
- Ask when uncertain

---

## Workflow Requirements

**Core Operations:**
1. Backup source world → timestamped archive
2. Export data → `.toObject()` with embedded docs and effects
3. Validate → check required fields, data types, structure
4. Import → `Document.create()` in target world
5. Verify → compare counts, check integrity
6. Rollback → restore from backup on failure

**Error Handling:**
- Individual failures don't stop batch operations
- Log each failure with context
- Report summary at end
- Offer recovery steps