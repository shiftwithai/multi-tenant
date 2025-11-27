import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer, Service, Product, Invoice, InvoiceItem } from '../types';
import { InlineCustomerForm } from './InlineCustomerForm';
import { InlineServiceForm } from './InlineServiceForm';
import { InlineProductForm } from './InlineProductForm';
import { InvoiceLineItems, type InvoiceLineItem } from './InvoiceLineItems';

interface InvoiceFormProps {
  customers: Customer[];
  onClose: () => void;
  initialCustomerId?: string | null;
  editingInvoice?: Invoice | null;
}

export function InvoiceForm({ customers: initialCustomers, onClose, initialCustomerId, editingInvoice }: InvoiceFormProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomerId || '');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [taxRate, setTaxRate] = useState('13.00');
  const [notes, setNotes] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItems();
    if (editingInvoice) {
      loadInvoiceData();
    }
  }, [editingInvoice]);

  const loadInvoiceData = async () => {
    if (!editingInvoice) return;

    setSelectedCustomer(editingInvoice.customer_id);
    setTaxRate(editingInvoice.tax_rate.toString());
    setNotes(editingInvoice.notes || '');
    setTaxNumber(editingInvoice.tax_number || '');
    setInvoiceDate(new Date(editingInvoice.created_at).toISOString().split('T')[0]);

    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', editingInvoice.id);

    if (error || !items) return;

    const loadedItems: InvoiceLineItem[] = items.map((item: InvoiceItem) => ({
      type: item.item_type,
      itemId: item.item_id,
      name: item.item_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      notes: item.notes || '',
    }));

    setLineItems(loadedItems);
  };

  const loadItems = async () => {
    const [servicesRes, productsRes] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
    ]);

    if (servicesRes.data) setServices(servicesRes.data);
    if (productsRes.data) setProducts(productsRes.data);
  };

  const handleAddService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setLineItems([
      ...lineItems,
      {
        type: 'service',
        itemId: service.id,
        name: service.name,
        quantity: 1,
        unitPrice: service.price,
        totalPrice: service.price,
        notes: '',
      },
    ]);
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setLineItems([
      ...lineItems,
      {
        type: 'product',
        itemId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        notes: '',
      },
    ]);
  };

  const updateLineItemQuantity = (index: number, quantity: number) => {
    const updated = [...lineItems];
    updated[index].quantity = quantity;
    updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    setLineItems(updated);
  };

  const updateLineItemPrice = (index: number, price: number) => {
    const updated = [...lineItems];
    updated[index].unitPrice = price;
    updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    setLineItems(updated);
  };

  const updateLineItemNotes = (index: number, notes: string) => {
    const updated = [...lineItems];
    updated[index].notes = notes;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = (subtotal * parseFloat(taxRate || '0')) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || lineItems.length === 0) {
      alert('Please select a customer and add at least one item');
      return;
    }

    setLoading(true);

    if (editingInvoice) {
      const updateData: any = {
        customer_id: selectedCustomer,
        subtotal,
        tax_rate: parseFloat(taxRate),
        tax_amount: taxAmount,
        total,
        notes,
        tax_number: taxNumber,
        updated_at: new Date().toISOString(),
      };

      if (invoiceDate) {
        updateData.created_at = new Date(invoiceDate).toISOString();
      }

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', editingInvoice.id);

      if (invoiceError) {
        alert('Error updating invoice');
        setLoading(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', editingInvoice.id);

      if (deleteError) {
        alert('Error updating invoice items');
        setLoading(false);
        return;
      }

      const invoiceItems = lineItems.map((item) => ({
        invoice_id: editingInvoice.id,
        item_type: item.type,
        item_id: item.itemId,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

      if (itemsError) {
        alert('Error adding invoice items');
        setLoading(false);
        return;
      }

      onClose();
    } else {
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('invoice_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const invoiceNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            customer_id: selectedCustomer,
            invoice_number: invoiceNumber,
            subtotal,
            tax_rate: parseFloat(taxRate),
            tax_amount: taxAmount,
            total,
            tax_number: taxNumber,
            status: 'unpaid',
            notes,
          },
        ])
        .select()
        .single();

      if (invoiceError || !invoice) {
        alert('Error creating invoice');
        setLoading(false);
        return;
      }

      const invoiceItems = lineItems.map((item) => ({
        invoice_id: invoice.id,
        item_type: item.type,
        item_id: item.itemId,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

      if (itemsError) {
        alert('Error adding invoice items');
        setLoading(false);
        return;
      }

      onClose();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{editingInvoice ? `Edit Invoice #${editingInvoice.invoice_number}` : 'Create New Invoice'}</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {editingInvoice && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Date</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
        )}

        <InlineCustomerForm
          customers={customers}
          selectedCustomer={selectedCustomer}
          onCustomerChange={setSelectedCustomer}
          onCustomerAdded={(customer) => setCustomers([...customers, customer])}
        />

        <InlineServiceForm
          services={services}
          onServiceSelect={handleAddService}
          onServiceAdded={(service) => setServices([...services, service])}
        />

        <InlineProductForm
          products={products}
          onProductSelect={handleAddProduct}
          onProductAdded={(product) => setProducts([...products, product])}
        />

        <InvoiceLineItems
          items={lineItems}
          onUpdateQuantity={updateLineItemQuantity}
          onUpdatePrice={updateLineItemPrice}
          onUpdateNotes={updateLineItemNotes}
          onRemove={removeLineItem}
        />

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <label className="text-slate-600">Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-24 px-3 py-1 rounded-lg border border-slate-300 text-right"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Tax Amount</span>
              <span className="font-semibold text-slate-900">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-900">Total</span>
              <span className="text-2xl font-bold text-slate-900">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tax Number</label>
            <input
              type="text"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="Enter customer/business tax number (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              rows={3}
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || lineItems.length === 0}
            className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (editingInvoice ? 'Updating...' : 'Creating...') : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
          </button>
        </div>
      </form>
    </div>
  );
}
