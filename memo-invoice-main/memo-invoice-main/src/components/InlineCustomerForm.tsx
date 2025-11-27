import { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizePhoneNumber } from '../lib/phoneUtils';
import type { Customer } from '../types';

interface InlineCustomerFormProps {
  customers: Customer[];
  selectedCustomer: string;
  onCustomerChange: (customerId: string) => void;
  onCustomerAdded: (customer: Customer) => void;
}

export function InlineCustomerForm({
  customers,
  selectedCustomer,
  onCustomerChange,
  onCustomerAdded,
}: InlineCustomerFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.phone || !formData.vehicle_make || !formData.vehicle_model) {
      alert('Please enter customer name, phone, vehicle make and model');
      return;
    }

    const normalizedData = {
      ...formData,
      phone: normalizePhoneNumber(formData.phone),
      vin: ''
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([normalizedData])
      .select()
      .single();

    if (error) {
      alert('Error creating customer');
      return;
    }

    if (data) {
      onCustomerAdded(data);
      onCustomerChange(data.id);
      setFormData({
        name: '',
        phone: '',
        email: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: '',
        vehicle_plate: '',
      });
      setShowForm(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      name: '',
      phone: '',
      email: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_year: '',
      vehicle_plate: '',
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Customer Information</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-slate-900 hover:text-slate-700 flex items-center gap-1 font-medium"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {showForm ? (
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Customer name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
            <input
              type="tel"
              placeholder="Phone *"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
          <input
            type="email"
            placeholder="Email (optional)"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Vehicle make *"
              value={formData.vehicle_make}
              onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
            <input
              type="text"
              placeholder="Vehicle model *"
              value={formData.vehicle_model}
              onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Vehicle year (optional)"
              value={formData.vehicle_year}
              onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
            <input
              type="text"
              placeholder="License plate (optional)"
              value={formData.vehicle_plate}
              onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium"
            >
              Add Customer
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <select
          value={selectedCustomer}
          onChange={(e) => onCustomerChange(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          required
        >
          <option value="">Select a customer...</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {customer.vehicle_make} {customer.vehicle_model}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
