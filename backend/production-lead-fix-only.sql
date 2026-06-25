-- Minimal lead-create fix for production (phpMyAdmin → SQL → Go)
-- Safe to re-run: ignore "Duplicate column" errors

ALTER TABLE `leads` MODIFY COLUMN `status` ENUM(
  'New','Assigned','InProgress','PendingApproval','Completed','Cancelled',
  'InspectionCompleted','PickedForWorkshop','Reopened','Complaint','Deleted'
) NOT NULL DEFAULT 'New';

ALTER TABLE `leads` ADD COLUMN `agreed_amount` DECIMAL(10,2) NULL;
ALTER TABLE `leads` ADD COLUMN `payment_confirmed` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `leads` ADD COLUMN `item_pictures` JSON NULL;
ALTER TABLE `leads` ADD COLUMN `rejection_note` TEXT NULL;
ALTER TABLE `leads` ADD COLUMN `lat` DOUBLE NULL;
ALTER TABLE `leads` ADD COLUMN `lng` DOUBLE NULL;
ALTER TABLE `leads` ADD COLUMN `exact_address` TEXT NULL;
ALTER TABLE `leads` ADD COLUMN `is_warranty_claim` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `leads` ADD COLUMN `assigned_by` INT NULL;
ALTER TABLE `leads` MODIFY COLUMN `house_image` LONGTEXT NULL;

CREATE TABLE IF NOT EXISTS `lead_products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lead_id` INT NOT NULL,
  `product_type` VARCHAR(191) NOT NULL,
  `problem_details` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX lead_products_lead_id_idx (`lead_id`),
  CONSTRAINT lead_products_lead_id_fkey FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
