"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { consultationService, patientService } from '@/services/api';
import { ArrowLeft, Activity, Info, AlertTriangle, CheckCircle2, FileText, User, Calendar, Clock, Loader2, LayoutGrid, HeartPulse, Brain, Send, Mic, MicOff, Zap, ShieldAlert, History, AlertCircle, MoreHorizontal } from 'lucide-react';

export default function ConsultationRoom() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [perspective, setPerspective] = useState('physician'); // 'physician' or 'patient'
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [realtimeWarning, setRealtimeWarning] = useState(null);
  const recognitionRef = useRef(null);
  const latestTextRef = useRef('');
  const router = useRouter();

  useEffect(() => {
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
            if (event.results[i].isFinal) {
              finalT += event.results[i][0].transcript + ' ';
            } else {
              interimT += event.results[i][0].transcript;
            }
          }
          if (finalT) {
             setTranscript((prev) => prev + finalT);
          }
          setInterimTranscript(interimT);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
        }
      } catch (e) {
        console.error("SpeechRecognition failed to initialize:", e);
      }
    }
  }, [id]);

  useEffect(() => {
    latestTextRef.current = transcript + (interimTranscript ? interimTranscript : '');
  }, [transcript, interimTranscript]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(async () => {
        const currentText = latestTextRef.current;
        if (currentText.trim().length > 15) {
          try {
            const res = await consultationService.checkRealtime(id, currentText);
            if (res?.is_dangerous) {
              setRealtimeWarning(res.warning_message);
            } else {
              setRealtimeWarning("SAFE");
            }
          } catch (e) {
            console.error("Realtime API check failed", e);
            setRealtimeWarning("SAFE");
          }
        }
      }, 4000); // Check every 4 seconds during active dictation
    } else {
      setRealtimeWarning(null);
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
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      
      const finalInput = transcript + (interimTranscript ? interimTranscript : '');
      if (finalInput.trim()) {
         handleAnalyze(finalInput);
      }
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition isn't supported in this browser. Please try Chrome, Edge, or Safari.");
        return;
      }
      recognitionRef.current.start();
      setIsRecording(true);
      setRealtimeWarning("SAFE");
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
      setPerspective('physician'); // Reset to default perspective
      setChatLog([{ role: 'ai', content: 'Diagnostic synthesis generated. How can I assist you further with this patient?' }]);
    } catch (err) {
      alert('Clinical analysis failed. Please check system connectivity.');
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
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 leading-tight">{patient.name}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Active Session</span>
                    <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-2">ID: {patient.id}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-6">
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
            
            {realtimeWarning && realtimeWarning !== "SAFE" && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm animate-pulse flex items-start gap-3 transition-all">
                    <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="text-red-800 font-bold text-sm">Clinical Warning</h4>
                        <p className="text-red-600 text-sm mt-1 leading-snug">{realtimeWarning}</p>
                    </div>
                </div>
            )}

            {isRecording && realtimeWarning === "SAFE" && (
                <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-xl shadow-sm flex items-center gap-3 transition-all">
                    <Activity className="text-emerald-500 shrink-0 animate-pulse" size={16} />
                    <div>
                        <p className="text-emerald-700 text-xs font-bold uppercase tracking-widest">Live Safety Monitoring Active</p>
                    </div>
                </div>
            )}
            
            <textarea
              value={transcript + (interimTranscript ? interimTranscript : '')}
              readOnly
              placeholder="Click 'Start Real-time Dictation' and begin speaking. The AI will listen and document the consultation here automatically..."
              className="w-full h-56 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-800 transition-all shadow-inner placeholder:text-slate-400 font-medium leading-relaxed resize-none cursor-default"
            ></textarea>
            
            <div className="mt-4 flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-medium italic italic">MedWeave Intelligence will verify findings against patient history upon stopping the dictation.</p>
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
                      <div className="p-1.5 bg-slate-50 rounded-lg text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"><MoreHorizontal size={14} /></div>
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
                          onClick={() => setPerspective('physician')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${perspective === 'physician' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
              
              {perspective === 'physician' ? (
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

                    {/* Physician Summary */}
                    <div className="clinical-card bg-slate-900 text-white p-6 shadow-xl shadow-slate-200 border-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Brain size={48} /></div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Diagnostic Synthesis</h4>
                        <p className="text-sm leading-relaxed text-slate-100 font-medium">
                        {analysis.summary}
                        </p>
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
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2">
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
    </div>
  );
}

