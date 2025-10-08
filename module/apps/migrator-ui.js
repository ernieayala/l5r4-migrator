/**
 * @fileoverview Migrator UI Application
 *
 * Main UI for the L5R4 world migration tool.
 * Built using Foundry VTT v13+ ApplicationV2 architecture.
 *
 * **Features:**
 * - Step-by-step migration workflow
 * - Backup creation before migration
 * - Export from legacy l5r4 system
 * - Validation with readiness report
 * - Import to l5r4-enhanced system
 * - Progress tracking and error reporting
 */

import { BackupService } from '../services/backup-service.js';
import { ExportService } from '../services/export-service.js';
import { ValidationService } from '../services/validation-service.js';
import { ImportService } from '../services/import-service.js';
import { Logger } from '../utils/logger.js';

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/**
 * Main migration UI application
 * @extends ApplicationV2
 */
export class MigratorUI extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Default application options
   */
  static DEFAULT_OPTIONS = {
    id: 'l5r4-migrator-ui',
    classes: ['l5r4-migrator'],
    tag: 'div',
    window: {
      title: 'L5R4 Migration Tool',
      icon: 'fas fa-exchange-alt',
      minimizable: true,
      resizable: true
    },
    position: {
      width: 700,
      height: 'auto'
    },
    actions: {
      backup: MigratorUI.prototype._onBackup,
      export: MigratorUI.prototype._onExport,
      validate: MigratorUI.prototype._onValidate,
      import: MigratorUI.prototype._onImport,
      uploadFile: MigratorUI.prototype._onUploadFile
    }
  };

  /**
   * Template path for the application
   */
  static PARTS = {
    form: {
      template: 'modules/l5r4-migrator/templates/migrator-ui.hbs'
    }
  };

  constructor(options = {}) {
    super(options);
    this.exportData = null;
    this.validationResult = null;
  }

  /**
   * Prepare context data for rendering
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    return {
      ...context,
      systemId: game.system.id,
      worldName: game.world.title,
      isL5R4: game.system.id === 'l5r4',
      isL5R4Enhanced: game.system.id === 'l5r4-enhanced',
      hasExportData: !!this.exportData,
      hasValidation: !!this.validationResult,
      validationReady: this.validationResult?.valid || false
    };
  }

  /**
   * Handle backup button click
   */
  async _onBackup(event, target) {
    Logger.info('Creating backup...');
    ui.notifications.info('Creating world backup...');

    try {
      const result = await BackupService.createBackup({
        includeSettings: true,
        includeScenes: true,
        includeJournals: true
      });

      ui.notifications.info(`Backup created: ${result.filename}`);
      Logger.info(`Backup successful: ${result.filename} (${result.size} bytes)`);
    } catch (error) {
      ui.notifications.error('Backup failed. See console for details.');
      Logger.error('Backup failed:', error);
    }
  }

  /**
   * Handle export button click
   */
  async _onExport(event, target) {
    Logger.info('Exporting world data...');
    ui.notifications.info('Exporting world data...');

    try {
      const result = await ExportService.exportWorld({
        includeScenes: true,
        includeJournals: true,
        validate: true
      });

      // Store export data in this instance
      this.exportData = result.data;
      await this.render();

      // Download export file
      ExportService.downloadExport(result.data);

      ui.notifications.info(`Exported ${result.stats.actors} actors, ${result.stats.items} items`);

      if (result.validation.results.actors.invalid > 0 || result.validation.results.items.invalid > 0) {
        ui.notifications.warn('Some documents have validation warnings. Check console for details.');
        Logger.warn('Validation issues found:', result.validation);
      }
    } catch (error) {
      ui.notifications.error('Export failed. See console for details.');
      Logger.error('Export failed:', error);
    }
  }

  /**
   * Handle validate button click
   */
  async _onValidate(event, target) {
    if (!this.exportData) {
      ui.notifications.warn('Please export data first, or upload an export file.');
      return;
    }

    Logger.info('Validating export data...');
    ui.notifications.info('Validating migration data...');

    try {
      const validationResult = await ValidationService.validateData(this.exportData, {
        strict: false,
        checkIntegrity: true
      });

      const report = ValidationService.generateReadinessReport(validationResult);

      // Store validation result
      this.validationResult = validationResult;
      await this.render();

      // Display report
      this._showValidationReport(report);

      if (report.ready) {
        ui.notifications.info('Data validation passed! Ready for import.');
      } else {
        ui.notifications.warn('Validation found issues. See report for details.');
      }
    } catch (error) {
      ui.notifications.error('Validation failed. See console for details.');
      Logger.error('Validation failed:', error);
    }
  }

  /**
   * Handle import button click
   */
  async _onImport(event, target) {
    if (!this.exportData) {
      ui.notifications.warn('Please export or upload data first.');
      return;
    }

    if (!this.validationResult?.valid) {
      const confirm = await DialogV2.confirm({
        window: { title: 'Import Warning' },
        content: '<p>Data validation has not passed. Importing may cause errors.</p><p>Continue anyway?</p>',
        rejectClose: false,
        modal: true
      });

      if (!confirm) {
        return;
      }
    }

    // Final confirmation
    const confirmImport = await DialogV2.confirm({
      window: { title: 'Confirm Import' },
      content: `
        <h3>⚠️ Import Confirmation</h3>
        <p>This will import migration data into the current world.</p>
        <p><strong>World:</strong> ${game.world.title}</p>
        <p><strong>System:</strong> ${game.system.id}</p>
        <br>
        <p>It is <strong>strongly recommended</strong> to create a backup first.</p>
        <p>Continue with import?</p>
      `,
      rejectClose: false,
      modal: true
    });

    if (!confirmImport) {
      return;
    }

    Logger.info('Starting import...');
    ui.notifications.info('Starting import process...');

    try {
      const result = await ImportService.importWorld(this.exportData, {
        dryRun: false,
        skipFolders: false,
        skipScenes: false,
        skipJournals: false
      });

      const total =
        result.stats.actors.created +
        result.stats.items.created +
        result.stats.scenes.created +
        result.stats.journals.created +
        result.stats.folders.created;

      ui.notifications.info(`Import complete! Created ${total} documents.`);
      Logger.info('Import successful:', result.stats);

      // Show detailed results
      this._showImportResults(result);
    } catch (error) {
      ui.notifications.error('Import failed. See console for details.');
      Logger.error('Import failed:', error);
    }
  }

  /**
   * Handle file upload
   */
  async _onUploadFile(event, target) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }

      try {
        Logger.info(`Loading export file: ${file.name}`);
        ui.notifications.info(`Loading ${file.name}...`);

        const content = await file.text();
        const data = JSON.parse(content);

        // Store in this instance
        this.exportData = data;
        this.validationResult = null; // Clear old validation
        await this.render();

        ui.notifications.info('Export file loaded successfully!');
      } catch (error) {
        ui.notifications.error('Failed to load file. See console for details.');
        Logger.error('File load failed:', error);
      }
    };

    input.click();
  }

  /**
   * Show validation report dialog
   * @private
   */
  _showValidationReport(report) {
    const recommendations = report.recommendations
      .map((r) => {
        const icon = {
          high: '🔴',
          medium: '🟡',
          low: '🔵',
          info: '✅'
        }[r.priority];

        return `<li>${icon} <strong>${r.message}</strong><br><em>${r.action}</em></li>`;
      })
      .join('');

    const content = `
      <div class="l5r4-validation-report">
        <h3>Migration Readiness Report</h3>
        <p><strong>Status:</strong> ${report.ready ? '✅ Ready' : '❌ Not Ready'}</p>
        
        <h4>Summary</h4>
        <ul>
          <li>Total Documents: ${report.summary.totalDocuments}</li>
          <li>Valid: ${report.summary.validDocuments}</li>
          <li>Invalid: ${report.summary.invalidDocuments}</li>
          <li>Errors: ${report.summary.totalErrors}</li>
          <li>Warnings: ${report.summary.totalWarnings}</li>
          <li>Integrity Issues: ${report.summary.integrityIssues}</li>
        </ul>
        
        <h4>Recommendations</h4>
        <ul>${recommendations}</ul>
      </div>
    `;

    new DialogV2({
      window: { title: 'Validation Report' },
      content,
      buttons: [
        {
          action: 'ok',
          icon: 'fa-check',
          label: 'OK',
          default: true
        }
      ]
    }).render(true);
  }

  /**
   * Show import results dialog
   * @private
   */
  _showImportResults(result) {
    const stats = result.stats;

    const content = `
      <div class="l5r4-import-results">
        <h3>Import Complete</h3>
        
        <table>
          <tr><th>Type</th><th>Attempted</th><th>Created</th><th>Failed</th></tr>
          <tr><td>Folders</td><td>${stats.folders.attempted}</td><td>${stats.folders.created}</td><td>${stats.folders.failed}</td></tr>
          <tr><td>Actors</td><td>${stats.actors.attempted}</td><td>${stats.actors.created}</td><td>${stats.actors.failed}</td></tr>
          <tr><td>Items</td><td>${stats.items.attempted}</td><td>${stats.items.created}</td><td>${stats.items.failed}</td></tr>
          <tr><td>Scenes</td><td>${stats.scenes.attempted}</td><td>${stats.scenes.created}</td><td>${stats.scenes.failed}</td></tr>
          <tr><td>Journals</td><td>${stats.journals.attempted}</td><td>${stats.journals.created}</td><td>${stats.journals.failed}</td></tr>
        </table>
        
        ${stats.actors.transformed ? `<p><em>Transformed ${stats.actors.transformed} actors and ${stats.items.transformed} items</em></p>` : ''}
      </div>
    `;

    new DialogV2({
      window: { title: 'Import Results' },
      content,
      buttons: [
        {
          action: 'ok',
          icon: 'fa-check',
          label: 'OK',
          default: true
        }
      ]
    }).render(true);
  }
}
