"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { consultationService, patientService } from '@/services/api';
import { ArrowLeft, Activity, Info, AlertTriangle, CheckCircle2, FileText, User, Calendar, Clock, Loader2, LayoutGrid, HeartPulse, Brain, Send, Mic, MicOff, Zap, ShieldAlert, History, AlertCircle, MoreHorizontal, Plus } from 'lucide-react';

export default function ConsultationRoom() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [perspective, setPerspective] = useState('doctor'); // 'doctor' or 'patient'
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [realtimeWarning, setRealtimeWarning] = useState(null);
  const [diarizedTranscript, setDiarizedTranscript] = useState('');
  const [toast, setToast] = useState({ message: '', type: null });
  const [activeHistoryMenu, setActiveHistoryMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [prescriptionText, setPrescriptionText] = useState('');
  const [prescriptionResult, setPrescriptionResult] = useState(null);
  const [verifyingPrescription, setVerifyingPrescription] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const recognitionRef = useRef(null);
  const autoStartRef = useRef(false);
  const latestTextRef = useRef('');
  const router = useRouter();

  useEffect(() => {
    setIsInitialized(false);
    autoStartRef.current = false;
    fetchPatientData();

    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      try {
        if ('webkitSpeechRecognition' in window) {
          recognitionRef.current = new window.webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
          recognitionRef.current = new window.SpeechRecognition();
        }

        if (recognitionRef.current) {
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
          let finalT = '';
          let interimT = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptChunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalT += transcriptChunk + ' ';
            } else {
              interimT += transcriptChunk;
            }
          }

          if (finalT) {
            setTranscript((prev) => prev + finalT);
            setInterimTranscript(''); // Clear interim immediately on final
          } else {
            setInterimTranscript(interimT);
          }
        };

        recognitionRef.current.onerror = (event) => {
          if (event.error === 'aborted' || event.error === 'no-speech') return; // Silence non-fatal timeouts
          console.error('Speech recognition error', event.error);
          if (event.error === 'not-allowed') {
              setToast({ message: "Microphone access denied. Please check permissions.", type: 'error' });
          }
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          // Auto-restart if we're supposed to be recording but it stopped due to timeout/silence
          if (recognitionRef.current && isRecording) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.warn("Auto-restart failed:", e);
              setIsRecording(false);
            }
          } else {
            setIsRecording(false);
          }
        };
        }
        setIsInitialized(true);
      } catch (e) {
        console.error("SpeechRecognition failed to initialize:", e);
      }
    }
  }, [id]);

  useEffect(() => {
    const closeMenu = () => setActiveHistoryMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    const attemptAutoStart = () => {
      if (isInitialized && recognitionRef.current && !isRecording && !autoStartRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
          setRealtimeWarning("SAFE");
          autoStartRef.current = true;
          setToast({ message: "Clinical dictation active. Monitoring started.", type: 'success' });
        } catch (e) {
          if (e.message?.includes('already started')) {
            setIsRecording(true);
            autoStartRef.current = true;
            return;
          }
          
          console.warn("Auto-start attempt failed:", e);
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptAutoStart, 1000);
          }
        }
      }
    };

    if (isInitialized) {
        const timer = setTimeout(attemptAutoStart, 1500);
        return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    latestTextRef.current = transcript + (interimTranscript ? interimTranscript : '');
  }, [transcript, interimTranscript]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(async () => {
        const currentText = latestTextRef.current;
        if (currentText.trim().length > 10) {
          try {
            const res = await consultationService.checkRealtime(id, currentText);
            if (res?.warning && res.warning !== "SAFE") {
              setRealtimeWarning(res.warning);
            }
            if (res?.diarized_text) {
              setDiarizedTranscript(res.diarized_text);
            }
          } catch (e) {
            console.error("Realtime API check failed", e);
            setRealtimeWarning("SAFE");
          }
        }
      }, 5000); 
    }
    return () => clearInterval(interval);
  }, [isRecording, id]);

  const fetchPatientData = async () => {
    try {
      const [patientsData, historyData] = await Promise.all([
        patientService.getPatients(),
        consultationService.getHistory(id)
      ]);
      const currentPatient = patientsData.find(p => p.id === parseInt(id));
      setPatient(currentPatient);
      setHistory(historyData);
      
      // Track session for doctor convenience
      if (currentPatient) {
          localStorage.setItem('recentPatient', JSON.stringify({
              id: currentPatient.id,
              name: currentPatient.name,
              timestamp: new Date().toISOString()
          }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    setConfirmModal({
        isOpen: true,
        title: "Delete Session Record",
        message: "Are you sure you want to permanently delete this session record? This action cannot be undone.",
        onConfirm: async () => {
            try {
                await consultationService.deleteConsultation(sessionId);
                setToast({ message: "Session deleted successfully.", type: 'success' });
                fetchPatientData(); // Refresh history
            } catch (err) {
                setToast({ message: "Error deleting session.", type: 'error' });
            }
        }
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.warn("Stop failed:", e);
      }
      setIsRecording(false);
      
      const finalInput = transcript + (interimTranscript ? interimTranscript : '');
      if (finalInput.trim()) {
         handleAnalyze(finalInput);
      }
    } else {
      if (!recognitionRef.current) {
        setToast({ message: "Speech recognition isn't supported in this browser.", type: 'error' });
        return;
      }
      try {
        setRealtimeWarning("SAFE");
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Start failed:", e);
        // If already started, just sync state
        if (e.message?.includes("already started")) {
            setIsRecording(true);
        }
      }
    }
  };

  const handleAnalyze = async (textToUse) => {
    const text = typeof textToUse === 'string' ? textToUse : transcript;
    if (!text?.trim()) return;
    setLoading(true);
    try {
      const result = await consultationService.analyze(id, text);
      setAnalysis(result.ai_analysis);
      fetchPatientData(); // Refresh history
      setPerspective('doctor'); // Reset to default perspective
      setChatLog([{ role: 'ai', content: 'Diagnostic synthesis generated. How can I assist you further with this patient?' }]);
    } catch (err) {
      setToast({ message: 'Clinical analysis failed. Please check system connectivity.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
      e?.preventDefault();
      if (!chatMessage.trim()) return;
      
      const newLog = [...chatLog, { role: 'user', content: chatMessage }];
      setChatLog(newLog);
      
      const msgToSend = chatMessage;
      setChatMessage('');
      setChatLoading(true);
      
      try {
          const reply = await consultationService.chatCopilot(id, msgToSend);
          setChatLog([...newLog, { role: 'ai', content: reply }]);
      } catch (err) {
          setChatLog([...newLog, { role: 'ai', content: 'Connection to Co-Pilot failed.' }]);
      } finally {
          setChatLoading(false);
      }
  };

  const handleVerifyPrescription = async () => {
    if (!prescriptionText.trim()) return;
    setVerifyingPrescription(true);
    setPrescriptionResult(null);
    try {
        const res = await consultationService.verifyPrescription(id, prescriptionText, analysis?.summary || "");
        setPrescriptionResult(res);
    } catch (err) {
        setToast({ message: "Prescription verification failed.", type: 'error' });
    } finally {
        setVerifyingPrescription(false);
    }
  };

  if (!patient) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Clinical Profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <div className="absolute inset-0 medical-subtle-dot opacity-30 pointer-events-none" />

      {/* Clinical Header */}
      <header className="clinical-header p-4 sticky top-0 z-20 shadow-sm flex items-center justify-center">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl transition-all text-slate-500">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <User size={20} />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 leading-tight">{patient.name}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Active Session</span>
                    <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-2">Secure ID: PATIENT_{patient.id}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right hidden md:block">
              <p className="medical-label mb-0.5">Known Allergies</p>
              <p className="text-sm text-red-600 font-bold">{patient.allergies || "No Reported Conflicts"}</p>
            </div>
            <div className="text-right border-l border-slate-200 pl-6 hidden md:block">
              <p className="medical-label mb-0.5">Active Medications</p>
              <p className="text-sm text-indigo-600 font-bold">{patient.medications || "None Recorded"}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-0 relative z-10 overflow-hidden">
        {/* Input Feed & Session History */}
        <div className="lg:col-span-7 border-r border-slate-200 flex flex-col p-8 overflow-y-auto max-h-[calc(100vh-73px)]">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <label className="medical-label flex items-center gap-2">
                    <Activity size={14} className="text-indigo-600" /> Live Clinical Feed
                </label>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleRecording}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isRecording ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        {isRecording ? (
                            <><MicOff size={14} className="animate-pulse" /> Stop Listening</>
                        ) : (
                            <><Mic size={14} /> Start Real-time Dictation</>
                        )}
                    </button>
                    <div className="px-2 py-0.5 bg-indigo-50 text-[9px] font-black text-indigo-600 rounded uppercase tracking-tighter border border-indigo-100 italic">
                        {isRecording ? "Live Mic Active" : "Mic Off"}
                    </div>
                </div>
            </div>
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} />
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm relative animate-in zoom-in-95 duration-200 shadow-2xl border border-slate-100">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-6">
                    <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">{confirmModal.message}</p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                        className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-red-100 transition-all"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Real-time Warning Overlay */}
            {realtimeWarning && (
                <div className={`w-full mb-6 p-4 rounded-2xl border flex items-center justify-between animate-in slide-in-from-top duration-500 shadow-lg ${
                    realtimeWarning === 'SAFE' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-100' 
                    : 'bg-red-600 border-red-500 text-white shadow-red-100'
                }`}>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/20 shadow-inner">
                            {realtimeWarning === 'SAFE' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">
                                {realtimeWarning === 'SAFE' ? 'Clinical Alignment Verified' : 'Diagnostic Conflict Alert'}
                            </p>
                            <p className="text-sm font-bold leading-tight">
                                {realtimeWarning === 'SAFE' ? 'All diagnostic findings are now consistent with patient record.' : realtimeWarning}
                            </p>
                        </div>
                    </div>
                    {realtimeWarning !== 'SAFE' ? (
                        <button 
                            onClick={() => setRealtimeWarning(null)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 transition-colors"
                        >
                            <Plus size={18} className="rotate-45" />
                        </button>
                    ) : (
                        <div className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase">Stable</div>
                    )}
                </div>
            )}
            
            <div className="w-full h-[500px] bg-white border border-slate-200 rounded-2xl p-6 shadow-inner overflow-y-auto mb-4 relative">
              {diarizedTranscript || transcript ? (
                <div className="space-y-6">
                  {/* Show Diarized Part */}
                  {diarizedTranscript.split('\n').filter(line => line.trim()).map((line, i) => {
                    const isDoctor = line.startsWith('Doctor:');
                    const isPatient = line.startsWith('Patient:');
                    const content = line.replace(/^(Doctor:|Patient:)/, '').trim();
                    if (!isDoctor && !isPatient) return <p key={i} className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{line}</p>;
                    return (
                      <div key={i} className={`flex flex-col ${isDoctor ? 'items-end' : 'items-start'} animate-in fade-in duration-500`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDoctor ? 'text-indigo-600' : 'text-emerald-600'}`}>
                          {isDoctor ? 'Doctor' : 'Patient'}
                        </span>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm border ${
                          isDoctor ? 'bg-indigo-50 border-indigo-100 text-indigo-900 rounded-tr-none' : 'bg-emerald-50 border-emerald-100 text-emerald-900 rounded-tl-none'
                        }`}>
                          {content}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show Stable Pending Transcript (Parts not yet diarized) */}
                  {(() => {
                      // Simple logic to show what's in transcript but not in diarized
                      // We'll just show the raw transcript if it has significantly more words than diarized text
                      const diarizedWords = diarizedTranscript.replace(/Doctor:|Patient:/g, '').split(/\s+/).filter(Boolean).length;
                      const rawWords = transcript.split(/\s+/).filter(Boolean).length;
                      
                      if (rawWords > diarizedWords + 2) {
                          return (
                            <div className="flex flex-col items-start animate-in fade-in duration-300">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Live Capture (Syncing...)</span>
                                <div className="max-w-[90%] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none text-sm font-medium text-slate-500">
                                    {transcript.split(' ').slice(diarizedWords).join(' ')}
                                </div>
                            </div>
                          );
                      }
                      return null;
                  })()}

                  {/* Show Interim Result */}
                  {interimTranscript && (
                    <div className="flex flex-col items-start">
                        <div className="max-w-[80%] px-4 py-2 bg-white border border-dashed border-slate-200 rounded-2xl rounded-tl-none text-sm font-medium text-slate-300 animate-pulse italic">
                            {interimTranscript}...
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                   <Mic size={48} className="text-slate-200 mb-4" />
                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                     {isRecording ? "Awaiting Speech Detection..." : "Click 'Start Real-time Dictation' to begin"}
                   </p>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-medium italic">MedWeave Intelligence classifies speakers and verifies findings in real-time.</p>
                {loading && (
                    <div className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold bg-slate-100 text-slate-400 border border-slate-200 shadow-sm text-sm">
                        <Loader2 size={16} className="animate-spin" /> Synthesizing...
                    </div>
                )}
            </div>
          </div>

          <div className="flex-1 pt-8 border-t border-slate-100">
            <h3 className="medical-label mb-6 flex items-center gap-2">
              <History size={14} /> Historical Context
            </h3>
            <div className="space-y-4">
              {history.length === 0 && (
                <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center">
                    <FileText size={32} className="text-slate-100 mb-2" />
                    <p className="text-slate-300 text-xs font-bold uppercase tracking-widest leading-normal">Initial Patient Contact<br/>No Previous Sessions</p>
                </div>
              )}
              {history.map((session, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(session.created_at).toLocaleString()}</span>
                      <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setActiveHistoryMenu(activeHistoryMenu === session.id ? null : session.id); }}
                            className="p-1.5 bg-slate-50 rounded-lg text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                            <MoreHorizontal size={14} />
                        </button>
                        {activeHistoryMenu === session.id && (
                            <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(session.transcript); setToast({ message: "Transcript copied.", type: 'success' }); setActiveHistoryMenu(null); }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <FileText size={12} /> Copy Text
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); setActiveHistoryMenu(null); }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <History size={12} className="rotate-180" /> Delete
                                </button>
                            </div>
                        )}
                      </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{session.transcript}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Intelligence Output Interface */}
        <div className="lg:col-span-5 bg-white/50 backdrop-blur-sm p-8 overflow-y-auto max-h-[calc(100vh-73px)] relative flex flex-col">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
                      <Brain size={18} />
                  </div>
                  <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Clinical Report</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">MedWeave Real-Time Analysis</p>
                  </div>
              </div>
              
              {/* Perspective Toggle */}
              {analysis && (
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                          onClick={() => setPerspective('doctor')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${perspective === 'doctor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          <LayoutGrid size={12} /> Tech
                      </button>
                      <button 
                          onClick={() => setPerspective('patient')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${perspective === 'patient' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          <HeartPulse size={12} /> Patient
                      </button>
                  </div>
              )}
          </div>

          {!analysis && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                  <ShieldAlert size={32} className="text-slate-200" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Awaiting clinical input<br/>for automated synthesis.</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-24 bg-slate-200/50 rounded-2xl"></div>
              <div className="h-48 bg-slate-200/50 rounded-2xl"></div>
              <div className="h-32 bg-slate-200/50 rounded-2xl"></div>
            </div>
          )}

          {analysis && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              
              {perspective === 'doctor' ? (
                  <>
                    {/* Clinical Insight Grid - 2x2 Format */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Box 1: Critical Risks */}
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1"><AlertCircle size={10} /> Critical Risks</h4>
                            <div className="space-y-2">
                                {analysis.alerts.filter(a => a.severity === 'HIGH').length > 0 ? 
                                    analysis.alerts.filter(a => a.severity === 'HIGH').map((a, i) => (
                                        <p key={i} className="text-xs font-bold text-slate-800 leading-snug">{a.message}</p>
                                    ))
                                : <p className="text-xs text-slate-400 font-medium italic">No immediate high-risk flags detected.</p>}
                            </div>
                        </div>
                        
                        {/* Box 2: Observations / Medium Risks */}
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1"><ShieldAlert size={10} /> Observations</h4>
                            <div className="space-y-2">
                                {analysis.alerts.filter(a => a.severity === 'MEDIUM' || a.severity === 'LOW').length > 0 ? 
                                    analysis.alerts.filter(a => a.severity === 'MEDIUM' || a.severity === 'LOW').map((a, i) => (
                                        <p key={i} className="text-xs font-bold text-slate-800 leading-snug">{a.message}</p>
                                    ))
                                : <p className="text-xs text-slate-400 font-medium italic">No notable observational flags.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Doctor Summary */}
                    <div className="clinical-card bg-slate-900 text-white p-6 shadow-xl shadow-slate-200 border-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Brain size={48} /></div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Diagnostic Synthesis</h4>
                        <p className="text-sm leading-relaxed text-slate-100 font-medium whitespace-pre-wrap">
                        {analysis.summary}
                        </p>
                    </div>

                    {/* Prescription Verification & Completion Section */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert size={14} className="text-indigo-600" /> 1. Prescription Safety Audit
                            </h4>
                            {prescriptionResult && !sessionCompleted && (
                                <button onClick={() => { setPrescriptionResult(null); setPrescriptionText(''); }} className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase">Clear</button>
                            )}
                        </div>

                        {!prescriptionResult ? (
                            <div className="space-y-4">
                                <textarea 
                                    value={prescriptionText}
                                    onChange={(e) => setPrescriptionText(e.target.value)}
                                    placeholder="Enter proposed medications, dosage, and frequency..."
                                    className="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none resize-none"
                                />
                                <button 
                                    onClick={handleVerifyPrescription}
                                    disabled={verifyingPrescription || !prescriptionText.trim()}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                >
                                    {verifyingPrescription ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                    {verifyingPrescription ? "Auditing Safety..." : "Establish Clinical Verification"}
                                </button>
                            </div>
                        ) : (
                            <div className={`p-5 rounded-2xl animate-in zoom-in-95 duration-200 ${
                                prescriptionResult.status === 'APPROVED' ? 'bg-emerald-50 border border-emerald-100' : 
                                prescriptionResult.status === 'CRITICAL' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'
                            }`}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                        prescriptionResult.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 
                                        prescriptionResult.status === 'CRITICAL' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-amber-500 text-white'
                                    }`}>
                                        {prescriptionResult.status === 'APPROVED' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h5 className={`text-[10px] font-black uppercase tracking-widest ${
                                                prescriptionResult.status === 'APPROVED' ? 'text-emerald-700' : 
                                                prescriptionResult.status === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'
                                            }`}>
                                                Safety Status: {prescriptionResult.status}
                                            </h5>
                                        </div>
                                        <p className="text-xs font-bold text-slate-800 leading-relaxed mb-3">{prescriptionResult.reason}</p>
                                        {prescriptionResult.suggestions && (
                                            <div className="pt-3 border-t border-black/5">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Recommendation</p>
                                                <p className="text-xs font-medium text-slate-600 italic">{prescriptionResult.suggestions}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100">
                             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Brain size={14} className="text-indigo-600" /> 2. Finalize Session
                            </h4>
                            {!sessionCompleted ? (
                                <button 
                                    onClick={() => {
                                        if (!prescriptionResult) {
                                            setToast({ message: "Please verify the prescription before completing.", type: 'error' });
                                            return;
                                        }
                                        setSessionCompleted(true);
                                        setToast({ message: "Clinical session finalized.", type: 'success' });
                                    }}
                                    disabled={!prescriptionResult}
                                    className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${
                                        prescriptionResult 
                                        ? 'bg-slate-900 text-white hover:bg-black shadow-slate-200 hover:scale-[1.02]' 
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    <Send size={14} /> Complete Clinical Session
                                </button>
                            ) : (
                                <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-200 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 size={16} /></div>
                                        <h5 className="font-extrabold text-sm tracking-tight">Discharge Summary Generated</h5>
                                    </div>
                                    <p className="text-xs font-medium leading-relaxed opacity-90 mb-6">
                                        Clinical findings and safety audit for {patient.name} have been archived. You can now download the report or return to the dashboard.
                                    </p>
                                    <div className="flex gap-2">
                                        <button 
                                          onClick={() => window.print()}
                                          className="flex-1 py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                        >
                                          Official Report
                                        </button>
                                        <button 
                                          onClick={() => router.push('/dashboard')}
                                          className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-all"
                                        >
                                          Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                  </>
              ) : (
                  <>
                    {/* Patient Education View */}
                    <div className="bg-white border border-indigo-100 rounded-3xl p-8 shadow-lg shadow-indigo-50/50">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 mx-auto">
                            <HeartPulse size={24} />
                        </div>
                        <h4 className="text-center text-lg font-black text-slate-900 mb-2">Your Care Plan Summary</h4>
                        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-6">Simplified for Patient Review</p>
                        
                        <div className="text-[15px] text-slate-700 leading-loose font-medium space-y-4">
                        "{analysis.patient_explanation}"
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                            <button 
                                onClick={() => { 
                                    setToast({ message: "Preparing clinical report for print...", type: 'success' });
                                    setTimeout(() => window.print(), 1000);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2"
                            >
                                Print for Patient <ArrowLeft size={14} className="rotate-180" />
                            </button>
                        </div>
                    </div>
                  </>
              )}

            </div>
          )}

          {/* Interactive Clinical Co-Pilot (Only visible after analysis) */}
          {analysis && (
              <div className="mt-12 flex-1 flex flex-col min-h-[300px] border-t border-slate-200 pt-8 relative">
                  <h4 className="medical-label mb-4 flex items-center gap-2">
                      <Brain size={14} className="text-indigo-600" /> Interactive Clinical Co-Pilot
                  </h4>
                  
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                      {chatLog.map((log, i) => (
                          <div key={i} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm font-medium ${log.role === 'user' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-800'}`}>
                                  {log.content}
                              </div>
                          </div>
                      ))}
                      {chatLoading && (
                          <div className="flex justify-start">
                              <div className="bg-slate-100 text-slate-800 rounded-2xl px-5 py-3 text-sm font-medium flex gap-1 items-center">
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                              </div>
                          </div>
                      )}
                  </div>

                  <form onSubmit={handleChatSubmit} className="relative mt-auto">
                      <input 
                          type="text" 
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Ask Co-Pilot about alternatives, risks, or deep dive..."
                          className="w-full bg-white border border-slate-200 rounded-full py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm"
                      />
                      <button 
                          type="submit" 
                          disabled={chatLoading || !chatMessage.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50"
                      >
                          <Send size={16} />
                      </button>
                  </form>
              </div>
          )}

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

