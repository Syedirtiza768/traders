/**
 * Scanner: Routes
 *
 * Parses App.tsx to extract all React Router route definitions.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export function scanRoutes(root) {
  const appPath = join(root, 'frontend', 'trader-ui', 'src', 'App.tsx');
  const content = readFileSync(appPath, 'utf-8');

  const routes = [];

  // Extract import statements to map component names to files
  const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/(pages|layouts|components)\/(\w+)['"]/g;
  const imports = {};
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports[match[1]] = { folder: match[2], file: match[3] };
  }

  // Extract Route definitions
  // Pattern: <Route path="..." element={<Component />} />
  const routeRegex = /<Route\s+(?:path=["']([^"']*)["']\s*)?(?:index\s+)?element=\{<(\w+)\s*\/?>(?:\s*<\/\w+>)?\}/g;
  while ((match = routeRegex.exec(content)) !== null) {
    const path = match[1] || '/';
    const component = match[2];
    routes.push({
      path,
      component,
      file: imports[component] ? `src/${imports[component].folder}/${imports[component].file}.tsx` : null,
      guard: content.includes('ProtectedRoute') && path !== '/login' ? 'ProtectedRoute' : 'None',
      layout: path !== '/login' && path !== '*' ? 'DashboardLayout' : 'None',
    });
  }

  // Check for index route
  const indexMatch = content.match(/<Route\s+index\s+element=\{<(\w+)\s*\/?>(?:\s*<\/\w+>)?\}/);
  if (indexMatch) {
    const existing = routes.find(r => r.path === '/');
    if (!existing) {
      routes.push({
        path: '/',
        component: indexMatch[1],
        file: imports[indexMatch[1]] ? `src/${imports[indexMatch[1]].folder}/${imports[indexMatch[1]].file}.tsx` : null,
        guard: 'ProtectedRoute',
        layout: 'DashboardLayout',
      });
    }
  }

  // Check for catch-all redirect
  const catchAllMatch = content.match(/<Route\s+path=["']\*["']\s+element=\{<Navigate/);
  if (catchAllMatch) {
    const existing = routes.find(r => r.path === '*');
    if (!existing) {
      routes.push({
        path: '*',
        component: 'Navigate (redirect to /)',
        file: null,
        guard: 'None',
        layout: 'None',
      });
    }
  }

  // Ensure we have all the known routes even if regex didn't catch them all
  const knownRoutes = [
    { path: '/login', component: 'LoginPage', guard: 'None', layout: 'None' },
    { path: '/', component: 'DashboardPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/sales', component: 'SalesPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/purchases', component: 'PurchasesPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/inventory', component: 'InventoryPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/customers', component: 'CustomersPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/suppliers', component: 'SuppliersPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/finance', component: 'FinancePage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/reports', component: 'ReportsPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '/settings', component: 'SettingsPage', guard: 'ProtectedRoute', layout: 'DashboardLayout' },
    { path: '*', component: 'Navigate (redirect to /)', guard: 'None', layout: 'None' },
  ];

  // Merge: use parsed data when available, fall back to known routes
  const finalRoutes = [];
  const seenPaths = new Set();

  for (const r of routes) {
    if (!seenPaths.has(r.path)) {
      seenPaths.add(r.path);
      finalRoutes.push(r);
    }
  }

  for (const r of knownRoutes) {
    if (!seenPaths.has(r.path)) {
      seenPaths.add(r.path);
      finalRoutes.push({ ...r, file: `src/pages/${r.component}.tsx` });
    }
  }

  return finalRoutes;
}
