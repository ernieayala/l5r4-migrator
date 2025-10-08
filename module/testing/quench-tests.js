/**
 * @fileoverview Quench Integration Tests
 *
 * Integration tests that run inside Foundry VTT using the Quench module.
 * These tests have access to the full Foundry API and can perform
 * actual document operations.
 *
 * **Running Tests:**
 * 1. Enable the Quench module in Foundry
 * 2. Enable the l5r4-migrator module
 * 3. Open the Quench UI from the module settings
 * 4. Run "L5R4 Migrator" test suite
 *
 * **Test Coverage:**
 * - Module initialization and API exposure
 * - Service integration (Export, Validation, Import)
 * - Complete migration workflow
 * - Data transformation verification
 * - Error handling
 *
 * @requires quench
 */

import { ExportService } from '../services/export-service.js';
import { ValidationService } from '../services/validation-service.js';
import { ImportService } from '../services/import-service.js';

/**
 * Register all Quench test batches for the migrator module.
 * Called automatically when Foundry is ready.
 */
export function registerQuenchTests() {
  if (!game.modules.get('quench')?.active) {
    console.warn('L5R4 Migrator | Quench module not active, skipping integration tests');
    return;
  }

  const quench = game.modules.get('quench').api;

  // Register test batch
  quench.registerBatch(
    'l5r4-migrator.integration',
    (context) => {
      const { describe, it, assert, before, after, beforeEach, afterEach } = context;

      describe('Module Integration', () => {
        it('should be loaded and active', () => {
          const module = game.modules.get('l5r4-migrator');
          assert.ok(module, 'Module should be registered');
          assert.ok(module.active, 'Module should be active');
        });

        it('should expose API', () => {
          const module = game.modules.get('l5r4-migrator');
          assert.ok(module.api, 'Module should expose API');
          assert.ok(module.api.MigratorUI, 'API should have MigratorUI');
        });

        it('should register settings', () => {
          const logLevel = game.settings.get('l5r4-migrator', 'logLevel');
          assert.ok(logLevel, 'Log level setting should be registered');
        });
      });

      describe('Export Service Integration', () => {
        let testActor, testItem, testFolder;

        before(async () => {
          // Create test folder
          testFolder = await Folder.create({
            name: 'Quench Test Folder',
            type: 'Actor'
          });

          // Create test actor with embedded item
          testActor = await Actor.create({
            name: 'Quench Test Samurai',
            type: 'pc',
            folder: testFolder.id,
            system: {
              traits: { sta: 3, wil: 2, str: 3, per: 2, ref: 3, awa: 2, agi: 3, int: 2 },
              rings: { fire: 2, air: 2, water: 2, earth: 2, void: { rank: 2, value: 1 } },
              wounds: { value: 0, max: 30, heal_rate: 2 },
              xp: 40,
              honor: { rank: 2, points: 0 },
              glory: { rank: 1, points: 0 },
              status: { rank: 1, points: 0 }
            },
            items: [
              {
                name: 'Test Skill',
                type: 'skill',
                system: {
                  rank: 3,
                  type: 'high',
                  trait: 'agi',
                  roll_bonus: 2
                }
              }
            ]
          });

          // Create test item
          testItem = await Item.create({
            name: 'Quench Test Yumi',
            type: 'bow',
            system: {
              str: 3,
              range: 250,
              size: 'Large',
              damageRoll: 2,
              damageKeep: 2
            }
          });
        });

        after(async () => {
          // Clean up
          if (testActor) {
            await testActor.delete();
          }
          if (testItem) {
            await testItem.delete();
          }
          if (testFolder) {
            await testFolder.delete();
          }
        });

        it('should export world data', async () => {
          const result = await ExportService.exportWorld({
            validate: false,
            includeScenes: false,
            includeJournals: false
          });

          assert.ok(result.success, 'Export should succeed');
          assert.ok(result.data, 'Export should return data');
          assert.ok(result.data.metadata, 'Export should include metadata');
          assert.ok(result.data.actors, 'Export should include actors');
          assert.ok(result.data.items, 'Export should include items');
        });

        it('should export created test actor', async () => {
          const result = await ExportService.exportActors([testActor.id], false);

          assert.ok(result.success, 'Actor export should succeed');
          assert.equal(result.actors.length, 1, 'Should export one actor');
          assert.equal(result.actors[0].name, 'Quench Test Samurai', 'Actor name should match');
          assert.ok(result.actors[0].items, 'Actor should have items array');
          assert.equal(result.actors[0].items.length, 1, 'Actor should have embedded item');
        });

        it('should export created test item', async () => {
          const result = await ExportService.exportItems([testItem.id], false);

          assert.ok(result.success, 'Item export should succeed');
          assert.equal(result.items.length, 1, 'Should export one item');
          assert.equal(result.items[0].name, 'Quench Test Yumi', 'Item name should match');
          assert.equal(result.items[0].type, 'bow', 'Item type should be bow');
        });
      });

      describe('Validation Service Integration', () => {
        it('should validate export data structure', async () => {
          const validData = {
            metadata: {
              sourceSystem: 'l5r4',
              worldId: 'test-world',
              worldTitle: 'Test World',
              exportDate: new Date().toISOString()
            },
            actors: [],
            items: []
          };

          const result = await ValidationService.validateData(validData);

          assert.ok(result, 'Validation should return result');
          assert.equal(result.valid, true, 'Valid data should pass validation');
          assert.equal(result.errors.length, 0, 'Should have no errors');
        });

        it('should generate readiness report', async () => {
          const validData = {
            metadata: {
              sourceSystem: 'l5r4',
              worldId: 'test',
              worldTitle: 'Test',
              exportDate: new Date().toISOString()
            },
            actors: [],
            items: []
          };

          const validation = await ValidationService.validateData(validData);
          const report = ValidationService.generateReadinessReport(validation);

          assert.ok(report, 'Should generate report');
          assert.ok(report.ready, 'Empty valid data should be ready');
          assert.ok(report.summary, 'Report should have summary');
          assert.ok(Array.isArray(report.recommendations), 'Should have recommendations array');
        });
      });

      describe('Import Service Integration', () => {
        let exportData;

        before(async () => {
          // Create test data and export it
          const testActor = await Actor.create({
            name: 'Import Test Actor',
            type: 'pc',
            system: {
              traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
              rings: { fire: 2, air: 2, water: 2, earth: 2, void: { rank: 2, value: 0 } },
              wounds: { value: 0, max: 20, heal_rate: 2 },
              armor: { armor_tn: 15 }
            }
          });

          const testItem = await Item.create({
            name: 'Import Test Bow',
            type: 'bow',
            system: {
              str: 3,
              range: 200,
              size: 'Medium'
            }
          });

          // Export
          const exportResult = await ExportService.exportWorld({
            validate: false,
            includeScenes: false,
            includeJournals: false
          });

          exportData = exportResult.data;

          // Clean up original test data
          await testActor.delete();
          await testItem.delete();
        });

        it('should transform actor data', () => {
          const actor = exportData.actors.find((a) => a.name === 'Import Test Actor');
          assert.ok(actor, 'Should find test actor in export');

          const transformed = ImportService._transformActor(actor);

          // Check transformation applied
          assert.equal(transformed.system.wounds.healRate, 2, 'heal_rate should be transformed to healRate');
          assert.ok(transformed.system.armor.armorTn !== undefined, 'armor_tn should be transformed');
        });

        it('should transform bow to weapon', () => {
          const bow = exportData.items.find((i) => i.name === 'Import Test Bow');
          assert.ok(bow, 'Should find test bow in export');
          assert.equal(bow.type, 'bow', 'Original type should be bow');

          const transformed = ImportService._transformItem(bow);

          assert.equal(transformed.type, 'weapon', 'Transformed type should be weapon');
          assert.equal(transformed.system.isBow, true, 'Should have isBow flag');
          assert.equal(transformed.system.size, 'medium', 'Size should be normalized');
        });

        it('should import in dry run mode', async () => {
          const beforeCount = game.actors.size;

          const result = await ImportService.importWorld(exportData, { dryRun: true });

          assert.ok(result.success, 'Import should succeed');
          assert.ok(result.dryRun, 'Should indicate dry run');
          assert.equal(game.actors.size, beforeCount, 'Should not create actors in dry run');
        });
      });

      describe('Complete Migration Workflow', () => {
        let workflowActor, exportData, validationResult, importResult;

        it('Step 1: Export data from source', async () => {
          // Create test actor
          workflowActor = await Actor.create({
            name: 'Workflow Test PC',
            type: 'pc',
            system: {
              traits: { sta: 3, wil: 2, str: 3, per: 2, ref: 2, awa: 3, agi: 3, int: 2 },
              rings: { fire: 2, air: 2, water: 2, earth: 2, void: { rank: 3, value: 2 } },
              wounds: { value: 0, max: 32, heal_rate: 3 },
              shadow_taint: { rank: 0 },
              initiative: { roll: 5, keep: 3, roll_mod: 2, keep_mod: 1 }
            },
            items: [
              {
                name: 'Embedded Bow',
                type: 'bow',
                system: { str: 3, range: 250 }
              }
            ]
          });

          // Export
          const result = await ExportService.exportWorld({
            validate: true,
            includeScenes: false,
            includeJournals: false
          });

          exportData = result.data;

          assert.ok(result.success, 'Export should succeed');
          assert.ok(exportData.actors.length > 0, 'Should export actors');
          assert.ok(exportData.metadata, 'Should have metadata');
        });

        it('Step 2: Validate exported data', async () => {
          validationResult = await ValidationService.validateData(exportData, {
            strict: false,
            checkIntegrity: true
          });

          assert.ok(validationResult, 'Validation should return result');
          assert.ok(validationResult.metadata, 'Validation should have metadata');
        });

        it('Step 3: Generate readiness report', () => {
          const report = ValidationService.generateReadinessReport(validationResult);

          assert.ok(report, 'Should generate report');
          assert.ok(report.summary, 'Report should have summary');
          assert.ok(Array.isArray(report.recommendations), 'Should have recommendations');
        });

        it('Step 4: Import with transformations (dry run)', async () => {
          importResult = await ImportService.importWorld(exportData, { dryRun: true });

          assert.ok(importResult.success, 'Import should succeed');
          assert.ok(importResult.stats, 'Should have statistics');
          assert.ok(importResult.stats.actors.transformed > 0, 'Should transform actors');
        });

        it('Step 5: Verify transformations applied', () => {
          const workflowActorData = exportData.actors.find((a) => a.name === 'Workflow Test PC');
          const transformed = ImportService._transformActor(workflowActorData);

          // Verify schema transformations
          assert.equal(transformed.system.wounds.healRate, 3, 'healRate should be transformed');
          assert.ok(transformed.system.shadowTaint, 'shadowTaint should be transformed');
          assert.equal(transformed.system.initiative.rollMod, 2, 'rollMod should be transformed');
          assert.equal(transformed.system.initiative.keepMod, 1, 'keepMod should be transformed');

          // Verify new fields added
          assert.ok(transformed.system.bonuses, 'Should add bonuses structure');
          assert.equal(transformed.system.woundsPenaltyMod, 0, 'Should add woundsPenaltyMod');

          // Verify embedded bow transformation
          assert.ok(transformed.items.length > 0, 'Should have embedded items');
          const embeddedBow = transformed.items.find((i) => i.name === 'Embedded Bow');
          assert.equal(embeddedBow.type, 'weapon', 'Embedded bow should be weapon');
          assert.equal(embeddedBow.system.isBow, true, 'Embedded bow should have isBow flag');
        });

        after(async () => {
          // Clean up
          if (workflowActor) {
            await workflowActor.delete();
          }
        });
      });

      describe('Error Handling', () => {
        it('should handle invalid export data', async () => {
          const invalidData = {
            // Missing required metadata fields
            metadata: {},
            actors: [],
            items: []
          };

          const result = await ValidationService.validateData(invalidData);

          assert.equal(result.valid, false, 'Invalid data should fail validation');
          assert.ok(result.errors.length > 0, 'Should have validation errors');
        });

        it('should handle missing actors gracefully', async () => {
          const result = await ExportService.exportActors(['nonexistent-id'], false);

          assert.ok(result.success, 'Should succeed even with missing actors');
          assert.equal(result.actors.length, 0, 'Should return empty array');
        });
      });
    },
    {
      displayName: 'L5R4 Migrator: Integration Tests',
      preSelected: true
    }
  );

  console.log('L5R4 Migrator | Quench integration tests registered');
}
