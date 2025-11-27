import { useState } from 'react';
import { Menu, X, Calendar, Phone, MapPin } from 'lucide-react';

interface MobileMenuProps {
  onManageAppointments: () => void;
}

export function MobileMenu({ onManageAppointments }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleManageAppointments = () => {
    onManageAppointments();
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 text-slate-600 hover:text-slate-900 transition"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 lg:hidden transform transition-transform">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-700 transition"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <button
                  onClick={handleManageAppointments}
                  className="w-full flex items-center gap-3 p-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Manage Appointments</span>
                </button>

                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    Contact Us
                  </h3>

                  <a
                    href="tel:+16475016039"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition"
                  >
                    <Phone className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Phone</p>
                      <p className="text-sm text-slate-600">(647) 501-6039</p>
                    </div>
                  </a>

                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Mr+Memo+Auto,+North+York,+ON"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition"
                  >
                    <MapPin className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Address</p>
                      <p className="text-sm text-slate-600">
                        800 Arrow Rd, Unit 1<br />
                        North York, ON M9M 2Z8
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
