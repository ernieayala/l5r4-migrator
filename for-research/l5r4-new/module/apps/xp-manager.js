/**
 * @fileoverview L5R4 XP Manager Application for Foundry VTT v13+
 * 
 * This module provides a comprehensive experience point management interface for L5R4 characters,
 * built on Foundry's modern ApplicationV2 architecture. It replaces the legacy Dialog-based modal
 * with a more robust and maintainable solution while preserving the familiar user interface.
 *
 * **Core Responsibilities:**
 * - **XP Tracking**: Comprehensive experience point breakdown and history management
 * - **Manual Adjustments**: GM and player tools for XP modifications with audit trails
 * - **Purchase History**: Automatic reconstruction of XP expenditures from character data
 * - **Legacy Migration**: Retroactive data format updates for existing characters
 * - **Real-time Updates**: Live synchronization with character sheet changes
 *
 * **Key Features:**
 * - **Automatic XP Calculation**: Rebuilds XP history from traits, skills, void, and advantages
 * - **Manual Entry System**: Add/remove XP with notes and timestamps for record keeping
 * - **Type Categorization**: Organized display by expenditure type (traits, skills, advantages, etc.)
 * - **Legacy Data Support**: Handles migration from old XP tracking formats
 * - **Audit Trail**: Complete history of all XP changes with timestamps and descriptions
 *
 * **ApplicationV2 Architecture:**
 * - **HandlebarsApplicationMixin**: Modern template rendering with async context preparation
 * - **Form Integration**: Native form handling with action delegation system
 * - **Unique Identification**: Actor-specific window IDs prevent conflicts
 * - **Responsive Layout**: Resizable window with optimized dimensions
 * - **Event Delegation**: Clean action-based event handling system
 *
 * **XP Calculation System:**
 * The manager automatically reconstructs XP expenditures by analyzing:
 * - **Traits**: Cost calculated using L5R4 progression (4×rank) with family bonuses
 * - **Void Ring**: Separate progression (6×rank) with discount support
 * - **Skills**: Rank-based costs with school skill free rank handling
 * - **Emphases**: Fixed 2 XP cost with free emphasis support for school skills
 * - **Advantages**: Direct cost from item system data
 * - **Disadvantages**: Direct cost from item system data (displayed as negative XP)
 * - **Kata**: Direct cost from item system data
 * - **Kiho**: Direct cost from item system data
 *
 * **Data Migration Features:**
 * - **Retroactive Updates**: Rebuilds XP history from current character state
 * - **Legacy Format Support**: Handles old XP tracking data structures
 * - **Type Standardization**: Ensures consistent entry formatting and categorization
 * - **Timestamp Generation**: Creates logical timestamps for historical entries
 * - **Error Recovery**: Graceful handling of corrupted or missing XP data
 *
 * **Usage Examples:**
 * ```javascript
 * // Open XP manager for an actor
 * const xpManager = new XpManagerApplication(actor);
 * await xpManager.render(true);
 * 
 * // Add manual XP adjustment
 * await actor.setFlag('l5r4', 'xpManual', [...existing, {
 *   id: foundry.utils.randomID(),
 *   delta: 10,
 *   note: 'Session reward',
 *   ts: Date.now()
 * }]);
 * ```
 *
 * **Performance Considerations:**
 * - **Lazy Calculation**: XP history rebuilt only when manager opens
 * - **Efficient Updates**: Uses Foundry's flag system for minimal data changes
 * - **Template Caching**: Handlebars templates cached for fast rendering
 * - **Event Optimization**: Action delegation reduces event listener overhead
 *
 * @author L5R4 System Team
 * @since 2.0.0
 * @version 1.1.0
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html|ApplicationV2}
 * @see {@link https://foundryvtt.com/api/classes/foundry.applications.api.HandlebarsApplicationMixin.html|HandlebarsApplicationMixin}
 * @see {@link https://foundryvtt.com/api/classes/foundry.abstract.Document.html#setFlag|Document.setFlag}
 */

