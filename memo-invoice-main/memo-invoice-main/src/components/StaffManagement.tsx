import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StaffMember, StaffSchedule } from '../types';
import { Users, Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<Record<string, StaffSchedule[]>>({});
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'Technician',
    is_active: true,
    color: COLORS[0],
    photo_url: '',
    bio: ''
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .order('name');

    if (!error && data) {
      setStaff(data);
      data.forEach(member => fetchSchedule(member.id));
    }
  };

  const fetchSchedule = async (staffId: string) => {
    const { data, error } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('staff_id', staffId)
      .order('day_of_week');

    if (!error && data) {
      setSchedules(prev => ({ ...prev, [staffId]: data }));
    }
  };

  const handleSaveStaff = async () => {
    if (editingStaff) {
      const { error } = await supabase
        .from('staff_members')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
          color: formData.color,
          photo_url: formData.photo_url,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingStaff.id);

      if (!error) {
        setEditingStaff(null);
        fetchStaff();
      }
    } else {
      const { data, error } = await supabase
        .from('staff_members')
        .insert([formData])
        .select()
        .single();

      if (!error && data) {
        for (let day = 0; day < 7; day++) {
          if (day === 0) continue;
          await supabase.from('staff_schedules').insert([{
            staff_id: data.id,
            day_of_week: day,
            start_time: '09:00',
            end_time: '18:00',
            is_available: day !== 0
          }]);
        }
        setShowAddForm(false);
        fetchStaff();
      }
    }

    setFormData({
      name: '',
      phone: '',
      email: '',
      role: 'Technician',
      is_active: true,
      color: COLORS[0],
      photo_url: '',
      bio: ''
    });
  };

  const handleEditStaff = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      phone: member.phone,
      email: member.email,
      role: member.role,
      is_active: member.is_active,
      color: member.color,
      photo_url: member.photo_url || '',
      bio: member.bio || ''
    });
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      const { error } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchStaff();
      }
    }
  };

  const handleUpdateSchedule = async (staffId: string, dayOfWeek: number, field: string, value: any) => {
    const existingSchedule = schedules[staffId]?.find(s => s.day_of_week === dayOfWeek);

    if (existingSchedule) {
      await supabase
        .from('staff_schedules')
        .update({ [field]: value })
        .eq('id', existingSchedule.id);
    } else {
      await supabase
        .from('staff_schedules')
        .insert([{
          staff_id: staffId,
          day_of_week: dayOfWeek,
          start_time: '09:00',
          end_time: '18:00',
          is_available: true,
          [field]: value
        }]);
    }

    fetchSchedule(staffId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
          <p className="text-slate-600 mt-1">Manage technicians and their schedules</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {(showAddForm || editingStaff) && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingStaff(null);
                setFormData({
                  name: '',
                  phone: '',
                  email: '',
                  role: 'Technician',
                  is_active: true,
                  color: COLORS[0],
                  photo_url: '',
                  bio: ''
                });
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Calendar Color</label>
              <div className="flex items-center gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition ${
                      formData.color === color ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo URL</label>
              <input
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio / Description</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={2}
                placeholder="Brief description or expertise..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingStaff(null);
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveStaff}
              disabled={!formData.name || !formData.phone}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {staff.map(member => (
          <div key={member.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${member.photo_url ? 'hidden' : ''}`}
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{member.name}</h3>
                  <p className="text-sm text-slate-600">{member.role}</p>
                  {member.bio && <p className="text-sm text-slate-500 mt-1 max-w-md">{member.bio}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-600">{member.phone}</span>
                    {member.email && <span className="text-sm text-slate-600">{member.email}</span>}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      member.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingSchedule(editingSchedule === member.id ? null : member.id)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="Edit Schedule"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleEditStaff(member)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteStaff(member.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {editingSchedule === member.id && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-900 mb-3">Weekly Schedule</h4>
                <div className="space-y-2">
                  {DAYS.map((day, index) => {
                    const schedule = schedules[member.id]?.find(s => s.day_of_week === index);
                    return (
                      <div key={day} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="w-24">
                          <span className="font-medium text-slate-700">{day}</span>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={schedule?.is_available || false}
                            onChange={(e) => handleUpdateSchedule(member.id, index, 'is_available', e.target.checked)}
                            className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                          />
                          <span className="ml-2 text-sm text-slate-600">Available</span>
                        </label>
                        {schedule?.is_available && (
                          <div className="flex items-center gap-2 ml-auto">
                            <input
                              type="time"
                              value={schedule.start_time}
                              onChange={(e) => handleUpdateSchedule(member.id, index, 'start_time', e.target.value)}
                              className="px-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                            <span className="text-slate-500">to</span>
                            <input
                              type="time"
                              value={schedule.end_time}
                              onChange={(e) => handleUpdateSchedule(member.id, index, 'end_time', e.target.value)}
                              className="px-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Staff Members</h3>
          <p className="text-slate-600 mb-4">Add your first technician to start managing appointments</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Add Staff Member
          </button>
        </div>
      )}
    </div>
  );
}
