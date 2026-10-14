param (
    [string]$KeyPath = "$env:ORACLE_SSH_KEY_PATH",
    [string]$ServerIp = "$env:ORACLE_DEV_SERVER_IP"
)

if (-not $KeyPath -or -not $ServerIp) {
    Write-Host "Usage: Set environment variables ORACLE_SSH_KEY_PATH and ORACLE_DEV_SERVER_IP" -ForegroundColor Yellow
    Write-Host "Or run with: .\start_dev_tunnel.ps1 -KeyPath 'path\to\key.key' -ServerIp 'YOUR_IP'" -ForegroundColor Gray
}

Write-Host "Connecting SSH tunnel to Oracle Dev DB (5433) and Redis (6380)..."
ssh -o StrictHostKeyChecking=no -i $KeyPath -N -L 5433:127.0.0.1:5433 -L 6380:127.0.0.1:6380 ubuntu@$ServerIp
