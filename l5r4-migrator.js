/**
 * @fileoverview L5R4 World Migrator - Main Entry Point
 * 
 * Migration module for transferring worlds from legacy l5r4 system
 * to l5r4-enhanced system. Provides UI and tools for safe data migration.
 * 
 * @module l5r4-migrator
 * @version 0.1.0
 * @author Ernie Ayala
 * @license MIT
 */

import { registerSettings } from './module/config/settings.js';
import { MigratorUI } from './module/apps/migrator-ui.js';
import { registerQuenchTests } from './module/testing/quench-tests.js';

/**
 * Module initialization
 * Runs once when Foundry VTT loads
 */
Hooks.once('init', async () => {
  console.log('L5R4 Migrator | Initializing migration module');
  
  // Register module settings
  registerSettings();
  
  // Log initialization complete
  console.log('L5R4 Migrator | Initialization complete');
});

/**
 * Setup hook - runs after game data is ready
 * Adds UI controls and buttons
 */
Hooks.once('ready', async () => {
  console.log('L5R4 Migrator | Module ready');
  
  // Check if we're using the correct system
  const systemId = game.system.id;
  if (systemId !== 'l5r4' && systemId !== 'l5r4-enhanced') {
    console.warn('L5R4 Migrator | This module is designed for l5r4 or l5r4-enhanced systems');
  }
  
  // Register Quench tests if available
  if (game.modules.get('quench')?.active) {
    registerQuenchTests();
  }
  
  // Expose API for testing and debugging
  game.modules.get('l5r4-migrator').api = {
    MigratorUI,
    openMigrator: () => new MigratorUI().render(true)
  };
  
  console.log('L5R4 Migrator | Ready - Access via game.modules.get("l5r4-migrator").api');
});

/**
 * Add button to settings sidebar
 */
Hooks.on('renderSettings', (app, html) => {
  // Create migration button
  const button = $(`
    <button id="l5r4-migrator-button" class="l5r4-migrator-settings-button">
      <i class="fas fa-exchange-alt"></i>
      ${game.i18n.localize('L5R4MIGRATOR.ButtonOpenMigrator')}
    </button>
  `);
  
  // Add click handler
  button.on('click', () => {
    new MigratorUI().render(true);
  });
  
  // Insert after game settings button
  html.find('#settings-game').after(button);
});
