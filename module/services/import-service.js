/**
 * @fileoverview Import Service
 *
 * Imports validated data into l5r4-enhanced system with dual import paths.
 * Performs schema migrations for Original data, or imports New v13 data as-is.
 *
 * **Import Strategy:**
 * - Detect schema state (Original vs New v13)
 * - Route to appropriate import path:
 *   - Original: Apply transformations (snake_case → camelCase, bow conversion, add fields)
 *   - New v13: Import as-is without transformations
 * - Create documents in target world
 * - Handle individual failures gracefully
 * - Provide comprehensive statistics
 *
 * **Transformation Pipeline (Original only):**
 * 1. Apply SCHEMA_MAP transformations
 * 2. Convert bow → weapon
 * 3. Add new fields (bonuses, woundsPenaltyMod, etc.)
 * 4. Validate transformed data
 * 5. Create document in Foundry
 */

import { Logger } from '../utils/logger.js';
import { copyPath, getByPath, setByPath } from '../utils/path-utils.js';
import { SchemaStateDetectionService } from './schema-state-detection-service.js';

/**
 * Icon migration map
 * Maps old default icon filenames to new WEBP equivalents
 * Only applies to system default icons to avoid breaking external/custom assets
 */
const ICON_MIGRATION_MAP = {
  // Item type icons
  'yin-yang.png': 'advantage.webp',     // advantage & disadvantage
  'hat.png': 'armor.webp',
  'bow.png': 'bow.webp',
  'bamboo.png': 'clan.webp',
  'tori.png': 'family.webp',            // Also used for kiho in old system
  'coins.png': 'item.webp',
  'scroll.png': 'kata.webp',            // Also used for school in old system
  'flower.png': 'skill.webp',
  'scroll2.png': 'spell.webp',
  'tattoo.png': 'tattoo.webp',
  'kanji.png': 'technique.webp',
  'sword.png': 'weapon.webp',
  
  // Actor type icons
  'helm.png': 'pc.webp',
  'ninja.png': 'npc.webp'
};

/**
 * Resolve which new icon to use based on old filename and item type
 * Some old icons were reused for multiple types, so we need type context
 */
const ICON_TYPE_OVERRIDES = {
  'tori.png': {
    'kiho': 'kiho.webp',
    'family': 'family.webp'
  },
  'scroll.png': {
    'kata': 'kata.webp',
    'school': 'school.webp'
  },
  'yin-yang.png': {
    'advantage': 'advantage.webp',
    'disadvantage': 'disadvantage.webp'
  }
};

/**
 * Schema transformation map (from l5r4-new research)
 * Maps old field paths to new field paths
 */
const SCHEMA_MAP = [
  // Actor migrations: Universal rules
  { docType: 'Actor', type: '*', from: 'system.wounds.heal_rate', to: 'system.wounds.healRate' },
  { docType: 'Actor', type: '*', from: 'system.wound_lvl', to: 'system.woundLevels' },
  { docType: 'Actor', type: '*', from: 'system.armor.armor_tn', to: 'system.armor.armorTn' },

  // Actor migrations: PC specific
  { docType: 'Actor', type: 'pc', from: 'system.armor_tn', to: 'system.armorTn' },
  { docType: 'Actor', type: 'pc', from: 'system.initiative.roll_mod', to: 'system.initiative.rollMod' },
  { docType: 'Actor', type: 'pc', from: 'system.initiative.keep_mod', to: 'system.initiative.keepMod' },
  { docType: 'Actor', type: 'pc', from: 'system.initiative.total_mod', to: 'system.initiative.totalMod' },
  { docType: 'Actor', type: 'pc', from: 'system.shadow_taint', to: 'system.shadowTaint' },

  // Actor migrations: NPC specific
  { docType: 'Actor', type: 'npc', from: 'system.armor.armor_tn', to: 'system.armor.armorTn' },

  // Item migrations: Skill specific
  { docType: 'Item', type: 'skill', from: 'system.mastery_3', to: 'system.mastery3' },
  { docType: 'Item', type: 'skill', from: 'system.mastery_5', to: 'system.mastery5' },
  { docType: 'Item', type: 'skill', from: 'system.mastery_7', to: 'system.mastery7' },
  { docType: 'Item', type: 'skill', from: 'system.insight_bonus', to: 'system.insightBonus' },
  { docType: 'Item', type: 'skill', from: 'system.roll_bonus', to: 'system.rollBonus' },
  { docType: 'Item', type: 'skill', from: 'system.keep_bonus', to: 'system.keepBonus' },
  { docType: 'Item', type: 'skill', from: 'system.total_bonus', to: 'system.totalBonus' },

  // Item migrations: Armor specific
  { docType: 'Item', type: 'armor', from: 'system.equiped', to: 'system.equipped' },
  { docType: 'Item', type: 'armor', from: 'system.specialRues', to: 'system.specialRules' }
];

