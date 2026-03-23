"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { patientService, authService } from '@/services/api';
import { User, Plus, MessageSquare, History, LogOut, Search, Filter, MoreHorizontal, UserPlus, Sparkles } from 'lucide-react';

const DEPARTMENTS = [
  { id: 'all', name: 'All Departments', color: 'slate' },
  { id: 'cardiology', name: 'Cardiology', color: 'red' },
  { id: 'neurology', name: 'Neurology', color: 'purple' },
  { id: 'oncology', name: 'Oncology', color: 'emerald' },
  { id: 'pediatrics', name: 'Pediatrics', color: 'amber' }
];

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', history: '', allergies: '', medications: '', department: 'all' });
  const [rawNote, setRawNote] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await patientService.getPatients();
      setPatients(data);
      setLoading(false);
      fetchBriefing();
    } catch (err) {
      router.push('/login');
    }
  };

  const fetchBriefing = async () => {
    setBriefingLoading(true);
    try {
        const text = await patientService.getDailyBriefing();
        setBriefing(text);
    } catch (err) {
        console.error("Briefing error:", err);
    } finally {
        setBriefingLoading(false);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      await patientService.addPatient(newPatient);
      setIsModalOpen(false);
      setNewPatient({ name: '', history: '', allergies: '', medications: '', department: 'all' });
      fetchPatients();
    } catch (err) {
      alert('Error adding patient to record system.');
    }
  };

  const handleParseNote = async () => {
    if (!rawNote.trim()) return;
    setAiParsing(true);
    try {
        const parsed = await patientService.parseIntake(rawNote);
        setNewPatient(prev => ({
            ...prev,
            name: parsed.name || prev.name,
            history: parsed.history || prev.history,
            allergies: parsed.allergies || prev.allergies,
            medications: parsed.medications || prev.medications,
            department: DEPARTMENTS.find(d => d.id === (parsed.department || '').toLowerCase()) ? (parsed.department || '').toLowerCase() : prev.department
        }));
        setRawNote(''); // Clear note after successful parse
    } catch (err) {
        alert('Failed to parse clinical note. You may proceed manually.');
    } finally {
        setAiParsing(false);
    }
  };

  const logout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <div className="absolute inset-0 medical-subtle-dot opacity-40 pointer-events-none" />

      {/* Navigation Header */}
      <nav className="clinical-header sticky top-0 px-8 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">MedWeave AI</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">System Active</span>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 relative z-10">
        {/* AI Daily Briefing */}
        <div className="mb-8 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-slate-200 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles size={64} /></div>
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles size={14} /> MedWeave Daily Briefing
            </h3>
            {briefingLoading ? (
                <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-3 py-1"><div className="h-2 bg-slate-700 rounded w-3/4"></div><div className="h-2 bg-slate-700 rounded w-5/6"></div></div></div>
            ) : (
                <p className="text-sm font-medium leading-relaxed text-slate-200 relative z-10">
                    {briefing || "No critical patient actions identified for today's rotation."}
                </p>
            )}
        </div>

        {/* Dashboard Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clinical Directory</h2>
            <p className="text-slate-500 font-medium">Manage patient records and synchronized clinical intelligence.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="clinical-button flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-indigo-100"
          >
            <UserPlus size={20} /> Register New Patient
          </button>
        </div>

        {/* Global Patient Search/Filter */}
        <div className="flex gap-4 mb-8">
            <div className="flex-1 relative">
                <input 
                    type="text" 
                    placeholder="Search by name, medication, or ID..." 
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
                <Filter size={18} /> <span className="text-sm font-medium">Filters</span>
            </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium uppercase tracking-widest">Accessing Secure Database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
              <div key={patient.id} className="clinical-card group flex flex-col h-full">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                      {patient.name.charAt(0)}
                    </div>
                    <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">{patient.name}</h3>
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">Patient ID: {patient.id}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Updated 2h ago</span>
                  </div>
                </div>

                <div className="p-6 flex-1 space-y-4">
                  <div>
                    <span className="medical-label block mb-1">Current Medications</span>
                    <p className="text-sm text-slate-600 truncate font-medium">{patient.medications || "No active prescriptions"}</p>
                  </div>
                  <div>
                    <span className="medical-label block mb-1">Clinical History</span>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{patient.history || "No prior history recorded."}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 m-2 rounded-lg flex gap-2">
                  <button
                    onClick={() => router.push(`/consultation/${patient.id}`)}
                    className="flex-1 bg-white hover:bg-white border border-slate-200 text-slate-700 px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
                  >
                    <MessageSquare size={16} className="text-indigo-600" /> Start Session
                  </button>
                  <button
                    className="bg-white hover:bg-white border border-slate-200 text-slate-400 px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <History size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl relative animate-in zoom-in-95 duration-200 border border-white/20 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                    <Sparkles size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-none">AI Patient Intake</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Paste notes. MedWeave handles the rest.</p>
                </div>
            </div>

            {/* AI Parsing Section */}
            <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="medical-label mb-2 block flex items-center gap-2 text-indigo-600">
                    <Sparkles size={14} /> AI Clinical Note Parsing
                </label>
                <textarea
                    value={rawNote}
                    onChange={e => setRawNote(e.target.value)}
                    placeholder="Paste unformatted clinical notes here..."
                    className="w-full h-24 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none mb-3"
                ></textarea>
                <button 
                    type="button"
                    onClick={handleParseNote}
                    disabled={aiParsing || !rawNote}
                    className={`w-full py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${aiParsing ? 'bg-slate-200 text-slate-400 cursor-wait' : 'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:shadow-md'}`}
                >
                    {aiParsing ? 'Extracting Clinical Data...' : 'Extract Data Automatically'}
                </button>
            </div>


            <form onSubmit={handleAddPatient} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="medical-label mb-2 block">Patient Name</label>
                    <input
                    type="text"
                    required
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                    placeholder="Full Legal Name"
                    />
                </div>
                <div>
                    <label className="medical-label mb-2 block">Assigned Department</label>
                    <select
                        value={newPatient.department}
                        onChange={(e) => setNewPatient({ ...newPatient, department: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    >
                        {DEPARTMENTS.slice(1).map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                </div>
              </div>

              <div>
                <label className="medical-label mb-2 block">Known Allergies & Contraindications</label>
                <input
                  type="text"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  placeholder="e.g. Penicillin, Latex"
                />
              </div>

              <div>
                <label className="medical-label mb-2 block">Primary Medications</label>
                <input
                  type="text"
                  value={newPatient.medications}
                  onChange={(e) => setNewPatient({ ...newPatient, medications: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  placeholder="List active prescriptions"
                />
              </div>

              <div>
                <label className="medical-label mb-2 block">Medical History Summary</label>
                <textarea
                  value={newPatient.history}
                  onChange={(e) => setNewPatient({ ...newPatient, history: e.target.value })}
                  className="w-full h-28 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Brief overview of past medical conditions..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-sm font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all"
                >
                  Vault Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

