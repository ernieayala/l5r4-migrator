export async function SkillRoll({
  woundPenalty = 0,
  actorTrait = null,
  skillRank = null,
  skillName = null,
  skillTrait = null,
  askForOptions = true,
  npc = false,
  rollBonus = 0,
  keepBonus = 0,
  totalBonus = 0 } = {}) {
  const messageTemplate = "systems/l5r4/templates/chat/simple-roll.hbs";

  const traitString = skillTrait === "void" ? "l5r4.rings.void" : `l5r4.traits.${skillTrait}`;

  let optionsSettings = game.settings.get("l5r4", "showSkillRollOptions");
  let rollType = game.i18n.localize("l5r4.mech.skillRoll");
  let label = `${rollType}: ${skillName} / ${game.i18n.localize(traitString)}`;
  let emphasis = false;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let applyWoundPenalty = true;

  if (askForOptions != optionsSettings) {
    const noVoid = npc && !game.settings.get("l5r4", "allowNpcVoidPoints");
    let checkOptions = await GetSkillOptions(skillName, noVoid, rollBonus, keepBonus, totalBonus);
    if (checkOptions.cancelled) {
      return;
    }

    emphasis = checkOptions.emphasis;
    applyWoundPenalty = checkOptions.applyWoundPenalty
    rollMod = parseInt(checkOptions.rollMod);
    keepMod = parseInt(checkOptions.keepMod);
    totalMod = parseInt(checkOptions.totalMod);

    if (checkOptions.void) {
      rollMod += 1;
      keepMod += 1;
      label += ` ${game.i18n.localize("l5r4.rings.void")}!`;
    }
  } else {
    rollMod = parseInt(rollBonus);
    keepMod = parseInt(keepBonus);
    totalMod = parseInt(totalBonus)
  }

  if (applyWoundPenalty) {
    totalMod = totalMod - woundPenalty;
  }

  let diceToRoll = parseInt(actorTrait) + parseInt(skillRank) + parseInt(rollMod);
  let diceToKeep = parseInt(actorTrait) + parseInt(keepMod);
  let { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);
  let rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;

  if (emphasis) {
    label += ` (${game.i18n.localize("l5r4.mech.emphasis")})`;
    rollFormula = `${diceRoll}d10r1k${diceKeep}x10+${bonus}`;
  }
  if (rollMod != 0 || keepMod != 0 || totalMod != 0) {
    if(totalMod<0){
      label += ` ${game.i18n.localize("l5r4.mech.mod")} (${rollMod}k${keepMod}${totalMod})`;
    }
    else {
    label += ` ${game.i18n.localize("l5r4.mech.mod")} (${rollMod}k${keepMod}+${totalMod})`;
    }
  }
  let rollResult = await new Roll(rollFormula).roll();
  let renderedRoll = await rollResult.render();

  let templateContext = {
    flavor: label,
    roll: renderedRoll
  }

  let chatData = {
    speaker: ChatMessage.getSpeaker(),
    rolls: [rollResult],
    content: await foundry.applications.handlebars.renderTemplate(messageTemplate, templateContext),
    sound: CONFIG.sounds.dice
  }
  ChatMessage.create(chatData);

}

