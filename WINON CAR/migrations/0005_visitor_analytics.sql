-- WINON CAR - Migration 0005 : Mesures d'Audience & Statistiques Visiteurs
-- Stockage conforme à la protection de la vie privée (RGPD & CNDP : aucun stockage d'IP brute)

CREATE TABLE IF NOT EXISTS site_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  referrer TEXT DEFAULT NULL,
  device_type TEXT DEFAULT 'mobile',
  is_visit INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les agrégations temporelles et le calcul des métriques
CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_date ON site_visits(visitor_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_session ON site_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_is_visit ON site_visits(is_visit, created_at);

