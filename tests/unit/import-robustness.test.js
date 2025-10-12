/**
 * Robustness tests for Import Service
 * Tests edge cases, malformed data, and real-world failure scenarios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportService } from '@module/services/import-service.js';

describe('Import Service - Robustness Tests', () => {
  beforeEach(() => {
    global.Actor = { create: vi.fn().mockResolvedValue({}) };
    global.Item = { create: vi.fn().mockResolvedValue({}) };
    global.Scene = { create: vi.fn().mockResolvedValue({}) };
    global.JournalEntry = { create: vi.fn().mockResolvedValue({}) };
    global.Folder = { create: vi.fn().mockResolvedValue({}) };
  });

  describe('Data Corruption Scenarios', () => {
    it('should handle actor with null system data', async () => {
      const data = {
        actors: [
          { _id: 'a1', name: 'Broken Actor', type: 'pc', system: null, items: [] },
          { _id: 'a2', name: 'Good Actor', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }
        ],
        items: []
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      // Should not crash - should handle the broken actor gracefully
      expect(result.success).toBe(true);
      expect(result.stats.actors.attempted).toBe(2);
      // At least one should succeed
      expect(result.stats.actors.created).toBeGreaterThanOrEqual(1);
    });

    it('should handle actor with undefined system', async () => {
      const data = {
        actors: [
          { _id: 'a1', name: 'Missing System', type: 'pc', items: [] },
          { _id: 'a2', name: 'Good Actor', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }
        ],
        items: []
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      expect(result.success).toBe(true);
      expect(result.stats.actors.attempted).toBe(2);
    });

    it('should handle actor with deeply nested null values', async () => {
      const data = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: null, armor: { armor_tn: 5 } },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      expect(result.success).toBe(true);
    });

    it('should handle malformed embedded items', async () => {
      const data = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: { heal_rate: 0 } },
            items: [
              null, // Null item
              { _id: 'i1', name: 'Good Item', type: 'skill', system: {} },
              undefined, // Undefined item
              { _id: 'i2' } // Missing required fields
            ]
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      // Should not crash
      expect(result.success).toBe(true);
    });
  });

  describe('Embedded Items Transformation', () => {
    it('should transform embedded items in with-transform path', async () => {
      let createdActorData = null;
      global.Actor.create.mockImplementation((data) => {
        createdActorData = data;
        return Promise.resolve({});
      });

      const originalData = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: { heal_rate: 0 } },
            items: [
              {
                _id: 'i1',
                name: 'Skill',
                type: 'skill',
                system: { mastery_3: 'old snake_case' }
              }
            ]
          }
        ],
        items: []
      };

      await ImportService.importWorld(originalData, { dryRun: false });

      expect(createdActorData).toBeDefined();
      expect(createdActorData.items[0].system.mastery3).toBe('old snake_case');
      expect(createdActorData.items[0].system.mastery_3).toBeUndefined();
    });

    it('should NOT transform embedded items in as-is path', async () => {
      let createdActorData = null;
      global.Actor.create.mockImplementation((data) => {
        createdActorData = data;
        return Promise.resolve({});
      });

      const newV13Data = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: { healRate: 0 }, bonuses: {} },
            items: [
              {
                _id: 'i1',
                name: 'Skill',
                type: 'skill',
                system: { mastery3: 'already camelCase', freeRanks: 5 }
              }
            ]
          }
        ],
        items: []
      };

      await ImportService.importWorld(newV13Data, { dryRun: false });

      expect(createdActorData).toBeDefined();
      // Should preserve exactly as-is
      expect(createdActorData.items[0].system.mastery3).toBe('already camelCase');
      expect(createdActorData.items[0].system.freeRanks).toBe(5);
      // Should NOT have transformed fields
      expect(createdActorData.items[0].system.mastery_3).toBeUndefined();
    });

    it('should preserve user customizations in as-is path', async () => {
      let createdActorData = null;
      global.Actor.create.mockImplementation((data) => {
        createdActorData = data;
        return Promise.resolve({});
      });

      const customData = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: {
              wounds: { healRate: 3 }, // Custom value
              armor: { armorTn: 25 }, // User's armor
              bonuses: { skill: { athletics: 10, custom: 5 } }, // User bonuses
              woundsPenaltyMod: -5, // User modification
              customField: 'user data' // Extra field
            },
            items: []
          }
        ],
        items: []
      };

      await ImportService.importWorld(customData, { dryRun: false });

      // Verify EXACT preservation
      expect(createdActorData.system.armor.armorTn).toBe(25); // Not overwritten with default
      expect(createdActorData.system.bonuses.skill.athletics).toBe(10);
      expect(createdActorData.system.bonuses.skill.custom).toBe(5);
      expect(createdActorData.system.woundsPenaltyMod).toBe(-5);
      expect(createdActorData.system.customField).toBe('user data');
    });

    it('should NOT add default values in as-is path', async () => {
      let createdActorData = null;
      global.Actor.create.mockImplementation((data) => {
        createdActorData = data;
        return Promise.resolve({});
      });

      const minimalData = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: { healRate: 0 }, bonuses: {} },
            items: []
          }
        ],
        items: []
      };

      await ImportService.importWorld(minimalData, { dryRun: false });

      // Should NOT add woundsPenaltyMod if it wasn't there
      expect(createdActorData.system.woundsPenaltyMod).toBeUndefined();
    });
  });

  describe('Schema Detection Edge Cases', () => {
    it('should handle very sparse data with only one field', async () => {
      const sparseData = {
        actors: [{ _id: 'a1', name: 'Actor', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }],
        items: []
      };

      const result = await ImportService.importWorld(sparseData, { dryRun: true });

      // Should still detect and route correctly
      expect(result.path).toBeDefined();
    });

    it('should handle data with only camelCase but no new fields', async () => {
      const ambiguousData = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: { healRate: 0 }, woundLevels: {} },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(ambiguousData, { dryRun: true });

      // Should detect as new-v13 (camelCase present, snake_case absent)
      expect(result.path).toBe('as-is');
    });

    it('should detect when only items have indicators', async () => {
      const itemOnlyData = {
        actors: [], // No actors
        items: [
          { _id: 'i1', name: 'Item', type: 'skill', system: { mastery_3: 'test' } }
        ]
      };

      const result = await ImportService.importWorld(itemOnlyData, { dryRun: true });

      expect(result.path).toBe('with-transform');
    });

    it('should handle mixed valid and invalid data', async () => {
      const mixedData = {
        actors: [
          { _id: 'a1', name: 'Good', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] },
          { _id: 'a2', name: 'Broken', type: 'pc', system: null, items: [] },
          { _id: 'a3', name: 'Good2', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }
        ],
        items: []
      };

      const result = await ImportService.importWorld(mixedData, { dryRun: false });

      // Should process what it can
      expect(result.stats.actors.attempted).toBe(3);
      expect(result.stats.actors.created).toBeGreaterThanOrEqual(2);
    });
  });

  describe('False Detection Scenarios', () => {
    it('should not be fooled by snake_case in string values', async () => {
      const trickyData = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor with_underscores',
            type: 'pc',
            system: {
              wounds: { healRate: 0 },
              bonuses: {},
              notes: 'This has heal_rate in text' // snake_case in string value
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(trickyData, { dryRun: true });

      // Should still detect as new-v13 (checks actual fields, not string content)
      expect(result.path).toBe('as-is');
    });

    it('should detect Original even with only one snake_case field', async () => {
      const minimalOriginal = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: {
              wounds: { heal_rate: 0 } // Only this one field
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(minimalOriginal, { dryRun: true });

      expect(result.path).toBe('with-transform');
    });
  });

  describe('Type Coercion Issues', () => {
    it('should handle numeric values as strings', async () => {
      const data = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: {
              wounds: { heal_rate: '0' }, // String instead of number
              shadow_taint: '5'
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      expect(result.success).toBe(true);
    });

    it('should handle arrays where objects expected', async () => {
      const data = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: { heal_rate: 0 } },
            items: 'not an array' // Wrong type
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      // Should not crash
      expect(result.success).toBe(true);
    });
  });

  describe('Bow Item Conversion Edge Cases', () => {
    it('should convert bow with embedded items', async () => {
      let createdItemData = null;
      global.Item.create.mockImplementation((data) => {
        createdItemData = data;
        return Promise.resolve({});
      });

      const data = {
        actors: [{ _id: 'a1', name: 'Actor', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }],
        items: [
          {
            _id: 'i1',
            name: 'Composite Bow',
            type: 'bow',
            system: { damage: '3k2', size: 'Large' } // Large with capital
          }
        ]
      };

      await ImportService.importWorld(data, { dryRun: false });

      expect(createdItemData).toBeDefined();
      expect(createdItemData.type).toBe('weapon');
      expect(createdItemData.system.isBow).toBe(true);
      expect(createdItemData.system.size).toBe('large'); // Normalized to lowercase
    });

    it('should NOT convert weapon with isBow=true in as-is path', async () => {
      let createdItemData = null;
      global.Item.create.mockImplementation((data) => {
        createdItemData = data;
        return Promise.resolve({});
      });

      const data = {
        actors: [],
        items: [
          {
            _id: 'i1',
            name: 'Bow',
            type: 'weapon',
            system: { isBow: true, damage: '3k2', equipped: true, freeRanks: 0 }
          }
        ]
      };

      await ImportService.importWorld(data, { dryRun: false });

      // Should preserve exactly
      expect(createdItemData.type).toBe('weapon');
      expect(createdItemData.system.isBow).toBe(true);
    });
  });

  describe('Confidence Score Edge Cases', () => {
    it('should handle low confidence detection (borderline data)', async () => {
      // Only one weak indicator
      const borderlineData = {
        actors: [
          {
            _id: 'a1',
            name: 'Actor',
            type: 'pc',
            system: { wounds: {} }, // No clear indicators
            items: []
          }
        ],
        items: [
          { _id: 'i1', name: 'Item', type: 'skill', system: { mastery_3: '' } } // One indicator
        ]
      };

      const result = await ImportService.importWorld(borderlineData, { dryRun: true });

      // Should still make a decision (not throw)
      expect(result.path).toBeDefined();
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle import with many actors', async () => {
      const actors = [];
      for (let i = 0; i < 100; i++) {
        actors.push({
          _id: `a${i}`,
          name: `Actor ${i}`,
          type: 'pc',
          system: { wounds: { heal_rate: i } },
          items: []
        });
      }

      const data = { actors, items: [] };

      const result = await ImportService.importWorld(data, { dryRun: true });

      expect(result.stats.actors.attempted).toBe(100);
      expect(result.stats.actors.created).toBe(100);
    });

    it('should sample only first 10 for detection even with 100 actors', async () => {
      // First 10 are Original, rest are New v13
      const actors = [];
      for (let i = 0; i < 10; i++) {
        actors.push({
          _id: `a${i}`,
          name: `Actor ${i}`,
          type: 'pc',
          system: { wounds: { heal_rate: i } },
          items: []
        });
      }
      for (let i = 10; i < 100; i++) {
        actors.push({
          _id: `a${i}`,
          name: `Actor ${i}`,
          type: 'pc',
          system: { wounds: { healRate: i }, bonuses: {} },
          items: []
        });
      }

      const data = { actors, items: [] };

      const result = await ImportService.importWorld(data, { dryRun: true });

      // Should detect as Original based on first 10 samples
      expect(result.path).toBe('with-transform');
    });
  });

  describe('Real-World Failure Recovery', () => {
    it('should continue import even if some actors fail', async () => {
      let callCount = 0;
      global.Actor.create.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({});
      });

      const data = {
        actors: [
          { _id: 'a1', name: 'Actor1', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] },
          { _id: 'a2', name: 'Actor2', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] },
          { _id: 'a3', name: 'Actor3', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }
        ],
        items: []
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      expect(result.stats.actors.attempted).toBe(3);
      expect(result.stats.actors.created).toBe(2);
      expect(result.stats.actors.failed).toBe(1);
    });
  });
});
