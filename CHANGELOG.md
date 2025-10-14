# Changelog

All notable changes to the L5R4 World Migrator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing currently in development.

## [1.0.1] - 2025-10-14

### Added
- **Asset Migration** - Automatic icon migration from PNG to WEBP format
  - Migrates default system icons (actors and items)
  - Type-aware icon mapping (e.g., `tori.png` → `family.webp` or `kiho.webp` based on type)
  - Protects custom/external icons from modification
  - Applies to both document icons and token images
  - Smart detection: only migrates known system defaults
- **Roll Table Support** - Complete roll table export and import
  - Added `includeTables` option to export service (default: true)
  - Added `skipTables` option to import service
  - Roll tables exported via `game.tables` collection
  - Import supports both transformation and as-is paths
  - Tables preserved with complete data (results, formulas, etc.)

## [1.0.0] - 2025-10-11

**Initial Release** - Complete migration tool for L5R4 → L5R4-Enhanced system migration.

### Added

#### Core Infrastructure
- **Path Utilities** - Helper functions for nested object manipulation (`getByPath`, `setByPath`, `copyPath`)
- **Logger** - Structured logging system with configurable log levels
- **Data Validators** - Comprehensive validation for actors and items
  - PC/NPC actor validation with all required fields
  - Item validation for all types (skill, weapon, bow, armor, spell, etc.)
  - Legacy field detection and warnings
  - Embedded item validation
- **Test Infrastructure** - Vitest unit testing with 260 passing tests
- **Vitest Setup** - Complete Foundry VTT mocks for testing

#### Backup Service
- **Create Backup** - Browser download of world data as timestamped JSON
- **Backup Metadata** - Includes world info, system version, statistics
- **Selective Backup** - Options for scenes, journals, playlists, settings
- **Backup Parsing** - Validate and load backup files
- **Backup Restoration** - Complete world restore from backup files
- **Settings Collection** - Export/restore module settings
- 19 unit tests covering all backup operations

#### Export Service
- **World Export** - Complete data export from l5r4 system
- **Selective Export** - Export specific actors/items or entire world
- **Embedded Data** - Preserves embedded items and Active Effects
- **Validation Integration** - Optional validation during export
- **Download Export** - Automatic JSON file download via browser
- **Export Metadata** - Source system, versions, timestamps, statistics
- 24 unit tests covering export functionality

#### Schema State Detection
- **SchemaStateDetectionService** - Automatically detects Original v12/v13 vs New v13 schemas
  - Analyzes field patterns (snake_case vs camelCase)
  - Checks for new fields (bonuses, woundMode, freeRanks, isBow)
  - Samples first 10 actors/items for efficient detection
  - Calculates confidence scores (0.3, 0.75, 0.95)
  - Returns state ('original', 'new-v13', 'mixed', 'unknown')
- 20 comprehensive tests for schema detection
  - All schema states covered
  - Edge cases (empty data, sparse data, minimal data)
  - Confidence calculation verification

#### Validation Service
- **Data Validation** - Comprehensive validation of export data
- **Schema Detection Integration** - Automatic schema detection during validation
  - Warns on low confidence (<0.7)
  - Errors on unknown or mixed schemas
  - Detection results included in validation report
- **Integrity Checks** - Detects duplicate IDs, legacy items, invalid embedded documents
- **Metadata Validation** - Verifies required fields and system compatibility
- **Readiness Reports** - Migration readiness with prioritized recommendations
- **Compatibility Checking** - Source/target system validation
- **Strict Mode** - Optional strict validation (fail on warnings)
- 28 unit tests covering all validation scenarios

#### Import Service with Dual Paths
- **Intelligent Routing** - Routes imports based on schema detection
  - `_importWithTransform()` - Original v12/v13 → Enhanced (with transformation)
  - `_importAsIs()` - New v13 → Enhanced (preserves customizations)
  - Automatic detection and routing
  - `skipDetection` option to force transformation path
