"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { patientService, authService } from '@/services/api';
import { User, Plus, MessageSquare, History, LogOut } from 'lucide-react';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', history: '', allergies: '', medications: '' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
  }, []);

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
      setNewPatient({ name: '', history: '', allergies: '', medications: '' });
      fetchPatients();
    } catch (err) {
      alert('Error adding patient');
    }
  };

  const logout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">MedWeave AI</h1>
        <div className="flex items-center gap-4">
          <button onClick={logout} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-100">Patient Directory</h2>
            <p className="text-slate-400">Manage and monitor your clinical cases securely.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={20} /> Add Patient
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading patient data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
              <div key={patient.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all group">
                <div className="flex gap-4 items-start mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100">{patient.name}</h3>
                    <p className="text-sm text-slate-500 italic truncate w-40">{patient.medications || "No medications listed"}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <p className="text-sm text-slate-400 line-clamp-2"><span className="text-slate-300 font-medium">History:</span> {patient.history || "None"}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/consultation/${patient.id}`)}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageSquare size={16} /> New Session
                  </button>
                  <button
                    className="bg-slate-800 hover:bg-slate-750 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all p-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold mb-6 text-slate-100">Add New Patient</h3>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Allergies</label>
                  <input
                    type="text"
                    value={newPatient.allergies}
                    onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Medications</label>
                  <input
                    type="text"
                    value={newPatient.medications}
                    onChange={(e) => setNewPatient({ ...newPatient, medications: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Medical History</label>
                <textarea
                  value={newPatient.history}
                  onChange={(e) => setNewPatient({ ...newPatient, history: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white h-24"
                ></textarea>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-slate-400 hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
