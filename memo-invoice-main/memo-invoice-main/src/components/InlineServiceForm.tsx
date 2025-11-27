import { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Service } from '../types';

interface InlineServiceFormProps {
  services: Service[];
  onServiceSelect: (serviceId: string) => void;
  onServiceAdded: (service: Service) => void;
}

export function InlineServiceForm({
  services,
  onServiceSelect,
  onServiceAdded,
}: InlineServiceFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleCreate = async () => {
    if (!name || !price) {
      alert('Please enter service name and price');
      return;
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{ name, price: parseFloat(price) }])
      .select()
      .single();

    if (error) {
      alert('Error creating service');
      return;
    }

    if (data) {
      onServiceAdded(data);
      onServiceSelect(data.id);
      setName('');
      setPrice('');
      setShowForm(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setName('');
    setPrice('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Add Services</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-slate-900 hover:text-slate-700 flex items-center gap-1 font-medium"
        >
          <Plus className="w-4 h-4" />
          New Service
        </button>
      </div>

      {showForm ? (
        <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <input
            type="text"
            placeholder="Service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          />
          <input
            type="number"
            placeholder="Price"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium"
            >
              Add Service
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
          onChange={(e) => {
            if (e.target.value) {
              onServiceSelect(e.target.value);
              e.target.value = '';
            }
          }}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
        >
          <option value="">Select a service to add...</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - ${service.price.toFixed(2)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
