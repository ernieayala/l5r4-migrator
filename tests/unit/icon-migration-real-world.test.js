/**
 * @fileoverview Real-world Icon Migration Tests
 *
 * Tests using actual paths from export data.
 */

import { describe, it, expect } from 'vitest';
import { ImportService } from '@module/services/import-service.js';

describe('Real-World Icon Migration from Export', () => {
  describe('Actor images from actual export', () => {
    it('should preserve custom .webp in system path', () => {
      const customWebp = 'systems/l5r4/assets/icons/lonely-orangutan-14248110.webp';
      expect(ImportService._migrateIconPath(customWebp, 'npc')).toBe(customWebp);
    });

    it('should preserve custom named .webp', () => {
      const customWebp = 'systems/l5r4/assets/icons/Ago.webp';
      expect(ImportService._migrateIconPath(customWebp, 'pc')).toBe(customWebp);
    });

    it('should preserve tokenizer avatar paths', () => {
      const tokenizerPath = 'tokenizer/pc-images/akodo_masaka.Avatar.webp?1756940536325';
      expect(ImportService._migrateIconPath(tokenizerPath, 'pc')).toBe(tokenizerPath);
    });

    it('should migrate default helm.png', () => {
      const defaultIcon = 'systems/l5r4/assets/icons/helm.png';
      expect(ImportService._migrateIconPath(defaultIcon, 'pc')).toBe('systems/l5r4-enhanced/assets/icons/pc.webp');
    });

    it('should migrate default ninja.png', () => {
      const defaultIcon = 'systems/l5r4/assets/icons/ninja.png';
      expect(ImportService._migrateIconPath(defaultIcon, 'npc')).toBe('systems/l5r4-enhanced/assets/icons/npc.webp');
    });
  });

  describe('Token texture paths from actual export', () => {
    it('should preserve tokenizer token paths', () => {
      const tokenizerToken = 'tokenizer/pc-images/akodo_masaka.Token.webp?1756940536325';
      expect(ImportService._migrateIconPath(tokenizerToken, 'pc')).toBe(tokenizerToken);
    });

    it('should migrate default helm.png token', () => {
      const defaultToken = 'systems/l5r4/assets/icons/helm.png';
      expect(ImportService._migrateIconPath(defaultToken, 'pc')).toBe('systems/l5r4-enhanced/assets/icons/pc.webp');
    });

    it('should migrate default ninja.png token', () => {
      const defaultToken = 'systems/l5r4/assets/icons/ninja.png';
      expect(ImportService._migrateIconPath(defaultToken, 'npc')).toBe('systems/l5r4-enhanced/assets/icons/npc.webp');
    });
  });

  describe('Item images from actual export', () => {
    it('should migrate default flower.png (skill)', () => {
      const defaultIcon = 'systems/l5r4/assets/icons/flower.png';
      expect(ImportService._migrateIconPath(defaultIcon, 'skill')).toBe('systems/l5r4-enhanced/assets/icons/skill.webp');
    });

    it('should migrate default yin-yang.png (disadvantage)', () => {
      const defaultIcon = 'systems/l5r4/assets/icons/yin-yang.png';
      expect(ImportService._migrateIconPath(defaultIcon, 'disadvantage')).toBe('systems/l5r4-enhanced/assets/icons/disadvantage.webp');
    });

    it('should migrate default kanji.png (technique)', () => {
      const defaultIcon = 'systems/l5r4/assets/icons/kanji.png';
      expect(ImportService._migrateIconPath(defaultIcon, 'technique')).toBe('systems/l5r4-enhanced/assets/icons/technique.webp');
    });

    it('should migrate default hat.png (armor)', () => {
      const defaultIcon = 'systems/l5r4/assets/icons/hat.png';
      expect(ImportService._migrateIconPath(defaultIcon, 'armor')).toBe('systems/l5r4-enhanced/assets/icons/armor.webp');
    });

    it('should preserve Foundry core item-bag.svg', () => {
      const coreIcon = 'icons/svg/item-bag.svg';
      expect(ImportService._migrateIconPath(coreIcon, 'commonItem')).toBe(coreIcon);
    });
  });
});
