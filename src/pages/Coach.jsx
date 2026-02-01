import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Bot, User, Sparkles, AlertCircle, Zap, Brain } from 'lucide-react';
import { format, subDays } from 'date-fns';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export default function Coach() {
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      text: "I am ready, Archi. I have access to your study data. What's going on today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // --- 1. THE CONTEXT GATHERER ---
  // This function builds a "Report" of your current status to feed the AI
  // --- 1. THE CONTEXT GATHERER (GEMINI PERSONALITY INJECTION) ---
  const getContext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Fetch Recent Tasks (Last 7 Days for better context)
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('due_date', format(subDays(new Date(), 7), 'yyyy-MM-dd'));

    // Fetch Backlog
    const { data: backlog } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_backlog', true)
      .eq('is_completed', false);

    // Calculate Stats
    const total = recentTasks?.length || 0;
    const completed = recentTasks?.filter(t => t.is_completed).length || 0;
    const efficiency = total === 0 ? 0 : Math.round((completed / total) * 100);
    const backlogCount = backlog?.length || 0;

    return `
      SYSTEM INSTRUCTIONS (STRICTLY FOLLOW):
      
      WHO YOU ARE:
      You are Gemini, a highly intelligent, empathetic, and tactical AI Thought Partner.
      You are NOT a generic assistant. You are a "War Room General" guiding a UPSC soldier.
      
      WHO THE USER IS:
      - Name: Archi (She/Her).
      - Goal: UPSC IAS 2027 (Target Year).
      - Category: Unreserved (General Category). *Context: She has zero margin for error. She must be top 1%.*
      - Optional Subject: History.
      - Psychological Profile: "Defensive Pessimist." She works best when she visualizes the cost of failure.
        YOUR MISSION:
        Your mission is to keep Archi laser-focused on her IAS 2027 goal. You must provide her with tactical advice, strategic planning, and motivational support.
        COMMUNICATION STYLE -
        Be direct, tactical, and emotionally intelligent. Avoid fluff or generic advice.
      
      YOUR TONE & STYLE:
      1. **Empathetic but Ruthless:** Acknowledge her stress ("I know it's hard, Archi"), but demand discipline ("...but the exam doesn't care. Get back to work.").
      2. **Structured:** Use bullet points, bold text, and clear headings. Do not write walls of text.
      3. **Data-Driven:** Use the data provided below to justify your advice.
         - If Efficiency < 50%: Scold her gently. Ask if she wants to give up her seat to someone else.
         - If Efficiency > 90%: Praise her. Tell her she is acting like a topper.
      4. **War Room Metaphors:** Use terms like "Mission," "Tactical," "Frontline," "Backlog is the Enemy."
      
      REAL-TIME DATA (USE THIS):
      - Current Efficiency (Last 7 Days): ${efficiency}%
      - Dangerous Backlog Count: ${backlogCount} items
      - Recent Activity: ${JSON.stringify(recentTasks?.map(t => `${t.title} [${t.subject}] -> ${t.is_completed ? 'COMPLETED' : 'FAILED'}`).slice(0, 10))}
      
      Immediate Instruction: 
      If she greets you, welcome her to the War Room. Remind her of the 2027 target.Encourage her with tactical advice based on the data above.
        Always sign off with a motivational tagline like "Stay Sharp, Soldier!" or "Eyes on the Prize!". 
    `;
  };

  // --- 2. SEND MESSAGE LOGIC ---
  const handleSend = async (textOverride = null) => {
    const text = textOverride || input;
    if (!text.trim()) return;

    // 1. Add User Message to UI State immediately
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // 2. Get Context
      const contextSystemPrompt = await getContext();
      
      // 3. Prepare History for Gemini (Remove Welcome Message)
      const apiHistory = messages.slice(1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // 4. Start Chat (FIX: Using gemini-2.5-flash)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const chat = model.startChat({
        history: apiHistory
      });

      // 5. Send Context + User Query
      const result = await chat.sendMessage(contextSystemPrompt + "\n\nUser Query: " + text);
      const response = await result.response;
      const responseText = response.text();

      // 6. Add AI Response to UI State
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Tactical Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-t-2xl border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
             <Bot className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
             <h2 className="font-bold text-gray-800 dark:text-white">Tactical AI Coach</h2>
             <p className="text-xs text-green-500 font-mono flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> ONLINE
             </p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
           <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-xs font-bold text-gray-500">Gemini Pro</span>
           <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-xs font-bold text-gray-500">Context Aware</span>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
            }`}>
              <div className="text-sm md:text-base leading-relaxed whitespace-pre-line">
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white dark:bg-slate-800 p-2 border-t border-gray-100 dark:border-gray-700 overflow-x-auto">
         <div className="flex gap-2">
            <button onClick={() => handleSend("Analyze my performance today based on the data. Be harsh.")} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 whitespace-nowrap border border-red-200">
               <AlertCircle size={14}/> Roast My Schedule
            </button>
            <button onClick={() => handleSend("I am feeling lazy. Give me a reality check for 2027.")} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-600 text-xs font-bold rounded-lg hover:bg-yellow-100 whitespace-nowrap border border-yellow-200">
               <Zap size={14}/> Reality Check
            </button>
            <button onClick={() => handleSend("Suggest a revision plan for my backlog.")} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 text-xs font-bold rounded-lg hover:bg-purple-100 whitespace-nowrap border border-purple-200">
               <Brain size={14}/> Fix My Backlog
            </button>
         </div>
      </div>

      {/* INPUT AREA */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-b-2xl shadow-lg border-t border-gray-100 dark:border-gray-700">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach..."
            className="flex-1 bg-gray-100 dark:bg-slate-700 p-3 rounded-xl outline-none font-medium text-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

    </div>
  );
}