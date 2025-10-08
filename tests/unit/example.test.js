/**
 * @fileoverview Example Unit Test
 *
 * This is a template test file showing how to write unit tests
 * for the L5R4 migrator module.
 *
 * Delete or replace this file with actual tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Example Test Suite', () => {
  describe('Foundry Mocks', () => {
    it('should have game global available', () => {
      expect(game).toBeDefined();
      expect(game.system.id).toBe('l5r4');
    });

    it('should have Hooks global available', () => {
      expect(Hooks).toBeDefined();
      expect(Hooks.on).toBeDefined();
    });

    it('should have foundry namespace available', () => {
      expect(foundry).toBeDefined();
      expect(foundry.utils).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('should merge objects correctly', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const result = mergeObject(obj1, obj2);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should duplicate objects', () => {
      const original = { nested: { value: 'test' } };
      const copy = duplicate(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy.nested).not.toBe(original.nested);
    });
  });
});
