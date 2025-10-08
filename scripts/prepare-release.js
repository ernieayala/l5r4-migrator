#!/usr/bin/env node

/**
 * Release Preparation Script for L5R4 Migrator Module
 *
 * This script helps prepare releases by:
 * 1. Updating version numbers in package.json and module.json
 * 2. Validating file structure and dependencies
 * 3. Running tests and code quality checks
 * 4. Updating CHANGELOG.md
 * 5. Creating release checklist
 *
 * Usage: node scripts/prepare-release.js [version]
 * Example: node scripts/prepare-release.js 1.0.1
 *
 * Flags:
 *   --validate-only  Run validation checks without updating versions
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const MODULE_JSON_PATH = path.join(PROJECT_ROOT, 'module.json');
const CHANGELOG_PATH = path.join(PROJECT_ROOT, 'CHANGELOG.md');

/**
 * Validate semantic version format
 * @param {string} version - Version string to validate
 * @returns {boolean} True if valid semantic version
 */
function isValidVersion(version) {
  const semverRegex =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * Update version in JSON file
 * @param {string} filePath - Path to JSON file
 * @param {string} version - New version number
 */
function updateVersionInFile(filePath, version) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    content.version = version;
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`✅ Updated version to ${version} in ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Update CHANGELOG.md with release date
 * @param {string} version - Release version
 */
function updateChangelog(version) {
  console.log('\n📝 Updating CHANGELOG.md...');

  try {
    let content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    const today = new Date().toISOString().split('T')[0];

    // Replace [Unreleased] with [version] - date
    const unreleasedPattern = /## \[Unreleased\]/;
    if (unreleasedPattern.test(content)) {
      content = content.replace(
        unreleasedPattern,
        `## [Unreleased]\n\nNothing currently in development.\n\n## [${version}] - ${today}`
      );
      fs.writeFileSync(CHANGELOG_PATH, content, 'utf8');
      console.log(`✅ Updated CHANGELOG.md with version ${version} and date ${today}`);
    } else {
      console.warn('⚠️  [Unreleased] section not found in CHANGELOG.md');
      console.warn('   Please manually add release notes for version ' + version);
    }
  } catch (error) {
    console.error('❌ Failed to update CHANGELOG.md:', error.message);
    process.exit(1);
  }
}

/**
 * Validate project structure
 * @returns {boolean} True if all required files exist
 */
