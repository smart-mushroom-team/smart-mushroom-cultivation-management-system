FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONPATH=/app/libs/common:/app
WORKDIR /app
COPY services/identity/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY libs/common /app/libs/common
COPY services/identity /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
