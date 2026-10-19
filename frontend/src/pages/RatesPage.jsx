import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Save, 
  History, 
  Sparkles, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Clock,
  User,
  ShieldAlert,
  Search,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  RotateCcw,
  Layers,
  Lock,
  Unlock,
  Percent,
  Check
} from 'lucide-react';
import { ratesApi } from '../services/api';
import { formatINR, formatNumber, formatPercent } from '../utils/formatters';
import initialCertifiedCostSheet from '../data/certified45Parts.json';

function buildDefaultPartRates() {
  const map = {};
  (initialCertifiedCostSheet?.lines || []).forEach((line) => {
    map[line.sr_no] = {
      sr_no: line.sr_no,
      part_name: line.part_name,
      moc: line.moc || 'IS 2062',
      is_round: !!line.is_round,
      dim_1: line.dim_1,
      dim_2: line.dim_2,
      dim_3: line.dim_3,
      qty: line.qty,
      weight: line.weight,
      material_rate: Number(line.material_rate ?? 75),
      plate_labour_rate: Number(line.plate_labour_rate ?? (line.is_round ? 0 : 10)),
      per_piece_machining: Number(line.per_piece_machining ?? 0),
      rolling_cost: Number(line.rolling_cost ?? 0),
    };
  });
  return map;
}

