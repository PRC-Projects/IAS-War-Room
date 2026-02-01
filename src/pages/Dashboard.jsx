import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Link } from 'react-router-dom';
import { 
  Shield, Clock, Radio, Youtube, Newspaper, ArrowRight, Play, ExternalLink, RefreshCw 
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY_2);

// High-quality thumbnails for the "Video Grid" look
const THUMBNAILS = [
  "https://images.unsplash.com/photo-1577985051167-0d49eec21977?q=80&w=800&auto=format&fit=crop", // Library
  "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&auto=format&fit=crop", // Books
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop", // Graph
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop", // Study
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop", // News
  "https://images.unsplash.com/photo-1555421689-d68471e189f2?q=80&w=800&auto=format&fit=crop", // Laptop
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop", // Library 2
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop"  // Notes
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [timeLeft, setTimeLeft] = useState({});
  const [recentTasks, setRecentTasks] = useState([]);
  const [backlogCount, setBacklogCount] = useState(0);
  
  // AI Intel State
  const [aiBriefing, setAiBriefing] = useState("Initializing Mission Control...");
  const [recommendations, setRecommendations] = useState([]); // Array of 8 topics

  // Target Date: May 26, 2027 (Estimated)
  const TARGET_DATE = new Date('2027-05-26T00:00:00');

  useEffect(() => {
    fetchData();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateTimeLeft = () => {
    const difference = +TARGET_DATE - +new Date();
    if (difference > 0) {
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    }
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Get Recent Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(8); // Fetch more for better context

    // 2. Backlog
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_backlog', true)
      .eq('is_completed', false);

    setRecentTasks(tasks || []);
    setBacklogCount(count || 0);

    // 3. AI Generation
    if (tasks && tasks.length > 0) {
        generateAiBriefing(tasks);
    } else {
        setAiBriefing("No mission data. Complete tasks to unlock the War Room Video Feed.");
        setLoading(false);
    }
  };

  const generateAiBriefing = async (tasks) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const taskContext = tasks.map(t => t.title + " (" + t.subject + ")").join(", ");
        
        const prompt = `
            User: UPSC Aspirant (Archi). 
            Recent Study: ${taskContext}.
            
            1. Write a sharp 2-sentence "SitRep" (Situation Report).
            2. Generate exactly 8 "Video/News Recommendation Topics" related to her study.
            For each topic, provide a short "Reason" why she needs to watch it (e.g. "Critical for Mains", "High Yield Prelims").
            
            Return ONLY JSON: 
            { 
              "briefing": "...", 
              "recommendations": [
                { "topic": "Topic Name 1", "reason": "Reason 1" },
                ... (8 items)
              ]
            }
        `;
        
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        const cleanJson = response.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);
        
        setAiBriefing(data.briefing);
        setRecommendations(data.recommendations);
    } catch (error) {
        console.error("Intel Error", error);
        setAiBriefing("Tactical Uplink Offline.");
    } finally {
        setLoading(false);
    }
  };

  const safeFormatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'MMM d') : 'Unknown';
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* --- HERO: COUNTDOWN --- */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-700">
         <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
         <div className="relative p-8 md:p-12 text-center">
            <div className="flex justify-center items-center gap-2 mb-4 animate-pulse">
                <Shield className="text-red-500" size={20}/>
                <span className="text-red-400 font-mono text-xs uppercase tracking-[0.2em] font-bold">Operation UPSC - IAS 2027</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 font-mono">
               {timeLeft.days || '000'}
               <span className="text-lg md:text-2xl text-slate-500 font-sans font-normal ml-2 mr-6">DAYS</span>
               {timeLeft.hours || '00'}
               <span className="text-lg md:text-2xl text-slate-500 font-sans font-normal ml-2">H</span>
            </h1>

            <div className="flex justify-center gap-8 text-sm font-mono text-slate-400">
                <div className="flex flex-col items-center"><span className="text-2xl text-white font-bold">{timeLeft.minutes}</span><span>MINUTES</span></div>
                <div className="flex flex-col items-center"><span className="text-2xl text-red-500 font-bold">{timeLeft.seconds}</span><span>SECONDS</span></div>
            </div>
         </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* --- LEFT COL: MAIN CONTENT (3/4 Width) --- */}
        <div className="lg:col-span-3 space-y-6">
           
           {/* SITREP */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-l-4 border-blue-600 shadow-sm flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full shrink-0">
                  <Radio className="text-blue-600 animate-pulse" size={24}/> 
              </div>
              <div>
                  <h3 className="font-bold text-slate-700 dark:text-white text-lg">Morning Intelligence</h3>
                  {loading ? (
                      <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-64 mt-2 animate-pulse"></div>
                  ) : (
                      <p className="text-slate-600 dark:text-slate-300 italic mt-1 leading-relaxed">"{aiBriefing}"</p>
                  )}
              </div>
           </div>

           {/* YOUTUBE STYLE VIDEO GRID */}
           <div>
               <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                       <Youtube className="text-red-600" size={24}/> Tactical Video Feed
                   </h3>
                   <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                       AI RECRUITMENT: 8 TOPICS
                   </span>
               </div>

               {loading ? (
                   <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                       {[1,2,3,4].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>)}
                   </div>
               ) : (
                   <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                       {recommendations.map((rec, i) => (
                           <div key={i} className="group relative bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                               
                               {/* Thumbnail Section */}
                               <a 
                                 href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.topic + " UPSC")}`}
                                 target="_blank" rel="noreferrer"
                                 className="relative block h-40 overflow-hidden"
                               >
                                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all z-10"></div>
                                   <img 
                                      src={THUMBNAILS[i % THUMBNAILS.length]} 
                                      alt={rec.topic}
                                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                   />
                                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/20 backdrop-blur-[2px]">
                                       <div className="bg-red-600 text-white rounded-full p-3 shadow-lg transform scale-50 group-hover:scale-100 transition-transform">
                                           <Play fill="white" size={20}/>
                                       </div>
                                   </div>
                                   <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold z-20">
                                       HD
                                   </div>
                               </a>

                               {/* Content Section */}
                               <div className="p-4 flex flex-col flex-1">
                                   <h4 className="font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 mb-1" title={rec.topic}>
                                       {rec.topic}
                                   </h4>
                                   <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                                       {rec.reason}
                                   </p>

                                   {/* Footer Actions */}
                                   <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                                       <a 
                                         href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.topic + " UPSC")}`}
                                         target="_blank" rel="noreferrer"
                                         className="flex items-center gap-1 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                                       >
                                           <Play size={10} fill="currentColor"/> WATCH NOW
                                       </a>
                                       <a 
                                         href={`https://www.google.com/search?q=${encodeURIComponent(rec.topic + " UPSC current affairs")}&tbm=nws`}
                                         target="_blank" rel="noreferrer"
                                         className="text-gray-400 hover:text-blue-500 transition-colors"
                                         title="Read News"
                                       >
                                           <Newspaper size={16}/>
                                       </a>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               )}
           </div>

        </div>

        {/* --- RIGHT COL: SIDEBAR (1/4 Width) --- */}
        <div className="space-y-6">
            
            {/* BACKLOG STATUS */}
            <div className={`p-6 rounded-2xl border ${backlogCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold ${backlogCount > 0 ? 'text-red-700' : 'text-green-700'}`}>Backlog</h3>
                    <Shield size={20} className={backlogCount > 0 ? 'text-red-500' : 'text-green-500'}/>
                </div>
                <div className="text-4xl font-black text-slate-800 dark:text-black mb-1">{backlogCount}</div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Pending Missions</p>
                {backlogCount > 0 ? (
                    <Link to="/tasks" className="block mt-4 text-center py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
                        Clear Now
                    </Link>
                ) : (
                    <div className="mt-4 text-center py-2 bg-green-600 text-white text-xs font-bold rounded-lg">
                        All Clear
                    </div>
                )}
            </div>

            {/* RECENT LOGS */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2 text-sm">
                    <Clock size={16}/> Recent Comms
                </h3>
                <div className="space-y-3">
                    {recentTasks.map(task => (
                        <div key={task.id} className="text-xs border-l-2 border-green-500 pl-3 py-1 group cursor-default">
                            <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition-colors">{task.title}</div>
                            <div className="text-slate-400 mt-0.5">
                               {task.subject} • {safeFormatDate(task.created_at)}
                            </div>
                        </div>
                    ))}
                    {recentTasks.length === 0 && <div className="text-xs text-gray-400">No activity yet.</div>}
                </div>
                <Link 
                  to="/tasks"
                  className="w-full mt-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors"
                >
                    Task Manager <ArrowRight size={12}/>
                </Link>
            </div>

        </div>
      </div>
    </div>
  );
}