-- identity_db: User (FR-01 – FR-04). Không có RefreshToken, không khóa tạm (v2.4).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text        NOT NULL,
    email         text        NOT NULL,
    password_hash text        NOT NULL,
    role          text        NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'CUSTOMER')),
    status        text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at    timestamptz NOT NULL DEFAULT now()
);
-- email duy nhất, không phân biệt hoa thường (FR-02)
CREATE UNIQUE INDEX users_email_lower_uk ON users (lower(email));
