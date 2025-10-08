/**
 * @fileoverview Unit Tests for Path Utilities
 *
 * Tests safe nested property access and manipulation functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getByPath,
  setByPath,
  deleteByPath,
  hasPath,
  copyPath,
  renameField,
  getAllPaths
} from '@module/utils/path-utils.js';

describe('Path Utilities', () => {
  describe('getByPath', () => {
    it('should retrieve simple property', () => {
      const obj = { name: 'Test' };
      expect(getByPath(obj, 'name')).toBe('Test');
    });

    it('should retrieve nested property', () => {
      const obj = {
        system: {
          traits: {
            str: 3
          }
        }
      };
      expect(getByPath(obj, 'system.traits.str')).toBe(3);
    });

    it('should return undefined for missing path', () => {
      const obj = { system: {} };
      expect(getByPath(obj, 'system.nonexistent.field')).toBeUndefined();
    });

    it('should handle null/undefined objects', () => {
      expect(getByPath(null, 'system.field')).toBeUndefined();
      expect(getByPath(undefined, 'system.field')).toBeUndefined();
    });

    it('should handle invalid paths', () => {
      const obj = { system: {} };
      expect(getByPath(obj, null)).toBeUndefined();
      expect(getByPath(obj, '')).toBeUndefined();
      expect(getByPath(obj, 123)).toBeUndefined();
    });

    it('should retrieve zero and false values', () => {
      const obj = { zero: 0, bool: false };
      expect(getByPath(obj, 'zero')).toBe(0);
      expect(getByPath(obj, 'bool')).toBe(false);
    });

    it('should handle arrays in path', () => {
      const obj = { items: [{ name: 'First' }, { name: 'Second' }] };
      expect(getByPath(obj, 'items')).toEqual([{ name: 'First' }, { name: 'Second' }]);
    });
  });

  describe('setByPath', () => {
    it('should set simple property', () => {
      const obj = {};
      setByPath(obj, 'name', 'Test');
      expect(obj.name).toBe('Test');
    });

    it('should set nested property, creating intermediates', () => {
      const obj = {};
      setByPath(obj, 'system.traits.str', 4);
      expect(obj.system.traits.str).toBe(4);
    });

    it('should overwrite existing property', () => {
      const obj = { system: { traits: { str: 2 } } };
      setByPath(obj, 'system.traits.str', 5);
      expect(obj.system.traits.str).toBe(5);
    });

    it('should create missing parent objects', () => {
      const obj = { system: {} };
      setByPath(obj, 'system.rings.fire', 3);
      expect(obj.system.rings.fire).toBe(3);
    });

    it('should handle null/undefined objects', () => {
      expect(setByPath(null, 'field', 'value')).toBe(false);
      expect(setByPath(undefined, 'field', 'value')).toBe(false);
    });

    it('should handle invalid paths', () => {
      const obj = {};
      expect(setByPath(obj, null, 'value')).toBe(false);
      expect(setByPath(obj, '', 'value')).toBe(false);
    });

    it('should set zero and false values', () => {
      const obj = {};
      setByPath(obj, 'zero', 0);
      setByPath(obj, 'bool', false);
      expect(obj.zero).toBe(0);
      expect(obj.bool).toBe(false);
    });

    it('should return true on success', () => {
      const obj = {};
      expect(setByPath(obj, 'system.field', 'value')).toBe(true);
    });
  });

  describe('deleteByPath', () => {
    it('should delete simple property', () => {
      const obj = { name: 'Test', other: 'Keep' };
      deleteByPath(obj, 'name');
      expect(obj).toEqual({ other: 'Keep' });
    });

    it('should delete nested property', () => {
      const obj = {
        system: {
          old: 'delete me',
          keep: 'preserve this'
        }
      };
      deleteByPath(obj, 'system.old');
      expect(obj.system).toEqual({ keep: 'preserve this' });
    });

    it('should return false for missing path', () => {
      const obj = { system: {} };
      expect(deleteByPath(obj, 'system.nonexistent')).toBe(false);
    });

    it('should handle null/undefined objects', () => {
      expect(deleteByPath(null, 'field')).toBe(false);
      expect(deleteByPath(undefined, 'field')).toBe(false);
    });

    it('should return true on successful deletion', () => {
      const obj = { field: 'value' };
      expect(deleteByPath(obj, 'field')).toBe(true);
    });

    it('should not delete if intermediate path missing', () => {
      const obj = { system: {} };
      const result = deleteByPath(obj, 'system.missing.field');
      expect(result).toBe(false);
    });
  });

  describe('hasPath', () => {
    it('should return true for existing path', () => {
      const obj = { system: { traits: { str: 3 } } };
      expect(hasPath(obj, 'system.traits.str')).toBe(true);
    });

    it('should return false for missing path', () => {
      const obj = { system: {} };
      expect(hasPath(obj, 'system.nonexistent')).toBe(false);
    });

    it('should return true even if value is null/undefined', () => {
      const obj = { nullVal: null, undefinedVal: undefined };
      expect(hasPath(obj, 'nullVal')).toBe(true);
      expect(hasPath(obj, 'undefinedVal')).toBe(true);
    });

    it('should return false for missing intermediate', () => {
      const obj = { system: {} };
      expect(hasPath(obj, 'system.missing.field')).toBe(false);
    });

    it('should handle null/undefined objects', () => {
      expect(hasPath(null, 'field')).toBe(false);
      expect(hasPath(undefined, 'field')).toBe(false);
    });
  });

  describe('copyPath', () => {
    it('should copy value from one path to another', () => {
      const obj = { old: 'value' };
      copyPath(obj, 'old', 'new');
      expect(obj.new).toBe('value');
      expect(obj.old).toBe('value'); // Source preserved by default
    });

    it('should delete source if requested', () => {
      const obj = { old: 'value' };
      copyPath(obj, 'old', 'new', true);
      expect(obj.new).toBe('value');
      expect(obj.old).toBeUndefined();
    });

    it('should copy nested values', () => {
      const obj = { system: { wound_lvl: { healthy: { value: 10 } } } };
      copyPath(obj, 'system.wound_lvl', 'system.woundLevels');
      expect(obj.system.woundLevels).toEqual({ healthy: { value: 10 } });
    });

    it('should return false if source missing', () => {
      const obj = {};
      expect(copyPath(obj, 'nonexistent', 'new')).toBe(false);
    });

    it('should create destination path', () => {
      const obj = { old: 'value' };
      copyPath(obj, 'old', 'nested.new.path');
      expect(obj.nested.new.path).toBe('value');
    });
  });

  describe('renameField', () => {
    it('should rename field at base path', () => {
      const obj = { system: { initiative: { roll_mod: 5 } } };
      renameField(obj, 'system.initiative', 'roll_mod', 'rollMod');
      expect(obj.system.initiative.rollMod).toBe(5);
      expect(obj.system.initiative.roll_mod).toBeUndefined();
    });

    it('should work without base path', () => {
      const obj = { old_name: 'value' };
      renameField(obj, '', 'old_name', 'newName');
      expect(obj.newName).toBe('value');
      expect(obj.old_name).toBeUndefined();
    });

    it('should work with null base path', () => {
      const obj = { old_name: 'value' };
      renameField(obj, null, 'old_name', 'newName');
      expect(obj.newName).toBe('value');
    });

    it('should return false if old field missing', () => {
      const obj = { system: {} };
      expect(renameField(obj, 'system', 'nonexistent', 'new')).toBe(false);
    });
  });

  describe('getAllPaths', () => {
    it('should return all leaf paths', () => {
      const obj = {
        system: {
          traits: {
            str: 3,
            sta: 2
          },
          xp: 10
        }
      };
      const paths = getAllPaths(obj);
      expect(paths).toContain('system.traits.str');
      expect(paths).toContain('system.traits.sta');
      expect(paths).toContain('system.xp');
      expect(paths.length).toBe(3);
    });

    it('should handle empty object', () => {
      expect(getAllPaths({})).toEqual([]);
    });

    it('should handle arrays as leaf values', () => {
      const obj = { items: [1, 2, 3] };
      const paths = getAllPaths(obj);
      expect(paths).toEqual(['items']);
    });

    it('should use prefix if provided', () => {
      const obj = { str: 3, sta: 2 };
      const paths = getAllPaths(obj, 'system.traits');
      expect(paths).toContain('system.traits.str');
      expect(paths).toContain('system.traits.sta');
    });

    it('should handle null/undefined', () => {
      expect(getAllPaths(null)).toEqual([]);
      expect(getAllPaths(undefined)).toEqual([]);
    });
  });

  describe('Real-world migration scenarios', () => {
    it('should migrate wound_lvl to woundLevels', () => {
      const actor = {
        system: {
          wound_lvl: {
            healthy: { value: 10, penalty: 0 },
            nicked: { value: 15, penalty: 3 }
          }
        }
      };

      copyPath(actor, 'system.wound_lvl', 'system.woundLevels', true);

      expect(actor.system.woundLevels).toEqual({
        healthy: { value: 10, penalty: 0 },
        nicked: { value: 15, penalty: 3 }
      });
      expect(actor.system.wound_lvl).toBeUndefined();
    });

    it('should migrate multiple initiative modifiers', () => {
      const actor = {
        system: {
          initiative: {
            roll: 5,
            keep: 3,
            roll_mod: 2,
            keep_mod: 1,
            total_mod: 3
          }
        }
      };

      renameField(actor, 'system.initiative', 'roll_mod', 'rollMod');
      renameField(actor, 'system.initiative', 'keep_mod', 'keepMod');
      renameField(actor, 'system.initiative', 'total_mod', 'totalMod');

      expect(actor.system.initiative).toEqual({
        roll: 5,
        keep: 3,
        rollMod: 2,
        keepMod: 1,
        totalMod: 3
      });
    });

    it('should migrate skill bonuses', () => {
      const item = {
        system: {
          roll_bonus: 5,
          keep_bonus: 2,
          total_bonus: 7
        }
      };

      renameField(item, 'system', 'roll_bonus', 'rollBonus');
      renameField(item, 'system', 'keep_bonus', 'keepBonus');
      renameField(item, 'system', 'total_bonus', 'totalBonus');

      expect(item.system).toEqual({
        rollBonus: 5,
        keepBonus: 2,
        totalBonus: 7
      });
    });
  });
});
