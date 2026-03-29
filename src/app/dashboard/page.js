"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { patientService, authService } from '@/services/api';
import { User, Plus, MessageSquare, History, LogOut, Search, Filter, MoreHorizontal, UserPlus, Activity, Zap, ArrowLeft, AlertCircle, CheckCircle2, Briefcase } from 'lucide-react';

const DEPARTMENTS = [
  { id: 'all', name: 'All Departments', color: 'slate' },
  { id: 'cardiology', name: 'Cardiology', color: 'red' },
  { id: 'neurology', name: 'Neurology', color: 'purple' },
  { id: 'oncology', name: 'Oncology', color: 'emerald' },
  { id: 'pediatrics', name: 'Pediatrics', color: 'amber' },
  { id: 'opd', name: 'OPD (General Checkup)', color: 'blue' }
];

const TIME_SLOTS = [
    '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
    '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
    '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
    '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
    '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
    '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM',
    '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM',
    '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM',
    '05:00 PM'
];

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ 
    name: '', history: '', allergies: '', medications: '', 
    department: 'all', time_slot: '', status: 'Scheduled', severity: 'Normal' 
  });
  const [rawNote, setRawNote] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [recentPatient, setRecentPatient] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [toast, setToast] = useState({ message: '', type: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
    const closeMenu = () => setActiveMenu(null);
    window.addEventListener('click', closeMenu);
    
    const saved = localStorage.getItem('recentPatient');
    if (saved) setRecentPatient(JSON.parse(saved));
    
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchPatients = async () => {
    try {
      const data = await patientService.getPatients();
      setPatients(data);
      setLoading(false);
    } catch (err) {
      router.push('/login');
    }
  };


  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      await patientService.addPatient(newPatient);
      setIsModalOpen(false);
      setNewPatient({ 
        name: '', history: '', allergies: '', medications: '', 
        department: 'all', time_slot: '', status: 'Scheduled', severity: 'Normal' 
      });
      fetchPatients();
    } catch (err) {
      setToast({ message: 'Error adding patient to record system.', type: 'error' });
    }
  };

  const handleDeletePatient = async (id) => {
    setConfirmModal({
        isOpen: true,
        title: "Delete Clinical Record",
        message: "Are you sure you want to permanently delete this clinical record? This action cannot be undone.",
        onConfirm: async () => {
            try {
                await patientService.deletePatient(id);
                if (recentPatient?.id === id) {
                    localStorage.removeItem('recentPatient');
                    setRecentPatient(null);
                }
                fetchPatients();
                setToast({ message: "Record deleted successfully.", type: 'success' });
            } catch (err) {
                setToast({ message: "Error deleting record.", type: 'error' });
            }
        }
    });
  };

  const logout = () => {
    authService.logout();
    router.push('/login');
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.id.toString().includes(searchQuery) ||
                         (p.medications || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'all' || p.department === filterDept;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || p.severity === filterSeverity;
    return matchesSearch && matchesDept && matchesStatus && matchesSeverity;
  }).sort((a, b) => {
    if (!a.time_slot) return 1;
    if (!b.time_slot) return -1;
    
    const parseTime = (t) => {
        if (!t) return 9999;
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const diffA = parseTime(a.time_slot) - currentMinutes;
    const diffB = parseTime(b.time_slot) - currentMinutes;
    
    // Prioritize future slots today, then past slots
    if (diffA >= 0 && diffB < 0) return -1;
    if (diffA < 0 && diffB >= 0) return 1;
    
    return Math.abs(diffA) - Math.abs(diffB);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <div className="absolute inset-0 medical-subtle-dot opacity-40 pointer-events-none" />

      {/* Navigation Header */}
      <nav className="clinical-header sticky top-0 px-8 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Activity size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">MedWeave AI</h1>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/operations')} className="text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
             <Briefcase size={16} /> Operations
          </button>
          <button onClick={logout} className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 relative z-10">


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
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
                <input 
                    type="text" 
                    placeholder="Search by name, medication, or ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner relative">
                <select 
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 focus:outline-none cursor-pointer"
                >
                    <option value="all">All Depts</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="neurology">Neurology</option>
                    <option value="pediatrics">Pediatrics</option>
                    <option value="oncology">Oncology</option>
                    <option value="opd">OPD (General)</option>
                </select>
                <div className="h-4 w-[1px] bg-slate-200 self-center mx-1" />
                <button 
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className={`p-2 rounded-xl transition-all flex items-center gap-2 ${isFilterPanelOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-indigo-600 border border-slate-200 shadow-sm'}`}
                >
                    <Filter size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Filter</span>
                </button>

                {isFilterPanelOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl z-50 p-6 animate-in slide-in-from-top-2 duration-200">
                      <div className="mb-6">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Patient Status</label>
                          <div className="grid grid-cols-1 gap-2">
                              {['all', 'Scheduled', 'In Progress', 'Completed'].map(s => (
                                <button 
                                  key={s}
                                  onClick={() => setFilterStatus(s)}
                                  className={`text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${filterStatus === s ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}
                                >
                                  {s === 'all' ? 'Any Status' : s}
                                </button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Clinical Severity</label>
                          <div className="grid grid-cols-1 gap-2">
                              {['all', 'Normal', 'High', 'Critical'].map(s => (
                                <button 
                                  key={s}
                                  onClick={() => setFilterSeverity(s)}
                                  className={`text-left px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${filterSeverity === s ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}
                                >
                                  {s === 'all' ? 'Any Severity' : s}
                                </button>
                              ))}
                          </div>
                      </div>
                      <button 
                        onClick={() => setIsFilterPanelOpen(false)}
                        className="w-full mt-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                      >
                        Apply Filters
                      </button>
                  </div>
                )}
            </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium uppercase tracking-widest">Accessing Secure Database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
              <div key={patient.id} className="clinical-card group flex flex-col h-full relative">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{patient.name}</h3>
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === patient.id ? null : patient.id); }}
                            className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                        {activeMenu === patient.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-2 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setViewingPatient(patient); setActiveMenu(null); }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <User size={14} /> Clinical Profile
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); router.push(`/consultation/${patient.id}`); }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <History size={14} /> Session History
                                </button>
                                <div className="border-t border-slate-100 my-1"></div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeletePatient(patient.id); setActiveMenu(null); }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOut size={14} className="rotate-180" /> Delete Record
                                </button>
                            </div>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">Patient ID: PATIENT_{patient.id}</span>
                      {patient.time_slot && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">Slot: {patient.time_slot}</span>
                      )}
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Department: {patient.department}</span>
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
                    onClick={() => router.push(`/consultation/${patient.id}`)}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-indigo-600 px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <History size={16} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Search size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No clinical records match your query.</p>
                  <button onClick={() => { setSearchQuery(''); setFilterDept('all'); }} className="mt-4 text-indigo-600 font-bold text-xs hover:underline uppercase tracking-wider">Reset Dashboard</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl relative animate-in zoom-in-95 duration-200 border border-white/20 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh]">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                    <UserPlus size={24} />
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-slate-900 leading-none">Manual Patient Entry</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Fill in the clinical details manually.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                >
                    <Plus size={24} className="rotate-45" />
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
                <label className="medical-label mb-2 block">Scheduled Appointment Slot</label>
                <select
                  value={newPatient.time_slot}
                  onChange={(e) => setNewPatient({ ...newPatient, time_slot: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700"
                >
                  <option value="">Select a Time...</option>
                  {TIME_SLOTS.map(time => (
                      <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="medical-label mb-2 block">Case Severity</label>
                    <select
                      value={newPatient.severity}
                      onChange={(e) => setNewPatient({ ...newPatient, severity: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                    >
                      <option value="Normal">Normal Case</option>
                      <option value="High">High Severity</option>
                      <option value="Critical">Critical Case</option>
                    </select>
                 </div>
                 <div>
                    <label className="medical-label mb-2 block">Initial Status</label>
                    <select
                      value={newPatient.status}
                      onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
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

      {/* Clinical Profile Modal */}
      {viewingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewingPatient(null)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl relative animate-in zoom-in-95 duration-200 border border-white/20 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh]">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      viewingPatient.severity === 'Critical' ? 'bg-red-500 animate-pulse' : 
                      viewingPatient.severity === 'High' ? 'bg-orange-500' : 'bg-emerald-500'
                    }`} />
                    <div>
                      <h4 className="font-black text-slate-900 text-base leading-tight">{viewingPatient.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingPatient.status}</p>
                    </div>
                </div>
                <button onClick={() => setViewingPatient(null)} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                    <Plus size={24} className="rotate-45" />
                </button>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="medical-label block mb-1">Patient ID</span>
                        <p className="text-sm font-bold text-slate-900">PATIENT_{viewingPatient.id}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="medical-label block mb-1">Time Slot</span>
                        <p className="text-sm font-bold text-slate-900">{viewingPatient.time_slot || 'N/A'}</p>
                    </div>
                </div>

                <div>
                    <label className="medical-label mb-2 block">Allergies & Contraindications</label>
                    <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm font-bold">
                        {viewingPatient.allergies || "No reported allergies."}
                    </div>
                </div>

                <div>
                    <label className="medical-label mb-2 block">Current Medications</label>
                    <div className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 text-sm font-bold">
                        {viewingPatient.medications || "No active prescriptions."}
                    </div>
                </div>

                <div>
                    <label className="medical-label mb-2 block">Medical History Summary</label>
                    <div className="p-6 bg-white border border-slate-200 rounded-2xl text-sm text-slate-600 font-medium leading-relaxed shadow-sm">
                        {viewingPatient.history || "No prior history recorded."}
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={() => { router.push(`/consultation/${viewingPatient.id}`); setViewingPatient(null); }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                        <MessageSquare size={18} /> Start Session
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

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

