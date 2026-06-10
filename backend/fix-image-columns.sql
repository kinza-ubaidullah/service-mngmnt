-- Fix "Failed to create lead" when uploading images or pasting Google Maps links
-- VARCHAR(191) is too small for base64 images and long map URLs

ALTER TABLE leads MODIFY COLUMN house_image LONGTEXT NULL;
ALTER TABLE leads MODIFY COLUMN product_image LONGTEXT NULL;

ALTER TABLE customers MODIFY COLUMN google_map_link TEXT NULL;
ALTER TABLE customers MODIFY COLUMN exact_address TEXT NULL;

ALTER TABLE leads MODIFY COLUMN voice_note LONGTEXT NULL;
