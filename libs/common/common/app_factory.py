"""Tạo FastAPI app chuẩn: OpenAPI/Swagger (FR-57), /health, /metrics (FR-55), xử lý lỗi thống nhất."""
import logging
import os

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from .errors import install_error_handlers


def create_app(title: str, description: str = "") -> FastAPI:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"),
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    # ROOT_PATH = /api/<service> để Swagger UI gọi đúng đường dẫn khi đi qua Gateway
    app = FastAPI(title=title, description=description, root_path=os.getenv("ROOT_PATH", ""))
    install_error_handlers(app)

    @app.get("/health", tags=["system"])
    def health():
        return {"status": "ok", "service": title}

    # /metrics nằm trong mạng docker, Gateway không định tuyến (FR-49, FR-55)
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    return app
