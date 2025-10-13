/**
 * @fileoverview Validation Service
 *
 * Validates exported data before import to catch errors early.
 * Provides comprehensive validation including:
 * - Individual document validation (actors, items)
 * - Data integrity checks (duplicate IDs, missing references)
 * - Compatibility validation (system version, required fields)
 * - Statistical analysis for migration readiness
 *
 * **Validation Strategy:**
 * - Use Phase 1 validators for document-level validation
 * - Add dataset-level integrity checks
 * - Provide detailed error reporting for debugging
 * - Generate migration readiness report
 */

import { Logger } from '../utils/logger.js';
import { validateActorData, validateItemData } from '../utils/validators.js';
import { SchemaStateDetectionService } from './schema-state-detection-service.js';

/**
 * Service for validating migration data
 */
export class ValidationService {
  /**
   * Validate complete export/import data structure
   * Performs comprehensive validation including individual documents and integrity checks
   *
   * @param {Object} data - Export data to validate
   * @param {Object} options - Validation options
   * @param {boolean} options.strict - Enable strict validation (fail on warnings)
   * @param {boolean} options.checkIntegrity - Enable integrity checks (duplicates, references)
   * @returns {Promise<Object>} Comprehensive validation result
   */
  static async validateData(data, options = {}) {
    const { strict = false, checkIntegrity = true } = options;

    Logger.info('Starting comprehensive data validation...');

    const result = {
      valid: true,
      metadata: {
        totalActors: 0,
        totalItems: 0,
        validActors: 0,
        validItems: 0,
        invalidActors: 0,
        invalidItems: 0
      },
      errors: [],
      warnings: [],
      actorErrors: [],
      itemErrors: [],
      integrityIssues: [],
      schemaDetection: null
    };

    try {
      // NEW: Schema state detection
      const schemaDetection = SchemaStateDetectionService.detectState(data);
      result.schemaDetection = schemaDetection;

      // Warn on low confidence
      if (schemaDetection.confidence < 0.7) {
        result.warnings.push(
          `Low confidence (${Math.round(schemaDetection.confidence * 100)}%) in schema detection. ` +
            `Detected as: ${schemaDetection.state}`
        );
      }

      // Error on unknown
      if (schemaDetection.state === 'unknown') {
        result.errors.push('Unable to determine schema state. Export may be empty or corrupted.');
      }

      // Error on mixed (partial migration)
      if (schemaDetection.state === 'mixed') {
        result.errors.push('Mixed schema detected. World appears to be partially migrated.');
      }

      // Validate metadata
      if (!data.metadata) {
        result.errors.push('Missing metadata object');
        result.valid = false;
      } else {
        this._validateMetadata(data.metadata, result);
      }

      // Validate actors
      if (data.actors && Array.isArray(data.actors)) {
        Logger.info(`Validating ${data.actors.length} actors...`);
        result.metadata.totalActors = data.actors.length;

        for (const actor of data.actors) {
          const validation = this.validateActor(actor);
          if (validation.valid) {
            result.metadata.validActors++;
          } else {
            result.metadata.invalidActors++;
            result.actorErrors.push({
              id: actor._id,
              name: actor.name,
              type: actor.type,
              errors: validation.errors,
              warnings: validation.warnings
            });
          }
        }
      }

      // Validate items
      if (data.items && Array.isArray(data.items)) {
        Logger.info(`Validating ${data.items.length} items...`);
        result.metadata.totalItems = data.items.length;

        for (const item of data.items) {
          const validation = this.validateItem(item);
          if (validation.valid) {
            result.metadata.validItems++;
          } else {
            result.metadata.invalidItems++;
            result.itemErrors.push({
              id: item._id,
              name: item.name,
              type: item.type,
              errors: validation.errors,
              warnings: validation.warnings
            });
          }
        }
      }

      // Integrity checks
      if (checkIntegrity) {
        Logger.info('Running integrity checks...');
        this._checkIntegrity(data, result);
      }

      // Determine overall validity
      // Only block on critical errors (metadata, schema issues)
      // Actor/item validation errors are informational only - they'll be fixed during import
      if (result.errors.length > 0) {
        result.valid = false;
      }

      // In strict mode, actor/item errors and warnings also invalidate
      if (
        strict &&
        (result.actorErrors.length > 0 ||
          result.itemErrors.length > 0 ||
          result.warnings.length > 0 ||
          result.integrityIssues.length > 0)
      ) {
        result.valid = false;
      }

      // Log summary
      Logger.info(
        `Validation complete: ${result.metadata.validActors}/${result.metadata.totalActors} actors valid, ${result.metadata.validItems}/${result.metadata.totalItems} items valid`
      );

      if (!result.valid) {
        Logger.warn(`Validation found ${result.errors.length} errors, ${result.warnings.length} warnings`);
      }

      return result;
    } catch (error) {
      Logger.error('Validation failed with exception', error);
      throw error;
    }
  }

