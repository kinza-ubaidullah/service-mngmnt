-- ========================================================
-- PRODUCTION DATABASE UPDATE SCRIPT
-- Run this entire script in cPanel -> phpMyAdmin -> SQL tab
-- ========================================================

-- 1. Users Table Columns
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `plain_password` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `profile_picture` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `location_name` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lat` DOUBLE NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lng` DOUBLE NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `specialization` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `address` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `totp_secret` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0;

-- 2. Leads Table Columns & Enums
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `agreed_amount` DECIMAL(10,2) NULL;
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `payment_confirmed` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `pending_outcome` VARCHAR(50) NULL;
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `voice_note` LONGTEXT NULL;
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `lat` DOUBLE NULL;
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `lng` DOUBLE NULL;
ALTER TABLE `leads` ADD COLUMN IF NOT EXISTS `area_id` INTEGER NULL;
ALTER TABLE `leads` MODIFY COLUMN `status` ENUM('New','Assigned','InProgress','PendingApproval','Completed','Cancelled','InspectionCompleted','PickedForWorkshop','Reopened','Complaint','Deleted') NOT NULL DEFAULT 'New';
ALTER TABLE `leads` MODIFY COLUMN `house_image` LONGTEXT NULL;
ALTER TABLE `leads` MODIFY COLUMN `product_image` LONGTEXT NULL;

-- 3. Customers Table Columns
ALTER TABLE `customers` MODIFY COLUMN `google_map_link` TEXT NULL;
ALTER TABLE `customers` MODIFY COLUMN `exact_address` TEXT NULL;

-- 4. Areas Table Columns
ALTER TABLE `areas` ADD COLUMN IF NOT EXISTS `lat` DOUBLE NULL;
ALTER TABLE `areas` ADD COLUMN IF NOT EXISTS `lng` DOUBLE NULL;

-- 5. Workshop Jobs Table Columns
ALTER TABLE `workshop_jobs` ADD COLUMN IF NOT EXISTS `delivery_assigned_to` INT NULL;
ALTER TABLE `workshop_jobs` ADD COLUMN IF NOT EXISTS `delivery_assigned_at` DATETIME NULL;
ALTER TABLE `workshop_jobs` ADD COLUMN IF NOT EXISTS `agreed_parts` TEXT NULL;
ALTER TABLE `workshop_jobs` ADD COLUMN IF NOT EXISTS `additional_parts` TEXT NULL;

-- 6. Expenses Table Columns
ALTER TABLE `expenses` ADD COLUMN IF NOT EXISTS `custom_data` JSON NULL;
ALTER TABLE `expenses` ADD COLUMN IF NOT EXISTS `is_recurring` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `expenses` ADD COLUMN IF NOT EXISTS `frequency` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN IF NOT EXISTS `due_day` INTEGER NULL;
ALTER TABLE `expenses` ADD COLUMN IF NOT EXISTS `next_due` DATETIME(3) NULL;
ALTER TABLE `expenses` ADD COLUMN IF NOT EXISTS `last_paid` DATETIME(3) NULL;

-- 7. New Tables
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `custom_fields` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `module` VARCHAR(191) NOT NULL,
  `field_name` VARCHAR(191) NOT NULL,
  `field_type` VARCHAR(191) NOT NULL,
  `options` JSON NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trash` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `model_name` VARCHAR(191) NOT NULL,
  `record_id` INT NOT NULL,
  `data` JSON NOT NULL,
  `deleted_by` INT NULL,
  `deleted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `otp` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `is_used` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