export async function RingRoll({
  woundPenalty = 0,
  ringRank = null,
  ringName = null,
  systemRing = null,
  schoolRank = null,
  askForOptions = true,
  unskilled = false } = {}) {
  const messageTemplate = "systems/l5r4/templates/chat/simple-roll.hbs";
  let rollType = game.i18n.localize("l5r4.mech.ringRoll");
  let label = `${rollType}: ${ringName}`;
  let optionsSettings = game.settings.get("l5r4", "showSpellRollOptions");
  let affinity = false;
  let deficiency = false;
  let normalRoll = true;
  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let voidRoll = false;
  let applyWoundPenalty = true;
  let spellSlot = false;
  let voidSlot = false;

  if (unskilled) {

    label += ` ${game.i18n.localize("l5r4.mech.unskilledRoll")}`;
    let diceToRoll = parseInt(ringRank);
    let diceToKeep = parseInt(ringRank);
    let rollFormula = `${diceToRoll}d10k${diceToKeep}`;
    let rollResult = await new Roll(rollFormula).roll();
    let renderedRoll = await rollResult.render({
      template: messageTemplate,
      flavor: label
    });

    let messageData = {
      speaker: ChatMessage.getSpeaker(),
      content: renderedRoll
    }
    rollResult.toMessage(messageData);

    return false;
  }

  if (askForOptions != optionsSettings) {
    let checkOptions = await GetSpellOptions(ringName);

    if (checkOptions.cancelled) {
      return false;
    }

    applyWoundPenalty = checkOptions.applyWoundPenalty
    affinity = checkOptions.affinity;
    deficiency = checkOptions.deficiency;
    normalRoll = checkOptions.normalRoll;
    rollMod = parseInt(checkOptions.rollMod);
    keepMod = parseInt(checkOptions.keepMod);
    totalMod = parseInt(checkOptions.totalMod);
    voidRoll = checkOptions.void;
    spellSlot = checkOptions.spellSlot;
    voidSlot = checkOptions.voidSlot;

    if (voidRoll) {
      rollMod += 1;
      keepMod += 1;
      label += ` ${game.i18n.localize("l5r4.rings.void")}!`
    }
  }

  if (applyWoundPenalty) {
    totalMod = totalMod - woundPenalty;
  }

  if (normalRoll) {
    let diceToRoll = parseInt(ringRank) + parseInt(rollMod);
    let diceToKeep = parseInt(ringRank) + parseInt(keepMod);
    let { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);
    let rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;
    let rollResult = await new Roll(rollFormula).roll();
    let renderedRoll = await rollResult.render();

    let templateContext = {
      flavor: label,
      roll: renderedRoll
    }

    let chatData = {
      speaker: ChatMessage.getSpeaker(),
      rolls: [rollResult],
      content: await foundry.applications.handlebars.renderTemplate(messageTemplate, templateContext),
      sound: CONFIG.sounds.dice
    }
    ChatMessage.create(chatData);
  } else {
    rollType = game.i18n.localize("l5r4.mech.spellCasting");
    label = `${rollType}: ${ringName}`
    if (voidRoll) {
      label += ` ${game.i18n.localize("l5r4.rings.void")}!`
    }
    if (affinity) {
      schoolRank += 1;
    }
    if (deficiency) {
      schoolRank -= 1;
    }
    if (schoolRank <= 0) {
      return ui.notifications.error(game.i18n.localize("l5r4.errors.scoolRankZero"));
    }
    let diceToRoll = parseInt(ringRank) + parseInt(schoolRank) + parseInt(rollMod);
    let diceToKeep = parseInt(ringRank) + parseInt(keepMod);
    let { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);
    let rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;
    let rollResult = await new Roll(rollFormula).roll();
    let renderedRoll = await rollResult.render();

    let templateContext = {
      flavor: label,
      roll: renderedRoll
    }

    let chatData = {
      speaker: ChatMessage.getSpeaker(),
      rolls: [rollResult],
      content: await foundry.applications.handlebars.renderTemplate(messageTemplate, templateContext),
      sound: CONFIG.sounds.dice
    }
    ChatMessage.create(chatData);
    return { spellSlot: spellSlot, voidSlot: voidSlot, systemRing: systemRing, ringName: ringName };
  }
  return false;
}

export async function TraitRoll({
  woundPenalty = 0,
  traitRank = null,
  traitName = null,
  askForOptions = true,
  unskilled = false } = {}) {
  const messageTemplate = "systems/l5r4/templates/chat/simple-roll.hbs";
  let rollType = game.i18n.localize("l5r4.mech.traitRoll");
  let label = `${rollType}: ${traitName}`

  let optionsSettings = game.settings.get("l5r4", "showTraitRollOptions");

  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;
  let applyWoundPenalty = true;

  if (askForOptions != optionsSettings) {
    let checkOptions = await GetTraitRollOptions(traitName);

    if (checkOptions.cancelled) {
      return;
    }

    unskilled = checkOptions.unskilled;
    applyWoundPenalty = checkOptions.applyWoundPenalty;
    rollMod = parseInt(checkOptions.rollMod);
    keepMod = parseInt(checkOptions.keepMod);
    totalMod = parseInt(checkOptions.totalMod);

    if (checkOptions.void) {
      rollMod += 1;
      keepMod += 1;
      label += ` ${game.i18n.localize("l5r4.rings.void")}!`
    }
  }
  if (applyWoundPenalty) {
    totalMod = totalMod - woundPenalty;
  }

  let diceToRoll = parseInt(traitRank) + parseInt(rollMod);
  let diceToKeep = parseInt(traitRank) + parseInt(keepMod);
  let { diceRoll, diceKeep, bonus } = TenDiceRule(diceToRoll, diceToKeep, totalMod);
  let rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;
  let rollResult = await new Roll(rollFormula).roll();
  if (unskilled) {
    rollFormula = `${diceRoll}d10k${diceKeep}+${bonus}`;
    rollResult = await new Roll(rollFormula).roll();
    label += ` (${game.i18n.localize("l5r4.mech.unskilledRoll")})`
  }

  let renderedRoll = await rollResult.render();

  let templateContext = {
    flavor: label,
    roll: renderedRoll
  }

  let chatData = {
    speaker: ChatMessage.getSpeaker(),
    rolls: [rollResult],
    content: await foundry.applications.handlebars.renderTemplate(messageTemplate, templateContext),
    sound: CONFIG.sounds.dice
  }
  ChatMessage.create(chatData);
}