  /**
   * Validate metadata structure
   * @private
   */
  static _validateMetadata(metadata, result) {
    const requiredFields = ['sourceSystem', 'worldId', 'worldTitle'];

    for (const field of requiredFields) {
      if (!metadata[field]) {
        result.errors.push(`Missing required metadata field: ${field}`);
      }
    }

    // Check system compatibility
    if (metadata.sourceSystem && metadata.sourceSystem !== 'l5r4') {
      result.warnings.push(`Source system is '${metadata.sourceSystem}', expected 'l5r4'`);
    }

    // Check for export date
    if (!metadata.exportDate && !metadata.timestamp && !metadata.exportTimestamp) {
      result.warnings.push('Missing export timestamp');
    }
  }

  /**
   * Run integrity checks on the dataset
   * @private
   */
  static _checkIntegrity(data, result) {
    // Check for duplicate actor IDs
    if (data.actors && Array.isArray(data.actors)) {
      const actorIds = new Set();
      const duplicates = [];

      for (const actor of data.actors) {
        if (actorIds.has(actor._id)) {
          duplicates.push(actor._id);
        }
        actorIds.add(actor._id);
      }

      if (duplicates.length > 0) {
        result.integrityIssues.push({
          type: 'duplicate_actor_ids',
          message: `Found ${duplicates.length} duplicate actor IDs`,
          ids: duplicates
        });
      }
    }

    // Check for duplicate item IDs
    if (data.items && Array.isArray(data.items)) {
      const itemIds = new Set();
      const duplicates = [];

      for (const item of data.items) {
        if (itemIds.has(item._id)) {
          duplicates.push(item._id);
        }
        itemIds.add(item._id);
      }

      if (duplicates.length > 0) {
        result.integrityIssues.push({
          type: 'duplicate_item_ids',
          message: `Found ${duplicates.length} duplicate item IDs`,
          ids: duplicates
        });
      }
    }

    // Check for legacy bow items
    if (data.items && Array.isArray(data.items)) {
      const bowItems = data.items.filter((i) => i.type === 'bow');
      if (bowItems.length > 0) {
        result.integrityIssues.push({
          type: 'legacy_bow_items',
          message: `Found ${bowItems.length} legacy bow items that need conversion`,
          count: bowItems.length,
          items: bowItems.map((b) => ({ id: b._id, name: b.name }))
        });
      }
    }

    // Check for actors with invalid embedded items
    if (data.actors && Array.isArray(data.actors)) {
      for (const actor of data.actors) {
        if (actor.items && Array.isArray(actor.items)) {
          for (const embeddedItem of actor.items) {
            const validation = validateItemData(embeddedItem);
            if (!validation.valid) {
              result.integrityIssues.push({
                type: 'invalid_embedded_item',
                message: `Actor '${actor.name}' has invalid embedded item '${embeddedItem.name}'`,
                actorId: actor._id,
                actorName: actor.name,
                itemId: embeddedItem._id,
                itemName: embeddedItem.name,
                errors: validation.errors
              });
            }
          }
        }
      }
    }
  }

  /**
   * Validate a single actor
   * Uses Phase 1 validator
   *
   * @param {Object} actorData - Actor data to validate
   * @returns {Object} Validation result with errors and warnings
   */
  static validateActor(actorData) {
    return validateActorData(actorData);
  }

  /**
   * Validate a single item
   * Uses Phase 1 validator
   *
   * @param {Object} itemData - Item data to validate
   * @returns {Object} Validation result with errors and warnings
   */
  static validateItem(itemData) {
    return validateItemData(itemData);
  }

