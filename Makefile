.PHONY: up down logs ps build test lint seed demo-expire keys e2e simulate

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
	  (cd services/$$s && PYTHONPATH=../../libs python -m pytest -q) || exit 1; \
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
