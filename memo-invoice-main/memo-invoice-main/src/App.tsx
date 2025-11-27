import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { CustomerManagement } from './components/CustomerManagement';
import { ServiceProductManagement } from './components/ServiceProductManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { StaffManagement } from './components/StaffManagement';
import { ServiceSettings } from './components/ServiceSettings';
import { AppointmentCalendar } from './components/AppointmentCalendar';
import { BusinessSettings } from './components/BusinessSettings';
import { BookingWidget } from './components/BookingWidget';
import { CustomerPortal } from './components/CustomerPortal';
import { PendingAppointments } from './components/PendingAppointments';
import { MobileMenu } from './components/MobileMenu';
import { Dashboard } from './components/Dashboard';
import { AdminLogin } from './components/AdminLogin';
import { Users, Wrench, FileText, LogOut, Shield, Calendar, Settings, Bell, ArrowLeft, BarChart3 } from 'lucide-react';

type Route = '/' | '/manage-appointments' | '/mrmemoislam';

function AppContent() {
  const { user, signOut, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<Route>('/');
  const [activeTab, setActiveTab] = useState<'customers' | 'services' | 'invoices' | 'appointments' | 'pending' | 'staff' | 'dashboard'>('customers');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [preselectedCustomer, setPreselectedCustomer] = useState<any>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isDashboardUnlocked, setIsDashboardUnlocked] = useState(false);

  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('admin_authenticated') === 'true';
    setIsDashboardUnlocked(isUnlocked);
  }, []);

  const handleDashboardClick = () => {
    if (isDashboardUnlocked) {
      setActiveTab('dashboard');
    } else {
      setShowAdminLogin(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsDashboardUnlocked(true);
    setShowAdminLogin(false);
    setActiveTab('dashboard');
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/mrmemoislam') {
      setCurrentRoute('/mrmemoislam');
    } else if (path === '/manage-appointments') {
      setCurrentRoute('/manage-appointments');
    } else {
      setCurrentRoute('/');
    }
  }, []);

  useEffect(() => {
    if (user && currentRoute === '/mrmemoislam') {
      setIsAdminAuthenticated(true);
    }
  }, [user, currentRoute]);

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    signOut();
    setCurrentRoute('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (currentRoute === '/' || currentRoute === '/manage-appointments') {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <img
                src="https://res.cloudinary.com/duhs2q0vd/image/upload/v1762654983/mr-memo-logo-white-1_nu5sbd.png"
                alt="Mr. Memo Auto"
                className="h-12 w-auto object-contain cursor-pointer"
                onClick={() => setCurrentRoute('/')}
              />
              <div className="flex items-center gap-3">
                {currentRoute === '/' && (
                  <button
                    onClick={() => setCurrentRoute('/manage-appointments')}
                    className="hidden lg:flex px-4 py-2 text-slate-600 hover:text-slate-900 transition font-medium"
                  >
                    Manage Appointments
                  </button>
                )}
                {currentRoute === '/manage-appointments' && (
                  <button
                    onClick={() => setCurrentRoute('/')}
                    className="hidden lg:flex px-4 py-2 text-slate-600 hover:text-slate-900 transition font-medium items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Booking
                  </button>
                )}
                <MobileMenu
                  onManageAppointments={() => setCurrentRoute('/manage-appointments')}
                />
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentRoute === '/' && <BookingWidget />}
          {currentRoute === '/manage-appointments' && <CustomerPortal />}
        </main>
      </div>
    );
  }

  if (currentRoute === '/mrmemoislam' && !user) {
    return <LoginForm />;
  }

  if (currentRoute === '/mrmemoislam' && user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-8">
                <img
                  src="https://res.cloudinary.com/duhs2q0vd/image/upload/v1762654983/mr-memo-logo-white-1_nu5sbd.png"
                  alt="Mr. Memo Auto"
                  className="h-12 w-auto object-contain cursor-pointer"
                  onClick={() => setCurrentRoute('/')}
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('customers')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === 'customers'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Customers
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === 'services'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    Services
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === 'invoices'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Invoices
                  </button>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === 'appointments'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Calendar
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === 'pending'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    Pending
                  </button>
                  <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === 'staff'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Staff
                  </button>
                  <button
                    onClick={handleDashboardClick}
                    className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                      activeTab === 'dashboard'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </button>
                </div>
              </div>
              <button
                onClick={handleAdminLogout}
                className="text-slate-600 hover:text-slate-900 transition flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'customers' && (
            <CustomerManagement
              onCreateInvoice={(customer) => {
                setPreselectedCustomer(customer);
                setActiveTab('invoices');
              }}
            />
          )}
          {activeTab === 'services' && <ServiceProductManagement />}
          {activeTab === 'invoices' && (
            <InvoiceManagement
              preselectedCustomer={preselectedCustomer}
              onCustomerUsed={() => setPreselectedCustomer(null)}
            />
          )}
          {activeTab === 'appointments' && <AppointmentCalendar />}
          {activeTab === 'pending' && <PendingAppointments />}
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'dashboard' && <Dashboard />}
        </main>

        {showAdminLogin && (
          <AdminLogin
            onSuccess={handleAdminLoginSuccess}
            onClose={() => setShowAdminLogin(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-600">Page not found</div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
