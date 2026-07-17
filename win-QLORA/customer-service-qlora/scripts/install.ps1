[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$PackageRoot = Split-Path -Parent $PSScriptRoot
$FactoryDir = Join-Path $PackageRoot "LLaMA-Factory"
$VenvDir = Join-Path $PackageRoot ".venv"
$Python = Join-Path $VenvDir "Scripts\python.exe"

if (-not (Test-Path (Join-Path $FactoryDir "pyproject.toml"))) {
    if (Test-Path $FactoryDir) {
        throw "LLaMA-Factory 目录存在但不完整，请检查：$FactoryDir"
    }
    Write-Host "正在克隆 LLaMA-Factory..."
    git clone --depth 1 https://github.com/hiyouga/LLaMA-Factory.git $FactoryDir
    if ($LASTEXITCODE -ne 0) { throw "克隆 LLaMA-Factory 失败。" }
}
if (-not (Test-Path $Python)) {
    python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) { throw "创建虚拟环境失败。" }
}

& $Python -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "升级 pip 失败。" }
& $Python -m pip install torch==2.8.0 torchvision==0.23.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cu128
if ($LASTEXITCODE -ne 0) { throw "安装 PyTorch cu128 失败。" }
& $Python -m pip install -e $FactoryDir
if ($LASTEXITCODE -ne 0) { throw "安装 LLaMA-Factory 失败。" }
& $Python -m pip install -r (Join-Path $FactoryDir "requirements\bitsandbytes.txt")
if ($LASTEXITCODE -ne 0) { throw "安装 bitsandbytes 失败。" }
& $Python -m pip install --force-reinstall sentencepiece==0.2.1
if ($LASTEXITCODE -ne 0) { throw "安装 sentencepiece 失败。" }

Write-Host "安装完成，请运行 .\scripts\verify.ps1"
