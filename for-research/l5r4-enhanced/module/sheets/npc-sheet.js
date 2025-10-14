/**
 * @fileoverview L5R4 NPC Sheet - Non-Player Character Sheet Implementation for Foundry VTT v13+
 * 
 * This class provides a specialized actor sheet for Non-Player Characters in the L5R4 system,
 * extending BaseActorSheet to inherit shared functionality while implementing NPC-specific
 * features such as simplified trait management, limited view templates, and streamlined
 * roll interfaces optimized for GM use during gameplay sessions.
 * 
 * **Core Responsibilities:**
 * - **Simplified Trait Management**: Direct rank adjustment without XP calculations or family bonuses
 * - **Limited View Support**: Restricted templates for player-visible NPCs with permission control
 * - **Streamlined Rolling**: Quick roll interfaces for common NPC actions and combat
 * - **Void Point Integration**: Optional void point tracking for important NPCs and villains
 * - **Item Organization**: Categorized item display matching PC sheet structure for consistency
 * - **Context Menu Support**: Right-click operations for efficient item management during play
 * - **Permission Handling**: Dynamic template selection based on user ownership and permissions
 * 
 * **NPC vs PC Differences:**
 * Key distinctions from the PC sheet implementation:
 * - **No XP System**: Traits adjust directly without experience point costs or tracking
 * - **Simplified Void**: Basic void rank adjustment without complex point management
 * - **Limited Templates**: Separate templates for GM view vs player-visible information
 * - **Quick Rolls**: Dataset-driven simple rolls for rapid gameplay without modifier dialogs
 * - **No Family Bonuses**: Direct trait values without Active Effects complexity
 * - **Streamlined UI**: Focused interface showing only essential NPC information
 * - **Direct Editing**: Immediate trait changes without validation or cost calculation
 * 
 * **ApplicationV2 Architecture:**
 * Modern Foundry v13+ implementation with NPC-specific optimizations:
 * - **Template System**: Uses HandlebarsApplicationMixin for efficient rendering
 * - **Action Delegation**: Clean event handling via data-action attributes
 * - **Context Preparation**: Modern _prepareContext() replaces legacy getData()
 * - **Render Pipeline**: _onRender() handles post-render setup and event binding
 * - **Form Integration**: Seamless form handling with submitOnChange support
 * - **Permission Integration**: Dynamic behavior based on user permissions
 * 
 * **Template Integration System:**
 * Dual template system for different user contexts:
 * - **Full Template**: `templates/actor/npc.hbs` for GM view with full editing
 * - **Limited Template**: `templates/actor/limited-npc-sheet.hbs` for player view
 * - **Shared Partials**: Reuses PC sheet partials for consistent item display
 * - **Dynamic Selection**: Template chosen based on user permissions and ownership
 * - **Permission Checks**: Automatic fallback to limited view for non-owners
 * - **Responsive Layout**: Adapts to content complexity and user permissions
 * 
 * **Roll System Integration:**
 * Streamlined rolling system optimized for NPC use:
 * - **NPC Rolls**: Specialized roll handling via Dice.NpcRoll() for quick resolution
 * - **Simple Rolls**: Dataset-driven rolls for basic actions without complex dialogs
 * - **Trait Rolls**: Ring and trait rolling with automatic wound penalty integration
 * - **Weapon Rolls**: Attack and damage rolls using shared base class methods
 * - **Skill Rolls**: Skill-based rolls with emphasis and modifier support
 * - **Quick Combat**: Rapid roll resolution for efficient combat management
 * 
 * **Performance Optimizations:**
 * - **Simplified Context**: Reduced template data preparation for faster rendering
 * - **Efficient Rolls**: Streamlined roll processing without complex modifier calculations
 * - **Minimal Validation**: Direct trait updates without extensive validation overhead
 * - **Template Caching**: Reuse of template data between renders
 * - **Event Optimization**: Focused event handling for essential NPC interactions
 * 
 * **Event Handling Examples:**
 * ```javascript
 * // Action delegation examples for NPC interactions
 * <button data-action="roll-ring" data-ring-name="Fire" data-system-ring="fire" data-ring-rank="3">
 * <div data-action="trait-rank" data-trait="stamina">
 * <span data-action="void-points-dots" class="dot">
 * ```
 * 
 * **Usage Examples:**
 * ```javascript
 * // Create NPC sheet instance
 * const npcSheet = new L5R4NpcSheet(npcActor, options);
 * 
 * // Render with limited view for players
 * await npcSheet.render(true, { limited: true });
 * 
 * // Quick trait adjustment
 * await npcSheet._onTraitAdjust(event, element, +1);
 * ```
 *
 * **Integration Points:**
 * - **Dice Service**: NPC-optimized roll processing with Dice.NpcRoll()
 * - **Chat Service**: Item creation dialogs and message formatting
 * - **Config Module**: System constants and localization keys
 * - **Utils Module**: Helper functions for data processing and validation
 * - **Base Sheet**: Inherited functionality from BaseActorSheet
 *
 * **Error Handling:**
 * - **Graceful Degradation**: Sheet functions with missing or invalid data
 * - **Console Warnings**: Detailed error logging for troubleshooting
 * - **Fallback Templates**: Limited template used when full template fails
 * - **Safe Updates**: Validation prevents invalid trait values
 *
 * **Code Navigation Guide:**
 * 1. **Class Definition** (`L5R4NpcSheet`) - Main class with static configurations
 * 2. **Action Handlers** (`_onAction()`, `_onActionContext()`) - Event routing
 * 3. **Roll Methods** (`_onRingRoll()`, `_onSimpleRoll()`) - NPC-specific rolling
 * 4. **Trait Management** (`_onVoidAdjust()`) - Direct trait modification
 * 5. **Template System** (`_renderHTML()`, `_prepareContext()`) - Template handling
 * 6. **Event Binding** (`_onRender()`) - Post-render setup
 * 7. **Form Processing** (`_prepareSubmitData()`) - Form submission handling
 * 
 * **Performance Considerations:**
 * - **Template Caching**: Templates are preloaded and cached for fast rendering
 * - **Event Delegation**: Single event listener per action type reduces memory usage
 * - **Conditional Rendering**: Limited templates reduce DOM complexity for players
 * - **Lazy Loading**: Item context menus created only when needed
 * - **Efficient Updates**: Targeted DOM updates for trait changes
 * 
 * @author L5R4 System Team
 * @since 2.0.0
 * @version 2.0.0
 * @extends {BaseActorSheet}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html|ActorSheetV2}
 * @see {@link ./base-actor-sheet.js|BaseActorSheet} - Shared functionality and roll methods
 * @see {@link ../services/dice.js|Dice.NpcRoll} - NPC roll processing
 */

