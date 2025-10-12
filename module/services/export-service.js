/**
 * @fileoverview Export Service
 *
 * Exports world data from legacy l5r4 system for migration.
 * Uses .toObject() to get complete document data including embedded items and effects.
 *
 * **Export Strategy:**
 * - Exports complete document data using `.toObject()`
 * - Preserves embedded items on actors
 * - Preserves Active Effects
 * - Preserves all flags and custom data
 * - Returns data ready for validation and transformation
 *
 * **Data Integrity:**
 * - No data loss - exports everything
 * - Includes both legacy and migrated field names
 * - Preserves document relationships
 * - Maintains folder structure via folder references
 */

import { Logger } from '../utils/logger.js';
import { validateActorData, validateItemData } from '../utils/validators.js';

/**
 * Service for exporting world data from l5r4 system
 */
export class ExportService {
  /**
   * Export all world data to a migration-ready format
   *
   * @param {Object} options - Export options
   * @param {boolean} options.includeScenes - Include scenes (default: true)
   * @param {boolean} options.includeJournals - Include journal entries (default: true)
   * @param {boolean} options.validate - Validate exported data (default: true)
   * @param {Array<string>} options.actorIds - Specific actor IDs to export (default: all)
   * @param {Array<string>} options.itemIds - Specific item IDs to export (default: all)
   * @returns {Promise<Object>} Export result with data and metadata
   */
  static async exportWorld(options = {}) {
    const { includeScenes = true, includeJournals = true, validate = true, actorIds = null, itemIds = null } = options;

    Logger.info('Starting world export for migration...');

    const exportData = {
      metadata: {
        sourceSystem: game.system.id,
        sourceSystemVersion: game.system.version,
        worldId: game.world.id,
        worldTitle: game.world.title,
        foundryVersion: game.version,
        exportDate: new Date().toISOString(),
        exportTimestamp: Date.now()
      },
      actors: [],
      items: [],
      scenes: [],
      journals: [],
      folders: [],
      validation: {
        enabled: validate,
        results: {
          actors: { valid: 0, invalid: 0, errors: [] },
          items: { valid: 0, invalid: 0, errors: [] }
        }
      }
    };

    try {
      // Export actors (always included for migration)
      const actorsToExport = actorIds
        ? actorIds.map((id) => game.actors.get(id)).filter((a) => a)
        : game.actors.contents;

      Logger.info(`Exporting ${actorsToExport.length} actors...`);
      for (const actor of actorsToExport) {
        const actorData = this._exportActor(actor);
        exportData.actors.push(actorData);

        // Validate if requested
        if (validate) {
          const validation = validateActorData(actorData);
          if (validation.valid) {
            exportData.validation.results.actors.valid++;
          } else {
            exportData.validation.results.actors.invalid++;
            exportData.validation.results.actors.errors.push({
              id: actor.id,
              name: actor.name,
              errors: validation.errors,
              warnings: validation.warnings
            });
          }
        }
      }

      // Export world items (always included for migration)
      const itemsToExport = itemIds ? itemIds.map((id) => game.items.get(id)).filter((i) => i) : game.items.contents;

      Logger.info(`Exporting ${itemsToExport.length} world items...`);
      for (const item of itemsToExport) {
        const itemData = this._exportItem(item);
        exportData.items.push(itemData);

        // Validate if requested
        if (validate) {
          const validation = validateItemData(itemData);
          if (validation.valid) {
            exportData.validation.results.items.valid++;
          } else {
            exportData.validation.results.items.invalid++;
            exportData.validation.results.items.errors.push({
              id: item.id,
              name: item.name,
              errors: validation.errors,
              warnings: validation.warnings
            });
          }
        }
      }

      // Export scenes if requested
      if (includeScenes) {
        Logger.info(`Exporting ${game.scenes.contents.length} scenes...`);
        exportData.scenes = game.scenes.contents.map((s) => s.toObject());
      }

      // Export journals if requested
      if (includeJournals) {
        Logger.info(`Exporting ${game.journal.contents.length} journal entries...`);
        exportData.journals = game.journal.contents.map((j) => j.toObject());
      }

      // Always export folders for organization
      Logger.info(`Exporting ${game.folders.contents.length} folders...`);
      exportData.folders = game.folders.contents.map((f) => f.toObject());

      // Add statistics to metadata
      exportData.metadata.stats = {
        actors: exportData.actors.length,
        items: exportData.items.length,
        scenes: exportData.scenes.length,
        journals: exportData.journals.length,
        folders: exportData.folders.length
      };

      // Log validation results if enabled
      if (validate) {
        const actorResults = exportData.validation.results.actors;
        const itemResults = exportData.validation.results.items;

        Logger.info(`Validation complete: ${actorResults.valid} valid actors, ${actorResults.invalid} invalid`);
        Logger.info(`Validation complete: ${itemResults.valid} valid items, ${itemResults.invalid} invalid`);

        if (actorResults.invalid > 0 || itemResults.invalid > 0) {
          Logger.warn('Export contains validation errors. See exportData.validation.results for details.');
        }
      }

      Logger.info('World export complete');

      return {
        success: true,
        data: exportData,
        stats: exportData.metadata.stats,
        validation: exportData.validation
      };
    } catch (error) {
      Logger.error('World export failed', error);
      throw error;
    }
  }

