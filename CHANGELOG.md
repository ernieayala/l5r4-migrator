# Changelog

All notable changes to the L5R4 World Migrator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing currently in development.

## [1.0.0] - 2025-10-07

**Initial Release** - Complete migration tool for L5R4 → L5R4-Enhanced system migration.

### Added

#### Core Infrastructure (Phase 1)
- **Path Utilities** - Helper functions for nested object manipulation (`getByPath`, `setByPath`, `copyPath`)
- **Logger** - Structured logging system with configurable log levels
- **Data Validators** - Comprehensive validation for actors and items
  - PC/NPC actor validation with all required fields
  - Item validation for all types (skill, weapon, bow, armor, spell, etc.)
  - Legacy field detection and warnings
  - Embedded item validation
- **Test Infrastructure** - Vitest unit testing with 200 passing tests
- **Vitest Setup** - Complete Foundry VTT mocks for testing

#### Backup Service (Phase 2)
- **Create Backup** - Browser download of world data as timestamped JSON
- **Backup Metadata** - Includes world info, system version, statistics
- **Selective Backup** - Options for scenes, journals, playlists, settings
- **Backup Parsing** - Validate and load backup files
- **Backup Restoration** - Complete world restore from backup files
- **Settings Collection** - Export/restore module settings
- 19 unit tests covering all backup operations

#### Export Service (Phase 3)
- **World Export** - Complete data export from l5r4 system
- **Selective Export** - Export specific actors/items or entire world
- **Embedded Data** - Preserves embedded items and Active Effects
- **Validation Integration** - Optional validation during export
- **Download Export** - Automatic JSON file download via browser
- **Export Metadata** - Source system, versions, timestamps, statistics
- 24 unit tests covering export functionality

#### Validation Service (Phase 4)
- **Data Validation** - Comprehensive validation of export data
- **Integrity Checks** - Detects duplicate IDs, legacy items, invalid embedded documents
- **Metadata Validation** - Verifies required fields and system compatibility
- **Readiness Reports** - Migration readiness with prioritized recommendations
- **Compatibility Checking** - Source/target system validation
- **Strict Mode** - Optional strict validation (fail on warnings)
- 28 unit tests covering all validation scenarios

#### Import Service (Phase 5)
- **Schema Transformations** - Automatic field renames (snake_case → camelCase)
  - `heal_rate` → `healRate`
  - `shadow_taint` → `shadowTaint`
  - `roll_mod` → `rollMod`, `keep_mod` → `keepMod`
  - `armor_tn` → `armorTn`
  - Skill fields: `mastery_3` → `mastery3`, `roll_bonus` → `rollBonus`, etc.
  - Armor typo fix: `equiped` → `equipped`
- **Bow Conversion** - Converts `bow` items to `weapon` with `isBow` flag
- **New Fields** - Adds l5r4-enhanced fields:
  - PC: `bonuses`, `woundsPenaltyMod`
  - NPC: `woundMode`, `fear`
  - Skills: `freeRanks`, `freeEmphasis`
  - Weapons: `associatedSkill`, `fallbackTrait`, `isBow`
- **Embedded Item Transformation** - Recursive transformation of actor items
- **Dry Run Mode** - Test transformations without creating documents
- **Import Statistics** - Detailed success/failure counts
- **Error Isolation** - Individual failures don't stop import
- 25 unit tests covering transformations and import

#### User Interface (Phase 6)
- **ApplicationV2 Dialog** - Modern Foundry v13+ architecture
- **System-Aware UI** - Different workflow for l5r4 vs l5r4-enhanced
- **Step-by-Step Workflow** - Numbered steps with visual indicators
- **File Upload** - Upload export JSON files
- **Status Tracking** - Shows export data loaded, validation status
- **Validation Report Dialog** - Detailed readiness report with recommendations
- **Import Results Dialog** - Statistics table with transformation counts
- **Double Confirmation** - Safety checks before destructive operations
- **Progress Feedback** - Toast notifications and status indicators
- **Inline Styles** - Self-contained component with professional design

#### Integration Testing (Phase 7)
- **Quench Integration** - 23 integration tests in running Foundry environment
- **Module Tests** - Verify module loading and API exposure
- **Export Integration** - Test real document export
- **Validation Integration** - Test validation with actual data
- **Import Integration** - Test transformations and dry run
- **Complete Workflow** - End-to-end export → validate → import pipeline
- **Error Handling** - Test invalid data and edge cases
- **Automatic Cleanup** - Test data creation and deletion

