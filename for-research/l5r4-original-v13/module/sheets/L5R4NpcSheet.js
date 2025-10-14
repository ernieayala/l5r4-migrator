import * as Dice from "../dice.js";
import * as Chat from "../chat.js";

const { sheets } = foundry.applications;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class L5R4NpcSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["l5r4", "npc"],
    position: {
      width: 650,
      height: "auto"
    },
     form: {
      submitOnChange: true
    },
    window: {
      title: "ACTOR.TypeNpc",
      resizable: true
    },
    actions: {
      rollAttack: L5R4NpcSheet._onAttackRoll,
      rollDamage: L5R4NpcSheet._onDamageRoll,
      rollSkill: L5R4NpcSheet._onSkillRoll,
      simpleRoll: L5R4NpcSheet._onSimpleRoll,
      createItem: L5R4NpcSheet._onItemCreate,
      editItem: L5R4NpcSheet._onItemEdit,
      deleteItem: L5R4NpcSheet._onItemDelete,
      editImage: L5R4NpcSheet._onEditImage
    }
  };

  static PARTS = {
    full: {
      template: "systems/l5r4/templates/sheets/npc-sheet.hbs",
      classes: ["scrollable"]
    },
    limited: {
      template: "systems/l5r4/templates/sheets/limited-npc-sheet.hbs",
      classes: ["scrollable"]
    }
  };

  // Configure render options to select template (limited vs full)
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // Check if limited view should be shown
    if (!game.user.isGM && this.document.limited) {
      options.parts = ["limited"];
    } else {
      options.parts = ["full"];
    }
  }

  // Override title to show actor name
  get title() {
    return `NPC: ${this.document.name}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Add actor reference and properties
    context.actor = this.actor;
    context.system = this.actor.system;
    context.config = CONFIG.l5r4;
    context.owner = this.actor.isOwner;
    context.editable = this.isEditable;
    context.cssClass = this.actor.isOwner ? "editable" : "locked";

    // Filter items by type
    context.skills = this.actor.items.filter(i => i.type === "skill");

    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.notes, {secrets: this.document.isOwner});


    return context;
  }

  _getCurrentWoundLevel() {
    const woundLvls = Object.values(this.actor.system.woundLvlsUsed);
    const currentLevel = woundLvls.filter(woundLvl => woundLvl.current === true).reduce((maxWoundLevel, currentWoundLevel) => {
      return Number(maxWoundLevel.penalty) > Number(currentWoundLevel.penalty) ? maxWoundLevel : currentWoundLevel;
    });
    return currentLevel || this.actor.system.woundLvlsUsed.healthy;
  }

  get woundPenalty() {
    const currentWoundLevel = this._getCurrentWoundLevel();
    return Number(currentWoundLevel.penalty);
  }

  // Attach event listeners to handle form changes
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    // Handle input changes for text fields, numbers, selects (actor stats)
    htmlElement.querySelectorAll('input:not([data-action]), select:not([data-action]), textarea:not([data-action])').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.addEventListener('change', this._onFormFieldChange.bind(this));
      } else {
        el.addEventListener('change', this._onFormFieldChange.bind(this));
      }
    });

    // Handle inline item edits (skills, etc.) - data-action="inlineEdit"
    htmlElement.querySelectorAll('[data-action="inlineEdit"]').forEach(el => {
      el.addEventListener('change', (event) => {
        const target = event.currentTarget;
        const itemId = target.closest(".item").dataset.itemId;
        const item = this.actor.items.get(itemId);
        const field = target.dataset.field;

        if (target.type === "checkbox") {
          item.update({ [field]: target.checked });
        } else {
          item.update({ [field]: target.value });
        }
      });
    });
  }

  // Handle form field changes for actor stats
  async _onFormFieldChange(event) {
    const element = event.target;
    const field = element.name;

    if (!field) return;

    let value;
    if (element.type === 'checkbox') {
      value = element.checked;
    } else if (element.type === 'number') {
      value = element.valueAsNumber;
    } else {
      value = element.value;
    }

    // Update the actor document
    await this.document.update({ [field]: value });
  }

  // Event Handlers (static methods for V2)
  static async _onSimpleRoll(event, target) {
    const sheet = this;
    const woundPenalty = sheet.woundPenalty;
    const diceRoll = target.dataset.roll;
    const diceKeep = target.dataset.keep;
    const rollTypeLabel = target.dataset.rolllabel;
    const trait = target.dataset.trait;
    const rollName = `${sheet.actor.name}: ${rollTypeLabel} ${trait}`;
    const toggleOptions = event.shiftKey;
    const rollType = target.dataset.rolltype;

    return await Dice.NpcRoll({
      woundPenalty,
      diceRoll,
      diceKeep,
      rollName,
      toggleOptions,
      rollType
    });
  }

  static async _onAttackRoll(event, target) {
    const sheet = this;
    const dataset = target.dataset;
    const woundPenalty = sheet.woundPenalty;
    const diceRoll = dataset.roll;
    const diceKeep = dataset.keep;
    const desc = dataset.desc.toLowerCase();
    const rollName = `${sheet.actor.name}: ${game.i18n.localize(`l5r4.mech.${desc}`)} ${game.i18n.localize("l5r4.mech.attackRoll")}`;
    const description = dataset.dmgdesc ? `${dataset.dmgdesc}` : '';
    const toggleOptions = event.shiftKey;
    const rollType = "skill";

    return await Dice.NpcRoll({
      woundPenalty,
      diceRoll,
      diceKeep,
      rollName,
      description,
      toggleOptions,
      rollType
    });
  }

  static async _onDamageRoll(event, target) {
    const sheet = this;
    const diceRoll = target.dataset.roll;
    const diceKeep = target.dataset.keep;
    const rollName = `${sheet.actor.name}: ${game.i18n.localize("l5r4.mech.damageRoll")}`;
    const description = target.dataset.desc;
    const toggleOptions = event.shiftKey;
    const rollType = "skill";

    return await Dice.NpcRoll({
      diceRoll,
      diceKeep,
      rollName,
      description,
      toggleOptions,
      rollType
    });
  }

  static async _onItemCreate(event, target) {
    event.preventDefault();
    const sheet = this;
    const elementType = target.dataset.type;
    let itemData = {};

    if (elementType === "equipment") {
      const equipmentOptions = await Chat.GetItemOptions(elementType);
      if (equipmentOptions.cancelled) { return; }
      itemData = {
        name: equipmentOptions.name,
        type: equipmentOptions.type
      };
      return sheet.actor.createEmbeddedDocuments("Item", [itemData]);
    } else if (elementType === "spell") {
      const spellOptions = await Chat.GetItemOptions(elementType);
      if (spellOptions.cancelled) { return; }
      itemData = {
        name: spellOptions.name,
        type: spellOptions.type
      };
      return sheet.actor.createEmbeddedDocuments("Item", [itemData]);
    } else {
      itemData = {
        name: game.i18n.localize("l5r4.sheet.new"),
        type: target.dataset.type
      };
      return sheet.actor.createEmbeddedDocuments("Item", [itemData]);
    }
  }

  static _onItemEdit(event, target) {
    event.preventDefault();
    const sheet = this;
    const itemId = target.closest(".item").dataset.itemId;
    const item = sheet.actor.items.get(itemId);

    item.sheet.render(true);
  }

  static _onItemDelete(event, target) {
    event.preventDefault();
    const sheet = this;
    const itemId = target.closest(".item").dataset.itemId;

    return sheet.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  static _onSkillRoll(event, target) {
    const sheet = this;
    const itemID = target.closest(".item").dataset.itemId;
    const item = sheet.actor.items.get(itemID);
    let skillTrait = item.system.trait;
    let actorTrait = null;

    // Some skills use the void ring as a trait
    if (skillTrait === 'void') {
      actorTrait = sheet.actor.system.rings.void.rank;
    } else {
      actorTrait = sheet.actor.system.traits[skillTrait];
    }

    let skillRank = item.system.rank;
    let skillName = item.name;

    Dice.SkillRoll({
      woundPenalty: sheet.woundPenalty,
      actorTrait: actorTrait,
      skillRank: skillRank,
      skillName: skillName,
      askForOptions: event.shiftKey,
      npc: true,
      skillTrait
    });
  }

  static async _onEditImage(event, target) {
    const sheet = this;
    const fp = new FilePicker({
      type: "image",
      current: sheet.actor.img,
      callback: path => {
        sheet.actor.update({ img: path });
      }
    });
    return fp.browse();
  }
}
