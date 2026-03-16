/**
 * Architecture Audit — Main Runner
 *
 * Orchestrates all scanner modules and document generators.
 * Usage:
 *   node scripts/architecture-audit/run-audit.mjs [--full|--frontend|--backend|--workflows|--graphs]
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { scanRoutes } from './scan-routes.mjs';
import { scanNavigation } from './scan-navigation.mjs';
import { scanFrontendApi } from './scan-frontend-api.mjs';
import { scanBackendEndpoints } from './scan-backend-endpoints.mjs';
import { scanServices } from './scan-services.mjs';
import { scanEntities } from './scan-entities.mjs';
import { scanWorkflows } from './scan-workflows.mjs';
import { generateMermaid } from './generate-mermaid.mjs';
import { buildDocs } from './build-docs.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

// Ensure output directories exist
const docDirs = [
  'docs/architecture',
  'docs/audits',
  'docs/system-graphs',
  'docs/governance',
];

for (const dir of docDirs) {
  const fullPath = join(ROOT, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const mode = args[0] || '--full';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     TRADERS — ARCHITECTURE AUDIT SYSTEM                 ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`Mode: ${mode}`);
console.log(`Root: ${ROOT}`);
console.log(`Time: ${new Date().toISOString()}`);
console.log('');

async function runFullAudit() {
  console.log('═══ Phase 1: Inventory Refresh ═══');

  console.log('\n→ Scanning routes...');
  const routes = scanRoutes(ROOT);
  console.log(`  Found ${routes.length} routes`);

  console.log('\n→ Scanning navigation...');
  const navigation = scanNavigation(ROOT);
  console.log(`  Found ${navigation.length} nav items`);

  console.log('\n→ Scanning frontend API calls...');
  const frontendApi = scanFrontendApi(ROOT);
  console.log(`  Found ${frontendApi.namespaces.length} API namespaces, ${frontendApi.totalMethods} methods`);

  console.log('\n→ Scanning backend endpoints...');
  const backendEndpoints = scanBackendEndpoints(ROOT);
  console.log(`  Found ${backendEndpoints.length} whitelisted endpoints`);

  console.log('\n→ Scanning services...');
  const services = scanServices(ROOT);
  console.log(`  Found ${services.length} service functions`);

  console.log('\n→ Scanning entities...');
  const entities = scanEntities(ROOT);
  console.log(`  Found ${entities.length} entities/DocTypes`);

  console.log('\n→ Scanning workflows...');
  const workflows = scanWorkflows(ROOT);
  console.log(`  Found ${workflows.length} workflow patterns`);

  console.log('\n═══ Phase 2: Reconciliation ═══');
  const auditData = {
    routes,
    navigation,
    frontendApi,
    backendEndpoints,
    services,
    entities,
    workflows,
  };

  console.log('\n═══ Phase 3: Document Generation ═══');
  buildDocs(ROOT, auditData);

  console.log('\n═══ Phase 4: Graph Generation ═══');
  generateMermaid(ROOT, auditData);

  console.log('\n═══ Audit Complete ═══');
  console.log(`Timestamp: ${new Date().toISOString()}`);
}

async function runFrontendAudit() {
  console.log('═══ Frontend Audit ═══');
  const routes = scanRoutes(ROOT);
  const navigation = scanNavigation(ROOT);
  const frontendApi = scanFrontendApi(ROOT);
  const auditData = { routes, navigation, frontendApi, backendEndpoints: [], services: [], entities: [], workflows: [] };
  buildDocs(ROOT, auditData, 'frontend');
  console.log('═══ Frontend Audit Complete ═══');
}

async function runBackendAudit() {
  console.log('═══ Backend Audit ═══');
  const backendEndpoints = scanBackendEndpoints(ROOT);
  const services = scanServices(ROOT);
  const entities = scanEntities(ROOT);
  const auditData = { routes: [], navigation: [], frontendApi: { namespaces: [], totalMethods: 0 }, backendEndpoints, services, entities, workflows: [] };
  buildDocs(ROOT, auditData, 'backend');
  console.log('═══ Backend Audit Complete ═══');
}

async function runWorkflowAudit() {
  console.log('═══ Workflow Audit ═══');
  const workflows = scanWorkflows(ROOT);
  const auditData = { routes: [], navigation: [], frontendApi: { namespaces: [], totalMethods: 0 }, backendEndpoints: [], services: [], entities: [], workflows };
  buildDocs(ROOT, auditData, 'workflows');
  console.log('═══ Workflow Audit Complete ═══');
}

async function runGraphGeneration() {
  console.log('═══ Graph Generation ═══');
  const routes = scanRoutes(ROOT);
  const navigation = scanNavigation(ROOT);
  const frontendApi = scanFrontendApi(ROOT);
  const backendEndpoints = scanBackendEndpoints(ROOT);
  const services = scanServices(ROOT);
  const entities = scanEntities(ROOT);
  const workflows = scanWorkflows(ROOT);
  const auditData = { routes, navigation, frontendApi, backendEndpoints, services, entities, workflows };
  generateMermaid(ROOT, auditData);
  console.log('═══ Graph Generation Complete ═══');
}

// Execute
switch (mode) {
  case '--full':
    await runFullAudit();
    break;
  case '--frontend':
    await runFrontendAudit();
    break;
  case '--backend':
    await runBackendAudit();
    break;
  case '--workflows':
    await runWorkflowAudit();
    break;
  case '--graphs':
    await runGraphGeneration();
    break;
  default:
    console.log('Usage: node run-audit.mjs [--full|--frontend|--backend|--workflows|--graphs]');
    process.exit(1);
}
