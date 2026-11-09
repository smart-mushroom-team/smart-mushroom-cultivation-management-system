-- P1 early termination, published policies, variety-specific rental packages.
ALTER TABLE rental_packages ADD COLUMN IF NOT EXISTS package_scope text NOT NULL DEFAULT 'GENERAL' CHECK (package_scope IN ('GENERAL','VARIETY'));
CREATE TABLE IF NOT EXISTS rental_package_varieties (
 package_id uuid NOT NULL REFERENCES rental_packages(id) ON DELETE CASCADE,
 variety_id uuid NOT NULL REFERENCES mushroom_varieties(id),
 PRIMARY KEY(package_id,variety_id)
);
CREATE TABLE IF NOT EXISTS rental_termination_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 rental_id uuid NOT NULL REFERENCES rentals(id),
 customer_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','APPROVED','REJECTED','REFUNDED','COMPLETED')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 used_days int NOT NULL CHECK (used_days>=0), remaining_days int NOT NULL CHECK (remaining_days>0),
 refund_rate numeric(4,3) NOT NULL DEFAULT 0.700,
 refund_amount numeric(14,2) NOT NULL CHECK (refund_amount>=0),
 bank_name text NOT NULL, account_number text NOT NULL, account_holder text NOT NULL,
 rejection_reason text, reviewed_by uuid, reviewed_at timestamptz,
 transfer_reference text, refunded_at timestamptz, cleared_by uuid, cleared_at timestamptz,
 policy_version int
);
CREATE UNIQUE INDEX IF NOT EXISTS termination_one_open_request ON rental_termination_requests(rental_id)
 WHERE status IN ('PENDING_REVIEW','APPROVED','REFUNDED');
CREATE INDEX IF NOT EXISTS termination_rental_idx ON rental_termination_requests(rental_id,requested_at DESC);
CREATE TABLE IF NOT EXISTS rental_policies (
 version int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 content text NOT NULL CHECK(length(btrim(content))>0),
 published_at timestamptz NOT NULL DEFAULT now(), published_by uuid NOT NULL
);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS policy_version int REFERENCES rental_policies(version);
