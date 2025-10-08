/**
 * @fileoverview Import Service
 *
 * Imports validated data into l5r4-enhanced system with transformations.
 * Performs schema migrations, converts legacy data, and creates documents.
 *
 * **Import Strategy:**
 * - Apply schema transformations (snake_case → camelCase)
 * - Convert bow items to weapon items with isBow flag
 * - Add new required fields with defaults
 * - Create documents in target world
 * - Handle individual failures gracefully
 * - Provide comprehensive statistics
 *
 * **Transformation Pipeline:**
 * 1. Apply SCHEMA_MAP transformations
 * 2. Convert bow → weapon
 * 3. Add new fields (bonuses, woundsPenaltyMod, etc.)
 * 4. Validate transformed data
 * 5. Create document in Foundry
 */

import { Logger } from '../utils/logger.js';
import { copyPath, getByPath, setByPath } from '../utils/path-utils.js';

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
   *
   * @param {Object} data - Validated export data
   * @param {Object} options - Import options
   * @param {boolean} options.dryRun - Simulate import without creating documents
   * @param {boolean} options.skipFolders - Skip folder creation
   * @param {boolean} options.skipScenes - Skip scene import
   * @param {boolean} options.skipJournals - Skip journal import
   * @returns {Promise<Object>} Import result with statistics
   */
  static async importWorld(data, options = {}) {
    const { dryRun = false, skipFolders = false, skipScenes = false, skipJournals = false } = options;

    Logger.info('Starting world import...');

    const result = {
      success: true,
      dryRun,
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
          await Actor.create(transformed);
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
          await Item.create(transformed);
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
   * Transform actor data to new schema
   * @private
   */
  static _transformActor(actorData) {
    const transformed = foundry.utils.duplicate(actorData);

    // Apply schema transformations
    const actorRules = SCHEMA_MAP.filter(
      (rule) => rule.docType === 'Actor' && (rule.type === '*' || rule.type === transformed.type)
    );

    for (const rule of actorRules) {
      if (getByPath(transformed, rule.from) !== undefined) {
        copyPath(transformed, rule.from, rule.to, true);
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

    // Transform embedded items
    if (transformed.items && Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map((item) => this._transformItem(item));
    }

    return transformed;
  }

  /**
   * Transform item data to new schema
   * Includes bow → weapon conversion
   * @private
   */
  static _transformItem(itemData) {
    const transformed = foundry.utils.duplicate(itemData);

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
          await Folder.create(folder);
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
          await Scene.create(scene);
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
          await JournalEntry.create(journal);
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
