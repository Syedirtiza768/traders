# Windows deployment helpers

This repository now includes PowerShell helpers for Windows so you can choose between a fast iterative redeploy and a full cold rebuild.

## Scripts

- `scripts/redeploy-windows.ps1` — quick rebuild/redeploy flow for normal app changes
- `scripts/cold-rebuild-windows.ps1` — full cold rebuild that removes old app images and rebuilds with `--no-cache`

## Recommended modes

### 1. Quick app-only rebuild

Use this when you changed application code and want the safest fast path.

```powershell
.\scripts\redeploy-windows.ps1 -Migrate
```

### 2. Frontend-only rebuild

Use this when only `frontend/trader-ui` changed.

```powershell
.\scripts\redeploy-windows.ps1 -FrontendOnly
```

### 3. Backend-only rebuild

Use this when backend app code changed and you don’t need a full cold image reset.

```powershell
.\scripts\redeploy-windows.ps1 -BackendOnly -Migrate
```

### 4. Full cold rebuild

Use this when you want to clear old app images/build cache and rebuild all app images from scratch.

```powershell
.\scripts\cold-rebuild-windows.ps1
```

### 5. Destructive cold rebuild including volumes

This also removes Docker named volumes, which resets local database/site state.

```powershell
.\scripts\cold-rebuild-windows.ps1 -RemoveVolumes
```

## Safety defaults

- Both scripts prompt before disruptive actions unless `-Force` is used.
- `redeploy-windows.ps1` preserves containers/data volumes and only restarts what you ask it to.
- `cold-rebuild-windows.ps1` preserves volumes by default.
- Health verification checks the proxy API endpoint at `http://localhost:8080/api/method/ping`.

## Why backend rebuilds were slow

The backend image uses Frappe bench setup and ERPNext app installation, which are expensive steps. The updated `infra/docker/backend.Dockerfile` keeps those expensive layers ahead of app source changes so normal rebuilds can reuse them unless you explicitly run a cold rebuild.