import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Book, Bookmark, CheckCircle, Plus, Trash2, 
  RotateCw, Map, ChevronDown, ChevronRight, Shield, Save
} from 'lucide-react';


const UPSC_SYLLABUS = {
  "GS1": {
    "Art & Culture": ["Architecture", "Literature", "Music & Dance", "Paintings"],
    "Modern History": ["Revolt of 1857", "Freedom Struggle", "Post-Independence"],
    "World History": ["Industrial Revolution", "World Wars", "Colonization"],
    "Geography": ["Physical Geography", "Resources", "Urbanization"],
    "Society": ["Diversity", "Women's Issues", "Globalization", "Poverty"]
  },
  "GS2": {
    "Polity": ["Constitution", "Parliament", "Judiciary", "Federalism"],
    "Governance": ["RTI", "Citizen Charter", "E-Governance"],
    "Social Justice": ["Health", "Education", "Vulnerable Sections"],
    "IR": ["India & Neighbors", "Bilateral Groupings", "International Inst."]
  },
  "GS3": {
    "Economy": ["Budgeting", "Agriculture", "Infrastructure", "Liberalization"],
    "Sci & Tech": ["Space", "Bio-Tech", "Nano-Tech", "Defense"],
    "Environment": ["Conservation", "Pollution", "Disaster Management"],
    "Internal Security": ["Extremism", "Cyber Security", "Money Laundering"]
  },
  "GS4": {
    "Ethics": ["Human Interface", "Attitude", "Emotional Intelligence", "Public Service Values"],
    "Case Studies": ["Integrity", "Corruption", "Corporate Governance"]
  },
  "Optional (History)": {
    "Ancient": ["Sources", "Harappa", "Mauryas", "Guptas"],
    "Medieval": ["Delhi Sultanate", "Mughals", "Bhakti Movement"],
    "Modern": ["British Expansion", "Economic Impact", "Social Reforms"],
    "World": ["Enlightenment", "Modern Politics", "Industrialization"]
  }
};