#### Documentation (Phase 8)
- **README** - Comprehensive usage guide with workflow steps
- **CHANGELOG** - Complete version history (this file)
- **SCHEMA_DIFF** - Documented field transformations
- **Code Comments** - JSDoc comments throughout codebase
- **Test Documentation** - Test descriptions and coverage reports

### Technical Details

#### Architecture
- **Services Pattern** - Separation of concerns (Backup, Export, Validation, Import)
- **Utility Modules** - Reusable helpers (Logger, Path Utils, Validators)
- **Stateless Design** - All services are static classes
- **Error Handling** - Try-catch blocks with detailed logging
- **Data Integrity** - Non-destructive operations, validation at every step

#### Testing
- **200 Unit Tests** - Vitest tests with complete coverage
- **23 Integration Tests** - Quench tests in Foundry environment
- **100% Service Coverage** - All services fully tested
- **Mock Infrastructure** - Complete Foundry API mocks
- **Test Utilities** - Shared test data and helpers

#### Transformations
- **18 Field Renames** - All documented in SCHEMA_MAP
- **Type-Specific Rules** - Actor/Item type awareness
- **Universal Rules** - Apply to all document types
- **Embedded Recursion** - Transforms nested items
- **Preservation** - Maintains Active Effects, permissions, folders

#### Performance
- **Efficient Validation** - Optional integrity checks
- **Batch Operations** - Single-pass transformations
- **Memory Management** - Uses `foundry.utils.duplicate()`
- **Lazy Loading** - Validates only when needed

### Requirements

- **Foundry VTT**: Version 13 or higher
- **Source System**: l5r4 (legacy system)
- **Target System**: l5r4-enhanced (not yet released)
- **Browser**: Modern browser for file downloads
- **Optional**: Quench module for integration tests

### Known Limitations

- **Compendium Packs**: Not migrated (manual export/import required)
- **Module Settings**: Not migrated between worlds
- **Macros**: May need adjustment for new system APIs
- **File References**: Local file paths not updated

### Migration Safety

- **Non-Destructive Export**: Never modifies source world
- **Validation Required**: Checks data before import
- **Backup Support**: Create backups before operations
- **Dry Run Mode**: Test without creating documents
- **Error Isolation**: Individual failures logged but don't stop process
- **Detailed Logging**: All operations logged to console

### File Structure

```
l5r4-migrator/
├── module/
│   ├── apps/
│   │   └── migrator-ui.js (375 lines)
│   ├── config/
│   │   └── settings.js
│   ├── services/
│   │   ├── backup-service.js (443 lines)
│   │   ├── export-service.js (358 lines)
│   │   ├── validation-service.js (381 lines)
│   │   └── import-service.js (403 lines)
│   ├── testing/
│   │   └── quench-tests.js (390 lines)
│   └── utils/
│       ├── logger.js (103 lines)
│       ├── path-utils.js (123 lines)
│       └── validators.js (734 lines)
├── tests/
│   ├── setup/
│   │   └── vitest-setup.js (Foundry mocks)
│   └── unit/
│       ├── backup-service.test.js (19 tests)
│       ├── export-service.test.js (24 tests)
│       ├── import-service.test.js (25 tests)
│       ├── logger.test.js (12 tests)
│       ├── path-utils.test.js (16 tests)
│       ├── validation-service.test.js (28 tests)
│       └── validators.test.js (76 tests)
├── templates/
│   └── migrator-ui.hbs (284 lines with styles)
├── README.md
├── CHANGELOG.md (this file)
├── module.json
└── package.json
```

### Statistics

- **Total Lines of Code**: ~4,500 lines
- **Unit Tests**: 200 passing
- **Integration Tests**: 23 passing
- **Test Coverage**: 100% of services
- **Documentation**: 500+ lines
- **Development Time**: 7 phases over multiple sessions

---

## Version History Format

### [Version Number] - YYYY-MM-DD

#### Added
New features and capabilities

#### Changed
Changes to existing functionality

#### Deprecated
Features that will be removed in future versions

#### Removed
Features that have been removed

#### Fixed
Bug fixes

#### Security
Security-related changes and fixes

---

[Unreleased]: https://github.com/ernieayala/l5r4-migrator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ernieayala/l5r4-migrator/releases/tag/v0.1.0
