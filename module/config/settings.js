/**
 * @fileoverview Module Settings Registration
 * 
 * Registers all settings for the L5R4 migrator module.
 * Settings are stored in Foundry's settings system and persist
 * across sessions.
 */

/**
 * Register all module settings
 * Called during module initialization
 */
export function registerSettings() {
  // Example setting - backup location preference
  game.settings.register('l5r4-migrator', 'backupLocation', {
    name: 'L5R4MIGRATOR.Settings.BackupLocation.Name',
    hint: 'L5R4MIGRATOR.Settings.BackupLocation.Hint',
    scope: 'world',
    config: true,
    type: String,
    default: 'data/backups',
    requiresReload: false
  });
  
  // Example setting - automatic backup before migration
  game.settings.register('l5r4-migrator', 'autoBackup', {
    name: 'L5R4MIGRATOR.Settings.AutoBackup.Name',
    hint: 'L5R4MIGRATOR.Settings.AutoBackup.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false
  });
  
  // Example setting - log level
  game.settings.register('l5r4-migrator', 'logLevel', {
    name: 'L5R4MIGRATOR.Settings.LogLevel.Name',
    hint: 'L5R4MIGRATOR.Settings.LogLevel.Hint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'error': 'L5R4MIGRATOR.Settings.LogLevel.Error',
      'warn': 'L5R4MIGRATOR.Settings.LogLevel.Warn',
      'info': 'L5R4MIGRATOR.Settings.LogLevel.Info',
      'debug': 'L5R4MIGRATOR.Settings.LogLevel.Debug'
    },
    default: 'info',
    requiresReload: false
  });
  
  console.log('L5R4 Migrator | Settings registered');
}
