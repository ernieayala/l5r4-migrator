/**
 * @fileoverview Unit Tests for Import Service
 * 
 * Tests data transformation and import logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImportService } from '@module/services/import-service.js';

describe('Import Service', () => {
  beforeEach(() => {
    // Reset Actor.create and Item.create mocks
    Actor.create = vi.fn().mockResolvedValue({});
    Item.create = vi.fn().mockResolvedValue({});
    Folder.create = vi.fn().mockResolvedValue({});
    Scene.create = vi.fn().mockResolvedValue({});
    JournalEntry.create = vi.fn().mockResolvedValue({});
  });

  describe('_transformActor', () => {
    it('should apply schema transformations to PC', () => {
      const oldPC = {
        type: 'pc',
        name: 'Test PC',
        system: {
          wounds: { heal_rate: 5 },
          wound_lvl: { healthy: { value: 10 } },
          armor: { armor_tn: 15 },
          armor_tn: { current: 20 },
          initiative: { roll_mod: 2, keep_mod: 1, total_mod: 3 },
          shadow_taint: { rank: 0 }
        }
      };

      const transformed = ImportService._transformActor(oldPC);

      // Check transformations applied
      expect(transformed.system.wounds.healRate).toBe(5);
      expect(transformed.system.wounds.heal_rate).toBeUndefined();
      
      expect(transformed.system.woundLevels).toBeDefined();
      expect(transformed.system.wound_lvl).toBeUndefined();
      
      expect(transformed.system.armor.armorTn).toBe(15);
      expect(transformed.system.armor.armor_tn).toBeUndefined();
      
      expect(transformed.system.armorTn).toBeDefined();
      expect(transformed.system.armor_tn).toBeUndefined();
      
      expect(transformed.system.initiative.rollMod).toBe(2);
      expect(transformed.system.initiative.keepMod).toBe(1);
      expect(transformed.system.initiative.totalMod).toBe(3);
      
      expect(transformed.system.shadowTaint).toBeDefined();
      expect(transformed.system.shadow_taint).toBeUndefined();
    });

    it('should add new PC fields', () => {
      const oldPC = {
        type: 'pc',
        name: 'Test PC',
        system: {}
      };

      const transformed = ImportService._transformActor(oldPC);

      expect(transformed.system.bonuses).toEqual({ skill: {}, trait: {}, ring: {} });
      expect(transformed.system.woundsPenaltyMod).toBe(0);
    });

    it('should not override existing new fields', () => {
      const oldPC = {
        type: 'pc',
        name: 'Test PC',
        system: {
          bonuses: { skill: { athletics: 5 } },
          woundsPenaltyMod: 10
        }
      };

      const transformed = ImportService._transformActor(oldPC);

      expect(transformed.system.bonuses.skill.athletics).toBe(5);
      expect(transformed.system.woundsPenaltyMod).toBe(10);
    });

    it('should apply schema transformations to NPC', () => {
      const oldNPC = {
        type: 'npc',
        name: 'Test NPC',
        system: {
          wounds: { heal_rate: 3 },
          wound_lvl: { healthy: { value: 15 } },
          armor: { armor_tn: 20 }
        }
      };

      const transformed = ImportService._transformActor(oldNPC);

      expect(transformed.system.wounds.healRate).toBe(3);
      expect(transformed.system.woundLevels).toBeDefined();
      expect(transformed.system.armor.armorTn).toBe(20);
    });

    it('should add new NPC fields', () => {
      const oldNPC = {
        type: 'npc',
        name: 'Test NPC',
        system: {}
      };

      const transformed = ImportService._transformActor(oldNPC);

      expect(transformed.system.woundMode).toBe('manual');
      expect(transformed.system.fear).toEqual({ rank: 0 });
    });

    it('should transform embedded items', () => {
      const oldPC = {
        type: 'pc',
        name: 'Test PC',
        system: {},
        items: [
          {
            type: 'skill',
            name: 'Athletics',
            system: { roll_bonus: 5 }
          },
          {
            type: 'bow',
            name: 'Yumi',
            system: { str: 3, size: 'Large' }
          }
        ]
      };

      const transformed = ImportService._transformActor(oldPC);

      // Check skill transformation
      expect(transformed.items[0].system.rollBonus).toBe(5);
      expect(transformed.items[0].system.roll_bonus).toBeUndefined();

      // Check bow conversion
      expect(transformed.items[1].type).toBe('weapon');
      expect(transformed.items[1].system.isBow).toBe(true);
      expect(transformed.items[1].system.size).toBe('large');
    });
  });

  describe('_transformItem', () => {
    it('should apply schema transformations to skill', () => {
      const oldSkill = {
        type: 'skill',
        name: 'Investigation',
        system: {
          mastery_3: 'Bonus',
          mastery_5: '',
          mastery_7: '',
          insight_bonus: 5,
          roll_bonus: 2,
          keep_bonus: 1,
          total_bonus: 3
        }
      };

      const transformed = ImportService._transformItem(oldSkill);

      expect(transformed.system.mastery3).toBe('Bonus');
      expect(transformed.system.mastery5).toBe('');
      expect(transformed.system.mastery7).toBe('');
      expect(transformed.system.insightBonus).toBe(5);
      expect(transformed.system.rollBonus).toBe(2);
      expect(transformed.system.keepBonus).toBe(1);
      expect(transformed.system.totalBonus).toBe(3);

      // Old fields should be removed
      expect(transformed.system.mastery_3).toBeUndefined();
      expect(transformed.system.roll_bonus).toBeUndefined();
    });

    it('should add new skill fields', () => {
      const oldSkill = {
        type: 'skill',
        name: 'Athletics',
        system: {}
      };

      const transformed = ImportService._transformItem(oldSkill);

      expect(transformed.system.freeRanks).toBe(0);
      expect(transformed.system.freeEmphasis).toBe(0);
    });

    it('should convert bow to weapon with isBow flag', () => {
      const bowItem = {
        type: 'bow',
        name: 'Yumi',
        system: {
          str: 3,
          range: 250,
          size: 'Large',
          damageRoll: 2,
          damageKeep: 2
        }
      };

      const transformed = ImportService._transformItem(bowItem);

      expect(transformed.type).toBe('weapon');
      expect(transformed.system.isBow).toBe(true);
      expect(transformed.system.size).toBe('large');
      expect(transformed.system.str).toBe(3);
      expect(transformed.system.range).toBe(250);
    });

    it('should add new weapon fields', () => {
      const weapon = {
        type: 'weapon',
        name: 'Katana',
        system: { size: 'Medium' }
      };

      const transformed = ImportService._transformItem(weapon);

      expect(transformed.system.associatedSkill).toBe('');
      expect(transformed.system.fallbackTrait).toBe('agi');
      expect(transformed.system.isBow).toBe(false);
      expect(transformed.system.size).toBe('medium');
    });

    it('should apply armor transformations', () => {
      const armor = {
        type: 'armor',
        name: 'Light Armor',
        system: {
          equiped: true,
          specialRues: 'No penalty'
        }
      };

      const transformed = ImportService._transformItem(armor);

      expect(transformed.system.equipped).toBe(true);
      expect(transformed.system.specialRules).toBe('No penalty');
      expect(transformed.system.equiped).toBeUndefined();
      expect(transformed.system.specialRues).toBeUndefined();
    });
  });

  describe('importActors', () => {
    it('should import actors with transformations', async () => {
      const actors = [
        { type: 'pc', name: 'PC 1', system: { wounds: { heal_rate: 5 } } },
        { type: 'npc', name: 'NPC 1', system: { wounds: { heal_rate: 3 } } }
      ];

      const stats = await ImportService.importActors(actors, false);

      expect(stats.attempted).toBe(2);
      expect(stats.created).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.transformed).toBe(2);
      expect(Actor.create).toHaveBeenCalledTimes(2);
    });

    it('should handle import failures gracefully', async () => {
      Actor.create = vi.fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Import failed'));

      const actors = [
        { type: 'pc', name: 'PC 1', system: {} },
        { type: 'pc', name: 'PC 2', system: {} }
      ];

      const stats = await ImportService.importActors(actors, false);

      expect(stats.attempted).toBe(2);
      expect(stats.created).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should skip creation in dry run mode', async () => {
      const actors = [
        { type: 'pc', name: 'PC 1', system: {} }
      ];

      const stats = await ImportService.importActors(actors, true);

      expect(stats.attempted).toBe(1);
      expect(stats.created).toBe(1);
      expect(stats.transformed).toBe(1);
      expect(Actor.create).not.toHaveBeenCalled();
    });
  });

  describe('importItems', () => {
    it('should import items with transformations', async () => {
      const items = [
        { type: 'skill', name: 'Skill 1', system: { roll_bonus: 5 } },
        { type: 'bow', name: 'Bow 1', system: { str: 3 } }
      ];

      const stats = await ImportService.importItems(items, false);

      expect(stats.attempted).toBe(2);
      expect(stats.created).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.transformed).toBe(2);
      expect(Item.create).toHaveBeenCalledTimes(2);

      // Verify bow was converted
      const bowCall = Item.create.mock.calls[1][0];
      expect(bowCall.type).toBe('weapon');
      expect(bowCall.system.isBow).toBe(true);
    });

    it('should handle import failures gracefully', async () => {
      Item.create = vi.fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Import failed'));

      const items = [
        { type: 'skill', name: 'Item 1', system: {} },
        { type: 'skill', name: 'Item 2', system: {} }
      ];

      const stats = await ImportService.importItems(items, false);

      expect(stats.attempted).toBe(2);
      expect(stats.created).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should skip creation in dry run mode', async () => {
      const items = [
        { type: 'skill', name: 'Skill 1', system: {} }
      ];

      const stats = await ImportService.importItems(items, true);

      expect(stats.attempted).toBe(1);
      expect(stats.created).toBe(1);
      expect(stats.transformed).toBe(1);
      expect(Item.create).not.toHaveBeenCalled();
    });
  });

  describe('importWorld', () => {
    it('should import complete world data', async () => {
      const data = {
        metadata: { worldId: 'test' },
        folders: [{ name: 'Folder 1' }],
        actors: [{ type: 'pc', name: 'Actor 1', system: {} }],
        items: [{ type: 'skill', name: 'Item 1', system: {} }],
        scenes: [{ name: 'Scene 1' }],
        journals: [{ name: 'Journal 1' }]
      };

      const result = await ImportService.importWorld(data, { dryRun: false });

      expect(result.success).toBe(true);
      expect(result.stats.folders.created).toBe(1);
      expect(result.stats.actors.created).toBe(1);
      expect(result.stats.items.created).toBe(1);
      expect(result.stats.scenes.created).toBe(1);
      expect(result.stats.journals.created).toBe(1);
    });

    it('should skip folders when requested', async () => {
      const data = {
        metadata: { worldId: 'test' },
        folders: [{ name: 'Folder 1' }],
        actors: [],
        items: []
      };

      const result = await ImportService.importWorld(data, { skipFolders: true });

      expect(result.stats.folders.attempted).toBe(0);
      expect(Folder.create).not.toHaveBeenCalled();
    });

    it('should skip scenes when requested', async () => {
      const data = {
        metadata: { worldId: 'test' },
        actors: [],
        items: [],
        scenes: [{ name: 'Scene 1' }]
      };

      const result = await ImportService.importWorld(data, { skipScenes: true });

      expect(result.stats.scenes.attempted).toBe(0);
      expect(Scene.create).not.toHaveBeenCalled();
    });

    it('should skip journals when requested', async () => {
      const data = {
        metadata: { worldId: 'test' },
        actors: [],
        items: [],
        journals: [{ name: 'Journal 1' }]
      };

      const result = await ImportService.importWorld(data, { skipJournals: true });

      expect(result.stats.journals.attempted).toBe(0);
      expect(JournalEntry.create).not.toHaveBeenCalled();
    });

    it('should work in dry run mode', async () => {
      const data = {
        metadata: { worldId: 'test' },
        actors: [{ type: 'pc', name: 'Actor 1', system: {} }],
        items: [{ type: 'skill', name: 'Item 1', system: {} }]
      };

      const result = await ImportService.importWorld(data, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.stats.actors.created).toBe(1);
      expect(result.stats.items.created).toBe(1);
      
      expect(Actor.create).not.toHaveBeenCalled();
      expect(Item.create).not.toHaveBeenCalled();
    });

    it('should handle empty data gracefully', async () => {
      const data = {
        metadata: { worldId: 'test' },
        actors: [],
        items: []
      };

      const result = await ImportService.importWorld(data);

      expect(result.success).toBe(true);
      expect(result.stats.actors.created).toBe(0);
      expect(result.stats.items.created).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete migration pipeline', async () => {
      const legacyData = {
        metadata: { worldId: 'legacy-world' },
        actors: [
          {
            type: 'pc',
            name: 'Samurai',
            system: {
              wounds: { heal_rate: 5 },
              shadow_taint: { rank: 0 },
              initiative: { roll_mod: 2 }
            },
            items: [
              {
                type: 'bow',
                name: 'Yumi',
                system: { str: 3, size: 'Large' }
              }
            ]
          }
        ],
        items: [
          {
            type: 'skill',
            name: 'Investigation',
            system: { roll_bonus: 5, mastery_3: 'Find clues' }
          }
        ]
      };

      const result = await ImportService.importWorld(legacyData, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.stats.actors.transformed).toBe(1);
      expect(result.stats.items.transformed).toBe(1);

      // Verify transformations would be applied
      const transformedActor = ImportService._transformActor(legacyData.actors[0]);
      expect(transformedActor.system.wounds.healRate).toBe(5);
      expect(transformedActor.system.shadowTaint).toBeDefined();
      expect(transformedActor.system.initiative.rollMod).toBe(2);
      expect(transformedActor.items[0].type).toBe('weapon');
      expect(transformedActor.items[0].system.isBow).toBe(true);

      const transformedItem = ImportService._transformItem(legacyData.items[0]);
      expect(transformedItem.system.rollBonus).toBe(5);
      expect(transformedItem.system.mastery3).toBe('Find clues');
    });

    it('should preserve data that does not need transformation', async () => {
      const modernData = {
        type: 'pc',
        name: 'Modern PC',
        system: {
          wounds: { healRate: 5 },
          shadowTaint: { rank: 0 },
          bonuses: { skill: { athletics: 2 } }
        }
      };

      const transformed = ImportService._transformActor(modernData);

      expect(transformed.system.wounds.healRate).toBe(5);
      expect(transformed.system.shadowTaint).toBeDefined();
      expect(transformed.system.bonuses.skill.athletics).toBe(2);
    });
  });
});
