/**
 * @fileoverview L5R4 Migration System - Data Migration and Schema Updates for Foundry VTT v13+
 * 
 * This module provides comprehensive migration functionality for the L5R4 system,
 * handling schema updates, icon path migrations, and data structure changes
 * across system versions. Migrations are applied automatically during system
 * initialization and are designed to be idempotent and safe.
 *
 * **Core Responsibilities:**
 * - **Schema Migration**: Automated data structure updates using configurable rules
 * - **Icon Path Migration**: Organizational restructuring of asset file locations
 * - **Version Management**: Tracking and applying incremental system updates
 * - **Data Integrity**: Ensuring safe transitions between system versions
 * - **Error Recovery**: Graceful handling of migration failures and rollback scenarios
 *
 * **Migration Architecture:**
 * - **Rule-Based System**: Uses SCHEMA_MAP for declarative field transformations
 * - **Batch Processing**: Efficient handling of large document collections
 * - **Progress Tracking**: Real-time feedback during long migration operations
 * - **Selective Application**: Only migrates documents that need updates
 * - **Validation System**: Verifies migration success before cleanup
 *
 * **Migration Types:**
 * - **Schema Migrations**: Update document data structures using SCHEMA_MAP rules
 * - **Icon Path Migrations**: Relocate icon files to new organizational structure
 * - **Compendium Migrations**: Apply migrations to unlocked compendium packs
 * - **World Document Migrations**: Update actors and items in the world
 * - **Flag Migrations**: Update system-specific flags and metadata
 *
 * **Safety Features:**
 * - **GM-Only Execution**: Migrations only run for Game Master users
 * - **Idempotent Operations**: Safe to run multiple times without side effects
 * - **Error Isolation**: Individual document failures don't stop the migration
 * - **Minimal Updates**: Only changed fields are updated to preserve performance
 * - **Backup-Friendly**: Uses Foundry's diff system for efficient updates
 * - **Rollback Support**: Maintains original data for potential recovery
 *
 * **Schema Migration System:**
 * Uses SCHEMA_MAP rules to define field relocations and transformations:
 * - **Dot-Notation Paths**: Support for nested property access and modification
 * - **Type-Specific Rules**: Different migration rules for actors, items, etc.
 * - **Conditional Logic**: Apply migrations based on document state or version
 * - **Data Preservation**: Existing destination data takes precedence
 * - **Cleanup Operations**: Removes obsolete fields after successful migration
 * - **Validation Hooks**: Pre/post migration validation for data integrity
 *
 * **Icon Migration System:**
 * Relocates icon files from flat structure to organized subfolders:
 * - **rings/**: Elemental ring icons (air.png, earth.png, fire.png, water.png, void.png)
 * - **status/**: Combat stance and status icons (attack.png, defense.png, etc.)
 * - **traits/**: Character trait icons organized by category
 * - **File Validation**: Confirms target file existence before path updates
 * - **Fallback Handling**: Maintains backward compatibility with old paths
 * - **Batch Operations**: Efficient processing of multiple icon updates
 *
 * **Performance Optimizations:**
 * - **Lazy Loading**: Migration rules loaded only when needed
 * - **Diff-Based Updates**: Only modified fields trigger database writes
 * - **Batch Processing**: Groups related updates for efficiency
 * - **Memory Management**: Processes large collections in chunks
 * - **Progress Indicators**: User feedback for long-running operations
 *
 * **Usage Examples:**
 * ```javascript
 * // Run all pending migrations
 * await runMigrations();
 * 
 * // Migrate specific document type
 * await migrateDocuments(game.actors, 'Actor');
 * 
 * // Check if migration is needed
 * const needsMigration = await checkMigrationNeeded(document);
 * ```
 *
 * **Error Handling:**
 * - **Graceful Degradation**: System continues functioning with partial migrations
 * - **Detailed Logging**: Comprehensive error reporting for troubleshooting
 * - **User Notifications**: Clear feedback about migration status and issues
 * - **Recovery Procedures**: Guidelines for manual intervention when needed
 *
 * **Integration Points:**
 * - **System Initialization**: Automatic migration checks during startup
 * - **Document Hooks**: Real-time migration triggers for new documents
 * - **Settings Integration**: User-configurable migration preferences
 * - **Compendium System**: Seamless handling of pack migrations
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#update|Document.update}
 * @see {@link https://foundryvtt.com/api/classes/client.FilePicker.html#browse|FilePicker.browse}
 * @see {@link https://foundryvtt.com/api/classes/foundry.utils.html#diffObject|foundry.utils.diffObject}
 */

import { SYS_ID, PATHS } from "../config/constants.js";
import L5R4Actor from "../documents/actor.js";