import * as Fear from "../services/fear.js";
import { SYS_ID } from "../config/constants.js";
import { TEMPLATE } from "../config/templates.js";
import { 
  ARROWS, 
  SIZES, 
  RINGS, 
  RINGS_WITH_NONE, 
  SPELL_RINGS, 
  SKILL_TRAITS, 
  NPC_TRAITS, 
  SKILL_TYPES, 
  ACTION_TYPES, 
  KIHO_TYPES, 
  ADVANTAGE_TYPES,
  STANCES 
} from "../config/localization.js";
import { NPC_NUMBER_WOUND_LVLS } from "../config/game-data.js";
import { on } from "../utils/dom.js";
import { getSortPref, sortWithPref } from "../utils/sorting.js";
import { BaseActorSheet } from "./base-actor-sheet.js";
import { RollHandler } from "./handlers/roll-handler.js";
import { AppLauncherHandler } from "./handlers/app-launcher-handler.js";
import { StanceHandler } from "./handlers/stance-handler.js";
import { getActiveStances } from "../services/stance/core/helpers.js";
import { getMountedStatus } from "../services/mounted-combat.js";


export default class L5R4NpcSheet extends BaseActorSheet {
  static PARTS = {
    form: {
      root: true,
      classes: ["flexcol"],
      template: `systems/${SYS_ID}/templates/actor/npc.hbs`,
      scrollable: [".scrollable-content"]
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [
      ...(super.DEFAULT_OPTIONS.classes ?? []).filter(c => c !== "pc" && c !== "npc" && c !== "l5r4"),
      "l5r4",
      "npc"
    ],
    position: { ...(super.DEFAULT_OPTIONS.position ?? {}), width: 840 },
    form: { ...(super.DEFAULT_OPTIONS.form ?? {}), submitOnChange: true }
  };

  /** @inheritdoc */
  _onAction(action, event, element) {
    switch (action) {
      case "inline-edit": return this._onInlineItemEdit(event, element);
      case "item-create": return this._onItemCreate(event, element);
      case "item-delete": return this._onItemDelete(event, element);
      case "item-edit": return this._onItemEdit(event, element);
      case "item-expand": return this._onItemExpand(event, element);
      case "item-chat": return this._onItemHeaderToChat(event, element);
      case "item-sort-by": return this._onUnifiedSortClick(event, element);
      case "ring-rank-void": return this._onVoidAdjust(event, element, +1);
      case "roll-ring": return RollHandler.npcRingRoll(this._getHandlerContext(), event, element);
      case "roll-skill": return this._onSkillRoll(event, element);
      case "roll-trait": return this._onTraitRoll(event, element);
      case "roll-attack": return this._onAttackRoll(event, element);
      case "roll-damage": return this._onDamageRoll(event, element);
      case "roll-weapon-attack": return this._onWeaponAttackRoll(event, element);
      case "test-fear": return this._onFearTest(event, element);
      case "trait-rank": return this._onTraitAdjust(event, element, +1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, +1);
      case "wound-config": return AppLauncherHandler.openWoundConfig(this._getHandlerContext(), event, element);
    }
  }

  /** @inheritdoc (right-click = decrement) */
  _onActionContext(action, event, element) {
    switch (action) {
      case "trait-rank": return this._onTraitAdjust(event, element, -1);
      case "ring-rank-void": return this._onVoidAdjust(event, element, -1);
      case "void-points-dots": return this._onVoidPointsAdjust(event, element, -1);
      default: return this._onAction(action, event, element);
    }
  }

  /** @inheritdoc (change events for inline-edit passthrough) */
  _onActionChange(action, event, element) {
    if (action === "inline-edit") return this._onInlineItemEdit(event, element);
    if (action === "change-stance") return StanceHandler.changeStance(this._getHandlerContext(), event, element);
  }


  /**
   * Adjust NPC Void Ring rank by ±1 without XP calculations.
   * Provides direct trait manipulation for NPCs, bypassing the complex
   * experience point system used by player characters. Values are clamped
   * to the standard L5R4 trait range of 1-9.
   * Requires Shift+Click to prevent accidental changes.
   * 
   * **NPC vs PC Differences:**
   * - No XP cost calculations or tracking
   * - Direct rank modification without family bonus considerations
   * - Immediate update without confirmation dialogs
   * - Simple range clamping without advancement rules
   * 
   * **Update Process:**
   * 1. Read current void rank from actor system data
   * 2. Apply delta (+1 or -1) with range clamping
   * 3. Update actor document if value changed
   * 4. Handle errors gracefully with console warnings
   * 
   * @param {Event} event - Click event (prevented to avoid form submission)
   * @param {HTMLElement} element - Element containing trait data (unused)
   * @param {number} delta - Adjustment value: +1 for increment, -1 for decrement
   * @returns {Promise<void>} Resolves when update completes or fails
   * 
   * @example
   * // Increment void rank on Shift+left-click
   * await npcSheet._onVoidAdjust(event, element, +1);
   * 
   * // Decrement void rank on Shift+right-click
   * await npcSheet._onVoidAdjust(event, element, -1);
   */
  async _onVoidAdjust(event, element, delta) {
    event?.preventDefault?.();
    
    // Require Shift+Click to prevent accidental void rank changes
    if (!event?.shiftKey) return;
    
    // Use _source to get base value before Active Effects are applied
    const cur = Number(this.actor._source?.system?.rings?.void?.rank
                ?? this.actor.system?.rings?.void?.rank ?? 0) || 0;
    const min = 0;
    const max = 9;
    const next = Math.min(max, Math.max(min, cur + (delta > 0 ? 1 : -1)));
    if (next === cur) return;
    try {
      await this.actor.update({ "system.rings.void.rank": next }, { diff: true });
    } catch (err) {
      console.warn(`${SYS_ID} NPC Sheet: failed to update void rank`, { err });
    }
  }

  /**
   * @override
   * Render HTML for NPC sheet, choosing between limited and full templates.
   * Strips legacy <form> tags for ApplicationV2 compatibility.
   * @param {object} context - Template context
   * @param {object} options - Render options
   * @returns {Promise<{form: HTMLElement}>}
   */
  async _renderHTML(context, _options) {
    const isLimited = (!game.user.isGM && this.actor.limited);
    const path = isLimited ? TEMPLATE("actor/npc-limited.hbs") : TEMPLATE("actor/npc.hbs");
    const html = await foundry.applications.handlebars.renderTemplate(path, context);
    const host = document.createElement("div");
    host.innerHTML = html;
    const form = host.querySelector("form") || host.firstElementChild || host;
    return { form };
  }

  /**
   * @override
   * Prepare template context for NPC sheet.
   * Categorizes items by type and adds NPC-specific settings.
   * Applies user sorting preferences for skills list.
   * @param {object} options - Context preparation options
   * @returns {Promise<object>} Template context
   */
  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const actorObj = this.actor;

    // Categorize items - mirrors the PC sheet so templates can rely on the same buckets
    const all = this.actor.items.contents;
    const byType = (t) => all.filter((i) => i.type === t);

    // Skills sorted by user preference (name, rank, trait, roll, emphasis)
    // Get current active stance for dropdown
    const activeStances = getActiveStances(actorObj);
    const currentStance = activeStances[0] || "";
    
    // Get mounted combat status
    const mountedStatus = getMountedStatus(actorObj);

    const skills = (() => {
      const cols = {
        name:     it => String(it?.name ?? ""),
        rank:     it => Number(it?.system?.rank ?? 0) || 0,
        trait:    it => {
          const raw = String(it?.system?.trait ?? "").toLowerCase();
          const key = raw && /^l5r4\.mechanics\.traits\./.test(raw) ? raw : (raw ? `l5r4.ui.mechanics.traits.${raw}` : "");
          const loc = key ? game.i18n?.localize?.(key) : "";
          return String((loc && loc !== key) ? loc : (it?.system?.trait ?? ""));
        },
        roll:     it => Number(it?.system?.rank ?? 0) || 0,
        emphasis: it => String(it?.system?.emphasis ?? "")
      };
      const pref = getSortPref(actorObj.id, "skills", Object.keys(cols), "name");
      return sortWithPref(byType("skill"), cols, pref, game.i18n?.lang);
    })();

    return {
      ...base,
      actor: this.actor,
      system: actorObj.system,
      currentStance,
      mountedStatus,
      config: {
        arrows: ARROWS,
        sizes: SIZES,
        rings: RINGS,
        ringsWithNone: RINGS_WITH_NONE,
        spellRings: SPELL_RINGS,
        traits: SKILL_TRAITS,
        npcTraits: NPC_TRAITS,
        skillTypes: SKILL_TYPES,
        actionTypes: ACTION_TYPES,
        kihoTypes: KIHO_TYPES,
        advantageTypes: ADVANTAGE_TYPES,
        stances: STANCES,
        npcNumberWoundLvls: NPC_NUMBER_WOUND_LVLS
      },

      // Add the setting to the context
      showNpcVoidPoints: game.settings.get(SYS_ID, "allowNpcVoidPoints"),

      // Effective traits for template parity with PC sheet
      traitsEff: foundry.utils.duplicate(this.actor.system?._derived?.traitsEff ?? {}),

      // Buckets commonly used by your stock templates
      skills,
      weapons: byType("weapon"),
      bows: byType("bow"),
      armors: byType("armor"),
      spells: byType("spell"),
      items: all.filter((i) => i.type === "item" || i.type === "commonItem")
    };
  }

