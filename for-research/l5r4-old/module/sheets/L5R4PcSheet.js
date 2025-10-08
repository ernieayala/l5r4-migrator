import * as Dice from "../dice.js";
import * as Chat from "../chat.js";

export default class L5R4PcSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/l5r4/templates/sheets/pc-sheet.hbs",
      classes: ["l5r4", "pc"],
      width: 879,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.tabs-content',
          initial: 'skill-tab',
        },
      ],
    })
  }

  itemContextMenu = [
    {
      name: game.i18n.localize("l5r4.sheet.edit"),
      icon: '<i class="fas fa-edit"></i>',
      callback: element => {
        const item = this.actor.items.get(element.data("item-id"));
        item.sheet.render(true);
      }
    },
    {
      name: game.i18n.localize("l5r4.mech.toChat"),
      icon: '<i class="fas fa-edit"></i>',
      callback: element => {
        let item = this.actor.items.get(element.data("item-id"));
        item.roll();
      }
    },
    {
      name: game.i18n.localize("l5r4.sheet.delete"),
      icon: '<i class="fas fa-trash"></i>',
      callback: element => {
        this.actor.deleteEmbeddedDocuments("Item", [element.data("item-id")]);
      }
    }
  ];

  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return "systems/l5r4/templates/sheets/limited-pc-sheet.hbs";
    }
    return this.options.template;
  }

  getData() {
    // Retrieve the data structure from the base sheet.
    const baseData = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to base structure for easier access
    baseData.system = actorData.system;

    // Add config data to base sctructure
    baseData.config = CONFIG.l5r4;

    baseData.usetabs = game.settings.get("l5r4", "usePcTabs");

    baseData.commonItems = baseData.items.filter(function (item) { return item.type == "commonItem" });
    baseData.weapons = baseData.items.filter(function (item) { return item.type == "weapon" });
    baseData.bows = baseData.items.filter(function (item) { return item.type == "bow" });
    baseData.armors = baseData.items.filter(function (item) { return item.type == "armor" });
    baseData.skills = this.constructItemLists(baseData).skills;
    baseData.techniques = baseData.items.filter(function (item) { return item.type == "technique" });
    baseData.advantages = baseData.items.filter(function (item) { return item.type == "advantage" });
    baseData.disadvantages = baseData.items.filter(function (item) { return item.type == "disadvantage" });
    baseData.spells = baseData.items.filter(function (item) { return item.type == "spell" });
    baseData.katas = baseData.items.filter(function (item) { return item.type == "kata" });
    baseData.kihos = baseData.items.filter(function (item) { return item.type == "kiho" });
    baseData.tattoos = baseData.items.filter(function (item) { return item.type == "tattoo" });

    baseData.masteries = [];
    for (let skill of baseData.skills) {
      if (skill.system.mastery_3 != "" && skill.system.rank >= 3)
        baseData.masteries.push({ _id: skill._id, name: `${skill.name} 3`, mastery: skill.system.mastery_3 });
      if (skill.system.mastery_5 != "" && skill.system.rank >= 5)
        baseData.masteries.push({ _id: skill._id, name: `${skill.name} 5`, mastery: skill.system.mastery_5 });
      if (skill.system.mastery_7 != "" && skill.system.rank >= 7)
        baseData.masteries.push({ _id: skill._id, name: `${skill.name} 7`, mastery: skill.system.mastery_7 });
    }
    this.sortSkillsBy = "rank";

    return baseData;
  }

  activateListeners(html) {
    //TEMPLATE: html.find(cssSelector).event(this._someCallBack.bind(this)); 

    // only owners should edit and add things
    if (this.actor.isOwner) {
      html.find(".item-create").click(this._onItemCreate.bind(this));
      html.find(".item-edit").click(this._onItemEdit.bind(this));
      html.find(".item-delete").click(this._onItemDelete.bind(this));
      html.find(".inline-edit").change(this._onInlineItemEdit.bind(this));
      html.find(".item-sort-by").click(this._changeSortProperty.bind(this));

      new ContextMenu(html, ".skill-item", this.itemContextMenu);
      new ContextMenu(html, ".commonItem-card", this.itemContextMenu);
      new ContextMenu(html, ".armor-card", this.itemContextMenu);
      new ContextMenu(html, ".weapon-card", this.itemContextMenu);
      new ContextMenu(html, ".spell-card", this.itemContextMenu);
      new ContextMenu(html, ".technique-card", this.itemContextMenu);
      new ContextMenu(html, ".advantage-card", this.itemContextMenu);
      new ContextMenu(html, ".disadvantage-card", this.itemContextMenu);
      new ContextMenu(html, ".kata-card", this.itemContextMenu);
      new ContextMenu(html, ".kiho-card", this.itemContextMenu);
      new ContextMenu(html, ".tattoo-card", this.itemContextMenu);

      html.find(".item-roll").click(this._onItemRoll.bind(this));
      html.find(".weapon-roll").click(this._onWeaponRoll.bind(this));
      html.find(".skill-roll").click(this._onSkillRoll.bind(this));
      html.find(".ring-roll").click(this._onRingRoll.bind(this));
      html.find(".trait-roll").click(this._onTraitRoll.bind(this));
    }

    super.activateListeners(html);
  }

  async _onRingRoll(event) {
    let ringRank = event.currentTarget.dataset.ringRank;
    let ringName = event.currentTarget.dataset.ringName;
    let systemRing = event.currentTarget.dataset.systemRing;
    let schoolRank = this.actor.system.insight.rank;
    let spell = false

    spell = await Dice.RingRoll(
      {
        woundPenalty: this.actor.system.woundPenalty,
        ringRank: ringRank,
        ringName: ringName,
        systemRing: systemRing,
        schoolRank: schoolRank,
        askForOptions: event.shiftKey,
        unskilled: event.ctrlKey
      }
    );
    if (spell.voidSlot) {
      this._consumeSpellSlot('void')
    } else if (spell.spellSlot) {
      this._consumeSpellSlot(spell.systemRing, spell.ringName)
    }
  }

  _consumeSpellSlot(systemRing, ringName) {
    let currentSlots = this.actor.system.spellSlots[systemRing];
    if (currentSlots <= 0) {
      let warning = `${game.i18n.localize("l5r4.errors.noSpellSlots")}: ${ringName}`;
      ui.notifications.warn(warning);
      return;
    }
    let newSlotValue = currentSlots - 1;
    let ringToUpdate = `system.spellSlots.${systemRing}`
    this.actor.update({ [`${ringToUpdate}`]: newSlotValue })
  }

  _onTraitRoll(event) {
    let traitRank = event.currentTarget.dataset.traitRank;
    let traitName = event.currentTarget.dataset.traitName;
    Dice.TraitRoll(
      {
        woundPenalty: this.actor.system.woundPenalty,
        traitRank: traitRank,
        traitName: traitName,
        askForOptions: event.shiftKey
      }
    );
  }

  _onWeaponRoll(event) {
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);

    let weaponName = item.name;
    let rollData = item.getRollData();
    let actorTrait;
    let diceRoll;
    let diceKeep;
    let explodesOn = rollData.explodesOn ? rollData.explodesOn : 10;
    if (item.type == 'weapon') {
      actorTrait = this.actor.system.traits.str;
      diceRoll = parseInt(actorTrait) + parseInt(item.system.damageRoll);
    } else if (item.type == 'bow') {
      diceRoll = rollData.damageRoll;
      diceKeep = rollData.damageKeep;
    } else {
      return ui.notifications.error(`y u do dis?`);
    }


    diceKeep = parseInt(item.system.damageKeep)
    Dice.WeaponRoll(
      {
        diceRoll: diceRoll,
        diceKeep: diceKeep,
        explodesOn: explodesOn,
        weaponName: weaponName,
        description: rollData.description,
        askForOptions: event.shiftKey
      }
    )

  }

  _onSkillRoll(event) {
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);
    let skillTrait = item.system.trait;
    let rollBonus = item.system.roll_bonus;
    let keepBonus = item.system.keep_bonus;
    let totalBonus = item.system.total_bonus;

    let actorTrait = null;
    // some skills use the void ring as a trait
    if (skillTrait == 'void') {
      actorTrait = this.actor.system.rings.void.rank;
    } else {
      actorTrait = this.actor.system.traits[skillTrait];
    }
    let skillRank = item.system.rank;
    let skillName = item.name;

    Dice.SkillRoll({
      woundPenalty: this.actor.system.woundPenalty,
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


  _onItemRoll(event) {
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);

    item.roll();
  }

  async _onItemCreate(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let elementType = element.dataset.type;
    let itemData = {};
    switch (elementType) {
      case "equipment":
        let equipmentOptions = await Chat.GetItemOptions(elementType);
        if (equipmentOptions.cancelled) { return; }
        itemData = {
          name: equipmentOptions.name,
          type: equipmentOptions.type
        }
        break;
      case "spell":
        let spellOptions = await Chat.GetItemOptions(elementType);
        if (spellOptions.cancelled) { return; }
        itemData = {
          name: spellOptions.name,
          type: spellOptions.type
        }
        break;
      case "advantage":
        let advantageOptions = await Chat.GetItemOptions(elementType);
        if (advantageOptions.cancelled) { return; }
        itemData = {
          name: advantageOptions.name,
          type: advantageOptions.type
        }
        break;
      default:
        itemData = {
          name: game.i18n.localize("l5r4.sheet.new"),
          type: element.dataset.type
        }
        break;
    }
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  _onItemEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);

    item.sheet.render(true);
  }

  _onItemDelete(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest(".item").dataset.itemId;

    return this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  _onInlineItemEdit(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let itemId = element.closest(".item").dataset.itemId;
    let item = this.actor.items.get(itemId);
    let field = element.dataset.field;


    if (element.type == "checkbox") {
      return item.update({ [field]: element.checked })
    }

    return item.update({ [field]: element.value })
  }


  sortCategories(items, property) {
    let skills = items.skills
    let sorted_skills;
    if (property == 'name') {
      sorted_skills = skills.sort(function (a, b) {
        if (a[property] < b[property]) {
          return -1;
        }
        if (a[property] > b[property]) {
          return 1;
        }
        return 0;
      });
    } else if (property == 'rank') {
      sorted_skills = skills.sort((a, b) => b.system[property] - a.system[property]);
    } else {
      sorted_skills = skills.sort(function (a, b) {
        if (a.system[property] < b.system[property]) {
          return -1;
        }
        if (a.system[property] > b.system[property]) {
          return 1;
        }
        return 0;
      });
    }
    return sorted_skills;
  }

  constructItemLists() {
    let items = {};
    let itemTypes = this.actor.itemTypes;
    items.skills = itemTypes.skill;
    this.sortCategories(items, this.sortSkillsBy);
    return items;
  }

  _changeSortProperty(event) {
    this.sortSkillsBy = event.currentTarget.dataset.sortby
    this.actor.sheet.render(true);
  }
}