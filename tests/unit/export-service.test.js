/**
 * @fileoverview Unit Tests for Export Service
 *
 * Tests export functionality with mocked Foundry APIs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from '@module/services/export-service.js';

describe('Export Service', () => {
  beforeEach(() => {
    // Mock game world data
    game.world = {
      id: 'test-world',
      title: 'Test World'
    };
    game.system = {
      id: 'l5r4',
      version: '1.0.0'
    };
    game.version = '13.0.0';

    // Reset collections
    game.actors = { contents: [], get: vi.fn() };
    game.items = { contents: [], get: vi.fn() };
    game.scenes = { contents: [] };
    game.journal = { contents: [] };
    game.folders = { contents: [] };
  });

  describe('_exportActor', () => {
    it('should export actor with embedded items', () => {
      const mockActor = {
        id: 'actor1',
        name: 'Test PC',
        type: 'pc',
        toObject: () => ({
          _id: 'actor1',
          name: 'Test PC',
          type: 'pc',
          system: { traits: { str: 3 } },
          items: [{ _id: 'item1', name: 'Embedded Skill', type: 'skill' }]
        }),
        items: {
          contents: [{ toObject: () => ({ _id: 'item1', name: 'Embedded Skill', type: 'skill' }) }]
        },
        effects: { contents: [] }
      };

      const result = ExportService._exportActor(mockActor);

      expect(result._id).toBe('actor1');
      expect(result.name).toBe('Test PC');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Embedded Skill');
    });

    it('should export actor with effects', () => {
      const mockActor = {
        name: 'Test Actor',
        type: 'pc',
        toObject: () => ({
          _id: 'actor1',
          name: 'Test Actor',
          effects: [{ _id: 'effect1', label: 'Test Effect' }]
        }),
        items: { contents: [] },
        effects: {
          contents: [{ toObject: () => ({ _id: 'effect1', label: 'Test Effect' }) }]
        }
      };

      const result = ExportService._exportActor(mockActor);

      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].label).toBe('Test Effect');
    });

    it('should handle actor with no embedded items', () => {
      const mockActor = {
        name: 'Empty Actor',
        type: 'npc',
        toObject: () => ({
          _id: 'actor1',
          name: 'Empty Actor'
        }),
        items: { contents: [] },
        effects: { contents: [] }
      };

      const result = ExportService._exportActor(mockActor);

      expect(result.items).toEqual([]);
      expect(result.effects).toEqual([]);
    });
  });

  describe('_exportItem', () => {
    it('should export item data', () => {
      const mockItem = {
        id: 'item1',
        name: 'Test Skill',
        type: 'skill',
        toObject: () => ({
          _id: 'item1',
          name: 'Test Skill',
          type: 'skill',
          system: { rank: 3 }
        }),
        effects: { contents: [] }
      };

      const result = ExportService._exportItem(mockItem);

      expect(result._id).toBe('item1');
      expect(result.name).toBe('Test Skill');
      expect(result.type).toBe('skill');
    });

    it('should export item with effects', () => {
      const mockItem = {
        name: 'Magic Item',
        type: 'weapon',
        toObject: () => ({
          _id: 'item1',
          name: 'Magic Item',
          effects: [{ _id: 'effect1', label: 'Damage Bonus' }]
        }),
        effects: {
          contents: [{ toObject: () => ({ _id: 'effect1', label: 'Damage Bonus' }) }]
        }
      };

      const result = ExportService._exportItem(mockItem);

      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].label).toBe('Damage Bonus');
    });
  });

  describe('exportWorld', () => {
    beforeEach(() => {
      // Create complete valid actor data
      const validPCData = {
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

      const validNPCData = {
        _id: 'actor2',
        name: 'Test NPC',
        type: 'npc',
        system: {
          traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
          rings: { fire: 2, air: 2, water: 2, earth: 2, void: { rank: 2 } },
          wounds: { value: 0, max: 20, mod: 0, healRate: 0 },
          woundLevels: {
            healthy: { value: 15, penalty: 0, current: true },
            nicked: { value: 20, penalty: 3, current: false },
            grazed: { value: 25, penalty: 5, current: false },
            hurt: { value: 30, penalty: 10, current: false },
            injured: { value: 35, penalty: 15, current: false },
            crippled: { value: 40, penalty: 20, current: false },
            down: { value: 43, penalty: 40, current: false },
            out: { value: 45, penalty: 40, current: false }
          },
          armor: { armorTn: 15, reduction: 3 },
          initiative: { roll: 5, keep: 3 }
        }
      };

      // Mock actors
      game.actors = {
        contents: [
          {
            id: 'actor1',
            name: 'Test PC',
            type: 'pc',
            toObject: () => validPCData,
            items: { contents: [] },
            effects: { contents: [] }
          },
          {
            id: 'actor2',
            name: 'Test NPC',
            type: 'npc',
            toObject: () => validNPCData,
            items: { contents: [] },
            effects: { contents: [] }
          }
        ],
        get: (id) => game.actors.contents.find((a) => a.id === id)
      };

      // Mock items
      const validSkillData = {
        _id: 'item1',
        name: 'World Item',
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

      game.items = {
        contents: [
          {
            id: 'item1',
            name: 'World Item',
            type: 'skill',
            toObject: () => validSkillData,
            effects: { contents: [] }
          }
        ],
        get: (id) => game.items.contents.find((i) => i.id === id)
      };

      // Mock scenes
      game.scenes = {
        contents: [{ toObject: () => ({ _id: 'scene1', name: 'Test Scene' }) }]
      };

      // Mock journals
      game.journal = {
        contents: [{ toObject: () => ({ _id: 'journal1', name: 'Test Journal' }) }]
      };

      // Mock folders
      game.folders = {
        contents: [{ toObject: () => ({ _id: 'folder1', name: 'Actors Folder' }) }]
      };
    });

    it('should export all world data', async () => {
      const result = await ExportService.exportWorld({ validate: false });

      expect(result.success).toBe(true);
      expect(result.data.actors).toHaveLength(2);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.scenes).toHaveLength(1);
      expect(result.data.journals).toHaveLength(1);
      expect(result.data.folders).toHaveLength(1);
    });

    it('should exclude scenes when requested', async () => {
      const result = await ExportService.exportWorld({
        includeScenes: false,
        validate: false
      });

      expect(result.data.scenes).toHaveLength(0);
      expect(result.data.actors).toHaveLength(2);
    });

    it('should exclude journals when requested', async () => {
      const result = await ExportService.exportWorld({
        includeJournals: false,
        validate: false
      });

      expect(result.data.journals).toHaveLength(0);
      expect(result.data.actors).toHaveLength(2);
    });

    it('should export specific actors only', async () => {
      const result = await ExportService.exportWorld({
        actorIds: ['actor1'],
        validate: false
      });

      expect(result.data.actors).toHaveLength(1);
      expect(result.data.actors[0].name).toBe('Test PC');
    });

    it('should export specific items only', async () => {
      const result = await ExportService.exportWorld({
        itemIds: ['item1'],
        validate: false
      });

      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].name).toBe('World Item');
    });

    it('should include metadata', async () => {
      const result = await ExportService.exportWorld({ validate: false });

      expect(result.data.metadata).toBeDefined();
      expect(result.data.metadata.sourceSystem).toBe('l5r4');
      expect(result.data.metadata.sourceSystemVersion).toBe('1.0.0');
      expect(result.data.metadata.worldId).toBe('test-world');
      expect(result.data.metadata.foundryVersion).toBe('13.0.0');
    });

    it('should include statistics', async () => {
      const result = await ExportService.exportWorld({ validate: false });

      expect(result.data.metadata.stats).toBeDefined();
      expect(result.data.metadata.stats.actors).toBe(2);
      expect(result.data.metadata.stats.items).toBe(1);
      expect(result.data.metadata.stats.scenes).toBe(1);
      expect(result.data.metadata.stats.journals).toBe(1);
      expect(result.data.metadata.stats.folders).toBe(1);
    });

    it('should validate actors when enabled', async () => {
      const result = await ExportService.exportWorld({ validate: true });

      expect(result.validation.enabled).toBe(true);
      expect(result.validation.results.actors.valid).toBe(2);
      expect(result.validation.results.actors.invalid).toBe(0);
    });

    it('should detect invalid actors', async () => {
      // Add invalid actor (missing required fields)
      game.actors.contents.push({
        id: 'invalid-actor',
        name: 'Invalid Actor',
        type: 'pc',
        toObject: () => ({
          _id: 'invalid-actor',
          name: 'Invalid Actor',
          type: 'pc',
          system: {} // Missing required fields
        }),
        items: { contents: [] },
        effects: { contents: [] }
      });

      const result = await ExportService.exportWorld({ validate: true });

      expect(result.validation.results.actors.invalid).toBe(1);
      expect(result.validation.results.actors.errors).toHaveLength(1);
      expect(result.validation.results.actors.errors[0].name).toBe('Invalid Actor');
    });
  });

  describe('exportActors', () => {
    beforeEach(() => {
      const validPCData = {
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

      game.actors = {
        contents: [
          {
            id: 'actor1',
            name: 'Test PC',
            type: 'pc',
            toObject: () => validPCData,
            items: { contents: [] },
            effects: { contents: [] }
          }
        ],
        get: (id) => game.actors.contents.find((a) => a.id === id)
      };
    });

    it('should export specific actors', async () => {
      const result = await ExportService.exportActors(['actor1'], false);

      expect(result.success).toBe(true);
      expect(result.actors).toHaveLength(1);
      expect(result.actors[0].name).toBe('Test PC');
      expect(result.count).toBe(1);
    });

    it('should handle non-existent actors', async () => {
      const result = await ExportService.exportActors(['actor1', 'nonexistent'], false);

      expect(result.actors).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should validate actors when enabled', async () => {
      const result = await ExportService.exportActors(['actor1'], true);

      expect(result.validation.enabled).toBe(true);
      expect(result.validation.valid).toBe(1);
      expect(result.validation.invalid).toBe(0);
    });
  });

  describe('exportItems', () => {
    beforeEach(() => {
      const validSkillData = {
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

      game.items = {
        contents: [
          {
            id: 'item1',
            name: 'Test Skill',
            type: 'skill',
            toObject: () => validSkillData,
            effects: { contents: [] }
          }
        ],
        get: (id) => game.items.contents.find((i) => i.id === id)
      };
    });

    it('should export specific items', async () => {
      const result = await ExportService.exportItems(['item1'], false);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Test Skill');
      expect(result.count).toBe(1);
    });

    it('should handle non-existent items', async () => {
      const result = await ExportService.exportItems(['item1', 'nonexistent'], false);

      expect(result.items).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should validate items when enabled', async () => {
      const result = await ExportService.exportItems(['item1'], true);

      expect(result.validation.enabled).toBe(true);
      expect(result.validation.valid).toBe(1);
      expect(result.validation.invalid).toBe(0);
    });
  });

  describe('downloadExport', () => {
    it('should trigger download', () => {
      const saveDataToFileSpy = vi.spyOn(globalThis, 'saveDataToFile');

      const exportData = {
        metadata: { worldId: 'test' },
        actors: [],
        items: []
      };

      ExportService.downloadExport(exportData);

      expect(saveDataToFileSpy).toHaveBeenCalled();
      expect(saveDataToFileSpy.mock.calls[0][1]).toBe('application/json');
      expect(saveDataToFileSpy.mock.calls[0][2]).toContain('l5r4-export-test-');

      saveDataToFileSpy.mockRestore();
    });

    it('should use custom filename', () => {
      const saveDataToFileSpy = vi.spyOn(globalThis, 'saveDataToFile');

      ExportService.downloadExport({}, 'custom-export.json');

      expect(saveDataToFileSpy).toHaveBeenCalledWith(expect.any(String), 'application/json', 'custom-export.json');

      saveDataToFileSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should preserve embedded items through export', async () => {
      game.actors = {
        contents: [
          {
            id: 'actor1',
            name: 'PC with Items',
            type: 'pc',
            toObject: () => ({
              _id: 'actor1',
              name: 'PC with Items',
              type: 'pc',
              items: [
                { _id: 'emb1', name: 'Embedded Skill', type: 'skill' },
                { _id: 'emb2', name: 'Embedded Weapon', type: 'weapon' }
              ]
            }),
            items: {
              contents: [
                { toObject: () => ({ _id: 'emb1', name: 'Embedded Skill', type: 'skill' }) },
                { toObject: () => ({ _id: 'emb2', name: 'Embedded Weapon', type: 'weapon' }) }
              ]
            },
            effects: { contents: [] }
          }
        ],
        get: vi.fn()
      };
      game.items = { contents: [], get: vi.fn() };
      game.scenes = { contents: [] };
      game.journal = { contents: [] };
      game.folders = { contents: [] };

      const result = await ExportService.exportWorld({ validate: false });

      expect(result.data.actors[0].items).toHaveLength(2);
      expect(result.data.actors[0].items[0].name).toBe('Embedded Skill');
      expect(result.data.actors[0].items[1].name).toBe('Embedded Weapon');
    });

    it('should handle empty world', async () => {
      game.actors = { contents: [], get: vi.fn() };
      game.items = { contents: [], get: vi.fn() };
      game.scenes = { contents: [] };
      game.journal = { contents: [] };
      game.folders = { contents: [] };

      const result = await ExportService.exportWorld({ validate: false });

      expect(result.success).toBe(true);
      expect(result.data.actors).toHaveLength(0);
      expect(result.data.items).toHaveLength(0);
      expect(result.data.metadata.stats.actors).toBe(0);
    });
  });
});
