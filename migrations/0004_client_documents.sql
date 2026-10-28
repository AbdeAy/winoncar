-- WINON CAR - Migration 0004 : Documents Clients (CIN & Permis) & Langue de Réservation
-- Migration strictement additive et rétrocompatible

ALTER TABLE reservations ADD COLUMN client_language TEXT DEFAULT 'fr';
ALTER TABLE reservations ADD COLUMN doc_cin_recto TEXT DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN doc_cin_verso TEXT DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN doc_license_recto TEXT DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN doc_license_verso TEXT DEFAULT NULL;

-- Index pour optimiser les requêtes filtrées
CREATE INDEX IF NOT EXISTS idx_reservations_language ON reservations(client_language);

