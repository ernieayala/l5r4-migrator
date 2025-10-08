/**
 * @fileoverview Path Utilities for L5R4 Migration
 *
 * Safe utilities for accessing and manipulating nested object properties
 * using dot-notation paths. Works in both Node.js (tests) and Foundry runtime.
 *
 * These utilities are essential for migration operations where we need to:
 * - Read data from legacy snake_case paths
 * - Write data to new camelCase paths
 * - Handle missing intermediate objects gracefully
 * - Transform data structures without errors
 */

/**
 * Safely retrieve a nested property value using dot-notation path.
 * Handles missing intermediate objects gracefully without throwing errors.
 *
 * @param {Object} obj - Source object to read from
 * @param {string} path - Dot-notation path (e.g., "system.traits.strength")
 * @returns {any} Property value or undefined if path doesn't exist
 *
 * @example
 * const value = getByPath(actor, "system.rings.fire");
 * // Returns actor.system.rings.fire or undefined
 *
 * const missing = getByPath(actor, "system.nonexistent.field");
 * // Returns undefined (no error thrown)
 */
export function getByPath(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  try {
    return path.split('.').reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
  } catch (_e) {
    return undefined;
  }
}

/**
 * Set a nested property value using dot-notation path.
 * Creates missing intermediate objects as needed to ensure the path exists.
 *
 * @param {Object} obj - Target object to modify
 * @param {string} path - Dot-notation path (e.g., "system.traits.strength")
 * @param {any} value - Value to set at the specified path
 * @returns {boolean} True if successful, false if path invalid
 *
 * @example
 * const updateData = {};
 * setByPath(updateData, "system.rings.fire", 3);
 * // Creates updateData.system.rings.fire = 3
 *
 * setByPath(updateData, "system.traits.str", 4);
 * // Creates updateData.system.traits.str = 4
 */
export function setByPath(obj, path, value) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  if (!path || typeof path !== 'string') {
    return false;
  }

  try {
    const parts = path.split('.');
    const last = parts.pop();

    let current = obj;
    for (const key of parts) {
      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[last] = value;
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Remove a nested property using dot-notation path.
 * Safely handles missing intermediate objects without throwing errors.
 *
 * @param {Object} obj - Target object to modify
 * @param {string} path - Dot-notation path to property to delete
 * @returns {boolean} True if property was deleted, false if path not found
 *
 * @example
 * deleteByPath(updateData, "system.deprecated.oldField");
 * // Removes updateData.system.deprecated.oldField if it exists
 */
export function deleteByPath(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  if (!path || typeof path !== 'string') {
    return false;
  }

  try {
    const parts = path.split('.');
    const last = parts.pop();

    let current = obj;
    for (const key of parts) {
      if (current?.[key] === undefined) {
        return false;
      }
      current = current[key];
    }

    if (current && Object.prototype.hasOwnProperty.call(current, last)) {
      delete current[last];
      return true;
    }

    return false;
  } catch (_e) {
    return false;
  }
}

/**
 * Check if a nested property exists using dot-notation path.
 *
 * @param {Object} obj - Source object to check
 * @param {string} path - Dot-notation path
 * @returns {boolean} True if property exists (even if value is null/undefined)
 *
 * @example
 * hasPath(actor, "system.traits.str");  // true if path exists
 * hasPath(actor, "system.nonexistent"); // false
 */
export function hasPath(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  if (!path || typeof path !== 'string') {
    return false;
  }

  try {
    const parts = path.split('.');
    const last = parts.pop();

    let current = obj;
    for (const key of parts) {
      if (current?.[key] === undefined) {
        return false;
      }
      current = current[key];
    }

    return current && Object.prototype.hasOwnProperty.call(current, last);
  } catch (_e) {
    return false;
  }
}

/**
 * Copy a value from one path to another within the same object.
 * Creates destination path if needed, preserves source value.
 *
 * @param {Object} obj - Object to operate on
 * @param {string} fromPath - Source path
 * @param {string} toPath - Destination path
 * @param {boolean} deleteSource - Whether to delete source after copying
 * @returns {boolean} True if copy successful
 *
 * @example
 * // Migrate field from old to new name
 * copyPath(data, "system.wound_lvl", "system.woundLevels", true);
 * // Copies value and removes old field
 */
export function copyPath(obj, fromPath, toPath, deleteSource = false) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const value = getByPath(obj, fromPath);
  if (value === undefined) {
    return false;
  }

  const success = setByPath(obj, toPath, value);
  if (success && deleteSource) {
    deleteByPath(obj, fromPath);
  }

  return success;
}

/**
 * Rename a field from snake_case to camelCase using path utilities.
 * Convenience wrapper around copyPath for common migration pattern.
 *
 * @param {Object} obj - Object to operate on
 * @param {string} basePath - Base path (e.g., "system.initiative")
 * @param {string} oldName - Old field name (e.g., "roll_mod")
 * @param {string} newName - New field name (e.g., "rollMod")
 * @returns {boolean} True if rename successful
 *
 * @example
 * renameField(data, "system.initiative", "roll_mod", "rollMod");
 * // Migrates system.initiative.roll_mod → system.initiative.rollMod
 */
export function renameField(obj, basePath, oldName, newName) {
  const fromPath = basePath ? `${basePath}.${oldName}` : oldName;
  const toPath = basePath ? `${basePath}.${newName}` : newName;
  return copyPath(obj, fromPath, toPath, true);
}

/**
 * Get all paths that exist in an object (for debugging/inspection).
 * Returns array of dot-notation paths to all leaf values.
 *
 * @param {Object} obj - Object to inspect
 * @param {string} prefix - Path prefix (used internally for recursion)
 * @returns {string[]} Array of all paths in the object
 *
 * @example
 * getAllPaths(actor.system);
 * // Returns ["traits.str", "traits.sta", "rings.fire", ...]
 */
export function getAllPaths(obj, prefix = '') {
  const paths = [];

  if (!obj || typeof obj !== 'object') {
    return paths;
  }

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getAllPaths(value, path));
    } else {
      paths.push(path);
    }
  }

  return paths;
}
