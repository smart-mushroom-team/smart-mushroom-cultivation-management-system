.PHONY: up down logs ps build test lint seed demo-expire keys e2e simulate nifi-driver nifi-flow aggregator test-infra web-install web-dev web-test ui-test web-url

up:            ## dựng toàn bộ hệ thống
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

test:          ## chạy test của cả ba service + gateway
	for s in gateway identity core monitoring; do \
	  (cd services/$$s && PYTHONPATH=../../libs/common:. python -m pytest -q) || exit 1; \
	done

lint:
	ruff check .

seed:          ## nạp dữ liệu mẫu (phòng, khay, gói, thiết bị)
	set -a; . ./.env; set +a; python scripts/seed_sample_data.py

demo-expire:   ## make demo-expire DATE=2026-12-01 ; chạy job hết hạn thủ công (chỉ khi DEMO_MODE=true)
	set -a; . ./.env; set +a; python scripts/demo_run_expiry.py $(DATE)

e2e:           ## test toàn luồng trên stack đang chạy (cần make up). Bỏ qua phần chờ offline: make e2e E2E_FAST=1
	set -a; . ./.env; set +a; E2E=1 E2E_FAST=$(E2E_FAST) python -m pytest tests/e2e/test_full_flow.py -v -s

simulate:      ## giả lập cảm biến cho mọi phòng. Ví dụ: make simulate ARGS="--profile hot --with-camera"
	set -a; . ./.env; set +a; SIM_PASSWORD=$$SEED_ADMIN_PASSWORD python devices/simulator/simulate_devices.py --email $$SEED_ADMIN_EMAIL --all-rooms $(ARGS)

nifi-driver:   ## tải driver JDBC PostgreSQL cho NiFi (một lần, trước make up)
	python infra/nifi/download_driver.py

nifi-flow:     ## dựng luồng NiFi gộp 5 phút (sau make up và khi NiFi đã khởi động, lần đầu 1-3 phút). Dựng lại: make nifi-flow ARGS=--recreate
	python infra/nifi/provision_flow.py $(ARGS)

aggregator:    ## chạy aggregator DỰ PHÒNG thay NiFi (cùng câu SQL), ví dụ khi NiFi chưa dựng xong
	docker compose --profile fallback up -d --build aggregator

test-infra:    ## test script NiFi (dùng NiFi giả, không cần Docker)
	python -m pytest tests/nifi -q

web-install:   ## cài thư viện cho web (cần Node.js 20 trở lên)
	cd clients/web && npm ci

web-dev:       ## chạy web ở http://localhost:5173 (tự chuyển tiếp /api tới Gateway ở :8000; cần make up)
	cd clients/web && npm run dev

web-test:      ## kiểm kiểu TypeScript và chạy test đơn vị của web
	cd clients/web && npm run typecheck && npm test

web-url:       ## địa chỉ web khi chạy bằng compose (service `web`, nginx)
	@echo "http://localhost:$${WEB_PORT:-8080}"

ui-test:       ## test giao diện web bằng trình duyệt thật (cần make up và make web-dev; lần đầu: pip install playwright pytest requests && playwright install chromium)
	set -a; . ./.env; set +a; E2E=1 python -m pytest tests/ui -v
