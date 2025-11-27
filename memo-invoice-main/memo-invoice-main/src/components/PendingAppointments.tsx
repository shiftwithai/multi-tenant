import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppointmentWithDetails } from '../types';
import { Calendar as CalendarIcon, Clock, User, Phone, Check, X, Loader, Bell, AlertCircle } from 'lucide-react';

export function PendingAppointments() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingAppointments();
  }, []);

  const fetchPendingAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('booking_appointments')
      .select(`
        *,
        customer:customers(*),
        staff:staff_members(*),
        services:booking_appointment_services(*)
      `)
      .eq('status', 'pending')
      .order('appointment_date')
      .order('start_time');

    if (!error && data) {
      setAppointments(data as any);
    }
    setLoading(false);
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    setProcessing(id);
    const updates: any = { status, updated_at: new Date().toISOString() };

    if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('booking_appointments')
      .update(updates)
      .eq('id', id);

    if (!error) {
      const appointment = appointments.find(a => a.id === id);

      if (status === 'confirmed' && appointment?.customer) {
        const adminPhone = '+16475016039';
        const notifications: any[] = [
          {
            appointment_id: id,
            recipient_phone: appointment.customer.phone,
            recipient_type: 'customer',
            notification_type: 'confirmation',
            message_body: `Your appointment at Mr. Memo Auto has been confirmed for ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)}. See you soon!\n\n800 Arrow Rd, Unit 1, North York, ON M9M 2Z8\n(647) 501-6039`,
            scheduled_for: new Date().toISOString()
          }
        ];

        if (appointment.staff?.phone && appointment.staff.phone !== adminPhone) {
          notifications.push({
            appointment_id: id,
            recipient_phone: appointment.staff.phone,
            recipient_type: 'staff',
            notification_type: 'staff_assigned',
            message_body: `You've been assigned to: ${appointment.customer.name} on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)}`,
            scheduled_for: new Date().toISOString()
          });
        }

        await supabase.from('sms_notifications').insert(notifications);
      }

      if (status === 'cancelled' && appointment?.customer) {
        const adminPhone = '+16475016039';
        const cancelNotifications: any[] = [
          {
            appointment_id: id,
            recipient_phone: appointment.customer.phone,
            recipient_type: 'customer',
            notification_type: 'cancellation',
            message_body: `Your appointment at Mr. Memo Auto for ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)} has been cancelled. If you think this is an error, please call us at (647) 501-6039.`,
            scheduled_for: new Date().toISOString()
          },
          {
            appointment_id: id,
            recipient_phone: adminPhone,
            recipient_type: 'admin',
            notification_type: 'cancellation',
            message_body: `Admin cancelled: ${appointment.customer.name} on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)}`,
            scheduled_for: new Date().toISOString()
          }
        ];

        if (appointment.staff?.phone && appointment.staff.phone !== adminPhone) {
          cancelNotifications.push({
            appointment_id: id,
            recipient_phone: appointment.staff.phone,
            recipient_type: 'staff',
            notification_type: 'cancellation',
            message_body: `Appointment cancelled: ${appointment.customer.name} on ${formatDate(appointment.appointment_date)} at ${formatTime(appointment.start_time)}`,
            scheduled_for: new Date().toISOString()
          });
        }

        await supabase.from('sms_notifications').insert(cancelNotifications);
      }

      fetchPendingAppointments();
      setSelectedAppointment(null);
    }
    setProcessing(null);
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

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    const diffTime = appointmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Past';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pending Appointments</h2>
        <p className="text-slate-600 mt-1">Review and approve appointment requests</p>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h3>
          <p className="text-slate-600">No pending appointments to review at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''} Awaiting Approval
              </h3>
              <p className="text-sm text-slate-600">Click on an appointment to view details and take action</p>
            </div>
          </div>

          <div className="space-y-4">
            {appointments.map(appointment => (
              <div
                key={appointment.id}
                className="border-2 border-yellow-200 rounded-lg p-5 hover:border-yellow-300 hover:shadow-md transition cursor-pointer bg-gradient-to-r from-yellow-50 to-white"
                onClick={() => setSelectedAppointment(appointment)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h4 className="text-lg font-bold text-slate-900">
                        {appointment.customer?.name || 'Unknown Customer'}
                      </h4>
                      <span className="px-3 py-1 text-xs font-semibold bg-yellow-400 text-yellow-900 rounded-full uppercase">
                        Pending Approval
                      </span>
                      {getRelativeDate(appointment.appointment_date).includes('Past') && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-700">{getRelativeDate(appointment.appointment_date)}</p>
                          <p className="text-xs text-slate-500">{formatDate(appointment.appointment_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-700">
                            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                          </p>
                          <p className="text-xs text-slate-500">{appointment.total_duration_minutes} minutes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-700">{appointment.staff?.name || 'Unassigned'}</p>
                          <p className="text-xs text-slate-500">Technician</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-slate-700">{appointment.customer?.phone}</p>
                          <p className="text-xs text-slate-500">Contact</p>
                        </div>
                      </div>
                    </div>

                    {appointment.customer && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <p className="text-sm font-semibold text-slate-700 mb-1">Vehicle</p>
                        <p className="text-sm text-slate-600">
                          {appointment.customer.vehicle_year} {appointment.customer.vehicle_make} {appointment.customer.vehicle_model}
                        </p>
                      </div>
                    )}

                    {appointment.services && appointment.services.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-3">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Requested Services</p>
                        <div className="space-y-1">
                          {appointment.services.map((service, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-slate-700">{service.service_name}</span>
                              <span className="font-semibold text-slate-900">${service.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-blue-200">
                          <span className="text-sm font-bold text-slate-900">Total</span>
                          <span className="text-lg font-bold text-slate-900">${appointment.total_price.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {appointment.customer_notes && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-slate-700 mb-1">Customer Notes</p>
                        <p className="text-sm text-slate-600 italic">{appointment.customer_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAppointmentStatus(appointment.id, 'confirmed');
                      }}
                      disabled={processing === appointment.id}
                      className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2 font-medium"
                      title="Accept Appointment"
                    >
                      {processing === appointment.id ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAppointmentStatus(appointment.id, 'cancelled');
                      }}
                      disabled={processing === appointment.id}
                      className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 font-medium"
                      title="Decline Appointment"
                    >
                      {processing === appointment.id ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-2xl font-bold text-slate-900">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-600 transition flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">

              <div className="space-y-6">
                <div>
                  <span className="px-3 py-1 text-sm font-semibold bg-yellow-400 text-yellow-900 rounded-full uppercase">
                    Pending Approval
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Customer Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedAppointment.customer?.name}</p>
                      <p><span className="font-medium">Phone:</span> {selectedAppointment.customer?.phone}</p>
                      {selectedAppointment.customer?.email && (
                        <p><span className="font-medium">Email:</span> {selectedAppointment.customer.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Vehicle Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Year:</span> {selectedAppointment.customer?.vehicle_year}</p>
                      <p><span className="font-medium">Make:</span> {selectedAppointment.customer?.vehicle_make}</p>
                      <p><span className="font-medium">Model:</span> {selectedAppointment.customer?.vehicle_model}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Appointment Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Date:</span> {formatDate(selectedAppointment.appointment_date)}</p>
                    <p><span className="font-medium">Time:</span> {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</p>
                    <p><span className="font-medium">Duration:</span> {selectedAppointment.total_duration_minutes} minutes</p>
                    <p><span className="font-medium">Technician:</span> {selectedAppointment.staff?.name || 'Unassigned'}</p>
                  </div>
                </div>

                {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Services</h4>
                    <div className="space-y-2">
                      {selectedAppointment.services.map((service, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900">{service.service_name}</p>
                            <p className="text-sm text-slate-600">{service.duration_minutes} minutes</p>
                          </div>
                          <p className="font-semibold text-slate-900">${service.price.toFixed(2)}</p>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t">
                        <p className="font-bold text-slate-900">Total</p>
                        <p className="font-bold text-slate-900 text-lg">${selectedAppointment.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAppointment.customer_notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Customer Notes</h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {selectedAppointment.customer_notes}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <button
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                    disabled={processing === selectedAppointment.id}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                  >
                    {processing === selectedAppointment.id ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    Accept Appointment
                  </button>
                  <button
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                    disabled={processing === selectedAppointment.id}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                  >
                    {processing === selectedAppointment.id ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                    Decline Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
