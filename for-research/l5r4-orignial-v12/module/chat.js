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
  const html = await renderTemplate(template, {});


  return new Promise(resolve => {
    const data = {
      title: title,
      content: html,
      buttons: {
        ok: {
          label: game.i18n.localize("l5r4.mech.ok"),
          callback: html => resolve(_processItemOptions(html[0].querySelector("form")))
        },
        cancel: {
          label: game.i18n.localize("l5r4.mech.cancel"),
          callback: () => resolve({ cancelled: true })
        }
      },
      default: "ok",
      close: () => resolve({ cancelled: true })
    };

    new Dialog(data, null).render(true);
  });
}

function _processItemOptions(form) {
  return {
    name: form.itemName.value,
    type: form.itemType.value
  }
}