export default function RatesPage({ user }) {
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'part_rates', 'history', 'whatif', 'import'
  const [ratesData, setRatesData] = useState(null);
  const [editRates, setEditRates] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeDescription, setChangeDescription] = useState('Quarterly rate revision');

  // Part-by-part 45 parts rates state (Admin exclusive edit rights)
  const [partRates, setPartRates] = useState(() => {
    try {
      const stored = localStorage.getItem('dqp_part_rates');
      if (stored) return JSON.parse(stored);
    } catch {}
    return buildDefaultPartRates();
  });
  const [partSearch, setPartSearch] = useState('');
  const [partFormationView, setPartFormationView] = useState('grid'); // 'grid' | 'table'
  const [partMocFilter, setPartMocFilter] = useState('ALL');
  const [bulkField, setBulkField] = useState('material_rate');
  const [bulkPct, setBulkPct] = useState(5);

  // What-If Simulator state
  const [steelDelta, setSteelDelta] = useState(5); // %
  const [labourDelta, setLabourDelta] = useState(0); // %
  const [fabDelta, setFabDelta] = useState(0); // %
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    loadCurrentRates();
    loadHistory();
  }, []);

  const loadCurrentRates = async () => {
    try {
      setLoading(true);
      const res = await ratesApi.getCurrentRates();
      setRatesData(res);
      setEditRates(JSON.parse(JSON.stringify(res)));
      if (res?.part_rates && Object.keys(res.part_rates).length > 0) {
        setPartRates(res.part_rates);
        localStorage.setItem('dqp_part_rates', JSON.stringify(res.part_rates));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await ratesApi.getHistory();
      setHistoryList(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRateFieldChange = (category, key, val) => {
    const num = parseFloat(val);
    setEditRates((prev) => {
      const next = { ...prev };
      if (category === 'root') {
        next[key] = isNaN(num) ? 0 : num;
      } else {
        if (!next[category]) next[category] = {};
        next[category][key] = isNaN(num) ? 0 : num;
      }
      return next;
    });
  };

  const handlePartRateChange = (sr_no, field, val) => {
    setPartRates((prev) => {
      const existing = prev[sr_no] || {};
      const num = parseFloat(val);
      return {
        ...prev,
        [sr_no]: {
          ...existing,
          [field]: field === 'moc' ? val : (isNaN(num) ? 0 : num),
        },
      };
    });
  };

  const handleSyncWithGlobalMaterialRates = () => {
    if (!editRates?.material_rates) return;
    setPartRates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sr_no) => {
        const p = next[sr_no];
        if (p.moc && editRates.material_rates[p.moc] !== undefined) {
          next[sr_no] = { ...p, material_rate: editRates.material_rates[p.moc] };
        }
      });
      return next;
    });
    alert('Part material rates synced to active global steel rates (IS 2062, SS 304L, SS 410, EN8).');
  };

  const handleBulkAdjustPartRates = () => {
    const factor = 1 + (Number(bulkPct) || 0) / 100;
    setPartRates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sr_no) => {
        const p = next[sr_no];
        if (bulkField === 'material_rate') {
          next[sr_no] = { ...p, material_rate: Math.round(Number(p.material_rate || 0) * factor * 10) / 10 };
        } else if (bulkField === 'per_piece_machining') {
          if (Number(p.per_piece_machining || 0) > 0) {
            next[sr_no] = { ...p, per_piece_machining: Math.round(Number(p.per_piece_machining || 0) * factor) };
          }
        } else if (bulkField === 'plate_labour_rate') {
          if (!p.is_round && Number(p.plate_labour_rate || 0) > 0) {
            next[sr_no] = { ...p, plate_labour_rate: Math.round(Number(p.plate_labour_rate || 0) * factor * 10) / 10 };
          }
        }
      });
      return next;
    });
  };

  const handleResetPartRatesToDefault = () => {
    if (!window.confirm('Reset all 45 part rates to certified factory benchmark values?')) return;
    const defs = buildDefaultPartRates();
    setPartRates(defs);
    localStorage.setItem('dqp_part_rates', JSON.stringify(defs));
  };

  const handleRejectChanges = () => {
    if (!window.confirm('Discard all unsaved rate changes and restore active rates?')) return;
    if (ratesData) {
      setEditRates(JSON.parse(JSON.stringify(ratesData)));
      if (ratesData.part_rates && Object.keys(ratesData.part_rates).length > 0) {
        setPartRates(JSON.parse(JSON.stringify(ratesData.part_rates)));
      } else {
        const stored = localStorage.getItem('dqp_part_rates');
        setPartRates(stored ? JSON.parse(stored) : buildDefaultPartRates());
      }
    }
  };

  const handleSaveNewVersion = async () => {
    try {
      setSaving(true);
      const payload = {
        material_rates: editRates.material_rates,
        labour_rates: editRates.labour_rates,
        bought_out_prices: editRates.bought_out_prices,
        automation_prices: editRates.automation_prices,
        fabrication_rate_per_kg: editRates.fabrication_rate_per_kg,
        finishing_rate_per_kg: editRates.finishing_rate_per_kg,
        default_markup_pct: editRates.default_markup_pct,
        part_rates: partRates,
        change_description: changeDescription || 'Admin rate revision including 45 part rates',
      };
      
      // Save locally immediately so member quotes reflect this right away
      localStorage.setItem('dqp_active_rates', JSON.stringify(payload));
      localStorage.setItem('dqp_part_rates', JSON.stringify(partRates));

      const res = await ratesApi.updateRates(payload);
      alert(`Changes Saved! New Master Rate Version #${res.version_number} is now active. All quotation members will directly use these updated part & material rates.`);
      loadCurrentRates();
      loadHistory();
    } catch (err) {
      // Offline fallback: save locally
      const payload = {
        ...editRates,
        part_rates: partRates,
      };
      localStorage.setItem('dqp_active_rates', JSON.stringify(payload));
      localStorage.setItem('dqp_part_rates', JSON.stringify(partRates));
      alert('Rates saved locally and directly reflected for all quotation members!');
      setRatesData(JSON.parse(JSON.stringify(editRates)));
    } finally {
      setSaving(false);
    }
  };

  const filteredParts = useMemo(() => {
    return Object.values(partRates).filter((part) => {
      const q = partSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        part.part_name?.toLowerCase().includes(q) || 
        String(part.sr_no).includes(q)
      );
    }).sort((a, b) => Number(a.sr_no) - Number(b.sr_no));
  }, [partRates, partSearch]);

  const runWhatIf = async () => {
    try {
      setWhatIfLoading(true);
      const deltas = {};
      if (steelDelta !== 0) deltas.steel_delta_pct = Number(steelDelta);
      if (labourDelta !== 0) deltas.labour_delta_pct = Number(labourDelta);
      if (fabDelta !== 0) deltas.fabrication_delta_pct = Number(fabDelta);
      const res = await ratesApi.simulateWhatIf(deltas);
      setWhatIfResult(res);
    } catch (err) {
      alert('What-if calculation failed.');
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setImportPreview(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await ratesApi.previewImport(formData);
      setImportPreview(res);
    } catch (err) {
      setImportError(err.response?.data?.detail || 'Failed to preview file.');
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await ratesApi.confirmImport(formData);
      alert(`Import applied successfully! New Rate Version #${res.version_number} is now active.`);
      setImportPreview(null);
      setImportFile(null);
      loadCurrentRates();
      loadHistory();
      setActiveTab('current');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to confirm import.');
    } finally {
      setImporting(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-primary">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1">
          Only Admin and Manager roles can view and modify global company rates.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">
              Company Master Rates & What-If Engine
            </h1>
            {ratesData && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-tint-mint text-primary border border-border-subtle font-mono">
                Active: v{ratesData.version_number}
              </span>
            )}
          </div>
          <p className="text-xs text-secondary mt-1">
            Maintain raw material rates, fabrication benchmarks, and simulate commodity inflation
          </p>
        </div>

        {/* Action tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-elevated p-1 rounded-xl text-xs font-semibold border border-subtle">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'current' ? 'bg-surface text-accent-text font-bold shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Global Commodity Rates
          </button>
          <button
            onClick={() => setActiveTab('part_rates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'part_rates' ? 'bg-surface text-accent-text font-bold shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Part-by-Part Master Rates</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-tint-mint text-primary border border-border-subtle">
              45 Parts
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('whatif');
              runWhatIf();
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'whatif' ? 'bg-surface text-accent-text font-bold shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            What-If Simulator
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-surface text-accent-text font-bold shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Audit Log ({historyList.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'import' ? 'bg-surface text-accent-text font-bold shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Import / Export
          </button>
        </div>
      </div>

      {/* Tab 1: Current Master Rates Editor */}
      {activeTab === 'current' && editRates && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-subtle p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-subtle pb-4">
              <div>
                <h3 className="font-bold text-primary">Active Global Rates Table</h3>
                <p className="text-xs text-slate-400">
                  Editing these rates creates a new version. Existing quotes remain unchanged.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Change reason / note..."
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded-lg bg-elevated border-subtle w-full sm:w-48 text-primary"
                />
                
                {/* Save Changes button */}
                <button
                  type="button"
                  onClick={handleSaveNewVersion}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-contrast font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition-all shrink-0 cursor-pointer"
                  title="Save and directly publish updated rates to all quotation members"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>

                {/* Reject / Discard button */}
                <button
                  type="button"
                  onClick={handleRejectChanges}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-error-bg text-error border border-error hover:opacity-90 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all shrink-0 cursor-pointer"
                  title="Reject and discard all unsaved edits"
                >
                  <span>Reject / Discard</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              {/* Material Rates */}
              <div className="p-4 rounded-xl bg-elevated border border-subtle space-y-3">
                <h4 className="font-bold text-primary border-b border-subtle pb-2">
                  Steel & Metal Rates (₹/kg)
                </h4>
                {Object.entries(editRates.material_rates || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-secondary font-medium">{k}</span>
                    <input
                      type="number"
                      step="1"
                      value={v}
                      onChange={(e) => handleRateFieldChange('material_rates', k, e.target.value)}
                      className="w-24 px-2 py-1 text-right font-mono bg-surface border border-subtle rounded"
                    />
                  </div>
                ))}
              </div>

              {/* Fabrication, Finishing & Labour */}
              <div className="p-4 rounded-xl bg-elevated border border-subtle space-y-3">
                <h4 className="font-bold text-primary border-b border-subtle pb-2">
                  Fabrication & Finishing (₹/kg)
                </h4>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-secondary font-medium">Fabrication Rate</span>
                  <input
                    type="number"
                    step="1"
                    value={editRates.fabrication_rate_per_kg}
                    onChange={(e) => handleRateFieldChange('root', 'fabrication_rate_per_kg', e.target.value)}
                    className="w-24 px-2 py-1 text-right font-mono bg-surface border border-subtle rounded"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-secondary font-medium">Finishing Rate</span>
                  <input
                    type="number"
                    step="1"
                    value={editRates.finishing_rate_per_kg}
                    onChange={(e) => handleRateFieldChange('root', 'finishing_rate_per_kg', e.target.value)}
                    className="w-24 px-2 py-1 text-right font-mono bg-surface border border-subtle rounded"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-secondary font-medium">Default Markup %</span>
                  <input
                    type="number"
                    step="0.5"
                    value={editRates.default_markup_pct}
                    onChange={(e) => handleRateFieldChange('root', 'default_markup_pct', e.target.value)}
                    className="w-24 px-2 py-1 text-right font-mono bg-surface border border-subtle rounded"
                  />
                </div>

                <h4 className="font-bold text-primary border-b border-subtle pt-3 pb-2">
                  Labour Rates (₹/m-mm)
                </h4>
                {Object.entries(editRates.labour_rates || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-secondary font-medium">{k}</span>
                    <input
                      type="number"
                      step="0.1"
                      value={v}
                      onChange={(e) => handleRateFieldChange('labour_rates', k, e.target.value)}
                      className="w-24 px-2 py-1 text-right font-mono bg-surface border border-subtle rounded"
                    />
                  </div>
                ))}
              </div>

              {/* Bought-Out & Automation */}
              <div className="p-4 rounded-xl bg-elevated border border-subtle space-y-3">
                <h4 className="font-bold text-primary border-b border-subtle pb-2">
                  Bought-Out & Hardware (₹)
                </h4>
                {Object.entries(editRates.bought_out_prices || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-secondary font-medium capitalize">{k.replace('_', ' ')}</span>
                    <input
                      type="number"
                      step="1"
                      value={v}
                      onChange={(e) => handleRateFieldChange('bought_out_prices', k, e.target.value)}
                      className="w-24 px-2 py-1 text-right font-mono bg-surface border border-subtle rounded"
                    />
                  </div>
                ))}

                <h4 className="font-bold text-primary border-b border-subtle pt-3 pb-2">
                  Automation (₹)
                </h4>
                {Object.entries(editRates.automation_prices || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-secondary font-medium capitalize">{k.replace('_', ' ')}</span>
                    <input
                      type="number"
                      step="100"
                      value={v}
                      onChange={(e) => handleRateFieldChange('automation_prices', k, e.target.value)}
                      className="w-28 px-2 py-1 text-right font-mono bg-surface border border-subtle rounded"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Direct jump to Part-by-Part Rates */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-border-subtle bg-tint-mint text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-primary">
                    45 Individual Damper Component Rates Configured
                  </h4>
                  <p className="text-secondary text-[11px]">
                    Configure distinct ₹/kg rates, machining charges (MC), and labour rates for each individual damper part.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('part_rates')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-contrast font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <span>Open Part-by-Part Rates (45 Parts)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Part-by-Part Master Rates Editor (45 Parts) */}
      {activeTab === 'part_rates' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-subtle p-6 shadow-sm space-y-6">
            
            {/* Top Toolbar: Title, Note & Save Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-subtle pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-primary text-base">
                    Part-by-Part Master Rates (45 Damper Components)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-tint-mint text-primary border border-border-subtle">
                    Admin Exclusive Edit Rights
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Manage the unit material rate (₹/kg) for each individual part. All quotation calculations automatically adopt these rates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Rate revision reason..."
                  value={changeDescription}
                  onChange={(e) => setChangeDescription(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded-lg bg-elevated border-subtle w-full sm:w-48 text-primary"
                />

                <button
                  type="button"
                  onClick={handleSaveNewVersion}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-contrast font-bold px-4 py-1.5 rounded-lg text-xs shadow-sm transition-all shrink-0 cursor-pointer"
                  title="Save and lock updated part rates to all quotes"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Part Rates'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRejectChanges}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-error-bg text-error border border-error hover:opacity-90 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all shrink-0 cursor-pointer"
                >
                  <span>Discard</span>
                </button>
              </div>
            </div>

            {/* Quick Actions & Filter Row */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-elevated p-3.5 rounded-xl border border-subtle">
              
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search 45 parts by name or #..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-subtle bg-surface text-primary"
                />
              </div>

              {/* Formation View Selector & Bulk Tools */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center bg-surface p-0.5 rounded-lg border border-subtle text-xs">
                  <button
                    type="button"
                    onClick={() => setPartFormationView('grid')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      partFormationView === 'grid'
                        ? 'bg-[#3D6353] text-white shadow-xs'
                        : 'text-secondary hover:text-slate-900'
                    }`}
                  >
                    2-Column Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartFormationView('table')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      partFormationView === 'table'
                        ? 'bg-[#3D6353] text-white shadow-xs'
                        : 'text-secondary hover:text-slate-900'
                    }`}
                  >
                    Table View
                  </button>
                </div>

                {/* Bulk % adjust */}
                <div className="flex items-center gap-1 text-xs bg-surface border border-subtle rounded-lg p-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold px-1">Bulk:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPartRates(prev => {
                        const next = { ...prev };
                        Object.keys(next).forEach(k => {
                          next[k] = { ...next[k], material_rate: Math.round(Number(next[k].material_rate || 0) * 1.05 * 10) / 10 };
                        });
                        return next;
                      });
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-elevated hover:bg-slate-200 text-slate-700 text-primary"
                    title="Increase all part rates by 5%"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPartRates(prev => {
                        const next = { ...prev };
                        Object.keys(next).forEach(k => {
                          next[k] = { ...next[k], material_rate: Math.round(Number(next[k].material_rate || 0) * 0.95 * 10) / 10 };
                        });
                        return next;
                      });
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-elevated hover:bg-slate-200 text-slate-700 text-primary"
                    title="Decrease all part rates by 5%"
                  >
                    -5%
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSyncWithGlobalMaterialRates}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-tint-sky text-primary border border-border-subtle rounded-lg text-xs font-semibold hover:bg-blue-100 cursor-pointer"
                  title="Sync all parts with global steel rate table"
                >
                  <RefreshCw className="w-3 h-3 text-blue-600" />
                  <span>Sync Global Rates</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetPartRatesToDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated text-secondary border border-subtle rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  title="Reset all parts back to factory certified benchmarks"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset Defaults</span>
                </button>
              </div>

            </div>

            {/* Proper Formation: Part Name with Rate Input ONLY */}
            {partFormationView === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredParts.map((p) => (
                  <div
                    key={p.sr_no}
                    className="flex items-center justify-between gap-3 p-3 bg-surface border border-subtle rounded-xl hover:border-strong transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-elevated border border-subtle flex items-center justify-center font-mono text-xs font-bold text-secondary shrink-0 group-hover:bg-[#EEF5F1] group-hover:text-[#2F4D40] transition-colors">
                        #{p.sr_no}
                      </span>
                      <span className="font-semibold text-xs text-primary truncate" title={p.part_name}>
                        {p.part_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-elevated/80 border border-subtle rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#3D6353] focus-within:border-transparent transition-all">
                        <span className="text-xs font-bold text-slate-400 mr-1.5">₹</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={p.material_rate}
                          onChange={(e) => handlePartRateChange(p.sr_no, 'material_rate', e.target.value)}
                          className="w-20 text-right font-mono text-xs font-bold bg-transparent outline-none text-primary"
                        />
                        <span className="text-[11px] text-slate-400 font-mono ml-1.5">/kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto border border-subtle rounded-xl shadow-xs max-h-[640px]">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#2C483D] text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 shadow-xs border-b border-subtle">
                    <tr>
                      <th className="px-4 py-3 text-center w-16 border-r border-[#3A5649]">#</th>
                      <th className="px-5 py-3 text-left border-r border-[#3A5649]">Part Name</th>
                      <th className="px-5 py-3 text-right w-44 bg-[#23382F]">Material Rate (₹/kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle text-primary bg-surface">
                    {filteredParts.map((p) => (
                      <tr key={p.sr_no} className="hover:bg-elevated/70 transition-colors">
                        <td className="px-4 py-2 text-center font-mono font-bold text-muted border-r border-subtle">
                          #{p.sr_no}
                        </td>
                        <td className="px-5 py-2 font-semibold text-primary border-r border-subtle">
                          {p.part_name}
                        </td>
                        <td className="px-5 py-2 text-right bg-amber-50/20 bg-warning-bg/40">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={p.material_rate}
                              onChange={(e) => handlePartRateChange(p.sr_no, 'material_rate', e.target.value)}
                              className="w-24 px-2 py-1 text-right font-mono text-xs font-bold border border-subtle rounded-lg bg-surface text-primary focus:ring-2 focus:ring-[#3D6353] outline-none"
                            />
                            <span className="text-[11px] text-slate-400 font-mono">/kg</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Tab 2: What-If Simulator */}
      {activeTab === 'whatif' && (
        <div className="bg-surface rounded-xl border border-subtle p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-base text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>Commodity Price Sensitivity & Margin Simulator</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Simulate the bottom-line price impact on the 3000 × 3000 × 450 mm reference damper before committing rate updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-elevated rounded-xl border border-subtle">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Steel Price Shift (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={steelDelta}
                  onChange={(e) => setSteelDelta(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-14 text-right font-mono font-bold text-xs">
                  {steelDelta > 0 ? `+${steelDelta}%` : `${steelDelta}%`}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Labour Shift (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={labourDelta}
                  onChange={(e) => setLabourDelta(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-14 text-right font-mono font-bold text-xs">
                  {labourDelta > 0 ? `+${labourDelta}%` : `${labourDelta}%`}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Fabrication Rate Shift (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={fabDelta}
                  onChange={(e) => setFabDelta(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-14 text-right font-mono font-bold text-xs">
                  {fabDelta > 0 ? `+${fabDelta}%` : `${fabDelta}%`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={runWhatIf}
              disabled={whatIfLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-md"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Simulate Impact</span>
            </button>
          </div>

          {/* Results Comparison Grid */}
          {whatIfResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-subtle">
              <div className="p-4 rounded-xl bg-elevated/60 border border-subtle">
                <span className="text-xs text-slate-500 block">Baseline Quoted Price</span>
                <span className="text-xl font-bold font-mono text-primary">
                  {formatINR(whatIfResult.baseline.quoted_price_unit)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Cost: {formatINR(whatIfResult.baseline.total_cost_unit)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-tint-lavender border border-border-subtle">
                <span className="text-xs text-primary block font-semibold">
                  Simulated Quoted Price
                </span>
                <span className="text-xl font-extrabold font-mono text-primary">
                  {formatINR(whatIfResult.simulated.quoted_price_unit)}
                </span>
                <span className="text-[11px] text-primary block mt-1">
                  Cost: {formatINR(whatIfResult.simulated.total_cost_unit)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-tint-peach border border-border-subtle">
                <span className="text-xs text-primary block font-semibold">
                  Net Commercial Difference
                </span>
                <span className="text-xl font-black font-mono text-primary">
                  {whatIfResult.price_delta_amount >= 0 ? '+' : ''}{formatINR(whatIfResult.price_delta_amount)}
                </span>
                <span className="text-[11px] font-bold text-primary block mt-1">
                  {whatIfResult.price_delta_pct > 0 ? `+${whatIfResult.price_delta_pct}%` : `${whatIfResult.price_delta_pct}%`} price adjustment required
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History & Audit Log */}
      {activeTab === 'history' && (
        <div className="bg-surface rounded-xl border border-subtle p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-primary">Rate Revision Audit Trail</h3>
            <p className="text-xs text-slate-400">All historical changes with timestamp, author, and old vs new values.</p>
          </div>

          <div className="overflow-x-auto border border-subtle rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-elevated text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Date / Time</th>
                  <th className="px-4 py-2.5">Item Changed</th>
                  <th className="px-4 py-2.5 text-right">Old Value</th>
                  <th className="px-4 py-2.5 text-right">New Value</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle font-mono">
                {historyList.length > 0 ? (
                  historyList.map((h) => (
                    <tr key={h.id} className="hover:bg-elevated/50">
                      <td className="px-4 py-2 text-slate-500">
                        {new Date(h.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2 font-medium text-primary">{h.rate_key}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{h.old_value}</td>
                      <td className="px-4 py-2 text-right font-bold text-accent-text">{h.new_value}</td>
                      <td className="px-4 py-2 text-muted font-sans">{h.change_reason || '-'}</td>
                      <td className="px-4 py-2 font-sans text-slate-500">{h.changed_by_user?.full_name || 'Admin'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-400 font-sans">
                      No manual rate changes recorded yet. Initial base loaded from seed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Import / Export */}
      {activeTab === 'import' && (
        <div className="bg-surface rounded-xl border border-subtle p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Panel */}
            <div className="p-5 rounded-xl border border-subtle bg-elevated space-y-4">
              <div>
                <h4 className="font-bold text-primary flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-500" />
                  <span>Export Master Rates</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Download active rates in CSV or Excel format for offline planning.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => ratesApi.exportRates('csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-subtle rounded-lg text-xs font-semibold hover:bg-slate-100"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => ratesApi.exportRates('xlsx')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Import Panel */}
            <div className="p-5 rounded-xl border border-subtle bg-elevated space-y-4">
              <div>
                <h4 className="font-bold text-primary flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-500" />
                  <span>Import Rates (with Diff Preview)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Upload modified CSV or XLSX. Unknown keys are rejected. You must confirm before applying.
                </p>
              </div>

              <input
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />

              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {importError}
                </div>
              )}
            </div>
          </div>

          {/* Import Preview Table */}
          {importPreview && (
            <div className="p-5 bg-elevated/60 rounded-xl border border-blue-200 border-border-subtle space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-primary">Before / After Import Preview</h4>
                  <p className="text-slate-400">Total modified keys: {importPreview.diffs.length}</p>
                </div>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md"
                >
                  Confirm & Apply New Rate Version
                </button>
              </div>

              <div className="overflow-x-auto border border-subtle rounded-lg">
                <table className="w-full text-left font-mono">
                  <thead className="bg-elevated text-secondary uppercase">
                    <tr>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Current Value</th>
                      <th className="px-3 py-2 text-right">New Imported Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {importPreview.diffs.map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{d.category}</td>
                        <td className="px-3 py-1.5 font-bold">{d.key}</td>
                        <td className="px-3 py-1.5 text-right text-slate-400">{d.old_value}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-emerald-600">{d.new_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
