import React, { useState, useEffect } from 'react';
import { Briefcase, Users, Activity, Zap, X } from 'lucide-react';

const TEAM_MEMBERS = [
  { id: 1, name: 'Alice Walker', role: 'Lead Designer', workload: 85, projects: 3, allocations: [{name: 'Design System Reboot', percentage: 40}, {name: 'Q3 Product Launch', percentage: 30}, {name: 'Marketing Site', percentage: 15}] },
  { id: 2, name: 'Bob Chen', role: 'Frontend Engineer', workload: 60, projects: 2, allocations: [{name: 'Mobile App Beta', percentage: 40}, {name: 'Design System Reboot', percentage: 20}] },
  { id: 3, name: 'Clara Diaz', role: 'Product Manager', workload: 95, projects: 4, allocations: [{name: 'Q3 Product Launch', percentage: 40}, {name: 'Mobile App Beta', percentage: 30}, {name: 'Infrastructure Scale', percentage: 15}, {name: 'User Research', percentage: 10}] },
  { id: 4, name: 'David Smith', role: 'Backend Engineer', workload: 40, projects: 1, allocations: [{name: 'Infrastructure Scale', percentage: 40}] },
];

const WORKSTREAMS = [
  { id: 1, name: 'Q3 Product Launch', status: 'On Track', progress: 75, lead: 'Clara Diaz' },
  { id: 2, name: 'Design System Reboot', status: 'At Risk', progress: 40, lead: 'Alice Walker' },
  { id: 3, name: 'Infrastructure Scale', status: 'On Track', progress: 90, lead: 'David Smith' },
  { id: 4, name: 'Mobile App Beta', status: 'Delayed', progress: 20, lead: 'Bob Chen' },
];

const PRIORITIES = [
  { id: 1, kicker: 'Q3 Okr', title: 'Accelerate User Onboarding', description: 'Decrease time to first value by 20% by simplifying the signup flow.' },
  { id: 2, kicker: 'Critical', title: 'SOC2 Compliance Audit', description: 'Complete all security policy reviews and technical implementations by end of August.' },
];

