import { useState, useEffect } from 'react';
import { Wrench, Package, Plus, CreditCard as Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Service, Product, ServiceSetting } from '../types';

export function ServiceProductManagement() {
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceSettings, setServiceSettings] = useState<Record<string, ServiceSetting>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    duration_minutes: 60,
    thumbnail_url: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [servicesRes, productsRes, settingsRes] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
      supabase.from('service_settings').select('*')
    ]);

    if (servicesRes.data) setServices(servicesRes.data);
    if (productsRes.data) setProducts(productsRes.data);

    if (settingsRes.data) {
      const settingsMap: Record<string, ServiceSetting> = {};
      settingsRes.data.forEach(setting => {
        settingsMap[setting.service_id] = setting;
      });
      setServiceSettings(settingsMap);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const table = activeTab === 'services' ? 'services' : 'products';
    const dataToSave = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category: formData.category,
      ...(activeTab === 'services' && formData.thumbnail_url ? { thumbnail_url: formData.thumbnail_url } : {}),
    };

    if (editingItem) {
      const { error } = await supabase
        .from(table)
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', editingItem.id);

      if (!error) {
        if (activeTab === 'services') {
          const setting = serviceSettings[editingItem.id];
          if (setting) {
            await supabase
              .from('service_settings')
              .update({ duration_minutes: formData.duration_minutes })
              .eq('id', setting.id);
          }
        }
        await loadData();
        resetForm();
      }
    } else {
      const { data: newItem, error } = await supabase.from(table).insert([dataToSave]).select().single();

      if (!error && newItem && activeTab === 'services') {
        await supabase.from('service_settings').insert([{
          service_id: newItem.id,
          duration_minutes: 60,
          is_bookable: false,
          buffer_minutes: 15,
          max_concurrent: 1,
          requires_vehicle_info: true
        }]);
      }

      if (!error) {
        await loadData();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const table = activeTab === 'services' ? 'services' : 'products';
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (!error) {
        await loadData();
      }
    }
  };

  const handleEdit = (item: Service | Product) => {
    setEditingItem(item);
    const setting = serviceSettings[item.id];
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      duration_minutes: setting?.duration_minutes || 60,
      thumbnail_url: ('thumbnail_url' in item && item.thumbnail_url) || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      duration_minutes: 60,
      thumbnail_url: '',
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const toggleBookable = async (serviceId: string, currentValue: boolean) => {
    const setting = serviceSettings[serviceId];
    if (!setting) {
      const { data: newSetting } = await supabase
        .from('service_settings')
        .insert([{
          service_id: serviceId,
          duration_minutes: 60,
          is_bookable: true,
          buffer_minutes: 15,
          max_concurrent: 1,
          requires_vehicle_info: true
        }])
        .select()
        .single();

      if (newSetting) {
        setServiceSettings(prev => ({ ...prev, [serviceId]: newSetting }));
      }
    } else {
      await supabase
        .from('service_settings')
        .update({ is_bookable: !currentValue })
        .eq('id', setting.id);

      setServiceSettings(prev => ({
        ...prev,
        [serviceId]: { ...setting, is_bookable: !currentValue }
      }));
    }
  };

  const currentItems = activeTab === 'services' ? services : products;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg">
            {activeTab === 'services' ? (
              <Wrench className="w-6 h-6 text-white" />
            ) : (
              <Package className="w-6 h-6 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {activeTab === 'services' ? 'Services' : 'Parts/Labour'}
          </h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add {activeTab === 'services' ? 'Service' : 'Part/Labour'}
        </button>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'services'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'products'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Parts/Labour
        </button>
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
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Price
                </th>
                {activeTab === 'services' && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Bookable
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No {activeTab} found. Click "Add {activeTab === 'services' ? 'Service' : 'Product'}" to create one.
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{item.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">${item.price.toFixed(2)}</div>
                    </td>
                    {activeTab === 'services' && (
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleBookable(item.id, serviceSettings[item.id]?.is_bookable || false)}
                          className={`p-2 rounded-lg transition ${
                            serviceSettings[item.id]?.is_bookable
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={serviceSettings[item.id]?.is_bookable ? 'Visible in booking' : 'Hidden from booking'}
                        >
                          {serviceSettings[item.id]?.is_bookable ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8 max-h-[calc(100vh-4rem)] flex flex-col">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-900">
                {editingItem
                  ? `Edit ${activeTab === 'services' ? 'Service' : 'Product'}`
                  : `Add New ${activeTab === 'services' ? 'Service' : 'Product'}`}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition flex-shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    placeholder="e.g., maintenance, parts, labor"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                </div>

                {activeTab === 'services' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Duration (minutes) *
                      </label>
                      <input
                        type="number"
                        step="15"
                        min="15"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">How long this service typically takes</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Thumbnail URL
                      </label>
                      <input
                        type="url"
                        value={formData.thumbnail_url}
                        onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                        placeholder="https://example.com/image.jpg"
                      />
                      <p className="text-xs text-slate-500 mt-1">Optional image URL to display in booking widget</p>
                    </div>
                  </>
                )}

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
                    {editingItem ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
