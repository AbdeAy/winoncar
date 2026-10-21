-- WINON CAR - Rollback de la Migration 0005 (Statistiques Visiteurs)

DROP INDEX IF EXISTS idx_site_visits_is_visit;
DROP INDEX IF EXISTS idx_site_visits_session;
DROP INDEX IF EXISTS idx_site_visits_visitor_date;
DROP INDEX IF EXISTS idx_site_visits_created;
DROP TABLE IF EXISTS site_visits;