export default function App() {
  const [dateStr, setDateStr] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    setDateStr(`${mm} / ${dd} / ${yy}`);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans p-4 md:p-10 flex flex-col overflow-x-hidden select-none">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/20 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none uppercase">Portal.V2</h1>
          <p className="text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] font-light opacity-60 mt-4 md:mt-2 uppercase">INTERNAL PROJECT MANAGEMENT & WORKLOAD SYSTEM</p>
        </div>
        <div className="md:text-right">
          <p className="text-2xl md:text-3xl font-light tabular-nums">{dateStr || '12 / 04 / 24'}</p>
          <p className="text-[10px] tracking-widest uppercase opacity-40 mt-1 md:scale-100 origin-left md:origin-right">Central Standard Time</p>
        </div>
      </header>

      <main className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-grow">
        {/* LEFT: PRIORITY INITIATIVES */}
        <section className="col-span-1 xl:col-span-4 flex flex-col">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-6 flex items-center">
            <span className="w-2 h-2 bg-red-500 mr-2"></span>
            Priority Initiatives
          </h2>
          <div className="space-y-4">
            {PRIORITIES.map((p, index) => (
              <div key={p.id} className={`bg-[#141414] border border-white/10 p-6 rounded-sm ${index > 0 ? 'opacity-60' : ''}`}>
                <p className={`text-[10px] ${index === 0 ? 'text-red-500' : 'text-white/50'} font-bold uppercase mb-1 italic`}>
                  {index === 0 ? 'Critical Path' : 'In Progress'} - {p.kicker}
                </p>
                <h3 className="text-3xl font-bold leading-tight">{p.title}</h3>
                <p className="text-sm text-white/50 mt-2">{p.description}</p>
                
                <div className="mt-4 flex justify-between items-end">
                  <span className="text-[10px] opacity-40 uppercase">Progress</span>
                  <span className="text-xl font-mono">{index === 0 ? '72%' : '35%'}</span>
                </div>
                <div className="w-full h-[2px] bg-white/10 mt-2">
                  <div className={`h-full ${index === 0 ? 'bg-red-500 w-[72%]' : 'bg-white/50 w-[35%]'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CENTER: MAJOR WORKSTREAMS */}
        <section className="col-span-1 xl:col-span-4 flex flex-col">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-6 flex items-center">
            <span className="w-2 h-2 bg-blue-500 mr-2"></span>
            Major Workstreams
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {WORKSTREAMS.map(ws => {
              const borderColor = ws.status === 'On Track' ? 'border-green-500' : ws.status === 'At Risk' ? 'border-yellow-500' : ws.status === 'Delayed' ? 'border-red-500' : 'border-white/20';
              const progressColor = ws.status === 'On Track' ? 'bg-green-500' : ws.status === 'At Risk' ? 'bg-yellow-500' : ws.status === 'Delayed' ? 'bg-red-500' : 'bg-white/20';
              return (
                <div key={ws.id} className={`flex flex-col p-4 bg-white/5 border-l-2 ${borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{ws.name}</p>
                      <p className="text-[10px] opacity-40 uppercase mt-1 flex items-center gap-1">
                        <Users size={10} /> Lead: {ws.lead}
                      </p>
                    </div>
                    <div className="text-right font-mono text-sm">{ws.status}</div>
                  </div>
                  <div className="mt-4 flex justify-between items-end">
                    <span className="text-[10px] opacity-40 uppercase font-bold flex items-center gap-1"><Activity size={10} /> Progress</span>
                    <span className="text-xl font-mono">{ws.progress}%</span>
                  </div>
                  <div className="w-full h-[2px] bg-white/10 mt-2">
                    <div className={`h-full ${progressColor}`} style={{ width: `${ws.progress}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT: TEAM WORKLOAD */}
        <section className="col-span-1 xl:col-span-4 flex flex-col">
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-6 flex items-center">
            <span className="w-2 h-2 bg-purple-500 mr-2"></span>
            Team Workload
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEAM_MEMBERS.map(member => {
              const isHigh = member.workload >= 90;
              const isIdeal = member.workload >= 50 && member.workload < 90;
              const badgeClass = isHigh ? 'bg-red-500/20 text-red-400' : isIdeal ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400';
              const label = isHigh ? 'High' : isIdeal ? 'Ideal' : 'Open';
              const barColor = isHigh ? 'bg-red-500' : isIdeal ? 'bg-yellow-500' : 'bg-green-500';
              
              const gradients = [
                'from-purple-500 to-pink-500',
                'from-blue-500 to-cyan-500',
                'from-orange-500 to-yellow-500',
                'from-indigo-500 to-purple-500'
              ];
              const gradient = gradients[(member.id - 1) % gradients.length];
              
              return (
                <div 
                  key={member.id} 
                  onClick={() => setSelectedMember(member)}
                  className="bg-[#1A1A1A] p-4 rounded-lg cursor-pointer hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 bg-gradient-to-tr ${gradient} rounded-full`}></div>
                    <span className={`text-[10px] ${badgeClass} px-2 py-0.5 rounded flex items-center gap-1 uppercase`}>
                      {isHigh && <Zap size={10} />}
                      {label}
                    </span>
                  </div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-[10px] opacity-50 uppercase">{member.role}</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] mb-1 italic opacity-80">
                      <span>Capacity</span>
                      <span>{member.workload}%</span>
                    </div>
                    <div className="h-1 bg-white/10">
                      <div className={`h-full ${barColor}`} style={{ width: `${member.workload}%` }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/10 text-[10px] opacity-60">
                    <span className="flex items-center gap-1"><Briefcase size={10} /> Projects</span>
                    <span className="font-mono">{member.projects}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Modal for Team Member Details */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 bg-opacity-90 backdrop-blur-sm" onClick={() => setSelectedMember(null)}>
          <div 
            className="bg-[#0A0A0A] border border-white/20 p-6 md:p-10 w-full max-w-lg shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-4xl font-black uppercase leading-tight text-white">{selectedMember.name}</h2>
            <p className="text-[10px] tracking-[0.2em] font-light opacity-60 mt-2 uppercase">{selectedMember.role}</p>

            <div className="mt-8">
              <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/50">Total Workload</span>
                <span className="text-3xl font-mono leading-none">{selectedMember.workload}%</span>
              </div>
              
              <div className="space-y-6 mt-6">
                {selectedMember.allocations.map((alloc: any, i: number) => {
                  const isHigh = alloc.percentage >= 40;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-sm uppercase">{alloc.name}</span>
                        <span className="font-mono text-lg">{alloc.percentage}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/10">
                        <div className={`h-full ${isHigh ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${alloc.percentage}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Bar */}
      <footer className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between text-[10px] tracking-widest uppercase gap-4 pb-4">
        <div className="flex gap-4 md:gap-8 opacity-40 flex-wrap">
          <span>Session: 4920-A</span>
          <span>Status: Synchronized</span>
          <span>Server: US-EAST-1</span>
        </div>
        <div className="font-bold md:text-right">SECURE ACCESS PORTAL — V2.4.1</div>
      </footer>
    </div>
  );
}
