-- WINON CAR - Migration 0001 : Schéma Initial
-- Archive de référence de la table des réservations existante

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_ref TEXT UNIQUE NOT NULL,
  car_id TEXT NOT NULL,
  car_name TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  return_location TEXT NOT NULL,
  pickup_date TEXT NOT NULL,
  pickup_time TEXT NOT NULL,
  return_date TEXT NOT NULL,
  return_time TEXT NOT NULL,
  days INTEGER NOT NULL,
  flight_number TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  notes TEXT,
  opt_wifi INTEGER DEFAULT 0,
  total_mad INTEGER NOT NULL,
  total_eur INTEGER NOT NULL,
  status TEXT DEFAULT 'en_attente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_ref ON reservations(booking_ref);
CREATE INDEX IF NOT EXISTS idx_reservations_created ON reservations(created_at);

