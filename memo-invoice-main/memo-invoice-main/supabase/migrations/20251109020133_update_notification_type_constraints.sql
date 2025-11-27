/*
  # Update SMS Notification Constraints
  
  1. Changes
    - Adds missing notification types to the check constraint
    - Adds missing recipient types to the check constraint
  
  2. New Notification Types
    - booking_received: Sent immediately when customer books (status='pending')
    - cancellation: Sent when appointment is cancelled
    - staff_notification: Sent to admin for new bookings
  
  3. New Recipient Types
    - admin: For administrative notifications
  
  4. Updated Constraints
    - notification_type now includes all types used in the app
    - recipient_type now includes 'admin' in addition to 'customer' and 'staff'
*/

-- Drop old constraint and add new one with all notification types
ALTER TABLE sms_notifications 
DROP CONSTRAINT IF EXISTS sms_notifications_notification_type_check;

ALTER TABLE sms_notifications
ADD CONSTRAINT sms_notifications_notification_type_check
CHECK (notification_type IN (
  'booking_received',
  'confirmation',
  'reminder_24h',
  'reminder_2h',
  'completed',
  'cancellation',
  'cancelled',
  'rescheduled',
  'staff_assigned',
  'staff_notification'
));

-- Drop old recipient_type constraint and add new one with admin
ALTER TABLE sms_notifications 
DROP CONSTRAINT IF EXISTS sms_notifications_recipient_type_check;

ALTER TABLE sms_notifications
ADD CONSTRAINT sms_notifications_recipient_type_check
CHECK (recipient_type IN ('customer', 'staff', 'admin'));
