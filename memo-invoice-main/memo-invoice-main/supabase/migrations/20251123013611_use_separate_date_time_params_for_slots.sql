/*
  # Use Separate Date and Time Parameters for Time Slots

  1. Changes
    - Replace p_client_current_time TIMESTAMPTZ with separate DATE and TIME parameters
    - Accept p_current_date and p_current_time from client in their local timezone
    - Avoid PostgreSQL's automatic UTC conversion of TIMESTAMPTZ

  2. Purpose
    - Fix timezone bug where TIMESTAMPTZ casting converts to UTC
    - Ensure accurate "is today" detection regardless of timezone
    - Correctly filter past time slots based on client's actual local time
*/

-- Drop old function
DROP FUNCTION IF EXISTS get_available_time_slots(UUID, DATE, INTEGER, TIMESTAMPTZ);

-- Create new function with separate date and time parameters
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_staff_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER,
  p_current_date DATE DEFAULT CURRENT_DATE,
  p_current_time TIME DEFAULT CURRENT_TIME
)
RETURNS TABLE (
  slot_time TIME,
  is_available BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_time TIME;
  v_slot_end_time TIME;
  v_is_today BOOLEAN;
BEGIN
  -- Check if the requested date is today from client's perspective
  v_is_today := p_date = p_current_date;
  
  -- Get day of week (0 = Sunday, 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get staff schedule for this day
  SELECT ss.start_time, ss.end_time INTO v_start_time, v_end_time
  FROM staff_schedules ss
  WHERE ss.staff_id = p_staff_id
  AND ss.day_of_week = v_day_of_week
  AND ss.is_available = true;
  
  -- If no schedule found for this day, return empty
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Generate time slots every 30 minutes
  v_slot_time := v_start_time;
  WHILE v_slot_time < v_end_time LOOP
    v_slot_end_time := v_slot_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check if the slot fits within working hours
    IF v_slot_end_time <= v_end_time THEN
      -- For today: only show slots that haven't started yet (based on client's local time)
      -- For future dates: show all slots within working hours
      IF NOT v_is_today OR v_slot_time >= p_current_time THEN
        RETURN QUERY
        SELECT 
          v_slot_time,
          check_staff_availability(p_staff_id, p_date, v_slot_time, v_slot_end_time::TIME);
      END IF;
    END IF;
    
    v_slot_time := v_slot_time + INTERVAL '30 minutes';
  END LOOP;
END;
$$;
