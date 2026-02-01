import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, Check, AlertTriangle, BookOpen, Calendar as CalIcon, 
  Clock, RotateCw, ChevronLeft, ChevronRight, AlertCircle, 
  Play, Pause, Edit2, X, MoveRight, Layers 
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, endOfWeek, startOfMonth, 
  endOfMonth, addMinutes, isSameDay, parse, isValid, parseISO 
} from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// --- COMPONENT START ---
export default function Tasks() {
  // Data State
  const [tasks, setTasks] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // View State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('Daily'); 
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }

  // Reschedule Modal State
  const [rescheduleTask, setRescheduleTask] = useState(null); // Task being moved
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState('09:00');

  // Form State
  const [form, setForm] = useState({
    subject: 'Polity', 
    subjectCustom: '', 
    topic: '',
    mode: 'Reading', 
    duration: 60, 
    start_time: '09:00', 
    notes: ''
  });
  const [editingId, setEditingId] = useState(null);

  // Timer State
  const [timer, setTimer] = useState({ seconds: 0, isRunning: false });
  const [shiftMinutes, setShiftMinutes] = useState('');

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    fetchTasks();
    fetchBacklog();
  }, [selectedDate, viewMode]);

  useEffect(() => {
    let interval = null;
    if (timer.isRunning) {
      interval = setInterval(() => setTimer(t => ({ ...t, seconds: t.seconds + 1 })), 1000);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning]);

  // Toast Helper
  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- 2. DATA FETCHING ---
  const fetchTasks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let startDate = selectedDate;
    let endDate = selectedDate;

    if (viewMode === 'Weekly') {
      startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
      endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else if (viewMode === 'Monthly') {
      startDate = startOfMonth(selectedDate);
      endDate = endOfMonth(selectedDate);
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_backlog', false)
      .gte('due_date', format(startDate, 'yyyy-MM-dd'))
      .lte('due_date', format(endDate, 'yyyy-MM-dd'))
      .order('start_time', { ascending: true });

    if (error) console.error("Fetch Error:", error);
    if (!error) setTasks(data || []);
    setLoading(false);
  };

  const fetchBacklog = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_backlog', true)
      .eq('is_completed', false);
    setBacklogTasks(data || []);
  };

  // --- 3. ANALYTICS ---
  const getAnalytics = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.is_completed && t.quality_tag === 'Deep Work').length;
    let totalMins = 0;
    let deepMins = 0;

    tasks.forEach(t => {
      if (t.is_completed) {
        totalMins += (t.duration || 0);
        if (t.quality_tag === 'Deep Work') deepMins += (t.duration || 0);
      }
    });

    return { 
      countStr: `${completed} / ${total}`,
      efficiency: total === 0 ? 0 : Math.round((completed / total) * 100),
      totalHours: (totalMins / 60).toFixed(1),
      deepHours: (deepMins / 60).toFixed(1)
    };
  };

  // --- 4. TASK CREATION ---
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const finalSubject = form.subject === 'Other' ? form.subjectCustom : form.subject;

    const payload = {
      title: form.topic,
      subject: finalSubject,
      type: form.mode,
      mode: form.mode,
      duration: parseInt(form.duration) || 60,
      start_time: form.start_time,
      notes: form.notes,
      user_id: user.id,
      due_date: format(selectedDate, 'yyyy-MM-dd'),
      quality_tag: 'Pending',
      is_backlog: false,
      is_completed: false
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from('tasks').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('tasks').insert([payload]);
      error = err;
    }

    if (error) {
      console.error("Save Error:", error);
      showToast(`Failed: ${error.message}`, 'error');
    } else {
      showToast(editingId ? 'Task Updated' : 'Mission Added', 'success');
      setEditingId(null);
      setForm({ 
        subject: 'Polity', subjectCustom: '', topic: '', 
        mode: 'Reading', duration: 60, start_time: '09:00', notes: '' 
      });
      fetchTasks();
    }
  };

  // --- 5. ACTIONS & COMPLETION ---
  const handleComplete = async (task, quality) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (quality === 'Distracted') {
      setRescheduleTask(task);
      setRescheduleDate(addDays(new Date(), 1)); 
      return; 
    }

    if (quality === 'Skimmed') {
      // 1. Create a CLONE in the Backlog
      // We explicitly save "Skimmed on [Date]" in notes for history tracking
      const { error: backlogError } = await supabase.from('tasks').insert([{
        title: `Revise: ${task.title}`, 
        subject: task.subject,
        type: 'Revision', 
        mode: 'Revision',
        duration: parseInt(task.duration) || 30, 
        user_id: user.id,
        due_date: format(new Date(), 'yyyy-MM-dd'), 
        is_backlog: true, 
        is_completed: false, 
        quality_tag: 'Backlog',
        notes: `Skimmed on ${task.due_date}. Original notes: ${task.notes || 'None'}`
      }]);

      if (backlogError) {
        console.error("Backlog Error:", backlogError);
        showToast("Failed to add to backlog", "error");
      } else {
        showToast('Moved to Weekend Backlog', 'warning');
        fetchBacklog();
      }
    } else {
      showToast('Task Completed. Well done.', 'success');
    }

    // 2. Mark CURRENT task as Done
    const updates = { 
      is_completed: true, 
      quality_tag: quality,
      completed_at: new Date().toISOString() 
    };

    await supabase.from('tasks').update(updates).eq('id', task.id);
    fetchTasks();
  };

  // Logic to Move Backlog Item to Today's Completed List
  const completeBacklogItem = async (task) => {
    const now = new Date();
    
    // Move task from "Backlog" to "Today's List" and mark Completed
    const { error } = await supabase.from('tasks').update({
       is_completed: true,
       is_backlog: false, // Remove from sidebar
       due_date: format(now, 'yyyy-MM-dd'), // Move to Today
       completed_at: now.toISOString(),
       quality_tag: 'Deep Work' // Mark as properly done
    }).eq('id', task.id);
  
    if (!error) {
       showToast('Restored & Completed!', 'success');
       fetchBacklog(); // Remove from sidebar
       fetchTasks();   // Add to main list (today)
    } else {
       showToast('Error clearing backlog', 'error');
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleTask) return;
    
    await supabase.from('tasks').update({
      due_date: format(rescheduleDate, 'yyyy-MM-dd'),
      start_time: rescheduleTime,
      quality_tag: 'Pending'
    }).eq('id', rescheduleTask.id);

    showToast(`Rescheduled to ${format(rescheduleDate, 'MMM d')}`, 'warning');
    setRescheduleTask(null);
    fetchTasks();
  };

  // --- 6. SHIFT LOGIC ---
  const handleShift = async () => {
    if (!shiftMinutes) return;
    const shiftMins = parseInt(shiftMinutes);
    const pendingTasks = tasks.filter(t => !t.is_completed && t.due_date === format(selectedDate, 'yyyy-MM-dd'));
    
    for (const task of pendingTasks) {
      if (task.start_time) {
        const [h, m] = task.start_time.split(':').map(Number);
        const oldDate = new Date(); oldDate.setHours(h, m, 0);
        const newDate = addMinutes(oldDate, shiftMins);
        await supabase.from('tasks').update({ start_time: format(newDate, 'HH:mm') }).eq('id', task.id);
      }
    }
    setShiftMinutes('');
    fetchTasks();
    showToast(`Schedule Shifted +${shiftMins}m`, 'success');
  };

  // Helper: Calculate End Time
  const getEndTime = (start, duration) => {
    if (!start || !duration) return '--:--';
    const [h, m] = start.split(':').map(Number);
    const end = addMinutes(new Date().setHours(h, m), duration);
    return format(end, 'HH:mm');
  };

  // --- 7. EDITING LOGIC ---
  const handleEdit = (task) => {
    setEditingId(task.id);

    // Check if the current subject is in our standard list, else set to 'Other'
    const standardSubjects = [
      'History (Optional)', 'Polity', 'Economy', 'Geography', 'Environment', 
      'Science & Tech', 'International Relations', 'Ethics (GS4)', 
      'Social Justice', 'Art & Culture', 'CSAT', 'Current Affairs', 'Essay'
    ];
    const isStandard = standardSubjects.includes(task.subject);

    setForm({
      subject: isStandard ? task.subject : 'Other',
      subjectCustom: isStandard ? '' : task.subject,
      topic: task.title, 
      mode: task.type || 'Reading', 
      duration: task.duration,
      start_time: task.start_time,
      notes: task.notes || ''
    });

    const formElement = document.getElementById('task-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };


  const analytics = getAnalytics();

  return (
    <div className="space-y-6 pb-24 relative">
      
      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-xl font-bold text-white animate-bounce 
          ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-yellow-500' : 'bg-green-600'}`}>
          {toast.message}
        </div>
      )}

      {/* --- RESCHEDULE MODAL --- */}
      {rescheduleTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <RotateCw className="text-blue-500"/> Reschedule Task
            </h3>
            <p className="text-sm text-gray-500 mb-4">When will you tackle "{rescheduleTask.title}"?</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">New Date</label>
                <DatePicker 
                  selected={rescheduleDate} onChange={d => setRescheduleDate(d)}
                  className="w-full bg-gray-100 dark:bg-slate-700 p-2 rounded border dark:border-slate-600 font-bold outline-none" 
                  dateFormat="MMM d, yyyy"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">New Slot</label>
                <input 
                  type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-slate-700 p-2 rounded border dark:border-slate-600 font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setRescheduleTask(null)} className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg font-bold">Cancel</button>
              <button onClick={confirmReschedule} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Confirm Move</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER & ANALYTICS --- */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Timer */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-mono text-blue-300">SESSION STOPWATCH</div>
            <div className="text-4xl font-mono font-bold tracking-widest">
              {new Date(timer.seconds * 1000).toISOString().substr(11, 8)}
            </div>
          </div>
          <button onClick={() => setTimer(t => ({ ...t, isRunning: !t.isRunning }))} className={`p-4 rounded-full transition-all ${timer.isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {timer.isRunning ? <Pause /> : <Play />}
          </button>
        </div>

        {/* New Split Analytics */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-blue-100 grid grid-cols-4 gap-1 shadow-sm">
          <div className="bg-blue-50 dark:bg-slate-700/50 rounded-xl p-3 text-center flex flex-col justify-center">
             <div className="text-lg font-black text-blue-700 dark:text-blue-300">{analytics.countStr}</div>
             <div className="text-[10px] uppercase font-bold text-gray-400">Tasks Done</div>
          </div>
          <div className="bg-green-50 dark:bg-slate-700/50 rounded-xl p-3 text-center flex flex-col justify-center">
             <div className="text-lg font-black text-green-700 dark:text-green-300">{analytics.efficiency}%</div>
             <div className="text-[10px] uppercase font-bold text-gray-400">Efficiency</div>
          </div>
          <div className="bg-purple-50 dark:bg-slate-700/50 rounded-xl p-3 text-center flex flex-col justify-center">
             <div className="text-lg font-black text-purple-700 dark:text-purple-300">{analytics.totalHours}h</div>
             <div className="text-[10px] uppercase font-bold text-gray-400">Total Time</div>
          </div>
          <div className="bg-amber-50 dark:bg-slate-700/50 rounded-xl p-3 text-center flex flex-col justify-center">
             <div className="text-lg font-black text-amber-700 dark:text-amber-300">{analytics.deepHours}h</div>
             <div className="text-[10px] uppercase font-bold text-gray-400">Deep Focus</div>
          </div>
        </div>
      </div>

      {/* --- DATE NAV --- */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between gap-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
           <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
              {['Daily', 'Weekly', 'Monthly'].map(m => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 rounded-md text-sm font-bold ${viewMode === m ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>{m}</button>
              ))}
           </div>
           <DatePicker 
             selected={selectedDate} onChange={d => setSelectedDate(d)} 
             className="bg-gray-100 dark:bg-slate-700 p-2 rounded-lg font-bold text-center w-40 cursor-pointer outline-none hover:bg-gray-300 hover:text-black" 
             dateFormat="EEE, MMM d"
           />
        </div>
        <div className="flex items-center gap-2">
           <input type="number" placeholder="Mins Late?" value={shiftMinutes} onChange={e => setShiftMinutes(e.target.value)} className="w-24 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-rose-700 font-bold outline-none" />
           <button onClick={handleShift} className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-lg font-bold text-sm">Shift All</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* --- MAIN TASK LIST --- */}
        <div className="lg:col-span-2 space-y-4">
          
        {/* --- CREATE TASK FORM --- */}
        <form id="task-form" onSubmit={handleSaveTask} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-md">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                {editingId ? <Edit2 size={18}/> : <Plus size={18}/>} 
                {editingId ? 'Edit Mission' : 'New Mission Objective'}
              </h3>
              {editingId && (
                <button type="button" onClick={() => {setEditingId(null); setForm({subject: 'Polity', topic: '', mode: 'Reading', duration: 60, start_time: '09:00', notes: ''})}} className="text-sm text-red-500 hover:underline">Cancel Edit</button>
              )}
          </div>

          {/* ROW 1: Subject & Topic */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Subject Selection */}
              <div className="space-y-1 grid col-span-1 md:col-span-3">
                <label className="text-xs font-bold text-gray-400 uppercase">Subject</label>
                <div className="flex gap-2">
                    <select 
                      className="flex-1 bg-gray-50 dark:bg-slate-700 p-3 rounded-lg font-medium outline-none border border-gray-200 dark:border-gray-600 focus:border-blue-500" 
                      value={form.subject} 
                      onChange={e => setForm({...form, subject: e.target.value})}
                    >
                      <option>History (Optional)</option>
                      <option>Polity</option>
                      <option>Economy</option>
                      <option>Geography</option>
                      <option>Environment</option>
                      <option>Science & Tech</option>
                      <option>International Relations</option>
                      <option>Ethics (GS4)</option>
                      <option>Social Justice</option>
                      <option>Art & Culture</option>
                      <option>CSAT</option>
                      <option>Current Affairs</option>
                      <option>Essay</option>
                      <option>Other</option>
                    </select>
                    {/* Show Manual Input if 'Other' is selected */}
                    {form.subject === 'Other' && (
                      <input 
                        type="text" 
                        placeholder="Enter Subject..." 
                        className="flex-1 bg-gray-50 dark:bg-slate-700 p-3 rounded-lg outline-none border border-gray-200 dark:border-gray-600 focus:border-blue-500" 
                        value={form.subjectCustom} 
                        onChange={e => setForm({...form, subjectCustom: e.target.value})} 
                      />
                    )}
                </div>
              </div>

              {/* Topic Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Topic Name</label>
                <input 
                  className="w-full bg-gray-50 dark:bg-slate-700 p-3 rounded-lg font-medium outline-none border border-gray-200 dark:border-gray-600 focus:border-blue-500" 
                  placeholder="e.g., Revolt of 1857" 
                  value={form.topic} 
                  onChange={e => setForm({...form, topic: e.target.value})} 
                  required 
                />
              </div>
          </div>

          {/* ROW 2: Time, Duration, Mode */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Start Time</label>
                <input 
                  type="time" 
                  className="w-full bg-gray-50 dark:bg-slate-700 p-3 rounded-lg outline-none border border-gray-200 dark:border-gray-600" 
                  value={form.start_time} 
                  onChange={e => setForm({...form, start_time: e.target.value})} 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Duration (Min)</label>
                <input 
                  type="number" 
                  className="w-full bg-gray-50 dark:bg-slate-700 p-3 rounded-lg outline-none border border-gray-200 dark:border-gray-600" 
                  value={form.duration} 
                  onChange={e => setForm({...form, duration: e.target.value})} 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">End Time (Auto)</label>
                <div className="w-full p-3 bg-gray-100 dark:bg-slate-900 text-gray-500 rounded-lg font-mono text-sm">
                    {(() => {
                        if(!form.start_time) return '--:--';
                        const [h, m] = form.start_time.split(':').map(Number);
                        const end = addMinutes(new Date().setHours(h, m), parseInt(form.duration) || 0);
                        return format(end, 'HH:mm');
                    })()}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Mode</label>
                <select 
                  className="w-full bg-gray-50 dark:bg-slate-700 p-3 rounded-lg outline-none border border-gray-200 dark:border-gray-600" 
                  value={form.mode} 
                  onChange={e => setForm({...form, mode: e.target.value})}
                >
                  <option>Reading</option>
                  <option>Video Lecture</option>
                  <option>Audio/Podcast</option>
                  <option>Writing/Notes</option>
                  <option>Answer Writing</option>
                  <option>Mock Test</option>
                  <option>PYQ Analysis</option>
                  <option>Revision</option>
                </select>
              </div>
          </div>

          {/* ROW 3: Notes & Action */}
          <div className="space-y-1 mb-4">
              <label className="text-xs font-bold text-gray-400 uppercase">Notes (Optional)</label>
              <textarea 
                placeholder="Add key points, page numbers, or reminders..." 
                value={form.notes} 
                onChange={e => setForm({...form, notes: e.target.value})} 
                className="w-full p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-gray-600 outline-none h-20 text-sm resize-none focus:border-blue-500"
              ></textarea>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
              {editingId ? <Edit2 size={20}/> : <Plus size={20}/>} 
              {editingId ? 'Update Mission Objective' : 'Add to Schedule'}
          </button>
        </form>

          {/* Task Cards List */}
          <div className="space-y-3">
            {tasks.map((task) => {
              // Helper: Determine Styles based on Status
              const isSkimmed = task.is_completed && task.quality_tag === 'Skimmed';
              const isDeepWork = task.is_completed && task.quality_tag === 'Deep Work';
              
              // Border Color Logic
              let borderClass = 'border-blue-500 hover:shadow-md'; // Default Pending
              if (isDeepWork) borderClass = 'border-green-500 opacity-70 bg-green-50/10';
              if (isSkimmed) borderClass = 'border-yellow-500 bg-yellow-50/30'; // Yellow for Skimmed

              return (
                <div key={task.id} className={`relative p-4 rounded-xl border-l-4 shadow-sm transition-all bg-white dark:bg-slate-800 ${borderClass}`}>
                  
                  {!task.is_completed && (
                    <button 
                      onClick={() => handleEdit(task)}
                      className="absolute top-3 right-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}

                  {task.is_completed && (
                    <button 
                      onClick={async () => {
                        const { error } = await supabase
                          .from('tasks')
                          .update({ 
                            is_completed: false, 
                            quality_tag: 'Pending',
                            completed_at: null 
                          })
                          .eq('id', task.id);
                          
                        if(!error) {
                          showToast('Task Re-opened', 'info');
                          fetchTasks();
                        }
                      }}
                      className="absolute bottom-3 right-3 text-xs text-red-400 hover:text-red-600 font-bold underline"
                    >
                      Undo / Re-open
                    </button>
                  )}

                  {/* STATUS BADGE (Top Right) */}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
    
                    {/* 1. COMPLETED DATE BADGE */}
                    {task.is_completed && task.completed_at && (
                      <div className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        task.quality_tag === 'Skimmed' 
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                          : 'bg-green-100 text-green-700 border-green-200'
                      }`}>
                        {task.quality_tag === 'Skimmed' ? '⚠️ Skimmed on' : '✅ Done on'} {format(parseISO(task.completed_at), 'd MMM hh:mm:ss a')}
                      </div>
                    )}

                    {/* 2. ORIGINAL SKIMMED DATE BADGE (Extracts from Notes) */}
                    {(() => {
                      // Check if notes contain the "Skimmed on" history
                      if (task.notes && task.notes.includes('Skimmed on')) {
                          // Extract the date string roughly
                          const dateMatch = task.notes.match(/Skimmed on (\d{4}-\d{2}-\d{2})/);
                          if (dateMatch) {
                            return (
                              <div className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                                ⚠️ Originally Skimmed: {dateMatch[1]}
                              </div>
                            );
                          }
                      }
                      return null;
                    })()}
                  </div>

                  <div className="flex gap-4">
                    {/* Time Block */}
                    <div className="flex flex-col items-center justify-center min-w-[70px] bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                      <span className="text-lg font-bold text-gray-800 dark:text-white">{task.start_time}</span>
                      <span className="text-xs text-gray-400 mb-1">to</span>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{getEndTime(task.start_time, task.duration)}</span>
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${task.is_completed ? 'text-gray-500' : 'dark:text-white'} ${isSkimmed ? 'text-yellow-700 dark:text-yellow-500' : ''}`}>
                        {task.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase">{task.subject}</span>
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded">{task.mode || task.type}</span> 
                          {/* Note: 'type' is the DB column, 'mode' is form state. Displaying either works. */}
                          {task.notes && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded truncate max-w-[150px]">{task.notes}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Action Footer (Only show if NOT completed) */}
                  {!task.is_completed && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => handleComplete(task, 'Deep Work')} className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded flex justify-center items-center gap-2 transition-colors">
                          <Check size={14}/> Deep Focus
                      </button>
                      <button onClick={() => handleComplete(task, 'Skimmed')} className="flex-1 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-bold rounded flex justify-center items-center gap-2 transition-colors">
                          <Layers size={14}/> Skimmed
                      </button>
                      <button onClick={() => handleComplete(task, 'Distracted')} className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded flex justify-center items-center gap-2 transition-colors">
                          <RotateCw size={14}/> Reschedule
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* --- BACKLOG SIDEBAR --- */}
        <div className="space-y-4">
           <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-5 rounded-2xl">
              <h3 className="text-yellow-800 dark:text-yellow-500 font-bold flex items-center gap-2 mb-4">
                 <AlertCircle size={20}/> Weekend Backlog
              </h3>
              {backlogTasks.length === 0 ? <p className="text-sm italic text-yellow-600/60">No backlog.</p> : (
                 <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {backlogTasks.map(bt => (
                       <div key={bt.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-yellow-100 dark:border-slate-700">
                          <div className="font-bold text-gray-800 dark:text-white mb-1">{bt.title}</div>
                          <div className="flex flex-wrap gap-1 mb-2">
                             <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-[10px] rounded uppercase font-bold">{bt.subject}</span>
                             <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-[10px] rounded">{bt.duration}mins</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2 italic">"{bt.notes}"</div>
                          <button onClick={() => completeBacklogItem(bt)} className="w-full py-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold text-xs rounded-lg">
                             Mark Cleared
                          </button>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        <div className="bg-blue-50 dark:bg-slate-800 p-5 rounded-2xl border border-blue-100">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Instructions</h3>
            <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
               <li>Use "Daily" view to add specific tasks.</li>
               <li>If "Skimmed", task goes to Backlog automatically.</li>
               <li>Backlog items stay until you mark them complete.</li>
               <li>"Shift Schedule" pushes pending tasks forward if you are late.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}