.PHONY: up down logs ps build test lint seed demo-expire keys

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
