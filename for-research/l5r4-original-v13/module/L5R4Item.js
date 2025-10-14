export default class L5R4Item extends Item {
  chatTemplate = {
    "weapon": "systems/l5r4/templates/partials/weapon-card.hbs",
    "bow": "systems/l5r4/templates/partials/weapon-card.hbs",
    "skill": "systems/l5r4/templates/partials/skill-card.hbs",
    "armor": "systems/l5r4/templates/partials/armor-card.hbs",
    "spell": "systems/l5r4/templates/partials/spell-card.hbs",
    "technique": "systems/l5r4/templates/partials/technique-card.hbs",
    "advantage": "systems/l5r4/templates/partials/advantage-card.hbs",
    "disadvantage": "systems/l5r4/templates/partials/disadvantage-card.hbs",
    "kata": "systems/l5r4/templates/partials/kata-card.hbs",
    "kiho": "systems/l5r4/templates/partials/kiho-card.hbs",
    "tattoo": "systems/l5r4/templates/partials/tattoo-card.hbs"
  };

  async _preCreate(data, options, userId) {
    await super._preCreate(data, options, userId);
    // change default image
    let img = null;
    if (data.img === undefined) {
      switch (this.type) {
        case 'weapon':
          img = "systems/l5r4/assets/icons/sword.png";
          break;
        case 'bow':
          img = "systems/l5r4/assets/icons/bow.png";
          break;
        case 'skill':
          img = "systems/l5r4/assets/icons/flower.png";
          break;
        case 'armor':
          img = "systems/l5r4/assets/icons/hat.png";
          break;
        case 'spell':
          img = "systems/l5r4/assets/icons/scroll2.png";
          break;
        case 'technique':
          img = "systems/l5r4/assets/icons/kanji.png";
          break;
        case 'advantage':
          img = "systems/l5r4/assets/icons/yin-yang.png";
          break;
        case 'disadvantage':
          img = "systems/l5r4/assets/icons/yin-yang.png";
          break;
        case 'kata':
          img = "systems/l5r4/assets/icons/scroll.png";
          break;
        case 'kiho':
          img = "systems/l5r4/assets/icons/tori.png";
          break;
        case 'tattoo':
          img = "systems/l5r4/assets/icons/tattoo.png";
          break;

      }
      if (img) await this.updateSource({ img: img });
    }
  }

  prepareData() {
    super.prepareData();

    let itemData = this;
    let l5r4Data = itemData.system;

    // get damage from arrows for bows
    if (itemData.type == "bow") {
      let actorData;
      let actorStr = 0;
      // get pc str
      if (this.actor) {
        if (this.actor.system) {
          actorData = this.actor.system;
          actorStr = parseInt(actorData.traits.str);
        }
      }
      let arrowRoll = 0;
      let arrowKeep = 0;
      let arrow = game.i18n.localize(`l5r4.arrows.${l5r4Data.arrow}`);
      switch (arrow) {
        case game.i18n.localize("l5r4.arrows.armor"):
          arrowRoll = 1;
          arrowKeep = 1;
          break;
        case game.i18n.localize("l5r4.arrows.flesh"):
          arrowRoll = 2;
          arrowKeep = 3;
          break;
        case game.i18n.localize("l5r4.arrows.humming"):
          arrowRoll = 0;
          arrowKeep = 1;
          break;
        case game.i18n.localize("l5r4.arrows.rope"):
          arrowRoll = 1;
          arrowKeep = 1;
          break;
        case game.i18n.localize("l5r4.arrows.willow"):
          arrowRoll = 2;
          arrowKeep = 2;
          break;
      }
      l5r4Data.damageRoll = Math.min(parseInt(l5r4Data.str), actorStr) + arrowRoll;
      l5r4Data.damageKeep = arrowKeep;
      l5r4Data.damageFormula = `${l5r4Data.damageRoll}k${l5r4Data.damageKeep}`;
    }


  }

  async roll() {
    const item = this;

    // Initialize chat data.

    let content = await foundry.applications.handlebars.renderTemplate(this.chatTemplate[this.type], item);
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}]`;

    // send a chat message.

    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: content ?? ''
    });

  }
}