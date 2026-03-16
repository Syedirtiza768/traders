/**
 * Scanner: Backend Endpoints
 *
 * Parses Python files in trader_app/api/ to extract @frappe.whitelist() endpoints.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export function scanBackendEndpoints(root) {
  const apiDir = join(root, 'apps', 'trader_app', 'trader_app', 'api');
  const endpoints = [];

  if (!existsSync(apiDir)) {
    console.warn('  ⚠ Backend API directory not found:', apiDir);
    return endpoints;
  }

  const pyFiles = readdirSync(apiDir).filter(f => f.endsWith('.py') && f !== '__init__.py');

  for (const file of pyFiles) {
    const filePath = join(apiDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const moduleName = file.replace('.py', '');

    // Find all @frappe.whitelist() decorated functions
    const lines = content.split('\n');
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim() === '@frappe.whitelist()') {
        // Next non-empty line should be the function definition
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;

        if (j < lines.length && lines[j].trim().startsWith('def ')) {
          const funcMatch = lines[j].match(/def\s+(\w+)\(([^)]*)\)/);
          if (funcMatch) {
            const funcName = funcMatch[1];
            const params = funcMatch[2].trim();

            // Extract docstring
            let docstring = '';
            let k = j + 1;
            if (k < lines.length && lines[k].trim().startsWith('"""')) {
              docstring = lines[k].trim().replace(/"""/g, '').trim();
              if (!docstring) {
                // Multi-line docstring
                k++;
                const docLines = [];
                while (k < lines.length && !lines[k].trim().endsWith('"""')) {
                  docLines.push(lines[k].trim());
                  k++;
                }
                docstring = docLines.join(' ').trim();
              }
            }

            // Extract entity references from the function body
            const funcBody = [];
            let depth = 0;
            for (let l = j; l < lines.length; l++) {
              if (lines[l].includes('def ') && l !== j && !lines[l].trim().startsWith('#')) {
                break;
              }
              funcBody.push(lines[l]);
            }
            const bodyText = funcBody.join('\n');

            // Find table references
            const tableRefs = [];
            const tableRegex = /`tab([^`]+)`/g;
            let tMatch;
            while ((tMatch = tableRegex.exec(bodyText)) !== null) {
              if (!tableRefs.includes(tMatch[1])) {
                tableRefs.push(tMatch[1]);
              }
            }

            const dottedPath = `trader_app.api.${moduleName}.${funcName}`;
            const apiUrl = `/api/method/${dottedPath}`;

            endpoints.push({
              function: funcName,
              module: moduleName,
              file,
              dottedPath,
              apiUrl,
              params: params || 'none',
              docstring,
              entities: tableRefs,
            });
          }
        }
      }
      i++;
    }
  }

  return endpoints;
}
