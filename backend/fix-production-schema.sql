-- Fix users table: rename password to password_hash if needed, add missing columns
ALTER TABLE users 
  CHANGE COLUMN IF EXISTS password password_hash VARCHAR(191) NOT NULL,
  ADD COLUMN IF EXISTS location_name VARCHAR(191) NULL,
  ADD COLUMN IF EXISTS lat DOUBLE NULL,
  ADD COLUMN IF EXISTS lng DOUBLE NULL,
  ADD COLUMN IF EXISTS specialization VARCHAR(191) NULL,
  ADD COLUMN IF EXISTS ddress VARCHAR(191) NULL,
  ADD COLUMN IF EXISTS profile_picture VARCHAR(191) NULL;

-- Create areas table if not exists
CREATE TABLE IF NOT EXISTS `areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `areas_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add missing columns to leads if any
ALTER TABLE leads
  ADD COLUMN IF EXISTS `area_id` INTEGER NULL;
