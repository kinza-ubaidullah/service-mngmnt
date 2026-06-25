-- disable-2fa.sql
-- Run this in phpMyAdmin to disable 2FA for ALL locked users.
-- Safe to run multiple times.

-- Option 1: Disable 2FA for ALL users (if everyone is locked out)
UPDATE `users` SET `totp_enabled` = 0, `totp_secret` = NULL WHERE `totp_enabled` = 1;

-- Option 2: Disable 2FA for a SPECIFIC user by email (uncomment and edit)
-- UPDATE `users` SET `totp_enabled` = 0, `totp_secret` = NULL WHERE `email` = 'admin@aljaroshi.com';

-- Option 3: Disable 2FA for a SPECIFIC user by ID (uncomment and edit)
-- UPDATE `users` SET `totp_enabled` = 0, `totp_secret` = NULL WHERE `id` = 1;

-- Check which users had 2FA enabled (run before or after to verify)
-- SELECT id, name, email, role, totp_enabled FROM `users` WHERE totp_enabled = 1;
