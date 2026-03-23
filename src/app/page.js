"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setTimeout(() => {
      if (token) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }, 500); // Subtle delay for professional feel
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="absolute inset-0 medical-grid opacity-20 pointer-events-none" />
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 relative z-10" />
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] relative z-10">Initializing MedWeave Secure Environment</p>
    </div>
  );
}

