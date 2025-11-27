/*
  # Add Staff Photos and Bio Fields

  1. Changes
    - Add photo_url column to staff_members for profile pictures
    - Add bio column to staff_members for short descriptions
    
  2. Purpose
    - Allow staff members to have profile photos displayed on booking widget
    - Provide space for staff descriptions/expertise to show customers
*/

-- Add photo_url and bio columns to staff_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN photo_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_members' AND column_name = 'bio'
  ) THEN
    ALTER TABLE staff_members ADD COLUMN bio TEXT;
  END IF;
END $$;
