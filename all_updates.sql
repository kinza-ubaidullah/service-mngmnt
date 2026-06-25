-- =========================================================================
-- CONSOLIDATED DATABASE UPDATES FOR AL JAROSHI CRM (cPanel Production)
-- Run this entire script in phpMyAdmin > SQL tab
-- =========================================================================

-- 1. Create Stored Procedure to safely add columns if they do not exist
DROP PROCEDURE IF EXISTS AddColumnIfNeeded;
DELIMITER //
CREATE PROCEDURE AddColumnIfNeeded(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_definition VARCHAR(255)
)
BEGIN
    DECLARE column_count INT;
    SELECT COUNT(*) INTO column_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name;
    
    IF column_count = 0 THEN
        SET @sql_stmt = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_definition);
        PREPARE stmt FROM @sql_stmt;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- 2. Safely add missing columns to existing tables
CALL AddColumnIfNeeded('users', 'totp_secret', 'VARCHAR(255) NULL');
CALL AddColumnIfNeeded('users', 'totp_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNeeded('users', 'plain_password', 'VARCHAR(191) NULL');
CALL AddColumnIfNeeded('users', 'location_name', 'VARCHAR(191) NULL');
CALL AddColumnIfNeeded('users', 'lat', 'DOUBLE NULL');
CALL AddColumnIfNeeded('users', 'lng', 'DOUBLE NULL');
CALL AddColumnIfNeeded('users', 'specialization', 'VARCHAR(191) NULL');
CALL AddColumnIfNeeded('users', 'address', 'VARCHAR(191) NULL');
CALL AddColumnIfNeeded('users', 'profile_picture', 'VARCHAR(191) NULL');

CALL AddColumnIfNeeded('leads', 'agreed_amount', 'DECIMAL(10,2) NULL');
CALL AddColumnIfNeeded('leads', 'payment_confirmed', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNeeded('leads', 'pending_outcome', 'VARCHAR(50) NULL');
CALL AddColumnIfNeeded('leads', 'voice_note', 'LONGTEXT NULL');
CALL AddColumnIfNeeded('leads', 'lat', 'DOUBLE NULL');
CALL AddColumnIfNeeded('leads', 'lng', 'DOUBLE NULL');
CALL AddColumnIfNeeded('leads', 'area_id', 'INTEGER NULL');

CALL AddColumnIfNeeded('customers', 'google_map_link', 'TEXT NULL');
CALL AddColumnIfNeeded('customers', 'exact_address', 'TEXT NULL');

CALL AddColumnIfNeeded('areas', 'lat', 'DOUBLE NULL');
CALL AddColumnIfNeeded('areas', 'lng', 'DOUBLE NULL');

CALL AddColumnIfNeeded('workshop_jobs', 'delivery_assigned_to', 'INT NULL');
CALL AddColumnIfNeeded('workshop_jobs', 'delivery_assigned_at', 'DATETIME NULL');
CALL AddColumnIfNeeded('workshop_jobs', 'agreed_parts', 'TEXT NULL');
CALL AddColumnIfNeeded('workshop_jobs', 'additional_parts', 'TEXT NULL');

CALL AddColumnIfNeeded('expenses', 'custom_data', 'JSON NULL');
CALL AddColumnIfNeeded('expenses', 'is_recurring', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNeeded('expenses', 'frequency', 'VARCHAR(191) NULL');
CALL AddColumnIfNeeded('expenses', 'due_day', 'INTEGER NULL');
CALL AddColumnIfNeeded('expenses', 'next_due', 'DATETIME(3) NULL');
CALL AddColumnIfNeeded('expenses', 'last_paid', 'DATETIME(3) NULL');

-- Clean up stored procedure
DROP PROCEDURE IF EXISTS AddColumnIfNeeded;

-- 3. Modify columns to ensure correct ENUM values and column lengths
ALTER TABLE leads MODIFY COLUMN status ENUM(
  'New','Assigned','InProgress','PendingApproval','Completed','Cancelled',
  'InspectionCompleted','PickedForWorkshop','Reopened','Complaint','Deleted'
) NOT NULL DEFAULT 'New';

ALTER TABLE leads MODIFY COLUMN house_image LONGTEXT NULL;
ALTER TABLE leads MODIFY COLUMN product_image LONGTEXT NULL;
ALTER TABLE customers MODIFY COLUMN google_map_link TEXT NULL;
ALTER TABLE customers MODIFY COLUMN exact_address TEXT NULL;

-- 4. Create missing tables if they do not exist
CREATE TABLE IF NOT EXISTS `areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    UNIQUE INDEX `areas_name_key`(`name`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `technician_settlements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `technician_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `description` VARCHAR(255) NULL,
  `lead_id` INT NULL,
  `is_received` TINYINT(1) NOT NULL DEFAULT 0,
  `received_at` DATETIME NULL,
  `received_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `custom_fields` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `module` VARCHAR(191) NOT NULL,
  `field_name` VARCHAR(191) NOT NULL,
  `field_type` VARCHAR(191) NOT NULL,
  `options` JSON NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_name` VARCHAR(191) NULL,
  `action_type` VARCHAR(191) NOT NULL,
  `module` VARCHAR(191) NOT NULL,
  `old_value` JSON NULL,
  `new_value` JSON NULL,
  `panel` VARCHAR(191) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trash` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `model_name` VARCHAR(191) NOT NULL,
  `record_id` INT NOT NULL,
  `data` JSON NOT NULL,
  `deleted_by` INT NULL,
  `deleted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `content` TEXT NULL,
  `visibility` VARCHAR(191) NOT NULL DEFAULT 'Public',
  `location` VARCHAR(191) NULL,
  `hashtags` VARCHAR(191) NULL,
  `product_tag` VARCHAR(191) NULL,
  `media` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX posts_user_id_idx (`user_id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `otp` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `is_used` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
