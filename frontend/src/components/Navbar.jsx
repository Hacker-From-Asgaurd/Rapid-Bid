import React, { useState, useEffect } from 'react';
import DamperLogo from './DamperLogo';
import { 
  FileText, 
  BarChart3,
  SlidersHorizontal,
  ShieldCheck,
  Server,
  LogOut,
  User,
  ArrowRightLeft,
  Plus
} from 'lucide-react';
import { quotesApi } from '../services/api';

export default function Navbar({ user, currentView, setView, onLogout, onSwitchUser }) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Poll/fetch pending approvals count
    quotesApi.getPendingApprovalsCount()
      .then((res) => {
        setPendingCount(res.pending_count || 0);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      quotesApi.getPendingApprovalsCount()
        .then((res) => setPendingCount(res.pending_count || 0))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [currentView]);

  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Manager/Approver';

  return (
    <div className="sticky top-0 z-40">
      <header className="backdrop-blur-md border-b transition-colors duration-200 bg-surface/95 border-border-subtle text-text-primary shadow-[0_1px_3px_0_rgba(20,18,31,0.03)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Logo & Brand: RAPID BID with Damper Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer group shrink-0" 
              onClick={() => setView('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform border bg-accent text-accent-contrast border-accent">
                <DamperLogo className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-text-primary">
                    RAPID <span className="text-accent-text">BID</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-tint-mint text-text-primary border-border-subtle">
                    {isAdmin ? 'ADMIN PORTAL' : 'MEMBER PORTAL'}
                  </span>
                </div>
                <p className="text-[10px] font-medium -mt-0.5 flex items-center gap-1.5 text-text-secondary">
                  <span>Valve & Damper Estimation</span>
                  <span className="text-text-muted">•</span>
                  <span className="font-semibold flex items-center gap-1 text-accent-text">
                    <Server className="w-2.5 h-2.5 inline" /> Local Server
                  </span>
                </p>
              </div>
            </div>

            {/* Streamlined Navigation Tabs */}
            <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1 mx-2">
              
              {/* 1. Dashboard Tab */}
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-accent text-accent-contrast shadow-sm ring-2 ring-focus-ring/25'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              {/* 2. Create Quote Tab */}
              <button
                onClick={() => setView('new-quote')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  currentView === 'new-quote'
                    ? 'bg-accent text-accent-contrast shadow-sm ring-2 ring-focus-ring/25'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Quote</span>
              </button>

              {/* 3. Quotes List Tab */}
              <button
                onClick={() => setView('quotes')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 relative cursor-pointer ${
                  currentView === 'quotes'
                    ? 'bg-accent text-accent-contrast shadow-sm ring-2 ring-focus-ring/25'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'All Quotes & Approvals' : 'My Quotes'}</span>
                {pendingCount > 0 && isAdmin && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-warning text-base font-bold animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* 4. Rates & Cost Master (Admin Only) */}
              {isAdmin && (
                <button
                  onClick={() => setView('rates')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    currentView === 'rates'
                      ? 'bg-accent text-accent-contrast shadow-sm ring-2 ring-focus-ring/25'
                      : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                  }`}
                  title="Master Rates & Costing: Set raw material ₹/kg, bought-outs, and margin rules"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Cost & Rates Master</span>
                </button>
              )}

            </nav>

            {/* Right Side: User Session + Logout */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Role Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold shadow-xs bg-elevated text-text-primary border-border-subtle">
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-success" />
                ) : (
                  <User className="w-3.5 h-3.5 shrink-0 text-info" />
                )}
                <div className="flex flex-col leading-tight">
                  <span className="font-extrabold text-[11px] truncate max-w-[120px]">
                    {isAdmin ? 'Plant Admin' : 'Quotation Member'}
                  </span>
                  <span className="text-[9px] text-text-muted font-normal truncate max-w-[120px]">
                    {user?.email || user?.full_name}
                  </span>
                </div>
              </div>

              {/* Switch User / Logout Button */}
              <button
                onClick={onSwitchUser || onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-xs cursor-pointer active:scale-95 bg-elevated hover:bg-surface text-text-primary border-border-subtle"
                title="Switch role or logout"
              >
                <ArrowRightLeft className="w-3 h-3 text-accent-text" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden"><LogOut className="w-3 h-3 text-error" /></span>
              </button>

            </div>

          </div>
        </div>
      </header>
    </div>
  );
}
