[CmdletBinding()]
param()

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
& $Python -m compileall -q app tests
& $Python -m pytest -q
& $Python -c "from app.config import Settings; s=Settings.from_env(); assert s.base_model_path.is_dir(), s.base_model_path; assert (s.adapter_path/'adapter_config.json').is_file(), s.adapter_path; print('model_paths=ok')"
& $Python -c "import torch, bitsandbytes; assert torch.cuda.is_available(); print('torch=', torch.__version__, 'gpu=', torch.cuda.get_device_name(0), 'bitsandbytes=', bitsandbytes.__version__)"
