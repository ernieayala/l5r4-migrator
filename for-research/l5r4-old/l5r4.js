import { l5r4 } from "./module/config.mjs";
import L5R4Actor from "./module/L5R4Actor.js";
import L5R4Item from "./module/L5R4Item.js";
import L5R4ItemSheet from "./module/sheets/L5R4ItemSheet.js";
import L5R4IPcSheet from "./module/sheets/L5R4PcSheet.js";
import L5R4INpcSheet from "./module/sheets/L5R4NpcSheet.js";
import { TenDiceRule, roll_parser } from "./module/dice.js";

async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/l5r4/templates/partials/pc-honor-and-combat.hbs",
    "systems/l5r4/templates/partials/commonItem-card.hbs",
    "systems/l5r4/templates/partials/armor-card.hbs",
    "systems/l5r4/templates/partials/weapon-card.hbs",
    "systems/l5r4/templates/partials/spell-card.hbs",
    "systems/l5r4/templates/partials/skill-card.hbs",
    "systems/l5r4/templates/partials/technique-card.hbs",
    "systems/l5r4/templates/partials/advantage-card.hbs",
    "systems/l5r4/templates/partials/disadvantage-card.hbs",
    "systems/l5r4/templates/partials/kata-card.hbs",
    "systems/l5r4/templates/partials/kiho-card.hbs",
    "systems/l5r4/templates/partials/tattoo-card.hbs",
    "systems/l5r4/templates/partials/pc-wounds.hbs",
    "systems/l5r4/templates/partials/pc-advantages.hbs",
    "systems/l5r4/templates/partials/pc-stats.hbs",
    "systems/l5r4/templates/partials/pc-stats-tabs.hbs",
    "systems/l5r4/templates/partials/pc-skills.hbs",
    "systems/l5r4/templates/partials/pc-equipment.hbs",
    "systems/l5r4/templates/partials/pc-spells-techniques.hbs",
    "systems/l5r4/templates/partials/pc-spell-slots.hbs",
    "systems/l5r4/templates/partials/pc-armors.hbs",
    "systems/l5r4/templates/partials/pc-armor-tn.hbs",
    "systems/l5r4/templates/partials/npc-skills.hbs",
    "systems/l5r4/templates/partials/npc-wounds.hbs",
    "systems/l5r4/templates/partials/npc-stats.hbs",
    "systems/l5r4/templates/partials/npc-rings.hbs",
    "systems/l5r4/templates/chat/simple-roll.hbs",
    "systems/l5r4/templates/chat/weapon-chat.hbs"
  ];

  return foundry.applications.handlebars.loadTemplates(templatePaths);
};

function registerSystemSettings() {
  game.settings.register("l5r4", "showTraitRollOptions", {
    config: true,
    scope: "client",
    name: "SETTINGS.showTraitRollOptions.name",
    hint: "SETTINGS.showTraitRollOptions.label",
    type: Boolean,
    default: true
  });
  game.settings.register("l5r4", "showSpellRollOptions", {
    config: true,
    scope: "client",
    name: "SETTINGS.showSpellRollOptions.name",
    hint: "SETTINGS.showSpellRollOptions.label",
    type: Boolean,
    default: true
  });
  game.settings.register("l5r4", "showSkillRollOptions", {
    config: true,
    scope: "client",
    name: "SETTINGS.showSkillRollOptions.name",
    hint: "SETTINGS.showSkillRollOptions.label",
    type: Boolean,
    default: true
  });
  game.settings.register("l5r4", "allowNpcVoidPoints", {
    config: true,
    scope: "client",
    name: "SETTINGS.allowNpcVoidPoints.name",
    hint: "SETTINGS.allowNpcVoidPoints.label",
    type: Boolean,
    default: false
  });
  game.settings.register("l5r4", "useLtTenDiceRule", {
    config: true,
    scope: "world",
    name: "SETTINGS.useLtTenDiceRule.name",
    hint: "SETTINGS.useLtTenDiceRule.label",
    type: Boolean,
    default: false
  });
  game.settings.register("l5r4", "usePcTabs", {
    config: true,
    scope: "client",
    name: "SETTINGS.usePcTabs.name",
    hint: "SETTINGS.usePcTabs.label",
    type: Boolean,
    default: false
  });
  game.settings.register("l5r4", "calculateRank", {
    config: true,
    scope: "world",
    name: "SETTINGS.calculateRank.name",
    hint: "SETTINGS.calculateRank.label",
    type: Boolean,
    default: true
  });
  game.settings.register("l5r4", "allowArmorStacking", {
    config: true,
    scope: "world",
    name: "SETTINGS.allowArmorStacking.name",
    label: "SETTINGS.allowArmorStacking.label",
    type: Boolean,
    default: false,
    // Need to reload to recalculate Armor TNs.
    requiresReload: true
  });
}

