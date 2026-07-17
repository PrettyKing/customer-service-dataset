[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$PackageRoot = Split-Path -Parent $PSScriptRoot
$WinQloraRoot = Split-Path -Parent $PackageRoot
$FactoryDir = Join-Path $PackageRoot "LLaMA-Factory"
$Python = Join-Path $PackageRoot ".venv\Scripts\python.exe"
$DataDir = Join-Path $WinQloraRoot "data"

if (-not (Test-Path $Python)) { throw "请先运行 .\scripts\install.ps1" }

$Code = @'
import json, pathlib, sys
import torch, bitsandbytes as bnb
from bitsandbytes.functional import quantize_4bit, dequantize_4bit
data_dir = pathlib.Path(sys.argv[1])
info = json.loads((data_dir / "dataset_info.json").read_text(encoding="utf-8"))
expected = {"customer_service_demo": 12, "customer_service_mock": 80, "customer_service_train": 41}
for name, count in expected.items():
    rows = json.loads((data_dir / info[name]["file_name"]).read_text(encoding="utf-8"))
    assert len(rows) == count, (name, len(rows), count)
assert torch.cuda.is_available(), "CUDA 不可用"
x = torch.randn(256, 256, device="cuda", dtype=torch.bfloat16)
q, state = quantize_4bit(x, quant_type="nf4")
y = dequantize_4bit(q, state)
torch.cuda.synchronize()
print("datasets=ok")
print("torch=", torch.__version__, "cuda=", torch.version.cuda)
print("gpu=", torch.cuda.get_device_name(0), "capability=", torch.cuda.get_device_capability(0))
print("bitsandbytes=", bnb.__version__, "nf4=", tuple(y.shape))
'@
$Code | & $Python - $DataDir
if ($LASTEXITCODE -ne 0) { throw "CUDA/NF4 检查失败。" }

Push-Location $FactoryDir
try {
    & $Python -m llamafactory.cli version
    if ($LASTEXITCODE -ne 0) { throw "LLaMA-Factory 校验失败。" }
}
finally { Pop-Location }