/**
 * Service for importing world data with transformations
 */
export class ImportService {
  /**
   * Import complete world data from migration file
   * Routes to appropriate import path based on schema detection
   *
   * @param {Object} data - Validated export data
   * @param {Object} options - Import options
   * @param {boolean} options.dryRun - Simulate import without creating documents
   * @param {boolean} options.skipFolders - Skip folder creation
   * @param {boolean} options.skipScenes - Skip scene import
   * @param {boolean} options.skipJournals - Skip journal import
   * @param {boolean} options.skipDetection - Skip schema detection (force transform path)
   * @returns {Promise<Object>} Import result with statistics
   */
  static async importWorld(data, options = {}) {
    const { dryRun = false, skipDetection = false } = options;

    Logger.info('Starting world import...');

    // Detect schema state
    let detection;
    if (skipDetection) {
      Logger.info('Schema detection skipped - forcing transformation path');
      detection = { state: 'original', needsTransform: true, confidence: 1.0 };
    } else {
      detection = SchemaStateDetectionService.detectState(data);
      Logger.info(
        `Schema state: ${detection.state} (confidence: ${Math.round(detection.confidence * 100)}%)`
      );
    }

    // Validate detection
    if (detection.state === 'unknown') {
      throw new Error('Cannot determine schema state. Please review export data.');
    }

    if (detection.state === 'mixed') {
      throw new Error('Mixed schema detected. World appears to be partially migrated.');
    }

    // Route to appropriate import method
    if (detection.needsTransform) {
      Logger.info('Importing with schema transformation (Original → Enhanced)');
      return await this._importWithTransform(data, { ...options, detection });
    } else {
      Logger.info('Importing as-is (New v13 → Enhanced, no transformation)');
      return await this._importAsIs(data, { ...options, detection });
    }
  }