async function GetSkillOptions(skillName, noVoid, rollBonus = 0, keepBonus = 0, totalBonus = 0) {
  const template = "systems/l5r4/templates/chat/roll-modifiers-dialog.hbs"
  const content = await foundry.applications.handlebars.renderTemplate(template, { skill: true, noVoid, rollBonus, keepBonus, totalBonus });

  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["l5r4"],
    window: {
      title: game.i18n.format("l5r4.chat.skillRoll", { skill: skillName })
    },
    content: content,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("l5r4.mech.roll"),
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          return _processSkillRollOptions(form);
        }
      },
      {
        action: "cancel",
        label: game.i18n.localize("l5r4.mech.cancel"),
        callback: () => ({ cancelled: true })
      }
    ],
    close: () => ({ cancelled: true })
  });

  return result || { cancelled: true };
}

function _processSkillRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    emphasis: form.emphasis.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void?.checked ?? false
  }
}

async function GetTraitRollOptions(traitName) {
  const template = "systems/l5r4/templates/chat/roll-modifiers-dialog.hbs"
  const content = await foundry.applications.handlebars.renderTemplate(template, { trait: true });

  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["l5r4"],
    window: {
      title: game.i18n.format("l5r4.chat.traitRoll", { trait: traitName })
    },
    content: content,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("l5r4.mech.roll"),
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          return _processTraitRollOptions(form);
        }
      },
      {
        action: "cancel",
        label: game.i18n.localize("l5r4.mech.cancel"),
        callback: () => ({ cancelled: true })
      }
    ],
    close: () => ({ cancelled: true })
  });

  return result || { cancelled: true };
}

function _processTraitRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    unskilled: form.unskilled.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked
  }
}

async function GetSpellOptions(ringName) {
  const template = "systems/l5r4/templates/chat/roll-modifiers-dialog.hbs"
  const content = await foundry.applications.handlebars.renderTemplate(template, { spell: true, ring: ringName });

  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["l5r4"],
    window: {
      title: game.i18n.format("l5r4.chat.ringRoll", { ring: ringName })
    },
    content: content,
    buttons: [
      {
        action: "normalRoll",
        label: game.i18n.localize("l5r4.mech.ringRoll"),
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          return _processRingRollOptions(form);
        }
      },
      {
        action: "spell",
        label: game.i18n.localize("l5r4.mech.spellCasting"),
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          return _processSpellRollOptions(form);
        }
      },
      {
        action: "cancel",
        label: game.i18n.localize("l5r4.mech.cancel"),
        callback: () => ({ cancelled: true })
      }
    ],
    close: () => ({ cancelled: true })
  });

  return result || { cancelled: true };
}

function _processSpellRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    affinity: form.affinity.checked,
    deficiency: form.deficiency.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    spellSlot: form.spellSlot.checked,
    voidSlot: form.voidSlot.checked
  }
}

function _processRingRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked,
    normalRoll: true
  }
}

export async function WeaponRoll({
  diceRoll = null,
  diceKeep = null,
  explodesOn = null,
  weaponName = null,
  description = null,
  askForOptions = true } = {}) {
  const messageTemplate = "systems/l5r4/templates/chat/weapon-chat.hbs";

  let optionsSettings = game.settings.get("l5r4", "showSkillRollOptions");
  let rollType = game.i18n.localize("l5r4.mech.damageRoll");
  let label = `${rollType}: ${weaponName}`

  let rollMod = 0;
  let keepMod = 0;
  let totalMod = 0;

  if (askForOptions != optionsSettings) {
    let checkOptions = await GetWeaponOptions(weaponName);

    if (checkOptions.cancelled) {
      return;
    }

    rollMod = parseInt(checkOptions.rollMod);
    keepMod = parseInt(checkOptions.keepMod);
    totalMod = parseInt(checkOptions.totalMod);

    if (checkOptions.void) {
      rollMod += 1;
      keepMod += 1;
      label += ` ${game.i18n.localize("l5r4.rings.void")}!`
    }
  }

  let diceToRoll = parseInt(diceRoll) + parseInt(rollMod);
  let diceToKeep = parseInt(diceKeep) + parseInt(keepMod);

  // Apply Ten Dice Rule
  ({diceRoll: diceToRoll, diceKeep: diceToKeep, bonus: totalMod} = TenDiceRule(diceToRoll, diceToKeep, totalMod));

  let rollFormula = `${diceToRoll}d10k${diceToKeep}x>=${explodesOn}+${totalMod}`;
  let rollResult = await new Roll(rollFormula).roll();
  let renderedRoll = await rollResult.render();

  let templateContext = {
    flavor: label,
    weapon: weaponName,
    description: description,
    roll: renderedRoll
  }

  let chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker(),
    rolls: [rollResult],
    content: await foundry.applications.handlebars.renderTemplate(messageTemplate, templateContext),
    sound: CONFIG.sounds.dice
    }
  const chatMsg = ChatMessage.create(chatData);
  return chatMsg;
}

