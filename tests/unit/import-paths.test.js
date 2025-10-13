/**
 * Unit tests for Dual Import Paths
 * Tests the routing logic between with-transform and as-is import paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportService } from '@module/services/import-service.js';

describe('ImportService - Dual Import Paths', () => {
  beforeEach(() => {
    // Mock Actor, Item, Scene, JournalEntry, Folder
    global.Actor = { create: vi.fn().mockResolvedValue({}) };
    global.Item = { create: vi.fn().mockResolvedValue({}) };
    global.Scene = { create: vi.fn().mockResolvedValue({}) };
    global.JournalEntry = { create: vi.fn().mockResolvedValue({}) };
    global.Folder = { create: vi.fn().mockResolvedValue({}) };
  });

  describe('Schema Detection and Routing', () => {
    it('should detect Original schema and use with-transform path', async () => {
      const originalData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test Actor',
            type: 'pc',
            system: {
              wounds: { heal_rate: 0 }, // snake_case
              wound_lvl: { healthy: { max: 10 } },
              armor: { armor_tn: 5 }
            }
          }
        ],
        items: [
          {
            _id: 'item1',
            name: 'Test Skill',
            type: 'skill',
            system: { mastery_3: 'test' } // snake_case
          }
        ]
      };

      const result = await ImportService.importWorld(originalData, { dryRun: true });

      expect(result.path).toBe('with-transform');
      expect(result.stats.actors.attempted).toBe(1);
      expect(result.stats.actors.transformed).toBe(1);
      expect(result.stats.items.attempted).toBe(1);
      expect(result.stats.items.transformed).toBe(1);
    });

    it('should detect New v13 schema and use as-is path', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test Actor',
            type: 'pc',
            system: {
              wounds: { healRate: 0 }, // camelCase
              woundLevels: { healthy: { max: 10 } },
              armor: { armorTn: 5 },
              bonuses: {} // new field
            }
          }
        ],
        items: [
          {
            _id: 'item1',
            name: 'Test Skill',
            type: 'skill',
            system: {
              mastery3: 'test', // camelCase
              freeRanks: 0 // new field
            }
          }
        ]
      };

      const result = await ImportService.importWorld(newV13Data, { dryRun: true });

      expect(result.path).toBe('as-is');
      expect(result.stats.actors.attempted).toBe(1);
      expect(result.stats.actors.transformed).toBeUndefined(); // No transformation
      expect(result.stats.items.attempted).toBe(1);
      expect(result.stats.items.transformed).toBeUndefined(); // No transformation
    });

    it('should throw error on unknown schema', async () => {
      const emptyData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [],
        items: []
      };

      await expect(ImportService.importWorld(emptyData, { dryRun: true })).rejects.toThrow(
        'Cannot determine schema state'
      );
    });

    it('should throw error on mixed schema (without new fields)', async () => {
      const mixedData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test Actor',
            type: 'pc',
            system: {
              wounds: { heal_rate: 0, healRate: 0 }, // Both snake_case and camelCase
              wound_lvl: {},
              woundLevels: {}
              // NOTE: No new fields (bonuses, woundMode, etc.) - this is true mixed state
            }
          }
        ],
        items: []
      };

      await expect(ImportService.importWorld(mixedData, { dryRun: true })).rejects.toThrow('Mixed schema detected');
    });

    it('should accept dual-schema documents (new v13 with legacy fields)', async () => {
      const dualSchemaData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test Actor',
            type: 'pc',
            system: {
              wounds: { heal_rate: 0, healRate: 0 },
              wound_lvl: {},
              woundLevels: {},
              bonuses: {}, // New field present
              woundMode: 'pc' // New field present
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(dualSchemaData, { dryRun: true });
      
      expect(result.path).toBe('as-is');
      expect(result.detection.state).toBe('new-v13');
      expect(result.detection.needsTransform).toBe(false);
    });
  });

  describe('skipDetection Option', () => {
    it('should skip detection and force transform path when skipDetection=true', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test Actor',
            type: 'pc',
            system: {
              wounds: { healRate: 0 },
              woundLevels: {},
              bonuses: {}
            }
          }
        ],
        items: []
      };

      // Even though this is New v13 data, skipDetection forces transform path
      const result = await ImportService.importWorld(newV13Data, {
        dryRun: true,
        skipDetection: true
      });

      expect(result.path).toBe('with-transform');
    });
  });

  describe('With-Transform Path', () => {
    it('should transform actors with snake_case fields', async () => {
      const originalData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test PC',
            type: 'pc',
            system: {
              wounds: { heal_rate: 2 },
              shadow_taint: 1,
              initiative: { roll_mod: 5 },
              armor: { armor_tn: 10 }
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(originalData, { dryRun: true });

      expect(result.path).toBe('with-transform');
      expect(result.stats.actors.transformed).toBe(1);
    });

    it('should convert bow items to weapons', async () => {
      const originalData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test Actor',
            type: 'pc',
            system: { wounds: { heal_rate: 0 } }, // Need snake_case to detect Original
            items: []
          }
        ],
        items: [
          {
            _id: 'item1',
            name: 'Test Bow',
            type: 'bow',
            system: { damage: '3k2' }
          }
        ]
      };

      const result = await ImportService.importWorld(originalData, { dryRun: true });

      expect(result.path).toBe('with-transform');
      expect(result.stats.items.transformed).toBe(1);
    });
  });

  describe('As-Is Path', () => {
    it('should import actors without transformation', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Test Actor',
            type: 'pc',
            system: {
              wounds: { healRate: 2 },
              shadowTaint: 1,
              initiative: { rollMod: 5 },
              armor: { armorTn: 20 },
              bonuses: { skill: { custom: 5 } }
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(newV13Data, { dryRun: true });

      expect(result.path).toBe('as-is');
      expect(result.stats.actors.created).toBe(1);
      expect(result.stats.actors.transformed).toBeUndefined();
    });

    it('should import items without transformation', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [],
        items: [
          {
            _id: 'item1',
            name: 'Test Skill',
            type: 'skill',
            system: {
              mastery3: 'text',
              freeRanks: 2,
              rollBonus: 1
            }
          },
          {
            _id: 'item2',
            name: 'Test Weapon',
            type: 'weapon',
            system: {
              isBow: true,
              equipped: true,
              damage: '3k2'
            }
          }
        ]
      };

      const result = await ImportService.importWorld(newV13Data, { dryRun: true });

      expect(result.path).toBe('as-is');
      expect(result.stats.items.created).toBe(2);
      expect(result.stats.items.transformed).toBeUndefined();
    });

    it('should preserve user-customized field values', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Customized Actor',
            type: 'pc',
            system: {
              woundsPenaltyMod: 99, // Custom value
              bonuses: { skill: { athletics: 10 }, trait: {}, ring: {} }, // Custom bonuses
              wounds: { healRate: 0 },
              woundLevels: { healthy: { value: 10 } }
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(newV13Data, { dryRun: false });

      expect(result.path).toBe('as-is');
      expect(Actor.create).toHaveBeenCalledOnce();

      const createdActor = Actor.create.mock.calls[0][0];
      expect(createdActor.system.woundsPenaltyMod).toBe(99);
      expect(createdActor.system.bonuses.skill.athletics).toBe(10);
    });

    it('should preserve flags in as-is path', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          {
            _id: 'actor1',
            name: 'Actor with XP History',
            type: 'pc',
            system: {
              bonuses: { skill: {}, trait: {}, ring: {} },
              woundMode: 'pc',
              wounds: { healRate: 0 },
              woundLevels: { healthy: { value: 10 } }
            },
            flags: {
              l5r4: {
                xpSpent: [
                  { id: 'xp1', type: 'manual', change: 10, note: 'Test XP', timestamp: Date.now() }
                ],
                customData: 'preserved'
              }
            },
            items: []
          }
        ],
        items: []
      };

      const result = await ImportService.importWorld(newV13Data, { dryRun: false });

      expect(result.path).toBe('as-is');
      expect(Actor.create).toHaveBeenCalledOnce();

      const createdActor = Actor.create.mock.calls[0][0];
      expect(createdActor.flags).toBeDefined();
      expect(createdActor.flags.l5r4.xpSpent).toHaveLength(1);
      expect(createdActor.flags.l5r4.xpSpent[0].note).toBe('Test XP');
      expect(createdActor.flags.l5r4.customData).toBe('preserved');
    });

    it('should create documents when dryRun=false (with-transform)', async () => {
      const originalData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [{ _id: 'a1', name: 'Actor', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }],
        items: []
      };

      await ImportService.importWorld(originalData, { dryRun: false });

      expect(global.Actor.create).toHaveBeenCalledTimes(1);
    });

    it('should create documents when dryRun=false (as-is)', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          { _id: 'a1', name: 'Actor', type: 'pc', system: { wounds: { healRate: 0 }, bonuses: {} }, items: [] }
        ],
        items: []
      };

      await ImportService.importWorld(newV13Data, { dryRun: false });

      expect(global.Actor.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle individual document failures gracefully (with-transform)', async () => {
      global.Actor.create.mockRejectedValueOnce(new Error('Creation failed'));

      const originalData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          { _id: 'a1', name: 'Actor1', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] },
          { _id: 'a2', name: 'Actor2', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }
        ],
        items: []
      };

      const result = await ImportService.importWorld(originalData, { dryRun: false });

      expect(result.stats.actors.attempted).toBe(2);
      expect(result.stats.actors.failed).toBe(1);
      expect(result.stats.actors.created).toBe(1);
    });

    it('should handle individual document failures gracefully (as-is)', async () => {
      global.Item.create.mockRejectedValueOnce(new Error('Creation failed'));

      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [],
        items: [
          { _id: 'i1', name: 'Item1', type: 'skill', system: { mastery3: '', freeRanks: 0 } },
          { _id: 'i2', name: 'Item2', type: 'skill', system: { mastery3: '', freeRanks: 0 } }
        ]
      };

      const result = await ImportService.importWorld(newV13Data, { dryRun: false });

      expect(result.stats.items.attempted).toBe(2);
      expect(result.stats.items.failed).toBe(1);
      expect(result.stats.items.created).toBe(1);
    });
  });

  describe('Result Structure', () => {
    it('should include path in result (with-transform)', async () => {
      const originalData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [{ _id: 'a1', name: 'Actor', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }],
        items: []
      };

      const result = await ImportService.importWorld(originalData, { dryRun: true });

      expect(result).toHaveProperty('path');
      expect(result.path).toBe('with-transform');
    });

    it('should include path in result (as-is)', async () => {
      const newV13Data = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [
          { _id: 'a1', name: 'Actor', type: 'pc', system: { wounds: { healRate: 0 }, bonuses: {} }, items: [] }
        ],
        items: []
      };

      const result = await ImportService.importWorld(newV13Data, { dryRun: true });

      expect(result).toHaveProperty('path');
      expect(result.path).toBe('as-is');
    });

    it('should include comprehensive statistics', async () => {
      const originalData = {
        metadata: { sourceSystem: 'l5r4', worldId: 'test', worldTitle: 'Test World' },
        actors: [{ _id: 'a1', name: 'Actor', type: 'pc', system: { wounds: { heal_rate: 0 } }, items: [] }],
        items: [{ _id: 'i1', name: 'Item', type: 'skill', system: { mastery_3: '' } }]
      };

      const result = await ImportService.importWorld(originalData, { dryRun: true });

      expect(result.stats).toHaveProperty('actors');
      expect(result.stats).toHaveProperty('items');
      expect(result.stats).toHaveProperty('scenes');
      expect(result.stats).toHaveProperty('journals');
      expect(result.stats).toHaveProperty('folders');
      expect(result.stats.actors).toHaveProperty('attempted');
      expect(result.stats.actors).toHaveProperty('created');
      expect(result.stats.actors).toHaveProperty('failed');
    });
  });
});
