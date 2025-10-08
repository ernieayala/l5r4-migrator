/**
 * @fileoverview Data Validators for L5R4 Migration
 * 
 * Validates Actor and Item data structures to ensure they match expected schemas.
 * Based on actual l5r4-old template.json schema.
 * 
 * **Design Principles:**
 * - Validate against SOURCE (old) schema, not target
 * - Check required fields exist
 * - Validate data types
 * - Return detailed validation results for debugging
 * - Non-destructive - only reads data, never modifies
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 */

/**
 * Validate Actor data structure matches l5r4-old schema.
 * Checks for required fields and correct data types based on actor type.
 * 
 * @param {Object} actorData - Actor data to validate (from .toObject())
 * @returns {ValidationResult} Validation result with errors and warnings
 */
export function validateActorData(actorData) {
  const errors = [];
  const warnings = [];

  // Basic structure
  if (!actorData) {
    errors.push("Actor data is null or undefined");
    return { valid: false, errors, warnings };
  }

  if (!actorData.type) {
    errors.push("Actor missing 'type' field");
    return { valid: false, errors, warnings };
  }

  if (!["pc", "npc"].includes(actorData.type)) {
    errors.push(`Invalid actor type: '${actorData.type}' (expected 'pc' or 'npc')`);
    return { valid: false, errors, warnings };
  }

  const system = actorData.system || {};

  // Validate common fields (both PC and NPC)
  validateCommonActorFields(system, errors, warnings);

  // Type-specific validation
  if (actorData.type === "pc") {
    validatePCFields(system, errors, warnings);
  } else if (actorData.type === "npc") {
    validateNPCFields(system, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate common actor fields (shared by PC and NPC).
 * Based on l5r4-old common template.
 * 
 * @param {Object} system - Actor system data
 * @param {string[]} errors - Error array to append to
 * @param {string[]} warnings - Warning array to append to
 */
function validateCommonActorFields(system, errors, warnings) {
  // Traits (8 required)
  const requiredTraits = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"];
  if (!system.traits) {
    errors.push("Missing 'system.traits' object");
  } else {
    for (const trait of requiredTraits) {
      if (system.traits[trait] === undefined) {
        errors.push(`Missing trait: system.traits.${trait}`);
      } else if (typeof system.traits[trait] !== "number") {
        errors.push(`Invalid type for system.traits.${trait}: expected number, got ${typeof system.traits[trait]}`);
      }
    }
  }

  // Rings (4 required)
  const requiredRings = ["fire", "air", "water", "earth"];
  if (!system.rings) {
    errors.push("Missing 'system.rings' object");
  } else {
    for (const ring of requiredRings) {
      if (system.rings[ring] === undefined) {
        errors.push(`Missing ring: system.rings.${ring}`);
      } else if (typeof system.rings[ring] !== "number") {
        errors.push(`Invalid type for system.rings.${ring}: expected number, got ${typeof system.rings[ring]}`);
      }
    }
  }

  // Wounds
  if (!system.wounds) {
    errors.push("Missing 'system.wounds' object");
  } else {
    if (typeof system.wounds.value !== "number") {
      errors.push("system.wounds.value must be a number");
    }
    if (typeof system.wounds.max !== "number") {
      errors.push("system.wounds.max must be a number");
    }
    if (typeof system.wounds.mod !== "number") {
      errors.push("system.wounds.mod must be a number");
    }
    
    // Check for both old and new field names
    const hasOldHealRate = system.wounds.heal_rate !== undefined;
    const hasNewHealRate = system.wounds.healRate !== undefined;
    if (!hasOldHealRate && !hasNewHealRate) {
      warnings.push("Missing both system.wounds.heal_rate and system.wounds.healRate");
    }
  }

  // Wound levels - check for both old and new field names
  const woundLevels = system.wound_lvl || system.woundLevels;
  if (!woundLevels) {
    errors.push("Missing wound levels (system.wound_lvl or system.woundLevels)");
  } else {
    const requiredLevels = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];
    for (const level of requiredLevels) {
      if (!woundLevels[level]) {
        errors.push(`Missing wound level: ${level}`);
      } else {
        if (typeof woundLevels[level].value !== "number") {
          errors.push(`${level}.value must be a number`);
        }
        if (typeof woundLevels[level].penalty !== "number" && typeof woundLevels[level].penalty !== "string") {
          errors.push(`${level}.penalty must be a number or string`);
        }
        if (typeof woundLevels[level].current !== "boolean") {
          errors.push(`${level}.current must be a boolean`);
        }
      }
    }
  }

  // Armor - check for both old and new field names
  if (!system.armor) {
    errors.push("Missing 'system.armor' object");
  } else {
    const hasOldArmorTn = system.armor.armor_tn !== undefined;
    const hasNewArmorTn = system.armor.armorTn !== undefined;
    if (!hasOldArmorTn && !hasNewArmorTn) {
      errors.push("Missing armor TN (system.armor.armor_tn or system.armor.armorTn)");
    }
    if (typeof system.armor.reduction !== "number") {
      errors.push("system.armor.reduction must be a number");
    }
  }
}

/**
 * Validate PC-specific fields.
 * Based on l5r4-old PC template.
 * 
 * @param {Object} system - Actor system data
 * @param {string[]} errors - Error array to append to
 * @param {string[]} warnings - Warning array to append to
 */
function validatePCFields(system, errors, warnings) {
  // Void ring (PC-specific structure)
  if (!system.rings?.void) {
    errors.push("Missing 'system.rings.void' object (PC)");
  } else {
    if (typeof system.rings.void.rank !== "number") {
      errors.push("system.rings.void.rank must be a number");
    }
    // Old schema has value and max, new only has value
    if (system.rings.void.value === undefined && system.rings.void.max === undefined) {
      warnings.push("PC void ring missing both value and max fields");
    }
  }

  // XP
  if (typeof system.xp !== "number") {
    errors.push("system.xp must be a number");
  }

  // Honor, Glory, Status
  for (const stat of ["honor", "glory", "status"]) {
    if (!system[stat]) {
      errors.push(`Missing 'system.${stat}' object`);
    } else {
      if (typeof system[stat].rank !== "number") {
        errors.push(`system.${stat}.rank must be a number`);
      }
      if (typeof system[stat].points !== "number") {
        errors.push(`system.${stat}.points must be a number`);
      }
    }
  }

  // Shadow Taint - check both old and new field names
  const shadowTaint = system.shadow_taint || system.shadowTaint;
  if (!shadowTaint) {
    errors.push("Missing shadow taint (system.shadow_taint or system.shadowTaint)");
  } else {
    if (typeof shadowTaint.rank !== "number") {
      errors.push("shadow taint rank must be a number");
    }
    if (typeof shadowTaint.points !== "number") {
      errors.push("shadow taint points must be a number");
    }
  }

  // Initiative
  if (!system.initiative) {
    errors.push("Missing 'system.initiative' object");
  } else {
    if (typeof system.initiative.roll !== "number") {
      errors.push("system.initiative.roll must be a number");
    }
    if (typeof system.initiative.keep !== "number") {
      errors.push("system.initiative.keep must be a number");
    }
    // Check for both old and new modifier field names
    const hasOldMods = system.initiative.roll_mod !== undefined || 
                       system.initiative.keep_mod !== undefined ||
                       system.initiative.total_mod !== undefined;
    const hasNewMods = system.initiative.rollMod !== undefined ||
                       system.initiative.keepMod !== undefined ||
                       system.initiative.totalMod !== undefined;
    if (!hasOldMods && !hasNewMods) {
      warnings.push("Initiative missing modifier fields (both old and new naming)");
    }
  }

  // Insight
  if (!system.insight) {
    errors.push("Missing 'system.insight' object");
  } else {
    if (typeof system.insight.rank !== "number") {
      errors.push("system.insight.rank must be a number");
    }
    if (typeof system.insight.points !== "number") {
      errors.push("system.insight.points must be a number");
    }
  }

  // Armor TN (PC-specific, different from common armor)
  const armorTn = system.armor_tn || system.armorTn;
  if (!armorTn) {
    warnings.push("Missing PC armor_tn object (system.armor_tn or system.armorTn)");
  }

  // Wealth
  if (!system.wealth) {
    errors.push("Missing 'system.wealth' object");
  } else {
    for (const currency of ["koku", "bu", "zeni"]) {
      if (typeof system.wealth[currency] !== "number") {
        errors.push(`system.wealth.${currency} must be a number`);
      }
    }
  }

  // Spell Slots
  if (!system.spellSlots) {
    warnings.push("Missing 'system.spellSlots' object");
  } else {
    for (const ring of ["water", "fire", "earth", "air", "void"]) {
      if (typeof system.spellSlots[ring] !== "number") {
        warnings.push(`system.spellSlots.${ring} should be a number`);
      }
    }
  }
}

/**
 * Validate NPC-specific fields.
 * Based on l5r4-old NPC template.
 * 
 * @param {Object} system - Actor system data
 * @param {string[]} errors - Error array to append to
 * @param {string[]} warnings - Warning array to append to
 */
function validateNPCFields(system, errors, warnings) {
  // Void ring (NPC-specific structure)
  if (!system.rings?.void) {
    errors.push("Missing 'system.rings.void' object (NPC)");
  } else {
    if (typeof system.rings.void.rank !== "number") {
      errors.push("system.rings.void.rank must be a number");
    }
  }

  // Initiative
  if (!system.initiative) {
    errors.push("Missing 'system.initiative' object");
  } else {
    if (typeof system.initiative.roll !== "number") {
      errors.push("system.initiative.roll must be a number");
    }
    if (typeof system.initiative.keep !== "number") {
      errors.push("system.initiative.keep must be a number");
    }
  }

  // Attack/Damage pools
  for (const pool of ["attack1", "attack2", "damage1", "damage2"]) {
    if (!system[pool]) {
      warnings.push(`Missing 'system.${pool}' object`);
    } else {
      if (typeof system[pool].roll !== "number") {
        warnings.push(`system.${pool}.roll should be a number`);
      }
      if (typeof system[pool].keep !== "number") {
        warnings.push(`system.${pool}.keep should be a number`);
      }
    }
  }

  // Number of wound levels
  if (system.nrWoundLvls !== undefined) {
    if (typeof system.nrWoundLvls !== "number" && typeof system.nrWoundLvls !== "string") {
      warnings.push("system.nrWoundLvls should be a number or string");
    }
  }
}

/**
 * Validate Item data structure matches l5r4-old schema.
 * Checks for required fields and correct data types based on item type.
 * 
 * @param {Object} itemData - Item data to validate (from .toObject())
 * @returns {ValidationResult} Validation result with errors and warnings
 */
export function validateItemData(itemData) {
  const errors = [];
  const warnings = [];

  // Basic structure
  if (!itemData) {
    errors.push("Item data is null or undefined");
    return { valid: false, errors, warnings };
  }

  if (!itemData.type) {
    errors.push("Item missing 'type' field");
    return { valid: false, errors, warnings };
  }

  const validTypes = [
    "advantage", "disadvantage", "skill", "commonItem", "weapon", "bow",
    "armor", "technique", "spell", "kata", "kiho", "tattoo"
  ];

  if (!validTypes.includes(itemData.type)) {
    errors.push(`Invalid item type: '${itemData.type}'`);
    return { valid: false, errors, warnings };
  }

  const system = itemData.system || {};

  // Type-specific validation
  switch (itemData.type) {
    case "skill":
      validateSkillItem(system, errors, warnings);
      break;
    case "weapon":
      validateWeaponItem(system, errors, warnings);
      break;
    case "bow":
      validateBowItem(system, errors, warnings);
      break;
    case "armor":
      validateArmorItem(system, errors, warnings);
      break;
    case "spell":
      validateSpellItem(system, errors, warnings);
      break;
    case "advantage":
    case "disadvantage":
      validateAdvDisadvItem(system, errors, warnings);
      break;
    case "technique":
      validateTechniqueItem(system, errors, warnings);
      break;
    case "kata":
    case "kiho":
      validateKataKihoItem(system, errors, warnings);
      break;
    case "tattoo":
      validateTattooItem(system, errors, warnings);
      break;
    case "commonItem":
      // commonItem just needs description template, no specific fields
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate skill item fields
 */
function validateSkillItem(system, errors, warnings) {
  if (typeof system.rank !== "number") {
    errors.push("skill.rank must be a number");
  }
  
  if (!["high", "low", "bugei", "merchant"].includes(system.type)) {
    warnings.push(`Unusual skill type: '${system.type}'`);
  }

  const validTraits = ["sta", "wil", "str", "per", "ref", "awa", "agi", "int", "void"];
  if (!validTraits.includes(system.trait)) {
    warnings.push(`Invalid skill trait: '${system.trait}'`);
  }

  // Check for both old and new field names
  const hasOldBonus = system.roll_bonus !== undefined || 
                      system.keep_bonus !== undefined ||
                      system.total_bonus !== undefined;
  const hasNewBonus = system.rollBonus !== undefined ||
                      system.keepBonus !== undefined ||
                      system.totalBonus !== undefined;
  
  if (!hasOldBonus && !hasNewBonus) {
    warnings.push("Skill missing bonus fields (both old and new naming)");
  }
}

/**
 * Validate weapon item fields
 */
function validateWeaponItem(system, errors, warnings) {
  if (typeof system.damageRoll !== "number") {
    errors.push("weapon.damageRoll must be a number");
  }
  if (typeof system.damageKeep !== "number") {
    errors.push("weapon.damageKeep must be a number");
  }
  if (typeof system.explodesOn !== "number") {
    errors.push("weapon.explodesOn must be a number");
  }
  
  const validSizes = ["small", "medium", "large", "Small", "Medium", "Large"];
  if (!validSizes.includes(system.size)) {
    warnings.push(`Unusual weapon size: '${system.size}'`);
  }
}

/**
 * Validate bow item fields (legacy type)
 */
function validateBowItem(system, errors, warnings) {
  if (typeof system.str !== "number") {
    errors.push("bow.str must be a number");
  }
  if (typeof system.range !== "number") {
    errors.push("bow.range must be a number");
  }
  if (typeof system.damageRoll !== "number") {
    errors.push("bow.damageRoll must be a number");
  }
  if (typeof system.damageKeep !== "number") {
    errors.push("bow.damageKeep must be a number");
  }
  if (typeof system.explodesOn !== "number") {
    errors.push("bow.explodesOn must be a number");
  }
  
  warnings.push("Bow item detected - will need conversion to weapon with isBow flag");
}

/**
 * Validate armor item fields
 */
function validateArmorItem(system, errors, warnings) {
  if (typeof system.bonus !== "number") {
    errors.push("armor.bonus must be a number");
  }
  if (typeof system.reduction !== "number") {
    errors.push("armor.reduction must be a number");
  }
  
  // Check for both old and new field names for equipped
  const hasEquipped = system.equipped !== undefined || system.equiped !== undefined;
  if (!hasEquipped) {
    warnings.push("armor missing equipped/equiped field");
  }
  
  // Check for typo in specialRules
  if (system.specialRues !== undefined) {
    warnings.push("armor has 'specialRues' typo - should be 'specialRules'");
  }
}

/**
 * Validate spell item fields
 */
function validateSpellItem(system, errors, warnings) {
  const validRings = ["earth", "fire", "water", "air", "void"];
  if (!validRings.includes(system.ring)) {
    errors.push(`Invalid spell ring: '${system.ring}'`);
  }
  if (typeof system.mastery !== "number") {
    errors.push("spell.mastery must be a number");
  }
  if (!Array.isArray(system.keywords)) {
    warnings.push("spell.keywords should be an array");
  }
}

/**
 * Validate advantage/disadvantage item fields
 */
function validateAdvDisadvItem(system, errors, warnings) {
  if (typeof system.cost !== "number") {
    errors.push("advantage/disadvantage cost must be a number");
  }
  if (!["physical", "mental", "social", "spiritual", "material"].includes(system.type)) {
    warnings.push(`Unusual advantage/disadvantage type: '${system.type}'`);
  }
}

/**
 * Validate technique item fields
 */
function validateTechniqueItem(system, errors, warnings) {
  if (typeof system.rank !== "number") {
    errors.push("technique.rank must be a number");
  }
  if (typeof system.shugenja !== "boolean") {
    warnings.push("technique.shugenja should be a boolean");
  }
}

/**
 * Validate kata/kiho item fields
 */
function validateKataKihoItem(system, errors, warnings) {
  const validRings = ["earth", "fire", "water", "air", "void"];
  if (!validRings.includes(system.ring)) {
    errors.push(`Invalid kata/kiho ring: '${system.ring}'`);
  }
  if (typeof system.mastery !== "number") {
    errors.push("kata/kiho mastery must be a number");
  }
}

/**
 * Validate tattoo item fields
 */
function validateTattooItem(system, errors, warnings) {
  if (typeof system.effect !== "string") {
    warnings.push("tattoo.effect should be a string");
  }
}