async function GetWeaponOptions(weaponName) {
  const template = "systems/l5r4/templates/chat/roll-modifiers-dialog.hbs"
  const content = await foundry.applications.handlebars.renderTemplate(template, { weapon: true });

  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["l5r4"],
    window: {
      title: game.i18n.format("l5r4.chat.damageRoll", { weapon: weaponName })
    },
    content: content,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("l5r4.mech.roll"),
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          return _processWeaponRollOptions(form);
        }
      },
      {
        action: "cancel",
        label: game.i18n.localize("l5r4.mech.cancel"),
        callback: () => ({ cancelled: true })
      }
    ],
    close: () => ({ cancelled: true })
  });

  return result || { cancelled: true };
}

function _processWeaponRollOptions(form) {
  return {
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void.checked
  }
}

export async function NpcRoll({
  woundPenalty = 0,
  diceRoll = null,
  diceKeep = null,
  rollName = null,
  description = null,
  toggleOptions = true,
  rollType = null } = {}) {
  let label = `${rollName}`;
  let bonus = 0;
  let unskilled = false;
  // Make sure our numbers are numbers
  [diceRoll, diceKeep] = [diceRoll, diceKeep].map(e => parseInt(e));

  // Should we show the options dialog?
  const settingsKeys = {
    trait: "showTraitRollOptions",
    ring: "showSpellRollOptions",
    skill: "showSkillRollOptions"
  };
  let settingsKey = null;
  try {
    settingsKey = settingsKeys[rollType];
  } catch (error) {
    console.error(`Error: ${error} fetching settingsKey for rolltype: ${rollType}`);
  }

  const showOptions = game.settings.get("l5r4", settingsKey) ^ toggleOptions;
  if (showOptions) {
    const noVoid = !game.settings.get("l5r4", "allowNpcVoidPoints");
    let isTrait = rollType === "trait" ? true : false;
    let checkOptions = await getNpcRollOptions(rollName, noVoid,isTrait);

    if (checkOptions.cancelled) return;

    unskilled = checkOptions.unskilled;
    diceRoll += parseInt(checkOptions.rollMod);
    diceKeep += parseInt(checkOptions.keepMod);
    bonus += parseInt(checkOptions.totalMod);
    if (checkOptions.void) {
      diceRoll += 1;
      diceKeep += 1;
      label += ` ${game.i18n.localize("l5r4.rings.void")}!`
    }
    if (checkOptions.applyWoundPenalty) {
      bonus -= woundPenalty;
    }
  }

  ({ diceRoll, diceKeep, bonus } = TenDiceRule(diceRoll, diceKeep, bonus));

  const rollFormula = `${diceRoll}d10k${diceKeep}x10+${bonus}`;
  if (description) {
    label += ` (${description})`
  }
  const messageData = {
    flavor: label,
    speaker: ChatMessage.getSpeaker()
  }
  if (unskilled) {
    const rollFormula = `${diceRoll}d10k${diceKeep}+${bonus}`;
    label += ` (${game.i18n.localize("l5r4.mech.unskilledRoll")})`
    const messageData = {
      flavor: label,
      speaker: ChatMessage.getSpeaker()
    }
    const result = await new Roll(rollFormula).roll();
    return result.toMessage(messageData)
  }
  const result = await new Roll(rollFormula).roll();

  return result.toMessage(messageData)
}



