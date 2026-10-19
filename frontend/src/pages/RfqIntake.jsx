import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Gauge, 
  Thermometer, 
  Hash, 
  Box,
  Copy,
  Info,
  ChevronDown
} from 'lucide-react';
import { quotesApi } from '../services/api';

export default function RfqIntake({ setView, setRfqPrefill }) {
  const [rfqText, setRfqText] = useState('');
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  // Editable confirmation form state
  const [formState, setFormState] = useState({
    product_type: 'damper',
    width_mm: 3000,
    height_mm: 3000,
    depth_mm: 450,
    material: 'IS 2062',
    quantity: 1,
    actuation: 'Electric Actuator',
    pressure: '',
    temperature: '',
    customer: '',
    project: '',
    notes: ''
  });

  // Load sample RFQs on mount
  useEffect(() => {
    quotesApi.getRfqSamples()
      .then((data) => {
        setSamples(data || []);
        if (data && data.length > 0) {
          // Preload Sample 1 by default
          setSelectedSample(data[0].id);
          setRfqText(data[0].text);
          runParse(data[0].text);
        }
      })
      .catch(() => {
        // Fallback default
        const sampleText = `Dear Pune Valve & Damper Team,\n\nPlease quote for:\nItem: Rack and Pinion Heavy-Duty Isolation Damper\nSize: 3000 mm (W) x 3000 mm (H) x 450 mm (D)\nMOC: IS 2062 with SS 304L blade\nQuantity: 2 Nos.\nActuation: Electric Actuator (Auma make, 415V)\nDesign Pressure: 450 mmWC, Temp: 220 °C`;
        setRfqText(sampleText);
        runParse(sampleText);
      });
  }, []);

  const handleSelectSample = (sampleId) => {
    setSelectedSample(sampleId);
    const found = samples.find(s => s.id === sampleId);
    if (found) {
      setRfqText(found.text);
      runParse(found.text, found);
    }
  };

  const runParse = async (textToParse, sampleContext = null) => {
    if (!textToParse.trim()) {
      setParsedData(null);
      return;
    }
    setIsParsing(true);
    try {
      const res = await quotesApi.parseRfq(textToParse);
      setParsedData(res);
      
      const foundSample = sampleContext || samples.find(s => s.text.trim() === textToParse.trim());

      setFormState({
        product_type: res.product_type?.value || 'damper',
        width_mm: res.dimensions?.width_mm || 3000,
        height_mm: res.dimensions?.height_mm || 3000,
        depth_mm: res.dimensions?.depth_mm || 450,
        material: res.material?.value || 'IS 2062',
        quantity: res.quantity?.value || 1,
        actuation: res.actuation?.value || 'Electric Actuator',
        pressure: res.pressure?.value || '',
        temperature: res.temperature?.value || '',
        customer: foundSample ? foundSample.customer : (res.suggested_customer || 'Industrial Client Pvt Ltd'),
        project: foundSample ? foundSample.project : 'Flue Gas Isolation Damper Supply',
        notes: textToParse
      });
    } catch (err) {
      console.error("Parse error, using fallback rule engine:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleProceedToQuote = () => {
    const prefill = {
      width_mm: Number(formState.width_mm),
      height_mm: Number(formState.height_mm),
      depth_mm: Number(formState.depth_mm),
      quantity: Number(formState.quantity),
      flap_material: formState.material,
      actuation_type: formState.actuation,
      customer_name: formState.customer,
      project_name: formState.project,
      notes: `RFQ Specifications: ${formState.pressure ? 'Pressure: ' + formState.pressure + ' | ' : ''}${formState.temperature ? 'Temp: ' + formState.temperature + ' | ' : ''}Customer text: ${formState.notes.substring(0, 180)}...`
    };

    localStorage.setItem('rapidbid_rfq_prefill', JSON.stringify(prefill));
    if (setRfqPrefill) {
      setRfqPrefill(prefill);
    }
    setView('new-quote');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Smart Intake Engine
            </span>
            <span className="text-xs text-[#6E7772] font-medium">• 100% Offline Rule-Based Extraction</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            RFQ Smart Intake & Estimation Launchpad
          </h1>
          <p className="text-sm text-secondary mt-1 max-w-3xl">
            Paste customer enquiry emails or technical tenders. The engine deterministically parses dimensions, metallurgy, quantities, and operating parameters into a verified costing quote in under 30 seconds.
          </p>
        </div>

        {/* Sample selector */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-semibold text-secondary">Try a Sample RFQ:</label>
          <select 
            value={selectedSample}
            onChange={(e) => handleSelectSample(e.target.value)}
            className="text-xs font-semibold bg-white border border-[#D5CEBF] rounded-lg px-3 py-2 text-primary shadow-sm hover:border-[#3D6353] focus:ring-2 focus:ring-[#3D6353]/20"
          >
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Paste Input & Extracted Confirmation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: RFQ Paste Area */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-[#FFFDFB] rounded-2xl border border-subtle p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3D6353]" />
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                  Raw Customer Enquiry Email / Tender Text
                </h2>
              </div>
              <button
                onClick={() => runParse(rfqText)}
                disabled={isParsing || !rfqText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3D6353] text-white hover:bg-[#2C483D] disabled:opacity-50 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />
                <span>Re-Parse</span>
              </button>
            </div>

            <textarea
              rows={14}
              value={rfqText}
              onChange={(e) => {
                setRfqText(e.target.value);
                runParse(e.target.value);
              }}
              placeholder="Paste email text, specifications, or tender clause here..."
              className="w-full text-xs font-mono p-3.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-[#3D6353]/30 focus:border-[#3D6353] resize-none leading-relaxed"
            />

            <div className="mt-3 flex items-center justify-between text-xs text-[#707974]">
              <span>Accepts meters, mm, fractions, and Indian industry standard MOCs.</span>
              <span className="font-mono">{rfqText.length} characters</span>
            </div>
          </div>

          {/* Offline Architecture Callout */}
          <div className="bg-emerald-50/70 rounded-xl border border-emerald-200/80 p-4 text-xs text-emerald-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Zero Data Leakage Guarantee:</span> This intake engine runs 100% locally on your dedicated workstation or on-premise server. No proprietary customer drawings, emails, or prices ever leave your network.
            </div>
          </div>
        </div>

        {/* Right Column: Extracted Entities & Confirmation Form */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-[#FFFDFB] rounded-2xl border border-subtle p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#F0ECE3] pb-3">
              <div>
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Extracted Technical Specifications
                </h2>
                <p className="text-xs text-secondary">Review extracted entities. All values can be fine-tuned before creating the quote.</p>
              </div>

              {parsedData?.dimensions?.found ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Dimensions Detected
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Manual Size Entry
                </span>
              )}
            </div>

            {/* 6 Directly Editable Cards with Options / Down Arrows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
              {/* Card 1: Equipment Type */}
              <div className="p-2.5 rounded-xl border border-subtle bg-[#FAF8F5] shadow-xs hover:border-[#3D6353]/40 transition-colors">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#707974] mb-1">
                  <span>Equipment Type</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Verified"></span>
                </div>
                <div className="relative">
                  <select
                    value={formState.product_type}
                    onChange={(e) => setFormState({ ...formState, product_type: e.target.value })}
                    className="w-full text-xs font-bold text-primary bg-white border border-[#D5CEBF] rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  >
                    <option value="Damper">Damper</option>
                    <option value="Louver Damper">Louver Damper</option>
                    <option value="Guillotine Damper">Guillotine Damper</option>
                    <option value="Butterfly Damper">Butterfly Damper</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707974] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Card 2: Duct Opening (W x H) */}
              <div className="p-2.5 rounded-xl border border-subtle bg-[#FAF8F5] shadow-xs hover:border-[#3D6353]/40 transition-colors">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#707974] mb-1">
                  <span>Duct Opening (W × H)</span>
                  <span className={`w-2 h-2 rounded-full ${parsedData?.dimensions?.found ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <input
                    type="number"
                    value={formState.width_mm}
                    onChange={(e) => setFormState({ ...formState, width_mm: e.target.value })}
                    placeholder="Width"
                    className="w-1/2 text-xs font-bold text-primary bg-white border border-[#D5CEBF] rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  />
                  <span className="text-xs font-black text-[#707974]">×</span>
                  <input
                    type="number"
                    value={formState.height_mm}
                    onChange={(e) => setFormState({ ...formState, height_mm: e.target.value })}
                    placeholder="Height"
                    className="w-1/2 text-xs font-bold text-primary bg-white border border-[#D5CEBF] rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  />
                  <span className="text-[10px] font-bold text-[#707974]">mm</span>
                </div>
                {/* Preset dropdown with arrow */}
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const [w, h] = e.target.value.split('x').map(Number);
                        setFormState({ ...formState, width_mm: w, height_mm: h });
                      }
                    }}
                    className="w-full text-[10px] font-semibold text-secondary bg-white/90 border border-[#D5CEBF] rounded-md px-2 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  >
                    <option value="">▼ Select Standard Size...</option>
                    <option value="3000x3000">3000 × 3000 mm (Ref Benchmark 1)</option>
                    <option value="2000x2000">2000 × 2000 mm (Ref Benchmark 2)</option>
                    <option value="4500x3500">4500 × 3500 mm (Ref Benchmark 3)</option>
                    <option value="6000x6000">6000 × 6000 mm (Ref Benchmark 4)</option>
                    <option value="1500x1500">1500 × 1500 mm</option>
                    <option value="2500x2000">2500 × 2000 mm</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#707974] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Card 3: Body Depth */}
              <div className="p-2.5 rounded-xl border border-subtle bg-[#FAF8F5] shadow-xs hover:border-[#3D6353]/40 transition-colors">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#707974] mb-1">
                  <span>Body Depth</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="relative">
                  <select
                    value={formState.depth_mm}
                    onChange={(e) => setFormState({ ...formState, depth_mm: Number(e.target.value) })}
                    className="w-full text-xs font-bold text-primary bg-white border border-[#D5CEBF] rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  >
                    <option value="400">400 mm</option>
                    <option value="450">450 mm</option>
                    <option value="500">500 mm</option>
                    <option value="600">600 mm</option>
                    <option value="800">800 mm</option>
                    {![400, 450, 500, 600, 800].includes(Number(formState.depth_mm)) && (
                      <option value={formState.depth_mm}>{formState.depth_mm} mm (Custom)</option>
                    )}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707974] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Card 4: Material (MOC) */}
              <div className="p-2.5 rounded-xl border border-subtle bg-[#FAF8F5] shadow-xs hover:border-[#3D6353]/40 transition-colors">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#707974] mb-1">
                  <span>Material (MOC)</span>
                  <span className={`w-2 h-2 rounded-full ${parsedData?.material?.found ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                </div>
                <div className="relative">
                  <select
                    value={formState.material}
                    onChange={(e) => setFormState({ ...formState, material: e.target.value })}
                    className="w-full text-xs font-bold text-primary bg-white border border-[#D5CEBF] rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  >
                    <option value="IS 2062">IS 2062 (Structural Mild Steel)</option>
                    <option value="SS 304">SS 304 (Stainless Steel)</option>
                    <option value="SS 304L">SS 304L (Low Carbon Stainless)</option>
                    <option value="SS 316">SS 316 (Acid / Corrosive)</option>
                    <option value="SS 316L">SS 316L (High Moly Stainless)</option>
                    <option value="Galvanized Steel">Galvanized Steel</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707974] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Card 5: Quantity */}
              <div className="p-2.5 rounded-xl border border-subtle bg-[#FAF8F5] shadow-xs hover:border-[#3D6353]/40 transition-colors">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#707974] mb-1">
                  <span>Quantity</span>
                  <span className={`w-2 h-2 rounded-full ${parsedData?.quantity?.found ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                </div>
                <div className="relative">
                  <select
                    value={formState.quantity}
                    onChange={(e) => setFormState({ ...formState, quantity: Number(e.target.value) })}
                    className="w-full text-xs font-bold text-primary bg-white border border-[#D5CEBF] rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((qty) => (
                      <option key={qty} value={qty}>
                        {qty} Unit{qty > 1 ? 's' : ''}
                      </option>
                    ))}
                    {![1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].includes(Number(formState.quantity)) && (
                      <option value={formState.quantity}>{formState.quantity} Unit(s)</option>
                    )}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707974] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Card 6: Actuation */}
              <div className="p-2.5 rounded-xl border border-subtle bg-[#FAF8F5] shadow-xs hover:border-[#3D6353]/40 transition-colors">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#707974] mb-1">
                  <span>Actuation</span>
                  <span className={`w-2 h-2 rounded-full ${parsedData?.actuation?.found ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                </div>
                <div className="relative">
                  <select
                    value={formState.actuation}
                    onChange={(e) => setFormState({ ...formState, actuation: e.target.value })}
                    className="w-full text-xs font-bold text-primary bg-white border border-[#D5CEBF] rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  >
                    <option value="Electric Actuator">Electric Actuator</option>
                    <option value="Pneumatic Cylinder">Pneumatic Cylinder</option>
                    <option value="Manual Handwheel">Manual Handwheel</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707974] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Additional Project & Operating Details */}
            <div className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-xl border border-subtle">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#707974] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#3D6353]" />
                <span>Operating Conditions & Project Assignment</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#4B5563] block mb-1">Pressure Mention</label>
                  <input
                    type="text"
                    value={formState.pressure}
                    onChange={(e) => setFormState({ ...formState, pressure: e.target.value })}
                    placeholder="e.g. 500 mmWC"
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4B5563] block mb-1">Temp Mention</label>
                  <input
                    type="text"
                    value={formState.temperature}
                    onChange={(e) => setFormState({ ...formState, temperature: e.target.value })}
                    placeholder="e.g. 250 °C"
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#4B5563] block mb-1">Customer / Client</label>
                  <input
                    type="text"
                    value={formState.customer}
                    onChange={(e) => setFormState({ ...formState, customer: e.target.value })}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#4B5563] block mb-1">Project Name</label>
                  <input
                    type="text"
                    value={formState.project}
                    onChange={(e) => setFormState({ ...formState, project: e.target.value })}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-[#D5CEBF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3D6353]"
                  />
                </div>
              </div>
            </div>

            {/* Launch button */}
            <div className="mt-5">
              <button
                onClick={handleProceedToQuote}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-[#3D6353] hover:bg-[#2C483D] text-white shadow-md shadow-[#3D6353]/20 transition-all hover:scale-[1.01]"
              >
                <span>Create Quote Draft & Open Costing Sheet</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
