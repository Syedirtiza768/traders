# Deploy Traders to EC2 Ubuntu Server
# Usage: .\scripts\deploy-to-ec2.ps1

param(
    [string]$PemFile = "C:\Users\Irtaza Hassan\Downloads\usinstance.pem",
    [string]$Server = "ubuntu@ec2-23-21-67-7.compute-1.amazonaws.com",
    [string]$Domain = "enxi.realtrackapp.com",
    [string]$CertbotEmail = ""
)

$ErrorActionPreference = "Stop"

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║  Traders - EC2 Deployment Script                            ║
║  Deploying to: $Server                                      ║
║  Domain: $Domain                                            ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Verify PEM file exists
if (-not (Test-Path $PemFile)) {
    Write-Host "❌ PEM file not found: $PemFile" -ForegroundColor Red
    exit 1
}

# Fix PEM file permissions (required for SSH)
Write-Host "▶  Setting PEM file permissions..." -ForegroundColor Blue
icacls $PemFile /inheritance:r
icacls $PemFile /grant:r "$env:USERNAME:(R)"
icacls $PemFile /grant:r "Administrators:(R)"

# Test SSH connection
Write-Host "▶  Testing SSH connection..." -ForegroundColor Blue
ssh -i $PemFile -o StrictHostKeyChecking=no $Server "echo '✅ SSH connection successful'" 

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH connection failed. Check your PEM file and server address." -ForegroundColor Red
    exit 1
}

# Prepare deployment command
$certbotParam = if ($CertbotEmail) { "CERTBOT_EMAIL=$CertbotEmail" } else { "SKIP_SSL=1" }

# Run setup script on server
Write-Host @"

▶  Starting deployment on server...
   This will:
   - Install Docker, Nginx, and Certbot
   - Clone the repository to /opt/traders
   - Configure environment variables
   - Build and start all Docker containers
   - Setup Nginx reverse proxy
   - Configure SSL (if email provided)

   First deployment takes 20-40 minutes...

"@ -ForegroundColor Yellow

$deployCommand = @"
cd /tmp && \
curl -fsSL https://raw.githubusercontent.com/Syedirtiza768/traders/main/scripts/setup-ec2-ubuntu.sh -o setup-ec2-ubuntu.sh && \
chmod +x setup-ec2-ubuntu.sh && \
sudo DOMAIN=$Domain $certbotParam bash setup-ec2-ubuntu.sh
"@

ssh -i $PemFile $Server $deployCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║  ✅ Deployment Complete!                                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Your application is now live at:                            ║
║  🌐 https://$Domain                                         ║
║                                                              ║
║  Admin credentials (check server for password):              ║
║  SSH: ssh -i "$PemFile" $Server                             ║
║  View password: ssh -i "$PemFile" $Server "cat /opt/traders/compose/.env | grep ADMIN_PASSWORD"
║                                                              ║
║  Useful commands:                                            ║
║  • View logs: ssh -i "$PemFile" $Server "cd /opt/traders/compose && docker compose logs -f"
║  • Restart:   ssh -i "$PemFile" $Server "cd /opt/traders/compose && docker compose restart"
║  • Update:    ssh -i "$PemFile" $Server "cd /opt/traders && bash scripts/redeploy-ec2.sh"
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green
} else {
    Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║  ❌ Deployment Failed                                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Check the error messages above.                             ║
║                                                              ║
║  To debug, SSH into the server:                              ║
║  ssh -i "$PemFile" $Server                                  ║
║                                                              ║
║  Then check logs:                                            ║
║  cd /opt/traders/compose && docker compose logs              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Red
    exit 1
}
