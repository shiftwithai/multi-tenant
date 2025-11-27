import { useState, useEffect, useRef } from 'react';
import { X, Printer, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Invoice, Customer, InvoiceItem } from '../types';

interface InvoiceViewProps {
  invoice: Invoice;
  onClose: () => void;
  onStatusUpdate: (invoiceId: string, status: 'paid' | 'unpaid') => void;
}

export function InvoiceView({ invoice, onClose, onStatusUpdate }: InvoiceViewProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const invoiceContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInvoiceDetails();
  }, [invoice.id]);

  useEffect(() => {
    // Inject custom print styles to remove headers/footers and fix blank page issue
    const style = document.createElement('style');
    style.id = 'invoice-print-styles';
    style.textContent = `
      @media print {
        @page {
          margin: 0;
          size: auto;
        }

        html, body {
          overflow: hidden;
        }

        body * {
          visibility: hidden;
        }

        #invoice-content, #invoice-content * {
          visibility: visible;
        }

        #invoice-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          padding: 20px;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup on unmount
      const existingStyle = document.getElementById('invoice-print-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const loadInvoiceDetails = async () => {
    const [customerRes, itemsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', invoice.customer_id).maybeSingle(),
      supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id),
    ]);

    if (customerRes.data) setCustomer(customerRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const getInvoiceElement = () => {
    return invoiceContentRef.current;
  };

  (window as any).getInvoiceElement = getInvoiceElement;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading invoice...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-bold text-slate-900">Invoice Details</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onStatusUpdate(invoice.id, invoice.status === 'paid' ? 'unpaid' : 'paid')}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              invoice.status === 'paid'
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {invoice.status === 'paid' ? (
              <>
                <XCircle className="w-5 h-5" />
                Mark Unpaid
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Mark Paid
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div ref={invoiceContentRef} id="invoice-content" className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-0">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">INVOICE</h1>
            <div className="text-slate-600">Invoice #{invoice.invoice_number}</div>
            <div className="text-slate-600">Date: {new Date(invoice.created_at).toLocaleDateString()}</div>
          </div>
          <img
            src="https://res.cloudinary.com/duhs2q0vd/image/upload/v1757266536/mr_memo_logo_a64fru.png"
            alt="Mr. Memo Auto"
            className="w-24 h-24 object-contain"
          />
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">From:</h3>
            <div className="text-slate-600">
              <div className="font-medium">Mr. Memo Auto</div>
              <div>(647) 501-6039</div>
              <div>800 Arrow Rd, Unit 1</div>
              <div>North York, ON M9M 2Z8</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Bill To:</h3>
            {customer && (
              <div className="text-slate-600">
                <div className="font-medium">{customer.name}</div>
                {customer.phone && <div>{customer.phone}</div>}
                {customer.email && <div>{customer.email}</div>}
                {customer.vehicle_make && (
                  <div className="mt-2">
                    <div className="font-medium">Vehicle:</div>
                    <div>
                      {customer.vehicle_year} {customer.vehicle_make} {customer.vehicle_model}
                    </div>
                    {customer.vehicle_plate && <div>Plate: {customer.vehicle_plate}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <table className="w-full">
            <thead className="border-b-2 border-slate-900">
              <tr>
                <th className="text-left py-3 font-semibold text-slate-900">Description</th>
                <th className="text-left py-3 font-semibold text-slate-900">Type</th>
                <th className="text-right py-3 font-semibold text-slate-900">Qty</th>
                <th className="text-right py-3 font-semibold text-slate-900">Unit Price</th>
                <th className="text-right py-3 font-semibold text-slate-900">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-slate-900">
                    <div>{item.item_name}</div>
                    {item.notes && (
                      <div className="text-sm text-slate-500 italic mt-1">{item.notes}</div>
                    )}
                  </td>
                  <td className="py-3 text-slate-600 capitalize">{item.item_type}</td>
                  <td className="py-3 text-right text-slate-900">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-900">${item.unit_price.toFixed(2)}</td>
                  <td className="py-3 text-right text-slate-900">${item.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 text-slate-600">
              <span>Subtotal</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600">
              <span>Tax ({invoice.tax_rate}%)</span>
              <span>${invoice.tax_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-slate-900 font-bold text-lg text-slate-900">
              <span>Total</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span
                className={`px-4 py-2 text-sm font-semibold rounded-full ${
                  invoice.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {invoice.status.toUpperCase()}
              </span>
            </div>
            {invoice.tax_number && (
              <div className="text-sm text-slate-600">
                <span className="font-semibold">Tax Number:</span> {invoice.tax_number}
              </div>
            )}
          </div>
          {invoice.notes && (
            <div className="text-sm text-slate-600">
              <span className="font-semibold">Notes:</span> {invoice.notes}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
          Thank you for your business!
        </div>
      </div>
    </div>
  );
}
