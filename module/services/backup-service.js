/**
 * @fileoverview Backup Service
 * 
 * Handles creating timestamped backups of worlds before migration operations.
 * Provides safety net for rollback if migration fails.
 * 
 * **Backup Strategy:**
 * - Exports all world documents to JSON (actors, items, scenes, journals, etc.)
 * - Saves to timestamped files in user's Downloads folder
 * - Stores metadata for easy identification and restoration
 * - Non-destructive - never modifies original world during backup
 * 
 * **File Structure:**
 * ```json
 * {
 *   "metadata": {
 *     "worldId": "my-world",
 *     "worldTitle": "My L5R4 World",
 *     "system": "l5r4",
 *     "systemVersion": "1.0.0",
 *     "timestamp": 1234567890,
 *     "backupVersion": "1.0.0"
 *   },
 *   "actors": [...],
 *   "items": [...],
 *   "scenes": [...],
 *   "journals": [...],
 *   "folders": [...],
 *   "playlists": [...],
 *   "settings": {...}
 * }
 * ```
 */

import { Logger } from '../utils/logger.js';

/**
 * Service for creating and managing world backups
 */
export class BackupService {
  /**
   * Create a timestamped backup of the current world
   * Exports all world data to a JSON file in user's Downloads
   * 
   * @param {Object} options - Backup options
   * @param {boolean} options.includeSettings - Include world settings (default: true)
   * @param {boolean} options.includeScenes - Include scenes (default: true)
   * @param {boolean} options.includeJournals - Include journal entries (default: true)
   * @param {boolean} options.includePlaylists - Include playlists (default: false)
   * @param {string} options.filename - Custom filename (default: auto-generated)
   * @returns {Promise<Object>} Backup result with path and metadata
   */
  static async createBackup(options = {}) {
    const {
      includeSettings = true,
      includeScenes = true,
      includeJournals = true,
      includePlaylists = false,
      filename = null
    } = options;

    Logger.info('Creating world backup...');

    try {
      // Collect world data
      const backupData = await this._collectWorldData({
        includeSettings,
        includeScenes,
        includeJournals,
        includePlaylists
      });

      // Generate filename
      const timestamp = Date.now();
      const worldId = game.world.id;
      const backupFilename = filename || `l5r4-backup-${worldId}-${timestamp}.json`;

      // Prepare file content
      const fileContent = JSON.stringify(backupData, null, 2);

      // Save to Downloads using browser download
      this._downloadFile(fileContent, backupFilename);

      const metadata = backupData.metadata;
      
      Logger.info(`Backup created successfully: ${backupFilename}`);
      
      ui.notifications?.info(`Backup created: ${backupFilename}`);

      return {
        success: true,
        filename: backupFilename,
        metadata,
        size: fileContent.length,
        timestamp
      };
    } catch (error) {
      Logger.error('Failed to create backup', error);
      ui.notifications?.error('Backup creation failed. See console for details.');
      throw error;
    }
  }

  /**
   * Collect all world data for backup
   * @private
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Complete world data
   */
  static async _collectWorldData(options) {
    const metadata = {
      worldId: game.world.id,
      worldTitle: game.world.title,
      system: game.system.id,
      systemVersion: game.system.version,
      foundryVersion: game.version,
      timestamp: Date.now(),
      timestampISO: new Date().toISOString(),
      backupVersion: '1.0.0',
      options
    };

    const data = { metadata };

    // Always include actors and items (core migration data)
    Logger.debug('Collecting actors...');
    data.actors = game.actors.contents.map(a => a.toObject());
    
    Logger.debug('Collecting items...');
    data.items = game.items.contents.map(i => i.toObject());

    // Optional collections
    if (options.includeScenes) {
      Logger.debug('Collecting scenes...');
      data.scenes = game.scenes.contents.map(s => s.toObject());
    }

    if (options.includeJournals) {
      Logger.debug('Collecting journal entries...');
      data.journals = game.journal.contents.map(j => j.toObject());
    }

    if (options.includePlaylists) {
      Logger.debug('Collecting playlists...');
      data.playlists = game.playlists?.contents.map(p => p.toObject()) || [];
    }

    // Always include folders for organization
    Logger.debug('Collecting folders...');
    data.folders = game.folders.contents.map(f => f.toObject());

    // Include world settings if requested
    if (options.includeSettings) {
      Logger.debug('Collecting world settings...');
      data.settings = await this._collectWorldSettings();
    }

    // Add statistics
    metadata.stats = {
      actors: data.actors?.length || 0,
      items: data.items?.length || 0,
      scenes: data.scenes?.length || 0,
      journals: data.journals?.length || 0,
      folders: data.folders?.length || 0,
      playlists: data.playlists?.length || 0
    };

    return data;
  }

