-- ================================================================
-- Fleetify - Fleet Maintenance System
-- Schema + Seed Data
-- Engine: InnoDB | MySQL 8.0
-- ================================================================

CREATE DATABASE IF NOT EXISTS fleetify_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fleetify_db;

-- ── Table: users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100)    NOT NULL UNIQUE,
  role     ENUM('SA','APPROVAL') NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table: vehicles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  license_plate VARCHAR(20)  NOT NULL UNIQUE,
  model         VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table: master_items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_items (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_name VARCHAR(150) NOT NULL,
  type      ENUM('PART','SERVICE') NOT NULL,
  price     DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table: maintenance_reports ───────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_reports (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id    BIGINT UNSIGNED NOT NULL,
  created_by    BIGINT UNSIGNED NOT NULL,
  odometer      BIGINT NOT NULL,
  complaint     TEXT NOT NULL,
  status        ENUM('PENDING_APPROVAL','APPROVED','COMPLETED') DEFAULT 'PENDING_APPROVAL',
  initial_photo VARCHAR(255),
  proof_photo   VARCHAR(255),
  created_at    DATETIME(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_reports_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  CONSTRAINT fk_reports_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table: report_items ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id      BIGINT UNSIGNED NOT NULL,
  item_id        BIGINT UNSIGNED NOT NULL,
  quantity       BIGINT NOT NULL,
  price_snapshot DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_report_items_report FOREIGN KEY (report_id) REFERENCES maintenance_reports(id),
  CONSTRAINT fk_report_items_item   FOREIGN KEY (item_id)   REFERENCES master_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================================
-- SEED DATA
-- ================================================================

-- Users (min. 2)
INSERT IGNORE INTO users (username, role) VALUES
  ('budi_sa',       'SA'),
  ('siti_sa',       'SA'),
  ('andi_approval', 'APPROVAL');

-- Vehicles (min. 3)
INSERT IGNORE INTO vehicles (license_plate, model) VALUES
  ('B 1234 ABC', 'Toyota Avanza 2022'),
  ('D 5678 XYZ', 'Mitsubishi L300 2021'),
  ('F 9012 DEF', 'Isuzu ELF 2020');

-- Master Items (min. 5)
INSERT IGNORE INTO master_items (item_name, type, price) VALUES
  ('Oli Mesin 4L',      'PART',    85000),
  ('Filter Oli',        'PART',    35000),
  ('Kampas Rem Depan',  'PART',   150000),
  ('Jasa Ganti Oli',    'SERVICE', 50000),
  ('Jasa Servis AC',    'SERVICE',200000);