  /**
   * Import with transformation (Original → Enhanced)
   * This is the existing implementation for Original v12/v13 data
   * @private
   */
  static async _importWithTransform(data, options = {}) {
    const { dryRun = false, skipFolders = false, skipScenes = false, skipJournals = false } = options;

    const result = {
      success: true,
      dryRun,
      path: 'with-transform',
      stats: {
        folders: { attempted: 0, created: 0, failed: 0 },
        actors: { attempted: 0, created: 0, failed: 0, transformed: 0 },
        items: { attempted: 0, created: 0, failed: 0, transformed: 0 },
        scenes: { attempted: 0, created: 0, failed: 0 },
        journals: { attempted: 0, created: 0, failed: 0 }
      },
      errors: []
    };

    try {
      // Import folders first
      if (!skipFolders && data.folders?.length) {
        Logger.info(`Importing ${data.folders.length} folders...`);
        result.stats.folders = await this._importFolders(data.folders, dryRun);
      }

      // Import actors with transformations
      if (data.actors?.length) {
        Logger.info(`Importing ${data.actors.length} actors...`);
        result.stats.actors = await this.importActors(data.actors, dryRun);
      }

      // Import world items with transformations
      if (data.items?.length) {
        Logger.info(`Importing ${data.items.length} items...`);
        result.stats.items = await this.importItems(data.items, dryRun);
      }

      // Import scenes
      if (!skipScenes && data.scenes?.length) {
        Logger.info(`Importing ${data.scenes.length} scenes...`);
        result.stats.scenes = await this._importScenes(data.scenes, dryRun);
      }

      // Import journals
      if (!skipJournals && data.journals?.length) {
        Logger.info(`Importing ${data.journals.length} journals...`);
        result.stats.journals = await this._importJournals(data.journals, dryRun);
      }

      // Calculate totals
      const totalAttempted = Object.values(result.stats).reduce((sum, s) => sum + s.attempted, 0);
      const totalCreated = Object.values(result.stats).reduce((sum, s) => sum + s.created, 0);
      const totalFailed = Object.values(result.stats).reduce((sum, s) => sum + s.failed, 0);

      Logger.info(`Import complete: ${totalCreated}/${totalAttempted} documents created, ${totalFailed} failed`);

      if (dryRun) {
        Logger.info('Dry run complete - no documents were actually created');
      }

      return result;
    } catch (error) {
      Logger.error('World import failed', error);
      result.success = false;
      result.errors.push({ type: 'fatal', message: error.message, error });
      throw error;
    }
  }

  /**
   * Import without transformation (New v13 → Enhanced)
   * Data is already in correct schema, just create documents
   * @private
   */
  static async _importAsIs(data, options = {}) {
    const { dryRun = false, skipFolders = false, skipScenes = false, skipJournals = false } = options;

    const result = {
      success: true,
      dryRun,
      path: 'as-is',
      stats: {
        folders: { attempted: 0, created: 0, failed: 0 },
        actors: { attempted: 0, created: 0, failed: 0 },
        items: { attempted: 0, created: 0, failed: 0 },
        scenes: { attempted: 0, created: 0, failed: 0 },
        journals: { attempted: 0, created: 0, failed: 0 }
      },
      errors: []
    };

    try {
      // Import folders first
      if (!skipFolders && data.folders?.length) {
        Logger.info(`Importing ${data.folders.length} folders as-is...`);
        result.stats.folders = await this._importFolders(data.folders, dryRun);
      }

      // Import actors without transformation
      if (data.actors?.length) {
        Logger.info(`Importing ${data.actors.length} actors as-is...`);
        result.stats.actors = await this._importDocumentsAsIs(Actor, data.actors, dryRun);
      }

      // Import world items without transformation
      if (data.items?.length) {
        Logger.info(`Importing ${data.items.length} items as-is...`);
        result.stats.items = await this._importDocumentsAsIs(Item, data.items, dryRun);
      }

      // Import scenes
      if (!skipScenes && data.scenes?.length) {
        Logger.info(`Importing ${data.scenes.length} scenes as-is...`);
        result.stats.scenes = await this._importScenes(data.scenes, dryRun);
      }

      // Import journals
      if (!skipJournals && data.journals?.length) {
        Logger.info(`Importing ${data.journals.length} journal entries as-is...`);
        result.stats.journals = await this._importJournals(data.journals, dryRun);
      }

      // Calculate totals
      const totalAttempted = Object.values(result.stats).reduce((sum, s) => sum + s.attempted, 0);
      const totalCreated = Object.values(result.stats).reduce((sum, s) => sum + s.created, 0);
      const totalFailed = Object.values(result.stats).reduce((sum, s) => sum + s.failed, 0);

      Logger.info(`Import complete: ${totalCreated}/${totalAttempted} documents created, ${totalFailed} failed`);

      if (dryRun) {
        Logger.info('Dry run complete - no documents were actually created');
      }

      return result;
    } catch (error) {
      Logger.error('World import failed', error);
      result.success = false;
      result.errors.push({ type: 'fatal', message: error.message, error });
      throw error;
    }
  }