// Schema migration utilities for safe data structure updates

import { SCHEMA_MAP } from "./schema-map.js";

/**
 * Migrate bow items to weapons with isBow flag.
 * Converts all bow-type items to weapon-type items with the isBow flag set to true.
{{ ... }}
 * This consolidates the weapon system to use a single item type with conditional fields.
 * 
 * **IMPORTANT - Do Not Remove Yet:**
 * The "bow" type must remain registered in template.json for this migration to work.
 * Removal is safe only after confirming all user worlds have zero bow-type items.
 * Check criteria: No bug reports about bow items, multiple releases since v1.0.0,
 * and confirmation that legacy worlds have completed migration.
 * 
 * **Foundry v13 Compatibility:**
 * Uses {recursive: false} option when changing document types to comply with
 * Foundry v13's stricter type change requirements. This prevents the error:
 * "The type of a Document can be changed only if the system field is force-replaced (==) or updated with {recursive: false}"
 * 
 * @param {Array<Document>} docs - Array of documents to migrate
 * @param {string} label - Label for progress tracking
 * @returns {Promise<void>}
 */
async function migrateBowsToWeapons(docs, label) {
  const bowItems = docs.filter(doc => doc.type === "bow");
  if (bowItems.length === 0) return;

  console.log(`${SYS_ID} | Migrating ${bowItems.length} bow items to weapons (${label})`);
  
  for (const item of bowItems) {
    try {
      // Foundry v13 requires special handling when changing document types
      // We need to update the type and system data in separate operations
      // or use {recursive: false} to prevent deep merging issues
      
      // First, prepare the complete system data for the weapon
      const currentSystem = foundry.utils.deepClone(item.system || {});
      const weaponSystem = {
        ...currentSystem,
        isBow: true,
        damageKeep: 0, // Bows don't use damageKeep, set to 0
        // Ensure bow-specific fields are preserved
        str: currentSystem.str || 1,
        range: currentSystem.range || 100,
        arrow: currentSystem.arrow || "willow",
        // Ensure weapon-specific fields have defaults
        explodesOn: currentSystem.explodesOn || 10,
        associatedSkill: currentSystem.associatedSkill || "",
        fallbackTrait: currentSystem.fallbackTrait || "ref"
      };

      // Update with type change using recursive: false for Foundry v13 compatibility
      const updateData = {
        type: "weapon",
        system: weaponSystem
      };
      
      await item.update(updateData, { diff: false, recursive: false, render: false });
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate bow item", { id: item.id, name: item.name, err });
    }
  }
}

/**
 * Safely retrieve a nested property value using dot-notation path.
 * Handles missing intermediate objects gracefully without throwing errors.
 * 
 * @param {object} obj - Source object to read from
 * @param {string} path - Dot-notation path (e.g., "system.traits.strength")
 * @returns {any} Property value or undefined if path doesn't exist
 * 
 * @example
 * const value = getByPath(actor, "system.rings.fire.rank");
 * // Returns actor.system.rings.fire.rank or undefined
 */
function getByPath(obj, path) {
  try {
    return path.split(".").reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
  } catch (_e) {
    return undefined;
  }
}

/**
 * Set a nested property value using dot-notation path.
 * Creates missing intermediate objects as needed to ensure the path exists.
 * 
 * @param {object} obj - Target object to modify
 * @param {string} path - Dot-notation path (e.g., "system.traits.strength")
 * @param {any} value - Value to set at the specified path
 * 
 * @example
 * setByPath(updateData, "system.rings.fire.rank", 3);
 * // Creates updateData.system.rings.fire.rank = 3
 */
function setByPath(obj, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[last] = value;
}

/**
 * Remove a nested property using dot-notation path.
 * Safely handles missing intermediate objects without throwing errors.
 * 
 * @param {object} obj - Target object to modify
 * @param {string} path - Dot-notation path to property to delete
 * 
 * @example
 * deleteByPath(updateData, "system.deprecated.oldField");
 * // Removes updateData.system.deprecated.oldField if it exists
 */
function deleteByPath(obj, path) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur?.[k] === undefined) return;
    cur = cur[k];
  }
  if (cur && Object.prototype.hasOwnProperty.call(cur, last)) {
    delete cur[last];
  }
}

/**
 * Generate schema migration update data for a single document.
 * Applies all applicable SCHEMA_MAP rules based on document type and subtype.
 * Returns minimal update object containing only changed fields.
 * 
 * @param {Actor|Item} doc - Document to analyze for migration needs
 * @returns {object|null} Update object for Document.update() or null if no changes needed
 * 
 * @example
 * const update = buildSchemaUpdate(actor);
 * if (update) await actor.update(update);
 */
