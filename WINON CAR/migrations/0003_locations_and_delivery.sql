-- WINON CAR - Migration 0003 : Villes, Lieux Spécifiques, Statut Frais de Livraison & Notifications
-- Migration strictement additive et non-destructive compatible avec l'existant

ALTER TABLE reservations ADD COLUMN pickup_city TEXT DEFAULT 'Agadir';
ALTER TABLE reservations ADD COLUMN return_city TEXT DEFAULT 'Agadir';
ALTER TABLE reservations ADD COLUMN delivery_fee_status TEXT DEFAULT 'pending_confirmation' 
  CHECK(delivery_fee_status IN ('pending_confirmation', 'confirmed', 'unavailable'));
ALTER TABLE reservations ADD COLUMN delivery_fee_mad INTEGER DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN is_read INTEGER DEFAULT 0;

-- Index pour optimiser les requêtes Dashboard et les alertes de réservation
CREATE INDEX IF NOT EXISTS idx_reservations_unread ON reservations(is_read);
CREATE INDEX IF NOT EXISTS idx_reservations_delivery ON reservations(delivery_fee_status);

