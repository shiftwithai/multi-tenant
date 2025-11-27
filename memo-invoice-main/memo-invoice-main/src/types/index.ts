export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_plate: string;
  vin: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: 'paid' | 'unpaid';
  notes: string;
  tax_number: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'product';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  created_at: string;
}

export interface InvoiceWithDetails extends Invoice {
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  is_active: boolean;
  color: string;
  photo_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffSchedule {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

export interface ServiceSetting {
  id: string;
  service_id: string;
  duration_minutes: number;
  is_bookable: boolean;
  buffer_minutes: number;
  max_concurrent: number;
  requires_vehicle_info: boolean;
  created_at: string;
  updated_at: string;
  service?: Service;
}

export interface BookingAppointment {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  total_duration_minutes: number;
  total_price: number;
  customer_notes: string;
  internal_notes: string;
  cancellation_reason: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingAppointmentService {
  id: string;
  appointment_id: string;
  service_id: string | null;
  service_name: string;
  duration_minutes: number;
  price: number;
  sequence_order: number;
  created_at: string;
}

export interface AppointmentWithDetails extends BookingAppointment {
  customer?: Customer;
  staff?: StaffMember;
  services?: BookingAppointmentService[];
}

export interface SMSNotification {
  id: string;
  appointment_id: string | null;
  recipient_phone: string;
  recipient_type: 'customer' | 'staff';
  notification_type: 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'completed' | 'cancelled' | 'rescheduled' | 'staff_assigned';
  message_body: string;
  status: 'pending' | 'sent' | 'failed';
  twilio_sid: string | null;
  error_message: string | null;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
}

export interface BusinessSettings {
  id: string;
  setting_key: string;
  setting_value: any;
  updated_at: string;
}
