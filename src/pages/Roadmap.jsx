import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Target, Calendar, Flag, CheckCircle, Plus, Trash2, 
  ChevronDown, ChevronUp, AlertCircle, Layers, BookOpen, 
  TrendingUp, Crosshair, Save, X
} from 'lucide-react';
import { format, addMonths, differenceInDays } from 'date-fns';

export default function Roadmap() {
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [activeTab, setActiveTab] = useState('Monthly'); 
  const [showForm, setShowForm] = useState(false);
  const [expandedTargetId, setExpandedTargetId] = useState(null);

  // Form State
  const [newTarget, setNewTarget] = useState({
    title: '',
    type: 'Monthly',
    phase: 'Foundation',
    priority: 'Medium',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    syllabus_tags: [], // ['GS1', 'History']
    strategy_notes: '',
    milestones: [] // Temporary holder for new milestones
  });
  const [tempMilestone, setTempMilestone] = useState('');

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    fetchTargets();
  }, [activeTab]);

  const fetchTargets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch Targets with their Milestones
    const { data, error } = await supabase
      .from('targets')
      .select(`
        *,
        target_milestones ( id, title, is_completed )
      `)
      .eq('user_id', user.id)
      .eq('type', activeTab)
      .order('end_date', { ascending: true });

    if (error) console.error(error);
    if (data) setTargets(data);
    setLoading(false);
  };

  // --- 2. ACTIONS ---
  const handleAddTarget = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Insert Target
    const { data: targetData, error: targetError } = await supabase
      .from('targets')
      .insert([{
        user_id: user.id,
        title: newTarget.title,
        type: activeTab,
        phase: newTarget.phase,
        priority: newTarget.priority,
        start_date: newTarget.start_date,
        end_date: newTarget.end_date,
        syllabus_tags: newTarget.syllabus_tags,
        strategy_notes: newTarget.strategy_notes
      }])
      .select()
      .single();

    if (targetError) {
      alert("Error creating target");
      return;
    }

    // 2. Insert Milestones (if any)
    if (newTarget.milestones.length > 0) {
      const milestonePayload = newTarget.milestones.map(m => ({
        target_id: targetData.id,
        title: m,
        is_completed: false
      }));
      await supabase.from('target_milestones').insert(milestonePayload);
    }

    setShowForm(false);
    resetForm();
    fetchTargets();
  };

  const deleteTarget = async (id) => {
    if(!confirm("Abort this strategic objective? This cannot be undone.")) return;
    setTargets(prev => prev.filter(t => t.id !== id));
    await supabase.from('targets').delete().eq('id', id);
  };

  // --- 3. MILESTONE LOGIC ---
  const toggleMilestone = async (milestoneId, currentStatus, targetId) => {
    // Optimistic Update
    setTargets(prev => prev.map(t => {
      if (t.id === targetId) {
        return {
          ...t,
          target_milestones: t.target_milestones.map(m => 
            m.id === milestoneId ? { ...m, is_completed: !currentStatus } : m
          )
        };
      }
      return t;
    }));

    // DB Update
    await supabase.from('target_milestones').update({ is_completed: !currentStatus }).eq('id', milestoneId);
    
    // Auto-Calculate Progress based on milestones? 
    // Ideally yes, but for now we keep the manual slider for "Subjective Progress" 
    // and let milestones be "Objective Steps".
  };

  const addLiveMilestone = async (targetId) => {
    const title = prompt("Enter new milestone:");
    if (!title) return;
    
    const { data } = await supabase
      .from('target_milestones')
      .insert([{ target_id: targetId, title, is_completed: false }])
      .select()
      .single();

    if (data) {
      setTargets(prev => prev.map(t => 
        t.id === targetId ? { ...t, target_milestones: [...t.target_milestones, data] } : t
      ));
    }
  };

  const resetForm = () => {
    setNewTarget({
      title: '', type: 'Monthly', phase: 'Foundation', priority: 'Medium',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      syllabus_tags: [], strategy_notes: '', milestones: []
    });
    setTempMilestone('');
  };

  // --- 4. RENDER HELPERS ---
  const getPhaseStyles = (phase) => {
    switch(phase) {
      case 'Foundation': return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300' };
      case 'Prelims': return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-300' };
      case 'Mains': return { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-500', text: 'text-rose-700 dark:text-rose-300' };
      case 'Interview': return { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500', text: 'text-purple-700 dark:text-purple-300' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-700' };
    }
  };

  const getDaysLeft = (end) => {
    const days = differenceInDays(new Date(end), new Date());
    return days < 0 ? 'Overdue' : `${days} days left`;
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      
      {/* --- HERO: GRAND STRATEGY BANNER --- */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
             <div className="flex items-center gap-2 mb-2 text-blue-400 font-mono text-xs uppercase tracking-widest">
                <Crosshair size={14}/> Strategic Command Center
             </div>
             <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Operation Roadmap</h1>
             <p className="text-slate-400 text-sm mt-1 max-w-xl">
               Define your War Objectives. Break them down into tactical Milestones. Execute without mercy.
             </p>
          </div>
          {/* Phase Indicator */}
          <div className="flex gap-1 bg-slate-800 p-2 rounded-xl border border-slate-700">
             {['Foundation', 'Prelims', 'Mains'].map((p, i) => (
               <div key={p} className={`px-4 py-2 rounded-lg text-xs font-bold ${i===0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'text-slate-500'}`}>
                  {p}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-4 z-30">
         <div className="flex gap-2 overflow-x-auto w-full md:w-auto p-1">
            {['Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`px-5 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                    activeTab === tab 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
                 }`}
               >
                 {tab}
               </button>
            ))}
         </div>
         <button onClick={() => setShowForm(true)} className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all">
            <Plus size={18}/> New {activeTab} Objective
         </button>
      </div>

      {/* --- ADD TARGET MODAL (Expandable Form) --- */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-700 p-6 animate-in slide-in-from-top-4">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><Flag className="text-blue-500"/> New Strategic Target</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
           </div>
           
           <form onSubmit={handleAddTarget} className="grid md:grid-cols-2 gap-6">
              {/* Left: Core Info */}
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Target Title</label>
                    <input required value={newTarget.title} onChange={e => setNewTarget({...newTarget, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border border-gray-200 dark:border-gray-600 font-bold" placeholder="e.g. Master Modern History"/>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-gray-400 uppercase">Phase</label>
                       <select value={newTarget.phase} onChange={e => setNewTarget({...newTarget, phase: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border border-gray-200 dark:border-gray-600">
                          <option>Foundation</option><option>Prelims</option><option>Mains</option><option>Interview</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-400 uppercase">Priority</label>
                       <select value={newTarget.priority} onChange={e => setNewTarget({...newTarget, priority: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border border-gray-200 dark:border-gray-600">
                          <option>High</option><option>Medium</option><option>Low</option>
                       </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Start</label><input type="date" value={newTarget.start_date} onChange={e => setNewTarget({...newTarget, start_date: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border border-gray-200 dark:border-gray-600"/></div>
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Deadline</label><input type="date" value={newTarget.end_date} onChange={e => setNewTarget({...newTarget, end_date: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border border-gray-200 dark:border-gray-600"/></div>
                 </div>
              </div>

              {/* Right: Strategy & Milestones */}
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Strategy / Notes</label>
                    <textarea value={newTarget.strategy_notes} onChange={e => setNewTarget({...newTarget, strategy_notes: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none border border-gray-200 dark:border-gray-600 h-24 text-sm" placeholder="Why is this important? How will you achieve it?"/>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Milestones (Sub-Tasks)</label>
                    <div className="flex gap-2 mb-2">
                       <input value={tempMilestone} onChange={e => setTempMilestone(e.target.value)} className="flex-1 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm border border-gray-200 dark:border-gray-600" placeholder="Add milestone..."/>
                       <button type="button" onClick={() => {if(tempMilestone) {setNewTarget(p => ({...p, milestones: [...p.milestones, tempMilestone]})); setTempMilestone('')}}} className="px-3 bg-gray-200 dark:bg-slate-600 rounded-lg font-bold">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {newTarget.milestones.map((m, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">{m}</span>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                 <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                 <button type="submit" className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30">Initialize Target</button>
              </div>
           </form>
        </div>
      )}

      {/* --- TARGET LIST (ADVANCED CARDS) --- */}
      <div className="space-y-4">
         {targets.length === 0 && !loading && (
            <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
               <Target className="mx-auto text-gray-300 mb-4" size={64}/>
               <h3 className="text-xl font-bold text-gray-400">No Active Strategies</h3>
               <p className="text-gray-400 text-sm">Define your {activeTab} objectives to begin.</p>
            </div>
         )}

         {targets.map(target => {
            const styles = getPhaseStyles(target.phase);
            const isExpanded = expandedTargetId === target.id;
            const completedMilestones = target.target_milestones?.filter(m => m.is_completed).length || 0;
            const totalMilestones = target.target_milestones?.length || 0;
            const milestoneProgress = totalMilestones === 0 ? 0 : Math.round((completedMilestones/totalMilestones)*100);

            return (
               <div key={target.id} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-l-[6px] transition-all hover:shadow-lg ${styles.border} ${isExpanded ? 'ring-2 ring-blue-500/20' : ''}`}>
                  
                  {/* CARD HEADER (Always Visible) */}
                  <div className="p-6 cursor-pointer" onClick={() => setExpandedTargetId(isExpanded ? null : target.id)}>
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 mb-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${styles.bg} ${styles.text}`}>
                              {target.phase}
                           </span>
                           {target.priority === 'High' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-600 border border-red-200 flex items-center gap-1">
                                 <AlertCircle size={10}/> High Priority
                              </span>
                           )}
                        </div>
                        <div className="text-xs font-mono font-bold text-gray-400">
                           Due: {format(new Date(target.end_date), 'MMM d')} ({getDaysLeft(target.end_date)})
                        </div>
                     </div>

                     <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                           {target.title}
                           {target.progress >= 100 && <CheckCircle className="text-green-500" size={20}/>}
                        </h3>
                        <div className="flex items-center gap-4 text-gray-400">
                           {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </div>
                     </div>

                     {/* PROGRESS BAR */}
                     <div className="mt-4 flex items-center gap-4">
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full transition-all duration-500 ${target.progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{width: `${target.progress}%`}}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-10 text-right">{target.progress}%</span>
                     </div>
                  </div>

                  {/* EXPANDED DETAILS (Strategy & Milestones) */}
                  {isExpanded && (
                     <div className="px-6 pb-6 pt-0 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2">
                        <div className="grid md:grid-cols-2 gap-8 mt-6">
                           
                           {/* LEFT: STRATEGY & SYLLABUS */}
                           <div className="space-y-4">
                              <div>
                                 <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><BookOpen size={12}/> Strategic Notes</h4>
                                 <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700 italic">
                                    "{target.strategy_notes || 'No specific strategy notes added.'}"
                                 </p>
                              </div>
                              
                              <div>
                                 <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><Layers size={12}/> Syllabus Coverage</h4>
                                 <div className="flex flex-wrap gap-2">
                                    {target.syllabus_tags?.length > 0 ? target.syllabus_tags.map(tag => (
                                       <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">{tag}</span>
                                    )) : <span className="text-xs text-gray-400 italic">No tags</span>}
                                 </div>
                              </div>

                              <div className="pt-4">
                                 <button onClick={() => deleteTarget(target.id)} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                                    <Trash2 size={12}/> Abandon Objective
                                 </button>
                              </div>
                           </div>

                           {/* RIGHT: MILESTONES (CHECKLIST) */}
                           <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                              <div className="flex justify-between items-center mb-3">
                                 <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                    <TrendingUp size={12}/> Tactical Milestones
                                 </h4>
                                 <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-slate-500">
                                    {completedMilestones}/{totalMilestones} Done
                                 </span>
                              </div>

                              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                 {target.target_milestones?.map(m => (
                                    <div key={m.id} className="flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" onClick={() => toggleMilestone(m.id, m.is_completed, target.id)}>
                                       <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${m.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                                          {m.is_completed && <CheckCircle size={12}/>}
                                       </div>
                                       <span className={`text-sm ${m.is_completed ? 'text-gray-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                          {m.title}
                                       </span>
                                    </div>
                                 ))}
                                 <button onClick={(e) => { e.stopPropagation(); addLiveMilestone(target.id); }} className="w-full text-center py-2 text-xs font-bold text-blue-500 hover:text-blue-700 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50">
                                    + Add Sub-Task
                                 </button>
                              </div>
                              
                              {/* Manual Progress Slider Override */}
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Manual Progress Override</label>
                                  <input 
                                    type="range" min="0" max="100" step="5"
                                    value={target.progress}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={async (e) => {
                                        const val = parseInt(e.target.value);
                                        setTargets(prev => prev.map(t => t.id === target.id ? {...t, progress: val} : t));
                                        // Debounce DB call in real app, here we just fire
                                        await supabase.from('targets').update({ progress: val }).eq('id', target.id);
                                    }}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
                                  />
                              </div>
                           </div>

                        </div>
                     </div>
                  )}
               </div>
            );
         })}
      </div>

    </div>
  );
}