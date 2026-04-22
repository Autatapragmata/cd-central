import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const TEAM_MEMBERS = [
  { id: 1, name: 'Alice Walker', role: 'Lead Designer', workload: 85, projects: 3, allocations: [{ name: 'Design System Reboot', percentage: 40 }, { name: 'Q3 Product Launch', percentage: 30 }, { name: 'Marketing Site', percentage: 15 }] },
  { id: 2, name: 'Bob Chen', role: 'Frontend Engineer', workload: 60, projects: 2, allocations: [{ name: 'Mobile App Beta', percentage: 40 }, { name: 'Design System Reboot', percentage: 20 }] },
  { id: 3, name: 'Clara Diaz', role: 'Product Manager', workload: 95, projects: 4, allocations: [{ name: 'Q3 Product Launch', percentage: 40 }, { name: 'Mobile App Beta', percentage: 30 }, { name: 'Infrastructure Scale', percentage: 15 }, { name: 'User Research', percentage: 10 }] },
  { id: 4, name: 'David Smith', role: 'Backend Engineer', workload: 40, projects: 1, allocations: [{ name: 'Infrastructure Scale', percentage: 40 }] },
];

const WORKSTREAMS = [
  { id: 1, name: 'Q3 Product Launch', status: 'On Track', progress: 75, lead: 'Clara Diaz' },
  { id: 2, name: 'Design System Reboot', status: 'At Risk', progress: 40, lead: 'Alice Walker' },
  { id: 3, name: 'Infrastructure Scale', status: 'On Track', progress: 90, lead: 'David Smith' },
  { id: 4, name: 'Mobile App Beta', status: 'Delayed', progress: 20, lead: 'Bob Chen' },
];

const PRIORITIES = [
  { id: 1, kicker: 'Critical Path', title: 'Accelerate User Onboarding', description: 'Decrease time to first value by 20% by simplifying the signup flow.', progress: 72 },
  { id: 2, kicker: 'In Progress', title: 'SOC2 Compliance Audit', description: 'Complete all security policy reviews and technical implementations by end of August.', progress: 35 },
];

type Member = typeof TEAM_MEMBERS[number];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.7rem', letterSpacing: '0.14em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />
      {children}
    </p>
  );
}

