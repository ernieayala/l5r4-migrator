import * as Dice from "../dice.js";

export default class L5R4NpcSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/l5r4/templates/sheets/npc-sheet.hbs",
      classes: ["l5r4", "npc"],
      width: 650
    })
  }

  get template() {
    if (!game.user.isGM && this.actor.limited) {
      return "systems/l5r4/templates/sheets/limited-npc-sheet.hbs";
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

    baseData.skills = baseData.items.filter(function (item) { return item.type == "skill" });

    return baseData;
  }

  _getCurrentWoundLevel() {
    const woundLvls = Object.values(this.actor.system.woundLvlsUsed);
    const currentLevel = woundLvls.filter(woundLvl => woundLvl.current === true).reduce((maxWoundLevel, currentWoundLevel) => {
      return Number(maxWoundLevel.penalty) > Number(currentWoundLevel.penalty) ? maxWoundLevel : currentWoundLevel;
    });
    return currentLevel || this.actor.system.woundLvlsUsed.healthy
  }

  get woundPenalty() {
    const currentWoundLevel = this._getCurrentWoundLevel();
    return Number(currentWoundLevel.penalty);
  }

  activateListeners(html) {
    //TEMPLATE: html.find(cssSelector).event(this._someCallBack.bind(this)); 

    if (this.actor.isOwner) {
      html.find(".item-create").click(this._onItemCreate.bind(this));
      html.find(".item-edit").click(this._onItemEdit.bind(this));
      html.find(".item-delete").click(this._onItemDelete.bind(this));
      html.find(".inline-edit").change(this._onInlineItemEdit.bind(this));

      html.find(".attack1-roll").click(this._onAttackRoll.bind(this));
      html.find(".attack2-roll").click(this._onAttackRoll.bind(this));
      html.find(".damage1-roll").click(this._onDamageRoll.bind(this));
      html.find(".damage2-roll").click(this._onDamageRoll.bind(this));
      html.find(".simple-roll").click(this._onSimpleRoll.bind(this));
      html.find(".skill-roll").click(this._onSkillRoll.bind(this));
    }

    super.activateListeners(html);
  }

  async _onSimpleRoll(event) {
    const woundPenalty = this.woundPenalty;
    const diceRoll = event.currentTarget.dataset.roll;
    const diceKeep = event.currentTarget.dataset.keep;
    const rollTypeLabel = event.currentTarget.dataset.rolllabel;
    const trait = event.currentTarget.dataset.trait;
    const rollName = `${this.actor.name}: ${rollTypeLabel} ${trait}`;
    const toggleOptions = event.shiftKey;
    const rollType = event.currentTarget.dataset.rolltype;
    return await Dice.NpcRoll(
      {
        woundPenalty,
        diceRoll,
        diceKeep,
        rollName,
        toggleOptions,
        rollType
      }
    )
  }

  async _onAttackRoll(event) {
    const dataset = event.currentTarget.dataset;
    const woundPenalty = this.woundPenalty;
    const diceRoll = dataset.roll;
    const diceKeep = dataset.keep;
    const desc = dataset.desc.toLowerCase();
    const rollName = `${this.actor.name}: ${game.i18n.localize(`l5r4.mech.${desc}`)} ${game.i18n.localize("l5r4.mech.attackRoll")}`;
    const description =  dataset.dmgdesc ? `${dataset.dmgdesc}` : ''
    const toggleOptions = event.shiftKey;
    const rollType = "skill";

    return await Dice.NpcRoll(
      {
        woundPenalty,
        diceRoll,
        diceKeep,
        rollName,
        description,
        toggleOptions,
        rollType
      }
    )
  }

  async _onDamageRoll(event) {
    const diceRoll = event.currentTarget.dataset.roll;
    const diceKeep = event.currentTarget.dataset.keep;
    const rollName = `${this.actor.name}: ${game.i18n.localize("l5r4.mech.damageRoll")}`;
    const description = event.currentTarget.dataset.desc;
    const toggleOptions = event.shiftKey;
    const rollType = "skill";

    return await Dice.NpcRoll(
      {
        diceRoll,
        diceKeep,
        rollName,
        description,
        toggleOptions,
        rollType
      }
    )
  }

  async _onItemCreate(event) {
    event.preventDefault();
    let element = event.currentTarget;
    let elementType = element.dataset.type;
    let itemData = {};
    if (elementType == "equipment") {
      let equipmentOptions = await Chat.GetItemOptions(elementType);
      if (equipmentOptions.cancelled) { return; }
      itemData = {
        name: equipmentOptions.name,
        type: equipmentOptions.type
      }
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    } else if (elementType == "spell") {
      let spellOptions = await Chat.GetItemOptions(elementType);
      if (spellOptions.cancelled) { return; }
      itemData = {
        name: spellOptions.name,
        type: spellOptions.type
      }
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    } else {
      itemData = {
        name: game.i18n.localize("l5r4.sheet.new"),
        type: element.dataset.type
      }
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }
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

  _onSkillRoll(event) {
    const itemID = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.items.get(itemID);
    let skillTrait = item.system.trait;
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
      woundPenalty: this.woundPenalty,
      actorTrait: actorTrait,
      skillRank: skillRank,
      skillName: skillName,
      askForOptions: event.shiftKey,
      npc: true,
      skillTrait
    });
  }
}