- **Schema Transformations** (With-Transform Path) - Automatic field renames (snake_case → camelCase)
  - `heal_rate` → `healRate`
  - `shadow_taint` → `shadowTaint`
  - `roll_mod` → `rollMod`, `keep_mod` → `keepMod`
  - `armor_tn` → `armorTn`
  - Skill fields: `mastery_3` → `mastery3`, `roll_bonus` → `rollBonus`, etc.
  - Armor typo fix: `equiped` → `equipped`
- **As-Is Import** (New Path) - For New v13 data
  - No schema transformation applied
  - Preserves all user customizations
  - No default values added
  - Perfect data fidelity
- **Bow Conversion** - Converts `bow` items to `weapon` with `isBow` flag (with-transform only)
- **New Fields** - Adds l5r4-enhanced fields (with-transform only):
  - PC: `bonuses`, `woundsPenaltyMod`
  - NPC: `woundMode`, `fear`
  - Skills: `freeRanks`, `freeEmphasis`
  - Weapons: `associatedSkill`, `fallbackTrait`, `isBow`
- **Embedded Item Transformation** - Recursive transformation of actor items
- **Dry Run Mode** - Test transformations without creating documents
- **Import Statistics** - Detailed success/failure counts with path information
- **Error Isolation** - Individual failures don't stop import
- **Comprehensive Testing** - 65 unit tests covering:
  - 25 transformation and import tests
  - 18 dual path routing tests
  - 22 robustness tests (corrupted data, edge cases, large datasets)

#### User Interface
- **ApplicationV2 Dialog** - Modern Foundry v13+ architecture
- **System-Aware UI** - Different workflow for l5r4 vs l5r4-enhanced
- **Step-by-Step Workflow** - Numbered steps with visual indicators
- **Schema Detection Display** - Visual feedback after validation
  - Blue detection box in status section
  - Shows schema state, confidence, and import strategy
  - Color-coded confidence (green/orange/red)
  - State-based styling (Original/New v13/Mixed)
- **File Upload** - Upload export JSON files
- **Status Tracking** - Shows export data loaded, validation status, schema detection
- **Enhanced Validation Report** - Detailed readiness report with schema detection section
  - Dedicated Schema Detection section
  - Full detection details before summary
  - Recommendations based on detected state
- **Enhanced Confirmation Dialog** - Import confirmation shows detection
  - Schema state with label
  - Confidence score with color coding
  - Import strategy clearly stated
  - Strong backup warnings
- **Import Results Dialog** - Statistics with path information
  - Shows which path was taken (with-transform or as-is)
  - Transformation counts when applicable
  - Preservation confirmation for as-is imports
- **Double Confirmation** - Safety checks before destructive operations
- **Progress Feedback** - Toast notifications and status indicators
- **Professional Design** - Self-contained component with inline styles

#### Integration Testing
- **Quench Integration** - 23 integration tests in running Foundry environment
- **Module Tests** - Verify module loading and API exposure
- **Export Integration** - Test real document export
- **Validation Integration** - Test validation with actual data
- **Import Integration** - Test transformations and dry run
- **Complete Workflow** - End-to-end export → validate → import pipeline
- **Error Handling** - Test invalid data and edge cases
- **Automatic Cleanup** - Test data creation and deletion

#### Documentation
- **README** - Comprehensive usage guide with workflow steps
  - "Why Do I Need This Module?" section explaining namespace issue
  - Automatic schema detection described
  - Both migration paths documented
  - Updated workflow steps with schema validation checkpoints
- **MIGRATION_GUIDE** - 500+ line comprehensive guide
  - Complete step-by-step instructions (7 detailed steps)
  - Schema detection deep dive with examples
  - Troubleshooting section (20+ scenarios with solutions)
  - FAQ (20+ questions with detailed answers)
  - Emergency recovery procedures
  - Support information
- **DEVELOPERS** - Technical documentation with schema detection architecture
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
- **260 Unit Tests** - Vitest tests with complete coverage
  - 20 schema detection tests
  - 18 import path tests
  - 22 robustness tests
  - 200 existing service/utility tests
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

[Unreleased]: https://github.com/ernieayala/l5r4-migrator/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ernieayala/l5r4-migrator/releases/tag/v1.0.0
