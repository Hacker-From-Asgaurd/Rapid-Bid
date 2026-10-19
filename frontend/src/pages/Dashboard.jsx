import React, { useEffect, useState } from 'react';
import { 
  PlusCircle, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  FileText, 
  Download,
  AlertCircle,
  CheckCircle2,
  Bell,
  RefreshCw,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Users,
  Activity
} from 'lucide-react';
import { dashboardApi, quotesApi } from '../services/api';
import { formatINR } from '../utils/formatters';

export default function Dashboard({ setView, setSelectedQuoteId, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');
      const res = await dashboardApi.getSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
      setError('Could not connect to backend server. Make sure the local server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      Draft: 'bg-slate-100 text-slate-800 border-slate-200',
      'Pending approval': 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      Approved: 'bg-purple-100 text-purple-900 border-purple-300',
      Sent: 'bg-blue-100 text-blue-800 border-blue-200',
      Won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Lost: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-slate-100'}`}>
        {status}
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-secondary">
          <div className="w-8 h-8 border-3 border-[#3D6353] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading Rapid Bid Commercial Pipeline...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Unable to load dashboard data</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md">{error}</p>
        <button
          onClick={() => loadDashboard(true)}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2D5444] text-white hover:bg-[#3D6353] transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh / Update Now</span>
        </button>
      </div>
    );
  }

  const pipelineVal = data?.pipeline_value || 0;
  const winRate = data?.win_rate || 0;
  const avgMargin = data?.average_margin || 12.0;
  const avgTurnHrs = data?.average_turnaround_hours || 0.45;
  const avgTurnMins = Math.round(avgTurnHrs * 60);
  const statusCounts = data?.status_counts || {};
  const followUps = data?.follow_ups || [];
  const recent = data?.recent_quotes || [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-[#22382E] via-[#2F4D40] to-[#1E332A] rounded-2xl p-6 sm:p-7 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
              Rapid Bid CPQ Operations
            </span>
            <span className="text-xs text-white/80 font-medium">• Valve & Damper Manufacturing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Commercial Pipeline & Estimation Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
            Live metrics on win rates, gross margin protection, team approvals, and active customer quotes.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Refresh dashboard metrics & pipeline data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setView('rfq-intake')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#4E806B] hover:bg-[#5C947D] text-white transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>RFQ Smart Intake</span>
          </button>

          <button
            onClick={() => setView('new-quote')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-[#22382E] hover:bg-slate-100 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Quote</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => loadDashboard(true)} 
            className="underline font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 text-xs cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}

      {/* 5 Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Pipeline Value */}
        <div className="bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#707974] text-muted uppercase tracking-wider mb-2">
            <span>Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-[#3D6353] text-primary" />
          </div>
          <div className="text-2xl font-black text-primary text-primary">
            {formatINR(pipelineVal)}
          </div>
          <p className="text-[11px] text-[#707974] text-muted mt-1.5">
            Active quotes in Draft, Approved & Sent.
          </p>
        </div>

        {/* KPI 2: Win Rate */}
        <div className="bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#707974] text-muted uppercase tracking-wider mb-2">
            <span>Win Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 text-success" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary text-primary">{winRate}%</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 bg-success-bg text-success px-1.5 py-0.5 rounded">
              {statusCounts['Won'] || 0} Won
            </span>
          </div>
          <p className="text-[11px] text-[#707974] text-muted mt-1.5">
            Ratio of Won vs (Won + Lost) deals.
          </p>
        </div>

        {/* KPI 3: Average Margin */}
        <div className="bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#707974] text-muted uppercase tracking-wider mb-2">
            <span>Average Margin</span>
            <ShieldCheck className="w-4 h-4 text-[#3D6353] text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#3D6353] text-primary">{avgMargin}%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${avgMargin >= 12 ? 'bg-emerald-100 text-emerald-800 bg-success-bg text-success' : 'bg-amber-100 text-amber-800 bg-warning-bg text-warning'}`}>
              {avgMargin >= 12 ? 'Healthy' : 'Guarded'}
            </span>
          </div>
          <p className="text-[11px] text-[#707974] text-muted mt-1.5">
            Target threshold min 12.0%.
          </p>
        </div>

        {/* KPI 4: Turnaround */}
        <div className="bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#707974] text-muted uppercase tracking-wider mb-2">
            <span>Avg Turnaround</span>
            <Clock className="w-4 h-4 text-emerald-600 text-success" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary text-primary">{avgTurnMins} mins</span>
          </div>
          <p className="text-[11px] text-[#707974] text-muted mt-1.5">
            RFQ intake to final quote PDF.
          </p>
        </div>

        {/* KPI 5: Pending Approvals */}
        <div className="bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#707974] text-muted uppercase tracking-wider mb-2">
            <span>Pending Approvals</span>
            <Bell className="w-4 h-4 text-amber-600 text-warning" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${statusCounts['Pending approval'] > 0 ? 'text-amber-700 text-warning' : 'text-primary text-primary'}`}>
              {statusCounts['Pending approval'] || 0}
            </span>
            {statusCounts['Pending approval'] > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 bg-warning-bg text-warning px-1.5 py-0.5 rounded">
                Action Req.
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#707974] text-muted mt-1.5">
            Quotes awaiting Manager review.
          </p>
        </div>
      </div>

      {/* Admin Exclusive: User Login Details & Session Audit */}
      {user?.role === 'admin' && (
        <div className="bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-[#F0ECE3] border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#3D6353] text-primary" />
              <h2 className="text-xs font-bold text-primary text-primary uppercase tracking-wider">
                Admin Audit: User Login Details & Quoting Ownership
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-secondary text-muted">
              Multi-Role Access Control • Active Sessions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.user_activity || [
              {
                id: "usr-admin",
                username: "admin",
                full_name: "Senior Commercial Manager",
                email: "admin@rapidbid.com",
                role: "admin",
                quotes_created: data?.total_quotes || 2,
                last_active: "Active Now",
                status: "Online / Active Session"
              },
              {
                id: "usr-member",
                username: "member",
                full_name: "Junior Estimation Engineer",
                email: "member@rapidbid.com",
                role: "member",
                quotes_created: Math.max(0, (data?.total_quotes || 2) - 1),
                last_active: "Active 10m ago",
                status: "Online / Active Session"
              }
            ]).map((u) => (
              <div 
                key={u.id || u.username}
                className="p-4 rounded-xl border border-subtle border-subtle bg-[#FAF8F5] bg-elevated flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    u.role === 'admin' 
                      ? 'bg-[#3D6353] text-white' 
                      : 'bg-[#D6E0D9] bg-elevated text-[#2D5444] text-primary'
                  }`}>
                    {u.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary text-primary">
                        {u.full_name || u.username}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        u.role === 'admin'
                          ? 'bg-[#3D6353]/15 text-[#3D6353] bg-accent/20 text-primary border border-[#3D6353]/30'
                          : 'bg-slate-200 text-slate-700 bg-elevated text-secondary'
                      }`}>
                        {u.role === 'admin' ? 'Manager (Admin)' : 'Quotation Member'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#707974] text-muted">
                      {u.email} • {u.last_active}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-[#3D6353] text-primary">
                    {u.quotes_created} Quotes Created
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-emerald-700 text-success">
                      {u.status || 'Active Session'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotes by Status Breakdown */}
      <div className="bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-primary text-primary uppercase tracking-wider">
            Quotes Distribution by Stage
          </h2>
          <span className="text-xs text-[#707974] text-muted">Total Quotes: {data?.total_quotes || Object.values(statusCounts).reduce((a, b) => a + b, 0)}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          {['Draft', 'Pending approval', 'Approved', 'Sent', 'Won', 'Lost'].map((st) => (
            <div 
              key={st}
              onClick={() => setView('quotes')}
              className="p-3 rounded-xl border border-subtle border-subtle bg-[#FAF8F5] bg-elevated hover:bg-[#F0ECE3] hover:bg-elevated/70 cursor-pointer transition-colors"
            >
              <div className="text-[10px] font-bold uppercase text-[#707974] text-muted truncate">{st}</div>
              <div className="text-xl font-black text-primary text-primary mt-1">{statusCounts[st] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns: Follow-Up Action List & Recent Quotes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Follow-up List (Sent > 7 days ago with no outcome) */}
        <div className="lg:col-span-5 bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-[#F0ECE3] border-subtle pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 text-warning" />
                <h3 className="text-xs font-bold text-primary text-primary uppercase tracking-wider">
                  Sales Follow-Up Priority List
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 bg-warning-bg text-warning px-2 py-0.5 rounded-full">
                {followUps.length} Pending
              </span>
            </div>
            <p className="text-xs text-secondary text-muted mb-4">
              Quotes sent more than 7 days ago awaiting customer decision.
            </p>

            <div className="space-y-2.5">
              {followUps.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#707974] text-muted">
                  All sent quotes have been actioned or follow-ups are up to date.
                </div>
              ) : (
                followUps.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl border border-subtle border-subtle bg-[#FAF8F5] bg-elevated flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary text-primary">{f.customer_company}</span>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded">
                          {f.days_ago}d ago
                        </span>
                      </div>
                      <div className="text-[11px] text-secondary text-muted truncate max-w-[220px]">
                        {f.quote_number} • {f.project_name}
                      </div>
                      <div className="text-xs font-bold text-[#3D6353] text-primary mt-0.5">
                        {formatINR(f.batch_price)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedQuoteId(f.id);
                        setView('quotes');
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#3D6353] text-white hover:bg-[#2C483D] shrink-0"
                    >
                      Follow Up
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#F0ECE3] border-subtle mt-4">
            <span className="text-[11px] text-[#707974] text-muted">
              Tip: Re-sending refreshed quotation with current steel rates often closes delayed industrial orders.
            </span>
          </div>
        </div>

        {/* Recent Quotes List */}
        <div className="lg:col-span-7 bg-[#FFFDFB] bg-surface p-5 rounded-2xl border border-subtle border-subtle shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-[#F0ECE3] border-subtle pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3D6353] text-primary" />
              <h3 className="text-xs font-bold text-primary text-primary uppercase tracking-wider">
                Recent Quotations
              </h3>
            </div>
            <button
              onClick={() => setView('quotes')}
              className="text-xs font-bold text-[#3D6353] text-primary hover:underline flex items-center gap-1"
            >
              <span>View All Quotes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-subtle border-subtle text-[#707974] text-muted uppercase font-bold text-[10px] bg-[#FAF8F5] bg-elevated">
                  <th className="py-2 px-2.5">Quote #</th>
                  <th className="py-2 px-2.5">Customer</th>
                  <th className="py-2 px-2.5">Created By</th>
                  <th className="py-2 px-2.5">Size</th>
                  <th className="py-2 px-2.5">Price</th>
                  <th className="py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE3] divide-subtle">
                {recent.map((q) => (
                  <tr 
                    key={q.id}
                    onClick={() => {
                      setSelectedQuoteId(q.id);
                      setView('quotes');
                    }}
                    className="hover:bg-[#FAF8F5] hover:bg-elevated/70/60 cursor-pointer"
                  >
                    <td className="py-2.5 px-2.5 font-mono font-bold text-primary text-primary">{q.quote_number}</td>
                    <td className="py-2.5 px-2.5 font-medium text-primary text-primary truncate max-w-[130px]">{q.customer_company}</td>
                    <td className="py-2.5 px-2.5">
                      <div className="font-semibold text-primary text-primary">
                        {q.created_by || 'Quotation Member'}
                      </div>
                      <div className="text-[10px] text-[#707974] text-muted">
                        {q.created_by_email || (q.created_by === 'admin' ? 'admin@rapidbid.com' : 'member@rapidbid.com')}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-secondary text-muted font-mono">{q.dimensions}</td>
                    <td className="py-2.5 px-2.5 font-bold text-[#3D6353] text-primary">{formatINR(q.quoted_price_batch)}</td>
                    <td className="py-2.5 px-2.5">{getStatusBadge(q.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

