
-- INSERT DEFAULT ADMIN
INSERT INTO `users` (`name`, `email`, `phone`, `password_hash`, `plain_password`, `role`, `is_active`, `created_at`) 
VALUES ('Super Admin', 'kinzaubaidullah62@gmail.com', '1234567890', '$2b$10$PeVA.CCpppoTVyvspNAtFO7AbmvG0sOfA8xdyBqDANiK9cqrRU3OS', 'admin123', 'ADMIN', 1, NOW());
