[CmdletBinding()]
param(
    [switch]$Reload
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = Join-Path (Split-Path -Parent $ProjectRoot) "customer-service-qlora\win\.venv\Scripts\python.exe"
    if (-not (Test-Path $Python)) {
        throw "没有可用的虚拟环境，请先运行 .\scripts\install.ps1"
    }
    Write-Warning "未找到接口项目虚拟环境，临时复用 Windows QLoRA 训练环境。"
}

Set-Location $ProjectRoot
$Arguments = @("-m", "app")
if ($Reload) {
    $Arguments += "--reload"
}
& $Python @Arguments
