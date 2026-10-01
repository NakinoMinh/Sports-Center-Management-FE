[CmdletBinding()]
param(
    [string]$ApiBaseUrl = "http://localhost:5299/api",
    [ValidateRange(1, 65535)][int]$Port = 5174,
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js was not found. Install Node.js 20 or newer, then retry." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm was not found. Reinstall Node.js, then retry." }

$nodeVersion = (& node --version).TrimStart("v").Split(".")
if ([int]$nodeVersion[0] -lt 20) { throw "Node.js 20 or newer is required." }

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$packageLock = Join-Path $repositoryRoot "package-lock.json"
if (-not (Test-Path -LiteralPath $packageLock -PathType Leaf)) { throw "package-lock.json was not found." }

$nodeModules = Join-Path $repositoryRoot "node_modules"
if (-not $SkipInstall -and -not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
    Push-Location $repositoryRoot
    try {
        & npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
    }
    finally { Pop-Location }
}

$previousApiBaseUrl = $env:VITE_API_BASE_URL
try {
    $env:VITE_API_BASE_URL = $ApiBaseUrl.TrimEnd("/")
    Push-Location $repositoryRoot
    try {
        Write-Host "Frontend: http://localhost:$Port"
        Write-Host "API base: $env:VITE_API_BASE_URL"
        Write-Host "Press Ctrl+C to stop."
        & npm run dev -- --host 127.0.0.1 --port $Port
        if ($LASTEXITCODE -ne 0) { throw "Frontend exited with code $LASTEXITCODE." }
    }
    finally { Pop-Location }
}
finally {
    if ($null -eq $previousApiBaseUrl) { Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue }
    else { $env:VITE_API_BASE_URL = $previousApiBaseUrl }
}