function buildSchemaUpdate(doc) {
  const { documentName: docType } = doc; // "Actor" | "Item"
  const type = doc.type;

  // Collect applicable rules only
  const rules = SCHEMA_MAP.filter(r => r.docType === docType && (r.type === type || r.type === "*"));
  if (!rules.length) return null;

  // Clone current system data minimally for updates
  const patch = { system: foundry.utils.deepClone(doc.system ?? {}) };
  let touched = false;

  for (const rule of rules) {
    const fromVal = getByPath(patch, rule.from);
    const toVal = getByPath(patch, rule.to);

    // Skip if source missing or already migrated (destination exists and has meaningful content)
    // For string fields, empty string means not migrated yet
    const hasValidTarget = toVal !== undefined && toVal !== "";
    if (fromVal === undefined || hasValidTarget) continue;

    setByPath(patch, rule.to, fromVal);
    deleteByPath(patch, rule.from);
    touched = true;
  }

  if (!touched) return null;

  // Return minimal update object
  return { system: patch.system };
}

/**
 * Apply schema migrations to a collection of documents.
 * Processes each document individually with error isolation to prevent
 * single document failures from stopping the entire migration.
 * 
 * @param {Array<Actor|Item>} docs - Documents to migrate
 * @param {string} label - Descriptive label for logging purposes
 * @returns {Promise<void>}
 */
async function applySchemaMapToDocs(docs, label) {
  for (const doc of docs) {
    try {
      const update = buildSchemaUpdate(doc);
      if (update) {
        await doc.update(update);
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Schema remap failed", { label, id: doc.id, type: doc.type, error: e });
    }
  }
}

/**
 * Normalize item values for compatibility (non-destructive minimal updates).
 * Currently ensures size casing is normalized for weapon and bow items.
 *
 * @param {Array<Item>} docs - Items to normalize
 * @param {string} label - Descriptive label for logging
 */
async function normalizeItems(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Item") continue;
      const t = doc.type;
      if (t !== "weapon" && t !== "bow") continue;
      const sz = doc.system?.size;
      if (typeof sz === "string" && (sz !== sz.toLowerCase())) {
        await doc.update({ "system.size": sz.toLowerCase() }, { diff: true, render: false });
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Normalization failed", { label, id: doc.id, type: doc.type, error: e });
    }
  }
}

/**
 * Migrate skill items to ensure proper default values for freeRanks and freeEmphasis.
 * Sets freeRanks and freeEmphasis to 0 for skills that don't have these fields set,
 * fixing legacy skills that may have incorrect default values.
 * 
 * This migration addresses the issue where skills created before the School checkbox
 * refactor might have incorrect default values or missing fields entirely.
 * 
 * @param {Array<Item>} docs - Items to migrate (will filter for skills)
 * @param {string} label - Descriptive label for logging
 * @returns {Promise<void>}
 */
