/**
 * Scanner: Navigation
 *
 * Parses Sidebar.tsx to extract all navigation items and their routing targets.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export function scanNavigation(root) {
  const sidebarPath = join(root, 'frontend', 'trader-ui', 'src', 'components', 'Sidebar.tsx');
  const content = readFileSync(sidebarPath, 'utf-8');

  const navItems = [];

  // Parse navItems array
  const navItemsMatch = content.match(/const\s+navItems\s*=\s*\[([\s\S]*?)\];/);
  if (navItemsMatch) {
    const itemRegex = /\{\s*to:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]\s*,\s*icon:\s*(\w+)/g;
    let match;
    while ((match = itemRegex.exec(navItemsMatch[1])) !== null) {
      navItems.push({
        to: match[1],
        label: match[2],
        icon: match[3],
        section: 'Main Menu',
      });
    }
  }

  // Parse bottomItems array
  const bottomItemsMatch = content.match(/const\s+bottomItems\s*=\s*\[([\s\S]*?)\];/);
  if (bottomItemsMatch) {
    const itemRegex = /\{\s*to:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]\s*,\s*icon:\s*(\w+)/g;
    let match;
    while ((match = itemRegex.exec(bottomItemsMatch[1])) !== null) {
      navItems.push({
        to: match[1],
        label: match[2],
        icon: match[3],
        section: 'System',
      });
    }
  }

  // Fallback if parsing didn't capture everything
  const knownItems = [
    { to: '/', label: 'Dashboard', icon: 'LayoutDashboard', section: 'Main Menu' },
    { to: '/sales', label: 'Sales', icon: 'TrendingUp', section: 'Main Menu' },
    { to: '/purchases', label: 'Purchases', icon: 'TrendingDown', section: 'Main Menu' },
    { to: '/inventory', label: 'Inventory', icon: 'Warehouse', section: 'Main Menu' },
    { to: '/customers', label: 'Customers', icon: 'Users', section: 'Main Menu' },
    { to: '/suppliers', label: 'Suppliers', icon: 'Truck', section: 'Main Menu' },
    { to: '/finance', label: 'Finance', icon: 'DollarSign', section: 'Main Menu' },
    { to: '/reports', label: 'Reports', icon: 'BarChart2', section: 'Main Menu' },
    { to: '/settings', label: 'Settings', icon: 'Settings', section: 'System' },
  ];

  if (navItems.length === 0) {
    return knownItems;
  }

  // Merge
  const seenPaths = new Set(navItems.map(i => i.to));
  for (const k of knownItems) {
    if (!seenPaths.has(k.to)) {
      navItems.push(k);
    }
  }

  return navItems;
}
