/**
 * @fileoverview Schema State Detection Service
 *
 * Detects whether export data is from Original (snake_case) or New v13 (camelCase) schema.
 * This is critical because both versions can export with the same metadata, but require
 * different transformation logic during import.
 *
 * **Detection Strategy:**
 * - Sample first 10 actors and items for analysis
 * - Count occurrences of snake_case fields (heal_rate, wound_lvl, mastery_3, equiped)
 * - Count occurrences of camelCase fields (healRate, woundLevels, mastery3, equipped)
 * - Count occurrences of new fields (bonuses, woundMode, freeRanks, isBow)
 * - Determine state based on patterns
 * - Calculate confidence score
 */

import { Logger } from '../utils/logger.js';

/**
 * Detects schema state from export data
 */
export class SchemaStateDetectionService {
  /**
   * Detect schema state from export data
   * @param {Object} exportData - Data to analyze
   * @returns {Object} Detection result with state, confidence, and indicators
   */
  static detectState(exportData) {
    Logger.info('Detecting schema state from export data...');

    const indicators = this._analyzePatterns(exportData);
    const state = this._determineState(indicators);
    const confidence = this._calculateConfidence(indicators);

    const result = {
      state: state, // 'original', 'new-v13', 'mixed', or 'unknown'
      confidence: confidence, // 0-1
      needsTransform: state === 'original',
      indicators: indicators
    };

    Logger.info(
      `Schema detection complete: state=${result.state}, confidence=${Math.round(result.confidence * 100)}%, needsTransform=${result.needsTransform}`
    );

    return result;
  }

  /**
   * Analyze data patterns to find indicators of schema state
   * @private
   * @param {Object} data - Export data to analyze
   * @returns {Object} Pattern indicators
   */
  static _analyzePatterns(data) {
    const sample = this._getSample(data);

    const indicators = {
      snakeCase: {
        heal_rate: 0,
        wound_lvl: 0,
        armor_tn: 0,
        shadow_taint: 0,
        roll_mod: 0,
        mastery_3: 0,
        equiped: 0
      },
      camelCase: {
        healRate: 0,
        woundLevels: 0,
        armorTn: 0,
        shadowTaint: 0,
        rollMod: 0,
        mastery3: 0,
        equipped: 0
      },
      newFields: {
        bonuses: 0,
        woundMode: 0,
        fear: 0,
        freeRanks: 0,
        isBow: 0
      }
    };

    // Check actors
    for (const actor of sample.actors) {
      if (actor.system?.wounds?.heal_rate !== undefined) indicators.snakeCase.heal_rate++;
      if (actor.system?.wounds?.healRate !== undefined) indicators.camelCase.healRate++;
      if (actor.system?.wound_lvl) indicators.snakeCase.wound_lvl++;
      if (actor.system?.woundLevels) indicators.camelCase.woundLevels++;
      if (actor.system?.armor?.armor_tn !== undefined) indicators.snakeCase.armor_tn++;
      if (actor.system?.armor?.armorTn !== undefined) indicators.camelCase.armorTn++;
      if (actor.system?.shadow_taint !== undefined) indicators.snakeCase.shadow_taint++;
      if (actor.system?.shadowTaint !== undefined) indicators.camelCase.shadowTaint++;
      if (actor.system?.initiative?.roll_mod !== undefined) indicators.snakeCase.roll_mod++;
      if (actor.system?.initiative?.rollMod !== undefined) indicators.camelCase.rollMod++;
      if (actor.system?.bonuses) indicators.newFields.bonuses++;
      if (actor.system?.woundMode) indicators.newFields.woundMode++;
      if (actor.system?.fear) indicators.newFields.fear++;
    }

    // Check items
    for (const item of sample.items) {
      if (item.system?.mastery_3 !== undefined) indicators.snakeCase.mastery_3++;
      if (item.system?.mastery3 !== undefined) indicators.camelCase.mastery3++;
      if (item.system?.equiped !== undefined) indicators.snakeCase.equiped++;
      if (item.system?.equipped !== undefined) indicators.camelCase.equipped++;
      if (item.system?.freeRanks !== undefined) indicators.newFields.freeRanks++;
      if (item.system?.isBow !== undefined) indicators.newFields.isBow++;
    }

    // Count totals
    indicators.snakeCaseTotal = Object.values(indicators.snakeCase).reduce((a, b) => a + b, 0);
    indicators.camelCaseTotal = Object.values(indicators.camelCase).reduce((a, b) => a + b, 0);
    indicators.newFieldsTotal = Object.values(indicators.newFields).reduce((a, b) => a + b, 0);

    Logger.debug(
      `Pattern analysis: snakeCase=${indicators.snakeCaseTotal}, camelCase=${indicators.camelCaseTotal}, newFields=${indicators.newFieldsTotal}`
    );

    return indicators;
  }

  /**
   * Get a sample of actors and items for analysis
   * Samples first 10 of each to avoid processing large datasets
   * @private
   * @param {Object} data - Export data
   * @returns {Object} Sampled data
   */
  static _getSample(data) {
    return {
      actors: (data.actors || []).slice(0, 10),
      items: (data.items || []).slice(0, 10)
    };
  }

  /**
   * Determine schema state based on pattern indicators
   * @private
   * @param {Object} indicators - Pattern indicators from _analyzePatterns
   * @returns {string} State: 'original', 'new-v13', 'mixed', or 'unknown'
   */
  static _determineState(indicators) {
    const { snakeCaseTotal, camelCaseTotal, newFieldsTotal } = indicators;

    // Clear Original (has snake_case, no camelCase)
    if (snakeCaseTotal > 0 && camelCaseTotal === 0) {
      return 'original';
    }

    // Clear New v13 (has camelCase + new fields, no snake_case)
    if (camelCaseTotal > 0 && newFieldsTotal > 0 && snakeCaseTotal === 0) {
      return 'new-v13';
    }

    // Mixed or unclear (partial migration)
    if (snakeCaseTotal > 0 && camelCaseTotal > 0) {
      return 'mixed';
    }

    // CamelCase but no new fields - could be new-v13 with minimal data
    if (camelCaseTotal > 0 && snakeCaseTotal === 0) {
      return 'new-v13';
    }

    // Empty or no clear indicators
    return 'unknown';
  }

  /**
   * Calculate confidence score based on pattern strength
   * @private
   * @param {Object} indicators - Pattern indicators from _analyzePatterns
   * @returns {number} Confidence score 0-1
   */
  static _calculateConfidence(indicators) {
    const { snakeCaseTotal, camelCaseTotal, newFieldsTotal } = indicators;

    // High confidence if clear pattern with multiple indicators
    if (snakeCaseTotal > 3 && camelCaseTotal === 0) return 0.95;
    if (camelCaseTotal > 3 && newFieldsTotal > 2 && snakeCaseTotal === 0) return 0.95;

    // Medium confidence with some indicators
    if (snakeCaseTotal > 0 && camelCaseTotal === 0) return 0.75;
    if (camelCaseTotal > 0 && snakeCaseTotal === 0) return 0.75;

    // Low confidence (mixed or sparse data)
    return 0.3;
  }
}