  /**
   * Import documents without any transformation
   * Used for New v13 data that's already in the correct schema
   * @private
   */
  static async _importDocumentsAsIs(DocumentClass, dataArray, dryRun) {
    const stats = {
      attempted: dataArray.length,
      created: 0,
      failed: 0
    };

    for (const docData of dataArray) {
      try {
        if (!dryRun) {
          await DocumentClass.create(docData, { keepId: true });
        }
        stats.created++;
        Logger.debug(`Imported ${DocumentClass.name} as-is: ${docData.name}`);
      } catch (error) {
        stats.failed++;
        Logger.error(`Failed to import ${DocumentClass.name} ${docData.name}:`, error);
      }
    }

    return stats;
  }

  /**
   * Import actors with transformations
   *
   * @param {Array<Object>} actorData - Actor data to import
   * @param {boolean} dryRun - Simulate without creating
   * @returns {Promise<Object>} Import statistics
   */
  static async importActors(actorData, dryRun = false) {
    const stats = {
      attempted: actorData.length,
      created: 0,
      failed: 0,
      transformed: 0
    };

    for (const actor of actorData) {
      try {
        // Transform actor data
        const transformed = this._transformActor(actor);
        stats.transformed++;

        // Create actor in Foundry
        if (!dryRun) {
          await Actor.create(transformed, { keepId: true });
        }

        stats.created++;
        Logger.debug(`Imported actor: ${actor.name}`);
      } catch (error) {
        stats.failed++;
        Logger.error(`Failed to import actor ${actor.name}:`, error);
      }
    }

    return stats;
  }

  /**
   * Import items with transformations
   *
   * @param {Array<Object>} itemData - Item data to import
   * @param {boolean} dryRun - Simulate without creating
   * @returns {Promise<Object>} Import statistics
   */
  static async importItems(itemData, dryRun = false) {
    const stats = {
      attempted: itemData.length,
      created: 0,
      failed: 0,
      transformed: 0
    };

    for (const item of itemData) {
      try {
        // Transform item data (includes bow → weapon conversion)
        const transformed = this._transformItem(item);
        stats.transformed++;

        // Create item in Foundry
        if (!dryRun) {
          await Item.create(transformed, { keepId: true });
        }

        stats.created++;
        Logger.debug(`Imported item: ${item.name}`);
      } catch (error) {
        stats.failed++;
        Logger.error(`Failed to import item ${item.name}:`, error);
      }
    }

    return stats;
  }

  /**
   * Migrate icon path from old system to new system
   * ONLY migrates exact default PNG filenames, preserves everything else
   * @private
   */
  static _migrateIconPath(oldPath, docType = null) {
    if (!oldPath || typeof oldPath !== 'string') {
      return oldPath;
    }

    // Don't touch external URLs or Foundry core icons
    if (oldPath.startsWith('http') || 
        oldPath.startsWith('data:') || 
        oldPath.startsWith('icons/')) {
      // Logger.info(`Icon preserved (external/core): ${oldPath}`);
      return oldPath;
    }

    // Don't touch non-system paths (modules, tokenizer, etc.)
    // Only process paths that are bare filenames or old system paths
    if (oldPath.includes('/') && 
        !oldPath.startsWith('systems/l5r4/')) {
      Logger.info(`Icon preserved (non-system path): ${oldPath}`);
      return oldPath;
    }

    // Extract filename from path and strip query parameters
    const parts = oldPath.split('/');
    let filename = parts[parts.length - 1];
    
    // Strip query parameters (e.g., "image.png?12345" -> "image.png")
    const queryIndex = filename.indexOf('?');
    if (queryIndex !== -1) {
      filename = filename.substring(0, queryIndex);
    }

    // ONLY migrate .png files that match exact defaults
    // Do NOT migrate .webp files (already in new format or custom)
    if (!filename.endsWith('.png')) {
      return oldPath;
    }

    // Check if this is a default icon we should migrate
    let newFilename = null;
    
    // Check type-specific override first
    if (docType && ICON_TYPE_OVERRIDES[filename]?.[docType]) {
      newFilename = ICON_TYPE_OVERRIDES[filename][docType];
    } else if (ICON_MIGRATION_MAP[filename]) {
      newFilename = ICON_MIGRATION_MAP[filename];
    }

    // If we found a mapping, return new path
    if (newFilename) {
      const newPath = `systems/l5r4-enhanced/assets/icons/${newFilename}`;
      Logger.info(`Icon migrated: ${oldPath} -> ${newPath}`);
      return newPath;
    }

    // Not a default icon - preserve as-is (likely custom/external asset)
    Logger.info(`Icon preserved (custom PNG/other): ${oldPath}`);
    return oldPath;
  }

