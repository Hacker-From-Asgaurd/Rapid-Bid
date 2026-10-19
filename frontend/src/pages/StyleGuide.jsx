import React, { useState } from 'react';
import DamperLogo from '../components/DamperLogo';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Sliders, 
  Sparkles, 
  ArrowLeft,
  Eye,
  Check,
  ShieldCheck,
  Layers,
  BarChart3
} from 'lucide-react';

export default function StyleGuide({ onBack }) {
  const [inputText, setInputText] = useState('DN300 Flanged Casing');
  const [selectVal, setSelectVal] = useState('IS 2062');
  const [checkVal, setCheckVal] = useState(true);

  return (
    <div className="min-h-screen bg-base text-text-primary p-6 sm:p-10 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-elevated hover:bg-surface border border-border-subtle text-text-secondary cursor-pointer"
                title="Back to App"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-accent text-accent-contrast flex items-center justify-center font-bold">
              <DamperLogo className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <span>Rapid Bid Design Tokens</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-tint-mint text-text-primary border border-border-subtle font-mono">
                  DEV-ONLY
                </span>
              </h1>
              <p className="text-xs text-text-secondary mt-0.5">
                Comprehensive component inspector for Rapid Bid design tokens.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Core Semantic Surface & Border Tokens */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-text flex items-center gap-2">
            <Layers className="w-4 h-4" />
            1. Core Semantic Surfaces, Borders & Text
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-base border border-border-subtle text-center">
              <span className="text-xs font-mono font-bold block">bg-base</span>
              <span className="text-[11px] text-text-muted">#F9F7F2</span>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle text-center">
              <span className="text-xs font-mono font-bold block">bg-surface</span>
              <span className="text-[11px] text-text-muted">#FFFFFF</span>
            </div>
            <div className="p-4 rounded-xl bg-elevated border border-border-subtle text-center">
              <span className="text-xs font-mono font-bold block">bg-elevated</span>
              <span className="text-[11px] text-text-muted">#F4EFE6</span>
            </div>
            <div className="p-4 rounded-xl bg-surface border-2 border-border-subtle text-center">
              <span className="text-xs font-mono font-bold block">border-subtle</span>
              <span className="text-[11px] text-text-muted">#EAE5DB</span>
            </div>
            <div className="p-4 rounded-xl bg-surface border-2 border-border-strong text-center">
              <span className="text-xs font-mono font-bold block">border-strong</span>
              <span className="text-[11px] text-text-muted">#C5BCAE</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <div className="text-sm font-bold text-text-primary">text-primary Content</div>
              <div className="text-xs text-text-muted">Main headings, numbers, critical data</div>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <div className="text-sm font-semibold text-text-secondary">text-secondary Labels</div>
              <div className="text-xs text-text-muted">Field labels, column descriptors, secondary info</div>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <div className="text-sm font-medium text-text-muted">text-muted Hints</div>
              <div className="text-xs text-text-muted">Helper text, timestamps, placeholder hints</div>
            </div>
          </div>
        </div>

        {/* Section 2: Translucent Pastel Card Tints */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-text flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            2. Translucent Pastel Card Overlays (Text Stays Primary)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-tint-lavender border border-border-subtle text-text-primary">
              <span className="text-xs font-bold block">Lavender Card</span>
              <span className="text-[11px] text-text-secondary">rgba(167,139,250,0.12)</span>
            </div>
            <div className="p-4 rounded-xl bg-tint-mint border border-border-subtle text-text-primary">
              <span className="text-xs font-bold block">Mint Card</span>
              <span className="text-[11px] text-text-secondary">rgba(143,220,198,0.12)</span>
            </div>
            <div className="p-4 rounded-xl bg-tint-peach border border-border-subtle text-text-primary">
              <span className="text-xs font-bold block">Peach Card</span>
              <span className="text-[11px] text-text-secondary">rgba(255,184,153,0.12)</span>
            </div>
            <div className="p-4 rounded-xl bg-tint-sky border border-border-subtle text-text-primary">
              <span className="text-xs font-bold block">Sky Card</span>
              <span className="text-[11px] text-text-secondary">rgba(156,201,242,0.12)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Status Chips & Badges */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-text flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            3. Badges, Banners & Status Chips (Verified Dark-Safe FG/BG)
          </h2>
          <div className="flex flex-wrap gap-2.5 items-center">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-bg text-success border border-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning-bg text-warning border border-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Estimated
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-error-bg text-error border border-error flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> High Margin Alert
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-info-bg text-info border border-info flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Sent / Transmitted
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-tint-lavender text-text-primary border border-border-subtle">
              Draft
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning-bg text-warning border border-warning">
              Pending Approval
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-bg text-success border border-success">
              Approved
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-bg text-success border border-success">
              Won
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-error-bg text-error border border-error">
              Lost
            </span>
          </div>
          <div className="p-3 rounded-xl bg-warning-bg text-warning border border-warning text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Placeholder multi-blade data: not company-verified. Toggle to verify once Pune plant parameters are approved.</span>
          </div>
        </div>

        {/* Section 4: Form Controls */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-text flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            4. Form Controls, Focus Rings, and States
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Standard Input</label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-surface border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Select Menu</label>
              <select
                value={selectVal}
                onChange={(e) => setSelectVal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-surface border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring cursor-pointer"
              >
                <option value="IS 2062">IS 2062 Structural Mild Steel</option>
                <option value="SS 304L">SS 304L Stainless Steel</option>
                <option value="SS 316L">SS 316L Corrosion Resistant</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Disabled Input</label>
              <input
                type="text"
                disabled
                value="Auto-calculated Weight: 1,480 kg"
                className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-elevated border border-border-subtle text-text-muted cursor-not-allowed opacity-75"
              />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={checkVal}
                onChange={(e) => setCheckVal(e.target.checked)}
                className="rounded accent-accent w-4 h-4"
              />
              <span>Opposed Louver Blade Motion</span>
            </label>
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-accent-contrast shadow-sm cursor-pointer transition-all active:scale-95"
            >
              Accent Button (Contrast 5.53:1)
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-elevated hover:bg-surface text-text-primary border border-border-subtle cursor-pointer transition-all active:scale-95"
            >
              Elevated Action
            </button>
          </div>
        </div>

        {/* Section 5: BOM & Rates Table */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-text flex items-center gap-2">
            <Layers className="w-4 h-4" />
            5. BOM & Rates Table (Header, Zebra, Hover, Selected & Overridden Rates)
          </h2>
          <div className="rounded-2xl border border-border-subtle overflow-hidden bg-surface">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-elevated border-b border-border-subtle text-text-secondary uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Part #</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Weight (kg)</th>
                  <th className="py-2.5 px-3">Master ₹/kg</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">State</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-subtle hover:bg-tint-lavender/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold">P-01</td>
                  <td className="py-2.5 px-3">Main Formed Channel Frame</td>
                  <td className="py-2.5 px-3">IS 2062</td>
                  <td className="py-2.5 px-3 font-mono">485.0</td>
                  <td className="py-2.5 px-3 font-mono">₹75.00</td>
                  <td className="py-2.5 px-3 font-mono font-bold">₹36,375</td>
                  <td className="py-2.5 px-3"><span className="text-[10px] font-bold text-success bg-success-bg px-2 py-0.5 rounded-full">Standard</span></td>
                </tr>
                {/* Overridden Rate row highlighted with warning tint */}
                <tr className="border-b border-border-subtle bg-warning-bg/40 text-text-primary">
                  <td className="py-2.5 px-3 font-mono font-bold">P-02</td>
                  <td className="py-2.5 px-3">Precision Aerofoil Blade Skins</td>
                  <td className="py-2.5 px-3">SS 304L</td>
                  <td className="py-2.5 px-3 font-mono">220.0</td>
                  <td className="py-2.5 px-3 font-mono text-warning font-bold">₹290.00 (Overridden)</td>
                  <td className="py-2.5 px-3 font-mono font-bold">₹63,800</td>
                  <td className="py-2.5 px-3"><span className="text-[10px] font-bold text-warning bg-warning-bg px-2 py-0.5 rounded-full border border-warning">Custom Rate</span></td>
                </tr>
                {/* Active Selected CAD row */}
                <tr className="border-b border-border-subtle bg-tint-mint/40 ring-1 ring-success">
                  <td className="py-2.5 px-3 font-mono font-bold">P-03</td>
                  <td className="py-2.5 px-3">Through-Shaft Spindles (Ø45 mm)</td>
                  <td className="py-2.5 px-3">SS 410</td>
                  <td className="py-2.5 px-3 font-mono">92.5</td>
                  <td className="py-2.5 px-3 font-mono">₹120.00</td>
                  <td className="py-2.5 px-3 font-mono font-bold">₹11,100</td>
                  <td className="py-2.5 px-3"><span className="text-[10px] font-bold text-accent-text bg-elevated px-2 py-0.5 rounded-full">CAD Selected</span></td>
                </tr>
                <tr className="hover:bg-tint-lavender/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold">P-04</td>
                  <td className="py-2.5 px-3">Peripheral Companion Flanges</td>
                  <td className="py-2.5 px-3">IS 2062</td>
                  <td className="py-2.5 px-3 font-mono">110.0</td>
                  <td className="py-2.5 px-3 font-mono">₹75.00</td>
                  <td className="py-2.5 px-3 font-mono font-bold">₹8,250</td>
                  <td className="py-2.5 px-3"><span className="text-[10px] font-bold text-success bg-success-bg px-2 py-0.5 rounded-full">Standard</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 6: Image Stage for 3D Viewers & Renders */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-text flex items-center gap-2">
            <Eye className="w-4 h-4" />
            6. Image Stage for 3D Viewers & Transparent PNG Renders
          </h2>
          <div className="p-6 image-stage flex flex-col items-center justify-center text-center min-h-[200px] border border-border-subtle">
            <div className="w-16 h-16 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center mb-3 shadow-lg">
              <DamperLogo className="w-10 h-10" />
            </div>
            <div className="font-extrabold text-sm text-text-primary">
              Three.js Viewport & CAD Render Stage
            </div>
            <p className="text-xs text-text-secondary max-w-md mt-1">
              Soft lavender radial glow prevents steel parts from blending into dark backgrounds while keeping light mode crisp and clean.
            </p>
          </div>
        </div>

        {/* Section 7: Theme-Aware SVG Bar Chart */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent-text flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            7. Theme-Aware Visualization Bars & Metrics
          </h2>
          <div className="p-5 rounded-2xl bg-surface border border-border-subtle space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
              <span>Fabricated Steel Raw Cost Breakdown</span>
              <span className="text-text-primary">Total: ₹1,19,525</span>
            </div>
            <div className="h-6 w-full rounded-lg overflow-hidden flex bg-elevated border border-border-subtle">
              <div style={{ width: '45%' }} className="bg-accent h-full" title="Frame & Casing (45%)" />
              <div style={{ width: '30%' }} className="bg-warning h-full" title="Louver Blades (30%)" />
              <div style={{ width: '15%' }} className="bg-info h-full" title="Shafts & Actuation (15%)" />
              <div style={{ width: '10%' }} className="bg-success h-full" title="Hardware & Seals (10%)" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-text-secondary pt-1 font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent" /> Frame (45%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> Blades (30%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-info" /> Shafts (15%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Seals (10%)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
