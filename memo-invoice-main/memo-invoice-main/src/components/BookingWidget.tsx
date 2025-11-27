import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { normalizePhoneNumber } from '../lib/phoneUtils';
import { Service, ServiceSetting, StaffMember, Customer } from '../types';
import { Calendar, Clock, User, Car, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface SelectedService {
  service: Service;
  settings: ServiceSetting;
  duration_minutes: number;
  buffer_minutes: number;
}

interface BookingWidgetProps {
  customerId?: string;
  onBookingComplete?: () => void;
}

export function BookingWidget({ customerId, onBookingComplete }: BookingWidgetProps = {}) {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSettings, setServiceSettings] = useState<Record<string, ServiceSetting>>({});
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  useEffect(() => {
    fetchServices();
    fetchStaff();
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    if (!customerId) return;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();

    if (data && !error) {
      setCustomerInfo({
        name: data.name,
        phone: data.phone,
        email: data.email || '',
        vehicle_make: data.vehicle_make || '',
        vehicle_model: data.vehicle_model || '',
        vehicle_year: data.vehicle_year || '',
        notes: ''
      });
    }
  };

  const fetchServices = async () => {
    setLoadingServices(true);
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .order('name');

    const { data: settingsData } = await supabase
      .from('service_settings')
      .select('*')
      .eq('is_bookable', true);

    if (servicesData && settingsData) {
      const settingsMap: Record<string, ServiceSetting> = {};
      settingsData.forEach(setting => {
        settingsMap[setting.service_id] = setting;
      });

      const bookableServices = servicesData.filter(s => settingsMap[s.id]);
      setServices(bookableServices);
      setServiceSettings(settingsMap);
    }
    setLoadingServices(false);
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setStaff(data);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, s) => sum + parseFloat(s.service?.price?.toString() || '0'), 0);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const fetchAvailableSlots = async (staffId: string, date: string) => {
    const totalDuration = getTotalDuration();

    // Get current date and time in local timezone
    const now = new Date();
    const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .rpc('get_available_time_slots', {
        p_staff_id: staffId,
        p_date: date,
        p_duration_minutes: totalDuration,
        p_current_date: currentDate,
        p_current_time: currentTime
      });

    if (!error && data) {
      const available = data
        .filter((slot: any) => slot.is_available)
        .map((slot: any) => slot.slot_time);
      setAvailableSlots(available);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleDateSelect = (date: Date) => {
    // Format date in local timezone to preserve user's intended date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    setSelectedDate(dateStr);
    setSelectedTime('');
    if (selectedStaff) {
      fetchAvailableSlots(selectedStaff.id, dateStr);
      setTimeout(() => {
        if (timeSlotsRef.current) {
          timeSlotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const handleStaffChange = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setSelectedTime('');
    if (selectedDate) {
      fetchAvailableSlots(staffMember.id, selectedDate);
    }
  };

  const toggleService = (service: Service) => {
    const settings = serviceSettings[service.id];
    const isSelected = selectedServices.some(s => s.service.id === service.id);

    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.service.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, {
        service,
        settings,
        duration_minutes: settings.duration_minutes,
        buffer_minutes: settings.buffer_minutes
      }]);
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const createAppointment = async () => {
    setLoading(true);
    setError('');

    try {
      let customer: Customer | null = null;

      const normalizedPhone = normalizePhoneNumber(customerInfo.phone);

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (existingCustomer) {
        customer = existingCustomer;

        await supabase
          .from('customers')
          .update({
            name: customerInfo.name,
            email: customerInfo.email,
            vehicle_make: customerInfo.vehicle_make,
            vehicle_model: customerInfo.vehicle_model,
            vehicle_year: customerInfo.vehicle_year,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id);
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            name: customerInfo.name,
            phone: normalizedPhone,
            email: customerInfo.email,
            vehicle_make: customerInfo.vehicle_make,
            vehicle_model: customerInfo.vehicle_model,
            vehicle_year: customerInfo.vehicle_year,
            vehicle_plate: customerInfo.vehicle_plate
          }])
          .select()
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      const totalDuration = getTotalDuration();
      const totalPrice = getTotalPrice();
      const endTime = calculateEndTime(selectedTime, totalDuration);

      const { data: appointment, error: appointmentError } = await supabase
        .from('booking_appointments')
        .insert([{
          customer_id: customer.id,
          staff_id: selectedStaff?.id,
          appointment_date: selectedDate,
          start_time: selectedTime,
          end_time: endTime,
          status: 'pending',
          total_duration_minutes: totalDuration,
          total_price: totalPrice,
          customer_notes: customerInfo.notes
        }])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      for (let i = 0; i < selectedServices.length; i++) {
        const svc = selectedServices[i];
        await supabase.from('booking_appointment_services').insert([{
          appointment_id: appointment.id,
          service_id: svc.service.id,
          service_name: svc.service.name,
          duration_minutes: svc.duration_minutes,
          price: parseFloat(svc.service.price.toString()),
          sequence_order: i
        }]);
      }

      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const reminder24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
      const reminder2h = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000);

      const adminPhone = '+16475016039';

      const formattedDate = formatDateString(selectedDate);
      const servicesList = selectedServices.map(s => s.service.name).join(', ');

      await supabase.from('sms_notifications').insert([
        {
          appointment_id: appointment.id,
          recipient_phone: customer.phone,
          recipient_type: 'customer',
          notification_type: 'booking_received',
          message_body: `Thank you for booking with Mr. Memo Auto! Your appointment request for ${servicesList} on ${formattedDate} at ${formatTime(selectedTime)} is pending approval. We'll review and confirm shortly.`,
          scheduled_for: new Date().toISOString()
        },
        {
          appointment_id: appointment.id,
          recipient_phone: customer.phone,
          recipient_type: 'customer',
          notification_type: 'reminder_24h',
          message_body: `Reminder: Your appointment at Mr. Memo Auto is tomorrow at ${formatTime(selectedTime)}.`,
          scheduled_for: reminder24h.toISOString()
        },
        {
          appointment_id: appointment.id,
          recipient_phone: customer.phone,
          recipient_type: 'customer',
          notification_type: 'reminder_2h',
          message_body: `Reminder: Your appointment at Mr. Memo Auto is in 2 hours at ${formatTime(selectedTime)}.`,
          scheduled_for: reminder2h.toISOString()
        },
        {
          appointment_id: appointment.id,
          recipient_phone: adminPhone,
          recipient_type: 'admin',
          notification_type: 'staff_notification',
          message_body: `New appointment request: ${customer.name} on ${formattedDate} at ${formatTime(selectedTime)}. Services: ${servicesList}. Assigned to: ${selectedStaff?.name || 'Unassigned'}`,
          scheduled_for: new Date().toISOString()
        }
      ]);

      setSuccess(true);

      if (customerId && onBookingComplete) {
        setTimeout(() => {
          onBookingComplete();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDateString = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isDateAvailable = (date: Date | null) => {
    if (!date || !selectedStaff) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;

    const dayOfWeek = date.getDay();
    return true;
  };

  const isDateSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return date.toISOString().split('T')[0] === selectedDate;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Appointment Confirmed!</h2>
        <p className="text-sm sm:text-base text-slate-600 mb-6">
          Your appointment has been scheduled for {formatDateString(selectedDate)} at {formatTime(selectedTime)}.
        </p>
        <p className="text-sm sm:text-base text-slate-600 mb-6">
          You will receive SMS confirmations and reminders at {customerInfo.phone}.
        </p>
        {!customerId && (
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Book Another Appointment
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={topRef} className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Book an Appointment</h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>1</div>
            <div className="w-6 sm:w-8 h-0.5 bg-slate-200" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>2</div>
            <div className="w-6 sm:w-8 h-0.5 bg-slate-200" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>3</div>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Select Services</h3>
            {loadingServices ? (
              <p className="text-slate-600">Loading services...</p>
            ) : services.length === 0 ? (
              <p className="text-slate-600">No services available for booking at this time.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(service => {
                  const isSelected = selectedServices.some(s => s.service.id === service.id);
                  const settings = serviceSettings[service.id];
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service)}
                      className={`p-4 rounded-lg border-2 text-left transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {service.thumbnail_url ? (
                          <img
                            src={service.thumbnail_url}
                            alt={service.name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center bg-slate-900 text-white font-bold flex-shrink-0 ${service.thumbnail_url ? 'hidden' : ''}`}
                        >
                          {service.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-sm sm:text-base">{service.name}</h4>
                          <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{service.description}</p>
                          <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              {settings?.duration_minutes} min
                            </span>
                            <span className="font-semibold text-slate-900 text-sm sm:text-base">${parseFloat(service.price.toString()).toFixed(2)}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">Total Duration: {getTotalDuration()} minutes</p>
                  <p className="text-base sm:text-lg font-bold text-slate-900">Total: ${getTotalPrice().toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">Select Technician</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-4">Choose any technician. Don't worry about matching. We'll take care of the rest.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {staff.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleStaffChange(member)}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      selectedStaff?.id === member.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${member.photo_url ? 'hidden' : ''}`}
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-sm text-slate-600">{member.role}</p>
                        {member.bio && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{member.bio}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedStaff && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-2 hover:bg-slate-200 rounded-lg transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-2 hover:bg-slate-200 rounded-lg transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {dayNames.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-slate-600 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentMonth).map((date, index) => (
                        <button
                          key={index}
                          disabled={!date || !isDateAvailable(date)}
                          onClick={() => date && handleDateSelect(date)}
                          className={`aspect-square p-2 rounded-lg text-sm transition ${
                            !date
                              ? 'invisible'
                              : isDateSelected(date)
                              ? 'bg-slate-900 text-white font-bold'
                              : isDateAvailable(date)
                              ? 'hover:bg-slate-200 text-slate-900'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {date?.getDate()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedDate && (
                  <div ref={timeSlotsRef}>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
                      {formatDateString(selectedDate)}
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableSlots.length === 0 ? (
                        <p className="text-slate-600 p-4 text-center">No available time slots for this date.</p>
                      ) : (
                        availableSlots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => {
                              setSelectedTime(slot);
                              setTimeout(() => {
                                if (nextButtonRef.current) {
                                  nextButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                              }, 100);
                            }}
                            className={`w-full p-3 rounded-lg border-2 text-center transition ${
                              selectedTime === slot
                                ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {formatTime(slot)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={nextButtonRef} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Back
              </button>
              {selectedTime && (
                <button
                  onClick={() => customerId ? createAppointment() : setStep(3)}
                  disabled={customerId && loading}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {customerId ? (loading ? 'Booking...' : 'Confirm Booking') : 'Next'}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Your Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Year</label>
                <input
                  type="text"
                  value={customerInfo.vehicle_year}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, vehicle_year: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Make</label>
                <input
                  type="text"
                  value={customerInfo.vehicle_make}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, vehicle_make: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Model</label>
                <input
                  type="text"
                  value={customerInfo.vehicle_model}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, vehicle_model: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Special Notes</label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-2">Appointment Summary</h4>
              <div className="space-y-1 text-xs sm:text-sm text-slate-600">
                <p><span className="font-medium">Date:</span> {formatDateString(selectedDate)}</p>
                <p><span className="font-medium">Time:</span> {formatTime(selectedTime)}</p>
                <p><span className="font-medium">Technician:</span> {selectedStaff?.name}</p>
                <p><span className="font-medium">Services:</span> {selectedServices.map(s => s.service.name).join(', ')}</p>
                <p><span className="font-medium">Duration:</span> {getTotalDuration()} minutes</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 mt-2">Total: ${getTotalPrice().toFixed(2)}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Back
              </button>
              <button
                onClick={createAppointment}
                disabled={loading || !customerInfo.name || !customerInfo.phone}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