  /**
   * Transform actor data to new schema
   * @private
   */
  static _transformActor(actorData) {
    const transformed = foundry.utils.duplicate(actorData);

    // Migrate actor icon
    if (transformed.img) {
      transformed.img = this._migrateIconPath(transformed.img, transformed.type);
    }

    // Apply schema transformations
    const actorRules = SCHEMA_MAP.filter(
      (rule) => rule.docType === 'Actor' && (rule.type === '*' || rule.type === transformed.type)
    );

    for (const rule of actorRules) {
      if (getByPath(transformed, rule.from) !== undefined) {
        copyPath(transformed, rule.from, rule.to, true);
      }
    }

    // Type coercion: Fix string values that should be numbers
    // Common issue in source system: numeric fields stored as strings
    if (transformed.system) {
      // Fix wounds.mod
      if (typeof transformed.system.wounds?.mod === 'string') {
        const modNum = parseInt(transformed.system.wounds.mod, 10);
        if (!isNaN(modNum)) {
          transformed.system.wounds.mod = modNum;
        }
      }

      // Fix wealth fields
      if (transformed.system.wealth) {
        ['koku', 'bu', 'zeni'].forEach(field => {
          if (typeof transformed.system.wealth[field] === 'string') {
            const num = parseInt(transformed.system.wealth[field], 10);
            if (!isNaN(num)) {
              transformed.system.wealth[field] = num;
            }
          }
        });
      }
    }

    // Add new fields for l5r4-enhanced
    if (transformed.type === 'pc') {
      // Add bonuses structure if missing
      if (!transformed.system.bonuses) {
        setByPath(transformed, 'system.bonuses', { skill: {}, trait: {}, ring: {} });
      }

      // Add woundsPenaltyMod if missing
      if (transformed.system.woundsPenaltyMod === undefined) {
        setByPath(transformed, 'system.woundsPenaltyMod', 0);
      }
    }

    if (transformed.type === 'npc') {
      // Add woundMode for NPCs
      if (!transformed.system.woundMode) {
        setByPath(transformed, 'system.woundMode', 'manual');
      }

      // Add fear rating
      if (!transformed.system.fear) {
        setByPath(transformed, 'system.fear', { rank: 0 });
      }
    }

    // Migrate token icon if present
    if (transformed.prototypeToken?.texture?.src) {
      transformed.prototypeToken.texture.src = this._migrateIconPath(
        transformed.prototypeToken.texture.src,
        transformed.type
      );
    }

    // Transform embedded items
    if (transformed.items && Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map((item) => this._transformItem(item));
    }

    return transformed;
  }

