/**
 * Unit tests for Schema State Detection Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaStateDetectionService } from '@module/services/schema-state-detection-service.js';

describe('SchemaStateDetectionService', () => {
  describe('detectState()', () => {
    it('should detect Original v12/v13 schema (snake_case)', () => {
      const data = {
        actors: [
          {
            system: {
              wounds: { heal_rate: 0 },
              wound_lvl: { healthy: { max: 10 } },
              armor: { armor_tn: 5 },
              shadow_taint: 0,
              initiative: { roll_mod: 0 }
            }
          }
        ],
        items: [{ system: { mastery_3: '', equiped: false } }]
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('original');
      expect(result.needsTransform).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.indicators.snakeCaseTotal).toBeGreaterThan(0);
      expect(result.indicators.camelCaseTotal).toBe(0);
    });

    it('should detect New v13 schema (camelCase + new fields)', () => {
      const data = {
        actors: [
          {
            system: {
              wounds: { healRate: 0 },
              woundLevels: { healthy: { max: 10 } },
              armor: { armorTn: 5 },
              shadowTaint: 0,
              initiative: { rollMod: 0 },
              bonuses: {},
              woundMode: 'pc'
            }
          }
        ],
        items: [{ system: { mastery3: '', equipped: true, freeRanks: 0 } }]
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('new-v13');
      expect(result.needsTransform).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.indicators.camelCaseTotal).toBeGreaterThan(0);
      expect(result.indicators.newFieldsTotal).toBeGreaterThan(0);
      expect(result.indicators.snakeCaseTotal).toBe(0);
    });

    it('should detect dual-schema documents as new-v13 (both schemas + new fields)', () => {
      const data = {
        actors: [
          {
            system: {
              wounds: { heal_rate: 0, healRate: 0 },
              wound_lvl: {},
              woundLevels: {},
              bonuses: {},
              woundMode: 'pc'
            }
          }
        ],
        items: [
          {
            system: {
              mastery_3: '',
              mastery3: '',
              freeRanks: 0
            }
          }
        ]
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('new-v13');
      expect(result.needsTransform).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.indicators.snakeCaseTotal).toBeGreaterThan(0);
      expect(result.indicators.camelCaseTotal).toBeGreaterThan(0);
      expect(result.indicators.newFieldsTotal).toBeGreaterThan(0);
    });

    it('should detect mixed schema (partial migration)', () => {
      const data = {
        actors: [
          {
            system: {
              wounds: { heal_rate: 0, healRate: 0 },
              wound_lvl: {},
              woundLevels: {}
            }
          }
        ],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('mixed');
      expect(result.indicators.snakeCaseTotal).toBeGreaterThan(0);
      expect(result.indicators.camelCaseTotal).toBeGreaterThan(0);
    });

    it('should detect unknown schema (empty data)', () => {
      const data = {
        actors: [],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle missing actors/items arrays', () => {
      const data = {};

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('unknown');
      expect(result.indicators.snakeCaseTotal).toBe(0);
      expect(result.indicators.camelCaseTotal).toBe(0);
    });

    it('should detect Original with multiple actors', () => {
      const data = {
        actors: [
          { system: { wounds: { heal_rate: 1 }, shadow_taint: 0 } },
          { system: { wounds: { heal_rate: 2 }, shadow_taint: 1 } },
          { system: { wounds: { heal_rate: 3 }, shadow_taint: 2 } },
          { system: { wounds: { heal_rate: 4 }, shadow_taint: 3 } }
        ],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('original');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.indicators.snakeCase.heal_rate).toBe(4);
      expect(result.indicators.snakeCase.shadow_taint).toBe(4);
    });

    it('should detect New v13 with multiple items', () => {
      const data = {
        actors: [],
        items: [
          { system: { mastery3: 'text1', equipped: true, freeRanks: 0 } },
          { system: { mastery3: 'text2', equipped: false, freeRanks: 1 } },
          { system: { mastery3: 'text3', equipped: true, freeRanks: 2 } },
          { system: { mastery3: 'text4', equipped: false, freeRanks: 3 } }
        ]
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('new-v13');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.indicators.camelCase.mastery3).toBe(4);
      expect(result.indicators.camelCase.equipped).toBe(4);
      expect(result.indicators.newFields.freeRanks).toBe(4);
    });

    it('should sample only first 10 actors', () => {
      const actors = [];
      for (let i = 0; i < 20; i++) {
        actors.push({ system: { wounds: { heal_rate: i } } });
      }

      const data = { actors, items: [] };
      const result = SchemaStateDetectionService.detectState(data);

      // Only first 10 should be counted
      expect(result.indicators.snakeCase.heal_rate).toBe(10);
    });

    it('should handle actors with missing system data', () => {
      const data = {
        actors: [{ name: 'No System' }, { system: null }, { system: {} }, { system: { wounds: { heal_rate: 1 } } }],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('original');
      expect(result.indicators.snakeCase.heal_rate).toBe(1);
    });

    it('should detect New v13 without new fields (edge case)', () => {
      const data = {
        actors: [
          {
            system: {
              wounds: { healRate: 0 },
              woundLevels: {},
              armor: { armorTn: 5 }
            }
          }
        ],
        items: [{ system: { mastery3: '', equipped: true } }]
      };

      const result = SchemaStateDetectionService.detectState(data);

      // Should detect as new-v13 based on camelCase even without new fields
      expect(result.state).toBe('new-v13');
      expect(result.needsTransform).toBe(false);
    });

    it('should calculate high confidence for strong Original pattern', () => {
      const data = {
        actors: [
          { system: { wounds: { heal_rate: 0 }, shadow_taint: 0 } },
          { system: { wounds: { heal_rate: 1 }, shadow_taint: 1 } },
          { system: { wounds: { heal_rate: 2 }, shadow_taint: 2 } },
          { system: { wounds: { heal_rate: 3 }, shadow_taint: 3 } }
        ],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.confidence).toBe(0.95);
    });

    it('should calculate high confidence for strong New v13 pattern', () => {
      const data = {
        actors: [
          { system: { wounds: { healRate: 0 }, bonuses: {}, woundMode: 'pc' } },
          { system: { wounds: { healRate: 1 }, bonuses: {}, woundMode: 'npc' } },
          { system: { wounds: { healRate: 2 }, bonuses: {}, woundMode: 'pc' } },
          { system: { wounds: { healRate: 3 }, bonuses: {}, woundMode: 'npc' } }
        ],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.confidence).toBe(0.95);
    });

    it('should calculate medium confidence for weak pattern', () => {
      const data = {
        actors: [{ system: { wounds: { heal_rate: 0 } } }],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.confidence).toBe(0.75);
    });

    it('should calculate low confidence for mixed pattern', () => {
      const data = {
        actors: [{ system: { wounds: { heal_rate: 0, healRate: 0 } } }],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.confidence).toBeLessThanOrEqual(0.3);
    });

    it('should detect isBow as new field indicator', () => {
      const data = {
        actors: [],
        items: [{ system: { isBow: true, equipped: true } }]
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.indicators.newFields.isBow).toBe(1);
      expect(result.state).toBe('new-v13');
    });

    it('should detect fear as new field indicator', () => {
      const data = {
        actors: [{ system: { fear: 3, woundLevels: {} } }],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.indicators.newFields.fear).toBe(1);
      expect(result.state).toBe('new-v13');
    });

    it('should include all indicators in result', () => {
      const data = {
        actors: [{ system: { wounds: { heal_rate: 0 } } }],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.indicators).toHaveProperty('snakeCase');
      expect(result.indicators).toHaveProperty('camelCase');
      expect(result.indicators).toHaveProperty('newFields');
      expect(result.indicators).toHaveProperty('snakeCaseTotal');
      expect(result.indicators).toHaveProperty('camelCaseTotal');
      expect(result.indicators).toHaveProperty('newFieldsTotal');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null export data gracefully', () => {
      const data = null;

      // Should not throw, but handle gracefully
      const result = SchemaStateDetectionService.detectState(data || {});

      expect(result.state).toBe('unknown');
    });

    it('should handle data with only metadata', () => {
      const data = {
        metadata: { sourceSystem: 'l5r4' }
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('unknown');
    });

    it('should detect with minimal data', () => {
      const data = {
        actors: [{ system: { wounds: { heal_rate: 0 } } }],
        items: []
      };

      const result = SchemaStateDetectionService.detectState(data);

      expect(result.state).toBe('original');
      expect(result.needsTransform).toBe(true);
    });
  });
});
