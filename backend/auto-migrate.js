'use strict';
/**
 * auto-migrate.js — runs on startup, creates any missing tables/columns.
 * Safe to run multiple times (all statements are IF NOT EXISTS / IF not present).
 */

module.exports = async function autoMigrate() {
  let prisma;
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  } catch (e) {
    console.warn('[auto-migrate] Prisma not ready, skipping migration:', e.message);
    return;
  }

  const run = async (sql, label) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('[auto-migrate] OK:', label);
    } catch (e) {
      // Ignore "Duplicate column", "already exists" errors — expected on re-runs
      const msg = e.message || '';
      if (
        msg.includes('Duplicate column') ||
        msg.includes('already exists') ||
        msg.includes('errno: 1060') ||
        msg.includes('1050') // table already exists
      ) {
        // silently skip
      } else {
        console.warn('[auto-migrate] WARN:', label, '-', msg.substring(0, 120));
      }
    }
  };

  console.log('[auto-migrate] Starting database migration checks...');

  // ── users table columns ──
  await run(`ALTER TABLE \`users\` ADD COLUMN \`plain_password\` VARCHAR(191) NULL`, 'users.plain_password');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`profile_picture\` VARCHAR(191) NULL`, 'users.profile_picture');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`location_name\` VARCHAR(191) NULL`, 'users.location_name');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`lat\` DOUBLE NULL`, 'users.lat');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`lng\` DOUBLE NULL`, 'users.lng');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`specialization\` VARCHAR(191) NULL`, 'users.specialization');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`address\` VARCHAR(191) NULL`, 'users.address');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`totp_secret\` VARCHAR(255) NULL`, 'users.totp_secret');
  await run(`ALTER TABLE \`users\` ADD COLUMN \`totp_enabled\` TINYINT(1) NOT NULL DEFAULT 0`, 'users.totp_enabled');

  // ── leads table columns ──
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`agreed_amount\` DECIMAL(10,2) NULL`, 'leads.agreed_amount');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`payment_confirmed\` TINYINT(1) NOT NULL DEFAULT 0`, 'leads.payment_confirmed');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`pending_outcome\` VARCHAR(50) NULL`, 'leads.pending_outcome');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`voice_note\` LONGTEXT NULL`, 'leads.voice_note');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`rejection_note\` TEXT NULL`, 'leads.rejection_note');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`item_pictures\` JSON NULL`, 'leads.item_pictures');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`exact_address\` TEXT NULL`, 'leads.exact_address');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`is_warranty_claim\` TINYINT(1) NOT NULL DEFAULT 0`, 'leads.is_warranty_claim');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`assigned_by\` INT NULL`, 'leads.assigned_by');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`house_image\` LONGTEXT NULL`, 'leads.house_image');
  await run(`ALTER TABLE \`workshop_jobs\` ADD COLUMN \`parts_media\` JSON NULL`, 'workshop_jobs.parts_media');

  await run(`CREATE TABLE IF NOT EXISTS \`lead_products\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`lead_id\` INT NOT NULL,
    \`product_type\` VARCHAR(191) NOT NULL,
    \`problem_details\` TEXT NULL,
    \`sort_order\` INT NOT NULL DEFAULT 0,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX lead_products_lead_id_idx (\`lead_id\`),
    CONSTRAINT lead_products_lead_id_fkey FOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, 'CREATE lead_products');

  // Backfill lead_products from legacy product_type
  try {
    if (prisma.leadProduct) {
      const leads = await prisma.lead.findMany({
        where: { products: { none: {} }, NOT: { product_type: '' } },
        select: { id: true, product_type: true, problem_details: true },
      });
      for (const lead of leads) {
        const types = String(lead.product_type).split(/[,;|+]/).map((s) => s.trim()).filter(Boolean);
        if (types.length === 0) continue;
        await prisma.leadProduct.createMany({
          data: types.map((t, i) => ({
            lead_id: lead.id,
            product_type: t,
            problem_details: i === 0 ? lead.problem_details : null,
            sort_order: i,
          })),
        });
      }
      if (leads.length > 0) {
        console.log('[auto-migrate] Backfilled lead_products for', leads.length, 'leads');
      }
    }
  } catch (e) {
    console.warn('[auto-migrate] lead_products backfill skipped:', (e.message || e).toString().substring(0, 80));
  }

  await run(`ALTER TABLE \`leads\` ADD COLUMN \`lat\` DOUBLE NULL`, 'leads.lat');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`lng\` DOUBLE NULL`, 'leads.lng');
  await run(`ALTER TABLE \`leads\` ADD COLUMN \`area_id\` INTEGER NULL`, 'leads.area_id');

  // leads ENUM fix (add Deleted, PendingApproval statuses)
  await run(
    `ALTER TABLE \`leads\` MODIFY COLUMN \`status\` ENUM('New','Assigned','InProgress','PendingApproval','Completed','Cancelled','InspectionCompleted','PickedForWorkshop','Reopened','Complaint','Deleted') NOT NULL DEFAULT 'New'`,
    'leads.status enum'
  );
  await run(`ALTER TABLE \`leads\` MODIFY COLUMN \`house_image\` LONGTEXT NULL`, 'leads.house_image longtext');
  await run(`ALTER TABLE \`leads\` MODIFY COLUMN \`product_image\` LONGTEXT NULL`, 'leads.product_image longtext');

  // ── customers table columns ──
  await run(`ALTER TABLE \`customers\` MODIFY COLUMN \`google_map_link\` TEXT NULL`, 'customers.google_map_link');
  await run(`ALTER TABLE \`customers\` MODIFY COLUMN \`exact_address\` TEXT NULL`, 'customers.exact_address');

  // ── areas table columns ──
  await run(`ALTER TABLE \`areas\` ADD COLUMN \`lat\` DOUBLE NULL`, 'areas.lat');
  await run(`ALTER TABLE \`areas\` ADD COLUMN \`lng\` DOUBLE NULL`, 'areas.lng');

  // ── workshop_jobs table columns ──
  await run(`ALTER TABLE \`workshop_jobs\` ADD COLUMN \`delivery_assigned_to\` INT NULL`, 'workshop_jobs.delivery_assigned_to');
  await run(`ALTER TABLE \`workshop_jobs\` ADD COLUMN \`delivery_assigned_at\` DATETIME NULL`, 'workshop_jobs.delivery_assigned_at');
  await run(`ALTER TABLE \`workshop_jobs\` ADD COLUMN \`agreed_parts\` TEXT NULL`, 'workshop_jobs.agreed_parts');
  await run(`ALTER TABLE \`workshop_jobs\` ADD COLUMN \`additional_parts\` TEXT NULL`, 'workshop_jobs.additional_parts');

  // ── expenses table columns ──
  await run(`ALTER TABLE \`expenses\` ADD COLUMN \`custom_data\` JSON NULL`, 'expenses.custom_data');
  await run(`ALTER TABLE \`expenses\` ADD COLUMN \`is_recurring\` TINYINT(1) NOT NULL DEFAULT 0`, 'expenses.is_recurring');
  await run(`ALTER TABLE \`expenses\` ADD COLUMN \`frequency\` VARCHAR(191) NULL`, 'expenses.frequency');
  await run(`ALTER TABLE \`expenses\` ADD COLUMN \`due_day\` INTEGER NULL`, 'expenses.due_day');
  await run(`ALTER TABLE \`expenses\` ADD COLUMN \`next_due\` DATETIME(3) NULL`, 'expenses.next_due');
  await run(`ALTER TABLE \`expenses\` ADD COLUMN \`last_paid\` DATETIME(3) NULL`, 'expenses.last_paid');

  // ── Create missing tables ──
  await run(`CREATE TABLE IF NOT EXISTS \`technician_settlements\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`technician_id\` INT NOT NULL,
    \`amount\` DECIMAL(10,2) NOT NULL,
    \`description\` VARCHAR(255) NULL,
    \`lead_id\` INT NULL,
    \`is_received\` TINYINT(1) NOT NULL DEFAULT 0,
    \`received_at\` DATETIME NULL,
    \`received_by\` INT NULL,
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, 'CREATE technician_settlements');

  await run(`CREATE TABLE IF NOT EXISTS \`custom_fields\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`module\` VARCHAR(191) NOT NULL,
    \`field_name\` VARCHAR(191) NOT NULL,
    \`field_type\` VARCHAR(191) NOT NULL,
    \`options\` JSON NULL,
    \`is_required\` TINYINT(1) NOT NULL DEFAULT 0,
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, 'CREATE custom_fields');

  await run(`CREATE TABLE IF NOT EXISTS \`system_logs\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`user_id\` INT NULL,
    \`user_name\` VARCHAR(191) NULL,
    \`action_type\` VARCHAR(191) NOT NULL,
    \`module\` VARCHAR(191) NOT NULL,
    \`old_value\` JSON NULL,
    \`new_value\` JSON NULL,
    \`panel\` VARCHAR(191) NULL,
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, 'CREATE system_logs');

  await run(`CREATE TABLE IF NOT EXISTS \`trash\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`model_name\` VARCHAR(191) NOT NULL,
    \`record_id\` INT NOT NULL,
    \`data\` JSON NOT NULL,
    \`deleted_by\` INT NULL,
    \`deleted_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, 'CREATE trash');

  await run(`CREATE TABLE IF NOT EXISTS \`posts\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`user_id\` INT NOT NULL,
    \`content\` TEXT NULL,
    \`visibility\` VARCHAR(191) NOT NULL DEFAULT 'Public',
    \`location\` VARCHAR(191) NULL,
    \`hashtags\` VARCHAR(191) NULL,
    \`product_tag\` VARCHAR(191) NULL,
    \`media\` JSON NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`),
    INDEX posts_user_id_idx (\`user_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, 'CREATE posts');

  await run(`CREATE TABLE IF NOT EXISTS \`password_reset_otps\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`email\` VARCHAR(191) NOT NULL,
    \`otp\` VARCHAR(191) NOT NULL,
    \`expires_at\` DATETIME(3) NOT NULL,
    \`is_used\` BOOLEAN NOT NULL DEFAULT false,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, 'CREATE password_reset_otps');

  console.log('[auto-migrate] All migration checks complete.');

  try {
    await prisma.$disconnect();
  } catch (_) {}
};
