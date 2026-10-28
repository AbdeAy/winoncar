-- WINON CAR - Rollback 0004 : Annulation stricte de la migration 0004
-- Suppression de l'index et des 5 colonnes ajoutées

DROP INDEX IF EXISTS idx_reservations_language;

ALTER TABLE reservations DROP COLUMN client_language;
ALTER TABLE reservations DROP COLUMN doc_cin_recto;
ALTER TABLE reservations DROP COLUMN doc_cin_verso;
ALTER TABLE reservations DROP COLUMN doc_license_recto;
ALTER TABLE reservations DROP COLUMN doc_license_verso;

