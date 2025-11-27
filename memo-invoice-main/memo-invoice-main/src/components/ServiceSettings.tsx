import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Service, ServiceSetting } from '../types';
import { Settings, Eye, EyeOff, Clock, Edit2, Save, X } from 'lucide-react';

export function ServiceSettings() {
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Record<string, ServiceSetting>>({});
  const [editingService, setEditingService] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    duration_minutes: 60,
    is_bookable: true,
    buffer_minutes: 15,
    max_concurrent: 1,
    requires_vehicle_info: true
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (!servicesError && servicesData) {
      setServices(servicesData);

      const { data: settingsData, error: settingsError } = await supabase
        .from('service_settings')
        .select('*');

      const settingsMap: Record<string, ServiceSetting> = {};
      if (!settingsError && settingsData) {
        settingsData.forEach(setting => {
          settingsMap[setting.service_id] = setting;
        });
        setSettings(settingsMap);
      }

      const missingSettings = servicesData.filter(service => !settingsMap[service.id]);
      if (missingSettings.length > 0) {
        const newSettings = missingSettings.map(service => ({
          service_id: service.id,
          duration_minutes: 60,
          is_bookable: false,
          buffer_minutes: 15,
          max_concurrent: 1,
          requires_vehicle_info: true
        }));

        await supabase.from('service_settings').insert(newSettings);
        setTimeout(fetchServices, 500);
      }
    }
  };

  const handleToggleBookable = async (serviceId: string, currentValue: boolean) => {
    const setting = settings[serviceId];
    if (!setting) return;

    const { error } = await supabase
      .from('service_settings')
      .update({ is_bookable: !currentValue })
      .eq('id', setting.id);

    if (!error) {
      fetchServices();
    }
  };

  const handleEditService = (serviceId: string) => {
    const setting = settings[serviceId];
    if (setting) {
      setEditingService(serviceId);
      setFormData({
        duration_minutes: setting.duration_minutes,
        is_bookable: setting.is_bookable,
        buffer_minutes: setting.buffer_minutes,
        max_concurrent: setting.max_concurrent,
        requires_vehicle_info: setting.requires_vehicle_info
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!editingService) return;

    const setting = settings[editingService];
    if (!setting) return;

    const { error } = await supabase
      .from('service_settings')
      .update({
        duration_minutes: formData.duration_minutes,
        is_bookable: formData.is_bookable,
        buffer_minutes: formData.buffer_minutes,
        max_concurrent: formData.max_concurrent,
        requires_vehicle_info: formData.requires_vehicle_info,
        updated_at: new Date().toISOString()
      })
      .eq('id', setting.id);

    if (!error) {
      setEditingService(null);
      fetchServices();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Service Booking Settings</h2>
        <p className="text-slate-600 mt-1">Configure which services are available for online booking</p>
      </div>

      {editingService && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Edit Service Settings: {services.find(s => s.id === editingService)?.name}
            </h3>
            <button
              onClick={() => setEditingService(null)}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                min="15"
                step="15"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="text-xs text-slate-500 mt-1">How long this service typically takes</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Buffer Time (minutes)
              </label>
              <input
                type="number"
                value={formData.buffer_minutes}
                onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) })}
                min="0"
                step="5"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="text-xs text-slate-500 mt-1">Extra time between appointments</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Concurrent Bookings
              </label>
              <input
                type="number"
                value={formData.max_concurrent}
                onChange={(e) => setFormData({ ...formData, max_concurrent: parseInt(e.target.value) })}
                min="1"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <p className="text-xs text-slate-500 mt-1">How many can be booked at the same time</p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_bookable}
                  onChange={(e) => setFormData({ ...formData, is_bookable: e.target.checked })}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Available for online booking</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_vehicle_info}
                  onChange={(e) => setFormData({ ...formData, requires_vehicle_info: e.target.checked })}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Require vehicle information</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingService(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {services.map(service => {
          const setting = settings[service.id];
          if (!setting) return null;

          return (
            <div key={service.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{service.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      setting.is_bookable
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {setting.is_bookable ? 'Bookable' : 'Not Bookable'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{service.description}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>{setting.duration_minutes} min</span>
                    </div>
                    <div className="text-slate-600">
                      <span className="font-medium">Buffer:</span> {setting.buffer_minutes} min
                    </div>
                    <div className="text-slate-600">
                      <span className="font-medium">Max Concurrent:</span> {setting.max_concurrent}
                    </div>
                    <div className="font-semibold text-slate-900">
                      ${parseFloat(service.price?.toString() || '0').toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBookable(service.id, setting.is_bookable)}
                    className={`p-2 rounded-lg transition ${
                      setting.is_bookable
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={setting.is_bookable ? 'Hide from booking' : 'Show in booking'}
                  >
                    {setting.is_bookable ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEditService(service.id)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    title="Edit settings"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Services Available</h3>
          <p className="text-slate-600">Create services first in the Services & Products section</p>
        </div>
      )}
    </div>
  );
}
