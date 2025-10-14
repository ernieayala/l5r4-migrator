export async function GetItemOptions(elementType) {
  let template;
  let title;
  switch (elementType) {
    case "spell":
      template = "systems/l5r4/templates/chat/create-spell-dialog.hbs";
      title = game.i18n.localize("l5r4.sheet.addTechSpell");
      break;
    case "advantage":
      template = "systems/l5r4/templates/chat/create-advantage-dialog.hbs";
      title = game.i18n.localize("l5r4.sheet.addAdv/Dis");
      break;
    default:
      template = "systems/l5r4/templates/chat/create-equipment-dialog.hbs";
      title = game.i18n.localize("l5r4.sheet.addEquipment");
  }
  const content = await foundry.applications.handlebars.renderTemplate(template, {});

  const result = await foundry.applications.api.DialogV2.wait({
    window: {
      title: title
    },
    content: content,
    buttons: [
      {
        action: "ok",
        label: game.i18n.localize("l5r4.mech.ok"),
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          return _processItemOptions(form);
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

function _processItemOptions(form) {
  return {
    name: form.itemName.value,
    type: form.itemType.value
  }
}