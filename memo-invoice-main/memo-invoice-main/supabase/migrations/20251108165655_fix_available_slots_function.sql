/*
  # Fix get_available_time_slots Function

  1. Changes
    - Fix column name ambiguity in get_available_time_slots function
    - Use fully qualified column names to avoid conflict with result column
    
  2. Purpose
    - Resolve "column reference is_available is ambiguous" error
    - Enable proper time slot availability checking
*/

-- Drop and recreate the function with fixed naming
DROP FUNCTION IF EXISTS get_available_time_slots(UUID, DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_staff_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER
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
  v_current_time TIME;
  v_slot_end_time TIME;
BEGIN
  -- Get day of week
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Get staff schedule for this day (use fully qualified column names)
  SELECT ss.start_time, ss.end_time INTO v_start_time, v_end_time
  FROM staff_schedules ss
  WHERE ss.staff_id = p_staff_id
  AND ss.day_of_week = v_day_of_week
  AND ss.is_available = true;
  
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Generate time slots every 30 minutes
  v_current_time := v_start_time;
  WHILE v_current_time < v_end_time LOOP
    v_slot_end_time := v_current_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    IF v_slot_end_time <= v_end_time THEN
      RETURN QUERY
      SELECT 
        v_current_time,
        check_staff_availability(p_staff_id, p_date, v_current_time, v_slot_end_time::TIME);
    END IF;
    
    v_current_time := v_current_time + INTERVAL '30 minutes';
  END LOOP;
END;
$$;
