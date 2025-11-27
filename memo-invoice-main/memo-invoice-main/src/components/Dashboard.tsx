import { useState, useEffect } from 'react';
import { BarChart3, DollarSign, FileText, Users, Download, TrendingUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  totalCustomers: number;
  popularServices: { name: string; count: number }[];
}

interface DashboardProps {
  onClose?: () => void;
}

export function Dashboard({ onClose }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    totalCustomers: 0,
    popularServices: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [invoicesRes, customersRes, invoiceItemsRes, monthlyInvoicesRes] = await Promise.all([
      supabase.from('invoices').select('*'),
      supabase.from('customers').select('id'),
      supabase.from('invoice_items').select('item_name, item_type'),
      supabase.from('invoices').select('*').gte('created_at', firstDayOfMonth),
    ]);

    let totalRevenue = 0;
    let paidInvoices = 0;
    let unpaidInvoices = 0;

    if (invoicesRes.data) {
      invoicesRes.data.forEach((invoice) => {
        totalRevenue += invoice.total;
        if (invoice.status === 'paid') {
          paidInvoices++;
        } else {
          unpaidInvoices++;
        }
      });
    }

    let monthlyRevenue = 0;
    if (monthlyInvoicesRes.data) {
      monthlyInvoicesRes.data.forEach((invoice) => {
        monthlyRevenue += invoice.total;
      });
    }

    const serviceCount: { [key: string]: number } = {};
    if (invoiceItemsRes.data) {
      invoiceItemsRes.data
        .filter((item) => item.item_type === 'service')
        .forEach((item) => {
          serviceCount[item.item_name] = (serviceCount[item.item_name] || 0) + 1;
        });
    }

    const popularServices = Object.entries(serviceCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalRevenue,
      monthlyRevenue,
      totalInvoices: invoicesRes.data?.length || 0,
      paidInvoices,
      unpaidInvoices,
      totalCustomers: customersRes.data?.length || 0,
      popularServices,
    });

    setLoading(false);
  };

  const exportReport = async () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      stats,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .order('created_at', { ascending: false });

    if (!invoices) return;

    const csvHeader = 'Invoice Number,Customer,Date,Subtotal,Tax,Total,Status\n';
    const csvRows = invoices
      .map((inv) => {
        const customer = inv.customers as any;
        return `${inv.invoice_number},"${customer?.name || 'N/A'}",${new Date(
          inv.created_at
        ).toLocaleDateString()},${inv.subtotal},${inv.tax_amount},${inv.total},${inv.status}`;
      })
      .join('\n');

    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportReport}
              className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            ${stats.totalRevenue.toFixed(2)}
          </div>
          <div className="text-sm text-slate-600">Total Revenue</div>
        </div>

          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              ${stats.monthlyRevenue.toFixed(2)}
            </div>
            <div className="text-sm text-slate-600">This Month</div>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.totalInvoices}</div>
            <div className="text-sm text-slate-600">Total Invoices</div>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-slate-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{stats.totalCustomers}</div>
            <div className="text-sm text-slate-600">Total Customers</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Invoice Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-slate-700">Paid Invoices</span>
              <span className="text-xl font-bold text-green-600">{stats.paidInvoices}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <span className="text-slate-700">Unpaid Invoices</span>
              <span className="text-xl font-bold text-amber-600">{stats.unpaidInvoices}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Popular Services</h3>
          {stats.popularServices.length === 0 ? (
            <p className="text-slate-600 text-center py-4">No services data available</p>
          ) : (
            <div className="space-y-3">
              {stats.popularServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="text-slate-900">{service.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{service.count} times</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
