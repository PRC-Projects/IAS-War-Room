import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Lock, Mail, Loader2 } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // No success message needed, redirect happens automatically by App.jsx
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    // --- MAIN CONTAINER WITH BACKGROUND IMAGE ---
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: 'url(/lbsnaa-bg.jpg)' }}
    >
      {/* --- DULL OVERLAY (Making the image dull but clear) --- */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px]"></div>

      {/* --- AUTH FORM CARD (Sits on top of the overlay) --- */}
      <div className="bg-transparent w-full max-w-md p-8 relative z-10">
        
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-blue-100 dark:bg-blue-900/50 rounded-2xl mb-4 shadow-inner">
            <Shield className="text-blue-600 dark:text-blue-400" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
            IAS War Room <span className="text-blue-400">2027</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {isSignUp ? 'Enlist for the Mission' : 'Identify Yourself, Archi.'}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <Shield size={18}/> : <Lock size={18}/>}
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 transition-all font-bold text-slate-700 dark:text-white"
                placeholder="officer@mussoorie.in"
                required
              />
            </div>
          </div>

          <div className="space-y-1 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 transition-all font-bold text-slate-700 dark:text-white"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="animate-spin" size={20}/>}
            {isSignUp ? 'Initialize System' : 'Enter War Room'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
            className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 underline-offset-4 hover:underline transition-all"
          >
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </button>
        </div>

      </div>
    </div>
  );
}