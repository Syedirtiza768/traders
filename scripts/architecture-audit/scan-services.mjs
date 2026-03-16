/**
 * Scanner: Services
 *
 * Extracts all service-level functions from backend Python files.
 * Includes both whitelisted and helper functions.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export function scanServices(root) {
  const apiDir = join(root, 'apps', 'trader_app', 'trader_app', 'api');
  const services = [];

  if (!existsSync(apiDir)) {
    return services;
  }

  const pyFiles = readdirSync(apiDir).filter(f => f.endsWith('.py') && f !== '__init__.py');

  for (const file of pyFiles) {
    const filePath = join(apiDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const moduleName = file.replace('.py', '');

    const lines = content.split('\n');
    let isWhitelisted = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '@frappe.whitelist()') {
        isWhitelisted = true;
        continue;
      }

      const funcMatch = lines[i].match(/^def\s+(\w+)\(([^)]*)\)/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const params = funcMatch[2].trim();

        // Extract docstring
        let docstring = '';
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('"""')) {
          docstring = lines[i + 1].trim().replace(/"""/g, '').trim();
        }

        // Determine type
        const isHelper = funcName.startsWith('_');
        const type = isWhitelisted ? 'whitelisted' : (isHelper ? 'helper' : 'internal');

        services.push({
          function: funcName,
          module: moduleName,
          file,
          type,
          params: params || 'none',
          docstring,
        });

        isWhitelisted = false;
      }
    }
  }

  // Also scan setup and demo modules
  const setupDir = join(root, 'apps', 'trader_app', 'trader_app', 'setup');
  if (existsSync(setupDir)) {
    const setupFiles = readdirSync(setupDir).filter(f => f.endsWith('.py') && f !== '__init__.py');
    for (const file of setupFiles) {
      const content = readFileSync(join(setupDir, file), 'utf-8');
      const funcRegex = /^def\s+(\w+)\(/gm;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        services.push({
          function: match[1],
          module: 'setup',
          file: `setup/${file}`,
          type: 'setup',
          params: '',
          docstring: '',
        });
      }
    }
  }

  return services;
}
