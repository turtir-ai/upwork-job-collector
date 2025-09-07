param(
  [Parameter(Mandatory=$true)][string]$ExtensionId,
  [string]$PythonPath,
  [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'

if (-not $ProjectRoot) { $ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path }
if (-not $PythonPath) {
  $py = (Get-Command python -ErrorAction SilentlyContinue)
  if ($py) { $PythonPath = $py.Source }
}
if (-not $PythonPath) { throw 'Python not found. Please pass -PythonPath C:\\Path\\to\\python.exe' }

$hostDir = Join-Path $ProjectRoot 'scripts\native_host'
$manifestPath = Join-Path $hostDir 'com.upwork.ai.collector.json'
$collectorScript = Join-Path $hostDir 'collector_host.py'

$manifest = [ordered]@{
  name = 'com.upwork.ai.collector'
  description = 'Upwork AI Assistant Native Host (runs Python Playwright collector)'
  path = $PythonPath
  type = 'stdio'
  args = @($collectorScript)
  allowed_origins = @("chrome-extension://$ExtensionId/")
}

$manifestJson = ($manifest | ConvertTo-Json -Depth 5)
$null = New-Item -ItemType Directory -Force -Path $hostDir
Set-Content -LiteralPath $manifestPath -Value $manifestJson -Encoding UTF8

# Registry key for Chrome Native Messaging (Current User)
$regPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.upwork.ai.collector'
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name '(default)' -Value $manifestPath

Write-Host "Installed native host manifest:" $manifestPath
Write-Host "Registry key set at:" $regPath

