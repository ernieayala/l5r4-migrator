/**
 * @fileoverview Vitest Configuration for L5R4 Migrator Testing
 * 
 * Configures Vitest for unit testing the L5R4 migration module.
 * Provides Foundry API mocks, module resolution, and coverage reporting.
 * 
 * **Test Types:**
 * - Unit tests run in Node.js with mocked Foundry APIs
 * - Integration tests run in Foundry via Quench module
 * 
 * **Usage:**
 * ```bash
 * npm test              # Run all tests once
 * npm run test:watch    # Run tests in watch mode
 * npm run test:coverage # Run with coverage report
 * npm run test:ui       # Open Vitest UI
 * ```
 * 
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment - use happy-dom for faster DOM operations
    environment: 'happy-dom',
    
    // Global test setup file (mocks Foundry APIs)
    setupFiles: ['./tests/setup/vitest-setup.js'],
    
    // Test file patterns
    include: [
      'tests/unit/**/*.test.js',
      'tests/unit/**/*.spec.js'
    ],
    
    // Files to exclude
    exclude: [
      'node_modules',
      'tests/integration/**/*',
      'tests/fixtures/**/*',
      'tests/mocks/**/*',
      'tests/helpers/**/*'
    ],
    
    // Global test timeout (10 seconds for migration operations)
    testTimeout: 10000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './tests/coverage',
      
      // Files to include in coverage
      include: [
        'module/**/*.js'
      ],
      
      // Files to exclude from coverage
      exclude: [
        'module/**/*.test.js',
        'module/**/*.spec.js',
        'module/testing/**/*',
        'tests/**/*'
      ],
      
      // Coverage thresholds
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0
    },
    
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },
  
  // Module resolution (match Foundry's import patterns)
  resolve: {
    alias: {
      '@module': resolve(import.meta.dirname, './module'),
      '@tests': resolve(import.meta.dirname, './tests'),
      '@mocks': resolve(import.meta.dirname, './tests/mocks'),
      '@fixtures': resolve(import.meta.dirname, './tests/fixtures'),
      '@helpers': resolve(import.meta.dirname, './tests/helpers')
    }
  }
});
