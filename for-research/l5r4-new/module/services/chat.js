/**
 * @fileoverview L5R4 Chat Service - Unified Item Creation Dialog for Foundry VTT v13+
 * 
 * This service module provides a unified dialog for creating all item types relevant
 * to the current actor. Uses Foundry's DialogV2 API with a single template that
 * adapts based on actor type (PC vs NPC).
 *
 * **Note:** "Chat" refers to the user interaction service layer, not Foundry's ChatMessage API.
 * This module provides dialog utilities for collecting user input, not posting to the chat log.
 * For chat message posting functionality, see dice.js which uses roll.toMessage().
 *
 * **Core Functionality:**
 * - **Unified Dialog**: Single dialog for all item creation needs
 * - **Context Awareness**: Shows appropriate item types based on actor type
 * - **Form Processing**: Extracts and validates user input from dialog forms
 * - **Type Filtering**: Automatically filters available item types per actor
 *
 * @author L5R4 System Team
 * @since 2.1.0
 * @version 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html|DialogV2}
 */

import { DIALOG_TEMPLATES } from "../config.js";
import { R, T } from "../utils.js";

/** Foundry's DialogV2 API for creating modal dialogs. */
const DIALOG = foundry.applications.api.DialogV2;

/**
 * Result object returned by the unified item creation dialog.
 * @typedef {Object} UnifiedItemResult
 * @property {string} [name] - The item name (mutually exclusive with cancelled)
 * @property {string} [type] - The item type (mutually exclusive with cancelled)
 * @property {boolean} [cancelled] - True if user cancelled the dialog (mutually exclusive with name/type)
 */

/**
 * Display a unified item creation dialog and collect user input.
 * Shows all item types relevant to the actor type with proper categorization.
 * 
 * **Dialog Behavior:**
 * - **PC Actors**: Shows all character items (advantages, skills, spells, etc.) + equipment
 * - **NPC Actors**: Shows only skills (restricted for simplified NPC management)
 * - **Validation**: Requires non-empty item name before allowing creation
 * - **Cancellation**: Returns cancelled status if user cancels or validation fails
 * - **Auto-Selection**: Pre-selects item type based on sheet section context
 * 
 * **Template Context:**
 * The dialog template receives context data to determine which item types to show:
 * - `showCharacterItems`: Boolean indicating if PC items should be displayed (true for PCs)
 * - `npcSkillsOnly`: Boolean indicating if only skills should be shown for NPCs
 * - `preferredType`: String indicating which item type should be pre-selected
 * 
 * **NPC Restriction Rationale:**
 * NPCs are currently restricted to skills only for simplified management. This ensures
 * the Skills section "Add item" button works correctly while preventing clutter from
 * unnecessary item types that NPCs typically don't use.
 * 
 * @param {string} actorType - The actor type ("pc" or "npc") to determine available items
 * @param {string} [preferredType] - Optional item type to pre-select in dropdown
 * @returns {Promise<UnifiedItemResult>} User selections or cancellation status
 */
export async function getUnifiedItemOptions(actorType, preferredType = null) {
  // Determine which item types to show based on actor type
  const isNpc = actorType === "npc";
  const showCharacterItems = actorType === "pc";
  const npcSkillsOnly = isNpc; // NPCs restricted to skills only
  
  // Render dialog content with appropriate context
  const content = await R(DIALOG_TEMPLATES.unifiedItemCreate, { 
    showCharacterItems,
    npcSkillsOnly,
    preferredType 
  });

  try {
    // Display modal dialog with form validation
    const result = await DIALOG.prompt({
      window: { title: T("l5r4.ui.sheets.addItem") },
      content,
      ok: {
        label: T("l5r4.ui.common.ok"),
        callback: (_ev, button, dialog) => {
          // Extract form data from dialog
          const form = button.form ?? dialog.form;
          if (!form) return { cancelled: true };
          
          // Validate and normalize user input
          const name = String(form.elements.itemName?.value ?? "").trim();
          const type = String(form.elements.itemType?.value ?? "").trim() || "commonItem";
          
          // Require non-empty item name
          if (!name) return { cancelled: true };
          
          return { name, type };
        }
      },
      cancel: { label: T("l5r4.ui.common.cancel") },
      rejectClose: true, // Prevent closing without button interaction
      modal: true        // Block other UI interaction
    });

    return result ?? { cancelled: true };
  } catch {
    // Handle any dialog errors as cancellation
    return { cancelled: true };
  }
}
