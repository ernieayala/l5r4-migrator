# Developer Guide

Development documentation for L5R4 World Migrator.

## Setup

**Prerequisites:** Node.js 18+, Foundry VTT v13+, Git

```bash
git clone https://github.com/YOUR_USERNAME/l5r4-migrator.git
cd l5r4-migrator
npm install
```

**Workflow:**

```bash
npm test                # Run tests
npm run lint            # Check code
npm run format:check    # Check formatting
```

## Project Structure

```
module/
├── apps/              # UI components
├── services/          # Core logic
│   ├── backup-service.js
│   ├── export-service.js
│   ├── validation-service.js
│   ├── import-service.js
│   └── schema-state-detection-service.js
└── utils/             # Helpers

tests/                 # Unit tests (Vitest)
```

**Services:**

- `BackupService` - Create/restore backups
- `ExportService` - Export from l5r4
- `ValidationService` - Validate data + schema detection
- `ImportService` - Import with dual paths (transform or as-is)
- `SchemaStateDetectionService` - Detect Original vs New v13

## Testing

**Unit tests (Vitest):**

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Integration tests:** Use [Quench](https://github.com/Ethaks/FVTT-Quench) module in Foundry

**Current:** 260 tests, 70%+ coverage

## Schema Transformations

**Original v12/v13 → Enhanced (with transform):**

- Field renames: snake_case → camelCase (`heal_rate` → `healRate`)
- Bow conversion: `bow` → `weapon` with `isBow: true`
- Icon migration: Default PNG → WEBP (custom artwork preserved)
- New fields added with defaults

**New v13 → Enhanced (as-is):**

- No transformation
- Data imported exactly as-is

**Asset Migration:**

- Only migrates exact default PNG filenames
- Preserves: .webp files, custom PNGs, external URLs, module paths
- Actor: `helm.png` → `pc.webp`, `ninja.png` → `npc.webp`
- Items: `sword.png` → `weapon.webp`, `flower.png` → `skill.webp`, etc.

## Schema Detection

Automatically identifies source schema:

**Process:**

1. Sample first 10 actors/items
2. Count indicators (snake_case, camelCase, new fields)
3. Determine state: `original`, `new-v13`, `mixed`, `unknown`
4. Calculate confidence: 0.3-0.95
5. Route to appropriate import path

**States:**

- `original` → Full transformation
- `new-v13` → As-is import
- `mixed` → Error (cannot import)
- `unknown` → Error (indeterminate)

## Programmatic API

**Access services:**

```javascript
const { ExportService, ValidationService, ImportService, BackupService } = game.modules.get('l5r4-migrator').api;
```

**Export:**

```javascript
const result = await ExportService.exportWorld();
ExportService.downloadExport(result.data);
```

**Validate:**

```javascript
const validation = await ValidationService.validateData(exportData);
const report = ValidationService.generateReadinessReport(validation);
console.log(`Schema: ${validation.schemaDetection.state}`);
```

**Detect schema:**

```javascript
const detection = SchemaStateDetectionService.detectState(exportData);
console.log(`${detection.state} (${Math.round(detection.confidence * 100)}%)`);
```

**Import (dry run):**

```javascript
const result = await ImportService.importWorld(exportData, { dryRun: true });
console.log(`Would create ${result.stats.actors.created} actors`);
```

**Import (actual):**

```javascript
const result = await ImportService.importWorld(exportData);
console.log(`Path: ${result.path}`); // 'with-transform' or 'as-is'
```

**Backup:**

```javascript
const backup = await BackupService.createBackup();
// Restore: await BackupService.restoreBackup(backupData);
```

## Contributing

**Code standards:**

- ES6+, prefer `const`, descriptive names, JSDoc comments
- Files: kebab-case, Classes: PascalCase, Functions: camelCase

**Commit format:** [Conventional Commits](https://www.conventionalcommits.org/)

```
feat(scope): add feature
fix(scope): fix bug
docs: update docs
```

**Before PR:**

- Tests pass: `npm test`
- Linting: `npm run lint`
- Format: `npm run format:check`
- Update CHANGELOG.md

**Bug reports:** Description, steps to reproduce, environment, console logs

**License:** MIT - Contributions licensed under same

## Release Process

**For maintainers. Automated via GitHub Actions.**

**1. Prepare:**

```bash
npm run prepare-release 1.0.1
# Updates versions, runs tests/lint, updates CHANGELOG
```

**2. Review:**

- Check `CHANGELOG.md`, `package.json`, `module.json`

**3. Tag and push:**

```bash
git add .
git commit -m "Prepare release v1.0.1"
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags
```

**4. GitHub Actions auto-runs:**

- Runs tests/lint
- Creates `l5r4-migrator.zip`
- Creates GitHub release
- Uploads assets

**5. Verify:**

- Check https://github.com/ernieayala/l5r4-migrator/releases
- Test manifest URL in Foundry

**Semantic versioning:**

- MAJOR (X.0.0) - Breaking changes
- MINOR (0.X.0) - New features
- PATCH (0.0.X) - Bug fixes

---

**Questions?** [GitHub Discussions](https://github.com/ernieayala/l5r4-migrator/discussions)
