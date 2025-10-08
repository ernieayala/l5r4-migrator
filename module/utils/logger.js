/**
 * @fileoverview Logger Utility
 *
 * Centralized logging for migration operations.
 * Respects user log level settings.
 */

/**
 * Logger class for migration operations
 */
export class Logger {
  /**
   * Log an error message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  static error(message, ...args) {
    console.error(`L5R4 Migrator | ERROR: ${message}`, ...args);
  }

  /**
   * Log a warning message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  static warn(message, ...args) {
    if (this.#shouldLog('warn')) {
      console.warn(`L5R4 Migrator | WARN: ${message}`, ...args);
    }
  }

  /**
   * Log an info message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  static info(message, ...args) {
    if (this.#shouldLog('info')) {
      console.log(`L5R4 Migrator | INFO: ${message}`, ...args);
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Message to log
   * @param {...any} args - Additional arguments
   */
  static debug(message, ...args) {
    if (this.#shouldLog('debug')) {
      console.log(`L5R4 Migrator | DEBUG: ${message}`, ...args);
    }
  }

  /**
   * Check if log level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to log
   */
  static #shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };

    // Try to get user setting, fallback to 'info' if not available
    let currentLevel = 'info';
    try {
      if (game?.settings?.get) {
        currentLevel = game.settings.get('l5r4-migrator', 'logLevel') || 'info';
      }
    } catch (e) {
      // Settings not available (e.g., during tests or early init), use default
      currentLevel = 'info';
    }

    return levels[level] <= levels[currentLevel];
  }
}
