/**
 * @fileoverview Unit Tests for Backup Service
 *
 * Tests backup creation and restoration logic with mocked Foundry APIs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackupService } from '@module/services/backup-service.js';

describe('Backup Service', () => {
  describe('_collectWorldData', () => {
    beforeEach(() => {
      // Mock game world data
      game.world = {
        id: 'test-world',
        title: 'Test World'
      };
      game.system = {
        id: 'l5r4',
        version: '1.0.0'
      };
      game.version = '13.0.0';

      // Mock actors
      game.actors = {
        contents: [
          { toObject: () => ({ _id: 'actor1', name: 'Test Actor', type: 'pc' }) },
          { toObject: () => ({ _id: 'actor2', name: 'Test NPC', type: 'npc' }) }
        ]
      };

      // Mock items
      game.items = {
        contents: [{ toObject: () => ({ _id: 'item1', name: 'Test Skill', type: 'skill' }) }]
      };

      // Mock scenes
      game.scenes = {
        contents: [{ toObject: () => ({ _id: 'scene1', name: 'Test Scene' }) }]
      };

      // Mock journals
      game.journal = {
        contents: [{ toObject: () => ({ _id: 'journal1', name: 'Test Journal' }) }]
      };

      // Mock folders
      game.folders = {
        contents: [{ toObject: () => ({ _id: 'folder1', name: 'Test Folder', type: 'Actor' }) }]
      };

      // Mock playlists
      game.playlists = {
        contents: [{ toObject: () => ({ _id: 'playlist1', name: 'Test Playlist' }) }]
      };
    });

    it('should collect basic world data', async () => {
      const data = await BackupService._collectWorldData({
        includeScenes: false,
        includeJournals: false,
        includePlaylists: false,
        includeSettings: false
      });

      expect(data.metadata).toBeDefined();
      expect(data.metadata.worldId).toBe('test-world');
      expect(data.metadata.worldTitle).toBe('Test World');
      expect(data.metadata.system).toBe('l5r4');

      expect(data.actors).toHaveLength(2);
      expect(data.items).toHaveLength(1);
      expect(data.folders).toHaveLength(1);

      expect(data.scenes).toBeUndefined();
      expect(data.journals).toBeUndefined();
      expect(data.playlists).toBeUndefined();
    });

    it('should include scenes when requested', async () => {
      const data = await BackupService._collectWorldData({
        includeScenes: true,
        includeJournals: false,
        includePlaylists: false,
        includeSettings: false
      });

      expect(data.scenes).toBeDefined();
      expect(data.scenes).toHaveLength(1);
      expect(data.scenes[0].name).toBe('Test Scene');
    });

    it('should include journals when requested', async () => {
      const data = await BackupService._collectWorldData({
        includeScenes: false,
        includeJournals: true,
        includePlaylists: false,
        includeSettings: false
      });

      expect(data.journals).toBeDefined();
      expect(data.journals).toHaveLength(1);
      expect(data.journals[0].name).toBe('Test Journal');
    });

    it('should include playlists when requested', async () => {
      const data = await BackupService._collectWorldData({
        includeScenes: false,
        includeJournals: false,
        includePlaylists: true,
        includeSettings: false
      });

      expect(data.playlists).toBeDefined();
      expect(data.playlists).toHaveLength(1);
      expect(data.playlists[0].name).toBe('Test Playlist');
    });

    it('should generate statistics', async () => {
      const data = await BackupService._collectWorldData({
        includeScenes: true,
        includeJournals: true,
        includePlaylists: true,
        includeSettings: false
      });

      expect(data.metadata.stats).toBeDefined();
      expect(data.metadata.stats.actors).toBe(2);
      expect(data.metadata.stats.items).toBe(1);
      expect(data.metadata.stats.scenes).toBe(1);
      expect(data.metadata.stats.journals).toBe(1);
      expect(data.metadata.stats.folders).toBe(1);
      expect(data.metadata.stats.playlists).toBe(1);
    });

    it('should include timestamp metadata', async () => {
      const before = Date.now();
      const data = await BackupService._collectWorldData({});
      const after = Date.now();

      expect(data.metadata.timestamp).toBeGreaterThanOrEqual(before);
      expect(data.metadata.timestamp).toBeLessThanOrEqual(after);
      expect(data.metadata.timestampISO).toBeDefined();
      expect(data.metadata.backupVersion).toBe('1.0.0');
    });
  });

  describe('parseBackupFile', () => {
    it('should parse valid backup file', async () => {
      const validBackup = {
        metadata: {
          worldId: 'test-world',
          system: 'l5r4',
          timestamp: Date.now()
        },
        actors: [{ _id: 'actor1', name: 'Test' }],
        items: []
      };

      const file = new File([JSON.stringify(validBackup)], 'backup.json', { type: 'application/json' });

      const data = await BackupService.parseBackupFile(file);

      expect(data.metadata).toBeDefined();
      expect(data.actors).toHaveLength(1);
    });

    it('should reject backup without metadata', async () => {
      const invalidBackup = {
        actors: [{ _id: 'actor1' }]
      };

      const file = new File([JSON.stringify(invalidBackup)], 'backup.json', { type: 'application/json' });

      await expect(BackupService.parseBackupFile(file)).rejects.toThrow('missing metadata');
    });

    it('should reject backup without world data', async () => {
      const invalidBackup = {
        metadata: { worldId: 'test', system: 'l5r4' }
      };

      const file = new File([JSON.stringify(invalidBackup)], 'backup.json', { type: 'application/json' });

      await expect(BackupService.parseBackupFile(file)).rejects.toThrow('no world data');
    });

    it('should reject incompatible system', async () => {
      const invalidBackup = {
        metadata: {
          worldId: 'test',
          system: 'dnd5e'
        },
        actors: [{ _id: 'actor1' }]
      };

      const file = new File([JSON.stringify(invalidBackup)], 'backup.json', { type: 'application/json' });

      await expect(BackupService.parseBackupFile(file)).rejects.toThrow('Incompatible system');
    });

    it('should accept l5r4-enhanced system', async () => {
      const validBackup = {
        metadata: {
          worldId: 'test',
          system: 'l5r4-enhanced'
        },
        actors: [{ _id: 'actor1' }]
      };

      const file = new File([JSON.stringify(validBackup)], 'backup.json', { type: 'application/json' });

      const data = await BackupService.parseBackupFile(file);
      expect(data.metadata.system).toBe('l5r4-enhanced');
    });

    it('should reject malformed JSON', async () => {
      const file = new File(['{ invalid json }'], 'backup.json', { type: 'application/json' });

      await expect(BackupService.parseBackupFile(file)).rejects.toThrow();
    });
  });

  describe('_downloadFile', () => {
    it('should call saveDataToFile', () => {
      const saveDataToFileSpy = vi.spyOn(globalThis, 'saveDataToFile');

      BackupService._downloadFile('test content', 'test.json');

      expect(saveDataToFileSpy).toHaveBeenCalledWith('test content', 'application/json', 'test.json');

      saveDataToFileSpy.mockRestore();
    });
  });

  describe('_deleteExistingData', () => {
    beforeEach(() => {
      // Mock document collections
      game.actors = {
        contents: [{ id: 'actor1' }, { id: 'actor2' }]
      };
      game.items = {
        contents: [{ id: 'item1' }]
      };
      game.scenes = {
        contents: [{ id: 'scene1' }]
      };
      game.journal = {
        contents: [{ id: 'journal1' }]
      };
      game.folders = {
        contents: [{ id: 'folder1' }]
      };

      // Mock delete methods
      globalThis.Actor.deleteDocuments = vi.fn().mockResolvedValue([]);
      globalThis.Item.deleteDocuments = vi.fn().mockResolvedValue([]);
      globalThis.Scene.deleteDocuments = vi.fn().mockResolvedValue([]);
      globalThis.JournalEntry.deleteDocuments = vi.fn().mockResolvedValue([]);
      globalThis.Folder.deleteDocuments = vi.fn().mockResolvedValue([]);
    });

    it('should delete all world data', async () => {
      const stats = await BackupService._deleteExistingData();

      expect(Actor.deleteDocuments).toHaveBeenCalledWith(['actor1', 'actor2']);
      expect(Item.deleteDocuments).toHaveBeenCalledWith(['item1']);
      expect(Scene.deleteDocuments).toHaveBeenCalledWith(['scene1']);
      expect(JournalEntry.deleteDocuments).toHaveBeenCalledWith(['journal1']);
      expect(Folder.deleteDocuments).toHaveBeenCalledWith(['folder1']);

      expect(stats.actors).toBe(2);
      expect(stats.items).toBe(1);
      expect(stats.scenes).toBe(1);
      expect(stats.journals).toBe(1);
      expect(stats.folders).toBe(1);
    });

    it('should handle empty collections', async () => {
      game.actors.contents = [];
      game.items.contents = [];
      game.scenes.contents = [];
      game.journal.contents = [];
      game.folders.contents = [];

      const stats = await BackupService._deleteExistingData();

      expect(Actor.deleteDocuments).not.toHaveBeenCalled();
      expect(stats.actors).toBe(0);
      expect(stats.items).toBe(0);
    });
  });

  describe('_collectWorldSettings', () => {
    it('should collect l5r4 settings', async () => {
      // Mock settings storage - return iterable with filter method
      const mockWorldStorage = {
        filter: vi.fn((fn) => {
          const entries = [
            ['l5r4.logLevel', 'info'],
            ['l5r4.autoBackup', true],
            ['other-module.setting', 'value']
          ];
          return entries.filter(fn);
        })
      };

      game.settings.storage = {
        get: vi.fn().mockReturnValue(mockWorldStorage)
      };

      const settings = await BackupService._collectWorldSettings();

      expect(settings['l5r4.logLevel']).toBe('info');
      expect(settings['l5r4.autoBackup']).toBe(true);
      expect(settings['other-module.setting']).toBeUndefined();
    });

    it('should handle settings collection errors', async () => {
      game.settings.storage = {
        get: vi.fn().mockImplementation(() => {
          throw new Error('Settings error');
        })
      };

      const settings = await BackupService._collectWorldSettings();
      expect(settings).toEqual({});
    });
  });

  describe('Integration scenarios', () => {
    it('should handle backup of world with no actors or items', async () => {
      game.actors = { contents: [] };
      game.items = { contents: [] };
      game.folders = { contents: [] };

      const data = await BackupService._collectWorldData({});

      expect(data.actors).toHaveLength(0);
      expect(data.items).toHaveLength(0);
      expect(data.metadata.stats.actors).toBe(0);
      expect(data.metadata.stats.items).toBe(0);
    });

    it('should preserve all document data through toObject', async () => {
      const actorData = {
        _id: 'actor1',
        name: 'Test PC',
        type: 'pc',
        system: {
          traits: { str: 3 },
          items: [{ _id: 'embedded1', name: 'Embedded Item' }]
        }
      };

      game.actors = {
        contents: [{ toObject: () => actorData }]
      };
      game.items = { contents: [] };
      game.folders = { contents: [] };

      const data = await BackupService._collectWorldData({});

      expect(data.actors[0]).toEqual(actorData);
      expect(data.actors[0].system.items).toHaveLength(1);
    });
  });
});