function validateProjectStructure() {
  const requiredFiles = ['l5r4-migrator.js', 'module.json', 'README.md', 'CHANGELOG.md', 'LICENSE'];

  const requiredDirs = ['lang', 'module', 'templates', 'styles'];

  console.log('\n📁 Validating project structure...');

  let valid = true;

  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing required file: ${file}`);
      valid = false;
    } else {
      console.log(`✅ Found: ${file}`);
    }
  }

  // Check required directories
  for (const dir of requiredDirs) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      console.error(`❌ Missing required directory: ${dir}`);
      valid = false;
    } else {
      console.log(`✅ Found: ${dir}/`);
    }
  }

  return valid;
}

/**
 * Validate language files
 */
function validateLanguageFiles() {
  console.log('\n🌍 Validating language files...');

  const moduleJson = JSON.parse(fs.readFileSync(MODULE_JSON_PATH, 'utf8'));

  // Check that all languages in module.json have corresponding files
  for (const lang of moduleJson.languages) {
    const langFile = path.join(PROJECT_ROOT, lang.path);
    if (!fs.existsSync(langFile)) {
      console.error(`❌ Missing language file: ${lang.path} for ${lang.name}`);
      return false;
    }

    try {
      JSON.parse(fs.readFileSync(langFile, 'utf8'));
      console.log(`✅ Valid JSON: ${lang.path} (${lang.name})`);
    } catch (error) {
      console.error(`❌ Invalid JSON in ${lang.path}:`, error.message);
      return false;
    }
  }

  return true;
}

/**
 * Validate module.json structure
 */
function validateModuleJson() {
  console.log('\n📦 Validating module.json...');

  try {
    const moduleJson = JSON.parse(fs.readFileSync(MODULE_JSON_PATH, 'utf8'));

    const requiredFields = ['id', 'title', 'version', 'compatibility', 'manifest', 'download'];
    let valid = true;

    for (const field of requiredFields) {
      if (!moduleJson[field]) {
        console.error(`❌ Missing required field in module.json: ${field}`);
        valid = false;
      } else {
        console.log(`✅ Found required field: ${field}`);
      }
    }

    // Validate URL structure
    if (moduleJson.manifest && !moduleJson.manifest.includes('releases/latest/download/module.json')) {
      console.warn('⚠️  manifest URL should use /releases/latest/download/module.json pattern');
    }

    if (moduleJson.download && !moduleJson.download.includes('releases/latest/download/')) {
      console.warn('⚠️  download URL should use /releases/latest/download/ pattern');
    }

    return valid;
  } catch (error) {
    console.error('❌ Failed to validate module.json:', error.message);
    return false;
  }
}

/**
 * Run validation checks (tests, linting, formatting)
 */
function runValidation() {
  console.log('\n🧪 Running validation checks...');

  try {
    console.log('\n  Running tests...');
    execSync('npm test', { cwd: PROJECT_ROOT, stdio: 'inherit' });

    console.log('\n  Running linter...');
    execSync('npm run lint', { cwd: PROJECT_ROOT, stdio: 'inherit' });

    console.log('\n  Checking code formatting...');
    execSync('npm run format:check', { cwd: PROJECT_ROOT, stdio: 'inherit' });

    console.log('✅ All validation checks passed');
    return true;
  } catch (error) {
    console.error('❌ Validation checks failed');
    return false;
  }
}

/**
 * Generate release checklist
 * @param {string} version - Release version
 */
function generateReleaseChecklist(version) {
  const checklist = `
# Release Checklist for L5R4 Migrator v${version}

## Pre-Release Validation
- [ ] All tests pass (\`npm test\`)
- [ ] Code linting passes (\`npm run lint\`)
- [ ] Code formatting passes (\`npm run format:check\`)
- [ ] All language files are valid JSON
- [ ] module.json validates against Foundry schema
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes v${version} entry with today's date

## Version Management
- [ ] package.json version updated to ${version}
- [ ] module.json version updated to ${version}
- [ ] CHANGELOG.md updated with release date
- [ ] Git working directory is clean
- [ ] All changes committed

## Documentation Review
- [ ] README.md installation instructions current
- [ ] CHANGELOG.md has complete release notes
- [ ] DEVELOPERS.md reflects current architecture
- [ ] Code comments are accurate

## Release Process
- [ ] Create git tag: \`git tag v${version}\`
- [ ] Push tag: \`git push origin main --tags\`
- [ ] GitHub Actions workflow runs successfully
- [ ] GitHub release created automatically
- [ ] Release includes module.json asset
- [ ] Release includes l5r4-migrator.zip asset

## Post-Release Verification
- [ ] Manifest URL works: https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
- [ ] Download URL works: https://github.com/ernieayala/l5r4-migrator/releases/latest/download/l5r4-migrator.zip
- [ ] Test installation in clean Foundry instance from manifest URL
- [ ] Verify module loads correctly
- [ ] Test basic migration workflow
- [ ] Monitor for bug reports

## Testing Scenarios
- [ ] Install via manifest URL in Foundry
- [ ] Module appears in module management
- [ ] Migration UI opens correctly
- [ ] Backup creation works
- [ ] Export validation works
- [ ] Check GitHub release notes formatting

## Notes
- Release URL: https://github.com/ernieayala/l5r4-migrator/releases/tag/v${version}
- Manifest URL: https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
- Download URL: https://github.com/ernieayala/l5r4-migrator/releases/latest/download/l5r4-migrator.zip
`;

  const checklistPath = path.join(PROJECT_ROOT, `RELEASE_CHECKLIST_v${version}.md`);
  fs.writeFileSync(checklistPath, checklist.trim() + '\n');
  console.log(`\n📋 Release checklist created: RELEASE_CHECKLIST_v${version}.md`);
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);

  // Check for validate-only flag
  if (args.includes('--validate-only')) {
    console.log('🔍 Running validation checks only...');
    console.log('='.repeat(50));

    const structureValid = validateProjectStructure();
    const languageValid = validateLanguageFiles();
    const moduleValid = validateModuleJson();
    const checksValid = runValidation();

    if (structureValid && languageValid && moduleValid && checksValid) {
      console.log('\n✅ All validation checks passed!');
      process.exit(0);
    } else {
      console.error('\n❌ Validation failed');
      process.exit(1);
    }
  }

  // Normal release preparation
  if (args.length === 0) {
    console.error('❌ Please provide a version number');
    console.log('Usage: node scripts/prepare-release.js [version]');
    console.log('Example: node scripts/prepare-release.js 1.0.1');
    console.log('\nFlags:');
    console.log('  --validate-only  Run validation checks without updating versions');
    process.exit(1);
  }

  const version = args[0];

  if (!isValidVersion(version)) {
    console.error('❌ Invalid version format. Please use semantic versioning (e.g., 1.0.1)');
    process.exit(1);
  }

  console.log(`🚀 Preparing L5R4 Migrator release v${version}`);
  console.log('='.repeat(50));

  // Validate project structure
  if (!validateProjectStructure()) {
    console.error('\n❌ Project structure validation failed');
    process.exit(1);
  }

  // Validate language files
  if (!validateLanguageFiles()) {
    console.error('\n❌ Language file validation failed');
    process.exit(1);
  }

  // Validate module.json
  if (!validateModuleJson()) {
    console.error('\n❌ module.json validation failed');
    process.exit(1);
  }

  // Run validation checks
  if (!runValidation()) {
    console.error('\n❌ Validation checks failed - fix errors before releasing');
    process.exit(1);
  }

  // Update version numbers
  console.log('\n📝 Updating version numbers...');
  updateVersionInFile(PACKAGE_JSON_PATH, version);
  updateVersionInFile(MODULE_JSON_PATH, version);

  // Update CHANGELOG
  updateChangelog(version);

  // Generate release checklist
  generateReleaseChecklist(version);

  console.log('\n🎉 Release preparation completed successfully!');
  console.log(`\nNext steps:`);
  console.log(`1. Review RELEASE_CHECKLIST_v${version}.md`);
  console.log(`2. Review CHANGELOG.md to ensure release notes are complete`);
  console.log(`3. Commit changes: git add . && git commit -m "Prepare release v${version}"`);
  console.log(`4. Create and push tag: git tag v${version} && git push origin main --tags`);
  console.log(`5. GitHub Actions will automatically create the release`);
}

// Run the script
main();

// Export functions for testing
export {
  isValidVersion,
  updateVersionInFile,
  updateChangelog,
  validateProjectStructure,
  validateLanguageFiles,
  validateModuleJson,
  runValidation,
  generateReleaseChecklist
};
