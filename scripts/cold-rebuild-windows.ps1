param(
    [switch]$RemoveVolumes,
    [switch]$Force,
    [switch]$PruneBuildCache = $true,
    [switch]$Pull
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectDir "compose\docker-compose.yml"

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Yellow
}

function Confirm-Action([string]$Message) {
    if ($Force) { return }
    $answer = Read-Host "$Message [y/N]"
    if ($answer -notin @('y', 'Y', 'yes', 'YES')) {
        throw "Cancelled by user."
    }
}

function Invoke-Compose([string[]]$Args) {
    $commandLine = @('compose', '-f', ('"' + $ComposeFile + '"')) + $Args
    Invoke-Expression (('docker ' + ($commandLine -join ' ')))
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose $($Args -join ' ') failed with exit code $LASTEXITCODE"
    }
}

Write-Step "Trader full cold rebuild"

if ($Pull) {
    Write-Step "Pulling latest Git changes"
    Push-Location $ProjectDir
    try {
        $branch = (& git branch --show-current).Trim()
        if ($branch) {
            & git pull origin $branch
            if ($LASTEXITCODE -ne 0) { throw "git pull failed" }
        }
    } finally {
        Pop-Location
    }
}

$volumeText = if ($RemoveVolumes) { ' and volumes' } else { '' }
Confirm-Action "This will remove Traders containers, app images, and build cache$volumeText"

Write-Step "Stopping compose stack"
$downArgs = @('down', '--remove-orphans')
if ($RemoveVolumes) { $downArgs += '--volumes' }
Invoke-Compose $downArgs

Write-Step "Removing old Traders images"
& docker image rm -f traders-backend:latest traders-frontend:latest 2>$null

if ($PruneBuildCache) {
    Write-Step "Pruning Docker builder cache"
    & docker builder prune -af
    if ($LASTEXITCODE -ne 0) { throw "docker builder prune failed" }
}

Write-Step "Rebuilding images without cache"
Invoke-Compose @('build', '--no-cache')

Write-Step "Starting fresh stack"
Invoke-Compose @('up', '-d')

Write-Host "`nCold rebuild complete. Verify with: docker compose -f `"$ComposeFile`" ps" -ForegroundColor Green