"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { operationsService, patientService } from '@/services/api';
import { 
  Activity, ArrowLeft, BarChart3, ClipboardCheck, FileText, 
  ShieldCheck, Zap, Loader2,困, CheckCircle2, AlertCircle, Search,
  Briefcase, Landmark, ShieldAlert, Cpu
} from 'lucide-react';

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState('coding');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [toast, setToast] = useState({ message: '', type: null });
  const router = useRouter();

  // Medical Coding State
  const [codingNote, setCodingNote] = useState('');
  const [codingResult, setCodingResult] = useState(null);

  // Adjudication State
  const [claimData, setClaimData] = useState({
    patient_id: '',
    diagnosis_codes: '',
    procedure_codes: '',
    authorization: 'No',
    total_claimed_amount: ''
  });
  const [policyRef, setPolicyRef] = useState('BlueCross v4.1');
  const [adjudicationResult, setAdjudicationResult] = useState(null);

  // Prior Auth State
  const [selectedPatient, setSelectedPatient] = useState('');
  const [requestedService, setRequestedService] = useState('');
  const [justification, setJustification] = useState('');
  const [authResult, setAuthResult] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await patientService.getPatients();
      setPatients(data);
    } catch (err) {
      console.error("Failed to fetch patients", err);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  const runMedicalCoding = async () => {
    if (!codingNote) return;
    setLoading(true);
    try {
      const res = await operationsService.medicalCoding(codingNote);
      setCodingResult(res);
      showToast("Clinical notes encoded successfully.");
    } catch (err) {
      showToast("Coding analysis failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const runAdjudication = async () => {
    if (!claimData.patient_id || !claimData.diagnosis_codes || !claimData.procedure_codes) {
      showToast("Please fill in all clinical fields.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await operationsService.adjudicateClaim({
        ...claimData,
        diagnosis_codes: claimData.diagnosis_codes.split(',').map(s => s.trim()),
        procedure_codes: claimData.procedure_codes.split(',').map(s => s.trim()),
        total_claimed_amount: parseFloat(claimData.total_claimed_amount) || 0,
        policy_reference: policyRef
      });
      setAdjudicationResult(res);
      showToast("Claim adjudication complete.");
    } catch (err) {
      showToast("Adjudication failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const runPriorAuth = async () => {
    if (!selectedPatient || !requestedService) return;
    setLoading(true);
    try {
      const res = await operationsService.priorAuth(selectedPatient, requestedService, justification);
      setAuthResult(res);
      showToast("Prior Authorization request processed.");
    } catch (err) {
      showToast("Auth request failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative pb-20">
      <div className="absolute inset-0 medical-subtle-dot opacity-40 pointer-events-none" />

      {/* Navigation Header */}
      <nav className="clinical-header sticky top-0 px-8 py-3 flex justify-between items-center shadow-sm z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Briefcase size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Operations Hub</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8 relative z-10">
        <header className="mb-12">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Healthcare Ops Agents</h2>
          <p className="text-slate-500 font-medium text-lg">Automate administrative workflows with verifiable AI reasoning.</p>
        </header>

        {/* Tab Controls */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-[2rem] border border-slate-200 w-fit mb-10 overflow-hidden shadow-inner">
          {[
            { id: 'coding', name: 'Medical Coding', icon: <Cpu size={16} /> },
            { id: 'claims', name: 'Claims Adjudication', icon: <Landmark size={16} /> },
            { id: 'auth', name: 'Prior Authorization', icon: <ShieldCheck size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 translate-y-[-1px]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Input Section */}
          <div className="lg:col-span-5 space-y-8">
            <div className="clinical-card p-8">
              {activeTab === 'coding' && (
                <div className="space-y-6">
                  <div>
                    <label className="medical-label block mb-3">Clinical Note / Transcription</label>
                    <textarea
                      value={codingNote}
                      onChange={(e) => setCodingNote(e.target.value)}
                      placeholder="Paste clinical findings, symptoms, and procedures here..."
                      className="w-full h-64 px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none font-medium leading-relaxed"
                    />
                  </div>
                  <button
                    onClick={runMedicalCoding}
                    disabled={loading || !codingNote}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                    Extract Codes
                  </button>
                </div>
              )}

              {activeTab === 'claims' && (
                <div className="space-y-6">
                  <div>
                    <label className="medical-label block mb-3">Select Patient</label>
                    <select
                      value={claimData.patient_id}
                      onChange={(e) => setClaimData({ ...claimData, patient_id: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none border-t-4 border-emerald-600"
                    >
                      <option value="">Choose Patient...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (PATIENT_{p.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="medical-label block mb-3">Diagnosis Codes</label>
                      <input
                        type="text"
                        placeholder="ICD-10 (e.g. M54.5, E11.9)"
                        value={claimData.diagnosis_codes}
                        onChange={(e) => setClaimData({ ...claimData, diagnosis_codes: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="medical-label block mb-3">Procedure Codes</label>
                      <input
                        type="text"
                        placeholder="CPT (e.g. 99213, 72148)"
                        value={claimData.procedure_codes}
                        onChange={(e) => setClaimData({ ...claimData, procedure_codes: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="medical-label block mb-3">Authorization</label>
                      <select
                        value={claimData.authorization}
                        onChange={(e) => setClaimData({ ...claimData, authorization: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="medical-label block mb-3">Claimed Amount (Rs.)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={claimData.total_claimed_amount}
                        onChange={(e) => setClaimData({ ...claimData, total_claimed_amount: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="medical-label block mb-3">Payer Policy Reference</label>
                    <input
                      type="text"
                      value={policyRef}
                      onChange={(e) => setPolicyRef(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700"
                    />
                  </div>
                  <button
                    onClick={runAdjudication}
                    disabled={loading || !claimData.patient_id}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-100 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ClipboardCheck size={20} />}
                    Adjudicate Claim
                  </button>
                </div>
              )}

              {activeTab === 'auth' && (
                <div className="space-y-6">
                   <div>
                    <label className="medical-label block mb-3">Select Patient</label>
                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none border-t-4 border-indigo-600"
                    >
                      <option value="">Choose Patient...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (PATIENT_{p.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="medical-label block mb-3">Requested Service / Procedure</label>
                    <input
                      type="text"
                      value={requestedService}
                      onChange={(e) => setRequestedService(e.target.value)}
                      placeholder="e.g. MRI Lumbar Spine, Specialty Referral"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="medical-label block mb-3">Clinical Justification</label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Why is this procedure necessary?"
                      className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                    />
                  </div>
                  <button
                    onClick={runPriorAuth}
                    disabled={loading || !selectedPatient || !requestedService}
                    className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldAlert size={20} />}
                    Submit Auth Request
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7">
            <div className="clinical-card p-8 h-full min-h-[600px] flex flex-col bg-white/40 backdrop-blur-md">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <BarChart3 size={20} />
                   </div>
                   <h3 className="text-xl font-black text-slate-900">Agent Analysis Output</h3>
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Processing Reasoning...</span>
                  </div>
                )}
              </div>

              {!loading && !codingResult && !adjudicationResult && !authResult && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                      <FileText size={40} />
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-1">Waiting for data</h4>
                      <p className="text-slate-300 text-sm max-w-[240px]">Configure your parameters and run the agent to see auditable reasoning.</p>
                   </div>
                </div>
              )}

              {/* Coding Result UI */}
              {activeTab === 'coding' && codingResult && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 gap-4">
                    {codingResult.codes.map((c, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                         <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm">
                            {c.type}
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-900">{c.code}</p>
                            <p className="text-xs font-medium text-slate-500">{c.description}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="medical-label block mb-3 text-indigo-600 flex items-center gap-2">
                      <ShieldCheck size={14} /> Auditable Reasoning
                    </label>
                    <div className="p-6 bg-slate-900 text-slate-100 rounded-3xl font-mono text-xs leading-relaxed border-l-4 border-indigo-500 shadow-2xl">
                      {codingResult.reasoning}
                    </div>
                  </div>
                </div>
              )}

              {/* Adjudication Result UI */}
              {activeTab === 'claims' && adjudicationResult && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className={`p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center ${
                      adjudicationResult.status.includes('Approved') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                      adjudicationResult.status.includes('Rejected') ? 'bg-red-50 text-red-700 border border-red-100' : 
                      'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}>
                    <h4 className="text-2xl font-black tracking-tight">{adjudicationResult.status}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-2 bg-white/50 px-3 py-1 rounded-full">Final Adjudication Decision</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Allowed Amount</p>
                      <div className="text-xl font-black text-slate-900">Rs. {Math.round(adjudicationResult.allowed_amount)}</div>
                    </div>
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl shadow-sm text-center">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ins. Payable</p>
                      <div className="text-xl font-black text-indigo-600">Rs. {Math.round(adjudicationResult.insurance_payable)}</div>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl shadow-sm text-center">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Patient Resp.</p>
                      <div className="text-xl font-black text-amber-600">Rs. {Math.round(adjudicationResult.patient_responsibility)}</div>
                    </div>
                  </div>

                  <div>
                     <label className="medical-label block mb-3 text-slate-600">Decision Remarks & Audit</label>
                     <div className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 whitespace-pre-wrap">
                        {adjudicationResult.remarks}
                     </div>
                  </div>
                </div>
              )}

              {/* Auth Result UI */}
              {activeTab === 'auth' && authResult && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className={`p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center ${
                      authResult.status === 'AUTHORIZED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                      authResult.status === 'DENIED' ? 'bg-red-50 text-red-700 border border-red-100' : 
                      'bg-slate-50 text-slate-700 border border-slate-200'
                   }`}>
                      {authResult.status === 'AUTHORIZED' ? <CheckCircle2 size={48} className="mb-4" /> : <AlertCircle size={48} className="mb-4" />}
                      <h4 className="text-2xl font-black tracking-tight">{authResult.status}</h4>
                      {authResult.auth_number && (
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2 bg-white/50 px-3 py-1 rounded-full">ID: {authResult.auth_number}</p>
                      )}
                   </div>

                   <div>
                      <label className="medical-label block mb-3">Clinical Rationale</label>
                      <p className="text-sm font-medium leading-relaxed text-slate-600">
                        {authResult.reasoning}
                      </p>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Criteria Met</span>
                         <div className="space-y-2">
                            {authResult.criteria_met.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                <CheckCircle2 size={12} className="text-emerald-500" /> {c}
                              </div>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-3">
                         <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Criteria Failed</span>
                         <div className="space-y-2">
                            {authResult.criteria_failed.length > 0 ? authResult.criteria_failed.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                <AlertCircle size={12} className="text-red-500" /> {c}
                              </div>
                            )) : <p className="text-[10px] font-medium text-slate-300 italic">None</p>}
                         </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast.message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom duration-300 flex items-center gap-3 ${
          toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="text-sm font-bold uppercase tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
