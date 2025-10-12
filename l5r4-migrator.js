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
  // Register module settings
  registerSettings();
});

/**
 * Setup hook - runs after game data is ready
 * Adds UI controls and buttons
 */
Hooks.once('ready', async () => {
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
});

/**
 * Add button to settings sidebar
 * Note: This may not work in all Foundry v13 versions due to Settings dialog changes.
 * Users can always use the console command: game.modules.get('l5r4-migrator').api.openMigrator()
 */
Hooks.on('renderSettings', (app, html) => {
  // Handle both jQuery (v12) and HTMLElement (v13)
  const element = html instanceof jQuery ? html[0] : html;
  
  // Create migration button
  const button = document.createElement('button');
  button.id = 'l5r4-migrator-button';
  button.className = 'l5r4-migrator-settings-button';
  button.innerHTML = `
    <i class="fas fa-exchange-alt"></i>
    ${game.i18n.localize('L5R4MIGRATOR.ButtonOpenMigrator')}
  `;
  
  // Add click handler
  button.addEventListener('click', () => {
    new MigratorUI().render(true);
  });
  
  // Try multiple insertion strategies for v13 compatibility
  // Strategy 1: After game settings button
  let gameSettingsButton = element.querySelector('#settings-game');
  if (gameSettingsButton) {
    gameSettingsButton.insertAdjacentElement('afterend', button);
    return;
  }
  
  // Strategy 2: In the game settings section
  const gameSection = element.querySelector('section.game-settings');
  if (gameSection) {
    gameSection.appendChild(button);
    return;
  }
  
  // Strategy 3: Find any settings section
  const sections = element.querySelectorAll('section');
  if (sections.length > 0) {
    sections[0].appendChild(button);
    return;
  }
  
  console.warn('L5R4 Migrator | Could not find suitable location for settings button. Use console command instead.');
});
