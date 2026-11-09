-- Non-destructive upgrade: preserve sensor readings, snapshots and existing devices.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS camera_slot smallint;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- Existing cameras get slot 1 by default; resolve duplicates manually if present.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY room_id ORDER BY created_at,id) AS rn
  FROM devices WHERE type='CAMERA' AND deleted_at IS NULL
)
UPDATE devices d SET camera_slot=ranked.rn FROM ranked WHERE d.id=ranked.id AND ranked.rn<=2;
-- Stop rather than silently dropping extra camera records.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM devices WHERE type='CAMERA' AND deleted_at IS NULL AND camera_slot IS NULL) THEN
   RAISE EXCEPTION 'More than 2 existing cameras in a room: resolve manually';
 END IF;
END $$;
ALTER TABLE devices ADD CONSTRAINT devices_camera_slot_valid CHECK (
 (type='CAMERA' AND camera_slot IN (1,2)) OR (type='SENSOR_NODE' AND camera_slot IS NULL));
DROP INDEX IF EXISTS devices_one_active_per_room_type;
CREATE UNIQUE INDEX devices_unique_camera_slot ON devices(room_id,camera_slot)
 WHERE type='CAMERA' AND deleted_at IS NULL;
CREATE UNIQUE INDEX devices_unique_sensor_room ON devices(room_id)
 WHERE type='SENSOR_NODE' AND deleted_at IS NULL;
