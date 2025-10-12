/**
 * @fileoverview Unit Tests for Icon Migration
 *
 * Tests automatic migration of default system icons from PNG to WEBP.
 */

import { describe, it, expect } from 'vitest';
import { ImportService } from '@module/services/import-service.js';

describe('Icon Migration', () => {
  describe('_migrateIconPath', () => {
    it('should migrate PC default icon', () => {
      const result = ImportService._migrateIconPath('systems/l5r4/assets/icons/helm.png', 'pc');
      expect(result).toBe('systems/l5r4-enhanced/assets/icons/pc.webp');
    });

    it('should migrate NPC default icon', () => {
      const result = ImportService._migrateIconPath('systems/l5r4/assets/icons/ninja.png', 'npc');
      expect(result).toBe('systems/l5r4-enhanced/assets/icons/npc.webp');
    });

    it('should migrate item default icons', () => {
      expect(ImportService._migrateIconPath('hat.png', 'armor')).toBe('systems/l5r4-enhanced/assets/icons/armor.webp');
      expect(ImportService._migrateIconPath('sword.png', 'weapon')).toBe('systems/l5r4-enhanced/assets/icons/weapon.webp');
      expect(ImportService._migrateIconPath('bow.png', 'bow')).toBe('systems/l5r4-enhanced/assets/icons/bow.webp');
      expect(ImportService._migrateIconPath('flower.png', 'skill')).toBe('systems/l5r4-enhanced/assets/icons/skill.webp');
      expect(ImportService._migrateIconPath('scroll2.png', 'spell')).toBe('systems/l5r4-enhanced/assets/icons/spell.webp');
      expect(ImportService._migrateIconPath('coins.png', 'commonItem')).toBe('systems/l5r4-enhanced/assets/icons/item.webp');
      expect(ImportService._migrateIconPath('tattoo.png', 'tattoo')).toBe('systems/l5r4-enhanced/assets/icons/tattoo.webp');
      expect(ImportService._migrateIconPath('kanji.png', 'technique')).toBe('systems/l5r4-enhanced/assets/icons/technique.webp');
      expect(ImportService._migrateIconPath('bamboo.png', 'clan')).toBe('systems/l5r4-enhanced/assets/icons/clan.webp');
    });

    it('should apply type-specific overrides for ambiguous icons', () => {
      // tori.png is used for both family and kiho
      expect(ImportService._migrateIconPath('tori.png', 'family')).toBe('systems/l5r4-enhanced/assets/icons/family.webp');
      expect(ImportService._migrateIconPath('tori.png', 'kiho')).toBe('systems/l5r4-enhanced/assets/icons/kiho.webp');

      // scroll.png is used for both kata and school
      expect(ImportService._migrateIconPath('scroll.png', 'kata')).toBe('systems/l5r4-enhanced/assets/icons/kata.webp');
      expect(ImportService._migrateIconPath('scroll.png', 'school')).toBe('systems/l5r4-enhanced/assets/icons/school.webp');

      // yin-yang.png is used for both advantage and disadvantage
      expect(ImportService._migrateIconPath('yin-yang.png', 'advantage')).toBe('systems/l5r4-enhanced/assets/icons/advantage.webp');
      expect(ImportService._migrateIconPath('yin-yang.png', 'disadvantage')).toBe('systems/l5r4-enhanced/assets/icons/disadvantage.webp');
    });

    it('should preserve external URLs', () => {
      const httpUrl = 'http://example.com/custom-icon.png';
      const httpsUrl = 'https://example.com/custom-icon.png';
      const dataUri = 'data:image/png;base64,iVBORw0KG...';

      expect(ImportService._migrateIconPath(httpUrl)).toBe(httpUrl);
      expect(ImportService._migrateIconPath(httpsUrl)).toBe(httpsUrl);
      expect(ImportService._migrateIconPath(dataUri)).toBe(dataUri);
    });

    it('should preserve Foundry core icons', () => {
      const coreIcon = 'icons/svg/mystery-man.svg';
      expect(ImportService._migrateIconPath(coreIcon)).toBe(coreIcon);
    });

    it('should preserve custom/unknown PNG icons', () => {
      const customIcon = 'systems/l5r4/assets/icons/custom-samurai.png';
      expect(ImportService._migrateIconPath(customIcon)).toBe(customIcon);
    });

    it('should preserve all .webp files (already new format or custom)', () => {
      const webpIcon1 = 'systems/l5r4/assets/icons/lonely-orangutan-14248110.webp';
      const webpIcon2 = 'systems/l5r4/assets/icons/custom-portrait.webp';
      expect(ImportService._migrateIconPath(webpIcon1)).toBe(webpIcon1);
      expect(ImportService._migrateIconPath(webpIcon2)).toBe(webpIcon2);
    });

    it('should preserve non-system paths (tokenizer, modules, etc.)', () => {
      const tokenizerPath = 'tokenizer/npc-images/futs_uma.Avatar.webp';
      const modulePath = 'modules/my-module/custom-icon.png';
      const worldPath = 'worlds/my-world/images/custom.png';
      
      expect(ImportService._migrateIconPath(tokenizerPath)).toBe(tokenizerPath);
      expect(ImportService._migrateIconPath(modulePath)).toBe(modulePath);
      expect(ImportService._migrateIconPath(worldPath)).toBe(worldPath);
    });

    it('should strip query parameters when checking filenames', () => {
      // Query parameter path should be preserved if not a default
      const customWithQuery = 'tokenizer/npc-images/futs_uma.Avatar.webp?1755639518334';
      expect(ImportService._migrateIconPath(customWithQuery)).toBe(customWithQuery);
      
      // Query parameter on default should still migrate
      const defaultWithQuery = 'systems/l5r4/assets/icons/helm.png?12345';
      expect(ImportService._migrateIconPath(defaultWithQuery, 'pc')).toBe('systems/l5r4-enhanced/assets/icons/pc.webp');
    });

    it('should handle null/undefined paths', () => {
      expect(ImportService._migrateIconPath(null)).toBe(null);
      expect(ImportService._migrateIconPath(undefined)).toBe(undefined);
      expect(ImportService._migrateIconPath('')).toBe('');
    });

    it('should handle paths without type context', () => {
      // Without type, should fall back to base mapping
      expect(ImportService._migrateIconPath('helm.png')).toBe('systems/l5r4-enhanced/assets/icons/pc.webp');
      expect(ImportService._migrateIconPath('ninja.png')).toBe('systems/l5r4-enhanced/assets/icons/npc.webp');
    });

    it('should handle full system paths', () => {
      const fullPath = 'systems/l5r4/assets/icons/sword.png';
      expect(ImportService._migrateIconPath(fullPath, 'weapon')).toBe('systems/l5r4-enhanced/assets/icons/weapon.webp');
    });

    it('should handle bare filenames', () => {
      expect(ImportService._migrateIconPath('sword.png', 'weapon')).toBe('systems/l5r4-enhanced/assets/icons/weapon.webp');
    });
  });

  describe('Actor icon migration in _transformActor', () => {
    it('should migrate actor icon during transformation', () => {
      const actor = {
        type: 'pc',
        name: 'Test Actor',
        img: 'systems/l5r4/assets/icons/helm.png',
        system: {}
      };

      const transformed = ImportService._transformActor(actor);
      expect(transformed.img).toBe('systems/l5r4-enhanced/assets/icons/pc.webp');
    });

    it('should migrate token texture during transformation', () => {
      const actor = {
        type: 'npc',
        name: 'Test NPC',
        img: 'systems/l5r4/assets/icons/ninja.png',
        prototypeToken: {
          texture: {
            src: 'systems/l5r4/assets/icons/ninja.png'
          }
        },
        system: {}
      };

      const transformed = ImportService._transformActor(actor);
      expect(transformed.img).toBe('systems/l5r4-enhanced/assets/icons/npc.webp');
      expect(transformed.prototypeToken.texture.src).toBe('systems/l5r4-enhanced/assets/icons/npc.webp');
    });

    it('should preserve custom actor icon', () => {
      const actor = {
        type: 'pc',
        name: 'Test Actor',
        img: 'https://example.com/custom-avatar.png',
        system: {}
      };

      const transformed = ImportService._transformActor(actor);
      expect(transformed.img).toBe('https://example.com/custom-avatar.png');
    });
  });

  describe('Item icon migration in _transformItem', () => {
    it('should migrate item icon during transformation', () => {
      const item = {
        type: 'weapon',
        name: 'Katana',
        img: 'systems/l5r4/assets/icons/sword.png',
        system: {}
      };

      const transformed = ImportService._transformItem(item);
      expect(transformed.img).toBe('systems/l5r4-enhanced/assets/icons/weapon.webp');
    });

    it('should migrate skill icon', () => {
      const item = {
        type: 'skill',
        name: 'Kenjutsu',
        img: 'flower.png',
        system: {}
      };

      const transformed = ImportService._transformItem(item);
      expect(transformed.img).toBe('systems/l5r4-enhanced/assets/icons/skill.webp');
    });

    it('should migrate bow icon to weapon icon', () => {
      const item = {
        type: 'bow',
        name: 'Yumi',
        img: 'bow.png',
        system: { size: 'Large' }
      };

      const transformed = ImportService._transformItem(item);
      expect(transformed.type).toBe('weapon');
      expect(transformed.system.isBow).toBe(true);
      expect(transformed.img).toBe('systems/l5r4-enhanced/assets/icons/bow.webp');
    });

    it('should use type-specific icon for family', () => {
      const item = {
        type: 'family',
        name: 'Crane',
        img: 'tori.png',
        system: {}
      };

      const transformed = ImportService._transformItem(item);
      expect(transformed.img).toBe('systems/l5r4-enhanced/assets/icons/family.webp');
    });

    it('should use type-specific icon for kiho', () => {
      const item = {
        type: 'kiho',
        name: 'Test Kiho',
        img: 'tori.png',
        system: {}
      };

      const transformed = ImportService._transformItem(item);
      expect(transformed.img).toBe('systems/l5r4-enhanced/assets/icons/kiho.webp');
    });

    it('should preserve custom item icon', () => {
      const item = {
        type: 'weapon',
        name: 'Custom Weapon',
        img: 'modules/my-module/custom-weapon.png',
        system: {}
      };

      const transformed = ImportService._transformItem(item);
      expect(transformed.img).toBe('modules/my-module/custom-weapon.png');
    });
  });
});
