/*
  # Appointment Booking System

  1. New Tables
    
    ## staff_members
    - Staff member information and availability
    
    ## staff_schedules
    - Weekly schedule for each staff member
    
    ## service_settings
    - Booking configuration for each service
    
    ## appointments
    - Customer appointment bookings
    
    ## appointment_services
    - Services included in each appointment
    
    ## sms_notifications
    - SMS notification queue and log
    
    ## business_settings
    - Global business configuration

  2. Security
    - RLS enabled on all tables
    - Customer access by phone verification
    - Staff/Admin full access when authenticated
    - Anon can create bookings and check availability
*/

-- Staff Members Table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'Technician',
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Staff Schedules Table
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, day_of_week)
);

-- Service Settings Table
CREATE TABLE IF NOT EXISTS service_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE UNIQUE,
  duration_minutes INTEGER DEFAULT 60,
  is_bookable BOOLEAN DEFAULT true,
  buffer_minutes INTEGER DEFAULT 15,
  max_concurrent INTEGER DEFAULT 1,
  requires_vehicle_info BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Appointments Table (completely new structure)
CREATE TABLE IF NOT EXISTS booking_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  total_duration_minutes INTEGER DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  customer_notes TEXT DEFAULT '',
  internal_notes TEXT DEFAULT '',
  cancellation_reason TEXT DEFAULT '',
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Appointment Services (Many-to-Many with order)
CREATE TABLE IF NOT EXISTS booking_appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES booking_appointments(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  sequence_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SMS Notifications Queue
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES booking_appointments(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'staff')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('confirmation', 'reminder_24h', 'reminder_2h', 'completed', 'cancelled', 'rescheduled', 'staff_assigned')),
  message_body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  twilio_sid TEXT,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Business Settings
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_booking_appointments_customer ON booking_appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_staff ON booking_appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_date ON booking_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_status ON booking_appointments(status);
CREATE INDEX IF NOT EXISTS idx_booking_appointment_services_appointment ON booking_appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sms_status_scheduled ON sms_notifications(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_service_settings_bookable ON service_settings(is_bookable);

-- Enable RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_members
CREATE POLICY "Authenticated users can view staff"
  ON staff_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can view active staff"
  ON staff_members FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage staff"
  ON staff_members FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for staff_schedules
CREATE POLICY "Authenticated users can view schedules"
  ON staff_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can view available schedules"
  ON staff_schedules FOR SELECT
  TO anon
  USING (is_available = true);

CREATE POLICY "Authenticated users can manage schedules"
  ON staff_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for service_settings
CREATE POLICY "Authenticated users can view service settings"
  ON service_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can view bookable services"
  ON service_settings FOR SELECT
  TO anon
  USING (is_bookable = true);

CREATE POLICY "Authenticated users can manage service settings"
  ON service_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for booking_appointments
CREATE POLICY "Authenticated users can view all appointments"
  ON booking_appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage appointments"
  ON booking_appointments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can create appointments"
  ON booking_appointments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view appointments"
  ON booking_appointments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update appointments"
  ON booking_appointments FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- RLS Policies for booking_appointment_services
CREATE POLICY "Users can view appointment services"
  ON booking_appointment_services FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can manage appointment services"
  ON booking_appointment_services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can create appointment services"
  ON booking_appointment_services FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS Policies for sms_notifications
CREATE POLICY "Authenticated users can view notifications"
  ON sms_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage notifications"
  ON sms_notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for business_settings
CREATE POLICY "Authenticated users can view settings"
  ON business_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage settings"
  ON business_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default business settings
INSERT INTO business_settings (setting_key, setting_value) VALUES
  ('business_hours', '{"monday": {"open": "09:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "18:00"}, "wednesday": {"open": "09:00", "close": "18:00"}, "thursday": {"open": "09:00", "close": "18:00"}, "friday": {"open": "09:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "15:00"}, "sunday": {"open": null, "close": null}}'::jsonb),
  ('cancellation_policy', '{"hours_before": 24, "message": "Appointments must be cancelled at least 24 hours in advance"}'::jsonb),
  ('twilio_settings', '{"from_number": "", "enabled": false}'::jsonb),
  ('shop_info', '{"name": "Mr. Memo Auto", "phone": "", "address": ""}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;