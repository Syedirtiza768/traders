/**
 * Scanner: Entities
 *
 * Extracts all database entity references (ERPNext DocTypes / tables) from both
 * backend Python code and frontend TypeScript code.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export function scanEntities(root) {
  const entities = new Map(); // name -> { sources: [], accessPatterns: [] }

  // Scan backend Python files for `tabXxx` references
  const apiDir = join(root, 'apps', 'trader_app', 'trader_app', 'api');
  if (existsSync(apiDir)) {
    const pyFiles = readdirSync(apiDir).filter(f => f.endsWith('.py') && f !== '__init__.py');
    for (const file of pyFiles) {
      const content = readFileSync(join(apiDir, file), 'utf-8');
      const tableRegex = /`tab([^`]+)`/g;
      let match;
      while ((match = tableRegex.exec(content)) !== null) {
        const name = match[1];
        if (!entities.has(name)) {
          entities.set(name, { name, backendSources: [], frontendSources: [], accessType: 'sql' });
        }
        const ent = entities.get(name);
        if (!ent.backendSources.includes(file)) {
          ent.backendSources.push(file);
        }
      }
    }
  }

  // Scan frontend pages for resourceApi.list({ doctype: 'Xxx' }) references
  const pagesDir = join(root, 'frontend', 'trader-ui', 'src', 'pages');
  if (existsSync(pagesDir)) {
    const tsxFiles = readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
    for (const file of tsxFiles) {
      const content = readFileSync(join(pagesDir, file), 'utf-8');
      const doctypeRegex = /doctype:\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = doctypeRegex.exec(content)) !== null) {
        const name = match[1];
        if (!entities.has(name)) {
          entities.set(name, { name, backendSources: [], frontendSources: [], accessType: 'resource_api' });
        }
        const ent = entities.get(name);
        if (!ent.frontendSources.includes(file)) {
          ent.frontendSources.push(file);
        }
      }
    }
  }

  // Scan hooks.py for fixture references
  const hooksPath = join(root, 'apps', 'trader_app', 'trader_app', 'hooks.py');
  if (existsSync(hooksPath)) {
    const content = readFileSync(hooksPath, 'utf-8');
    const fixtureRegex = /["']dt["']\s*:\s*["']([^"']+)["']/g;
    let match;
    while ((match = fixtureRegex.exec(content)) !== null) {
      const name = match[1];
      if (!entities.has(name)) {
        entities.set(name, { name, backendSources: [], frontendSources: [], accessType: 'fixture' });
      }
      entities.get(name).backendSources.push('hooks.py (fixture)');
    }
  }

  // Add known entities from demo generators
  const demoEntities = [
    'Company', 'User', 'Customer', 'Supplier', 'Item', 'Item Group',
    'Stock Entry', 'Sales Invoice', 'Sales Order', 'Delivery Note',
    'Purchase Invoice', 'Purchase Receipt', 'Payment Entry', 'Journal Entry',
  ];

  for (const name of demoEntities) {
    if (!entities.has(name)) {
      entities.set(name, { name, backendSources: ['demo/generators/'], frontendSources: [], accessType: 'demo' });
    }
  }

  return Array.from(entities.values());
}
