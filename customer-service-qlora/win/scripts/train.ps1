[CmdletBinding()]
param(
    [ValidateSet("demo", "mock", "train")]
    [string]$Dataset = "demo"
)

$ErrorActionPreference = "Stop"
$PackageRoot = Split-Path -Parent $PSScriptRoot
$FactoryDir = Join-Path $PackageRoot "LLaMA-Factory"
$Python = Join-Path $PackageRoot ".venv\Scripts\python.exe"
$ConfigName = switch ($Dataset) {
    "demo" { "qwen3_8b_customer_demo_qlora.yaml" }
    "mock" { "qwen3_8b_customer_mock_qlora.yaml" }
    "train" { "qwen3_8b_customer_qlora.yaml" }
}
$Config = Join-Path $PackageRoot "configs\$ConfigName"

if (-not (Test-Path $Python)) { throw "请先运行 .\scripts\install.ps1" }
Push-Location $FactoryDir
try {
    & $Python -m llamafactory.cli train $Config
    if ($LASTEXITCODE -ne 0) { throw "训练失败，退出码：$LASTEXITCODE" }
}
finally { Pop-Location }
