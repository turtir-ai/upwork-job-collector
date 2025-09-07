# Native host installer for Upwork AI Collector (Windows)
# Usage:
#   pwsh -ExecutionPolicy Bypass -File .\install_native_host.ps1 -ExtensionId <YOUR_EXTENSION_ID>
# Example:
#   pwsh -ExecutionPolicy Bypass -File .\install_native_host.ps1 -ExtensionId abcd1234efgh5678ijkl9012

param(
  [Parameter(Mandatory=$true)]
  [string]$ExtensionId
)

$ErrorActionPreference = 'Stop'

# Resolve base/native paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$NativeDir = $ScriptDir
$RunnerBat = Join-Path $NativeDir 'collector_runner.bat'
$ManifestPath = Join-Path $NativeDir 'com.upwork.ai.collector.json'

# Build manifest JSON
$allowedOrigin = "chrome-extension://$ExtensionId/"
$manifest = @{
  name = 'com.upwork.ai.collector'
  description = 'Upwork AI Collector'
  type = 'stdio'
  path = $RunnerBat
  allowed_origins = @($allowedOrigin)
}

Write-Host "Writing native host manifest to $ManifestPath" -ForegroundColor Cyan
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

# Registry: HKCU scope
$regKey = 'HKCU:Software\Google\Chrome\NativeMessagingHosts\com.upwork.ai.collector'
Write-Host "Creating registry key: $regKey" -ForegroundColor Cyan
New-Item -Path $regKey -Force | Out-Null
Set-ItemProperty -Path $regKey -Name '(default)' -Value $ManifestPath

# Verify
$val = (Get-ItemProperty -Path $regKey).'(default)'
if ($val -ne $ManifestPath) {
  Write-Warning "Registry value mismatch. Expected $ManifestPath got $val"
} else {
  Write-Host "Registry configured." -ForegroundColor Green
}

# Check runner exists
if (-not (Test-Path -LiteralPath $RunnerBat)) {
  Write-Warning "Runner BAT not found: $RunnerBat. Creating a default one."
  @"
@echo off
setlocal
set PY=C:\\Python311\\python.exe
if not exist "%PY%" set PY=python
"%PY%" "%~dp0collector.py"
"@ | Set-Content -LiteralPath $RunnerBat -Encoding ASCII
}

Write-Host "Done. Restart Chrome and try 'Run Collector (Python)' in the extension panel." -ForegroundColor Green

