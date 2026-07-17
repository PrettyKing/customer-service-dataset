$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    throw "未找到 RAG Python 环境，请先运行 .\scripts\install.ps1"
}

Push-Location $ProjectRoot
try {
    & $Python -m app
} finally {
    Pop-Location
}
