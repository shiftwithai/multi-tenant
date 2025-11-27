/*
  # Remove unused customer phone index

  1. Changes
    - Drop unused index idx_customers_phone on customers table
  
  2. Important Notes
    - This index was not being used by any queries
    - Removing it improves write performance and reduces storage overhead
*/

DROP INDEX IF EXISTS idx_customers_phone;