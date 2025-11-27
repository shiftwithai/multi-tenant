import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppointmentWithDetails, StaffMember } from '../types';
import { Calendar as CalendarIcon, Clock, User, Phone, Car, FileText, Check, X, Loader, Bell, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';

type ViewMode = 'today' | 'tomorrow' | 'week' | 'month';

export function AppointmentCalendar() {
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithDetails[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchPendingAppointments();
    fetchAppointments();
  }, [viewMode, selectedStaff, statusFilter]);

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setStaff(data);
    }
  };

  const fetchPendingAppointments = async () => {
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
      setPendingAppointments(data as any);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'today') {
      startDate = new Date(today);
      endDate = new Date(today);
    } else if (viewMode === 'tomorrow') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() + 1);
      endDate = new Date(startDate);
    } else if (viewMode === 'week') {
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(today.getDate() + 6);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const fetchAppointments = async () => {
    const { start, end } = getDateRange();

    let query = supabase
      .from('booking_appointments')
      .select(`
        *,
        customer:customers(*),
        staff:staff_members(*),
        services:booking_appointment_services(*)
      `)
      .gte('appointment_date', start)
      .lte('appointment_date', end)
      .order('appointment_date')
      .order('start_time');

    if (selectedStaff !== 'all') {
      query = query.eq('staff_id', selectedStaff);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAppointments(data as any);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    setLoading(true);
    const updates: any = { status, updated_at: new Date().toISOString() };

    if (status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('booking_appointments')
      .update(updates)
      .eq('id', id);

    if (!error) {
      if (status === 'cancelled' && selectedAppointment?.customer) {
        await supabase.from('sms_notifications').insert([{
          appointment_id: id,
          recipient_phone: selectedAppointment.customer.phone,
          recipient_type: 'customer',
          notification_type: 'cancelled',
          message_body: `Your appointment at Mr. Memo Auto for ${formatDate(selectedAppointment.appointment_date)} at ${formatTime(selectedAppointment.start_time)} has been cancelled. If you think this is an error, please call us at (647) 501-6039.`,
          scheduled_for: new Date().toISOString()
        }]);
      }

      if (status === 'confirmed' && selectedAppointment?.customer) {
        await supabase.from('sms_notifications').insert([{
          appointment_id: id,
          recipient_phone: selectedAppointment.customer.phone,
          recipient_type: 'customer',
          notification_type: 'confirmation',
          message_body: `Your appointment at Mr. Memo Auto has been confirmed for ${formatDate(selectedAppointment.appointment_date)} at ${formatTime(selectedAppointment.start_time)}. See you soon!\n\n800 Arrow Rd, Unit 1, North York, ON M9M 2Z8\n(647) 501-6039`,
          scheduled_for: new Date().toISOString()
        }]);
      }

      fetchPendingAppointments();
      fetchAppointments();
      setSelectedAppointment(null);
    }
    setLoading(false);
  };

  const handleCreateInvoice = async () => {
    if (!selectedAppointment) return;

    setCreatingInvoice(true);
    try {
      const invoiceNumber = `INV-${Date.now()}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: selectedAppointment.customer_id,
          status: 'unpaid',
          total: selectedAppointment.total_price,
          subtotal: selectedAppointment.total_price,
          tax_rate: 0,
          tax_amount: 0
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (selectedAppointment.services && selectedAppointment.services.length > 0) {
        const lineItems = selectedAppointment.services.map(service => ({
          invoice_id: invoice.id,
          item_type: 'service',
          item_id: service.service_id,
          item_name: service.service_name,
          quantity: 1,
          unit_price: service.price,
          total_price: service.price
        }));

        const { error: lineItemsError } = await supabase
          .from('invoice_items')
          .insert(lineItems);

        if (lineItemsError) throw lineItemsError;
      }

      alert(`Invoice ${invoiceNumber} created successfully!`);
      setSelectedAppointment(null);
    } catch (err: any) {
      console.error('Create invoice error:', err);
      alert(err.message || 'Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      no_show: 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-800 border-slate-200';
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

  const getViewTitle = () => {
    if (viewMode === 'today') return 'Today';
    if (viewMode === 'tomorrow') return 'Tomorrow';
    if (viewMode === 'week') return 'This Week';
    return 'This Month';
  };

  const groupAppointmentsByDate = () => {
    const grouped: { [key: string]: AppointmentWithDetails[] } = {};
    appointments.forEach(apt => {
      if (!grouped[apt.appointment_date]) {
        grouped[apt.appointment_date] = [];
      }
      grouped[apt.appointment_date].push(apt);
    });
    return grouped;
  };

  const groupedAppointments = groupAppointmentsByDate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Appointment Calendar</h2>
        <p className="text-slate-600 mt-1">Manage pending requests and view scheduled appointments</p>
      </div>

      {/* Pending Appointments Section */}
      {pendingAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg shadow-lg p-6 border-2 border-yellow-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Pending Appointments</h3>
              <p className="text-sm text-slate-600">
                {pendingAppointments.length} appointment{pendingAppointments.length !== 1 ? 's' : ''} waiting for confirmation
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingAppointments.map(appointment => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg p-4 border-2 border-yellow-200 hover:border-yellow-300 transition cursor-pointer"
                onClick={() => setSelectedAppointment(appointment)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900">{appointment.customer?.name || 'Unknown Customer'}</h4>
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Pending
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{formatDate(appointment.appointment_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{appointment.staff?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{appointment.customer?.phone}</span>
                      </div>
                    </div>
                    {appointment.services && appointment.services.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-slate-700 font-medium">
                          Services: {appointment.services.map(s => s.service_name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAppointmentStatus(appointment.id, 'confirmed');
                      }}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAppointmentStatus(appointment.id, 'cancelled');
                      }}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar View Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('today')}
              className={`px-4 py-2 rounded-lg transition font-medium ${
                viewMode === 'today'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('tomorrow')}
              className={`px-4 py-2 rounded-lg transition font-medium ${
                viewMode === 'tomorrow'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg transition font-medium ${
                viewMode === 'week'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg transition font-medium ${
                viewMode === 'month'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="flex-1 sm:w-48 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Staff</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:w-48 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No appointments scheduled for {getViewTitle().toLowerCase()}</p>
          </div>
        ) : viewMode === 'week' || viewMode === 'month' ? (
          <div className="space-y-6">
            {Object.keys(groupedAppointments).sort().map(date => (
              <div key={date}>
                <h3 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b">
                  {formatDate(date)}
                </h3>
                <div className="space-y-3">
                  {groupedAppointments[date].map(appointment => (
                    <div
                      key={appointment.id}
                      onClick={() => setSelectedAppointment(appointment)}
                      className={`p-4 rounded-lg border-2 transition cursor-pointer hover:shadow-md ${getStatusColor(appointment.status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className="font-semibold text-slate-900">{appointment.customer?.name || 'Unknown Customer'}</h4>
                            <span className="px-2 py-1 text-xs font-medium rounded-full capitalize">
                              {appointment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span className="truncate">{appointment.staff?.name || 'Unassigned'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{appointment.customer?.phone}</span>
                            </div>
                          </div>
                          {appointment.services && appointment.services.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">
                                Services: {appointment.services.map(s => s.service_name).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map(appointment => (
              <div
                key={appointment.id}
                onClick={() => setSelectedAppointment(appointment)}
                className={`p-4 rounded-lg border-2 transition cursor-pointer hover:shadow-md ${getStatusColor(appointment.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900">{appointment.customer?.name || 'Unknown Customer'}</h4>
                      <span className="px-2 py-1 text-xs font-medium rounded-full capitalize">
                        {appointment.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="truncate">{appointment.staff?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{appointment.customer?.phone}</span>
                      </div>
                    </div>
                    {appointment.services && appointment.services.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">
                          Services: {appointment.services.map(s => s.service_name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                  <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status.replace('_', ' ')}
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

                <div className="pt-4 border-t">
                  {selectedAppointment.status === 'completed' && (
                    <button
                      onClick={handleCreateInvoice}
                      disabled={creatingInvoice}
                      className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {creatingInvoice ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Creating Invoice...
                        </>
                      ) : (
                        <>
                          <Receipt className="w-5 h-5" />
                          Create Invoice
                        </>
                      )}
                    </button>
                  )}
                  {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {selectedAppointment.status === 'pending' && (
                        <button
                          onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                          disabled={loading}
                          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                          Accept Appointment
                        </button>
                      )}
                      {selectedAppointment.status === 'confirmed' && (
                        <button
                          onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in_progress')}
                          disabled={loading}
                          className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {selectedAppointment.status === 'in_progress' && (
                        <button
                          onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                          disabled={loading}
                          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          Mark Complete
                        </button>
                      )}
                      <button
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
