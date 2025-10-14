const { sheets } = foundry.applications;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export default class L5R4ItemSheet extends HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["l5r4", "sheet", "item"],
    position: {
      width: 530,
      height: 540,
    },form: {
      submitOnChange: true
    },
    window: {
      title: "L5R4.sheet.item",
      resizable: true
    }
  }

  // Override to set dynamic title based on item type and name
  get title() {
    // Capitalize the item type for display, handle special cases
    let typeName = this.document.type.charAt(0).toUpperCase() + this.document.type.slice(1);
    if (this.document.type === "commonItem") {
      typeName = "Item";
    }
    return `${typeName}: ${this.document.name}`;
  }

  static PARTS = {
    weapon: {
      template: "systems/l5r4/templates/sheets/weapon-sheet.hbs",
      classes: ["scrollable"]
    },
    bow: {
      template: "systems/l5r4/templates/sheets/bow-sheet.hbs",
      classes: ["scrollable"]
    },
    armor: {
      template: "systems/l5r4/templates/sheets/armor-sheet.hbs",
      classes: ["scrollable"]
    },
    spell: {
      template: "systems/l5r4/templates/sheets/spell-sheet.hbs",
      classes: ["scrollable"]
    },
    technique: {
      template: "systems/l5r4/templates/sheets/technique-sheet.hbs",
      classes: ["scrollable"]
    },
    skill: {
      template: "systems/l5r4/templates/sheets/skill-sheet.hbs",
      classes: ["scrollable"]
    },
    advantage: {
      template: "systems/l5r4/templates/sheets/advantage-sheet.hbs",
      classes: ["scrollable"]
    },
    disadvantage: {
      template: "systems/l5r4/templates/sheets/disadvantage-sheet.hbs",
      classes: ["scrollable"]
    },
    kata: {
      template: "systems/l5r4/templates/sheets/kata-sheet.hbs",
      classes: ["scrollable"]
    },
    kiho: {
      template: "systems/l5r4/templates/sheets/kiho-sheet.hbs",
      classes: ["scrollable"]
    },
    tattoo: {
      template: "systems/l5r4/templates/sheets/tattoo-sheet.hbs",
      classes: ["scrollable"]
    },
    commonItem: {
      template: "systems/l5r4/templates/sheets/commonItem-sheet.hbs",
      classes: ["scrollable"]
    }
  };

  // Select which part to render based on item type
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // Only render the part that matches this item's type
    options.parts = [this.document.type];
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.owner = this.item.isOwner;
    context.editable = this.isEditable;
    context.item = this.item;
    context.system = this.item.system;
    context.config = CONFIG.l5r4;


    context.enrichedDemands = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.demands, {secrets: this.document.isOwner});
    context.enrichedSpecialRules = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.specialRules, {secrets: this.document.isOwner});
    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.description, {secrets: this.document.isOwner});


    return context;
  }

  // Attach event listeners to handle form changes
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    // Handle input changes for text fields, numbers, selects
    htmlElement.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.addEventListener('change', this._onFormFieldChange.bind(this));
      } else {
        el.addEventListener('change', this._onFormFieldChange.bind(this));
      }
    });
  }

  // Handle form field changes
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

    // Update the document
    await this.document.update({ [field]: value });
  }

};