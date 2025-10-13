/**
 * @fileoverview Vitest Global Setup - Foundry API Mocks
 *
 * Sets up global mocks for Foundry VTT APIs to enable unit testing
 * of L5R4 migrator code outside of the Foundry environment.
 *
 * **What This Mocks:**
 * - `game` global object
 * - `CONFIG` global object
 * - `foundry` namespace
 * - `CONST` constants
 * - `Hooks` system
 * - Base Document classes
 * - Application classes
 * - Utility functions
 *
 * **Usage:**
 * This file is automatically loaded by Vitest before running tests.
 * All mocks are available globally in test files.
 */

import { vi } from 'vitest';

/**
 * Initialize all global Foundry mocks before tests run.
 * Called automatically by Vitest.
 */
export function setup() {
  // Mock game object
  const mockGame = {
    system: { id: 'l5r4', version: '1.0.0' },
    modules: new Map(),
    i18n: {
      localize: vi.fn((key) => key),
      format: vi.fn((key, data) => key)
    },
    settings: {
      get: vi.fn((namespace, key) => 'info'), // Default log level
      set: vi.fn(),
      register: vi.fn(),
      storage: {
        get: vi.fn(() => new Map())
      }
    },
    user: {
      id: 'testuser',
      isGM: true
    },
    users: [],
    actors: {
      contents: [],
      get: vi.fn()
    },
    items: {
      contents: [],
      get: vi.fn()
    },
    scenes: {
      contents: [],
      get: vi.fn()
    },
    journal: {
      contents: [],
      get: vi.fn()
    },
    world: {
      id: 'test-world',
      title: 'Test World'
    },
    version: '13.0.0',
    folders: {
      contents: [],
      get: vi.fn()
    },
    playlists: {
      contents: [],
      get: vi.fn()
    }
  };

  // Mock ui object
  const mockUI = {
    notifications: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  };

  // Mock CONFIG object
  const mockCONFIG = {
    Actor: {
      documentClass: class MockActorClass {}
    },
    Item: {
      documentClass: class MockItemClass {}
    }
  };

  // Mock foundry namespace
  const mockFoundry = {
    utils: {
      mergeObject: vi.fn((original, other = {}) => Object.assign({}, original, other)),
      duplicate: vi.fn((original) => JSON.parse(JSON.stringify(original))),
      getProperty: vi.fn((object, path) => {
        return path.split('.').reduce((obj, key) => obj?.[key], object);
      }),
      setProperty: vi.fn((object, path, value) => {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((obj, key) => {
          if (!obj[key]) {
            obj[key] = {};
          }
          return obj[key];
        }, object);
        target[last] = value;
        return true;
      })
    },
    applications: {
      api: {
        ApplicationV2: class MockApplicationV2 {},
        DialogV2: class MockDialogV2 {
          static async confirm(config) {
            return true; // Default to confirming in tests
          }
          constructor(config) {
            this.config = config;
          }
          render() {
            return this;
          }
        },
        HandlebarsApplicationMixin: (BaseClass) => BaseClass
      }
    }
  };

  // Mock CONST object
  const mockCONST = {
    DOCUMENT_OWNERSHIP_LEVELS: {
      NONE: 0,
      LIMITED: 1,
      OBSERVER: 2,
      OWNER: 3
    }
  };

  // Mock Hooks system
  const mockHooks = {
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    call: vi.fn(),
    callAll: vi.fn()
  };

  // Set as globals
  globalThis.game = mockGame;
  globalThis.ui = mockUI;
  globalThis.CONFIG = mockCONFIG;
  globalThis.foundry = mockFoundry;
  globalThis.CONST = mockCONST;
  globalThis.Hooks = mockHooks;

  // Mock Document classes
  globalThis.Actor = class MockActor {
    constructor(data) {
      Object.assign(this, data);
    }
    static create(data) {
      return new this(data);
    }
    static deleteDocuments(ids) {
      return Promise.resolve([]);
    }
    toObject() {
      return { ...this };
    }
  };

  globalThis.Item = class MockItem {
    constructor(data) {
      Object.assign(this, data);
    }
    static create(data) {
      return new this(data);
    }
    static deleteDocuments(ids) {
      return Promise.resolve([]);
    }
    toObject() {
      return { ...this };
    }
  };

  globalThis.Scene = class MockScene {
    constructor(data) {
      Object.assign(this, data);
    }
    static create(data) {
      return new this(data);
    }
    static deleteDocuments(ids) {
      return Promise.resolve([]);
    }
    toObject() {
      return { ...this };
    }
  };

  globalThis.JournalEntry = class MockJournalEntry {
    constructor(data) {
      Object.assign(this, data);
    }
    static create(data) {
      return new this(data);
    }
    static deleteDocuments(ids) {
      return Promise.resolve([]);
    }
    toObject() {
      return { ...this };
    }
  };

  globalThis.Folder = class MockFolder {
    constructor(data) {
      Object.assign(this, data);
    }
    static create(data) {
      return new this(data);
    }
    static deleteDocuments(ids) {
      return Promise.resolve([]);
    }
    toObject() {
      return { ...this };
    }
  };

  // Mock utility functions
  globalThis.fromUuid = vi.fn((uuid) => Promise.resolve(null));
  globalThis.fromUuidSync = vi.fn((uuid) => null);
  globalThis.getProperty = mockFoundry.utils.getProperty;
  globalThis.setProperty = mockFoundry.utils.setProperty;
  globalThis.mergeObject = mockFoundry.utils.mergeObject;
  globalThis.duplicate = mockFoundry.utils.duplicate;
  globalThis.randomID = vi.fn(() => Math.random().toString(36).substring(2, 18));
  globalThis.saveDataToFile = vi.fn((content, type, filename) => {
    // Mock file download - just return success in tests
    return true;
  });

  // Mock legacy Dialog for backwards compatibility
  globalThis.Dialog = class MockDialog {
    static async confirm(config) {
      return true;
    }
    constructor(config) {
      this.config = config;
    }
    render() {
      return this;
    }
  };

  console.log('✓ Foundry API mocks initialized for L5R4 Migrator');
}

/**
 * Cleanup after each test to ensure isolation.
 */
export function afterEach() {
  vi.clearAllMocks();
}

// Run setup immediately
setup();
