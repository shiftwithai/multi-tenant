import { useState, useEffect } from 'react';
import { Users, Plus, Search, CreditCard as Edit2, Trash2, Car, Phone, Mail, X, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizePhoneNumber } from '../lib/phoneUtils';
import { BookingWidget } from './BookingWidget';
import type { Customer, Invoice } from '../types';

interface CustomerManagementProps {
  onCreateInvoice?: (customer: Customer) => void;
}

export function CustomerManagement({ onCreateInvoice }: CustomerManagementProps = {}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingCustomer, setBookingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vin: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  };

  const loadCustomerHistory = async (customerId: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomerInvoices(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedData = {
      ...formData,
      phone: normalizePhoneNumber(formData.phone)
    };

    if (editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update({ ...normalizedData, updated_at: new Date().toISOString() })
        .eq('id', editingCustomer.id);

      if (!error) {
        await loadCustomers();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('customers').insert([normalizedData]);

      if (!error) {
        await loadCustomers();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (!error) {
        await loadCustomers();
      }
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      vehicle_make: customer.vehicle_make,
      vehicle_model: customer.vehicle_model,
      vehicle_year: customer.vehicle_year,
      vehicle_plate: customer.vehicle_plate,
      vin: customer.vin,
    });
    setShowForm(true);
  };

  const handleViewHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await loadCustomerHistory(customer.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_year: '',
      vehicle_plate: '',
      vin: '',
    });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or plate..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  VIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No customers found. Click "Add Customer" to create one.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{customer.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone || 'N/A'}
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.vehicle_make ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-2 text-slate-900 font-medium">
                            <Car className="w-4 h-4" />
                            {customer.vehicle_year} {customer.vehicle_make} {customer.vehicle_model}
                          </div>
                          {customer.vehicle_plate && (
                            <div className="text-xs text-slate-500 mt-1 ml-6">
                              {customer.vehicle_plate}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 max-w-xs truncate">
                        {customer.vin || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewHistory(customer)}
                          className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                        >
                          History
                        </button>
                        <button
                          onClick={() => setBookingCustomer(customer)}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                          title="Book appointment for this customer"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        {onCreateInvoice && (
                          <button
                            onClick={() => onCreateInvoice(customer)}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            title="Create invoice for this customer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {bookingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl my-8 max-h-[calc(100vh-4rem)]">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Book Appointment for {bookingCustomer.name}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {bookingCustomer.phone} {bookingCustomer.email && `• ${bookingCustomer.email}`}
                </p>
              </div>
              <button
                onClick={() => setBookingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 transition flex-shrink-0 ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
              <BookingWidget
                customerId={bookingCustomer.id}
                onBookingComplete={() => {
                  setBookingCustomer(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition flex-shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">Vehicle Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                      <input
                        type="text"
                        value={formData.vehicle_make}
                        onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                      <input
                        type="text"
                        value={formData.vehicle_model}
                        onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                      <input
                        type="text"
                        value={formData.vehicle_year}
                        onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        License Plate
                      </label>
                      <input
                        type="text"
                        value={formData.vehicle_plate}
                        onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">VIN</label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedCustomer.name} - Invoice History
                </h3>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {customerInvoices.length === 0 ? (
                <p className="text-slate-600 text-center py-8">No invoices found for this customer.</p>
              ) : (
                <div className="space-y-3">
                  {customerInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="bg-slate-50 p-4 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">
                            Invoice #{invoice.invoice_number}
                          </div>
                          <div className="text-sm text-slate-600">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-slate-900">
                            ${invoice.total.toFixed(2)}
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {invoice.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
