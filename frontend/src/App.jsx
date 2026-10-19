import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import RfqIntake from './pages/RfqIntake';
import NewQuote from './pages/NewQuote';
import QuotesList from './pages/QuotesList';
import RatesPage from './pages/RatesPage';
import ImpactPage from './pages/ImpactPage';
import CompanySettings from './pages/CompanySettings';
import PartAAdmin from './pages/PartAAdmin';
import Login from './pages/Login';
import StyleGuide from './pages/StyleGuide';
import ErrorBoundary from './components/ErrorBoundary';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('dqp_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setView] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/style-guide') {
      return 'style-guide';
    }
    return 'dashboard';
  });

  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [rfqPrefill, setRfqPrefill] = useState(null);

  // Dev-only style guide route inspection
  useEffect(() => {
    if (import.meta.env.DEV) {
      const handlePopState = () => {
        if (window.location.pathname === '/style-guide') {
          setView('style-guide');
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'Quotation Member' || loggedInUser.email === 'member') {
      setView('new-quote');
    } else {
      setView('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dqp_token');
    localStorage.removeItem('dqp_user');
    setUser(null);
    setView('dashboard');
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Manager/Approver';

  // DEV-ONLY: /style-guide route
  if (import.meta.env.DEV && (currentView === 'style-guide' || (typeof window !== 'undefined' && window.location.pathname === '/style-guide'))) {
    return (
      <StyleGuide
        onBack={() => {
          setView('dashboard');
          if (typeof window !== 'undefined' && window.history) {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  // If user is not authenticated, show the Login Dashboard
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200 bg-base text-text-primary">
      <Navbar
        user={user}
        currentView={currentView}
        setView={setView}
        onLogout={handleLogout}
        onSwitchUser={() => handleLogout()}
      />

      <main className="flex-1">
        <ErrorBoundary onReset={() => setView('dashboard')}>
          {currentView === 'dashboard' && (
            <Dashboard setView={setView} setSelectedQuoteId={setSelectedQuoteId} user={user} />
          )}

          {currentView === 'rfq-intake' && (
            <RfqIntake setView={setView} setRfqPrefill={setRfqPrefill} />
          )}

          {currentView === 'new-quote' && (
            <NewQuote 
              setView={setView} 
              setSelectedQuoteId={setSelectedQuoteId} 
              user={user}
              rfqPrefill={rfqPrefill}
            />
          )}

          {currentView === 'quotes' && (
            <QuotesList
              setView={setView}
              selectedQuoteId={selectedQuoteId}
              setSelectedQuoteId={setSelectedQuoteId}
              user={user}
            />
          )}

          {currentView === 'impact' && <ImpactPage user={user} />}

          {/* Admin-only Protected Views */}
          {currentView === 'rates' && (
            isAdmin ? (
              <RatesPage user={user} />
            ) : (
              <AccessRestrictedNotice setView={setView} feature="Rates Management & Base Pricing" />
            )
          )}

          {currentView === 'company-settings' && (
            isAdmin ? (
              <CompanySettings user={user} />
            ) : (
              <AccessRestrictedNotice setView={setView} feature="Company Settings & Margin Limits" />
            )
          )}

          {currentView === 'damper-admin' && (
            isAdmin ? (
              <PartAAdmin user={user} />
            ) : (
              <AccessRestrictedNotice setView={setView} feature="Admin Size & Pricing Limits" />
            )
          )}
        </ErrorBoundary>
      </main>

      {/* Polish footer with Rapid Bid and local notice */}
      <footer className="border-t py-4 text-xs transition-colors duration-200 bg-surface border-border-subtle text-text-muted">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-text-primary">RAPID BID</span>
            <span>•</span>
            <span className="font-medium">Industrial Valve & Damper CPQ Suite</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full border bg-tint-mint text-text-primary border-border-subtle">
              Your data stays on your server
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Active Session: <strong className="text-text-primary">{user?.role}</strong> ({user?.email})</span>
            <span>•</span>
            <span className="font-bold text-accent-text">Rapid Bid v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AccessRestrictedNotice({ setView, feature }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-warning-bg text-warning flex items-center justify-center mx-auto mb-4 border border-warning">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black tracking-tight text-text-primary">
        Admin Access Required
      </h2>
      <p className="text-sm mt-2 max-w-lg mx-auto text-text-secondary">
        <strong>{feature}</strong> is restricted to Plant Administrators. Base prices, steel rates per kg, and margin policies are configured in Admin mode.
      </p>
      <button
        onClick={() => setView('dashboard')}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-contrast font-bold text-xs cursor-pointer shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
}
