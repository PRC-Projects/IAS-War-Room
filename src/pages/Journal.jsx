import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BookOpen, Save, Smile, Frown, Meh, Zap, 
  Battery, AlertTriangle, CloudRain, Sun, Calendar 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Journal() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  
  // Form State
  const [mood, setMood] = useState('Neutral');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);

  const moods = [
    { name: 'Warrior', icon: Zap, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
    { name: 'Confident', icon: Sun, color: 'text-green-500 bg-green-50 border-green-200' },
    { name: 'Neutral', icon: Meh, color: 'text-gray-500 bg-gray-50 border-gray-200' },
    { name: 'Tired', icon: Battery, color: 'text-orange-500 bg-orange-50 border-orange-200' },
    { name: 'Anxious', icon: AlertTriangle, color: 'text-red-500 bg-red-50 border-red-200' },
    { name: 'Burnout', icon: CloudRain, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  ];

  const availableTags = [
    'Good Sleep', 'Insomnia', 'Exercise', 'Junk Food', 
    'Procrastinated', 'Deep Work', 'Social Media Binge', 'Family Stress'
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
      
    if (data) setHistory(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('journal_entries').insert([{
      user_id: user.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      mood,
      content,
      tags
    }]);

    if (!error) {
      alert("Log Entry Saved.");
      setContent('');
      setTags([]);
      fetchHistory();
    }
  };

  const toggleTag = (tag) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-8xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
         <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <BookOpen size={32} />
         </div>
         <div>
            <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Captain's Log</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Mental Health Anchor & Brain Dump</p>
         </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* --- LEFT: NEW ENTRY --- */}
        <div className="lg:col-span-2 space-y-6">
           <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              
              {/* 1. MOOD SELECTOR */}
              <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Current Status</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                 {moods.map((m) => {
                    const Icon = m.icon;
                    const isSelected = mood === m.name;
                    return (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => setMood(m.name)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          isSelected ? `${m.color} border-current scale-105` : 'border-transparent bg-gray-50 dark:bg-slate-700 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                         <Icon size={24} className="mb-1"/>
                         <span className="text-[10px] font-bold uppercase">{m.name}</span>
                      </button>
                    )
                 })}
              </div>

              {/* 2. TEXT AREA */}
              <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Brain Dump (Private)</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write down your fears, anxieties, or wins. Get it out of your head..."
                className="w-full h-40 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none border border-gray-200 dark:border-gray-600 focus:border-indigo-500 mb-6 resize-none"
              ></textarea>

              {/* 3. TAGS */}
              <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">Contributing Factors</label>
              <div className="flex flex-wrap gap-2 mb-8">
                 {availableTags.map(tag => (
                   <button
                     key={tag}
                     type="button"
                     onClick={() => toggleTag(tag)}
                     className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                       tags.includes(tag) 
                         ? 'bg-indigo-600 text-white border-indigo-600' 
                         : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                     }`}
                   >
                     {tag}
                   </button>
                 ))}
              </div>

              <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30">
                 <Save size={20}/> Log Entry
              </button>
           </form>
        </div>

        {/* --- RIGHT: HISTORY TIMELINE --- */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full max-h-[600px] overflow-y-auto">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-6">
                 <Calendar size={18}/> Previous Logs
              </h3>
              
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                 {history.map((entry) => {
                    const mData = moods.find(m => m.name === entry.mood) || moods[2];
                    const Icon = mData.icon;
                    return (
                       <div key={entry.id} className="relative flex items-center justify-between md:justify-center md:odd:flex-row-reverse group is-active">
                          {/* Icon Dot */}
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${mData.color}`}>
                             <Icon size={16}/>
                          </div>
                          
                          {/* Content Card */}
                          <div className="w-[calc(100%-4rem)] md:w-[calc(100%)] bg-gray-50 dark:bg-slate-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                             <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-700 dark:text-white text-sm">{entry.mood}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{format(parseISO(entry.date), 'MMM d, yyyy')}</span>
                             </div>
                             <p className="text-xs text-gray-500 dark:text-gray-300 line-clamp-3 italic mb-2">"{entry.content}"</p>
                             <div className="flex flex-wrap gap-1">
                                {entry.tags?.map(t => (
                                   <span key={t} className="text-[9px] px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-gray-600 text-gray-500">{t}</span>
                                ))}
                             </div>
                          </div>
                       </div>
                    )
                 })}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}