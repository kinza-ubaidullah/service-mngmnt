-- Run on aljafvrp_crmdatabase in phpMyAdmin (one time after deploy)
-- Skip any line that says "Duplicate column" — that means it already exists

-- === Missing columns on leads / customers / workshop ===
ALTER TABLE leads ADD COLUMN agreed_amount DECIMAL(10,2) NULL;
ALTER TABLE leads ADD COLUMN payment_confirmed TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN pending_outcome VARCHAR(50) NULL;
ALTER TABLE leads ADD COLUMN voice_note LONGTEXT NULL;
ALTER TABLE leads ADD COLUMN lat DOUBLE NULL;
ALTER TABLE leads ADD COLUMN lng DOUBLE NULL;

ALTER TABLE leads MODIFY COLUMN house_image LONGTEXT NULL;
ALTER TABLE leads MODIFY COLUMN product_image LONGTEXT NULL;

ALTER TABLE customers MODIFY COLUMN google_map_link TEXT NULL;
ALTER TABLE customers MODIFY COLUMN exact_address TEXT NULL;

ALTER TABLE areas ADD COLUMN lat DOUBLE NULL;
ALTER TABLE areas ADD COLUMN lng DOUBLE NULL;

ALTER TABLE workshop_jobs ADD COLUMN delivery_assigned_to INT NULL;
ALTER TABLE workshop_jobs ADD COLUMN delivery_assigned_at DATETIME NULL;

ALTER TABLE expenses ADD COLUMN custom_data JSON NULL;
ALTER TABLE expenses ADD COLUMN is_recurring TINYINT(1) NOT NULL DEFAULT 0;

-- === Missing tables ===
CREATE TABLE IF NOT EXISTS technician_settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  technician_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255) NULL,
  lead_id INT NULL,
  is_received TINYINT(1) NOT NULL DEFAULT 0,
  received_at DATETIME NULL,
  received_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(191) NOT NULL,
  field_name VARCHAR(191) NOT NULL,
  field_type VARCHAR(191) NOT NULL,
  options JSON NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(191) NULL,
  action_type VARCHAR(191) NOT NULL,
  module VARCHAR(191) NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  panel VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trash (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_name VARCHAR(191) NOT NULL,
  record_id INT NOT NULL,
  data JSON NOT NULL,
  deleted_by INT NULL,
  deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  content TEXT NULL,
  visibility VARCHAR(191) NOT NULL DEFAULT 'Public',
  location VARCHAR(191) NULL,
  hashtags VARCHAR(191) NULL,
  product_tag VARCHAR(191) NULL,
  media JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX posts_user_id_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
