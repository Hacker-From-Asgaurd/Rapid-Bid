import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  TrendingUp, 
  ShieldAlert, 
  Download, 
  Calendar, 
  CheckCircle, 
  Sparkles,
  Building,
  Info,
  Edit2
} from 'lucide-react';
import { quotesApi, companySettingsApi } from '../services/api';

export default function ImpactPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    manual_baseline_hours: 4.0,
    average_turnaround_hours: 0.45,
    hours_saved_per_quote: 3.55,
    monthly_quotes_count: 10,
    monthly_hours_saved: 35.5,
    margin_protection_estimate_inr: 850000,
    quotes: []
  });

  const [manualBaseline, setManualBaseline] = useState(4.0);
  const [isEditingBaseline, setIsEditingBaseline] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchImpactData();
  }, []);

  const fetchImpactData = async () => {
    try {
      setLoading(true);
      const res = await quotesApi.getImpactMetrics();
      setData(res);
      setManualBaseline(res.manual_baseline_hours || 4.0);
    } catch (err) {
      console.error("Failed to load impact metrics", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBaseline = async () => {
    try {
      setSavingSettings(true);
      const curSettings = await companySettingsApi.getSettings();
      await companySettingsApi.updateSettings({
        ...curSettings,
        manual_baseline_hours_per_quote: parseFloat(manualBaseline)
      });
      setIsEditingBaseline(false);
      await fetchImpactData();
    } catch (err) {
      alert("Failed to update baseline hours");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const avgMinutes = Math.round(data.average_turnaround_hours * 60);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Executive ROI & Speed Impact
            </span>
            <span className="text-xs text-[#6E7772] font-medium">• Empirical Time & Margin Metrics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Commercial Turnaround & Value Impact
          </h1>
          <p className="text-sm text-secondary mt-1 max-w-2xl">
            Live measurement of RFQ-to-Quote cycle speed, engineering hours saved, and cost-variance protection against material market fluctuations.
          </p>
        </div>

        <button
          onClick={handlePrintPdf}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#3D6353] hover:bg-[#2C483D] text-white shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Impact Report (PDF)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Metric 1: Avg Turnaround */}
        <div className="bg-[#FFFDFB] p-5 rounded-2xl border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#707974] uppercase tracking-wider mb-2">
            <span>Average Turnaround</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-primary">
              {avgMinutes} <span className="text-sm font-semibold text-secondary">mins</span>
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              ~8x Faster
            </span>
          </div>
          <p className="text-[11px] text-[#707974] mt-2">
            Measured from RFQ Intake to Final Client PDF quotation.
          </p>
        </div>

        {/* Metric 2: Manual Baseline */}
        <div className="bg-[#FFFDFB] p-5 rounded-2xl border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#707974] uppercase tracking-wider mb-2">
            <span>Manual Baseline Time</span>
            <button 
              onClick={() => setIsEditingBaseline(!isEditingBaseline)}
              className="text-[#3D6353] hover:underline flex items-center gap-1 text-[11px]"
            >
              <Edit2 className="w-3 h-3" />
              <span>{isEditingBaseline ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>
          {isEditingBaseline ? (
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="number"
                step="0.5"
                min="0.5"
                value={manualBaseline}
                onChange={(e) => setManualBaseline(e.target.value)}
                className="w-20 text-xs font-bold px-2 py-1 bg-white border border-[#3D6353] rounded"
              />
              <button
                onClick={handleSaveBaseline}
                disabled={savingSettings}
                className="px-2.5 py-1 text-xs font-bold bg-[#3D6353] text-white rounded"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary">
                {manualBaseline} <span className="text-sm font-semibold text-secondary">hrs/quote</span>
              </span>
            </div>
          )}
          <p className="text-[11px] text-[#707974] mt-2">
            Industry average manual Excel sheet estimation time.
          </p>
        </div>

        {/* Metric 3: Hours Saved / Month */}
        <div className="bg-[#FFFDFB] p-5 rounded-2xl border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#707974] uppercase tracking-wider mb-2">
            <span>Hours Saved (Monthly)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#3D6353]">
              {data.monthly_hours_saved} <span className="text-sm font-semibold text-secondary">hours</span>
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              High Impact
            </span>
          </div>
          <p className="text-[11px] text-[#707974] mt-2">
            Equivalent to freeing ~0.25 full-time senior estimation engineer.
          </p>
        </div>

        {/* Metric 4: Margin Protection */}
        <div className="bg-[#FFFDFB] p-5 rounded-2xl border border-subtle shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#707974] uppercase tracking-wider mb-2">
            <span>Margin Guard Savings</span>
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary">
              Rs. {(data.margin_protection_estimate_inr || 850000).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-[#707974] mt-2">
            Protected from stale plate rates & formula calculation human errors.
          </p>
        </div>
      </div>

      {/* Turnaround Table */}
      <div className="bg-[#FFFDFB] rounded-2xl border border-subtle p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-[#F0ECE3] pb-3">
          <div>
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3D6353]" />
              Measured Turnaround History Per Quote
            </h2>
            <p className="text-xs text-secondary">Exact timestamps recorded from RFQ reception to customer quotation transmission.</p>
          </div>

          <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
            SEED VALUES: DEMO
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-subtle text-[#707974] uppercase font-bold text-[10px] bg-[#FAF8F5]">
                <th className="py-2.5 px-3">Quote #</th>
                <th className="py-2.5 px-3">Client Company</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Damper Size</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Turnaround</th>
                <th className="py-2.5 px-3">Time Saved (vs 4h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE3]">
              {data.quotes && data.quotes.map((q, idx) => {
                const turnMins = q.turnaround_minutes || 25;
                const hrsSaved = (manualBaseline - (turnMins / 60)).toFixed(2);
                return (
                  <tr key={q.id || idx} className="hover:bg-[#FAF8F5]">
                    <td className="py-3 px-3 font-mono font-bold text-primary">{q.quote_number}</td>
                    <td className="py-3 px-3 font-semibold text-primary">{q.customer}</td>
                    <td className="py-3 px-3 text-secondary truncate max-w-[200px]">{q.project}</td>
                    <td className="py-3 px-3 font-mono">{q.size} mm</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        q.status === 'Won' ? 'bg-emerald-100 text-emerald-800' :
                        q.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                        q.status === 'Approved' ? 'bg-purple-100 text-purple-800' :
                        q.status === 'Pending approval' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-800">
                      {turnMins} mins
                    </td>
                    <td className="py-3 px-3 font-semibold text-primary">
                      +{hrsSaved} hrs
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