  /**
   * Export a single actor with embedded items and effects
   * @private
   * @param {Actor} actor - Actor to export
   * @returns {Object} Complete actor data
   */
  static _exportActor(actor) {
    Logger.debug(`Exporting actor: ${actor.name} (${actor.type})`);

    // Get complete actor data including embedded items and effects
    const actorData = actor.toObject();

    // Ensure embedded items are included (they should be via toObject, but verify)
    if (!actorData.items) {
      actorData.items = actor.items?.contents?.map((i) => i.toObject()) || [];
    }

    // Ensure effects are included
    if (!actorData.effects) {
      actorData.effects = actor.effects?.contents?.map((e) => e.toObject()) || [];
    }

    return actorData;
  }

  /**
   * Export a single item
   * @private
   * @param {Item} item - Item to export
   * @returns {Object} Complete item data
   */
  static _exportItem(item) {
    Logger.debug(`Exporting item: ${item.name} (${item.type})`);

    // Get complete item data including effects
    const itemData = item.toObject();

    // Ensure effects are included
    if (!itemData.effects) {
      itemData.effects = item.effects?.contents?.map((e) => e.toObject()) || [];
    }

    return itemData;
  }

  /**
   * Export specific actors by ID
   *
   * @param {Array<string>} actorIds - Actor IDs to export
   * @param {boolean} validate - Validate exported data (default: true)
   * @returns {Promise<Object>} Exported actors with validation results
   */
  static async exportActors(actorIds, validate = true) {
    Logger.info(`Exporting ${actorIds.length} specific actors...`);

    const actors = [];
    const validation = {
      enabled: validate,
      valid: 0,
      invalid: 0,
      errors: []
    };

    for (const id of actorIds) {
      const actor = game.actors.get(id);
      if (!actor) {
        Logger.warn(`Actor not found: ${id}`);
        continue;
      }

      const actorData = this._exportActor(actor);
      actors.push(actorData);

      if (validate) {
        const result = validateActorData(actorData);
        if (result.valid) {
          validation.valid++;
        } else {
          validation.invalid++;
          validation.errors.push({
            id: actor.id,
            name: actor.name,
            errors: result.errors,
            warnings: result.warnings
          });
        }
      }
    }

    return {
      success: true,
      actors,
      count: actors.length,
      validation
    };
  }

  /**
   * Export specific items by ID
   *
   * @param {Array<string>} itemIds - Item IDs to export
   * @param {boolean} validate - Validate exported data (default: true)
   * @returns {Promise<Object>} Exported items with validation results
   */
  static async exportItems(itemIds, validate = true) {
    Logger.info(`Exporting ${itemIds.length} specific items...`);

    const items = [];
    const validation = {
      enabled: validate,
      valid: 0,
      invalid: 0,
      errors: []
    };

    for (const id of itemIds) {
      const item = game.items.get(id);
      if (!item) {
        Logger.warn(`Item not found: ${id}`);
        continue;
      }

      const itemData = this._exportItem(item);
      items.push(itemData);

      if (validate) {
        const result = validateItemData(itemData);
        if (result.valid) {
          validation.valid++;
        } else {
          validation.invalid++;
          validation.errors.push({
            id: item.id,
            name: item.name,
            errors: result.errors,
            warnings: result.warnings
          });
        }
      }
    }

    return {
      success: true,
      items,
      count: items.length,
      validation
    };
  }

  /**
   * Download export data as JSON file
   *
   * @param {Object} exportData - Export data to download
   * @param {string} filename - Custom filename (optional)
   */
  static downloadExport(exportData, filename = null) {
    const timestamp = Date.now();
    const worldId = game.world.id;
    const exportFilename = filename || `l5r4-export-${worldId}-${timestamp}.json`;

    const content = JSON.stringify(exportData, null, 2);

    // Use Foundry's built-in method for better compatibility across platforms
    saveDataToFile(content, 'application/json', exportFilename);

    Logger.info(`Export downloaded: ${exportFilename}`);
    ui.notifications?.info(`Export saved: ${exportFilename}`);
  }
}