  /**
   * @override
   * Post-render setup for NPC sheet.
   * Paints void dots, initializes sort indicators, and sets up event listeners for NPC-specific functionality.
   * @param {object} context - Template context
   * @param {object} options - Render options
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    this._paintVoidPointsDots(root);
    if (!this.actor.isOwner) return;

    // Initialize sort indicators for skills section using base class method
    this._initializeSortIndicators(root, "skills", ["name", "rank", "trait", "roll", "emphasis"]);

    // Simple rolls (not handled by base class action delegation)
    on(root, ".simple-roll", "click", (ev) => RollHandler.npcSimpleRoll(this._getHandlerContext(), ev));

    // Image editing
    on(root, "[data-edit='img']", "click", (ev) => this._onEditImage(ev, ev.currentTarget));

    // Setup shared context menu for item rows
    await this._setupItemContextMenu(root);
  }

  /* Rolls ----------------------------------------------------------------- */


  /**
   * @override
   * Define allowed sort keys for NPC lists.
   * Specifies which columns are sortable for each list scope.
   * 
   * @param {string} scope - Sort scope identifier (e.g., "skills")
   * @returns {string[]} Array of allowed sort keys for this scope
   */
  _getAllowedSortKeys(scope) {
    const keys = {
      skills: ["name", "rank", "trait", "roll", "emphasis"]
    };
    return keys[scope] ?? ["name"];
  }