export default function Library() {
  const [activeTab, setActiveTab] = useState('resources'); // 'resources' or 'syllabus'
  const [loading, setLoading] = useState(true);
  
  // Resource State
  const [resources, setResources] = useState([]);
  const [newRes, setNewRes] = useState({ title: '', category: 'GS1', total_chapters: 20 });
  const [isAdding, setIsAdding] = useState(false);

  // Syllabus State
  const [syllabusStatus, setSyllabusStatus] = useState({}); // { 'gs1-art-arch': 'Strong' }
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch Resources
    const { data: resData } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });
    
    if (resData) setResources(resData);

    // 2. Fetch Syllabus Progress
    const { data: sylData } = await supabase
      .from('syllabus_progress')
      .select('*')
      .eq('user_id', user.id);
    
    if (sylData) {
      const statusMap = {};
      sylData.forEach(item => {
        statusMap[item.topic_id] = item.status;
      });
      setSyllabusStatus(statusMap);
    }
    setLoading(false);
  };

  // --- RESOURCE ACTIONS ---
  const addResource = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('resources').insert([{ ...newRes, user_id: user.id }]);
    if (!error) {
      setNewRes({ title: '', category: 'GS1', total_chapters: 20 });
      setIsAdding(false);
      fetchData();
    }
  };

  const updateProgress = async (id, current, total, change) => {
    const newCount = Math.min(Math.max(current + change, 0), total);
    // Optimistic Update
    setResources(prev => prev.map(r => r.id === id ? { ...r, completed_chapters: newCount } : r));
    // DB Update
    await supabase.from('resources').update({ completed_chapters: newCount }).eq('id', id);
  };

  const incrementRevision = async (id, currentRev) => {
    const newRev = currentRev + 1;
    setResources(prev => prev.map(r => r.id === id ? { ...r, revision_count: newRev } : r));
    await supabase.from('resources').update({ revision_count: newRev }).eq('id', id);
  };

  const deleteResource = async (id) => {
    if(!confirm("Remove this book from your inventory?")) return;
    setResources(prev => prev.filter(r => r.id !== id));
    await supabase.from('resources').delete().eq('id', id);
  };

  // --- SYLLABUS ACTIONS ---
  const toggleSyllabusStatus = async (topicId, currentStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Cycle: Pending -> Weak (Red) -> Average (Yellow) -> Strong (Green) -> Pending
    const nextStatus = 
      currentStatus === 'Pending' || !currentStatus ? 'Weak' :
      currentStatus === 'Weak' ? 'Average' :
      currentStatus === 'Average' ? 'Strong' : 'Pending';

    // Optimistic Update
    setSyllabusStatus(prev => ({ ...prev, [topicId]: nextStatus }));

    // DB Update (Upsert logic)
    // First, try to delete existing to avoid duplicates (simple way), or just upsert if unique constraint existed.
    // We will check if it exists first.
    const { data: existing } = await supabase.from('syllabus_progress').select('id').eq('user_id', user.id).eq('topic_id', topicId).single();
    
    if (existing) {
      await supabase.from('syllabus_progress').update({ status: nextStatus }).eq('id', existing.id);
    } else {
      await supabase.from('syllabus_progress').insert({ user_id: user.id, topic_id: topicId, status: nextStatus });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // --- RENDER HELPERS ---
  const getStatusColor = (status) => {
    switch (status) {
      case 'Weak': return 'bg-red-100 text-red-700 border-red-200';
      case 'Average': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Strong': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
         <div>
            <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase flex items-center gap-3">
              <Shield className="text-blue-600" size={32} />
              The Armory
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Resource Inventory & Syllabus Map</p>
         </div>
         <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
            <button onClick={() => setActiveTab('resources')} className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'resources' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
               Inventory
            </button>
            <button onClick={() => setActiveTab('syllabus')} className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'syllabus' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
               War Map (Syllabus)
            </button>
         </div>
      </div>

      {/* --- TAB 1: RESOURCES --- */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
           {/* Add Button */}
           {!isAdding ? (
             <button onClick={() => setIsAdding(true)} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <Plus /> Add New Weapon (Book/Course)
             </button>
           ) : (
             <form onSubmit={addResource} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold mb-4 dark:text-white">New Resource</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                   <input placeholder="Resource Title (e.g. Laxmikanth)" className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none" value={newRes.title} onChange={e => setNewRes({...newRes, title: e.target.value})} required />
                   <select className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none" value={newRes.category} onChange={e => setNewRes({...newRes, category: e.target.value})}>
                      <option>GS1</option><option>GS2</option><option>GS3</option><option>GS4</option><option>Optional</option><option>CSAT</option>
                   </select>
                   <input type="number" placeholder="Total Chapters" className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg outline-none" value={newRes.total_chapters} onChange={e => setNewRes({...newRes, total_chapters: e.target.value})} required />
                </div>
                <div className="flex gap-2">
                   <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Add to Inventory</button>
                   <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 bg-gray-200 text-gray-600 font-bold rounded-lg">Cancel</button>
                </div>
             </form>
           )}

           {/* Resource Grid */}
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(res => {
                 const progress = Math.round((res.completed_chapters / res.total_chapters) * 100);
                 return (
                   <div key={res.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded uppercase">{res.category}</span>
                            <h3 className="font-bold text-lg mt-2 dark:text-white leading-tight">{res.title}</h3>
                         </div>
                         <button onClick={() => deleteResource(res.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-2 flex justify-between text-xs font-bold text-gray-500">
                         <span>{res.completed_chapters} / {res.total_chapters} Chaps</span>
                         <span>{progress}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4 relative">
                         <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
                      </div>

                      {/* Controls */}
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                            <button onClick={() => updateProgress(res.id, res.completed_chapters, res.total_chapters, -1)} className="p-1 hover:bg-white rounded text-gray-500 font-bold w-8">-</button>
                            <button onClick={() => updateProgress(res.id, res.completed_chapters, res.total_chapters, 1)} className="p-1 hover:bg-white rounded text-blue-600 font-bold w-8">+</button>
                         </div>
                         
                         <button 
                           onClick={() => incrementRevision(res.id, res.revision_count)}
                           className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold border border-yellow-200 transition-all active:scale-95"
                         >
                            <RotateCw size={12}/> {res.revision_count} Revs
                         </button>
                      </div>
                   </div>
                 )
              })}
           </div>
        </div>
      )}

      {/* --- TAB 2: SYLLABUS MAP --- */}
      {activeTab === 'syllabus' && (
        <div className="space-y-6">
           <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
              <Map className="shrink-0" />
              <p>This is your strategic map. Click on topics to cycle their status: <br/>
              <span className="font-bold text-gray-400">Gray (Pending)</span> → <span className="font-bold text-red-500">Red (Weak)</span> → <span className="font-bold text-yellow-500">Yellow (Avg)</span> → <span className="font-bold text-green-500">Green (Strong)</span></p>
           </div>

           <div className="grid gap-4">
              {Object.entries(UPSC_SYLLABUS).map(([paper, subjects]) => (
                 <div key={paper} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {/* Paper Header (GS1, GS2...) */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                       <h3 className="font-black text-xl text-slate-700 dark:text-slate-200">{paper}</h3>
                    </div>
                    
                    <div className="p-4 grid md:grid-cols-2 gap-6">
                       {Object.entries(subjects).map(([subject, topics]) => (
                          <div key={subject}>
                             <h4 className="font-bold text-gray-500 text-sm uppercase mb-2 tracking-wider">{subject}</h4>
                             <div className="space-y-2">
                                {topics.map(topic => {
                                   const topicId = `${paper}-${subject}-${topic}`.replace(/\s+/g, '-').toLowerCase();
                                   const status = syllabusStatus[topicId];
                                   
                                   return (
                                     <button 
                                       key={topicId}
                                       onClick={() => toggleSyllabusStatus(topicId, status)}
                                       className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left ${getStatusColor(status)}`}
                                     >
                                        <span className="font-medium text-sm">{topic}</span>
                                        {status === 'Strong' && <CheckCircle size={16} />}
                                     </button>
                                   )
                                })}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

    </div>
  );
}