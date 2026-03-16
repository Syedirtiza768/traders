/**
 * Scanner: Frontend API
 *
 * Parses lib/api.ts to extract all API namespaces and methods.
 * Scans page files to determine which pages use which API calls.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export function scanFrontendApi(root) {
  const apiPath = join(root, 'frontend', 'trader-ui', 'src', 'lib', 'api.ts');
  const content = readFileSync(apiPath, 'utf-8');

  const namespaces = [];

  // Extract API namespace blocks
  // Pattern: export const xxxApi = { ... }
  const nsRegex = /export\s+const\s+(\w+)\s*=\s*\{([\s\S]*?)\n\};/g;
  let nsMatch;

  while ((nsMatch = nsRegex.exec(content)) !== null) {
    const nsName = nsMatch[1];
    const nsBody = nsMatch[2];

    const methods = [];
    // Pattern: methodName: (params) => api.get/post/put/delete('url')
    const methodRegex = /(\w+):\s*(?:\(([^)]*)\)\s*=>|async\s*\(([^)]*)\)\s*=>)\s*[\s\S]*?api\.(get|post|put|delete)\s*\(\s*[`'"]([^`'"]+)/g;
    let mMatch;

    while ((mMatch = methodRegex.exec(nsBody)) !== null) {
      methods.push({
        name: mMatch[1],
        params: (mMatch[2] || mMatch[3] || '').trim(),
        httpMethod: mMatch[4].toUpperCase(),
        endpoint: mMatch[5].replace(/\$\{[^}]+\}/g, '{param}'),
      });
    }

    namespaces.push({
      name: nsName,
      methods,
    });
  }

  // Also capture resourceApi which uses dynamic paths
  const hasResourceApi = content.includes('export const resourceApi');
  if (hasResourceApi && !namespaces.find(n => n.name === 'resourceApi')) {
    namespaces.push({
      name: 'resourceApi',
      methods: [
        { name: 'list', params: 'ListParams', httpMethod: 'GET', endpoint: '/api/resource/{doctype}' },
        { name: 'get', params: 'doctype, name', httpMethod: 'GET', endpoint: '/api/resource/{doctype}/{name}' },
        { name: 'create', params: 'doctype, data', httpMethod: 'POST', endpoint: '/api/resource/{doctype}' },
        { name: 'update', params: 'doctype, name, data', httpMethod: 'PUT', endpoint: '/api/resource/{doctype}/{name}' },
        { name: 'delete', params: 'doctype, name', httpMethod: 'DELETE', endpoint: '/api/resource/{doctype}/{name}' },
        { name: 'count', params: 'doctype, filters', httpMethod: 'GET', endpoint: '/api/method/frappe.client.get_count' },
      ],
    });
  }

  // Scan pages to find which APIs they use
  const pagesDir = join(root, 'frontend', 'trader-ui', 'src', 'pages');
  const pageFiles = readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
  const pageApiUsage = [];

  for (const file of pageFiles) {
    const pageContent = readFileSync(join(pagesDir, file), 'utf-8');
    const pageName = file.replace('.tsx', '');
    const usedApis = [];

    // Check which API namespaces are imported
    const importMatch = pageContent.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/lib\/api['"]/);
    if (importMatch) {
      const imported = importMatch[1].split(',').map(s => s.trim());
      usedApis.push(...imported);
    }

    // Check authStore usage
    if (pageContent.includes('useAuthStore')) {
      usedApis.push('authStore');
    }

    // Find specific API method calls
    const callRegex = /(\w+Api)\.([\w]+)\(/g;
    const calls = [];
    let cMatch;
    while ((cMatch = callRegex.exec(pageContent)) !== null) {
      calls.push({ namespace: cMatch[1], method: cMatch[2] });
    }

    // Find resourceApi calls with doctypes
    const resourceCallRegex = /resourceApi\.(\w+)\(\s*\{?\s*(?:doctype:\s*['"]([^'"]+)['"])?/g;
    let rMatch;
    while ((rMatch = resourceCallRegex.exec(pageContent)) !== null) {
      calls.push({ namespace: 'resourceApi', method: rMatch[1], doctype: rMatch[2] || null });
    }

    pageApiUsage.push({
      page: pageName,
      file,
      importedApis: usedApis,
      calls,
    });
  }

  // Also scan stores
  const storesDir = join(root, 'frontend', 'trader-ui', 'src', 'stores');
  try {
    const storeFiles = readdirSync(storesDir).filter(f => f.endsWith('.ts'));
    for (const file of storeFiles) {
      const storeContent = readFileSync(join(storesDir, file), 'utf-8');
      const storeName = file.replace('.ts', '');
      const calls = [];
      const callRegex = /(\w+Api)\.([\w]+)\(/g;
      let cMatch;
      while ((cMatch = callRegex.exec(storeContent)) !== null) {
        calls.push({ namespace: cMatch[1], method: cMatch[2] });
      }
      if (calls.length > 0) {
        pageApiUsage.push({
          page: storeName,
          file: `stores/${file}`,
          importedApis: [...new Set(calls.map(c => c.namespace))],
          calls,
        });
      }
    }
  } catch (e) {
    // stores dir might not exist
  }

  const totalMethods = namespaces.reduce((sum, ns) => sum + ns.methods.length, 0);

  return {
    namespaces,
    pageApiUsage,
    totalMethods,
  };
}
