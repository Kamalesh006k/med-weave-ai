"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { consultationService, patientService } from '@/services/api';
import { AlertCircle, CheckCircle2, Info, Send, User, Brain, ArrowLeft, History } from 'lucide-react';

export default function ConsultationRoom() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const patients = await patientService.getPatients();
      const p = patients.find(p => p.id == id);
      setPatient(p);

      const h = await consultationService.getHistory(id);
      setHistory(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const result = await consultationService.analyze(id, transcript);
      setAnalysis(result.ai_analysis);
      fetchPatientData(); // Refresh history
    } catch (err) {
      alert('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return <div className="p-20 text-center text-slate-500">Loading patient profile...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-slate-800 rounded-full transition-all">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
              <div className="w-10 h-10 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400">
                <User size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-100">{patient.name}</h2>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Active Consultation</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500 font-medium">ALLERGIES</p>
              <p className="text-sm text-red-400 font-bold">{patient.allergies || "None Reported"}</p>
            </div>
            <div className="text-right border-l border-slate-800 pl-4 hidden sm:block">
              <p className="text-xs text-slate-500 font-medium">LAST MEDICATION</p>
              <p className="text-sm text-blue-400 font-bold">{patient.medications || "None"}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Input & Transcript */}
        <div className="lg:col-span-7 border-r border-slate-900 flex flex-col p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          <div className="mb-6">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 block">Live Input Feed</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Start typing or simulate patient conversation here..."
              className="w-full h-48 bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none shadow-inner"
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={loading || !transcript}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shadow-lg ${loading ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}
              >
                {loading ? 'Running AI Diagnostics...' : <><Brain size={20} /> Analyze Consultation</>}
              </button>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <History size={16} /> Clinical Session History
            </h3>
            <div className="space-y-4">
              {history.length === 0 && <p className="text-slate-600 italic">No previous sessions found.</p>}
              {history.map((session, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3 text-sm text-slate-400">
                  <p className="mb-1 text-slate-500 text-[10px] uppercase font-bold">{new Date(session.created_at).toLocaleString()}</p>
                  <p className="line-clamp-2">{session.transcript}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis Output */}
        <div className="lg:col-span-5 bg-slate-900/30 p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          <label className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6 block border-b border-blue-900/30 pb-2">MedWeave Intelligence Output</label>

          {!analysis && !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Brain size={48} className="text-slate-800 mb-4" />
              <p className="text-slate-500">Awaiting consultation data for AI cross-referencing.</p>
            </div>
          )}

          {loading && (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-slate-800 rounded-lg"></div>
              <div className="h-32 bg-slate-800 rounded-lg"></div>
              <div className="h-24 bg-slate-800 rounded-lg"></div>
            </div>
          )}

          {analysis && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              {/* Alerts Secion */}
              <div>
                <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-400" /> Critical Alerts
                </h4>
                <div className="space-y-2">
                  {analysis.alerts.map((alert, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border flex gap-3 ${alert.severity === 'HIGH' ? 'bg-red-500/10 border-red-500/20 text-red-200' :
                        alert.severity === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200' :
                          'bg-blue-500/10 border-blue-500/20 text-blue-200'
                      }`}>
                      <Info size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase mb-1">{alert.type}</p>
                        <p className="text-sm">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                  {analysis.alerts.length === 0 && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-2 text-sm">
                      <CheckCircle2 size={18} /> No immediate risks detected.
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-sm font-bold text-slate-300 mb-2">Clinical Summary</h4>
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 text-sm leading-relaxed text-slate-200">
                  {analysis.summary}
                </div>
              </div>

              {/* Patient Friendly Explanation */}
              <div>
                <h4 className="text-sm font-bold text-slate-300 mb-2">Patient-Friendly Explanation</h4>
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 text-sm text-slate-400 italic">
                  "{analysis.patient_explanation}"
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
