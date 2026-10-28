-- Script de retour arrière (Rollback) pour la migration 0002
-- Supprime uniquement les tables complémentaires en préservant intactes la table reservations et les données existantes

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