  /**
   * Generate a migration readiness report
   * Provides high-level summary of validation results
   *
   * @param {Object} validationResult - Result from validateData()
   * @returns {Object} Migration readiness report
   */
  static generateReadinessReport(validationResult) {
    const report = {
      ready: validationResult.valid,
      summary: {
        totalDocuments: validationResult.metadata.totalActors + validationResult.metadata.totalItems,
        validDocuments: validationResult.metadata.validActors + validationResult.metadata.validItems,
        invalidDocuments: validationResult.metadata.invalidActors + validationResult.metadata.invalidItems,
        totalErrors:
          validationResult.errors.length + validationResult.actorErrors.length + validationResult.itemErrors.length,
        totalWarnings: validationResult.warnings.length,
        integrityIssues: validationResult.integrityIssues.length
      },
      recommendations: []
    };

    // Generate recommendations
    // Check for critical errors (blocking)
    if (validationResult.errors.length > 0) {
      report.recommendations.push({
        priority: 'high',
        message: `${validationResult.errors.length} critical errors must be fixed`,
        action: 'Review metadata and schema errors before proceeding'
      });
    }

    // Check for integrity issues
    if (validationResult.integrityIssues.length > 0) {
      const bowItems = validationResult.integrityIssues.find((i) => i.type === 'legacy_bow_items');
      if (bowItems) {
        report.recommendations.push({
          priority: 'info',
          message: `${bowItems.count} bow items will be converted to weapons with isBow flag`,
          action: 'This will be handled automatically during import'
        });
      }

      const duplicates = validationResult.integrityIssues.filter((i) => i.type.includes('duplicate'));
      if (duplicates.length > 0) {
        report.recommendations.push({
          priority: 'high',
          message: 'Duplicate document IDs detected',
          action: 'Remove or regenerate duplicate IDs before import'
        });
      }
    }

    // Actor/item validation errors - only informational if ready
    if (report.summary.invalidDocuments > 0) {
      if (report.ready) {
        // Non-blocking: informational only
        report.recommendations.push({
          priority: 'info',
          message: `${report.summary.invalidDocuments} documents have legacy field issues`,
          action: 'Will be fixed automatically during import (no action needed)'
        });
      } else {
        // Blocking: needs user action
        report.recommendations.push({
          priority: 'high',
          message: `Fix ${report.summary.invalidDocuments} invalid documents before migration`,
          action: 'Review actor and item validation errors'
        });
      }
    }

    if (report.summary.totalWarnings > 0) {
      report.recommendations.push({
        priority: 'low',
        message: `${report.summary.totalWarnings} warnings detected`,
        action: 'Review warnings for potential issues'
      });
    }

    if (report.ready) {
      report.recommendations.push({
        priority: 'success',
        message: 'Data is ready for migration',
        action: 'Proceed with import operation'
      });
    }

    return report;
  }

  /**
   * Validate compatibility between source and target systems
   *
   * @param {Object} sourceMetadata - Source system metadata
   * @param {Object} targetMetadata - Target system metadata (from game)
   * @returns {Object} Compatibility result
   */
  static validateCompatibility(sourceMetadata, targetMetadata = null) {
    const result = {
      compatible: true,
      warnings: [],
      errors: []
    };

    // Use current game metadata if not provided
    const target = targetMetadata || {
      system: game?.system?.id,
      systemVersion: game?.system?.version,
      foundryVersion: game?.version
    };

    // Check source system
    if (sourceMetadata.sourceSystem !== 'l5r4' && sourceMetadata.sourceSystem !== 'l5r4-enhanced') {
      result.errors.push(`Incompatible source system: ${sourceMetadata.sourceSystem}`);
      result.compatible = false;
    }

    // Check Foundry version compatibility (major version)
    if (sourceMetadata.foundryVersion && target.foundryVersion) {
      const sourceMajor = parseInt(sourceMetadata.foundryVersion.split('.')[0]);
      const targetMajor = parseInt(target.foundryVersion.split('.')[0]);

      if (Math.abs(sourceMajor - targetMajor) > 1) {
        result.warnings.push(
          `Foundry version mismatch: source ${sourceMetadata.foundryVersion}, target ${target.foundryVersion}`
        );
      }
    }

    return result;
  }
}
