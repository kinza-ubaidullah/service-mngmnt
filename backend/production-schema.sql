-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `plain_password` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'CALL_CENTER', 'TECHNICIAN', 'WORKSHOP_MANAGER') NOT NULL,
    `team_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `profile_picture` VARCHAR(191) NULL,
    `location_name` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `specialization` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NULL,
    `payment_model` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NULL,
    `exact_address` VARCHAR(191) NULL,
    `google_map_link` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customers_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` VARCHAR(191) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `product_type` VARCHAR(191) NOT NULL,
    `problem_details` TEXT NULL,
    `product_image` VARCHAR(191) NULL,
    `house_image` VARCHAR(191) NULL,
    `item_pictures` JSON NULL,
    `exact_address` TEXT NULL,
    `status` ENUM('New', 'Assigned', 'InProgress', 'Completed', 'Cancelled', 'InspectionCompleted', 'PickedForWorkshop', 'Reopened', 'Complaint') NOT NULL DEFAULT 'New',
    `is_warranty_claim` BOOLEAN NOT NULL DEFAULT false,
    `assigned_to` INTEGER NULL,
    `assigned_by` INTEGER NULL,
    `assigned_at` DATETIME(3) NULL,
    `visit_date` DATETIME(3) NULL,
    `actual_problem` TEXT NULL,
    `repair_details` TEXT NULL,
    `total_amount` DECIMAL(10, 2) NULL,
    `collected_amount` DECIMAL(10, 2) NULL DEFAULT 0,
    `warranty_months` INTEGER NOT NULL DEFAULT 1,
    `warranty_start` DATETIME(3) NULL,
    `warranty_end` DATETIME(3) NULL,
    `team_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leads_lead_id_key`(`lead_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `performed_by` INTEGER NULL,
    `old_status` ENUM('New', 'Assigned', 'InProgress', 'Completed', 'Cancelled', 'InspectionCompleted', 'PickedForWorkshop', 'Reopened', 'Complaint') NULL,
    `new_status` ENUM('New', 'Assigned', 'InProgress', 'Completed', 'Cancelled', 'InspectionCompleted', 'PickedForWorkshop', 'Reopened', 'Complaint') NULL,
    `notes` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workshop_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `received_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `received_by` INTEGER NULL,
    `promised_delivery` DATETIME(3) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'Normal',
    `status` ENUM('Received', 'WorkStarted', 'WaitingForParts', 'WaitingForApproval', 'Ready', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Received',
    `current_day_count` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `delivered_at` DATETIME(3) NULL,
    `delivered_by` INTEGER NULL,

    UNIQUE INDEX `workshop_jobs_lead_id_key`(`lead_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `lead_id` INTEGER NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invite_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'CALL_CENTER', 'TECHNICIAN', 'WORKSHOP_MANAGER') NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `is_used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invite_tokens_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `areas_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_history` ADD CONSTRAINT `job_history_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workshop_jobs` ADD CONSTRAINT `workshop_jobs_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

