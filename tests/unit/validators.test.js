/**
 * @fileoverview Unit Tests for Data Validators
 * 
 * Tests validation functions for Actor and Item data structures.
 * Based on l5r4-old schema.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateActorData, validateItemData } from '@module/utils/validators.js';

describe('Actor Data Validators', () => {
  describe('Basic structure validation', () => {
    it('should reject null actor data', () => {
      const result = validateActorData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Actor data is null or undefined');
    });

    it('should reject actor without type', () => {
      const result = validateActorData({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Actor missing 'type' field");
    });

    it('should reject invalid actor type', () => {
      const result = validateActorData({ type: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid actor type');
    });
  });

  describe('PC Actor validation', () => {
    let validPC;

    beforeEach(() => {
      validPC = {
        type: 'pc',
        system: {
          traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
          rings: { fire: 2, air: 2, water: 2, earth: 2, void: { rank: 2, value: 2, max: 2 } },
          wounds: { value: 0, max: 20, mod: 0, heal_rate: 0 },
          wound_lvl: {
            healthy: { value: 10, penalty: 0, current: true },
            nicked: { value: 15, penalty: 3, current: false },
            grazed: { value: 20, penalty: 5, current: false },
            hurt: { value: 25, penalty: 10, current: false },
            injured: { value: 30, penalty: 15, current: false },
            crippled: { value: 35, penalty: 20, current: false },
            down: { value: 40, penalty: 40, current: false },
            out: { value: 50, penalty: 40, current: false }
          },
          armor: { armor_tn: 0, reduction: 0 },
          xp: 0,
          honor: { rank: 2, points: 0 },
          glory: { rank: 1, points: 0 },
          status: { rank: 1, points: 0 },
          shadow_taint: { rank: 0, points: 0 },
          initiative: { roll: 5, keep: 3, roll_mod: 0, keep_mod: 0, total_mod: 0 },
          insight: { rank: 1, points: 0 },
          armor_tn: { type: '', reduction: 0, current: 0, mod: 0 },
          wealth: { koku: 0, bu: 0, zeni: 0 },
          spellSlots: { water: 2, fire: 2, earth: 2, air: 2, void: 2 }
        }
      };
    });

    it('should validate correct PC', () => {
      const result = validateActorData(validPC);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing traits', () => {
      delete validPC.system.traits.str;
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('traits.str'))).toBe(true);
    });

    it('should detect invalid trait type', () => {
      validPC.system.traits.str = 'not a number';
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('traits.str'))).toBe(true);
    });

    it('should detect missing rings', () => {
      delete validPC.system.rings.fire;
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('rings.fire'))).toBe(true);
    });

    it('should detect missing void ring', () => {
      delete validPC.system.rings.void;
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('rings.void'))).toBe(true);
    });

    it('should accept new-style camelCase fields', () => {
      delete validPC.system.shadow_taint;
      validPC.system.shadowTaint = { rank: 0, points: 0 };
      
      delete validPC.system.initiative.roll_mod;
      validPC.system.initiative.rollMod = 0;
      
      const result = validateActorData(validPC);
      expect(result.valid).toBe(true);
    });

    it('should detect missing wound levels', () => {
      delete validPC.system.wound_lvl.healthy;
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('healthy'))).toBe(true);
    });

    it('should accept string penalties in wound levels', () => {
      validPC.system.wound_lvl.nicked.penalty = "3";
      const result = validateActorData(validPC);
      expect(result.valid).toBe(true); // Strings are acceptable for migration
    });

    it('should detect missing XP', () => {
      delete validPC.system.xp;
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('xp'))).toBe(true);
    });

    it('should detect missing honor/glory/status', () => {
      delete validPC.system.honor;
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('honor'))).toBe(true);
    });

    it('should detect missing wealth', () => {
      delete validPC.system.wealth;
      const result = validateActorData(validPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('wealth'))).toBe(true);
    });

    it('should warn about missing spell slots', () => {
      delete validPC.system.spellSlots;
      const result = validateActorData(validPC);
      expect(result.warnings.some(w => w.includes('spellSlots'))).toBe(true);
    });
  });

  describe('NPC Actor validation', () => {
    let validNPC;

    beforeEach(() => {
      validNPC = {
        type: 'npc',
        system: {
          traits: { sta: 2, wil: 2, str: 3, per: 2, ref: 2, awa: 2, agi: 2, int: 1 },
          rings: { fire: 2, air: 2, water: 2, earth: 2, void: { rank: 2 } },
          wounds: { value: 0, max: 20, mod: 0, heal_rate: 0 },
          wound_lvl: {
            healthy: { value: 15, penalty: 0, current: true },
            nicked: { value: 20, penalty: 3, current: false },
            grazed: { value: 25, penalty: 5, current: false },
            hurt: { value: 30, penalty: 10, current: false },
            injured: { value: 35, penalty: 15, current: false },
            crippled: { value: 40, penalty: 20, current: false },
            down: { value: 43, penalty: 40, current: false },
            out: { value: 45, penalty: 40, current: false }
          },
          armor: { armor_tn: 15, reduction: 3 },
          initiative: { roll: 5, keep: 3 },
          attack1: { roll: 5, keep: 3, type: 'katana' },
          attack2: { roll: 3, keep: 2, type: 'wakizashi' },
          damage1: { roll: 6, keep: 2, type: '' },
          damage2: { roll: 4, keep: 2, type: '' },
          nrWoundLvls: 3
        }
      };
    });

    it('should validate correct NPC', () => {
      const result = validateActorData(validNPC);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing void ring', () => {
      delete validNPC.system.rings.void;
      const result = validateActorData(validNPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('rings.void'))).toBe(true);
    });

    it('should detect missing initiative', () => {
      delete validNPC.system.initiative;
      const result = validateActorData(validNPC);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('initiative'))).toBe(true);
    });

    it('should warn about missing attack pools', () => {
      delete validNPC.system.attack1;
      const result = validateActorData(validNPC);
      expect(result.warnings.some(w => w.includes('attack1'))).toBe(true);
    });

    it('should accept string nrWoundLvls', () => {
      validNPC.system.nrWoundLvls = "3";
      const result = validateActorData(validNPC);
      expect(result.valid).toBe(true); // Strings acceptable for migration
    });

    it('should accept new-style woundLevels field', () => {
      validNPC.system.woundLevels = validNPC.system.wound_lvl;
      delete validNPC.system.wound_lvl;
      
      const result = validateActorData(validNPC);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Item Data Validators', () => {
  describe('Basic structure validation', () => {
    it('should reject null item data', () => {
      const result = validateItemData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item data is null or undefined');
    });

    it('should reject item without type', () => {
      const result = validateItemData({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Item missing 'type' field");
    });

    it('should reject invalid item type', () => {
      const result = validateItemData({ type: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid item type');
    });
  });

  describe('Skill Item validation', () => {
    let validSkill;

    beforeEach(() => {
      validSkill = {
        type: 'skill',
        system: {
          rank: 3,
          type: 'high',
          trait: 'int',
          emphasis: 'Investigation',
          mastery_3: 'Bonus effect',
          mastery_5: '',
          mastery_7: '',
          insight_bonus: 0,
          school: false,
          roll_bonus: 5,
          keep_bonus: 2,
          total_bonus: 7
        }
      };
    });

    it('should validate correct skill', () => {
      const result = validateItemData(validSkill);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid rank type', () => {
      validSkill.system.rank = 'three';
      const result = validateItemData(validSkill);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('rank'))).toBe(true);
    });

    it('should warn about invalid trait', () => {
      validSkill.system.trait = 'invalid';
      const result = validateItemData(validSkill);
      expect(result.warnings.some(w => w.includes('trait'))).toBe(true);
    });

    it('should accept new-style camelCase fields', () => {
      delete validSkill.system.roll_bonus;
      delete validSkill.system.keep_bonus;
      delete validSkill.system.total_bonus;
      
      validSkill.system.rollBonus = 5;
      validSkill.system.keepBonus = 2;
      validSkill.system.totalBonus = 7;
      
      const result = validateItemData(validSkill);
      expect(result.valid).toBe(true);
    });

    it('should warn if bonus fields missing', () => {
      // Delete ALL bonus fields to trigger warning
      delete validSkill.system.roll_bonus;
      delete validSkill.system.keep_bonus;
      delete validSkill.system.total_bonus;
      delete validSkill.system.rollBonus;
      delete validSkill.system.keepBonus;
      delete validSkill.system.totalBonus;
      
      const result = validateItemData(validSkill);
      expect(result.warnings.some(w => w.includes('bonus fields'))).toBe(true);
    });
  });

  describe('Weapon Item validation', () => {
    let validWeapon;

    beforeEach(() => {
      validWeapon = {
        type: 'weapon',
        system: {
          damageRoll: 3,
          damageKeep: 2,
          size: 'Medium',
          damageFormula: '3k2',
          explodesOn: 10
        }
      };
    });

    it('should validate correct weapon', () => {
      const result = validateItemData(validWeapon);
      expect(result.valid).toBe(true);
    });

    it('should detect missing damageRoll', () => {
      delete validWeapon.system.damageRoll;
      const result = validateItemData(validWeapon);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('damageRoll'))).toBe(true);
    });

    it('should detect invalid explodesOn type', () => {
      validWeapon.system.explodesOn = '10';
      const result = validateItemData(validWeapon);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('explodesOn'))).toBe(true);
    });

    it('should accept different size casings', () => {
      validWeapon.system.size = 'medium';
      let result = validateItemData(validWeapon);
      expect(result.valid).toBe(true);
      
      validWeapon.system.size = 'Large';
      result = validateItemData(validWeapon);
      expect(result.valid).toBe(true);
    });
  });

  describe('Bow Item validation (legacy)', () => {
    let validBow;

    beforeEach(() => {
      validBow = {
        type: 'bow',
        system: {
          str: 3,
          size: 'Large',
          range: 250,
          arrow: 'willow',
          damageRoll: 2,
          damageKeep: 2,
          explodesOn: 10
        }
      };
    });

    it('should validate correct bow', () => {
      const result = validateItemData(validBow);
      expect(result.valid).toBe(true);
    });

    it('should warn that bow needs conversion', () => {
      const result = validateItemData(validBow);
      expect(result.warnings.some(w => w.includes('Bow item detected'))).toBe(true);
    });

    it('should detect missing str', () => {
      delete validBow.system.str;
      const result = validateItemData(validBow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('str'))).toBe(true);
    });

    it('should detect missing range', () => {
      delete validBow.system.range;
      const result = validateItemData(validBow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('range'))).toBe(true);
    });
  });

  describe('Armor Item validation', () => {
    let validArmor;

    beforeEach(() => {
      validArmor = {
        type: 'armor',
        system: {
          bonus: 5,
          reduction: 3,
          specialRues: 'Light armor', // Typo in old system
          equiped: true // Typo in old system
        }
      };
    });

    it('should validate armor with typos', () => {
      const result = validateItemData(validArmor);
      expect(result.valid).toBe(true);
    });

    it('should warn about specialRues typo', () => {
      const result = validateItemData(validArmor);
      expect(result.warnings.some(w => w.includes('specialRues'))).toBe(true);
    });

    it('should accept equipped or equiped', () => {
      validArmor.system.equipped = true;
      delete validArmor.system.equiped;
      
      let result = validateItemData(validArmor);
      expect(result.valid).toBe(true);
      
      validArmor.system.equiped = true;
      delete validArmor.system.equipped;
      
      result = validateItemData(validArmor);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid bonus type', () => {
      validArmor.system.bonus = '5';
      const result = validateItemData(validArmor);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('bonus'))).toBe(true);
    });
  });

  describe('Spell Item validation', () => {
    let validSpell;

    beforeEach(() => {
      validSpell = {
        type: 'spell',
        system: {
          ring: 'fire',
          mastery: 3,
          keywords: ['Thunder', 'Craft'],
          range: '50 feet',
          aoe: '',
          duration: 'Concentration',
          raises: 'Additional targets'
        }
      };
    });

    it('should validate correct spell', () => {
      const result = validateItemData(validSpell);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid ring', () => {
      validSpell.system.ring = 'invalid';
      const result = validateItemData(validSpell);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ring'))).toBe(true);
    });

    it('should detect invalid mastery type', () => {
      validSpell.system.mastery = 'three';
      const result = validateItemData(validSpell);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('mastery'))).toBe(true);
    });

    it('should warn if keywords not array', () => {
      validSpell.system.keywords = 'Thunder, Craft';
      const result = validateItemData(validSpell);
      expect(result.warnings.some(w => w.includes('keywords'))).toBe(true);
    });
  });

  describe('Advantage/Disadvantage Item validation', () => {
    it('should validate advantage', () => {
      const advantage = {
        type: 'advantage',
        system: {
          cost: 5,
          type: 'physical'
        }
      };
      
      const result = validateItemData(advantage);
      expect(result.valid).toBe(true);
    });

    it('should validate disadvantage', () => {
      const disadvantage = {
        type: 'disadvantage',
        system: {
          cost: -3,
          type: 'mental'
        }
      };
      
      const result = validateItemData(disadvantage);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid cost type', () => {
      const advantage = {
        type: 'advantage',
        system: { cost: 'five', type: 'physical' }
      };
      
      const result = validateItemData(advantage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cost'))).toBe(true);
    });
  });

  describe('Technique Item validation', () => {
    it('should validate technique', () => {
      const technique = {
        type: 'technique',
        system: {
          rank: 2,
          shugenja: false,
          affinity: 'fire',
          deficiency: 'air'
        }
      };
      
      const result = validateItemData(technique);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid rank', () => {
      const technique = {
        type: 'technique',
        system: { rank: 'two', shugenja: false }
      };
      
      const result = validateItemData(technique);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('rank'))).toBe(true);
    });
  });

  describe('Kata/Kiho Item validation', () => {
    it('should validate kata', () => {
      const kata = {
        type: 'kata',
        system: {
          ring: 'earth',
          mastery: 3
        }
      };
      
      const result = validateItemData(kata);
      expect(result.valid).toBe(true);
    });

    it('should validate kiho', () => {
      const kiho = {
        type: 'kiho',
        system: {
          ring: 'void',
          mastery: 5,
          type: 'internal'
        }
      };
      
      const result = validateItemData(kiho);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid ring', () => {
      const kata = {
        type: 'kata',
        system: { ring: 'invalid', mastery: 1 }
      };
      
      const result = validateItemData(kata);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ring'))).toBe(true);
    });
  });

  describe('Tattoo Item validation', () => {
    it('should validate tattoo', () => {
      const tattoo = {
        type: 'tattoo',
        system: {
          effect: '+1k0 to Strength rolls'
        }
      };
      
      const result = validateItemData(tattoo);
      expect(result.valid).toBe(true);
    });

    it('should warn if effect not string', () => {
      const tattoo = {
        type: 'tattoo',
        system: { effect: 123 }
      };
      
      const result = validateItemData(tattoo);
      expect(result.warnings.some(w => w.includes('effect'))).toBe(true);
    });
  });

  describe('CommonItem validation', () => {
    it('should validate commonItem', () => {
      const item = {
        type: 'commonItem',
        system: {
          description: 'A common item',
          specialRules: ''
        }
      };
      
      const result = validateItemData(item);
      expect(result.valid).toBe(true);
    });
  });
});