  /**
   * Collect world settings
   * @private
   * @returns {Promise<Object>} World settings data
   */
  static async _collectWorldSettings() {
    const settings = {};
    
    // Get all settings for this module
    try {
      const moduleSettings = game.settings.storage.get('world')
        .filter(s => s[0].startsWith('l5r4'));
      
      for (const [key, value] of moduleSettings) {
        settings[key] = value;
      }
    } catch (error) {
      Logger.warn('Could not collect all settings', error);
    }

    return settings;
  }

  /**
   * Trigger browser download of backup file
   * @private
   * @param {string} content - File content
   * @param {string} filename - Filename
   */
  static _downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse and validate a backup file
   * User must upload the file via file input
   * 
   * @param {File} file - Backup file from file input
   * @returns {Promise<Object>} Parsed and validated backup data
   */
  static async parseBackupFile(file) {
    Logger.info(`Parsing backup file: ${file.name}`);

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      // Validate backup structure
      if (!data.metadata) {
        throw new Error('Invalid backup file: missing metadata');
      }

      if (!data.actors && !data.items) {
        throw new Error('Invalid backup file: no world data found');
      }

      // Validate version compatibility
      const backupSystem = data.metadata.system;
      const currentSystem = game.system.id;
      
      if (backupSystem !== 'l5r4' && backupSystem !== 'l5r4-enhanced') {
        throw new Error(`Incompatible system: backup is from ${backupSystem}, expected l5r4 or l5r4-enhanced`);
      }

      Logger.info('Backup file validated successfully', data.metadata);

      return data;
    } catch (error) {
      Logger.error('Failed to parse backup file', error);
      ui.notifications?.error(`Invalid backup file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore world from backup data
   * WARNING: This will delete ALL existing world data first!
   * 
   * @param {Object} backupData - Parsed backup data
   * @param {Object} options - Restore options
   * @param {boolean} options.deleteExisting - Delete existing data first (default: true)
   * @param {boolean} options.restoreSettings - Restore settings (default: false)
   * @returns {Promise<Object>} Restore result with statistics
   */
  static async restoreBackup(backupData, options = {}) {
    const {
      deleteExisting = true,
      restoreSettings = false
    } = options;

    Logger.info('Starting backup restoration...', backupData.metadata);

    if (!game.user?.isGM) {
      throw new Error('Only GMs can restore backups');
    }

    const stats = {
      deleted: { actors: 0, items: 0, scenes: 0, journals: 0, folders: 0 },
      created: { actors: 0, items: 0, scenes: 0, journals: 0, folders: 0 },
      errors: []
    };

    try {
      // Step 1: Delete existing data if requested
      if (deleteExisting) {
        Logger.info('Deleting existing world data...');
        stats.deleted = await this._deleteExistingData();
      }

      // Step 2: Restore folders first (for organization)
      if (backupData.folders?.length) {
        Logger.info(`Restoring ${backupData.folders.length} folders...`);
        for (const folderData of backupData.folders) {
          try {
            await Folder.create(folderData);
            stats.created.folders++;
          } catch (error) {
            Logger.warn(`Failed to restore folder ${folderData.name}`, error);
            stats.errors.push({ type: 'folder', id: folderData._id, error: error.message });
          }
        }
      }

      // Step 3: Restore actors
      if (backupData.actors?.length) {
        Logger.info(`Restoring ${backupData.actors.length} actors...`);
        for (const actorData of backupData.actors) {
          try {
            await Actor.create(actorData);
            stats.created.actors++;
          } catch (error) {
            Logger.warn(`Failed to restore actor ${actorData.name}`, error);
            stats.errors.push({ type: 'actor', id: actorData._id, error: error.message });
          }
        }
      }

      // Step 4: Restore items
      if (backupData.items?.length) {
        Logger.info(`Restoring ${backupData.items.length} items...`);
        for (const itemData of backupData.items) {
          try {
            await Item.create(itemData);
            stats.created.items++;
          } catch (error) {
            Logger.warn(`Failed to restore item ${itemData.name}`, error);
            stats.errors.push({ type: 'item', id: itemData._id, error: error.message });
          }
        }
      }

      // Step 5: Restore scenes (optional)
      if (backupData.scenes?.length) {
        Logger.info(`Restoring ${backupData.scenes.length} scenes...`);
        for (const sceneData of backupData.scenes) {
          try {
            await Scene.create(sceneData);
            stats.created.scenes++;
          } catch (error) {
            Logger.warn(`Failed to restore scene ${sceneData.name}`, error);
            stats.errors.push({ type: 'scene', id: sceneData._id, error: error.message });
          }
        }
      }

      // Step 6: Restore journals (optional)
      if (backupData.journals?.length) {
        Logger.info(`Restoring ${backupData.journals.length} journal entries...`);
        for (const journalData of backupData.journals) {
          try {
            await JournalEntry.create(journalData);
            stats.created.journals++;
          } catch (error) {
            Logger.warn(`Failed to restore journal ${journalData.name}`, error);
            stats.errors.push({ type: 'journal', id: journalData._id, error: error.message });
          }
        }
      }

      // Step 7: Restore settings (optional, careful!)
      if (restoreSettings && backupData.settings) {
        Logger.info('Restoring world settings...');
        await this._restoreSettings(backupData.settings);
      }

      Logger.info('Backup restoration complete', stats);
      
      const errorCount = stats.errors.length;
      if (errorCount > 0) {
        ui.notifications?.warn(`Restore completed with ${errorCount} errors. See console for details.`);
      } else {
        ui.notifications?.info('Backup restored successfully!');
      }

      return {
        success: true,
        stats,
        metadata: backupData.metadata
      };
    } catch (error) {
      Logger.error('Backup restoration failed', error);
      ui.notifications?.error('Backup restoration failed. See console for details.');
      throw error;
    }
  }

  /**
   * Delete all existing world data
   * @private
   * @returns {Promise<Object>} Deletion statistics
   */
  static async _deleteExistingData() {
    const stats = { actors: 0, items: 0, scenes: 0, journals: 0, folders: 0 };

    // Delete in reverse dependency order
    const actorIds = game.actors.contents.map(a => a.id);
    if (actorIds.length) {
      await Actor.deleteDocuments(actorIds);
      stats.actors = actorIds.length;
    }

    const itemIds = game.items.contents.map(i => i.id);
    if (itemIds.length) {
      await Item.deleteDocuments(itemIds);
      stats.items = itemIds.length;
    }

    const sceneIds = game.scenes.contents.map(s => s.id);
    if (sceneIds.length) {
      await Scene.deleteDocuments(sceneIds);
      stats.scenes = sceneIds.length;
    }

    const journalIds = game.journal.contents.map(j => j.id);
    if (journalIds.length) {
      await JournalEntry.deleteDocuments(journalIds);
      stats.journals = journalIds.length;
    }

    const folderIds = game.folders.contents.map(f => f.id);
    if (folderIds.length) {
      await Folder.deleteDocuments(folderIds);
      stats.folders = folderIds.length;
    }

    return stats;
  }

  /**
   * Restore settings from backup
   * @private
   * @param {Object} settings - Settings data
   */
  static async _restoreSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      try {
        await game.settings.set('l5r4', key, value);
      } catch (error) {
        Logger.warn(`Failed to restore setting ${key}`, error);
      }
    }
  }
}
