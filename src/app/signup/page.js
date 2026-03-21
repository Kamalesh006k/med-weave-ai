"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authService.signup(email, password, fullName);
      router.push('/login');
    } catch (err) {
      setError('Error creating account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">MedWeave AI</h1>
        <p className="text-slate-400 mb-8">Clinician Registration</p>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="Dr. Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="doctor@hospital.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-2 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98]"
          >
            Create Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already registered? <a href="/login" className="text-blue-400 hover:underline">Sign In</a>
        </p>
      </div>
    </div>
  );
}
onChange = {(e) => setFormData({ ...formData, email: e.target.value })}
className = "w-full bg-black/40 border border-white/5 rounded-[2rem] px-10 py-7 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-bold placeholder:text-slate-900 transition-all uppercase text-sm"
placeholder = "EMAIL_ADRESS_TARGET..."
  />
  <Mail size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within/field:text-blue-500 transition-colors" />
              </div >
            </div >

            <div className="space-y-4">
              <label className="clinical-label text-slate-700 ml-2 font-black tracking-widest uppercase text-[10px]">Credential_Key</label>
              <div className="relative group/field">
                <input 
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-black/40 border border-white/5 rounded-[2rem] px-10 py-7 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white font-bold placeholder:text-slate-900 transition-all uppercase text-sm"
                  placeholder="SECURE_PASSPHRASE..."
                />
                <Lock size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within/field:text-blue-500 transition-colors" />
              </div>
            </div>

            <div className="pt-10 space-y-8">
              <motion.button 
                whileHover={{ scale: 1.02, y: -2, boxShadow: "0 20px 60px rgba(37,99,235,0.3)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-blue-700 text-white py-7 rounded-[2.5rem] clinical-label text-[11px] font-[1000] tracking-[0.5em] uppercase transition-all shadow-3xl flex items-center justify-center gap-4"
              >
                Initialize Account <ArrowRight size={20} strokeWidth={3} />
              </motion.button>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/5" />
                <button 
                  type="button"
                  onClick={() => router.push('/login')}
                  className="clinical-label text-[9px] text-slate-600 hover:text-white transition-colors tracking-widest uppercase font-black"
                >
                  Existing Account? Authenticate
                </button>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            </div>
          </form >
        </motion.div >
      </div >
    </div >
  );
}