Hooks.once("init", function () {
  console.log("l5r4 | Initialising Legend of Five rings 4th ed system");

  CONFIG.l5r4 = l5r4;
  CONFIG.Item.documentClass = L5R4Item;
  CONFIG.Actor.documentClass = L5R4Actor;
  // custom status effects
  console.log("l5r4 | Registering custom status effects");
  CONFIG.statusEffects = l5r4.statusEffects;

  // custom initiative
  Combatant.prototype._getInitiativeFormula = function () {
    const actor = this.actor;
    const initRoll = actor.system.initiative.roll;
    const initKeep = actor.system.initiative.keep;
    const initBonus = actor.system.initiative.total_mod ? actor.system.initiative.total_mod : 0;

    let { diceRoll, diceKeep, bonus } = TenDiceRule(initRoll, initKeep, initBonus);
    return `${diceRoll}d10k${diceKeep}x10+${bonus}`;
  }

  foundry.documents.collections.Items.registerSheet("l5r4", L5R4ItemSheet, { makeDefault: true });

  foundry.documents.collections.Actors.registerSheet("l5r4", L5R4IPcSheet, { types: ["pc"], makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("l5r4", L5R4INpcSheet, { types: ["npc"], makeDefault: true });

  preloadHandlebarsTemplates();

  registerSystemSettings();

  Handlebars.registerHelper("times", function (n, content) {
    let result = "";
    for (let i = 0; i < n; ++i) {
      content.data.index = i + 1;
      result += content.fn(i);
    }

    return result;
  });


  Handlebars.registerHelper("math", function (lvalue, operator, rvalue, options) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    return {
      "+": lvalue + rvalue,
      "-": lvalue - rvalue,
      "*": lvalue * rvalue,
      "/": lvalue / rvalue,
      "%": lvalue % rvalue
    }[operator];
  });

  Handlebars.registerHelper('concat', function () {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

});

Hooks.on("renderChatMessageHTML", async (app, html, msg) => {
  if (app.isRoll) {
    const pattern = /^\d+d\d+(r1)?k\d+(x(>=)?\d+)?( \+*-?\ \d+)?(\[.+\])?$/;

    const roll = app.rolls[0];
    const formula = roll.formula;
    const die = roll.dice[0];
    let bonus = 0;
    const operator = roll.terms.filter(e => e.operator === "+" || e.operator === "-")
    let operatorIndex = 0
    if (operator) {
      if (operator[0].operator === "-") {
        operatorIndex = roll.terms.findIndex(e => e.operator === "-")
      } else {
        operatorIndex = roll.terms.findIndex(e => e.operator === "+")
      }
    }

    const operatorString = roll.terms[operatorIndex] ? roll.terms[operatorIndex].operator : "";
    if (operator.length > 0) {
      bonus = roll.terms[operatorIndex + 1].number;
    }
    if (pattern.test(formula)) {
      const b_div_tag = '<div class="dice-formula">';
      const e_div_tag = "</div>";
      const b_span_tag = '<span class="part-formula">';
      const e_span_tag = "</span>";
      const b_flavor_tag = '<div class="part-flavor">';
      const regex_div = new RegExp(`${b_div_tag}.*?${e_div_tag}`, "g");
      const regex_span = new RegExp(`${b_span_tag}.*?${e_span_tag}`, "g");

      let roll_l5r = `${die.number}${die.modifiers[0] === "r1" ? die.modifiers[1] : die.modifiers[0]
        }${bonus > 0 ? operatorString === "+" ? " + " + bonus : " - " + bonus : ""}${die.modifiers.length > 1
          ? ` ${game.i18n.localize("l5r4.chat.explodesOn")}: ` +
          (die.modifiers[0] === "r1"
            ? die.modifiers[2].replace("x", "").replace(">=", "") +
            ` ${game.i18n.localize("l5r4.chat.withEmphasis")}`
            : die.modifiers[1].replace("x", "").replace(">=", ""))
          : ` ${game.i18n.localize("l5r4.chat.unskilled")}`
        }`;
      const describing_dice_pattern = /\[.*\]*$/;
      const describing_dice = formula.match(describing_dice_pattern);
      let flavor = "";
      if (describing_dice) {
        flavor = describing_dice.length > 0 ? describing_dice[0] : "";
      }

      msg.message.content = msg.message.content
        .replace(regex_div, `${b_div_tag} ${roll_l5r}{flavor} ${e_div_tag}`)
        .replace(regex_span, `${b_span_tag} ${roll_l5r} ${e_span_tag}`)

      // Replace jQuery with native DOM methods
      const diceFormulaEl = html.querySelector(".dice-formula");
      if (diceFormulaEl) diceFormulaEl.innerHTML = roll_l5r + flavor;

      const part_formula = html.querySelector(".part-formula");
      if (part_formula) {
        part_formula.innerHTML = roll_l5r;

        const flavor_pattern = /\[(.*)\]/;
        if (flavor_pattern.test(flavor)) {
          const flavorDiv = document.createElement("div");
          flavorDiv.className = "part-flavor";
          flavorDiv.innerHTML = flavor.match(flavor_pattern)[1];
          part_formula.insertAdjacentElement("afterend", flavorDiv);
        }
      }

    }
  } else {
    const inside_message_roll = /\d+d\d+(r1)?k\d+(x(>=)?\d+)?(\+\d+)?/g;
    if (
      !inside_message_roll.test(msg.message.content) ||
      !msg.message.content.match(inside_message_roll)
    )
      return;
    const roll = msg.message.content.match(inside_message_roll);

    // Replace jQuery with native DOM method
    const messageContent = html.querySelector(".message-content");
    if (!messageContent) return;

    for (var child of messageContent.children) {
      if (inside_message_roll.test(child.getAttribute("title"))) {
        const roll = child.getAttribute("title").match(inside_message_roll).pop();
        let [dices, , kept_explode_bonus] = roll.split(/[dk]+/);
        let kept,
          explode_bonus = 0,
          bonus = 0;
        let explode = 11;
        if (kept_explode_bonus.toString().includes("x")) {
          [kept, explode_bonus] = kept_explode_bonus.split(/[x>=]+/);
        } else if (kept_explode_bonus.includes("+")) {
          [kept, bonus] = kept_explode_bonus.split(/[+]+/);
        }
        if (explode_bonus.toString().includes("+")) {
          [explode, bonus = 0] = explode_bonus.split(/[+]+/);
        }

        let xky = `${dices}k${kept}${bonus > 0 ? " + " + bonus : ""}${explode <= 10
          ? ` ${game.i18n.localize("l5r4.chat.explodesOn")}: ` +
          explode +
          (roll.includes("r1") ? ` ${game.i18n.localize("l5r4.chat.withEmphasis")}` : "")
          : ` ${game.i18n.localize("l5r4.chat.unskilled")}`
          }`;
        child.setAttribute("title", `${xky}`);
        child.childNodes.forEach((element) => {
          let a = 0;
          if (element.nodeValue === null) {
            return;
          }
          element.nodeValue = element.nodeValue.replace(
            inside_message_roll,
            `${xky}`
          );
        });
      }
    }
  }
});

Hooks.on("chatMessage", function (chatlog, message, chatdata) {
  const pattern = /^(u|e)?\d+k\d+(x\d+)?([+]\d+)?(\[.+\])?(\#(.*))?$/;
  const roll_pattern = /^(\/r(?:oll)? |\/gmr(?:oll)? |\/b(?:lind)?r(?:oll)? |\/s(?:elf)?r(?:oll)? ){1}/;
  const deferred_inline_roll_pattern = /\[\[(\/r(?:oll)? |\/gmr(?:oll)? |\/b(?:lind)?r(?:oll)? |\/s(?:elf)?r(?:oll)? ){1}(u|e)?\d+k\d+(x\d+)?([+]\d+)?(\[.+\])?\]\]/;
  const immediate_message_roll_pattern = new RegExp(/\[\[(u|e)?\d+k\d+(x\d+)?([+]\d+)?(\[.+\])?(\#(.*))?\]\]/)
  const inside_message_roll_pattern = new RegExp("(" + immediate_message_roll_pattern.source + ")|(" + deferred_inline_roll_pattern.source + ")")
  if (roll_pattern.test(message)) {
    let parts = message.split(" ");

    if (pattern.test(parts[1])) {
      const describing_dice_pattern = /\[.*\]*$/;
      const describing_dice = parts[1].match(describing_dice_pattern);
      let message_without_describing = parts[1].replace(describing_dice_pattern, "");

      const describing_roll_pattern = /(\#(.*))*$/;
      let describing_roll;
      if (describing_roll_pattern.test(message_without_describing)) {
        describing_roll = message_without_describing.match(describing_roll_pattern);
        message_without_describing = message_without_describing.replace(describing_roll_pattern, "");
      }

      let roll_parsed = roll_parser(message_without_describing);
      chatlog.processMessage(`${parts[0]} ${roll_parsed}${describing_dice ? describing_dice : ""}${describing_roll ? describing_roll[0] : ""}`);
      return false;
    }
  } else if (pattern.test(message)) {
    const describing_dice_pattern = /\[.*\]*$/;
    const describing_dice = message.match(describing_dice_pattern);
    let message_without_describing = message.replace(describing_dice_pattern, "");

    const describing_roll_pattern = /(\#(.*))*$/;
    let describing_roll;
    if (describing_roll_pattern.test(message_without_describing)) {
      describing_roll = message_without_describing.match(describing_roll_pattern);
      message_without_describing = message_without_describing.replace(describing_roll_pattern, "");
    }
    message = roll_parser(message_without_describing);
    chatlog.processMessage(`/r ${message}${describing_dice && describing_dice.length > 0 ? describing_dice[0] : ""}${describing_roll ? describing_roll[0] : ""}`);
    return false;
  } else if (inside_message_roll_pattern.test(message)) {
    const deferred_roll_pattern = /\[\[(?:\/r(?:oll)? |\/gmr(?:oll)? |\/b(?:lind)?r(?:oll)? |\/s(?:elf)?r(?:oll)? ){1}(.*?)\]\]/g;
    const kxy_pattern = /(u|e)?\d+k\d+(x\d+)?([+]\d+)?/;

    let result = message;

    const inline_message_pattern = /\[\[((u|e)?\d+k\d+(x\d+)?([+]\d+)?(\[.+\])?(\#(.*))?){1}\]\]/g

    if (deferred_roll_pattern.test(message))
      result = message.replace(
        deferred_roll_pattern,
        function (match, token) {
          if (!deferred_roll_pattern.test(match)) return match;
          return match.replace(kxy_pattern, roll_parser(token));
        }
      );
    else if (inline_message_pattern.test(message))
      result = message.replace(
        inline_message_pattern,
        function (match, token) {
          if (!inline_message_pattern.test(match)) return match;
          return match.replace(kxy_pattern, roll_parser(token));
        }
      );
    chatlog.processMessage(result);
    return false;
  }
});

