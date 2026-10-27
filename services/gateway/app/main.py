"""API Gateway (FR-47 – FR-50): định tuyến theo tiền tố, JWT sơ bộ, CORS, giới hạn body, chặn /internal.
Không chứa nghiệp vụ, không có cơ sở dữ liệu, không dùng Redis (BR-17)."""
import os

import httpx
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware

from common.app_factory import create_app
from common.errors import AppError
from common.security import decode_token

app = create_app("gateway", "Điểm vào duy nhất của hệ thống")

UPSTREAMS = {
    "identity": os.getenv("IDENTITY_URL", "http://identity:8000"),
    "core": os.getenv("CORE_URL", "http://core:8000"),
    "monitoring": os.getenv("MONITORING_URL", "http://monitoring:8000"),
}
TIMEOUT = float(os.getenv("UPSTREAM_TIMEOUT_SECONDS", "30"))          # FR-50
MAX_BODY = int(os.getenv("MAX_BODY_BYTES", str(2 * 1024 * 1024)))      # FR-49: ảnh tối đa 2 MB

app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
                   allow_methods=["*"], allow_headers=["*"])

# Route người dùng không cần JWT (FR-48)
PUBLIC = {("identity", "/auth/login"), ("identity", "/auth/register")}
HOP = {"host", "content-length", "connection", "transfer-encoding"}


def is_public(service: str, path: str) -> bool:
    if (service, path) in PUBLIC:
        return True
    return path in ("/docs", "/openapi.json", "/redoc")       # Swagger UI, chỉ bật ở dev/demo (FR-57)


async def forward(service: str, path: str, request: Request) -> Response:
    body = await request.body()
    if len(body) > MAX_BODY:
        return Response(status_code=413, content=b'{"error":{"code":"BODY_TOO_LARGE","message":"Vuot 2 MB"}}',
                        media_type="application/json")
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP}
    url = f"{UPSTREAMS[service]}{path}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.request(request.method, url, params=request.query_params, content=body, headers=headers)
    except httpx.ConnectError:
        return _err(503, "UPSTREAM_DOWN")
    except httpx.TimeoutException:
        return _err(504, "UPSTREAM_TIMEOUT")
    except httpx.HTTPError:
        return _err(502, "BAD_GATEWAY")
    out = {k: v for k, v in r.headers.items() if k.lower() not in HOP | {"content-encoding"}}
    return Response(content=r.content, status_code=r.status_code, headers=out)


def _err(code: int, name: str) -> Response:
    return Response(status_code=code, media_type="application/json",
                    content=('{"error":{"code":"%s","message":"Service phia sau khong phan hoi"}}' % name).encode())


@app.api_route("/api/{service}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
async def api(service: str, path: str, request: Request):
    if service not in UPSTREAMS:
        raise AppError(404, "NOT_FOUND", "Không có service này")
    sub = "/" + path
    if sub.startswith("/internal") or sub.startswith("/metrics"):        # FR-49, FR-55
        raise AppError(404, "NOT_FOUND", "Không tồn tại")
    if not is_public(service, sub):
        auth = request.headers.get("authorization", "")
        if not auth.lower().startswith("bearer "):
            raise AppError(401, "UNAUTHENTICATED", "Thiếu token")
        decode_token(auth[7:])                                          # chữ ký + thời hạn (FR-48)
    return await forward(service, sub, request)


@app.api_route("/iot/{path:path}", methods=["GET", "POST"], include_in_schema=False)
async def iot(path: str, request: Request):
    """Thiết bị dùng X-Device-Key, do Monitoring kiểm tra (BR-17); Gateway không kiểm JWT."""
    return await forward("monitoring", "/iot/" + path, request)
