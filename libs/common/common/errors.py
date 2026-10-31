"""Định dạng lỗi thống nhất cho mọi service: {"error": {"code": ..., "message": ...}}."""
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(status_code=status_code, detail={"code": code, "message": message})


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def _http(_: Request, exc: HTTPException):
        detail = exc.detail if isinstance(exc.detail, dict) else {"code": "HTTP_ERROR", "message": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content={"error": detail})

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        """422 theo định dạng chung. Không lặp lại giá trị đầu vào (có thể là NaN làm hỏng JSON, hoặc dữ liệu nhạy cảm)."""
        details = [{"field": ".".join(str(p) for p in e.get("loc", ()) if p != "body"), "message": e.get("msg", "")}
                   for e in exc.errors()]
        return JSONResponse(status_code=422, content={"error": {"code": "VALIDATION_ERROR",
                                                                "message": "Dữ liệu không hợp lệ", "details": details}})