function WorkloadBadge({ workload }: { workload: number }) {
  const isHigh = workload >= 90;
  const isOpen = workload < 50;
  const label = isHigh ? 'High' : isOpen ? 'Open' : 'Ideal';
  const style: React.CSSProperties = isHigh
    ? { background: 'rgba(255,74,28,0.15)', color: 'var(--signal)', border: '1px solid rgba(255,74,28,0.3)' }
    : isOpen
    ? { background: 'rgba(228,255,71,0.12)', color: 'var(--citron)', border: '1px solid rgba(228,255,71,0.25)' }
    : { background: 'rgba(240,235,226,0.07)', color: 'var(--stone)', border: '1px solid var(--ash)' };
  return (
    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', ...style }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isRisk = status === 'At Risk';
  const isDelayed = status === 'Delayed';
  const style: React.CSSProperties = isDelayed
    ? { background: 'rgba(255,74,28,0.15)', color: 'var(--signal)', border: '1px solid rgba(255,74,28,0.3)' }
    : isRisk
    ? { background: 'rgba(255,74,28,0.08)', color: '#FF8A6A', border: '1px solid rgba(255,74,28,0.2)' }
    : { background: 'rgba(228,255,71,0.10)', color: 'var(--citron)', border: '1px solid rgba(228,255,71,0.2)' };
  return (
    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', ...style }}>
      {status}
    </span>
  );
}

function ProgressBar({ value, signal = false }: { value: number; signal?: boolean }) {
  return (
    <div style={{ width: '100%', height: 2, background: 'var(--ash)', borderRadius: 2, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{ height: '100%', background: signal ? 'var(--signal)' : 'var(--graphite)', borderRadius: 2 }}
      />
    </div>
  );
}

export default function App() {
  const [dateStr, setDateStr] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    setDateStr(`${mm} / ${dd} / ${yy}`);
  }, []);

  const handleMemberClick = (member: Member) => {
    setSelectedMember(prev => prev?.id === member.id ? null : member);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)', color: 'var(--ink)', padding: 'clamp(1.5rem, 4vw, 2.5rem)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--ash)', paddingBottom: '1.5rem', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 400, fontVariationSettings: '"SOFT" 20, "opsz" 144', letterSpacing: '-0.04em', lineHeight: 0.92, margin: 0, color: 'var(--ink)' }}>
            Portal.V2
          </h1>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.22em', color: 'var(--stone)', marginTop: '0.75rem', textTransform: 'uppercase' }}>
            Internal Project Management &amp; Workload System
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', color: 'var(--graphite)', margin: 0, fontWeight: 400 }}>
            {dateStr}
          </p>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: 'var(--stone)', marginTop: '4px', textTransform: 'uppercase' }}>
            Central Standard Time
          </p>
        </div>
      </header>

      {/* Main Grid */}
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', flex: 1 }}>

        {/* Priority Initiatives */}
        <section>
          <SectionLabel>Priority Initiatives</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {PRIORITIES.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                style={{ background: 'var(--paper)', border: `1px solid ${i === 0 ? 'rgba(255,74,28,0.3)' : 'var(--ash)'}`, borderRadius: 4, padding: '1.5rem', opacity: i === 0 ? 1 : 0.65 }}
              >
                <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.12em', color: i === 0 ? 'var(--signal)' : 'var(--stone)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
                  {p.kicker}
                </p>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 400, fontVariationSettings: '"SOFT" 30, "opsz" 144', letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 0.5rem', color: 'var(--ink)' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--stone)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                  {p.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--stone)', textTransform: 'uppercase' }}>Progress</span>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '1.1rem', color: 'var(--ink)' }}>{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} signal={i === 0} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Major Workstreams */}
        <section>
          <SectionLabel>Major Workstreams</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {WORKSTREAMS.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
                style={{ background: 'var(--paper)', border: '1px solid var(--ash)', borderLeft: `2px solid ${ws.status === 'On Track' ? '#4A4A3A' : 'var(--signal)'}`, padding: '1rem 1.25rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0, color: 'var(--ink)' }}>{ws.name}</p>
                    <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', margin: '3px 0 0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Lead: {ws.lead}
                    </p>
                  </div>
                  <StatusBadge status={ws.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progress</span>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.95rem', color: 'var(--graphite)' }}>{ws.progress}%</span>
                </div>
                <ProgressBar value={ws.progress} signal={ws.status !== 'On Track'} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Team Workload */}
        <section>
          <SectionLabel>Team Workload</SectionLabel>

          <div style={{ display: 'flex', gap: '0.75rem', minHeight: 0 }}>
            {/* Member list — compact when someone is selected, card grid otherwise */}
            <motion.div
              layout
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: selectedMember ? '0.375rem' : '0.625rem', width: selectedMember ? '160px' : '100%', flexShrink: 0 }}
            >
              {TEAM_MEMBERS.map((member, i) => {
                const isSelected = selectedMember?.id === member.id;
                return selectedMember ? (
                  /* Compact row */
                  <motion.button
                    key={member.id}
                    layout
                    onClick={() => handleMemberClick(member)}
                    style={{ background: isSelected ? 'var(--paper)' : 'transparent', border: `1px solid ${isSelected ? 'rgba(255,74,28,0.3)' : 'var(--ash)'}`, borderRadius: 4, padding: '0.625rem 0.75rem', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 120ms, border-color 120ms' }}
                  >
                    <p style={{ fontSize: '0.78rem', fontWeight: 500, color: isSelected ? 'var(--ink)' : 'var(--graphite)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name.split(' ')[0]}</p>
                    <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.58rem', color: 'var(--stone)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{member.workload}%</p>
                  </motion.button>
                ) : (
                  /* Full card */
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
                    onClick={() => handleMemberClick(member)}
                    style={{ background: 'var(--paper)', border: '1px solid var(--ash)', borderRadius: 4, padding: '1rem', cursor: 'pointer', transition: 'border-color 120ms' }}
                    whileHover={{ borderColor: 'rgba(240,235,226,0.15)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '0.9rem', margin: 0, color: 'var(--ink)' }}>{member.name}</p>
                        <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{member.role}</p>
                      </div>
                      <WorkloadBadge workload={member.workload} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Capacity</span>
                      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.95rem', color: 'var(--ink)' }}>{member.workload}%</span>
                    </div>
                    <ProgressBar value={member.workload} signal={member.workload >= 90} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--ash)' }}>
                      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects</span>
                      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.75rem', color: 'var(--graphite)' }}>{member.projects}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Detail panel — slides in when a member is selected */}
            <AnimatePresence>
              {selectedMember && (
                <motion.div
                  key={selectedMember.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flex: 1, background: 'var(--paper)', border: '1px solid rgba(255,74,28,0.2)', borderRadius: 4, padding: '1.25rem', overflow: 'hidden' }}
                >
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 400, fontVariationSettings: '"SOFT" 20, "opsz" 144', letterSpacing: '-0.03em', lineHeight: 1, margin: '0 0 4px', color: 'var(--ink)' }}>
                      {selectedMember.name}
                    </h2>
                    <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
                      {selectedMember.role}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--ash)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Capacity</span>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '1.5rem', color: selectedMember.workload >= 90 ? 'var(--signal)' : 'var(--ink)', lineHeight: 1 }}>
                      {selectedMember.workload}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedMember.allocations.map((alloc, i) => (
                      <motion.div
                        key={alloc.name}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--graphite)', fontWeight: 400 }}>{alloc.name}</span>
                          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.85rem', color: 'var(--ink)' }}>{alloc.percentage}%</span>
                        </div>
                        <ProgressBar value={alloc.percentage} signal={alloc.percentage >= 40} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--ash)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Session: 4920-A</span>
          <span>Status: Synchronized</span>
          <span>Server: US-EAST-1</span>
        </div>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Secure Access Portal — V2.4.1
        </span>
      </footer>
    </div>
  );
}
