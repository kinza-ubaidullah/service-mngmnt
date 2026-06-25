-- Run in phpMyAdmin on aljafvrp_crmdatabase if admin user missing
-- Login: admin@example.com / admin123

INSERT INTO users (name, email, phone, password_hash, plain_password, role, is_active, created_at)
SELECT 'System Admin', 'admin@example.com', '1234567890',
  '$2b$10$uF1kXahzKeWm/XF7mzTMPOQWR4oiP9lMV11mrqNh3oiz9MMmRc31W',
  'admin123', 'ADMIN', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');
