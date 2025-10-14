import * as Dice from "../dice.js";
import * as Chat from "../chat.js";

const { sheets } = foundry.applications;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class L5R4PcSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["l5r4", "pc"],
    position: {
      width: 950,
      height: "auto"
    },
    form: {
      submitOnChange: true
    },
    window: {
      title: "ACTOR.TypeCharacter",
      resizable: true
    },
    actions: {
      rollRing: L5R4PcSheet._onRingRoll,
      rollTrait: L5R4PcSheet._onTraitRoll,
      rollSkill: L5R4PcSheet._onSkillRoll,
      rollWeapon: L5R4PcSheet._onWeaponRoll,
      rollItem: L5R4PcSheet._onItemRoll,
      createItem: L5R4PcSheet._onItemCreate,
      editItem: L5R4PcSheet._onItemEdit,
      deleteItem: L5R4PcSheet._onItemDelete,
      sortSkills: L5R4PcSheet._changeSortProperty,
      editImage: L5R4PcSheet._onEditImage
    }
  };

  static PARTS = {
    full: {
      template: "systems/l5r4/templates/sheets/pc-sheet.hbs",
      classes: ["scrollable"]
    },
    limited: {
      template: "systems/l5r4/templates/sheets/limited-pc-sheet.hbs",
      classes: ["scrollable"]
    }
  };

  constructor(options = {}) {
    super(options);
    this.sortSkillsBy = "rank";
  }

  

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    if (!game.user.isGM && this.document.limited) {
      options.parts = ["limited"];
    } else {
      options.parts = ["full"];
    }
  }

  get title() {
    return `PC: ${this.document.name}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.actor = this.actor;
    context.system = this.actor.system;
    context.config = CONFIG.l5r4;
    context.owner = this.actor.isOwner;
    context.editable = this.isEditable;
    context.cssClass = this.actor.isOwner ? "editable" : "locked";

    context.usetabs = game.settings.get("l5r4", "usePcTabs");

    context.commonItems = this.actor.items.filter(i => i.type === "commonItem");
    context.weapons = this.actor.items.filter(i => i.type === "weapon");
    context.bows = this.actor.items.filter(i => i.type === "bow");
    context.armors = this.actor.items.filter(i => i.type === "armor");
    context.skills = this._sortSkills(this.actor.items.filter(i => i.type === "skill"));
    context.techniques = this.actor.items.filter(i => i.type === "technique");
    context.advantages = this.actor.items.filter(i => i.type === "advantage");
    context.disadvantages = this.actor.items.filter(i => i.type === "disadvantage");
    context.spells = this.actor.items.filter(i => i.type === "spell");
    context.katas = this.actor.items.filter(i => i.type === "kata");
    context.kihos = this.actor.items.filter(i => i.type === "kiho");
    context.tattoos = this.actor.items.filter(i => i.type === "tattoo");

    context.masteries = [];
    for (let skill of context.skills) {
      if (skill.system.mastery_3 != "" && skill.system.rank >= 3)
        context.masteries.push({ _id: skill._id, name: `${skill.name} 3`, mastery: skill.system.mastery_3 });
      if (skill.system.mastery_5 != "" && skill.system.rank >= 5)
        context.masteries.push({ _id: skill._id, name: `${skill.name} 5`, mastery: skill.system.mastery_5 });
      if (skill.system.mastery_7 != "" && skill.system.rank >= 7)
        context.masteries.push({ _id: skill._id, name: `${skill.name} 7`, mastery: skill.system.mastery_7 });
    }

    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.notes, {secrets: this.document.isOwner});

    return context;
  }

  _sortSkills(skills) {
    const property = this.sortSkillsBy;
    if (property === 'name') {
      return skills.sort((a, b) => {
        if (a[property] < b[property]) return -1;
        if (a[property] > b[property]) return 1;
        return 0;
      });
    } else if (property === 'rank') {
      return skills.sort((a, b) => b.system[property] - a.system[property]);
    } else {
      return skills.sort((a, b) => {
        if (a.system[property] < b.system[property]) return -1;
        if (a.system[property] > b.system[property]) return 1;
        return 0;
      });
    }
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const html = this.element;

    if (this.actor.isOwner) {
      this._setupContextMenus(html);
    }

    if (context.usetabs) {
      this._setupTabs(html);
    }
  }

  _setupTabs(html) {
    const tabsElement = html.querySelector('.sheet-tabs');
    if (!tabsElement) return;

    const tabs = tabsElement.querySelectorAll('a[data-tab]');
    const contents = html.querySelectorAll('.tab[data-tab]');

    // Set initial active tab if none is active
    if (!tabsElement.querySelector('a.active')) {
      const firstTab = tabs[0];
      if (firstTab) {
        firstTab.classList.add('active');
        const firstContent = html.querySelector(`.tab[data-tab="${firstTab.dataset.tab}"]`);
        if (firstContent) {
          firstContent.classList.add('active');
        }
      }
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        const targetTab = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        contents.forEach(content => {
          if (content.dataset.tab === targetTab) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      });
    });
  }

  _setupContextMenus(html) {
    const menuItems = [
      {
        name: game.i18n.localize("l5r4.sheet.edit"),
        icon: '<i class="fas fa-edit"></i>',
        callback: element => {
          const item = this.actor.items.get(element.dataset.itemId);
          item.sheet.render(true);
        }
      },
      {
        name: game.i18n.localize("l5r4.mech.toChat"),
        icon: '<i class="fas fa-comment"></i>',
        callback: element => {
          const item = this.actor.items.get(element.dataset.itemId);
          item.roll();
        }
      },
      {
        name: game.i18n.localize("l5r4.sheet.delete"),
        icon: '<i class="fas fa-trash"></i>',
        callback: element => {
          this.actor.deleteEmbeddedDocuments("Item", [element.dataset.itemId]);
        }
      }
    ];

    new foundry.applications.ux.ContextMenu.implementation(html, ".skill-item", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".commonItem-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".armor-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".weapon-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".spell-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".technique-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".advantage-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".disadvantage-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".kata-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".kiho-card", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".tattoo-card", menuItems, { jQuery: false });
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    htmlElement.querySelectorAll('input:not([data-action]), select:not([data-action]), textarea:not([data-action])').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.addEventListener('change', this._onFormFieldChange.bind(this));
      } else {
        el.addEventListener('change', this._onFormFieldChange.bind(this));
      }
    });

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

    await this.document.update({ [field]: value });
  }

  static async _onRingRoll(event, target) {
    const sheet = this;
    const ringRank = target.dataset.ringRank;
    const ringName = target.dataset.ringName;
    const systemRing = target.dataset.systemRing;
    const schoolRank = sheet.actor.system.insight.rank;

    const spell = await Dice.RingRoll({
      woundPenalty: sheet.actor.system.woundPenalty,
      ringRank: ringRank,
      ringName: ringName,
      systemRing: systemRing,
      schoolRank: schoolRank,
      askForOptions: event.shiftKey,
      unskilled: event.ctrlKey
    });

    if (spell.voidSlot) {
      sheet._consumeSpellSlot('void');
    } else if (spell.spellSlot) {
      sheet._consumeSpellSlot(spell.systemRing, spell.ringName);
    }
  }

  _consumeSpellSlot(systemRing, ringName) {
    const currentSlots = this.actor.system.spellSlots[systemRing];
    if (currentSlots <= 0) {
      const warning = `${game.i18n.localize("l5r4.errors.noSpellSlots")}: ${ringName}`;
      ui.notifications.warn(warning);
      return;
    }
    const newSlotValue = currentSlots - 1;
    const ringToUpdate = `system.spellSlots.${systemRing}`;
    this.actor.update({ [`${ringToUpdate}`]: newSlotValue });
  }

  static _onTraitRoll(event, target) {
    const sheet = this;
    const traitRank = target.dataset.traitRank;
    const traitName = target.dataset.traitName;

    Dice.TraitRoll({
      woundPenalty: sheet.actor.system.woundPenalty,
      traitRank: traitRank,
      traitName: traitName,
      askForOptions: event.shiftKey
    });
  }

  static _onSkillRoll(event, target) {
    const sheet = this;
    const itemElement = target.closest(".item");
    if (!itemElement) {
      console.error("Could not find parent .item element", target);
      return;
    }
    const itemID = itemElement.dataset.itemId;
    const item = sheet.actor.items.get(itemID);

    if (!item) {
      console.error("Could not find item with ID:", itemID);
      return ui.notifications.error("Item not found");
    }

    const skillTrait = item.system.trait;
    const rollBonus = item.system.roll_bonus;
    const keepBonus = item.system.keep_bonus;
    const totalBonus = item.system.total_bonus;

    let actorTrait = null;
    if (skillTrait === 'void') {
      actorTrait = sheet.actor.system.rings.void.rank;
    } else {
      actorTrait = sheet.actor.system.traits[skillTrait];
    }

    const skillRank = item.system.rank;
    const skillName = item.name;

    Dice.SkillRoll({
      woundPenalty: sheet.actor.system.woundPenalty,
      actorTrait: actorTrait,
      skillRank: skillRank,
      skillName: skillName,
      askForOptions: event.shiftKey,
      skillTrait,
      rollBonus: rollBonus,
      keepBonus: keepBonus,
      totalBonus: totalBonus
    });
  }

  static _onWeaponRoll(event, target) {
    const sheet = this;
    const itemElement = target.closest(".item");
    if (!itemElement) {
      console.error("Could not find parent .item element", target);
      return;
    }
    const itemID = itemElement.dataset.itemId;
    const item = sheet.actor.items.get(itemID);

    if (!item) {
      console.error("Could not find item with ID:", itemID);
      return ui.notifications.error("Item not found");
    }

    const weaponName = item.name;
    const rollData = item.getRollData();
    let diceRoll;
    let diceKeep;
    const explodesOn = rollData.explodesOn ? rollData.explodesOn : 10;

    if (item.type === 'weapon') {
      const actorTrait = sheet.actor.system.traits.str;
      diceRoll = parseInt(actorTrait) + parseInt(item.system.damageRoll);
    } else if (item.type === 'bow') {
      diceRoll = rollData.damageRoll;
      diceKeep = rollData.damageKeep;
    } else {
      return ui.notifications.error(`Invalid weapon type`);
    }

    diceKeep = parseInt(item.system.damageKeep);

    Dice.WeaponRoll({
      diceRoll: diceRoll,
      diceKeep: diceKeep,
      explodesOn: explodesOn,
      weaponName: weaponName,
      description: rollData.description,
      askForOptions: event.shiftKey
    });
  }

  static _onItemRoll(event, target) {
    const sheet = this;
    const itemElement = target.closest(".item");
    if (!itemElement) {
      console.error("Could not find parent .item element", target);
      return;
    }
    const itemId = itemElement.dataset.itemId;
    const item = sheet.actor.items.get(itemId);

    if (!item) {
      console.error("Could not find item with ID:", itemId);
      return ui.notifications.error("Item not found");
    }

    item.roll();
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
    } else if (elementType === "advantage") {
      const advantageOptions = await Chat.GetItemOptions(elementType);
      if (advantageOptions.cancelled) { return; }
      itemData = {
        name: advantageOptions.name,
        type: advantageOptions.type
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
    const itemElement = target.closest(".item");
    if (!itemElement) {
      console.error("Could not find parent .item element", target);
      return;
    }
    const itemId = itemElement.dataset.itemId;
    const item = sheet.actor.items.get(itemId);

    if (!item) {
      console.error("Could not find item with ID:", itemId);
      return ui.notifications.error("Item not found");
    }

    item.sheet.render(true);
  }

  static _onItemDelete(event, target) {
    event.preventDefault();
    const sheet = this;
    const itemElement = target.closest(".item");
    if (!itemElement) {
      console.error("Could not find parent .item element", target);
      return;
    }
    const itemId = itemElement.dataset.itemId;

    if (!itemId) {
      console.error("No itemId found on element", itemElement);
      return ui.notifications.error("Item ID not found");
    }

    return sheet.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  static _changeSortProperty(event, target) {
    const sheet = this;
    sheet.sortSkillsBy = target.dataset.sortby;
    sheet.render(true);
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
