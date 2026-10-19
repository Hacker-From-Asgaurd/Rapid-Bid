import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  FileSpreadsheet, 
  Copy, 
  GitBranch, 
  Trash2, 
  History, 
  Eye, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight,
  RotateCcw,
  Boxes,
  Plus
} from 'lucide-react';
import { quotesApi } from '../services/api';
import { formatINR, formatNumber, formatWeight } from '../utils/formatters';

export default function QuotesList({ setView, selectedQuoteId, setSelectedQuoteId, user }) {
  const isAdmin = user?.role === 'admin';
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sizeFilter, setSizeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Detail Modal
  const [viewQuote, setViewQuote] = useState(null);

  // Revision Modal
  const [revisionQuote, setRevisionQuote] = useState(null);
  const [revWidth, setRevWidth] = useState(3000);
  const [revHeight, setRevHeight] = useState(3000);
  const [revDepth, setRevDepth] = useState(450);
  const [revQty, setRevQty] = useState(1);
  const [revMarkup, setRevMarkup] = useState(30);

  // History & Restore Modal
  const [historyQuote, setHistoryQuote] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [compareRevA, setCompareRevA] = useState(null);
  const [compareRevB, setCompareRevB] = useState(null);

  useEffect(() => {
    loadQuotes();
  }, [statusFilter, sizeFilter, dateFilter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const res = await quotesApi.list({
        q: searchTerm || undefined,
        search: searchTerm || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        size: sizeFilter || undefined,
        date: dateFilter || undefined,
      });
      setQuotes(res);
      if (selectedQuoteId) {
        const found = res.find((q) => q.id === selectedQuoteId);
        if (found) handleOpenDetail(found.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQuotes();
  };

  const handleOpenDetail = async (quoteId) => {
    try {
      const q = await quotesApi.getDetail(quoteId);
      setViewQuote(q);
    } catch (err) {
      alert('Failed to load quote details.');
    }
  };

  const handleStatusChange = async (quoteId, newStatus, confirmStale = false) => {
    try {
      await quotesApi.changeStatus(quoteId, newStatus, confirmStale);
      loadQuotes();
      if (viewQuote && viewQuote.id === quoteId) {
        setViewQuote((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      if (err.response?.data?.detail?.is_stale_warning) {
        const w = err.response.data.detail;
        const confirmSend = window.confirm(
          `RATE FRESHNESS WARNING:\n\nMaster material rates were last updated ${w.days_old} days ago (limit: ${w.stale_limit} days).\nCosts may have drifted.\n\nDo you still want to proceed and send this quotation to client?`
        );
        if (confirmSend) {
          try {
            await quotesApi.changeStatus(quoteId, newStatus, true);
            loadQuotes();
            if (viewQuote && viewQuote.id === quoteId) {
              setViewQuote((prev) => ({ ...prev, status: newStatus }));
            }
          } catch (e2) {
            alert(e2.response?.data?.detail || 'Failed to send quote.');
          }
        }
      } else {
        alert(typeof err.response?.data?.detail === 'string' ? err.response?.data?.detail : 'Failed to update status.');
      }
    }
  };

  const handleApprove = async (quoteId) => {
    const comment = prompt('Enter manager approval note (optional):', 'Technical specification & commercial margin approved.');
    if (comment === null) return;
    try {
      await quotesApi.approve(quoteId, comment);
      loadQuotes();
      if (viewQuote && viewQuote.id === quoteId) {
        setViewQuote((prev) => ({ ...prev, status: 'Approved' }));
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve quote.');
    }
  };

  const handleReject = async (quoteId) => {
    const comment = prompt('Enter reason for revision / rejection:');
    if (!comment) return;
    try {
      await quotesApi.reject(quoteId, comment);
      loadQuotes();
      if (viewQuote && viewQuote.id === quoteId) {
        setViewQuote((prev) => ({ ...prev, status: 'Draft' }));
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject quote.');
    }
  };

  const handleSubmitApproval = async (quoteId) => {
    try {
      await quotesApi.submitApproval(quoteId);
      loadQuotes();
      if (viewQuote && viewQuote.id === quoteId) {
        setViewQuote((prev) => ({ ...prev, status: 'Pending approval' }));
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit for approval.');
    }
  };

  const handleDuplicate = async (quoteId) => {
    if (!window.confirm('Duplicate this quote into a new Draft?')) return;
    try {
      const res = await quotesApi.duplicate(quoteId);
      alert(`Quote duplicated successfully as ${res.quote_number}!`);
      loadQuotes();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to duplicate quote.');
    }
  };

  const handleDeleteDraft = async (quoteId) => {
    if (!window.confirm('Delete this draft quote permanently?')) return;
    try {
      await quotesApi.deleteDraft(quoteId);
      loadQuotes();
      if (viewQuote && viewQuote.id === quoteId) setViewQuote(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete quote.');
    }
  };

  const handleOpenRevisionModal = (quote) => {
    setRevisionQuote(quote);
    setRevWidth(quote.width_mm);
    setRevHeight(quote.height_mm);
    setRevDepth(quote.depth_mm);
    setRevQty(quote.quantity);
    setRevMarkup(quote.markup_pct);
  };

  const handleSaveRevision = async () => {
    try {
      const payload = {
        width_mm: Number(revWidth),
        height_mm: Number(revHeight),
        depth_mm: Number(revDepth),
        quantity: Number(revQty),
        markup_pct: Number(revMarkup),
      };
      await quotesApi.revise(revisionQuote.id, payload);
      alert('New revision created successfully!');
      setRevisionQuote(null);
      loadQuotes();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create revision.');
    }
  };

  const handleOpenHistoryModal = async (quote) => {
    try {
      setHistoryQuote(quote);
      const revs = await quotesApi.getRevisions(quote.id);
      setRevisions(revs);
      if (revs.length >= 2) {
        setCompareRevA(revs[0]);
        setCompareRevB(revs[1]);
      } else if (revs.length === 1) {
        setCompareRevA(revs[0]);
        setCompareRevB(null);
      }
    } catch (err) {
      alert('Failed to load revision history.');
    }
  };

  const handleRestoreRevision = async (quoteId, revisionId) => {
    if (!window.confirm('Restore quote to this earlier revision? This will overwrite current lines with this revision snapshot.')) return;
    try {
      await quotesApi.restoreRevision(quoteId, revisionId);
      alert('Revision restored successfully!');
      setHistoryQuote(null);
      loadQuotes();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to restore revision.');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      Draft: 'bg-elevated text-secondary border-[#E0D9CC]',
      Sent: 'bg-[#EFF5FA] text-[#476885] border-[#CADCEB]',
      Won: 'bg-[#EEF5F1] text-[#2F4D40] border-[#CDE1D6]',
      Lost: 'bg-[#FDF1EB] text-[#C46346] border-[#F3DACF]',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-elevated'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Quotations & Cost Sheets
          </h1>
          <p className="text-xs text-secondary mt-1">
            Browse, revise, restore, and download customer commercial sheets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadQuotes}
            disabled={loading}
            className="flex items-center gap-1.5 bg-elevated hover:bg-[#EAE5DB] text-[#3D6353] border border-[#DDD6C8] font-semibold px-3 py-2 rounded-xl shadow-xs transition-all text-xs active:scale-95 cursor-pointer"
            title="Refresh quotations list"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Updating...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setView('new-quote')}
            className="flex items-center gap-2 bg-[#3D6353] hover:bg-[#2F4D40] text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Quote</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFDFB] bg-surface rounded-xl border border-subtle p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8C938E]" />
          <input
            type="text"
            placeholder="Search customer, quote ref, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-elevated/80 border border-[#DDD6C8] border-subtle rounded-lg pl-9 pr-4 py-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-[#3D6353]/30 focus:border-[#3D6353]"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="number"
            placeholder="Filter size (mm)..."
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="w-28 bg-elevated/80 border border-[#DDD6C8] border-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-[#3D6353]"
          />

          <input
            type="date"
            placeholder="Filter date..."
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-32 bg-elevated/80 border border-[#DDD6C8] border-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-[#3D6353]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-medium text-[#8C938E] mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          {['ALL', 'Draft', 'Pending approval', 'Approved', 'Sent', 'Won', 'Lost'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#3D6353] text-white shadow-sm'
                  : 'bg-elevated text-secondary hover:bg-[#EAE5DB]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-surface rounded-xl border border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-elevated/60 text-muted uppercase tracking-wider font-semibold border-b border-subtle">
              <tr>
                <th className="px-4 py-3">Quote #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Dimensions</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Batch Total</th>
                <th className="px-4 py-3 text-center">Rev</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 divide-subtle text-slate-700 text-secondary">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center text-slate-400">
                    Loading quotations...
                  </td>
                </tr>
              ) : quotes.length > 0 ? (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 hover:bg-elevated/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">
                      <div className="flex items-center gap-1.5">
                        <span>{q.quote_number}</span>
                        {q.damper_type === 'multi_blade' ? (
                          <span className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-amber-100 text-amber-800 bg-warning-bg text-warning">
                            Multi-Blade
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] rounded font-medium bg-slate-100 text-slate-600 bg-elevated text-muted">
                            R&P
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{q.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{q.project_name || 'Standard RFQ'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-primary">
                        {q.created_by || 'Quotation Member'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {q.created_by_email || (q.created_by === 'admin' ? 'admin@rapidbid.com' : 'member@rapidbid.com')}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {q.width_mm} × {q.height_mm} × {q.depth_mm} mm
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{q.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-primary">
                      {formatINR(q.quoted_price_unit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                      {formatINR(q.quoted_price_batch)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenHistoryModal(q)}
                        title="View revision history & restore"
                        className="px-2 py-0.5 rounded bg-elevated hover:bg-tint-sky text-slate-700 text-secondary font-mono font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <History className="w-3 h-3 text-blue-500" />
                        <span>v{q.revision_number}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <select
                          value={q.status}
                          onChange={(e) => handleStatusChange(q.id, e.target.value)}
                          className={`font-semibold text-xs border rounded-lg px-2 py-1 cursor-pointer ${
                            q.status === 'Pending approval' ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' :
                            q.status === 'Approved' ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold' :
                            q.status === 'Won' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            q.status === 'Sent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending approval">Pending approval</option>
                          <option value="Approved">Approved</option>
                          <option value="Sent">Sent</option>
                          <option value="Won">Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {q.status === 'Pending approval' && (
                          <>
                            <button
                              onClick={() => handleApprove(q.id)}
                              title="Manager Approve"
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-500"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(q.id)}
                              title="Reject & Request Revision"
                              className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-500"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {q.status === 'Draft' && (
                          <button
                            onClick={() => handleSubmitApproval(q.id)}
                            title="Submit for Manager Approval"
                            className="px-2 py-1 bg-amber-600 text-white rounded text-[11px] font-bold hover:bg-amber-500"
                          >
                            Submit
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenDetail(q.id)}
                          title="View Full Details"
                          className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => quotesApi.downloadCustomerPdf(q.id)}
                          title="Customer Quotation PDF (Zero cost/margin shown)"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => quotesApi.downloadCostSheetPdf(q.id)}
                          title="Internal Cost Sheet PDF (Confidential BOM & Rates)"
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => quotesApi.downloadExcel(q.id, isAdmin)}
                          title="Download Excel Sheet"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenRevisionModal(q)}
                          title="Revise Quote"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <GitBranch className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(q.id)}
                          title="Duplicate Quote"
                          className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {q.status === 'Draft' && (
                          <button
                            onClick={() => handleDeleteDraft(q.id)}
                            title="Delete Draft"
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center text-slate-400">
                    No quotes found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote Details Modal */}
      {viewQuote && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-subtle max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-subtle flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-primary">
                    Quote #{viewQuote.quote_number} (Rev {viewQuote.revision_number})
                  </h3>
                  {getStatusBadge(viewQuote.status)}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Customer: <strong>{viewQuote.customer_name}</strong> • Created by {viewQuote.created_by_user?.full_name || 'System'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => quotesApi.downloadCustomerPdf(viewQuote.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500"
                  title="Customer Quotation (No internal costs/margins)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Customer PDF
                </button>
                <button
                  onClick={() => quotesApi.downloadCostSheetPdf(viewQuote.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-600"
                  title="Internal Cost Sheet (Full Cost & Margin)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Cost Sheet PDF
                </button>
                <button
                  onClick={() => quotesApi.downloadExcel(viewQuote.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={() => setViewQuote(null)}
                  className="p-1.5 text-slate-400 hover:text-primary rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Specs & Pricing Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-elevated/60 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Dimensions</span>
                  <span className="font-bold text-primary font-mono">
                    {viewQuote.width_mm} × {viewQuote.height_mm} × {viewQuote.depth_mm} mm
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Quantity</span>
                  <span className="font-bold text-primary font-mono">
                    {viewQuote.quantity} Units
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Unit Quoted Price</span>
                  <span className="font-bold text-blue-600 text-accent-text font-mono">
                    {formatINR(viewQuote.quoted_price_unit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Batch Total</span>
                  <span className="font-bold text-primary font-mono">
                    {formatINR(viewQuote.quoted_price_batch)}
                  </span>
                </div>
              </div>

              {/* Damper Type & Multi-Blade Specifics */}
              {viewQuote.damper_type === 'multi_blade' && (
                <div className="bg-tint-peach border border-border-subtle rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-warning">
                      Multi-Blade (Louvered) Damper Specification
                    </span>
                    <span className="text-[10px] bg-warning-bg text-warning px-2 py-0.5 rounded font-mono">
                      {viewQuote.multi_blade_config?.blade_action || 'Opposed'} Blades • {viewQuote.multi_blade_config?.blade_type || 'Single Skin'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-secondary font-mono">
                    <div>Blade Count: <strong>{viewQuote.multi_blade_config?.blade_count || viewQuote.lines?.find(l => l.part_name?.includes('Blade Skins'))?.quantity || '-'}</strong></div>
                    <div>Sections: <strong>{viewQuote.multi_blade_config?.sections || 1}</strong></div>
                    <div>Shaft: <strong>{viewQuote.multi_blade_config?.shaft_diameter_mm || 16} mm dia</strong></div>
                    <div>Actuation: <strong>{viewQuote.multi_blade_config?.actuator_type || 'Electric'}</strong></div>
                  </div>
                </div>
              )}

              {/* BOM Table */}
              <div>
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-blue-500" />
                  <span>Calculated Bill of Materials ({viewQuote.lines?.length || 45} Lines)</span>
                </h4>
                <div className="border border-subtle rounded-lg overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-elevated text-secondary uppercase sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">Sr</th>
                        <th className="px-3 py-2">Part Description</th>
                        <th className="px-3 py-2">MOC</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Weight (kg)</th>
                        {isAdmin && (
                          <>
                            <th className="px-3 py-2 text-right">RM Cost (₹)</th>
                            <th className="px-3 py-2 text-right">Mfg Cost (₹)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 divide-subtle">
                      {viewQuote.lines?.map((ln) => (
                        <tr key={ln.id || ln.sr_no}>
                          <td className="px-3 py-1.5 text-center text-slate-400 font-mono">{ln.sr_no}</td>
                          <td className="px-3 py-1.5 font-medium text-primary">
                            {ln.part_name}
                            {ln.is_scaled && (
                              <span className="ml-1 text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 bg-warning-bg text-warning rounded">
                                Scaled
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-600 text-muted">{ln.moc}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{ln.quantity}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{ln.total_weight ? ln.total_weight.toFixed(2) : '-'}</td>
                          {isAdmin && (
                            <>
                              <td className="px-3 py-1.5 text-right font-mono">{ln.raw_material_cost ? formatNumber(ln.raw_material_cost) : '-'}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{ln.mfg_cost ? formatNumber(ln.mfg_cost) : '-'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {revisionQuote && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-subtle max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <h3 className="font-bold text-base text-primary flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-600" />
                <span>Create Revision #{revisionQuote.revision_number + 1}</span>
              </h3>
              <button onClick={() => setRevisionQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Revise quote parameters for <strong>{revisionQuote.quote_number}</strong>. The previous revision will be archived in history and can be restored anytime.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-muted mb-1">Width (mm)</label>
                  <input
                    type="number"
                    min="1000"
                    max="6000"
                    value={revWidth}
                    onChange={(e) => setRevWidth(Number(e.target.value))}
                    className="w-full p-2 border rounded font-mono bg-elevated border-subtle"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-muted mb-1">Height (mm)</label>
                  <input
                    type="number"
                    min="1000"
                    max="6000"
                    value={revHeight}
                    onChange={(e) => setRevHeight(Number(e.target.value))}
                    className="w-full p-2 border rounded font-mono bg-elevated border-subtle"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-muted mb-1">Depth (mm)</label>
                  <input
                    type="number"
                    min="300"
                    max="800"
                    value={revDepth}
                    onChange={(e) => setRevDepth(Number(e.target.value))}
                    className="w-full p-2 border rounded font-mono bg-elevated border-subtle"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-muted mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={revQty}
                    onChange={(e) => setRevQty(Number(e.target.value))}
                    className="w-full p-2 border rounded font-mono bg-elevated border-subtle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 text-muted mb-1">Markup %</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={revMarkup}
                  onChange={(e) => setRevMarkup(Number(e.target.value))}
                  className="w-full p-2 border rounded font-mono bg-elevated border-subtle"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setRevisionQuote(null)}
                className="px-4 py-2 border rounded-lg text-xs font-medium text-slate-600 text-muted hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRevision}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
              >
                Save as Revision {revisionQuote.revision_number + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision History & Comparison Modal */}
      {historyQuote && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-subtle max-w-4xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div>
                <h3 className="font-bold text-base text-primary flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <span>Revision History: {historyQuote.quote_number}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete audit trail of all revisions with restore capability
                </p>
              </div>
              <button onClick={() => setHistoryQuote(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Revisions */}
            <div className="overflow-x-auto border border-subtle rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-elevated text-muted uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Rev</th>
                    <th className="px-4 py-2.5">Date / Time</th>
                    <th className="px-4 py-2.5">Dimensions</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Batch Total</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 divide-subtle">
                  {revisions.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50 hover:bg-elevated/70">
                      <td className="px-4 py-2.5 font-bold font-mono">v{rev.revision_number}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {new Date(rev.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {rev.width_mm} × {rev.height_mm} × {rev.depth_mm} mm
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{rev.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium">{formatINR(rev.quoted_price_unit)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">
                        {formatINR(rev.quoted_price_batch)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleRestoreRevision(historyQuote.id, rev.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white rounded text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compare Two Revisions Side by Side */}
            {revisions.length >= 2 && (
              <div className="p-4 bg-elevated/60 rounded-xl space-y-3 text-xs">
                <div className="font-semibold text-primary flex items-center justify-between">
                  <span>Compare Revisions</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={compareRevA?.id || ''}
                      onChange={(e) => setCompareRevA(revisions.find((r) => r.id === e.target.value))}
                      className="p-1 rounded border text-xs bg-surface"
                    >
                      {revisions.map((r) => (
                        <option key={r.id} value={r.id}>Revision {r.revision_number}</option>
                      ))}
                    </select>
                    <span className="text-slate-400">vs</span>
                    <select
                      value={compareRevB?.id || ''}
                      onChange={(e) => setCompareRevB(revisions.find((r) => r.id === e.target.value))}
                      className="p-1 rounded border text-xs bg-surface"
                    >
                      {revisions.map((r) => (
                        <option key={r.id} value={r.id}>Revision {r.revision_number}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareRevA && compareRevB && (
                  <div className="grid grid-cols-3 gap-3 text-center border-t border-subtle pt-3">
                    <div className="text-left font-medium text-slate-500">Metric</div>
                    <div className="font-semibold">Rev {compareRevA.revision_number}</div>
                    <div className="font-semibold">Rev {compareRevB.revision_number}</div>

                    <div className="text-left text-slate-500">Dimensions</div>
                    <div className="font-mono">{compareRevA.width_mm}×{compareRevA.height_mm}×{compareRevA.depth_mm}</div>
                    <div className="font-mono">{compareRevB.width_mm}×{compareRevB.height_mm}×{compareRevB.depth_mm}</div>

                    <div className="text-left text-slate-500">Quantity</div>
                    <div className="font-mono">{compareRevA.quantity}</div>
                    <div className="font-mono">{compareRevB.quantity}</div>

                    <div className="text-left text-slate-500">Unit Price</div>
                    <div className="font-mono font-bold">{formatINR(compareRevA.quoted_price_unit)}</div>
                    <div className="font-mono font-bold">{formatINR(compareRevB.quoted_price_unit)}</div>

                    <div className="text-left text-slate-500">Batch Total</div>
                    <div className="font-mono font-bold text-blue-600">{formatINR(compareRevA.quoted_price_batch)}</div>
                    <div className="font-mono font-bold text-blue-600">{formatINR(compareRevB.quoted_price_batch)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
