import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizePhoneNumber } from '../lib/phoneUtils';
import { AppointmentWithDetails } from '../types';
import { Phone, Calendar, Clock, User, Car, Loader, AlertCircle, X } from 'lucide-react';

export function CustomerPortal() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber.trim());

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (customerError) throw customerError;

      if (!customer) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      const { data, error: appointmentsError } = await supabase
        .from('booking_appointments')
        .select(`
          *,
          customer:customers(*),
          staff:staff_members(*),
          services:booking_appointment_services(*)
        `)
        .eq('customer_id', customer.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      setAppointments((data || []) as any);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 24) {
      setError('Appointments must be cancelled at least 24 hours in advance');
      return;
    }

    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setCancelling(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('booking_appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Customer cancelled via portal',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      const adminPhone = '+16475016039';
      const notifications: any[] = [
        {
          appointment_id: appointmentId,
          recipient_phone: appointment.customer.phone,
          recipient_type: 'customer',
          notification_type: 'cancellation',
          message_body: `Your appointment at Mr. Memo Auto for ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)} has been cancelled. If you think this is an error, please call us at (647) 501-6039.`,
          scheduled_for: new Date().toISOString()
        },
        {
          appointment_id: appointmentId,
          recipient_phone: adminPhone,
          recipient_type: 'admin',
          notification_type: 'cancellation',
          message_body: `Customer cancelled: ${appointment.customer?.name} on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)}`,
          scheduled_for: new Date().toISOString()
        }
      ];

      if (appointment.staff?.phone && appointment.staff.phone !== adminPhone) {
        notifications.push({
          appointment_id: appointmentId,
          recipient_phone: appointment.staff.phone,
          recipient_type: 'staff',
          notification_type: 'cancellation',
          message_body: `Appointment cancelled: ${appointment.customer?.name} on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)}`,
          scheduled_for: new Date().toISOString()
        });
      }

      await supabase.from('sms_notifications').insert(notifications);

      setSelectedAppointment(null);
      handleSearch();
    } catch (err: any) {
      console.error('Cancel error:', err);
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-slate-100 text-slate-800'
    };
    return colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-800';
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isUpcoming = (appointment: AppointmentWithDetails) => {
    const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    return appointmentDate > new Date() && !['cancelled', 'no_show', 'completed'].includes(appointment.status);
  };

  const canCancel = (appointment: AppointmentWithDetails) => {
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return false;
    }
    const appointmentDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= 24;
  };

  const upcomingAppointments = appointments.filter(isUpcoming);
  const pastAppointments = appointments.filter(a => !isUpcoming(a));

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Manage Appointments</h1>
        <p className="text-sm sm:text-base text-slate-600">View and manage your appointments</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Enter Your Phone Number
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="(123) 456-7890"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
            Search
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {searched && !loading && (
        <>
          {appointments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-12 text-center">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">No Appointments Found</h3>
              <p className="text-slate-600">
                No appointments found for this phone number. Make sure you entered the correct number.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingAppointments.length > 0 && (
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Upcoming Appointments</h2>
                  <div className="space-y-3">
                    {upcomingAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        onClick={() => setSelectedAppointment(appointment)}
                        className="bg-white rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                {formatDate(appointment.appointment_date)}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                                {appointment.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="w-4 h-4" />
                              {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {appointment.staff && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <User className="w-4 h-4" />
                              Technician: {appointment.staff.name}
                            </div>
                          )}
                          {appointment.customer?.vehicle_make && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Car className="w-4 h-4" />
                              {appointment.customer.vehicle_year} {appointment.customer.vehicle_make} {appointment.customer.vehicle_model}
                            </div>
                          )}
                          <div className="text-slate-700">
                            <span className="font-medium">Services:</span>{' '}
                            {appointment.services?.map(s => s.service_name).join(', ')}
                          </div>
                          <div className="text-lg font-semibold text-slate-900">
                            Total: ${appointment.total_price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastAppointments.length > 0 && (
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">Past Appointments</h2>
                  <div className="space-y-3">
                    {pastAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        onClick={() => setSelectedAppointment(appointment)}
                        className="bg-white rounded-lg shadow p-4 sm:p-6 opacity-75 hover:opacity-100 transition cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <h3 className="font-semibold text-slate-900">
                              {formatDate(appointment.appointment_date)}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                              {appointment.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatTime(appointment.start_time)} • {appointment.services?.map(s => s.service_name).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Appointment Details</h3>
                <button
                  onClick={() => {
                    setSelectedAppointment(null);
                    setError('');
                  }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Appointment Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Date:</span> {formatDate(selectedAppointment.appointment_date)}</p>
                    <p><span className="font-medium">Time:</span> {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</p>
                    <p><span className="font-medium">Duration:</span> {selectedAppointment.total_duration_minutes} minutes</p>
                    {selectedAppointment.staff && (
                      <p><span className="font-medium">Technician:</span> {selectedAppointment.staff.name}</p>
                    )}
                    <p>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedAppointment.status)}`}>
                        {selectedAppointment.status.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Services</h4>
                  <div className="space-y-2">
                    {selectedAppointment.services?.map(service => (
                      <div key={service.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{service.service_name}</p>
                          <p className="text-slate-600">{service.duration_minutes} minutes</p>
                        </div>
                        <p className="font-semibold text-slate-900">${service.price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-3 flex items-center justify-between font-bold text-slate-900">
                    <span>Total</span>
                    <span>${selectedAppointment.total_price.toFixed(2)}</span>
                  </div>
                </div>

                {selectedAppointment.customer_notes && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">Your Notes</h4>
                    <p className="text-sm text-slate-700">{selectedAppointment.customer_notes}</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                {canCancel(selectedAppointment) && (
                  <button
                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                    disabled={cancelling}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Cancel Appointment
                  </button>
                )}

                {!canCancel(selectedAppointment) && ['pending', 'confirmed'].includes(selectedAppointment.status) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    This appointment cannot be cancelled online. Please call us to make changes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
