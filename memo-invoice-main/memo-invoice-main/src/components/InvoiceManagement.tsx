import { useState, useEffect } from 'react';
import { FileText, Plus, Eye, Printer, CheckSquare, Square, Mail, Trash2, Send, X, Edit, Mail as MailIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Invoice, Customer } from '../types';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceView } from './InvoiceView';

interface InvoiceManagementProps {
  preselectedCustomer?: Customer | null;
  onCustomerUsed?: () => void;
}

export function InvoiceManagement({ preselectedCustomer, onCustomerUsed }: InvoiceManagementProps = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [initialCustomerId, setInitialCustomerId] = useState<string | null>(null);
  const [showAlternateEmailModal, setShowAlternateEmailModal] = useState(false);
  const [alternateEmail, setAlternateEmail] = useState('');
  const [alternateEmailInvoiceId, setAlternateEmailInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (preselectedCustomer) {
      setInitialCustomerId(preselectedCustomer.id);
      setShowForm(true);
      if (onCustomerUsed) {
        onCustomerUsed();
      }
    }
  }, [preselectedCustomer, onCustomerUsed]);

  const loadData = async () => {
    setLoading(true);
    const [invoicesRes, customersRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('*, customers(*)')
        .order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('name'),
    ]);

    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    setLoading(false);
  };

  const handleStatusUpdate = async (invoiceId: string, newStatus: 'paid' | 'unpaid') => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (!error) {
      await loadData();
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Mark ${selectedIds.size} invoice(s) as paid?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      alert(`${selectedIds.size} invoice(s) marked as paid!`);
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      alert(`Failed to update invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} invoice(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .in('invoice_id', Array.from(selectedIds));

      if (itemsError) throw itemsError;

      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .in('id', Array.from(selectedIds));

      if (invoicesError) throw invoicesError;

      alert(`${selectedIds.size} invoice(s) deleted successfully!`);
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      alert(`Failed to delete invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const invoice = filteredInvoices.find(inv => inv.id === invoiceId);
    const customerName = invoice ? getCustomerName(invoice.customer_id) : 'this invoice';

    if (!confirm(`Are you sure you want to delete invoice #${invoice?.invoice_number} for ${customerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      alert('Invoice deleted successfully!');
      loadData();
    } catch (error) {
      alert(`Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendEmail = async (invoiceId: string, overrideEmail?: string) => {
    const invoice = filteredInvoices.find(inv => inv.id === invoiceId);
    const customerName = invoice ? getCustomerName(invoice.customer_id) : 'customer';

    if (!overrideEmail && !confirm(`Send invoice to ${customerName}?`)) {
      return;
    }

    setSendingEmail(invoiceId);

    try {
      setSelectedInvoice(invoice!);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const invoiceElement = document.getElementById('invoice-content');
      if (!invoiceElement) {
        throw new Error('Invoice content not found');
      }

      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: 10,
        filename: `Invoice-${invoice!.invoice_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(invoiceElement).output('blob');

      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      setSelectedInvoice(null);

      const { data: { session } } = await supabase.auth.getSession();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId, pdfBase64, overrideEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      alert(overrideEmail ? 'Invoice sent to alternate email successfully!' : 'Invoice email sent successfully!');
    } catch (error) {
      setSelectedInvoice(null);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleOpenAlternateEmail = (invoiceId: string) => {
    setAlternateEmailInvoiceId(invoiceId);
    setAlternateEmail('');
    setShowAlternateEmailModal(true);
  };

  const handleSendAlternateEmail = async () => {
    if (!alternateEmail || !alternateEmailInvoiceId) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(alternateEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setShowAlternateEmailModal(false);
    await handleSendEmail(alternateEmailInvoiceId, alternateEmail);
    setAlternateEmailInvoiceId(null);
    setAlternateEmail('');
  };


  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (statusFilter !== 'all' && invoice.status !== statusFilter) {
      return false;
    }
    if (dateFilter) {
      const invoiceDate = new Date(invoice.created_at).toISOString().split('T')[0];
      if (invoiceDate !== dateFilter) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading invoices...</div>
      </div>
    );
  }

  if (showForm || editingInvoice) {
    return (
      <InvoiceForm
        customers={customers}
        initialCustomerId={initialCustomerId}
        editingInvoice={editingInvoice}
        onClose={() => {
          setShowForm(false);
          setEditingInvoice(null);
          setInitialCustomerId(null);
          loadData();
        }}
      />
    );
  }

  if (selectedInvoice) {
    return (
      <InvoiceView
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              statusFilter === 'paid'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              statusFilter === 'unpaid'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Unpaid
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Date:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Clear
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleBulkMarkAsPaid}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <CheckSquare className="w-5 h-5" />
              Mark {selectedIds.size} as Paid
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete {selectedIds.size}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 hover:text-slate-900"
                  >
                    {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No invoices found. {statusFilter === 'all' ? 'Click "New Invoice" to create one.' : 'Try adjusting your filters.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleSelection(invoice.id)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        {selectedIds.has(invoice.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">#{invoice.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{getCustomerName(invoice.customer_id)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">${invoice.total.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleStatusUpdate(invoice.id, invoice.status === 'paid' ? 'unpaid' : 'paid')
                        }
                        className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {invoice.status.toUpperCase()}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendEmail(invoice.id)}
                          disabled={sendingEmail === invoice.id}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send invoice via registered email"
                        >
                          {sendingEmail === invoice.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenAlternateEmail(invoice.id)}
                          disabled={sendingEmail === invoice.id}
                          className="p-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm w-8 h-8 flex items-center justify-center"
                          style={{ backgroundColor: '#14B8A6' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0D9488'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#14B8A6'}
                          title="Send invoice to alternate email"
                        >
                          2
                        </button>
                        <button
                          onClick={() => setEditingInvoice(invoice)}
                          className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                          title="Edit invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                          title="View invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                          title="Delete invoice"
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

      {showAlternateEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Send to Alternate Email</h3>
              <button
                onClick={() => {
                  setShowAlternateEmailModal(false);
                  setAlternateEmail('');
                  setAlternateEmailInvoiceId(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Enter an alternate email address to send this invoice to:
            </p>
            <input
              type="email"
              placeholder="email@example.com"
              value={alternateEmail}
              onChange={(e) => setAlternateEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendAlternateEmail();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAlternateEmailModal(false);
                  setAlternateEmail('');
                  setAlternateEmailInvoiceId(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendAlternateEmail}
                disabled={!alternateEmail}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invoice
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
