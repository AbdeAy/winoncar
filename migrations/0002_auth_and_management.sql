-- Migration 0002 : Authentification, Gestion des Rôles, Véhicules & Journal d'Audit
-- Tables complémentaires créées pour le Dashboard Admin & Super Admin

-- 1. Table des utilisateurs (Admin et Super Admin)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'superadmin')),
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'actif' CHECK(status IN ('actif', 'desactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- 2. Table des sessions actives
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Table des véhicules (catalogue dynamique avec état)
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  price_mad INTEGER NOT NULL,
  badge TEXT,
  image_url TEXT NOT NULL,
  gearbox TEXT NOT NULL,
  fuel TEXT NOT NULL,
  seats TEXT NOT NULL,
  ac TEXT NOT NULL,
  bags TEXT NOT NULL,
  doors TEXT NOT NULL,
  description TEXT NOT NULL,
  availability TEXT DEFAULT 'disponible' CHECK(availability IN ('disponible', 'loue', 'maintenance')),
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table du journal d'audit administratif
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(is_active);

-- Initialisation de la table des véhicules avec les 10 modèles vérifiés existants
INSERT OR IGNORE INTO vehicles (id, name, category, category_label, price_mad, badge, image_url, gearbox, fuel, seats, ac, bags, doors, description, availability, is_active, display_order)
VALUES
('sandero', 'Dacia Sandero Stepway', 'eco', 'Citadine Économique', 280, 'Le Plus Demandé', 'assets/cars/dacia-sandero-stepway.jpg', 'Manuelle', 'Essence', '5 Places', 'Climatisation A/C', '2 Valises', '5 Portes', 'Idéale pour circuler dans Agadir et visiter Taghazout en réalisant des économies sur le carburant.', 'disponible', 1, 1),
('clio5', 'Renault Clio 5', 'eco', 'Citadine Moderne', 320, 'Très Sobre', 'assets/cars/renault-clio-5.jpg', 'Manuelle', 'Diesel', '5 Places', 'Climatisation A/C', '2 Valises', '5 Portes', 'La citadine préférée des voyageurs : très sobre en carburant avec écran tactile et Bluetooth.', 'disponible', 1, 2),
('peugeot208', 'Peugeot 208 GT', 'eco', 'Citadine Premium', 360, 'Design Sport', 'assets/cars/peugeot-208.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '2 Valises', '5 Portes', 'Look moderne et cockpit digital. Idéale pour sillonner la corniche et la marina d''Agadir avec style.', 'disponible', 1, 3),
('accent', 'Hyundai Accent', 'berline', 'Berline Confort', 400, 'Grand Coffre', 'assets/cars/hyundai-accent.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '3 Valises', '4 Portes', 'Spacieuse, silencieuse et dotée d''un grand coffre pour accueillir tous vos bagages à l''aéroport.', 'disponible', 1, 4),
('golf8', 'Volkswagen Golf 8 DSG', 'berline', 'Berline Compacte Luxe', 550, 'Performance Allemande', 'assets/cars/vw-golf-8.jpg', 'Automatique DSG', 'Diesel', '5 Places', 'Clim Bizone', '3 Valises', '5 Portes', 'La référence allemande pour un plaisir de conduite absolu sur les autoroutes et routes du Maroc.', 'disponible', 1, 5),
('duster', 'Dacia Duster 4x4', 'suv', 'SUV Tout-Chemin', 420, 'Idéal Taghazout & Dunes', 'assets/cars/dacia-duster.jpg', 'Manuelle 6 vit.', 'Diesel', '5 Places', 'Climatisation A/C', '3 Valises', '5 Portes', 'Le SUV le plus demandé à Agadir : robuste, surélevé et parfaitement adapté aux plages et sentiers.', 'disponible', 1, 6),
('tucson', 'Hyundai Tucson', 'suv', 'SUV Familial Élégant', 650, 'Toit Panoramique', 'assets/cars/hyundai-tucson.jpg', 'Automatique', 'Diesel', '5 Places', 'Clim Tri-Zone', '4 Valises', '5 Portes', 'Confort de première classe pour les familles ou groupes d''amis désirant voyager dans un grand luxe.', 'disponible', 1, 7),
('sportage', 'Kia Sportage GT-Line', 'suv', 'SUV Sportif', 580, 'Technologie & Caméra', 'assets/cars/kia-sportage.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '3 Valises', '5 Portes', 'Lignes dynamiques, caméra de recul et sécurité maximale pour explorer toute la région Souss-Massa.', 'disponible', 1, 8),
('mercedes', 'Mercedes-Benz Classe C', 'luxe', 'Prestige & Berline VIP', 1100, 'Luxe Exceptionnel', 'assets/cars/mercedes-c-class.jpg', 'Automatique 9G', 'Diesel', '5 Places', 'Clim Thermotronic', '3 Valises', '4 Portes', 'L''élégance incarnée pour vos rendez-vous d''affaires ou séjours luxueux dans les palaces d''Agadir.', 'disponible', 1, 9),
('evoque', 'Range Rover Evoque', 'luxe', 'Prestige SUV VIP', 1200, 'Prestige VIP', 'assets/cars/range-rover-evoque.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '4 Valises', '5 Portes', 'Intérieur cuir raffiné et stature prestigieuse pour une expérience de conduite inoubliable.', 'disponible', 1, 10);

