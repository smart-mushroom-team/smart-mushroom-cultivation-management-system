-- Smart Mushroom: 4 rows x 2 shelves x 4 slots, exactly one tray per position.
-- Apply only after backup. Invalid/duplicate historical data must be resolved first.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM trays WHERE location_row NOT BETWEEN 1 AND 4 OR location_shelf NOT BETWEEN 1 AND 2 OR location_slot NOT BETWEEN 1 AND 4) THEN
  RAISE EXCEPTION 'Existing trays have positions outside the 4x2x4 room layout';
 END IF;
 IF EXISTS (SELECT 1 FROM trays GROUP BY room_id,location_row,location_shelf,location_slot HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Duplicate tray positions exist; fix them before migration';
 END IF;
END $$;
ALTER TABLE trays ADD CONSTRAINT trays_row_range CHECK (location_row BETWEEN 1 AND 4);
ALTER TABLE trays ADD CONSTRAINT trays_shelf_range CHECK (location_shelf BETWEEN 1 AND 2);
ALTER TABLE trays ADD CONSTRAINT trays_slot_range CHECK (location_slot BETWEEN 1 AND 4);
CREATE UNIQUE INDEX trays_one_per_position ON trays(room_id,location_row,location_shelf,location_slot);
-- Existing packages are preserved for historical rental foreign keys.
INSERT INTO rental_packages(name,duration_days,price_per_tray,is_active)
SELECT 'Gói ' || d || ' ngày',d,0,true FROM (VALUES (10),(15),(30)) AS v(d)
WHERE NOT EXISTS (SELECT 1 FROM rental_packages p WHERE p.duration_days=d);

-- One rental belongs to one room. Historical rows with mixed rooms stay NULL until reconciled.
ALTER TABLE rentals ADD COLUMN room_id uuid REFERENCES rooms(id);
UPDATE rentals r SET room_id=x.room_id FROM (
 SELECT rt.rental_id, MIN(t.room_id::text)::uuid AS room_id
 FROM rental_trays rt JOIN trays t ON t.id=rt.tray_id
 GROUP BY rt.rental_id HAVING COUNT(DISTINCT t.room_id)=1
) x WHERE r.id=x.rental_id;
