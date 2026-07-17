$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvPath = Join-Path $ProjectRoot ".venv"

if (-not (Test-Path $VenvPath)) {
    $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
    $BootstrapPython = if ($PythonCommand) {
        $PythonCommand.Source
    } else {
        Join-Path (Split-Path $ProjectRoot -Parent) "customer-service-qlora\win\.venv\Scripts\python.exe"
    }
    if (-not (Test-Path $BootstrapPython)) {
        throw "未找到 Python 3.11，请先安装 Python 或运行 Windows QLoRA 环境安装脚本"
    }
    & $BootstrapPython -m venv $VenvPath
}

$Python = Join-Path $VenvPath "Scripts\python.exe"
& $Python -m pip install --upgrade pip
& $Python -m pip install -r (Join-Path $ProjectRoot "requirements.txt")
Write-Host "RAG 环境安装完成：$Python"