import { SYS_ID } from "../config.js";
import { getSortPref, setSortPref, sortWithPref } from "../utils.js";

/**
 * XP Manager Application using ApplicationV2 architecture
 * Provides experience point management with breakdown, manual adjustments, and purchase history
 */
export default class XpManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  
  static DEFAULT_OPTIONS = {
    id: "xp-manager-{id}",
    classes: ["l5r4", "xp-modal-dialog"],
    tag: "form",
    window: {
      title: "l5r4.character.experience.xpLog",
      icon: "fas fa-star",
      resizable: true
    },
    position: {
      width: 600,
      height: 700
    },
    actions: {
      "xp-add-confirm": XpManagerApplication.prototype._onAddXp,
      "xp-delete-manual": XpManagerApplication.prototype._onDeleteEntry,
      "item-sort-by": XpManagerApplication.prototype._onSortClick,
      "recalculate-xp-purchase": XpManagerApplication.prototype._onRecalculateXpPurchase
    }
  };

  static PARTS = {
    form: {
      template: "systems/l5r4/templates/apps/xp-manager.hbs"
    }
  };

  /**
   * @param {Actor} actor - The actor whose XP to manage
   * @param {object} options - Application options
   */
  constructor(actor, options = {}) {
    // Set unique ID based on actor before calling super
    super(options);
    this.actor = actor;
  }

  /**
   * Prepare context data for the XP Manager template.
   * Retroactively updates XP data and formats entries for display.
   * @returns {Promise<object>} Template context data
   */
  async _prepareContext() {
    // Only run retroactive update if needed to avoid timing issues with character sheet
    await this._retroactivelyUpdateXPIfNeeded();
    
    // Prepare XP data
    const sys = this.actor.system ?? {};
    const xp = sys?._xp ?? {};
    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? ns.xpManual : [];
    const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent : [];

    // Format entries for display
    const formatEntries = (arr, applySort = false) => {
      let entries = arr.slice().map(e => {
          let formattedNote = e.note || "";
          let type = "";
          
          // Use stored type and format note based on type, with fallback parsing for legacy entries
          if (e.type === "trait" && e.traitLabel && e.toValue !== undefined) {
            type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
            formattedNote = e.fromValue !== undefined ? 
              `${e.traitLabel} ${e.fromValue}→${e.toValue}` : 
              `${e.traitLabel} ${e.toValue}`;
          } else if (e.type === "void" && e.toValue !== undefined) {
            type = game.i18n.localize("l5r4.character.experience.breakdown.void");
            formattedNote = e.fromValue !== undefined ? 
              `${game.i18n.localize("l5r4.ui.mechanics.rings.void")} ${e.fromValue}→${e.toValue}` : 
              `${game.i18n.localize("l5r4.ui.mechanics.rings.void")} ${e.toValue}`;
          } else if (e.type === "skill" && e.skillName && e.toValue !== undefined) {
            type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
            // Check if this is an emphasis entry (has emphasis field) or use the pre-formatted note
            if (e.emphasis || e.note?.includes("Emphasis:")) {
              formattedNote = e.note; // Use the pre-formatted note for emphasis
            } else {
              formattedNote = e.fromValue !== undefined ? 
                `${e.skillName} ${e.fromValue}→${e.toValue}` : 
                `${e.skillName} ${e.toValue}`;
            }
          } else if (e.type === "advantage") {
            type = game.i18n.localize("l5r4.ui.sheets.advantage");
            formattedNote = e.itemName || e.note || "Advantage";
          } else if (e.type === "disadvantage") {
            type = game.i18n.localize("l5r4.ui.sheets.disadvantage");
            formattedNote = e.itemName || e.note || "Disadvantage";
          } else if (e.type === "kata") {
            type = game.i18n.localize("l5r4.ui.sheets.kata");
            formattedNote = e.itemName || e.note || "Kata";
          } else if (e.type === "kiho") {
            type = game.i18n.localize("l5r4.ui.sheets.kiho");
            formattedNote = e.itemName || e.note || "Kiho";
          } else {
            // Parse legacy entries based on localization keys in notes
            if (formattedNote.includes("l5r4.character.experience.traitChange")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
              formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.traitIncrease");
            } else if (formattedNote.includes("l5r4.character.experience.voidChange")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.void");
              formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.voidIncrease");
            } else if (formattedNote.includes("l5r4.character.experience.skillCreate")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
              formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.skillCreated");
            } else if (formattedNote.includes("l5r4.character.experience.skillChange")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
              formattedNote = game.i18n.localize("l5r4.character.experience.fallbackLabels.skillIncreased");
            } else if (e.type) {
              type = e.type;
            } else {
              type = game.i18n.localize("l5r4.character.experience.breakdown.manualAdjustments");
            }
          }
          
          return {
            id: e.id,
            deltaFormatted: (Number.isFinite(+e.delta) ? (e.delta >= 0 ? "+" : "") : "") + (e.delta ?? 0),
            note: formattedNote,
            type: type,
            delta: e.delta,
            ts: e.ts
          };
        });

      // Apply sorting if requested
      if (applySort) {
        const sortPref = getSortPref(this.actor.id, "xp-purchases", ["note", "cost", "type"], "note");
        const columns = {
          note: (e) => e.note || "",
          cost: (e) => Math.abs(Number.isFinite(+e.delta) ? +e.delta : 0),
          type: (e) => e.type || ""
        };
        entries = sortWithPref(entries, columns, sortPref);
      } else {
        // Default sort by timestamp
        entries.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      }

      return entries;
    };

    const manualEntries = formatEntries(manual);
    const spentEntries = formatEntries(spent, true);
    const manualTotal = manual.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);
    const spentTotal = spent.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);

    return {
      xp: {
        spent: xp.spent ?? 0,
        total: xp.total ?? 40,
        available: xp.available ?? (xp.total ?? 40) - (xp.spent ?? 0),
        breakdown: {
          base: xp?.breakdown?.base ?? 40,
          disadvantagesGranted: xp?.breakdown?.disadvantagesGranted ?? 0,
          manual: xp?.breakdown?.manual ?? 0,
          traits: xp?.breakdown?.traits ?? 0,
          void: xp?.breakdown?.void ?? 0,
          skills: xp?.breakdown?.skills ?? 0,
          advantages: xp?.breakdown?.advantages ?? 0,
          kata: xp?.breakdown?.kata ?? 0,
          kiho: xp?.breakdown?.kiho ?? 0
        }
      },
      manualEntries,
      spentEntries,
      manualTotal,
      spentTotal
    };
  }

  /**
   * Handle adding XP
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  async _onAddXp(event, target) {
    event.preventDefault();
    
    const form = this.element;
    const amount = Number(form.querySelector('#xp-amount')?.value) || 0;
    const note = form.querySelector('#xp-note')?.value?.trim() || "";
    
    if (amount === 0) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    manual.push({
      id: foundry.utils.randomID(),
      delta: amount,
      note,
      ts: Date.now()
    });

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", manual);
      
      // Clear the form
      form.querySelector('#xp-amount').value = "1";
      form.querySelector('#xp-note').value = "";
      
      // Re-render to show changes
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Handle deleting a manual XP entry
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  async _onDeleteEntry(event, target) {
    event.preventDefault();
    
    const entryId = target.dataset.entryId;
    if (!entryId) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    const filtered = manual.filter(e => e.id !== entryId);

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", filtered);
      // Re-render to show changes
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Handle sorting XP purchases by column
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  async _onSortClick(event, target) {
    event.preventDefault();
    event.stopPropagation();
    
    const header = target.closest('.item-list.-header');
    const scope = header?.dataset?.scope || "xp-purchases";
    const key = target.dataset.sortby || "note";
    const allowed = ["note", "cost", "type"];
    
    if (!allowed.includes(key)) return;
    
    const cur = getSortPref(this.actor.id, scope, allowed, "note");
    await setSortPref(this.actor.id, scope, key, { toggleFrom: cur });
    
    // Update visual indicators
    if (header) {
      header.querySelectorAll('.item-sort-by').forEach(a => {
        a.classList.toggle('is-active', a === target);
        if (a !== target) a.removeAttribute('data-dir');
      });
      
      // Set direction indicator on active element
      const newPref = getSortPref(this.actor.id, scope, allowed, "note");
      target.setAttribute('data-dir', newPref.dir);
    }
    
    this.render();
  }

  /**
   * Handle recalculating XP purchases from current character state.
   * Forces a retroactive XP update and re-renders the manager to show changes.
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  async _onRecalculateXpPurchase(event, target) {
    event.preventDefault();
    
    try {
      // Force retroactive update by clearing the version flag
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);
      
      // Run the retroactive update
      await this._retroactivelyUpdateXP();
      
      // Update the version flag to current state
      const currentVersion = this._calculateXPDataVersion();
      await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", currentVersion);
      
      // Notify user
      ui.notifications?.info(game.i18n.localize("l5r4.character.experience.recalculateSuccess"));
      
      // Re-render to show changes
      this.render();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to recalculate XP purchases", err);
      ui.notifications?.error(game.i18n.localize("l5r4.character.experience.recalculateFailed"));
    }
  }

  /**
   * Check if retroactive XP update is needed and run it if so.
   * This prevents unnecessary updates that can cause timing issues with character sheet XP display.
   * Only runs retroactive update on first open or when actor data has changed significantly.
   * 
   * @returns {Promise<void>}
   */
  async _retroactivelyUpdateXPIfNeeded() {
    try {
      const flags = this.actor.flags?.[SYS_ID] ?? {};
      const lastUpdateVersion = flags.xpRetroactiveVersion || 0;
      const currentVersion = this._calculateXPDataVersion();
      
      // Only run retroactive update if:
      // 1. Never run before (lastUpdateVersion === 0), OR
      // 2. Actor data has changed (version mismatch), OR  
      // 3. No xpSpent data exists (legacy actor)
      const needsUpdate = lastUpdateVersion === 0 || 
                         lastUpdateVersion !== currentVersion ||
                         !Array.isArray(flags.xpSpent) ||
                         flags.xpSpent.length === 0;
      
      if (needsUpdate) {
        console.log(`${SYS_ID} | Running retroactive XP update`, { 
          actorId: this.actor.id, 
          lastVersion: lastUpdateVersion, 
          currentVersion: currentVersion 
        });
        await this._retroactivelyUpdateXP();
        
        // Mark this version as processed
        await this.actor.setFlag(SYS_ID, "xpRetroactiveVersion", currentVersion);
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to check retroactive XP update need", err);
      // Fallback to always running the update if check fails
      await this._retroactivelyUpdateXP();
    }
  }

  /**
   * Calculate a version hash of the actor's XP-relevant data.
   * This is used to detect when retroactive XP updates are needed.
   * 
   * @returns {number} Version hash of XP-relevant data
   */
  _calculateXPDataVersion() {
    try {
      const sys = this.actor.system ?? {};
      
      // Create a hash of XP-relevant data
      const xpData = {
        traits: sys.traits || {},
        voidRank: sys.rings?.void?.rank || 0,
        skills: this.actor.items.filter(i => i.type === "skill").map(i => ({
          id: i.id,
          rank: i.system?.rank || 0,
          freeRanks: i.system?.freeRanks || 0,
          emphasis: i.system?.emphasis || "",
          freeEmphasis: i.system?.freeEmphasis || 0
        })),
        items: this.actor.items.filter(i => ["advantage", "disadvantage", "kata", "kiho"].includes(i.type)).map(i => ({
          id: i.id,
          type: i.type,
          cost: i.system?.cost || 0
        }))
      };
      
      // Simple hash function - convert to string and get hash code
      const str = JSON.stringify(xpData);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to calculate XP data version", err);
      return Date.now(); // Fallback to timestamp
    }
  }

  /**
   * Retroactively rebuild XP tracking entries from current character state.
   * Preserves existing XP entries and adds missing calculated entries.
   * This ensures manual XP adjustments and historical data are not lost.
   * 
   * **Duplicate Prevention:**
   * - Uses same note formats as real-time XP logging to prevent duplicates
   * - Trait entries: "Awareness 3→4" (matches actor document format)
   * - Void entries: "Void 2→3" (matches actor document format)
   * - Skill entries: "Skill Name 3" (retroactive only, no real-time equivalent)
   * 
   * **Integration with Real-time XP:**
   * - Real-time entries created by actor document when traits/void change
   * - Retroactive entries only added if not already present
   * - Manual XP adjustments always preserved
   */
  async _retroactivelyUpdateXP() {
    try {
      const sys = this.actor.system ?? {};
      const flags = this.actor.flags?.[SYS_ID] ?? {};
      
      // Build a fresh xpSpent list from the current actor state.
      // Manual adjustments live under flags.xpManual and are not part of xpSpent,
      // so it is safe to fully rebuild xpSpent here.
      const existingSpent = Array.isArray(flags.xpSpent) ? foundry.utils.duplicate(flags.xpSpent) : [];
      const spent = [];
      
      // Track entries we add during this rebuild to avoid internal duplicates
      const existingEntries = new Set();

      // Rebuild trait purchases
      const TRAITS = ["sta","wil","str","per","ref","awa","agi","int"];
      const traitDiscounts = flags?.traitDiscounts ?? {};
      const freeTraitBase = flags?.xpFreeTraitBase ?? {};

      for (const traitKey of TRAITS) {
        const effCur = parseInt(sys?.traits?.[traitKey]) || 2;
        const freeBase = parseInt(freeTraitBase?.[traitKey] ?? 0);
        const freeEff = freeBase > 0 ? 0 : parseInt(this.actor._creationFreeBonus?.(traitKey)) || 0;
        const disc = parseInt(traitDiscounts?.[traitKey] ?? 0);
        
        const baseline = 2 + freeBase;
        const baseCur = Math.max(baseline, effCur - freeEff);
        
        // Create entries for each rank increase
        for (let r = baseline + 1; r <= baseCur; r++) {
          const cost = this.actor._xpStepCostForTrait?.(r, freeEff, disc) || (4 * r);
          const traitLabel = game.i18n.localize(`l5r4.ui.mechanics.traits.${traitKey}`) || traitKey.toUpperCase();
          
          // Use same format as real-time trait changes to prevent duplicates
          const note = game.i18n.format("l5r4.character.experience.traitChange", { 
            label: traitLabel, 
            from: r - 1, 
            to: r 
          });
          const entryKey = `trait:${note}`;
          
          // Only add if this entry doesn't already exist
          if (!existingEntries.has(entryKey)) {
            spent.push({
              id: foundry.utils.randomID(),
              delta: cost,
              note: note,
              type: "trait",
              traitLabel: traitLabel,
              fromValue: r - 1,
              toValue: r,
              ts: Date.now() - (baseCur - r) * 1000 // Fake timestamps in reverse order
            });
            existingEntries.add(entryKey);
          }
        }
      }

      // Rebuild void purchases
      // Like traits, subtract Active Effect bonuses to get base purchased value
      const voidEffCur = parseInt(sys?.rings?.void?.rank ?? sys?.rings?.void?.value ?? sys?.rings?.void ?? 0);
      const voidFreeBase = parseInt(freeTraitBase?.void ?? 0);
      const voidFreeEff = voidFreeBase > 0 ? 0 : parseInt(this.actor._creationFreeBonusVoid?.() ?? 0);
      const voidBaseline = 2 + voidFreeBase;
      const voidBaseCur = Math.max(voidBaseline, voidEffCur - voidFreeEff);
      
      if (voidBaseCur > voidBaseline) {
        for (let r = voidBaseline + 1; r <= voidBaseCur; r++) {
          const cost = 6 * r + parseInt(traitDiscounts?.void ?? 0);
          
          // Use same format as real-time void changes to prevent duplicates
          const note = game.i18n.format("l5r4.character.experience.voidChange", { 
            from: r - 1, 
            to: r 
          });
          const entryKey = `void:${note}`;
          
          // Only add if this entry doesn't already exist
          if (!existingEntries.has(entryKey)) {
            spent.push({
              id: foundry.utils.randomID(),
              delta: Math.max(0, cost),
              note: note,
              type: "void",
              fromValue: r - 1,
              toValue: r,
              ts: Date.now() - (voidBaseCur - r) * 1000
            });
            existingEntries.add(entryKey);
          }
        }
      }

      // Rebuild skill purchases
      for (const item of this.actor.items) {
        // Defensive check: ensure this is an actual Item document, not an Active Effect
        if (!item || typeof item.type !== "string" || item.type !== "skill") continue;
        
        const rank = parseInt(item.system?.rank) || 0;
        const freeRanks = Math.max(0, parseInt(item.system?.freeRanks) || 0);
        
        if (rank > freeRanks) {
          // Create individual entries for each rank increase above free ranks
          for (let r = freeRanks + 1; r <= rank; r++) {
            const note = `${item.name} ${r}`;
            const entryKey = `skill:${note}`;
            
            // Only add if this entry doesn't already exist
            if (!existingEntries.has(entryKey)) {
              spent.push({
                id: foundry.utils.randomID(),
                delta: r,
                note: note,
                type: "skill",
                skillName: item.name,
                fromValue: r - 1,
                toValue: r,
                ts: Date.now() - (100 - r) * 1000
              });
              existingEntries.add(entryKey);
            }
          }
        }

        // Add emphasis costs (excluding free emphasis)
        const emph = String(item.system?.emphasis ?? "").trim();
        if (emph) {
          const emphases = emph.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
          const freeEmphasis = Math.max(0, parseInt(item.system?.freeEmphasis) || 0);
          const paidEmphases = emphases.slice(freeEmphasis); // Skip free emphasis count
          
          paidEmphases.forEach((emphasis, index) => {
            const note = `${item.name} - Emphasis: ${emphasis}`;
            const entryKey = `skill:${note}`;
            
            // Only add if this entry doesn't already exist
            if (!existingEntries.has(entryKey)) {
              spent.push({
                id: foundry.utils.randomID(),
                delta: 2,
                note: note,
                type: "skill",
                skillName: item.name,
                emphasis: emphasis,
                fromValue: 0,
                toValue: 1,
                ts: Date.now() - (50 - index) * 1000
              });
              existingEntries.add(entryKey);
            }
          });
        }
      }

      // Rebuild advantage, disadvantage, kata, and kiho purchases
      for (const item of this.actor.items) {
        // Defensive check: ensure this is an actual Item document with a valid type
        if (!item || typeof item.type !== "string") continue;
        if (item.type !== "advantage" && item.type !== "disadvantage" && item.type !== "kata" && item.type !== "kiho") continue;
        
        const cost = parseInt(item.system?.cost) || 0;
        if (cost > 0) {
          // Disadvantages should show as negative XP (they grant XP to the character)
          const delta = item.type === "disadvantage" ? -cost : cost;
          const note = item.name;
          const entryKey = `${item.type}:${note}`;
          
          // Only add if this entry doesn't already exist
          if (!existingEntries.has(entryKey)) {
            spent.push({
              id: foundry.utils.randomID(),
              delta: delta,
              note: note,
              type: item.type,
              itemName: item.name,
              ts: Date.now() - Math.random() * 10000
            });
            existingEntries.add(entryKey);
          }
        }
      }

      // Sort by timestamp
      spent.sort((a, b) => (a.ts || 0) - (b.ts || 0));

      // Update if data changed (additions, removals, or order)
      const changed = JSON.stringify(existingSpent) !== JSON.stringify(spent);
      if (changed) await this.actor.setFlag(SYS_ID, "xpSpent", spent);
      
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to rebuild XP purchase history", err);
    }
  }
}
