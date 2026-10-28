-- WINON CAR - Rollback 0003 : Annulation stricte de la migration 0003
-- Suppression des index créés et des colonnes ajoutées

DROP INDEX IF EXISTS idx_reservations_unread;
DROP INDEX IF EXISTS idx_reservations_delivery;

ALTER TABLE reservations DROP COLUMN pickup_city;
ALTER TABLE reservations DROP COLUMN return_city;
ALTER TABLE reservations DROP COLUMN delivery_fee_status;
ALTER TABLE reservations DROP COLUMN delivery_fee_mad;
ALTER TABLE reservations DROP COLUMN is_read;

