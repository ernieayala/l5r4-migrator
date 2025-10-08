/**
 * @fileoverview Unit Tests for Validation Service
 * 
 * Tests comprehensive validation including integrity checks and readiness reports.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationService } from '@module/services/validation-service.js';

describe('Validation Service', () => {
  let validActorData;
  let validItemData;
  let validExportData;

  beforeEach(() => {
    // Create valid test data
    validActorData = {
      _id: 'actor1',
      name: 'Test PC',
      type: 'pc',
      system: {
        traits: { sta: 2, wil: 2, str: 3, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
        rings: { fire: 2, air: 2, water: 2, earth: 2, void: { rank: 2, value: 0 } },
        wounds: { value: 0, max: 20, mod: 0, healRate: 0 },
        woundLevels: {
          healthy: { value: 10, penalty: 0, current: true },
          nicked: { value: 15, penalty: 3, current: false },
          grazed: { value: 20, penalty: 5, current: false },
          hurt: { value: 25, penalty: 10, current: false },
          injured: { value: 30, penalty: 15, current: false },
          crippled: { value: 35, penalty: 20, current: false },
          down: { value: 40, penalty: 40, current: false },
          out: { value: 50, penalty: 40, current: false }
        },
        armor: { armorTn: 10, reduction: 0 },
        xp: 0,
        honor: { rank: 2, points: 0 },
        glory: { rank: 1, points: 0 },
        status: { rank: 1, points: 0 },
        shadowTaint: { rank: 0, points: 0 },
        initiative: { roll: 5, keep: 3, rollMod: 0, keepMod: 0, totalMod: 0 },
        insight: { rank: 1, points: 0 },
        armorTn: { type: '', reduction: 0, current: 0, mod: 0 },
        wealth: { koku: 0, bu: 0, zeni: 0 }
      }
    };

    validItemData = {
      _id: 'item1',
      name: 'Test Skill',
      type: 'skill',
      system: {
        rank: 3,
        type: 'high',
        trait: 'int',
        emphasis: '',
        mastery3: '',
        mastery5: '',
        mastery7: '',
        insightBonus: 0,
        school: false,
        rollBonus: 0,
        keepBonus: 0,
        totalBonus: 0
      }
    };

    validExportData = {
      metadata: {
        sourceSystem: 'l5r4',
        sourceSystemVersion: '1.0.0',
        worldId: 'test-world',
        worldTitle: 'Test World',
        foundryVersion: '13.0.0',
        exportDate: '2025-10-07T19:00:00Z'
      },
      actors: [validActorData],
      items: [validItemData]
    };
  });

  describe('validateActor', () => {
    it('should validate valid actor', () => {
      const result = ValidationService.validateActor(validActorData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid actor', () => {
      const invalidActor = {
        _id: 'bad',
        name: 'Bad Actor',
        type: 'pc',
        system: {} // Missing required fields
      };

      const result = ValidationService.validateActor(invalidActor);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateItem', () => {
    it('should validate valid item', () => {
      const result = ValidationService.validateItem(validItemData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid item', () => {
      const invalidItem = {
        _id: 'bad',
        name: 'Bad Item',
        type: 'skill',
        system: {} // Missing required fields
      };

      const result = ValidationService.validateItem(invalidItem);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateData', () => {
    it('should validate complete export data', async () => {
      const result = await ValidationService.validateData(validExportData);

      expect(result.valid).toBe(true);
      expect(result.metadata.totalActors).toBe(1);
      expect(result.metadata.totalItems).toBe(1);
      expect(result.metadata.validActors).toBe(1);
      expect(result.metadata.validItems).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing metadata', async () => {
      const badData = {
        actors: [],
        items: []
      };

      const result = await ValidationService.validateData(badData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing metadata object');
    });

    it('should detect missing required metadata fields', async () => {
      const badData = {
        metadata: {
          // Missing required fields
        },
        actors: [],
        items: []
      };

      const result = await ValidationService.validateData(badData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('sourceSystem'))).toBe(true);
      expect(result.errors.some(e => e.includes('worldId'))).toBe(true);
      expect(result.errors.some(e => e.includes('worldTitle'))).toBe(true);
    });

    it('should validate actors and items', async () => {
      const data = {
        metadata: validExportData.metadata,
        actors: [validActorData, { _id: 'bad', name: 'Bad', type: 'pc', system: {} }],
        items: [validItemData]
      };

      const result = await ValidationService.validateData(data);

      expect(result.metadata.totalActors).toBe(2);
      expect(result.metadata.validActors).toBe(1);
      expect(result.metadata.invalidActors).toBe(1);
      expect(result.actorErrors).toHaveLength(1);
      expect(result.actorErrors[0].name).toBe('Bad');
    });

    it('should check integrity when enabled', async () => {
      const dataWithDuplicates = {
        metadata: validExportData.metadata,
        actors: [
          { ...validActorData, _id: 'dup' },
          { ...validActorData, _id: 'dup' } // Duplicate ID
        ],
        items: []
      };

      const result = await ValidationService.validateData(dataWithDuplicates);

      expect(result.integrityIssues.some(i => i.type === 'duplicate_actor_ids')).toBe(true);
    });

    it('should skip integrity checks when disabled', async () => {
      const dataWithDuplicates = {
        metadata: validExportData.metadata,
        actors: [
          { ...validActorData, _id: 'dup' },
          { ...validActorData, _id: 'dup' }
        ],
        items: []
      };

      const result = await ValidationService.validateData(dataWithDuplicates, { checkIntegrity: false });

      expect(result.integrityIssues).toHaveLength(0);
    });

    it('should fail in strict mode with warnings', async () => {
      const dataWithWarnings = {
        metadata: {
          ...validExportData.metadata,
          sourceSystem: 'l5r4-enhanced' // Will generate warning
        },
        actors: [],
        items: []
      };

      const result = await ValidationService.validateData(dataWithWarnings, { strict: true });

      expect(result.valid).toBe(false); // Strict mode fails on warnings
    });
  });

  describe('_checkIntegrity', () => {
    it('should detect duplicate actor IDs', async () => {
      const data = {
        metadata: validExportData.metadata,
        actors: [
          { ...validActorData, _id: 'dup1' },
          { ...validActorData, _id: 'dup1' },
          { ...validActorData, _id: 'dup2' },
          { ...validActorData, _id: 'dup2' }
        ],
        items: []
      };

      const result = await ValidationService.validateData(data);

      const duplicateIssue = result.integrityIssues.find(i => i.type === 'duplicate_actor_ids');
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue.ids).toEqual(['dup1', 'dup2']);
    });

    it('should detect duplicate item IDs', async () => {
      const data = {
        metadata: validExportData.metadata,
        actors: [],
        items: [
          { ...validItemData, _id: 'dup1' },
          { ...validItemData, _id: 'dup1' }
        ]
      };

      const result = await ValidationService.validateData(data);

      const duplicateIssue = result.integrityIssues.find(i => i.type === 'duplicate_item_ids');
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue.ids).toEqual(['dup1']);
    });

    it('should detect legacy bow items', async () => {
      const bowItem = {
        _id: 'bow1',
        name: 'Legacy Bow',
        type: 'bow',
        system: {
          str: 3,
          range: 250,
          damageRoll: 2,
          damageKeep: 2,
          explodesOn: 10
        }
      };

      const data = {
        metadata: validExportData.metadata,
        actors: [],
        items: [bowItem, { ...bowItem, _id: 'bow2', name: 'Another Bow' }]
      };

      const result = await ValidationService.validateData(data);

      const bowIssue = result.integrityIssues.find(i => i.type === 'legacy_bow_items');
      expect(bowIssue).toBeDefined();
      expect(bowIssue.count).toBe(2);
      expect(bowIssue.items).toHaveLength(2);
    });

    it('should detect invalid embedded items', async () => {
      const actorWithBadEmbeddedItem = {
        ...validActorData,
        items: [
          {
            _id: 'emb1',
            name: 'Bad Embedded',
            type: 'skill',
            system: {} // Invalid - missing required fields
          }
        ]
      };

      const data = {
        metadata: validExportData.metadata,
        actors: [actorWithBadEmbeddedItem],
        items: []
      };

      const result = await ValidationService.validateData(data);

      const embeddedIssue = result.integrityIssues.find(i => i.type === 'invalid_embedded_item');
      expect(embeddedIssue).toBeDefined();
      expect(embeddedIssue.actorName).toBe('Test PC');
      expect(embeddedIssue.itemName).toBe('Bad Embedded');
    });
  });

  describe('generateReadinessReport', () => {
    it('should generate report for valid data', async () => {
      const validation = await ValidationService.validateData(validExportData);
      const report = ValidationService.generateReadinessReport(validation);

      expect(report.ready).toBe(true);
      expect(report.summary.totalDocuments).toBe(2);
      expect(report.summary.validDocuments).toBe(2);
      expect(report.summary.invalidDocuments).toBe(0);
      expect(report.recommendations.some(r => r.message.includes('ready for migration'))).toBe(true);
    });

    it('should generate recommendations for invalid documents', async () => {
      const data = {
        metadata: validExportData.metadata,
        actors: [{ _id: 'bad', name: 'Bad', type: 'pc', system: {} }],
        items: []
      };

      const validation = await ValidationService.validateData(data);
      const report = ValidationService.generateReadinessReport(validation);

      expect(report.ready).toBe(false);
      expect(report.summary.invalidDocuments).toBe(1);
      expect(report.recommendations.some(r => r.priority === 'high' && r.message.includes('Fix'))).toBe(true);
    });

    it('should recommend bow item conversion', async () => {
      const data = {
        metadata: validExportData.metadata,
        actors: [],
        items: [{ _id: 'bow1', name: 'Bow', type: 'bow', system: { str: 3, range: 100, damageRoll: 2, damageKeep: 2, explodesOn: 10 } }]
      };

      const validation = await ValidationService.validateData(data);
      const report = ValidationService.generateReadinessReport(validation);

      expect(report.recommendations.some(r => r.message.includes('bow items will be converted'))).toBe(true);
    });

    it('should warn about duplicate IDs', async () => {
      const data = {
        metadata: validExportData.metadata,
        actors: [
          { ...validActorData, _id: 'dup' },
          { ...validActorData, _id: 'dup' }
        ],
        items: []
      };

      const validation = await ValidationService.validateData(data);
      const report = ValidationService.generateReadinessReport(validation);

      expect(report.recommendations.some(r => r.priority === 'high' && r.message.includes('Duplicate'))).toBe(true);
    });

    it('should summarize warnings', async () => {
      const data = {
        metadata: {
          ...validExportData.metadata,
          sourceSystem: 'l5r4-enhanced' // Creates warning
        },
        actors: [],
        items: []
      };

      const validation = await ValidationService.validateData(data);
      const report = ValidationService.generateReadinessReport(validation);

      expect(report.summary.totalWarnings).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.priority === 'low' && r.message.includes('warnings'))).toBe(true);
    });
  });

  describe('validateCompatibility', () => {
    it('should validate compatible source system', () => {
      const sourceMetadata = {
        sourceSystem: 'l5r4',
        foundryVersion: '13.0.0'
      };

      const targetMetadata = {
        system: 'l5r4-enhanced',
        foundryVersion: '13.1.0'
      };

      const result = ValidationService.validateCompatibility(sourceMetadata, targetMetadata);

      expect(result.compatible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect incompatible source system', () => {
      const sourceMetadata = {
        sourceSystem: 'dnd5e'
      };

      const result = ValidationService.validateCompatibility(sourceMetadata, {});

      expect(result.compatible).toBe(false);
      expect(result.errors.some(e => e.includes('Incompatible source system'))).toBe(true);
    });

    it('should accept l5r4-enhanced as source', () => {
      const sourceMetadata = {
        sourceSystem: 'l5r4-enhanced'
      };

      const result = ValidationService.validateCompatibility(sourceMetadata, {});

      expect(result.compatible).toBe(true);
    });

    it('should warn about Foundry version mismatch', () => {
      const sourceMetadata = {
        sourceSystem: 'l5r4',
        foundryVersion: '11.0.0'
      };

      const targetMetadata = {
        foundryVersion: '13.0.0'
      };

      const result = ValidationService.validateCompatibility(sourceMetadata, targetMetadata);

      expect(result.warnings.some(w => w.includes('version mismatch'))).toBe(true);
    });

    it('should not warn for minor version differences', () => {
      const sourceMetadata = {
        sourceSystem: 'l5r4',
        foundryVersion: '13.0.0'
      };

      const targetMetadata = {
        foundryVersion: '13.5.2'
      };

      const result = ValidationService.validateCompatibility(sourceMetadata, targetMetadata);

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle empty dataset', async () => {
      const emptyData = {
        metadata: validExportData.metadata,
        actors: [],
        items: []
      };

      const result = await ValidationService.validateData(emptyData);

      expect(result.valid).toBe(true);
      expect(result.metadata.totalActors).toBe(0);
      expect(result.metadata.totalItems).toBe(0);
    });

    it('should handle large dataset', async () => {
      const largeData = {
        metadata: validExportData.metadata,
        actors: Array(100).fill(null).map((_, i) => ({ ...validActorData, _id: `actor${i}` })),
        items: Array(200).fill(null).map((_, i) => ({ ...validItemData, _id: `item${i}` }))
      };

      const result = await ValidationService.validateData(largeData);

      expect(result.metadata.totalActors).toBe(100);
      expect(result.metadata.totalItems).toBe(200);
      expect(result.metadata.validActors).toBe(100);
      expect(result.metadata.validItems).toBe(200);
    });

    it('should provide complete validation pipeline', async () => {
      const data = {
        metadata: validExportData.metadata,
        actors: [validActorData],
        items: [validItemData]
      };

      const validation = await ValidationService.validateData(data);
      const report = ValidationService.generateReadinessReport(validation);
      const compatibility = ValidationService.validateCompatibility(data.metadata);

      expect(validation.valid).toBe(true);
      expect(report.ready).toBe(true);
      expect(compatibility.compatible).toBe(true);
    });
  });
});
