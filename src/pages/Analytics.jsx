import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, TrendingUp, Target, Zap, Calendar, 
  Award, AlertTriangle, Download, Share2, Brain, Layers, Clock, Info
} from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  
  // Stats
  const [streak, setStreak] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  
  // Chart Data
  const [subjectData, setSubjectData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [phaseData, setPhaseData] = useState([]); 
  const [styleData, setStyleData] = useState([]); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', true);

    if (!error && data) {
      setTasks(data);
      processData(data);
    }
    setLoading(false);
  };

  const processData = (data) => {
    // 1. BASICS
    let totalMins = 0;
    let deepMins = 0;
    
    // 2. PHASE & STYLE BUCKETS
    let phaseCounts = { Foundation: 0, Prelims: 0, Mains: 0, Interview: 0 };
    let styleCounts = { Passive: 0, Active: 0, Revision: 0 };

    data.forEach(t => {
      const dur = t.duration || 0;
      totalMins += dur;
      if (t.quality_tag === 'Deep Work') deepMins += dur;

      // --- SMART LOGIC FOR PHASE ---
      // Mains: Answer Writing, Essay, Ethics
      if (['Answer Writing'].includes(t.type) || ['Essay', 'Ethics (GS4)', 'Social Justice', 'International Relations'].includes(t.subject)) {
          phaseCounts.Mains += dur;
      } 
      // Prelims: Mocks, CSAT, PYQ
      else if (['Mock Test', 'PYQ Analysis'].includes(t.type) || ['CSAT'].includes(t.subject)) {
          phaseCounts.Prelims += dur;
      }
      // Interview
      else if (t.subject === 'Interview Prep' || t.subject === 'Personality') {
          phaseCounts.Interview += dur;
      }
      // Foundation (Default)
      else {
          phaseCounts.Foundation += dur;
      }

      // --- SMART LOGIC FOR STYLE ---
      if (['Reading', 'Video Lecture', 'Audio/Podcast'].includes(t.type)) {
          styleCounts.Passive += dur;
      } else if (['Answer Writing', 'Mock Test', 'PYQ Analysis', 'Writing/Notes'].includes(t.type)) {
          styleCounts.Active += dur;
      } else if (t.type === 'Revision') {
          styleCounts.Revision += dur;
      }
    });

    setTotalHours((totalMins / 60).toFixed(1));
    setEfficiency(totalMins === 0 ? 0 : Math.round((deepMins / totalMins) * 100));

    // Phase Chart Data
    const pData = [
        { name: 'Foundation', value: phaseCounts.Foundation, color: '#3b82f6' }, // Blue
        { name: 'Prelims', value: phaseCounts.Prelims, color: '#f59e0b' },    // Amber
        { name: 'Mains', value: phaseCounts.Mains, color: '#ef4444' },      // Red
        { name: 'Interview', value: phaseCounts.Interview, color: '#8b5cf6' } // Purple
    ].filter(d => d.value > 0);
    setPhaseData(pData);

    // Style Chart Data
    const sData = [
        { name: 'Input (Passive)', value: parseFloat((styleCounts.Passive / 60).toFixed(1)) },
        { name: 'Output (Active)', value: parseFloat((styleCounts.Active / 60).toFixed(1)) },
        { name: 'Revision', value: parseFloat((styleCounts.Revision / 60).toFixed(1)) }
    ];
    setStyleData(sData);

    // Radar & Heatmap Logic
    const subjects = {};
    data.forEach(t => {
      if (!subjects[t.subject]) subjects[t.subject] = 0;
      subjects[t.subject] += (t.duration || 0);
    });
    setSubjectData(Object.keys(subjects).map(s => ({ subject: s, hours: parseFloat((subjects[s]/60).toFixed(1)), fullMark: 100 })));

    const heatMap = {};
    data.forEach(t => { 
        // Use completed_at date if available for more accuracy, else due_date
        const d = t.completed_at ? format(new Date(t.completed_at), 'yyyy-MM-dd') : t.due_date;
        if(!heatMap[d]) heatMap[d]=0; 
        heatMap[d]+=(t.duration||0); 
    });
    setHeatmapData(heatMap);

    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const d = format(subDays(today, i), 'yyyy-MM-dd');
        if (heatMap[d] > 0) currentStreak++; else if (i>0) break;
    }
    setStreak(currentStreak);
    
    // Activity Graph
    const last7 = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    setActivityData(last7.map(d => {
        const dStr = format(d, 'yyyy-MM-dd');
        const tasksForDay = data.filter(t => {
             const tDate = t.completed_at ? format(new Date(t.completed_at), 'yyyy-MM-dd') : t.due_date;
             return tDate === dStr;
        });
        return { name: format(d, 'EEE'), hours: parseFloat((tasksForDay.reduce((a,b)=>a+(b.duration||0),0)/60).toFixed(1)) };
    }));
  };

  const renderHeatmap = () => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 140), end: new Date() });
    return (
        <div className="flex flex-wrap gap-1 w-full justify-end">
            {days.map(day => {
                const dStr = format(day, 'yyyy-MM-dd');
                const m = heatmapData[dStr] || 0;
                let c = 'bg-gray-100 dark:bg-slate-700';
                if(m>0) c='bg-green-200 dark:bg-green-900/40';
                if(m>60) c='bg-green-300 dark:bg-green-800/60';
                if(m>180) c='bg-green-500 dark:bg-green-600';
                if(m>360) c='bg-green-600 dark:bg-green-500 shadow-lg shadow-green-500/50';
                return <div key={dStr} title={`${dStr}: ${(m/60).toFixed(1)}h`} className={`w-3 h-3 rounded-sm ${c}`}></div>
            })}
        </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER & KPI */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-mono text-green-600 dark:text-green-400 uppercase tracking-widest">System Online</span>
           </div>
           <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Analytics Cockpit</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Current Streak" value={`${streak} Days`} icon={Zap} color="text-yellow-500" sub="Consistency is King" />
          <KpiCard title="Total Hours" value={`${totalHours}h`} icon={Clock} color="text-blue-500" sub="Lifetime Effort" />
          <KpiCard title="Efficiency" value={`${efficiency}%`} icon={Activity} color={efficiency > 70 ? "text-green-500" : "text-red-500"} sub="Deep Work Ratio" />
          <KpiCard title="Missions Done" value={tasks.length} icon={Target} color="text-purple-500" sub="Tasks Completed" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT COL: HEATMAP & TREND */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Calendar size={18}/> Consistency Heatmap</h3>
               </div>
               {loading ? <div className="h-32 bg-gray-100 rounded-xl"></div> : renderHeatmap()}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
               <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-6"><TrendingUp size={18}/> 7-Day Performance Trend</h3>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                      <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={3} fill="url(#colorHours)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
        </div>

        {/* RIGHT COL: RADAR */}
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
               <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2"><Award size={18}/> Subject Mastery</h3>
               <div className="h-64 w-full flex items-center justify-center">
                  {subjectData.length < 3 ? <div className="text-sm text-gray-400">Need data from 3+ subjects</div> : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                        <Radar name="Hours" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                        <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                  )}
               </div>
            </div>
        </div>
      </div>

      {/* --- STRATEGIC DEPTH --- */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
                  <Target size={18}/> Preparation Phase Split
              </h3>
              <div className="h-64 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={phaseData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {phaseData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="middle" align="right" layout="vertical"/>
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
                  <Brain size={18}/> Cognitive Load (Active vs Passive)
              </h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={styleData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                          <Tooltip cursor={{fill: 'transparent'}} />
                          <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                            {styleData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name.includes('Active') ? '#10b981' : entry.name.includes('Passive') ? '#64748b' : '#f59e0b'} />
                            ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* --- SYSTEM LOGIC DEFINITIONS --- */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 mt-8">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <Info size={16}/> System Logic & Definitions
          </h3>
          <div className="grid md:grid-cols-2 gap-8 text-xs text-gray-500 dark:text-gray-400">
              
              {/* Logic Column 1 */}
              <div>
                  <h4 className="font-bold text-blue-600 mb-2">Preparation Phases</h4>
                  <ul className="space-y-2">
                      <li className="flex gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 mt-1"></span>
                          <span><strong>Mains:</strong> Triggered by "Answer Writing", "Essay", "Ethics", "Social Justice", or "IR". Focuses on subjective output.</span>
                      </li>
                      <li className="flex gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1"></span>
                          <span><strong>Prelims:</strong> Triggered by "Mock Tests", "PYQ Analysis", or "CSAT". Focuses on objective accuracy.</span>
                      </li>
                      <li className="flex gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 mt-1"></span>
                          <span><strong>Foundation:</strong> Default category (Reading, Videos). Represents core knowledge building.</span>
                      </li>
                  </ul>
              </div>

              {/* Logic Column 2 */}
              <div>
                  <h4 className="font-bold text-green-600 mb-2">Cognitive Load</h4>
                  <ul className="space-y-2">
                      <li className="flex gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 mt-1"></span>
                          <span><strong>Active (Output):</strong> Writing, Mocks, Solving. High brain usage, high retention. <em className="block text-gray-400">Target: `&gt;`50% of total time.</em></span>
                      </li>
                      <li className="flex gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-500 mt-1"></span>
                          <span><strong>Passive (Input):</strong> Reading, Watching, Listening. Essential but lower retention.</span>
                      </li>
                      <li className="flex gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1"></span>
                          <span><strong>Revision:</strong> Tasks explicitly marked as 'Revision'. The key to long-term memory.</span>
                      </li>
                  </ul>
              </div>

          </div>
      </div>

    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, sub }) {
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">{title}</span>
                <div className={`p-2 rounded-lg bg-gray-50 dark:bg-slate-700 ${color}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div>
                <div className="text-2xl font-black text-slate-800 dark:text-white">{value}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-1">{sub}</div>
            </div>
        </div>
    )
}