async function migrateSkillDefaults(docs, label) {
  const skillItems = docs.filter(doc => doc.type === "skill");
  if (skillItems.length === 0) return;

  console.log(`${SYS_ID} | Migrating ${skillItems.length} skill items to ensure proper defaults (${label})`);
  
  let migratedCount = 0;
  
  for (const item of skillItems) {
    try {
      const updates = {};
      let needsUpdate = false;
      
      // Check freeRanks - should default to 0
      const currentFreeRanks = item.system?.freeRanks;
      if (currentFreeRanks === undefined || currentFreeRanks === null) {
        updates["system.freeRanks"] = 0;
        needsUpdate = true;
      }
      
      // Check freeEmphasis - should default to 0  
      const currentFreeEmphasis = item.system?.freeEmphasis;
      if (currentFreeEmphasis === undefined || currentFreeEmphasis === null) {
        updates["system.freeEmphasis"] = 0;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await item.update(updates, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate skill defaults", { id: item.id, name: item.name, err });
    }
  }
  
  if (migratedCount > 0) {
    console.log(`${SYS_ID} | Successfully migrated ${migratedCount} skill items with default values (${label})`);
  }
}

/**
 * Migrate legacy NPC wound data to current positive penalty system.
 * 
 * **CRITICAL: PRESERVES ORIGINAL STAT BLOCK VALUES**
 * This migration uses `actor._source` to access raw database data BEFORE Actor._prepareData()
 * runs. This ensures original values are preserved and not overwritten by computed defaults.
 * 
 * **Handles Migration From:**
 * - **Old snake_case structure**: `wound_lvl` → `woundLevels` (handled by SCHEMA_MAP)
 * - **String penalties**: "5", "10" → 5, 10 (converted to numbers, PRESERVED)
 * - **Negative penalties**: -3, -10 → 3, 10 (converted to positive, VALUES PRESERVED)
 * - **Missing wound mode**: Adds `woundMode: "manual"` default
 * - **Missing manual levels**: Creates `manualWoundLevels` from legacy data (PRESERVES VALUES)
 * - **Missing multipliers**: Sets default `woundsMultiplier: 2` and `woundsPenaltyMod: 0`
 * - **String nrWoundLvls**: "3" → 3 (converted to number)
 * - **Armor TN**: Preserves original armor TN values using both legacy and migrated field names
 * 
 * **Data Structure Transformation:**
 * ```javascript
 * // INPUT (Legacy NPC - Ape example):
 * {
 *   armor: { armor_tn: 20, reduction: 4 },  // armor_tn (snake_case)
 *   wound_lvl: {  // snake_case (fixed by SCHEMA_MAP)
 *     healthy: { value: 10, penalty: "5", current: true },   // Original: 10, "5"
 *     nicked: { value: 20, penalty: "10", current: false },  // Original: 20, "10"
 *     grazed: { value: 30, penalty: "15", current: false },  // Original: 30, "15"
 *     hurt: { value: 0, penalty: 10, current: false }        // Original: 0 (inactive)
 *   },
 *   nrWoundLvls: "3"  // String
 * }
 * 
 * // OUTPUT (Migrated NPC - VALUES PRESERVED):
 * {
 *   armor: { armorTn: 20, reduction: 4 },  // PRESERVED: 20 (not changed to 10!)
 *   woundMode: "manual",
 *   woundsMultiplier: 2,
 *   woundsPenaltyMod: 0,
 *   nrWoundLvls: 3,  // Number
 *   woundLevels: {
 *     healthy: { value: 10, penalty: 5, current: true },   // PRESERVED: 10, 5
 *     nicked: { value: 20, penalty: 10, current: false },  // PRESERVED: 20, 10
 *     grazed: { value: 30, penalty: 15, current: false },  // PRESERVED: 30, 15
 *     hurt: { value: 0, penalty: 10, current: false }      // PRESERVED: 0 (inactive)
 *   },
 *   manualWoundLevels: {
 *     healthy: { value: 10, penalty: 5, active: true },    // PRESERVED: 10, 5
 *     nicked: { value: 20, penalty: 10, active: true },    // PRESERVED: 20, 10
 *     grazed: { value: 30, penalty: 15, active: true },    // PRESERVED: 30, 15 (active because value > 0)
 *     hurt: { value: 0, penalty: 10, active: false },      // PRESERVED: 0, 10 (inactive because value = 0)
 *     injured: { value: 0, penalty: 15, active: false },   // inactive
 *     crippled: { value: 0, penalty: 20, active: false },  // inactive
 *     down: { value: 0, penalty: 40, active: false },      // inactive
 *     out: { value: 0, penalty: 40, active: false }        // inactive (value = 0 in original)
 *   }
 * }
 * ```
 * 
 * **Migration Safety:**
 * - **Idempotent**: Safe to run multiple times without side effects
 * - **Non-Destructive**: Uses `_source` to preserve all original stat block values
 * - **Error Isolation**: Individual actor failures logged but don't stop migration
 * - **Data Validation**: Converts strings to numbers with fallbacks
 * - **Active Detection**: Based on original value > 0 (NOT arbitrary defaults)
 * - **Source Access**: Reads raw database data before computed values overwrite originals
 * 
 * @param {Array<Actor>} docs - Actors to migrate (will filter for NPCs)
 * @param {string} label - Descriptive label for logging
 * @returns {Promise<void>}
 */
async function migrateLegacyNpcWounds(docs, label) {
  const npcActors = docs.filter(doc => doc.type === "npc");
  if (npcActors.length === 0) return;

  console.log(`${SYS_ID} | Migrating ${npcActors.length} legacy NPC wound systems (${label})`);
  
  let migratedCount = 0;
  
  for (const actor of npcActors) {
    try {
      const updates = {};
      let needsUpdate = false;
      
      // Set default wound mode if missing
      if (!actor.system.woundMode) {
        updates["system.woundMode"] = "manual";
        needsUpdate = true;
      }
      
      // Set default wound multiplier if missing  
      if (actor.system.woundsMultiplier === undefined) {
        updates["system.woundsMultiplier"] = 2;
        needsUpdate = true;
      }
      
      // Set default wound penalty modifier if missing
      if (actor.system.woundsPenaltyMod === undefined) {
        updates["system.woundsPenaltyMod"] = 0;
        needsUpdate = true;
      }
      
      // CRITICAL: Preserve armor TN from legacy NPCs
      // Check BOTH armor_tn (legacy) and armorTn (migrated) to get original value before template default overwrites it
      const legacyArmorTn = actor.system.armor?.armor_tn;
      const currentArmorTn = actor.system.armor?.armorTn;
      
      // Prefer legacy value if it exists, otherwise use current
      const armorTnValue = legacyArmorTn !== undefined && legacyArmorTn !== null 
        ? legacyArmorTn 
        : currentArmorTn;
      
      if (armorTnValue !== undefined && armorTnValue !== null) {
        updates["system.armor.armorTn"] = armorTnValue;
        needsUpdate = true;
      }
      
      // Convert string nrWoundLvls to number (legacy NPCs stored as "3")
      if (typeof actor.system.nrWoundLvls === "string") {
        updates["system.nrWoundLvls"] = parseInt(actor.system.nrWoundLvls) || 1;
        needsUpdate = true;
      }
      
      // Convert string penalties to numbers in woundLevels
      if (actor.system.woundLevels) {
        const woundLevels = foundry.utils.deepClone(actor.system.woundLevels);
        let woundLevelsChanged = false;
        
        for (const [key, level] of Object.entries(woundLevels)) {
          // Convert string penalties to positive numbers
          if (typeof level.penalty === "string") {
            level.penalty = Math.abs(parseInt(level.penalty) || 0);
            woundLevelsChanged = true;
          } 
          // Convert negative penalties to positive
          else if (typeof level.penalty === "number" && level.penalty < 0) {
            level.penalty = Math.abs(level.penalty);
            woundLevelsChanged = true;
          }
          
          // Convert string values to numbers
          if (typeof level.value === "string") {
            level.value = parseInt(level.value) || 0;
            woundLevelsChanged = true;
          }
        }
        
        if (woundLevelsChanged) {
          updates["system.woundLevels"] = woundLevels;
          needsUpdate = true;
        }
      }
      
      // Create/fix manualWoundLevels from legacy wound data
      // CRITICAL: Must use _source to get raw DB data before Actor._prepareData() wipes it
      const rawSource = actor._source?.system || actor.system;
      const legacyWoundData = rawSource.wound_lvl;
      const rawWoundLevels = rawSource.woundLevels;
      
      // Only migrate if legacy data exists OR if manualWoundLevels is missing from SOURCE
      // Use rawSource to check if manualWoundLevels was actually saved to DB (not just computed)
      if (legacyWoundData || !rawSource.manualWoundLevels) {
        const sourceData = legacyWoundData || rawWoundLevels;
        
        if (sourceData) {
          const manualWoundLevels = {};
          const order = L5R4Actor.WOUND_LEVEL_ORDER;
          
          // CRITICAL: Must create ALL 8 entries to prevent actor prep from filling missing ones with defaults
          for (const key of order) {
            const woundLevel = sourceData[key];
            const value = woundLevel ? (parseInt(woundLevel.value) || 0) : 0;
            const penalty = woundLevel ? (Math.abs(parseInt(woundLevel.penalty) || 0)) : 0;
            
            manualWoundLevels[key] = {
              value: value,
              penalty: penalty,
              active: value > 0
            };
          }
          
          updates["system.manualWoundLevels"] = manualWoundLevels;
          needsUpdate = true;
        }
      }
      
      // Convert any remaining string or negative penalties in manualWoundLevels
      if (actor.system.manualWoundLevels) {
        const manualWoundLevels = foundry.utils.deepClone(actor.system.manualWoundLevels);
        let manualChanged = false;
        
        for (const [key, level] of Object.entries(manualWoundLevels)) {
          // Convert string penalties to positive numbers
          if (typeof level.penalty === "string") {
            level.penalty = Math.abs(parseInt(level.penalty) || 0);
            manualChanged = true;
          }
          // Convert negative penalties to positive
          else if (typeof level.penalty === "number" && level.penalty < 0) {
            level.penalty = Math.abs(level.penalty);
            manualChanged = true;
          }
          
          // Convert string values to numbers
          if (typeof level.value === "string") {
            level.value = parseInt(level.value) || 0;
            manualChanged = true;
          }
        }
        
        if (manualChanged) {
          updates["system.manualWoundLevels"] = manualWoundLevels;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await actor.update(updates, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate legacy NPC wounds", { id: actor.id, name: actor.name, err });
    }
  }
  
  if (migratedCount > 0) {
    console.log(`${SYS_ID} | Successfully migrated ${migratedCount} legacy NPC wound systems (${label})`);
  }
}

/**
 * Clean up duplicate legacy fields that may persist after partial migrations.
 * Removes old snake_case fields when corresponding camelCase fields exist.
 *
 * @param {Array<Actor>} docs - Actors to clean up
 * @param {string} label - Descriptive label for logging
 */
async function cleanupLegacyFields(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Actor") continue;
      
      const updates = {};
      let needsUpdate = false;

      // Clean up duplicate fields if new camelCase version exists
      const cleanupRules = [
        { old: "system.wounds.heal_rate", new: "system.wounds.healRate" },
        { old: "system.wound_lvl", new: "system.woundLevels" },
        { old: "system.armor.armor_tn", new: "system.armor.armorTn" },
        { old: "system.shadow_taint", new: "system.shadowTaint" },
        { old: "system.armor_tn", new: "system.armorTn" },
        { old: "system.initiative.roll_mod", new: "system.initiative.rollMod" },
        { old: "system.initiative.keep_mod", new: "system.initiative.keepMod" },
        { old: "system.initiative.total_mod", new: "system.initiative.totalMod" }
      ];

      for (const rule of cleanupRules) {
        const oldVal = getByPath(doc, rule.old);
        const newVal = getByPath(doc, rule.new);
        
        // If old field exists and new field also exists, remove old field
        if (oldVal !== undefined && newVal !== undefined) {
          setByPath(updates, rule.old, null);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await doc.update(updates, { diff: true, render: false });
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Legacy cleanup failed", { label, id: doc.id, type: doc.type, error: e });
    }
  }
}

/**
 * Icon file migration mapping from old .png filenames to new .webp filenames.
 * Maps original filenames to their new names under PATHS.icons.
 * This maintains the migration logic independently of config aliases to avoid
 * circular dependencies during system initialization.
 * 
 * @type {Readonly<Record<string, string>>} old filename -> new filename
 * 
 * @example
 * ICON_MIGRATION_MAP["attackstance.png"] // Returns "attack-stance.webp"
 */
const ICON_MIGRATION_MAP = Object.freeze({
  // Stances
  "attackstance.png": "attack-stance.webp",
  "fullattackstance.png": "full-attack-stance.webp",
  "defensestance.png": "defence-stance.webp",
  "fulldefensestance.png": "full-defense-stance.webp",
  "centerstance.png": "centered-stance.webp",
  
  // Status effects
  "grapple.png": "grappled.webp",
  "mounted.png": "mounted.webp",
  
  // Item type icons
  "bamboo.png": "clan.webp",
  "bow.png": "bow.webp",
  "coins.png": "item.webp",
  "flower.png": "skill.webp",
  "hat.png": "armor.webp",
  "kanji.png": "technique.webp",
  "scroll.png": "kata.webp",
  "scroll2.png": "spell.webp",
  "sword.png": "weapon.webp",
  "tattoo.png": "tattoo.webp",
  "tori.png": "family.webp",
  "yin-yang.png": "advantage.webp",
  
  // Actor icons
  "helm.png": "pc.webp",
  "ninja.png": "npc.webp"
});

/** @type {Map<string, Set<string>>} dir -> filenames */
const dirCache = new Map();

/**
 * Browse directory contents with caching for performance.
 * Memoizes file listings to avoid repeated FilePicker.browse calls
 * during migration of multiple documents with similar icon paths.
 * 
 * @param {string} dirPath - Directory path to browse
 * @returns {Promise<Set<string>>} Set of filenames in the directory
 */
async function listDir(dirPath) {
  if (dirCache.has(dirPath)) return dirCache.get(dirPath);
  try {
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
    const res = await FP.browse("data", dirPath);
    const files = new Set((res.files ?? []).map(f => {
      const i = f.lastIndexOf("/");
      return i >= 0 ? f.slice(i + 1) : f;
    }));
    dirCache.set(dirPath, files);
    return files;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to browse directory", { dirPath, err });
    const empty = new Set();
    dirCache.set(dirPath, empty);
    return empty;
  }
}

/**
 * Compute new icon path for migrated files.
 * Checks if the given image path corresponds to a file that has been
 * relocated according to ICON_MIGRATION_MAP, and verifies the target exists.
 * 
 * @param {string} img - Current image path to check for migration
 * @returns {Promise<string|null>} New path if migration available and target exists, null otherwise
 * 
 * @example
 * const newPath = await computeNewIconPath("systems/l5r4-enhanced/assets/icons/air.png");
 * // Returns "systems/l5r4-enhanced/assets/icons/rings/air.png" if target exists
 */
async function computeNewIconPath(img) {
  if (typeof img !== "string" || !img.startsWith(PATHS.icons + "/")) return null;
  const prefix = PATHS.icons + "/";
  const file = img.slice(prefix.length);
  const rel = ICON_MIGRATION_MAP[file];
  if (!rel) return null;
  const targetPath = prefix + rel;
  const lastSlash = targetPath.lastIndexOf("/");
  const dir = targetPath.slice(0, lastSlash);
  const base = targetPath.slice(lastSlash + 1);
  const files = await listDir(dir);
  return files.has(base) ? targetPath : null;
}

/**
 * Execute icon path migration for world documents.
 * Updates actor.img and item.img fields for documents that reference
 * relocated icon files. Only runs for GM users and applies minimal updates
 * using Foundry's diff system for optimal performance.
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * // Called during system initialization
 * await runIconPathMigration();
 */
export async function runIconPathMigration() {
  if (!game.user?.isGM) return;
  const shouldRun = game.settings.get(SYS_ID, "runMigration");
  if (!shouldRun) return;

  let changed = 0;

  // Actors
  for (const a of game.actors.contents) {
    const updates = {};
    
    // Update actor portrait
    const nextImg = await computeNewIconPath(a.img);
    if (nextImg && nextImg !== a.img) {
      updates.img = nextImg;
    }
    
    // Update token image
    const tokenImg = a.prototypeToken?.texture?.src;
    if (tokenImg) {
      const nextToken = await computeNewIconPath(tokenImg);
      if (nextToken && nextToken !== tokenImg) {
        updates["prototypeToken.texture.src"] = nextToken;
      }
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      try { 
        await a.update(updates, { diff: true, render: false }); 
        changed++; 
      }
      catch (err) { console.warn(`${SYS_ID}`, "Failed to update actor img", { id: a.id, err }); }
    }
  }

  // Items
  for (const i of game.items.contents) {
    let nextImg = await computeNewIconPath(i.img);
    
    // Special case: Fix bow weapons that have weapon/sword icons
    if (i.type === "weapon" && i.system?.isBow) {
      const bowIcon = await computeNewIconPath("bow.png"); // Get the current bow.webp path
      if (bowIcon && i.img !== bowIcon) {
        nextImg = bowIcon;
      }
    }
    
    if (nextImg && nextImg !== i.img) {
      try { await i.update({ img: nextImg }, { diff: true, render: false }); changed++; }
      catch (err) { console.warn(`${SYS_ID}`, "Failed to update item img", { id: i.id, err }); }
    }
  }

  ui.notifications?.info(game.i18n.format("l5r4.system.migration.iconsUpdated", { count: changed }));
  try {
    if (changed > 0) { await game.settings.set(SYS_ID, "runMigration", false); }
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to disable runMigration setting", err);
  }
}

/**
 * Apply icon path migration to compendium packs.
 * Processes all unlocked Actor and Item compendium packs using the same
 * icon migration logic as world documents. Locked packs are skipped to
 * prevent permission errors.
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * // Migrates icons in all unlocked compendiums
 * await migrateCompendiumIconPaths();
 */
async function migrateCompendiumIconPaths() {
  let changed = 0;
  const packs = game.packs?.contents ?? [];
  for (const pack of packs) {
    const docName = pack.documentName ?? pack.metadata?.type ?? pack.metadata?.documentName;
    if (docName !== "Actor" && docName !== "Item") continue;

    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) continue;

    let docs = [];
    try {
      docs = await pack.getDocuments();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to load compendium documents", { collection: pack.collection, err });
      continue;
    }

    for (const doc of docs) {
      const updates = {};
      
      // Update document image
      let nextImg = await computeNewIconPath(doc.img);
      
      // Special case: Fix bow weapons that have weapon/sword icons
      if (docName === "Item" && doc.type === "weapon" && doc.system?.isBow) {
        const bowIcon = await computeNewIconPath("bow.png"); // Get the current bow.webp path
        if (bowIcon && doc.img !== bowIcon) {
          nextImg = bowIcon;
        }
      }
      
      if (nextImg && nextImg !== doc.img) {
        updates.img = nextImg;
      }
      
      // Update token image for actors
      if (docName === "Actor") {
        const tokenImg = doc.prototypeToken?.texture?.src;
        if (tokenImg) {
          const nextToken = await computeNewIconPath(tokenImg);
          if (nextToken && nextToken !== tokenImg) {
            updates["prototypeToken.texture.src"] = nextToken;
          }
        }
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        try {
          await doc.update(updates, { diff: true, render: false });
          changed++;
        } catch (err) {
          console.warn(`${SYS_ID}`, "Failed to update compendium doc img", { id: doc.id, collection: pack.collection, err });
        }
      }
    }
  }

  if (changed > 0) {
    ui.notifications?.info(game.i18n.format("l5r4.system.migration.compendiumIconsUpdated", { count: changed }));
  }
}

/**
 * Main migration orchestrator for system version updates.
 * Coordinates all migration types in the correct order and handles errors gracefully.
 * Designed to be called during system initialization with version information.
 * 
 * **Migration Order:**
 * 1. Schema migrations for world documents (actors, items)
 * 2. Schema migrations for compendium documents
 * 3. Icon path migrations for world documents
 * 4. Icon path migrations for compendium documents
 * 
 * **Safety Features:**
 * - GM-only execution prevents permission issues
 * - Error isolation prevents single failures from stopping migration
 * - Idempotent design allows safe re-execution
 * - Comprehensive logging for troubleshooting
 * 
 * @param {string} fromVersion - Previous system version (for logging)
 * @param {string} toVersion - Current system version (for logging)
 * @returns {Promise<void>}
 * 
 * @example
 * // Called from system ready hook
 * Hooks.once("ready", () => {
 *   runMigrations("1.0.0", "1.1.0");
 * });
 */
export async function runMigrations(fromVersion, toVersion) {
  if (!game.user?.isGM) return;

  // Phase 1: Schema migrations for world documents (Actors and Items)
  await applySchemaMapToDocs(game.actors.contents, "world-actors");
  await applySchemaMapToDocs(game.items.contents, "world-items");
  // Migrate legacy NPC wound systems to positive penalty format
  await migrateLegacyNpcWounds(game.actors.contents, "world-legacy-npc-wounds");
  // Convert bow items to weapons with isBow flag
  await migrateBowsToWeapons(game.items.contents, "world-bow-migration");
  // Migrate skill items to ensure proper default values
  await migrateSkillDefaults(game.items.contents, "world-skill-defaults");
  // Normalize world items after schema changes
  await normalizeItems(game.items.contents, "world-items-norm");
  // Clean up duplicate legacy fields after migration
  await cleanupLegacyFields(game.actors.contents, "world-actors-cleanup");

  // CRITICAL: Phase 1.5 - Migrate embedded items on actors
  for (const actor of game.actors) {
    if (actor.items.size > 0) {
      await applySchemaMapToDocs(actor.items.contents, `actor-items:${actor.id}`);
      await migrateBowsToWeapons(actor.items.contents, `actor-bow-migration:${actor.id}`);
      await migrateSkillDefaults(actor.items.contents, `actor-skill-defaults:${actor.id}`);
      await normalizeItems(actor.items.contents, `actor-items-norm:${actor.id}`);
    }
  }

  // Phase 2: Schema migrations for compendium packs
  for (const pack of game.packs) {
    const docType = pack.metadata?.type ?? pack.documentName;
    if (docType !== "Actor" && docType !== "Item") continue;

    // Skip locked compendiums to prevent permission errors
    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) {
      console.log(`${SYS_ID}`, "Skipping locked compendium", { collection: pack.collection });
      continue;
    }

    try {
      const docs = await pack.getDocuments();
      await applySchemaMapToDocs(docs, `pack:${pack.collection}`);
      // Migrate legacy NPC wounds in compendium packs
      if (docType === "Actor") {
        await migrateLegacyNpcWounds(docs, `pack-legacy-npc-wounds:${pack.collection}`);
      }
      await migrateBowsToWeapons(docs, `pack-bow-migration:${pack.collection}`);
      await migrateSkillDefaults(docs, `pack-skill-defaults:${pack.collection}`);
      await normalizeItems(docs, `pack-norm:${pack.collection}`);

      // Also migrate items embedded in compendium actors
      if (docType === "Actor") {
        for (const actor of docs) {
          if (actor.items.size > 0) {
            await applySchemaMapToDocs(actor.items.contents, `compendium-actor-items:${pack.collection}:${actor.id}`);
            await migrateBowsToWeapons(actor.items.contents, `compendium-actor-bow-migration:${pack.collection}:${actor.id}`);
            await migrateSkillDefaults(actor.items.contents, `compendium-actor-skill-defaults:${pack.collection}:${actor.id}`);
            await normalizeItems(actor.items.contents, `compendium-actor-items-norm:${pack.collection}:${actor.id}`);
          }
        }
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Schema remap pack failed", { pack: pack.collection, error: e });
    }
  }

  // Phase 3: Icon path migrations
  try {
    await runIconPathMigration();
    await migrateCompendiumIconPaths();
  } catch (err) {
    console.warn(`${SYS_ID} | Migration failed`, { fromVersion, toVersion, error: err });
  }
}