  /**
   * Transform item data to new schema
   * Includes bow → weapon conversion and icon migration
   * @private
   */
  static _transformItem(itemData) {
    const transformed = foundry.utils.duplicate(itemData);

    // Migrate item icon
    if (transformed.img) {
      transformed.img = this._migrateIconPath(transformed.img, transformed.type);
    }

    // Handle bow → weapon conversion
    if (transformed.type === 'bow') {
      transformed.type = 'weapon';
      setByPath(transformed, 'system.isBow', true);

      // Normalize size casing
      if (transformed.system.size) {
        transformed.system.size = transformed.system.size.toLowerCase();
      }

      Logger.debug(`Converted bow '${transformed.name}' to weapon with isBow flag`);
    }

    // Apply schema transformations
    const itemRules = SCHEMA_MAP.filter(
      (rule) => rule.docType === 'Item' && (rule.type === '*' || rule.type === transformed.type)
    );

    for (const rule of itemRules) {
      if (getByPath(transformed, rule.from) !== undefined) {
        copyPath(transformed, rule.from, rule.to, true);
      }
    }

    // Type coercion: Fix string values that should be numbers
    if (transformed.type === 'skill') {
      // Fix rank if it's a string
      if (typeof transformed.system?.rank === 'string') {
        const rankNum = parseInt(transformed.system.rank, 10);
        if (!isNaN(rankNum)) {
          transformed.system.rank = rankNum;
        }
      }
    }

    // Add new fields for skills
    if (transformed.type === 'skill') {
      if (transformed.system.freeRanks === undefined) {
        setByPath(transformed, 'system.freeRanks', 0);
      }
      if (transformed.system.freeEmphasis === undefined) {
        setByPath(transformed, 'system.freeEmphasis', 0);
      }
    }

    // Add new fields for weapons
    if (transformed.type === 'weapon') {
      if (!transformed.system.associatedSkill) {
        setByPath(transformed, 'system.associatedSkill', '');
      }
      if (!transformed.system.fallbackTrait) {
        setByPath(transformed, 'system.fallbackTrait', 'agi');
      }
      if (transformed.system.isBow === undefined) {
        setByPath(transformed, 'system.isBow', false);
      }

      // Normalize size casing
      if (transformed.system.size) {
        transformed.system.size = transformed.system.size.toLowerCase();
      }
    }

    return transformed;
  }

  /**
   * Import folders
   * Sort by folder path depth to ensure parents are created before children
   * @private
   */
  static async _importFolders(folderData, dryRun) {
    const stats = { attempted: folderData.length, created: 0, failed: 0 };

    // Sort folders by depth (parent-first)
    // Folders without a parent come first, then by folder depth
    const sortedFolders = [...folderData].sort((a, b) => {
      const depthA = this._getFolderDepth(a, folderData);
      const depthB = this._getFolderDepth(b, folderData);
      return depthA - depthB;
    });

    for (const folder of sortedFolders) {
      try {
        if (!dryRun) {
          await Folder.create(folder, { keepId: true });
        }
        stats.created++;
      } catch (error) {
        stats.failed++;
        Logger.warn(`Failed to import folder ${folder.name}:`, error);
      }
    }

    return stats;
  }

  /**
   * Calculate folder depth (how many parent levels)
   * @private
   */
  static _getFolderDepth(folder, allFolders) {
    if (!folder.folder) {
      return 0;
    } // Root folder

    let depth = 1;
    let currentFolder = folder;

    // Traverse up to find depth (max 10 levels to prevent infinite loops)
    for (let i = 0; i < 10; i++) {
      const parent = allFolders.find((f) => f._id === currentFolder.folder);
      if (!parent) {
        break;
      }
      depth++;
      currentFolder = parent;
    }

    return depth;
  }

  /**
   * Import scenes
   * @private
   */
  static async _importScenes(sceneData, dryRun) {
    const stats = { attempted: sceneData.length, created: 0, failed: 0 };

    for (const scene of sceneData) {
      try {
        if (!dryRun) {
          await Scene.create(scene, { keepId: true });
        }
        stats.created++;
      } catch (error) {
        stats.failed++;
        Logger.warn(`Failed to import scene ${scene.name}:`, error);
      }
    }

    return stats;
  }

  /**
   * Import journals
   * @private
   */
  static async _importJournals(journalData, dryRun) {
    const stats = { attempted: journalData.length, created: 0, failed: 0 };

    for (const journal of journalData) {
      try {
        if (!dryRun) {
          await JournalEntry.create(journal, { keepId: true });
        }
        stats.created++;
      } catch (error) {
        stats.failed++;
        Logger.warn(`Failed to import journal ${journal.name}:`, error);
      }
    }

    return stats;
  }
}
