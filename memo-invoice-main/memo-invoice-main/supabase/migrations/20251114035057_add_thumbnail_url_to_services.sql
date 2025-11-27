/*
  # Add thumbnail URL to services table

  1. Changes
    - Add `thumbnail_url` column to `services` table to store image URLs for service thumbnails
    - Column is optional (nullable) to maintain backward compatibility
  
  2. Notes
    - Services can now have thumbnail images displayed in the booking widget
    - Images should be hosted externally (e.g., Cloudinary, S3, etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE services ADD COLUMN thumbnail_url text;
  END IF;
END $$;
