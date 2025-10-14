# Release Checklist for L5R4 Migrator v1.0.1

## Pre-Release Validation

- [ ] All tests pass (`npm test`)
- [ ] Code linting passes (`npm run lint`)
- [ ] Code formatting passes (`npm run format:check`)
- [ ] All language files are valid JSON
- [ ] module.json validates against Foundry schema
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes v1.0.1 entry with today's date

## Version Management

- [ ] package.json version updated to 1.0.1
- [ ] module.json version updated to 1.0.1
- [ ] CHANGELOG.md updated with release date
- [ ] Git working directory is clean
- [ ] All changes committed

## Documentation Review

- [ ] README.md installation instructions current
- [ ] CHANGELOG.md has complete release notes
- [ ] DEVELOPERS.md reflects current architecture
- [ ] Code comments are accurate

## Release Process

- [ ] Create git tag: `git tag v1.0.1`
- [ ] Push tag: `git push origin main --tags`
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

- Release URL: https://github.com/ernieayala/l5r4-migrator/releases/tag/v1.0.1
- Manifest URL: https://github.com/ernieayala/l5r4-migrator/releases/latest/download/module.json
- Download URL: https://github.com/ernieayala/l5r4-migrator/releases/latest/download/l5r4-migrator.zip
