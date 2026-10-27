import os


def env(name: str, default: str | None = None, required: bool = False) -> str:
    v = os.getenv(name, default)
    if required and not v:
        raise RuntimeError(f"Thiếu biến môi trường {name}")
    return v  # type: ignore[return-value]
