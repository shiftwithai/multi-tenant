import { Trash2 } from 'lucide-react';

export interface InvoiceLineItem {
  type: 'service' | 'product';
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string;
}

interface InvoiceLineItemsProps {
  items: InvoiceLineItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onUpdateNotes: (index: number, notes: string) => void;
  onRemove: (index: number) => void;
}

export function InvoiceLineItems({
  items,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateNotes,
  onRemove,
}: InvoiceLineItemsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-4">Invoice Items</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1">
                <div className="font-medium text-slate-900">{item.name}</div>
                <div className="text-xs text-slate-600 uppercase">{item.type}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => onUpdateQuantity(index, parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded border border-slate-300 text-center"
                />
                <span className="text-slate-600">×</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => onUpdatePrice(index, parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 rounded border border-slate-300 text-center"
                />
                <span className="text-slate-600">=</span>
                <div className="w-24 text-right font-semibold text-slate-900">
                  ${item.totalPrice.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Add notes for this item..."
              value={item.notes}
              onChange={(e) => onUpdateNotes(index, e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
