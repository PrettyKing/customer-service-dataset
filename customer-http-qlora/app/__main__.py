from __future__ import annotations

import argparse

import uvicorn

from .config import Settings


def main() -> None:
    parser = argparse.ArgumentParser(description="启动中文客服 QLoRA API")
    parser.add_argument("--reload", action="store_true", help="启用开发热重载")
    args = parser.parse_args()
    settings = Settings.from_env()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
