import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { User, UserCheck, UserX, Clock, Search, Briefcase, MapPin, TrendingUp } from 'lucide-react'

function App() {
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchData = useCallback(async (isInitial = false) => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCandidates(data)
      setSelectedCandidate(prev => {
        if (isInitial && data.length > 0 && !prev) return data[0];
        if (prev) return data.find(c => c.id === prev.id) || prev;
        return prev;
      });
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(true)
    const channel = supabase
      .channel('realtime-candidates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => {
        setTimeout(() => fetchData(false), 1000);
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  const updateStatus = async (id, newStatus) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
    await supabase.from('candidates').update({ status: newStatus }).eq('id', id)
  }

  const safeRender = (val) => {
    if (!val) return "Not specified";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === 'object') {
      return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return String(val);
  }

  const renderAnalysis = (analysisRaw) => {
    if (!analysisRaw || analysisRaw === "Pending AI Analysis...") {
      return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-900/20">
          <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 rounded-full mb-4"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest italic animate-pulse">AI is thinking...</p>
        </div>
      );
    }

    let parsedData = null;
    try {
      if (typeof analysisRaw === 'string') {
        const cleanJson = analysisRaw.replace(/```json|```/g, "").trim();
        parsedData = JSON.parse(cleanJson);
      } else {
        parsedData = analysisRaw;
      }
    } catch (e) {
      parsedData = { verdict: analysisRaw };
    }

    const getVal = (possibleKeys, fallback = "Not specified") => {
      for (const key of possibleKeys) {
        if (parsedData[key]) return safeRender(parsedData[key]);
      }
      return fallback;
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* 1. AI Verdict - Support for 'role_alignment', 'summary', and 'overall_summary' */}
        <div className="bg-gradient-to-r from-blue-600/10 to-transparent border-l-4 border-blue-500 p-6 rounded-2xl bg-slate-900/40">
          <h4 className="text-blue-400 font-black flex items-center gap-2 mb-3 text-xs uppercase tracking-widest">
            <UserCheck size={16}/> AI Verdict
          </h4>
          <p className="text-slate-200 text-sm leading-relaxed italic">
            {getVal(['role_alignment', 'summary', 'verdict', 'overall_summary', 'recommendation'])}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 2. Technical Alignment - Support for 'skill_match', 'technical_skills_match', and 'education_match' */}
          <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700/30 flex flex-col h-[220px]">
            <h4 className="text-green-400 font-bold flex items-center gap-2 mb-2 text-[10px] uppercase tracking-tighter shrink-0">
              <TrendingUp size={14}/> Technical Alignment
            </h4>
            <div className="text-slate-300 text-xs leading-relaxed overflow-y-auto pr-2 custom-scrollbar flex-1">
              {getVal(['skill_match', 'technical_skills_match', 'technical_alignment', 'skills_match', 'education_match'])}
            </div>
          </div>

          {/* 3. Location Match - Support for 'location_match' and 'strengths' */}
          <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700/30 flex flex-col h-[220px]">
            <h4 className="text-blue-400 font-bold flex items-center gap-2 mb-2 text-[10px] uppercase tracking-tighter shrink-0">
              <MapPin size={14}/> Location Match
            </h4>
            <div className="text-slate-300 text-xs leading-relaxed overflow-y-auto pr-2 custom-scrollbar flex-1">
              {getVal(['location_match', 'location_and_education', 'location', 'strengths'])}
            </div>
          </div>
        </div>

        {/* 4. Gaps - Support for 'weaknesses', 'experience_match', and 'skill_gaps' */}
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-[2rem]">
          <h4 className="text-red-400 font-black flex items-center gap-2 mb-3 text-xs uppercase tracking-widest">
            <UserX size={16}/> Lacking Skills & Gaps
          </h4>
          <div className="text-slate-300 text-sm leading-relaxed">
            {getVal(['weaknesses', 'experience_match', 'missing_skills', 'skill_gaps', 'experience_gap', 'soft_skills_match'], "No major gaps identified.")}
          </div>
        </div>
      </div>
    );
  };

  const filteredCandidates = candidates.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && candidates.length === 0) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-blue-500 font-black animate-pulse tracking-[0.5em]">SYSTEM STARTING...</div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <div className="w-80 bg-slate-900/40 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-800">
          <h1 className="text-2xl font-black text-blue-500 italic tracking-tighter uppercase">AI HR HELPER</h1>
          <div className="relative mt-6">
            <Search className="absolute left-4 top-3 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search talent..." 
              className="w-full bg-slate-800/30 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-xs focus:outline-none focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredCandidates.map((candidate) => (
            <div 
              key={candidate.id}
              onClick={() => setSelectedCandidate(candidate)}
              className={`p-6 border-b border-slate-800/50 cursor-pointer transition-all ${
                selectedCandidate?.id === candidate.id ? 'bg-blue-600/10 border-l-4 border-l-blue-600' : 'hover:bg-slate-800/30'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-sm truncate w-36">{candidate.full_name}</h3>
                <span className={`text-[7px] px-2 py-1 rounded font-black uppercase ${
                  candidate.status === 'selected' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                  candidate.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                  candidate.status === 'shortlisted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500'
                }`}>
                  {candidate.status || 'Pending'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-bold">Score: {candidate.match_score}%</span>
                <span className="text-[8px] text-slate-700">{new Date(candidate.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 bg-slate-950 custom-scrollbar">
        {selectedCandidate ? (
          <div className="max-w-5xl mx-auto">
            <div className="bg-slate-900/80 p-10 rounded-[3rem] border border-slate-800 mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-3xl">
                  <User size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">{selectedCandidate.full_name}</h2>
                  <p className="text-blue-400 font-bold text-xs uppercase mt-1 tracking-widest">{selectedCandidate.applied_job_title}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {['shortlisted', 'selected', 'rejected'].map((status) => (
                  <button 
                    key={status}
                    onClick={() => updateStatus(selectedCandidate.id, status)} 
                    className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCandidate.status === status ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800/50">
                <h3 className="text-[10px] font-black mb-10 text-blue-500 uppercase tracking-[0.4em] italic">AI Deep Analysis Report</h3>
                {renderAnalysis(selectedCandidate.ai_analysis)}
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800/50 text-center">
                  <div className="text-7xl font-black mb-2 text-blue-500">{selectedCandidate.match_score}%</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Match Score</div>
                </div>
                
                <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 space-y-4">
                  <a href={selectedCandidate.resume_url} target="_blank" rel="noreferrer" className="block w-full text-center bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all">View CV</a>
                  <a href={selectedCandidate.linkedin_url} target="_blank" rel="noreferrer" className="block w-full text-center border border-slate-700 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-white transition-all">LinkedIn</a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center opacity-10">
            <h1 className="text-6xl font-black tracking-[0.5em] italic uppercase">LeadVault AI</h1>
          </div>
        )}
      </div>
    </div>
  )
}

export default App