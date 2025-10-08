# Developer Guide

Complete development documentation for the L5R4 World Migrator module.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Testing](#testing)
4. [Schema Transformations](#schema-transformations)
5. [Programmatic API](#programmatic-api)
6. [Contributing](#contributing)
7. [Release Process](#release-process)

---

## Development Setup

### Prerequisites

- **Node.js**: 18+ and npm
- **Foundry VTT**: Version 13+ for testing
- **Git**: For version control

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/l5r4-migrator.git
   cd l5r4-migrator
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

1. **Make your changes** in your feature branch
2. **Write tests** for new functionality
3. **Run tests** to verify everything works:
   ```bash
   npm test
   ```
4. **Check code quality**:
   ```bash
   npm run lint
   npm run format:check
   ```
5. **Commit your changes** with clear messages:
   ```bash
   git commit -m "feat: add actor export functionality"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request** on GitHub

---

## Project Structure

### Directory Layout

```
l5r4-migrator/
├── module/                 # Source code
│   ├── apps/              # ApplicationV2 UI components
│   │   └── migrator-ui.js # Main migration UI
│   ├── config/            # Configuration and settings
│   │   └── settings.js    # Module settings registration
│   ├── services/          # Business logic services
│   │   ├── backup-service.js      # World backup functionality
│   │   ├── export-service.js      # Data export from l5r4
│   │   ├── validation-service.js  # Data validation
│   │   └── import-service.js      # Data import to l5r4-enhanced
│   ├── utils/             # Utility functions
│   │   ├── logger.js      # Logging utility
│   │   ├── path-utils.js  # Nested object helpers
│   │   └── validators.js  # Data validators
│   └── testing/           # In-Foundry tests
│       └── quench-tests.js # Quench integration tests
│
├── templates/             # Handlebars templates
│   └── migrator-ui.hbs   # Main UI template
│
├── styles/                # CSS stylesheets
│   └── l5r4-migrator.css # Module styles
│
├── lang/                  # Localization
│   └── en.json           # English translations
│
└── tests/                # Testing infrastructure
    ├── unit/             # Vitest unit tests
    ├── integration/      # Additional integration test resources
    ├── fixtures/         # Test data
    ├── mocks/            # Foundry API mocks
    ├── helpers/          # Test utilities
    └── setup/            # Test environment setup
        └── vitest-setup.js # Foundry mock initialization
```

### Key Components

**Entry Point** (`l5r4-migrator.js`):

- Registers settings
- Initializes UI
- Sets up hooks
- Registers Quench tests
- Exposes module API

**UI Layer** (`module/apps/`):

- **MigratorUI**: ApplicationV2-based migration interface

**Service Layer** (`module/services/`):

- **BackupService**: Create/restore world backups
- **ExportService**: Export actors, items, scenes from l5r4
- **ValidationService**: Validate data structure and integrity
- **ImportService**: Import data into l5r4-enhanced with transformations

**Configuration** (`module/config/`):

- **settings.js**: Module settings (backup location, auto-backup, log level)

**Utilities** (`module/utils/`):

- **logger.js**: Centralized logging with configurable levels
- **path-utils.js**: Helper functions for nested object manipulation
- **validators.js**: Comprehensive data validation functions

### Architecture Patterns

**Service Pattern**:

```javascript
export class BackupService {
  static async createBackup(options = {}) {
    // Implementation
  }
}
```

**UI Pattern** (ApplicationV2):

```javascript
export class MigratorUI extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    /* ... */
  };
  static PARTS = {
    /* ... */
  };
  static async #onAction(event, target) {
    /* ... */
  }
}
```

**Migration Flow**:

```
User Action (UI) → Service Layer → Foundry API
                ↓
              Logger
                ↓
           Notifications
```

### Path Aliases

Configured in `vitest.config.js`:

- `@module` → `./module/`
- `@tests` → `./tests/`
- `@mocks` → `./tests/mocks/`
- `@fixtures` → `./tests/fixtures/`
- `@helpers` → `./tests/helpers/`

---

## Testing

### Unit Tests (Vitest)

Unit tests run in Node.js with mocked Foundry APIs. They're fast and don't require Foundry to be running.

```bash
# Run all unit tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open interactive Vitest UI
npm run test:ui
```

**Write unit tests for:**

- Utility functions
- Data transformation logic
- Validation rules
- Any code that doesn't require Foundry runtime

**Example:**

```javascript
import { describe, it, expect } from 'vitest';
import { ValidationService } from '@module/services/validation-service.js';

describe('ValidationService', () => {
  it('should validate actor data', () => {
    const actorData = { name: 'Test', type: 'pc' };
    const result = ValidationService.validateActor(actorData);
    expect(result.valid).toBe(true);
  });
});
```

### Integration Tests (Quench)

Integration tests run inside Foundry VTT and have access to the full Foundry API.

1. Install and enable the [Quench](https://github.com/Ethaks/FVTT-Quench) module
2. Enable the l5r4-migrator module in your world
3. Launch Foundry VTT and open your test world
4. Open Quench from the module settings
5. Select "L5R4 Migrator" test batches
6. Click "Run Selected"

**Write integration tests for:**

- Document CRUD operations
- Full migration workflows
- UI interactions
- Anything requiring Foundry runtime

**Example:**

```javascript
quench.registerBatch('l5r4-migrator.export', (context) => {
  const { describe, it, assert } = context;

  describe('Export Service', () => {
    it('should export actor data', async () => {
      const actor = await Actor.create({ name: 'Test', type: 'pc' });
      const data = await ExportService.exportActors([actor.id]);
      assert.equal(data.length, 1);
      await actor.delete();
    });
  });
});
```

### Test Coverage

**Coverage Goals:**

- **Services**: 80%+ coverage
- **Utilities**: 90%+ coverage
- **UI Components**: 60%+ coverage
- **Overall**: 70%+ coverage

View coverage:

```bash
npm run test:coverage
# Open tests/coverage/index.html in a browser
```

### Available Mocks

Foundry API mocks are in `tests/mocks/` and loaded automatically:

- `game` - Game instance
- `CONFIG` - Configuration object
- `foundry` - Foundry namespace
- `CONST` - Constants
- `Hooks` - Hook system
- Document classes: `Actor`, `Item`, `Scene`, etc.
- Utility functions: `getProperty`, `setProperty`, `mergeObject`, etc.

### Test Fixtures

Test data goes in `tests/fixtures/`:

```javascript
// tests/fixtures/sample-actor.js
export const sampleActor = {
  name: 'Sample Actor',
  type: 'pc',
  system: { traits: { stamina: 2, willpower: 2 } }
};
```

### Best Practices

- **Test one thing** per test case
- **Use descriptive names** for test suites and cases
- **Arrange-Act-Assert** pattern for clarity
- **Clean up** after tests (delete created documents)
- **Avoid test interdependencies** - each test should be independent
- **Mock external dependencies** in unit tests
- **Test edge cases** (null, undefined, empty, invalid)
- **Test error handling** (verify throws and error messages)

---

## Schema Transformations

The module handles automatic transformation of data from the legacy l5r4 system to the modern l5r4-enhanced system.

### Actor Schema Changes

**Field Renames (snake_case → camelCase):**

- `wounds.heal_rate` → `wounds.healRate`
- `shadow_taint` → `shadowTaint`
- `initiative.roll_mod` → `initiative.rollMod`
- `initiative.keep_mod` → `initiative.keepMod`
- `armor.armor_tn` → `armor.armorTn`

**New Fields Added:**

- PC actors: `bonuses`, `woundsPenaltyMod`
- NPC actors: `woundMode`, `fear`

### Item Schema Changes

**Skill Items:**

- `mastery_3` → `mastery3`
- `mastery_5` → `mastery5`
- `mastery_7` → `mastery7`
- `roll_bonus` → `rollBonus`
- `keep_bonus` → `keepBonus`
- `insight_bonus` → `insightBonus`
- New fields: `freeRanks`, `freeEmphasis`

**Weapon Items:**

- New fields: `associatedSkill`, `fallbackTrait`, `isBow`
- Size normalization: `"Large"` → `"large"`

**Armor Items:**

- Typo fix: `equiped` → `equipped`

**Bow Items:**

- **Critical**: `bow` type converted to `weapon` with `isBow: true`

### Migration Strategy

**Export Phase:**

1. Preserve ALL fields (both snake_case and camelCase if present)
2. Capture embedded items using `.toObject()`
3. Capture Active Effects
4. Capture all system flags

**Validation Phase:**

1. Check required fields exist
2. Validate data types
3. Flag legacy patterns (snake_case, bow items, etc.)

**Import Phase:**

1. Apply field renames using transformation rules
2. Convert bow → weapon with `isBow: true`
3. Add new fields with defaults
4. Normalize casing (weapon size to lowercase)
5. Transform embedded items recursively

### Reference Files

- **Old Schema**: Located in l5r4 system `template.json`
- **New Schema**: Located in l5r4-enhanced system `template.json`
- **Migration Rules**: Check l5r4-enhanced `module/setup/schema-map.js`

---

## Programmatic API

### Access the Module API

```javascript
// Get the module
const migrator = game.modules.get('l5r4-migrator');

// Access services
const { ExportService, ValidationService, ImportService, BackupService } = migrator.api;
```

### Export Examples

**Export Full World:**

```javascript
const result = await ExportService.exportWorld({
  includeScenes: true,
  includeJournals: true,
  validate: true
});

console.log(`Exported ${result.stats.actors} actors, ${result.stats.items} items`);
ExportService.downloadExport(result.data);
```

**Export Specific Actors:**

```javascript
const actorIds = game.actors.contents.filter((a) => a.type === 'pc').map((a) => a.id);

const result = await ExportService.exportActors(actorIds, true);
console.log(`Exported ${result.count} PC actors`);
```

### Validation Examples

**Validate Export Data:**

```javascript
const validation = await ValidationService.validateData(exportData, {
  strict: false,
  checkIntegrity: true
});

const report = ValidationService.generateReadinessReport(validation);
console.log(`Ready: ${report.ready}`);
console.log(`Valid: ${report.summary.validDocuments}`);
console.log(`Invalid: ${report.summary.invalidDocuments}`);
```

**Check for Issues:**

```javascript
// Find duplicate IDs
const duplicates = validation.integrityIssues.filter(
  (i) => i.type === 'duplicate_actor_ids' || i.type === 'duplicate_item_ids'
);

// Find legacy bow items
const bowIssue = validation.integrityIssues.find((i) => i.type === 'legacy_bow_items');
if (bowIssue) {
  console.log(`Found ${bowIssue.count} bow items that will be converted`);
}
```

### Import Examples

**Dry Run (Test Transformations):**

```javascript
const result = await ImportService.importWorld(exportData, {
  dryRun: true,
  skipScenes: false,
  skipJournals: false
});

console.log(`Would create:`);
console.log(`  Actors: ${result.stats.actors.created}`);
console.log(`  Items: ${result.stats.items.created}`);
console.log(`  Transformed: ${result.stats.actors.transformed} actors`);
```

**Actual Import:**

```javascript
// CAUTION: This creates documents!
const result = await ImportService.importWorld(exportData, {
  dryRun: false
});

console.log(`Created: ${result.stats.actors.created} actors, ${result.stats.items.created} items`);
console.log(`Failed: ${result.stats.actors.failed} actors, ${result.stats.items.failed} items`);
```

### Backup Examples

**Create Backup:**

```javascript
const backup = await BackupService.createBackup({
  includeSettings: true,
  includeScenes: true,
  includeJournals: true
});

console.log(`Backup: ${backup.filename}`);
console.log(`Contains: ${backup.metadata.stats.actors} actors`);
```

**Restore from Backup:**

```javascript
// CAUTION: This deletes existing data!
const result = await BackupService.restoreBackup(backupData, {
  deleteExisting: true,
  restoreSettings: false
});

console.log(`Restored: ${result.stats.created.actors} actors`);
```

### Console Helpers

Add these to your browser console for quick access:

```javascript
// Quick export
window.quickExport = async () => {
  const result = await game.modules.get('l5r4-migrator').api.ExportService.exportWorld();
  game.modules.get('l5r4-migrator').api.ExportService.downloadExport(result.data);
  console.log('Export complete!');
};

// Quick validation check
window.checkExport = async (exportData) => {
  const validation = await game.modules.get('l5r4-migrator').api.ValidationService.validateData(exportData);
  const report = game.modules.get('l5r4-migrator').api.ValidationService.generateReadinessReport(validation);
  console.table(report.summary);
  return report;
};
```

---

## Contributing

### Code Standards

**Style Guide:**

- Use ES6+ features: Classes, arrow functions, async/await
- Prefer `const` over `let` when possible
- Use descriptive names: Variables and functions should be self-documenting
- Add JSDoc comments: Document all public functions and classes
- Follow existing patterns: Match the style of surrounding code

**Naming Conventions:**

- **Files**: kebab-case (e.g., `backup-service.js`)
- **Classes**: PascalCase (e.g., `BackupService`)
- **Functions**: camelCase (e.g., `createBackup`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Test additions or changes
- **refactor**: Code refactoring
- **style**: Code style changes (formatting, etc.)
- **chore**: Build process or tooling changes

**Examples:**

```
feat(export): add actor export functionality

Implements full actor export including embedded items and effects.
Uses .toObject() to ensure complete data capture.

Closes #42
```

```
fix(validation): handle missing trait data

Validation was failing on actors without all traits defined.
Now provides default values for missing traits.

Fixes #58
```

### Pull Request Guidelines

**Before Submitting:**

- [ ] Tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Formatting is correct: `npm run format:check`
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated

**PR Description Template:**

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How has this been tested?

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No breaking changes (or documented if unavoidable)
```

### Documentation Requirements

**Code Documentation:**

- JSDoc comments for all public functions, classes, and methods
- Inline comments for complex logic
- Examples in documentation for public APIs

**User Documentation:**

- Update **README.md** for user-facing changes
- Add to **CHANGELOG.md** under "Unreleased" section
- Update localization files (`lang/en.json`) for UI changes

### Reporting Issues

**Bug Reports** should include:

1. Clear description of the bug
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment: Foundry version, system version, module version
6. Console logs if applicable

**Feature Requests** should include:

1. Use case: Why is this needed?
2. Proposed solution: How should it work?
3. Alternatives considered: Other approaches?
4. Additional context: Screenshots, examples, etc.

### Code Review Process

1. Maintainer reviews PR for quality and fit
2. Feedback provided via PR comments
3. Changes requested if needed
4. Approval and merge once ready

### Need Help?

- **Questions**: Open a [GitHub Discussion](https://github.com/ernieayala/l5r4-migrator/discussions)
- **Bugs**: Open a [GitHub Issue](https://github.com/ernieayala/l5r4-migrator/issues)
- **Security**: Email ernie@example.com (do not open public issue)

### License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Release Process

This section describes the complete release process for maintainers. Releases are automated via GitHub Actions.

### Prerequisites

- Git access to the repository
- npm installed (Node.js 18+)
- All dependencies installed (`npm install`)
- Clean working directory (all changes committed)

### Release Workflow

#### 1. Prepare the Release

Run the release preparation script with the new version number:

```bash
npm run prepare-release [version]
```

**Example:**

```bash
npm run prepare-release 1.0.1
```

This script will:

- ✅ Validate semantic version format
- ✅ Update `package.json` version
- ✅ Update `module.json` version
- ✅ Update `CHANGELOG.md` with release date
- ✅ Run all tests (`npm test`)
- ✅ Run linter (`npm run lint`)
- ✅ Check code formatting (`npm run format:check`)
- ✅ Validate project structure
- ✅ Validate language files
- ✅ Generate release checklist (`RELEASE_CHECKLIST_v[version].md`)

#### 2. Review Changes

**Check the following files:**

1. **`CHANGELOG.md`**
   - Verify the [Unreleased] section was replaced with the version and today's date
   - Ensure release notes are complete and accurate
   - Add any missing changes

2. **`package.json`**
   - Confirm version number is correct

3. **`module.json`**
   - Confirm version number is correct

4. **`RELEASE_CHECKLIST_v[version].md`**
   - Review the generated checklist
   - Use it as a guide during release

#### 3. Commit and Tag

If everything looks good:

```bash
# Stage all changes
git add .

# Commit with release message
git commit -m "Prepare release v[version]"

# Create annotated tag
git tag -a v[version] -m "Release v[version]"

# Push commits and tags
git push origin main --tags
```

**Example:**

```bash
git add .
git commit -m "Prepare release v1.0.1"
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags
```

#### 4. Automated Release (GitHub Actions)

Once the tag is pushed, GitHub Actions automatically:

1. ✅ Checks out the tagged code
2. ✅ Installs dependencies
3. ✅ Runs all tests
4. ✅ Runs linter
5. ✅ Checks code formatting
6. ✅ Verifies version matches tag
7. ✅ Creates release package (`l5r4-migrator.zip`) with production files only
8. ✅ Extracts changelog for this version
9. ✅ Creates GitHub Release with tag
10. ✅ Uploads release assets:
    - `l5r4-migrator.zip`
    - `module.json`

**Monitor the workflow:**

- Go to: https://github.com/ernieayala/l5r4-migrator/actions
- Watch the "Release" workflow for your tag
- If it fails, review the logs and fix issues

#### 5. Verify Release

After GitHub Actions completes:

1. **Check GitHub Release Page**
   - Navigate to: https://github.com/ernieayala/l5r4-migrator/releases
   - Verify the new release appears
   - Verify release notes are correct
   - Verify assets are uploaded (zip and module.json)

2. **Test Manifest URL**

   ```
   https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
   ```

   - Should download the module.json file
   - Should match the version you just released

3. **Test Installation in Foundry VTT**
   - Open Foundry VTT
   - Go to Add-on Modules
   - Click "Install Module"
   - Paste the manifest URL
   - Verify it installs successfully
   - Enable the module in a test world
   - Verify it loads without errors

4. **Basic Functionality Test**
   - Open the migration UI
   - Test that services initialize
   - Verify no console errors

#### 6. Post-Release

1. **Update Release Notes (if needed)**
   - Edit the GitHub release if you need to add information
   - Add screenshots or additional documentation links

2. **Monitor Issues**
   - Watch for bug reports after release
   - Respond to installation issues promptly

3. **Announce (if appropriate)**
   - Post in relevant Discord channels
   - Update any external documentation
   - Notify users of significant changes

### Quick Reference

**Version Bump Commands:**

For convenience, you can use npm version commands:

```bash
# Patch version (1.0.0 → 1.0.1) - bug fixes
npm run version:patch
npm run prepare-release $(node -p "require('./package.json').version")

# Minor version (1.0.0 → 1.1.0) - new features
npm run version:minor
npm run prepare-release $(node -p "require('./package.json').version")

# Major version (1.0.0 → 2.0.0) - breaking changes
npm run version:major
npm run prepare-release $(node -p "require('./package.json').version")
```

**Validation Only:**

To validate without updating versions:

```bash
npm run validate-only
```

This runs all checks but doesn't modify any files.

### Troubleshooting

**Tests Fail:**

If tests fail during `prepare-release`:

1. Run tests locally: `npm test`
2. Fix the failing tests
3. Commit fixes
4. Run `prepare-release` again

**GitHub Actions Workflow Fails:**

Common issues:

1. **Version mismatch**
   - Ensure module.json and package.json have matching versions
   - Ensure tag matches the version (e.g., tag `v1.0.1` for version `1.0.1`)

2. **Tests fail in CI**
   - Tests might pass locally but fail in CI
   - Review workflow logs
   - Ensure all files are committed

3. **Permission denied**
   - Ensure GitHub Actions has write permissions
   - Check repository settings → Actions → General → Workflow permissions

**Release Already Exists:**

If you need to re-release:

1. Delete the GitHub release
2. Delete the tag locally: `git tag -d v[version]`
3. Delete the tag remotely: `git push origin :refs/tags/v[version]`
4. Fix issues
5. Repeat release process

### File Inclusion

The release package **includes**:

- `module.json`
- `l5r4-migrator.js`
- `module/` directory (all source code)
- `lang/` directory (translations)
- `styles/` directory (CSS)
- `templates/` directory (Handlebars)
- `README.md`
- `CHANGELOG.md`
- `LICENSE`

The release package **excludes**:

- `node_modules/`
- `tests/`
- `.git/`, `.github/`
- IDE configs (`.vscode/`, `.windsurf/`, `.idea/`)
- `package.json`, `package-lock.json`
- `.eslintrc.json`, `.prettierrc.json`
- `vitest.config.js`
- `DEVELOPERS.md`
- `for-research/`
- Coverage reports

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version (X.0.0): Breaking changes, incompatible API changes
- **MINOR** version (0.X.0): New features, backward-compatible
- **PATCH** version (0.0.X): Bug fixes, backward-compatible

---

## Reference Materials

**Foundry VTT API**: https://foundryvtt.com/api/

Focus on:

- Document classes (Actor, Item, Scene, JournalEntry)
- World and Compendium management
- File operations
- ApplicationV2 and DialogV2

**Source System Structure**: `C:\Users\teafo\AppData\Local\FoundryVTT\Data\systems\l5r4\`

**Study these files:**

- `module/setup/migrations.js` - Migration patterns
- `module/setup/schema-map.js` - Field transformations
- `module/documents/actor.js` - Actor structure
- `module/documents/item.js` - Item structure
- `template.json` - Schema definitions

---

Thank you for contributing to L5R4 World Migrator!