async function getNpcRollOptions(rollName, noVoid, trait = false) {
  const template = "systems/l5r4/templates/chat/roll-modifiers-dialog.hbs";
  const content = await foundry.applications.handlebars.renderTemplate(template, { noVoid, trait });

  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["l5r4"],
    window: {
      title: rollName
    },
    content: content,
    buttons: [
      {
        action: "roll",
        label: game.i18n.localize("l5r4.mech.roll"),
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          return _processNpcRollOptions(form);
        }
      },
      {
        action: "cancel",
        label: game.i18n.localize("l5r4.mech.cancel"),
        callback: () => ({ cancelled: true })
      }
    ],
    close: () => ({ cancelled: true })
  });

  return result || { cancelled: true };
}

function _processNpcRollOptions(form) {
  return {
    applyWoundPenalty: form.woundPenalty.checked,
    unskilled: form.unskilled ? form.unskilled.checked : false,
    rollMod: form.rollMod.value,
    keepMod: form.keepMod.value,
    totalMod: form.totalMod.value,
    void: form.void ? form.void.checked : false
  }
}

export function TenDiceRule(diceRoll, diceKeep, bonus) {
  // Check for house rule before mutating any numbers
  const LtHouseRule = game.settings.get("l5r4", "useLtTenDiceRule");
  const addLtBonus = LtHouseRule && diceRoll > 10 && diceRoll % 2;

  let extras = 0;
  if (diceRoll > 10) {
    extras = diceRoll - 10;
    diceRoll = 10;
  }

  if (diceRoll < 10) {
    if (diceKeep > 10) {
      diceKeep = 10;
    }
  } else if (diceKeep >= 10) {
    extras += diceKeep - 10;
    diceKeep = 10;
  }

  while (diceKeep < 10) {
    if (extras > 1) {
      diceKeep++;
      extras -= 2;
    } else {
      break;
    }
  }

  // LT house rule: If there's an odd number of excess rolled dice
  // and fewer than 10 kept dice, add +2 to the total
  if (addLtBonus && diceKeep < 10) {
    bonus += 2;
  }

  if (diceKeep === 10 && diceRoll === 10) {
    bonus += extras * 2;
  }
  //console.log(`TENDICERULE:diceRoll: ${diceRoll}, diceKeep: ${diceKeep}, bonus: ${bonus}`)
  return { diceRoll, diceKeep, bonus }
}

export function roll_parser(roll) {
  let unskilled = false;
  let emphasis = false;
  if (roll.includes("u")) {
    roll = roll.replace("u", "");
    unskilled = true;
  } else if (roll.includes("e")) {
    roll = roll.replace("e", "");
    emphasis = true;
  }
  let [dices, kept_explode_bonus] = roll.split`k`.map(parseIntIfPossible);
  let kept,
    explode_bonus,
    explode = 10,
    bonus = 0;
  if (kept_explode_bonus.toString().includes("x")) {
    [kept, explode_bonus = 10] = kept_explode_bonus.toString().split("x");
    [explode, bonus = 0] = explode_bonus.toString().split`+`.map((x) => +x); //Parse to int
  } else {
    [kept, bonus = 0] = kept_explode_bonus.toString().split`+`.map((x) => +x);
  }

  let roll_values = {
    dices,
    kept,
    bonus,
    rises: 0,
    explode,
    unskilled,
    emphasis,
  };

  let result = calculate_roll(roll_values);
  console.log("Parsed roll result:", result)
  return `${result.dices}d10${emphasis ? "r1" : ""}k${result.kept}${result.unskilled ? "" : "x>=" + result.explode
    }+${result.bonus}`;
}

function parseIntIfPossible(x) {
  const numbers = /^[0-9]+$/;
  if (x.match(numbers)) {
    return parseInt(x);
  } else {
    return x;
  }
}

function calculate_roll(roll) {
  let calculated_roll = roll;

  let { dices, rises: rises1 } = calculate_rises(roll);
  calculated_roll.dices = dices;
  calculated_roll.rises = rises1;
  let { kept, rises: rises2 } = calculate_keeps(calculated_roll);
  calculated_roll.rises = rises2;
  calculated_roll.kept = kept;
  calculated_roll.bonus = calculate_bonus(calculated_roll);
  return calculated_roll;
}

function calculate_rises({ dices, rises } = roll) {
  if (dices > 10) {
    rises = dices - 10;
    dices = 10;
  }
  return { dices, rises };
}

function calculate_keeps({ dices, kept, rises } = roll) {
  if (dices < 10) {
    if (kept > 10) {
      kept = 10;
    }
  } else if (kept >= 10) {
    rises += kept - 10;
    kept = 10;
  }

  while (kept < 10) {
    if (rises > 1) {
      kept++;
      rises -= 2;
    } else {
      break;
    }
  }

  return { kept, rises };
}

function calculate_bonus({ rises, bonus } = roll) {
  bonus += rises * 2;
  return bonus;
}