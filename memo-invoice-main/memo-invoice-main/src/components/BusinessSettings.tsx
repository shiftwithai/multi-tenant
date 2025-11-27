import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BusinessSettings as Settings } from '../types';
import { Save, Settings as SettingsIcon } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function BusinessSettings() {
  const [businessHours, setBusinessHours] = useState<any>({});
  const [twilioSettings, setTwilioSettings] = useState({
    from_number: '',
    enabled: false
  });
  const [shopInfo, setShopInfo] = useState({
    name: 'Mr. Memo Auto',
    phone: '',
    address: ''
  });
  const [cancellationPolicy, setCancellationPolicy] = useState({
    hours_before: 24,
    message: 'Appointments must be cancelled at least 24 hours in advance'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('business_settings')
      .select('*');

    if (!error && data) {
      data.forEach((setting: Settings) => {
        switch (setting.setting_key) {
          case 'business_hours':
            setBusinessHours(setting.setting_value);
            break;
          case 'twilio_settings':
            setTwilioSettings(setting.setting_value);
            break;
          case 'shop_info':
            setShopInfo(setting.setting_value);
            break;
          case 'cancellation_policy':
            setCancellationPolicy(setting.setting_value);
            break;
        }
      });
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from('business_settings')
      .update({
        setting_value: value,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', key);

    return !error;
  };

  const handleSaveAll = async () => {
    setLoading(true);
    await Promise.all([
      updateSetting('business_hours', businessHours),
      updateSetting('twilio_settings', twilioSettings),
      updateSetting('shop_info', shopInfo),
      updateSetting('cancellation_policy', cancellationPolicy)
    ]);
    setLoading(false);
  };

  const updateBusinessHours = (day: string, field: string, value: string | null) => {
    setBusinessHours((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Business Settings</h2>
          <p className="text-slate-600 mt-1">Configure your shop information and policies</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Shop Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
            <input
              type="text"
              value={shopInfo.name}
              onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={shopInfo.phone}
              onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={shopInfo.address}
              onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Hours</h3>
        <div className="space-y-3">
          {DAYS.map((day, index) => (
            <div key={day} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
              <div className="w-28">
                <span className="font-medium text-slate-700">{DAY_NAMES[index]}</span>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={businessHours[day]?.open !== null}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateBusinessHours(day, 'open', '09:00');
                      updateBusinessHours(day, 'close', '18:00');
                    } else {
                      updateBusinessHours(day, 'open', null);
                      updateBusinessHours(day, 'close', null);
                    }
                  }}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                />
                <span className="ml-2 text-sm text-slate-600">Open</span>
              </label>
              {businessHours[day]?.open && (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={businessHours[day]?.open || '09:00'}
                    onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                    className="px-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="time"
                    value={businessHours[day]?.close || '18:00'}
                    onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                    className="px-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Cancellation Policy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hours Before Appointment
            </label>
            <input
              type="number"
              value={cancellationPolicy.hours_before}
              onChange={(e) => setCancellationPolicy({
                ...cancellationPolicy,
                hours_before: parseInt(e.target.value)
              })}
              min="1"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              Minimum notice required for cancellations
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Policy Message
            </label>
            <textarea
              value={cancellationPolicy.message}
              onChange={(e) => setCancellationPolicy({
                ...cancellationPolicy,
                message: e.target.value
              })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Twilio SMS Settings</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Twilio credentials (Account SID, Auth Token) are configured as Supabase secrets
            and managed separately for security. Only configure the phone number here.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              From Phone Number
            </label>
            <input
              type="tel"
              value={twilioSettings.from_number}
              onChange={(e) => setTwilioSettings({
                ...twilioSettings,
                from_number: e.target.value
              })}
              placeholder="+1234567890"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              Your Twilio phone number in E.164 format
            </p>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={twilioSettings.enabled}
                onChange={(e) => setTwilioSettings({
                  ...twilioSettings,
                  enabled: e.target.checked
                })}
                className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
              />
              <span className="text-sm font-medium text-slate-700">
                Enable SMS Notifications
              </span>
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Toggle SMS notifications on/off
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