  /**
   * Handle Fear test click from NPC sheet.
   * Tests selected tokens against this NPC's Fear effect.
   * 
   * **Process:**
   * 1. Validates NPC has Fear configured
   * 2. Gets selected tokens from canvas
   * 3. Filters to valid character actors
   * 4. Calls Fear service to process tests
   * 
   * @param {Event} event - Click event on Fear display
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<void>}
   */
  async _onFearTest(event, element) {
    event?.preventDefault?.();
    
    // Validate NPC has Fear
    if (!this.actor.hasFear?.()) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.mechanics.fear.noFear"));
      return;
    }
    
    // Delegate to Fear service
    await Fear.handleFearClick({ npc: this.actor });
  }


  /* Submit-time guard ------------------------------------------------------ */

  /**
   * @override
   * Ensure NPC name is never empty on form submission.
   * Provides robustness similar to PC sheet.
   * @param {Event} event - Submit event
   * @param {HTMLFormElement} form - Form element
   * @param {FormData} formData - Form data
   * @param {object} updateData - Additional update data
   * @returns {object} Processed submit data
   */
  _prepareSubmitData(event, form, formData, updateData={}) {
    const submit = super._prepareSubmitData(event, form, formData, updateData);
    if (!String(submit.name ?? "").trim()) submit.name = this.actor.name || "Unnamed";
    return submit;
  }
}
