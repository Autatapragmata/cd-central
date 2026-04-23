import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// ─── Data ────────────────────────────────────────────────────────────────────

const TEAM_MEMBERS = [
  {
    id: 1, name: 'Alice Walker', role: 'Lead Designer', workload: 85, projects: 3,
    allocations: [{ name: 'Design System Reboot', percentage: 40 }, { name: 'Q3 Product Launch', percentage: 30 }, { name: 'Marketing Site', percentage: 15 }],
    schedule: { hourly: [70, 90, 85, 75, 80, 90, 60, 50], daily: [85, 90, 75, 80, 70, 85, 90, 80, 75, 60] },
  },
  {
    id: 2, name: 'Bob Chen', role: 'Frontend Engineer', workload: 60, projects: 2,
    allocations: [{ name: 'Mobile App Beta', percentage: 40 }, { name: 'Design System Reboot', percentage: 20 }],
    schedule: { hourly: [40, 60, 70, 55, 65, 50, 40, 45], daily: [60, 65, 55, 70, 45, 60, 50, 65, 55, 40] },
  },
  {
    id: 3, name: 'Clara Diaz', role: 'Product Manager', workload: 95, projects: 4,
    allocations: [{ name: 'Q3 Product Launch', percentage: 40 }, { name: 'Mobile App Beta', percentage: 30 }, { name: 'Infrastructure Scale', percentage: 15 }, { name: 'User Research', percentage: 10 }],
    schedule: { hourly: [90, 100, 95, 85, 100, 90, 80, 95], daily: [95, 100, 90, 85, 95, 100, 90, 95, 80, 85] },
  },
  {
    id: 4, name: 'David Smith', role: 'Backend Engineer', workload: 40, projects: 1,
    allocations: [{ name: 'Infrastructure Scale', percentage: 40 }],
    schedule: { hourly: [50, 40, 35, 60, 30, 45, 40, 25], daily: [40, 50, 35, 45, 30, 40, 55, 30, 45, 35] },
  },
];

const WORKSTREAMS = [
  { id: 1, name: 'Q3 Product Launch', status: 'On Track', progress: 75, lead: 'Clara Diaz' },
  { id: 2, name: 'Design System Reboot', status: 'At Risk', progress: 40, lead: 'Alice Walker' },
  { id: 3, name: 'Infrastructure Scale', status: 'On Track', progress: 90, lead: 'David Smith' },
  { id: 4, name: 'Mobile App Beta', status: 'Delayed', progress: 20, lead: 'Bob Chen' },
];

type PriorityEvent = { label: string; date: string };
type Priority = {
  id: number; kicker: string; title: string; description: string;
  nextStep: string; events: PriorityEvent[]; notes: string[];
};

const INITIAL_PRIORITIES: Priority[] = [
  {
    id: 1, kicker: 'Critical Path', title: 'Accelerate User Onboarding',
    description: 'Decrease time to first value by 20% by simplifying the signup flow.',
    nextStep: 'Finalize revised signup flow mockups with design team',
    events: [{ label: 'Design Review', date: 'Apr 24' }, { label: 'Eng Handoff', date: 'Apr 29' }, { label: 'Beta Launch', date: 'May 12' }],
    notes: [],
  },
  {
    id: 2, kicker: 'In Progress', title: 'SOC2 Compliance Audit',
    description: 'Complete all security policy reviews and technical implementations by end of August.',
    nextStep: 'Submit access control policy docs to auditor',
    events: [{ label: 'Auditor Check-in', date: 'Apr 26' }, { label: 'Policy Deadline', date: 'May 9' }],
    notes: [],
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type Member = typeof TEAM_MEMBERS[number];
type Period = 'day' | 'week' | '2w';
type DetailTab = 'alloc' | 'notes';

type ActionItem = { id: string; text: string; done: boolean; carriedOver?: boolean };
type WeeklyEntry = { weekStart: string; notes: string; actionItems: ActionItem[] };
type AllNotes = Record<string, Record<string, WeeklyEntry>>; // `${memberId}` → weekStart → entry

// ─── Week utilities ──────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function shiftWeek(monday: Date, weeks: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function toWeekKey(monday: Date): string {
  return monday.toISOString().split('T')[0];
}

function formatWeekRange(monday: Date): string {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(friday)}`;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const NOTES_KEY = 'portal-v2-notes';

function loadNotes(): AllNotes {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}'); } catch { return {}; }
}

function saveNotes(notes: AllNotes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function getOrCreateEntry(
  allNotes: AllNotes, memberId: number, weekKey: string, prevWeekKey: string
): WeeklyEntry {
  const memberNotes = allNotes[memberId] ?? {};
  if (memberNotes[weekKey]) return memberNotes[weekKey];
  // Seed with incomplete items from previous week
  const carried: ActionItem[] = (memberNotes[prevWeekKey]?.actionItems ?? [])
    .filter(a => !a.done)
    .map(a => ({ ...a, id: crypto.randomUUID(), carriedOver: true, done: false }));
  return { weekStart: weekKey, notes: '', actionItems: carried };
}

// ─── AI ──────────────────────────────────────────────────────────────────────

async function aiGenerateActionItems(notesText: string): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const ai = new GoogleGenAI({ apiKey: key });
  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `You are a helpful assistant. From the following meeting notes, extract a list of clear, specific action items. Return ONLY a valid JSON array of strings — no markdown, no code fences, no explanation.\n\nNotes:\n${notesText}`,
  });
  const raw = result.text?.trim() ?? '[]';
  return JSON.parse(raw);
}

// ─── Shared style primitives ─────────────────────────────────────────────────

const monoSm: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem',
  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
};

const inputBase: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace", background: 'var(--bone)',
  border: '1px solid var(--ash)', borderRadius: 3,
  color: 'var(--ink)', outline: 'none', userSelect: 'text' as const,
};

// ─── Components ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...monoSm, fontSize: '0.7rem', color: 'var(--stone)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />
      {children}
    </p>
  );
}

function WorkloadBadge({ workload }: { workload: number }) {
  const isHigh = workload >= 90, isOpen = workload < 50;
  const label = isHigh ? 'High' : isOpen ? 'Open' : 'Ideal';
  const style: React.CSSProperties = isHigh
    ? { background: 'rgba(255,74,28,0.15)', color: 'var(--signal)', border: '1px solid rgba(255,74,28,0.3)' }
    : isOpen
    ? { background: 'rgba(228,255,71,0.12)', color: 'var(--citron)', border: '1px solid rgba(228,255,71,0.25)' }
    : { background: 'rgba(240,235,226,0.07)', color: 'var(--stone)', border: '1px solid var(--ash)' };
  return <span style={{ ...monoSm, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 999, ...style }}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const style: React.CSSProperties = status === 'Delayed'
    ? { background: 'rgba(255,74,28,0.15)', color: 'var(--signal)', border: '1px solid rgba(255,74,28,0.3)' }
    : status === 'At Risk'
    ? { background: 'rgba(255,74,28,0.08)', color: '#FF8A6A', border: '1px solid rgba(255,74,28,0.2)' }
    : { background: 'rgba(228,255,71,0.10)', color: 'var(--citron)', border: '1px solid rgba(228,255,71,0.2)' };
  return <span style={{ ...monoSm, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 999, ...style }}>{status}</span>;
}

function ProgressBar({ value, signal = false }: { value: number; signal?: boolean }) {
  return (
    <div style={{ width: '100%', height: 2, background: 'var(--ash)', borderRadius: 2, overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{ height: '100%', background: signal ? 'var(--signal)' : 'var(--graphite)', borderRadius: 2 }} />
    </div>
  );
}

const DAY_LABELS = ['9', '10', '11', '12', '1', '2', '3', '4'];
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F'];
const BIWEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'M', 'T', 'W', 'T', 'F'];

function MiniBarChart({ schedule, period }: { schedule: { hourly: number[]; daily: number[] }; period: Period }) {
  const values = period === 'day' ? schedule.hourly : period === 'week' ? schedule.daily.slice(0, 5) : schedule.daily;
  const labels = period === 'day' ? DAY_LABELS : period === 'week' ? WEEK_LABELS : BIWEEK_LABELS;
  const peak = Math.max(...values, 1);
  const BAR_H = 42;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: BAR_H, borderBottom: '1px solid var(--ash)' }}>
        {values.map((v, i) => (
          <motion.div key={`${period}-${i}`}
            initial={{ height: 0 }} animate={{ height: Math.max((v / peak) * BAR_H, 2) }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
            style={{ flex: 1, background: v >= 85 ? 'var(--signal)' : v <= 30 ? 'var(--citron)' : 'var(--graphite)', borderRadius: '1px 1px 0 0', opacity: 0.85 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ flex: 1, fontFamily: "'Geist Mono', monospace", fontSize: '0.52rem', color: 'var(--stone)', textAlign: 'center' }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const options: { key: Period; label: string }[] = [{ key: 'day', label: 'Day' }, { key: 'week', label: 'Wk' }, { key: '2w', label: '2W' }];
  return (
    <div style={{ display: 'flex', border: '1px solid var(--ash)', borderRadius: 3, overflow: 'hidden' }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{ ...monoSm, fontSize: '0.6rem', padding: '3px 8px', background: value === o.key ? 'var(--ash)' : 'transparent', color: value === o.key ? 'var(--ink)' : 'var(--stone)', border: 'none', borderLeft: o.key !== 'day' ? '1px solid var(--ash)' : 'none', cursor: 'pointer', transition: 'background 120ms, color 120ms' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Weekly Notes Panel ───────────────────────────────────────────────────────

function WeeklyNotesPanel({ member, allNotes, onUpdate }: {
  member: Member;
  allNotes: AllNotes;
  onUpdate: (updated: AllNotes) => void;
}) {
  const [weekMonday, setWeekMonday] = useState(() => getMondayOf(new Date()));
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const newItemRef = useRef<HTMLInputElement>(null);

  const weekKey = toWeekKey(weekMonday);
  const prevKey = toWeekKey(shiftWeek(weekMonday, -1));

  const entry: WeeklyEntry = getOrCreateEntry(allNotes, member.id, weekKey, prevKey);

  // Persist entry whenever it's first created (carry-forward)
  useEffect(() => {
    const memberNotes = allNotes[member.id] ?? {};
    if (!memberNotes[weekKey]) {
      const updated = { ...allNotes, [member.id]: { ...memberNotes, [weekKey]: entry } };
      onUpdate(updated);
    }
  }, [weekKey, member.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchEntry = useCallback((patch: Partial<WeeklyEntry>) => {
    const memberNotes = allNotes[member.id] ?? {};
    const updated = { ...allNotes, [member.id]: { ...memberNotes, [weekKey]: { ...entry, ...patch } } };
    onUpdate(updated);
  }, [allNotes, member.id, weekKey, entry, onUpdate]);

  const toggleItem = (id: string) => {
    patchEntry({ actionItems: entry.actionItems.map(a => a.id === id ? { ...a, done: !a.done } : a) });
  };

  const deleteItem = (id: string) => {
    patchEntry({ actionItems: entry.actionItems.filter(a => a.id !== id) });
  };

  const addItem = (text: string) => {
    if (!text.trim()) return;
    patchEntry({ actionItems: [...entry.actionItems, { id: crypto.randomUUID(), text: text.trim(), done: false }] });
    setNewItemText('');
  };

  const handleGenerate = async () => {
    if (!entry.notes.trim()) { setAiError('Add some notes first.'); return; }
    setGenerating(true);
    setAiError('');
    try {
      const items = await aiGenerateActionItems(entry.notes);
      const newItems: ActionItem[] = items.map(text => ({ id: crypto.randomUUID(), text, done: false }));
      patchEntry({ actionItems: [...entry.actionItems, ...newItems] });
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const carried = entry.actionItems.filter(a => a.carriedOver);
  const fresh = entry.actionItems.filter(a => !a.carriedOver);

  const ghostBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Geist Mono', monospace", fontSize: '0.6rem',
    letterSpacing: '0.08em', color: 'var(--stone)', padding: '2px 4px',
    borderRadius: 2, transition: 'color 120ms',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

      {/* Week navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setWeekMonday(shiftWeek(weekMonday, -1))} style={{ ...ghostBtn }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}>
          ←
        </button>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.68rem', color: 'var(--graphite)', letterSpacing: '0.06em' }}>
          {formatWeekRange(weekMonday)}
        </span>
        <button onClick={() => setWeekMonday(shiftWeek(weekMonday, 1))} style={{ ...ghostBtn }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}>
          →
        </button>
      </div>

      {/* Notes textarea */}
      <textarea
        value={entry.notes}
        onChange={e => patchEntry({ notes: e.target.value })}
        placeholder="Notes from this week's 1:1…"
        rows={5}
        style={{ ...inputBase, width: '100%', fontSize: '0.8rem', padding: '0.625rem 0.75rem', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' as const }}
      />

      {/* Generate button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', background: generating ? 'var(--ash)' : 'var(--signal)', color: generating ? 'var(--stone)' : 'var(--paper)', border: 'none', borderRadius: 3, cursor: generating ? 'default' : 'pointer', transition: 'background 120ms' }}
        >
          {generating ? 'Generating…' : '✦ Generate action items'}
        </button>
        {aiError && <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.6rem', color: 'var(--signal)' }}>{aiError}</span>}
      </div>

      {/* Action items */}
      {(entry.actionItems.length > 0 || newItemText !== undefined) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p style={{ ...monoSm, fontSize: '0.6rem', color: 'var(--stone)', margin: '0 0 0.35rem' }}>Action Items</p>

          {/* Carried-over items */}
          <AnimatePresence>
            {carried.map(item => (
              <motion.div key={item.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--ash)', opacity: item.done ? 0.4 : 1 }}
              >
                <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)}
                  style={{ marginTop: 2, accentColor: 'var(--signal)', flexShrink: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--graphite)', flex: 1, lineHeight: 1.4, textDecoration: item.done ? 'line-through' : 'none' }}>
                  {item.text}
                </span>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.58rem', color: 'var(--stone)', flexShrink: 0 }}>↑</span>
                <button onClick={() => deleteItem(item.id)} style={{ ...ghostBtn, padding: '0 2px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--signal)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}>×</button>
              </motion.div>
            ))}
          </AnimatePresence>

          {carried.length > 0 && fresh.length > 0 && (
            <div style={{ height: 1, background: 'var(--ash)', margin: '0.25rem 0' }} />
          )}

          {/* Fresh items */}
          <AnimatePresence>
            {fresh.map(item => (
              <motion.div key={item.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.3rem 0', opacity: item.done ? 0.4 : 1 }}
              >
                <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)}
                  style={{ marginTop: 2, accentColor: 'var(--signal)', flexShrink: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--graphite)', flex: 1, lineHeight: 1.4, textDecoration: item.done ? 'line-through' : 'none' }}>
                  {item.text}
                </span>
                <button onClick={() => deleteItem(item.id)} style={{ ...ghostBtn, padding: '0 2px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--signal)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}>×</button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Inline add */}
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
            <input
              ref={newItemRef}
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(newItemText); }}
              placeholder="Add item…"
              style={{ ...inputBase, flex: 1, fontSize: '0.78rem', padding: '4px 8px' }}
            />
            <button onClick={() => addItem(newItemText)}
              style={{ ...ghostBtn, border: '1px solid var(--ash)', borderRadius: 3, padding: '4px 8px', color: 'var(--graphite)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--graphite)')}>
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Priority Card ────────────────────────────────────────────────────────────

type EditingDate = { priorityId: number; eventIndex: number };

function PriorityCard({ priority, isCritical, index, onUpdateDate, onAddNote, onDeleteNote }: {
  key?: React.Key;
  priority: Priority; isCritical: boolean; index: number;
  onUpdateDate: (priorityId: number, eventIndex: number, date: string) => void;
  onAddNote: (priorityId: number, text: string) => void;
  onDeleteNote: (priorityId: number, noteIndex: number) => void;
}) {
  const [editing, setEditing] = useState<EditingDate | null>(null);
  const [dateDraft, setDateDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const startEditDate = (eventIndex: number, currentDate: string) => {
    setEditing({ priorityId: priority.id, eventIndex });
    setDateDraft(currentDate);
    setTimeout(() => dateInputRef.current?.select(), 0);
  };

  const commitDate = () => {
    if (editing && dateDraft.trim()) onUpdateDate(editing.priorityId, editing.eventIndex, dateDraft.trim());
    setEditing(null);
  };

  const commitNote = () => {
    if (noteDraft.trim()) onAddNote(priority.id, noteDraft.trim());
    setAddingNote(false);
    setNoteDraft('');
  };

  const accent = isCritical ? 'var(--signal)' : 'var(--stone)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }}
      style={{ background: 'var(--paper)', border: `1px solid ${isCritical ? 'rgba(255,74,28,0.3)' : 'var(--ash)'}`, borderRadius: 4, padding: '1.5rem', opacity: isCritical ? 1 : 0.72 }}
    >
      <p style={{ ...monoSm, fontSize: '0.65rem', color: accent, margin: '0 0 0.5rem' }}>{priority.kicker}</p>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 400, fontVariationSettings: '"SOFT" 30, "opsz" 144', letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 0.5rem', color: 'var(--ink)' }}>
        {priority.title}
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--stone)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>{priority.description}</p>

      <div style={{ borderTop: '1px solid var(--ash)', paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
        <p style={{ ...monoSm, fontSize: '0.6rem', color: 'var(--stone)', margin: '0 0 0.35rem' }}>Next Step</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--graphite)', margin: 0, lineHeight: 1.45 }}>{priority.nextStep}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: priority.notes.length || addingNote ? '1rem' : 0 }}>
        {priority.events.map((ev, ei) => {
          const isEditingThis = editing?.priorityId === priority.id && editing?.eventIndex === ei;
          return (
            <div key={ev.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--graphite)' }}>{ev.label}</span>
              {isEditingThis ? (
                <input ref={dateInputRef} value={dateDraft} onChange={e => setDateDraft(e.target.value)}
                  onBlur={commitDate} onKeyDown={e => { if (e.key === 'Enter') commitDate(); if (e.key === 'Escape') setEditing(null); }}
                  style={{ ...inputBase, fontSize: '0.72rem', padding: '1px 6px', width: '72px', textAlign: 'right' }} />
              ) : (
                <button onClick={() => startEditDate(ei, ev.date)} title="Click to edit"
                  style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.72rem', color: accent, background: 'none', border: 'none', cursor: 'text', padding: '1px 4px', borderRadius: 2, transition: 'background 120ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ash)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {ev.date}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {priority.notes.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--ash)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
            <p style={{ ...monoSm, fontSize: '0.6rem', color: 'var(--stone)', margin: '0 0 0.4rem' }}>Notes</p>
            {priority.notes.map((note, ni) => (
              <motion.div key={ni} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--graphite)', margin: 0, lineHeight: 1.45, flex: 1 }}>— {note}</p>
                <button onClick={() => onDeleteNote(priority.id, ni)}
                  style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.65rem', color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', transition: 'color 120ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--signal)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}>×</button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addingNote && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }} style={{ overflow: 'hidden', marginBottom: '0.5rem' }}>
            <textarea ref={noteInputRef} value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitNote(); } if (e.key === 'Escape') { setAddingNote(false); setNoteDraft(''); } }}
              placeholder="Add a note… (Enter to save, Esc to cancel)" rows={2}
              style={{ ...inputBase, width: '100%', fontSize: '0.8rem', padding: '0.5rem 0.625rem', resize: 'none', lineHeight: 1.45, display: 'block', boxSizing: 'border-box' as const }} />
          </motion.div>
        )}
      </AnimatePresence>

      {!addingNote && (
        <button onClick={() => { setAddingNote(true); setTimeout(() => noteInputRef.current?.focus(), 0); }}
          style={{ ...monoSm, fontSize: '0.62rem', color: 'var(--stone)', background: 'none', border: '1px dashed var(--ash)', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', marginTop: priority.notes.length > 0 ? 0 : '0.875rem', display: 'block', width: '100%', transition: 'border-color 120ms, color 120ms' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--stone)'; e.currentTarget.style.color = 'var(--graphite)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ash)'; e.currentTarget.style.color = 'var(--stone)'; }}>
          + Add note
        </button>
      )}
    </motion.div>
  );
}

// ─── Member Detail Panel ──────────────────────────────────────────────────────

function MemberDetailPanel({ member, allNotes, onNotesUpdate }: {
  member: Member;
  allNotes: AllNotes;
  onNotesUpdate: (updated: AllNotes) => void;
}) {
  const [tab, setTab] = useState<DetailTab>('alloc');

  const tabBtn = (t: DetailTab, label: string) => (
    <button onClick={() => setTab(t)} style={{ ...monoSm, fontSize: '0.6rem', padding: '4px 10px', background: tab === t ? 'var(--ash)' : 'transparent', color: tab === t ? 'var(--ink)' : 'var(--stone)', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--signal)' : 'transparent'}`, cursor: 'pointer', transition: 'color 120ms, background 120ms' }}>
      {label}
    </button>
  );

  return (
    <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid rgba(255,74,28,0.2)', borderRadius: 4, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden', minWidth: 0 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 400, fontVariationSettings: '"SOFT" 20, "opsz" 144', letterSpacing: '-0.03em', lineHeight: 1, margin: '0 0 4px', color: 'var(--ink)' }}>
          {member.name}
        </h2>
        <p style={{ ...monoSm, fontSize: '0.62rem', color: 'var(--stone)', margin: 0 }}>{member.role}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ash)', marginBottom: '0.25rem' }}>
        {tabBtn('alloc', 'Allocations')}
        {tabBtn('notes', 'Weekly Notes')}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'alloc' ? (
          <motion.div key="alloc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--ash)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ ...monoSm, fontSize: '0.62rem', color: 'var(--stone)' }}>Total Capacity</span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '1.5rem', color: member.workload >= 90 ? 'var(--signal)' : 'var(--ink)', lineHeight: 1 }}>{member.workload}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {member.allocations.map((alloc, i) => (
                <motion.div key={alloc.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--graphite)' }}>{alloc.name}</span>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.85rem', color: 'var(--ink)' }}>{alloc.percentage}%</span>
                  </div>
                  <ProgressBar value={alloc.percentage} signal={alloc.percentage >= 40} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'auto', flex: 1 }}>
            <WeeklyNotesPanel member={member} allNotes={allNotes} onUpdate={onNotesUpdate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [dateStr, setDateStr] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>(INITIAL_PRIORITIES);
  const [period, setPeriod] = useState<Period>('week');
  const [allNotes, setAllNotes] = useState<AllNotes>(loadNotes);

  useEffect(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    setDateStr(`${mm} / ${dd} / ${yy}`);
  }, []);

  const handleNotesUpdate = useCallback((updated: AllNotes) => {
    setAllNotes(updated);
    saveNotes(updated);
  }, []);

  const handleMemberClick = (member: Member) => {
    setSelectedMember(prev => prev?.id === member.id ? null : member);
  };

  const updateDate = (priorityId: number, eventIndex: number, date: string) => {
    setPriorities(prev => prev.map(p => p.id !== priorityId ? p : { ...p, events: p.events.map((ev, i) => i === eventIndex ? { ...ev, date } : ev) }));
  };
  const addNote = (priorityId: number, text: string) => {
    setPriorities(prev => prev.map(p => p.id !== priorityId ? p : { ...p, notes: [...p.notes, text] }));
  };
  const deleteNote = (priorityId: number, noteIndex: number) => {
    setPriorities(prev => prev.map(p => p.id !== priorityId ? p : { ...p, notes: p.notes.filter((_, i) => i !== noteIndex) }));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bone)', color: 'var(--ink)', padding: 'clamp(1.5rem, 4vw, 2.5rem)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--ash)', paddingBottom: '1.5rem', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 400, fontVariationSettings: '"SOFT" 20, "opsz" 144', letterSpacing: '-0.04em', lineHeight: 0.92, margin: 0, color: 'var(--ink)' }}>Portal.V2</h1>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.22em', color: 'var(--stone)', marginTop: '0.75rem', textTransform: 'uppercase' }}>
            Internal Project Management &amp; Workload System
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', color: 'var(--graphite)', margin: 0 }}>{dateStr}</p>
          <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: 'var(--stone)', marginTop: '4px', textTransform: 'uppercase' }}>Central Standard Time</p>
        </div>
      </header>

      {/* Main Grid */}
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', flex: 1 }}>

        {/* Priority Initiatives */}
        <section>
          <SectionLabel>Priority Initiatives</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {priorities.map((p, i) => (
              <PriorityCard key={p.id} priority={p} isCritical={i === 0} index={i}
                onUpdateDate={updateDate} onAddNote={addNote} onDeleteNote={deleteNote} />
            ))}
          </div>
        </section>

        {/* Major Workstreams */}
        <section>
          <SectionLabel>Major Workstreams</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {WORKSTREAMS.map((ws, i) => (
              <motion.div key={ws.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
                style={{ background: 'var(--paper)', border: '1px solid var(--ash)', borderLeft: `2px solid ${ws.status === 'On Track' ? '#4A4A3A' : 'var(--signal)'}`, padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0, color: 'var(--ink)' }}>{ws.name}</p>
                    <p style={{ ...monoSm, fontSize: '0.62rem', color: 'var(--stone)', margin: '3px 0 0' }}>Lead: {ws.lead}</p>
                  </div>
                  <StatusBadge status={ws.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <span style={{ ...monoSm, fontSize: '0.62rem', color: 'var(--stone)' }}>Progress</span>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.95rem', color: 'var(--graphite)' }}>{ws.progress}%</span>
                </div>
                <ProgressBar value={ws.progress} signal={ws.status !== 'On Track'} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Team Workload */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ ...monoSm, fontSize: '0.7rem', color: 'var(--stone)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />
              Team Workload
            </p>
            <PeriodToggle value={period} onChange={setPeriod} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', minHeight: 0 }}>
            {/* Member list */}
            <motion.div layout transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: selectedMember ? '0.375rem' : '0.625rem', width: selectedMember ? '160px' : '100%', flexShrink: 0 }}>
              {TEAM_MEMBERS.map((member, i) => {
                const isSelected = selectedMember?.id === member.id;
                return selectedMember ? (
                  <motion.button key={member.id} layout onClick={() => handleMemberClick(member)}
                    style={{ background: isSelected ? 'var(--paper)' : 'transparent', border: `1px solid ${isSelected ? 'rgba(255,74,28,0.3)' : 'var(--ash)'}`, borderRadius: 4, padding: '0.625rem 0.75rem', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 120ms, border-color 120ms' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 500, color: isSelected ? 'var(--ink)' : 'var(--graphite)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name.split(' ')[0]}</p>
                    <p style={{ ...monoSm, fontSize: '0.58rem', color: 'var(--stone)', margin: '2px 0 0' }}>{member.workload}%</p>
                  </motion.button>
                ) : (
                  <motion.div key={member.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
                    onClick={() => handleMemberClick(member)}
                    style={{ background: 'var(--paper)', border: '1px solid var(--ash)', borderRadius: 4, padding: '1rem', cursor: 'pointer', transition: 'border-color 120ms' }}
                    whileHover={{ borderColor: 'rgba(240,235,226,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '0.9rem', margin: 0, color: 'var(--ink)' }}>{member.name}</p>
                        <p style={{ ...monoSm, fontSize: '0.62rem', color: 'var(--stone)', margin: '3px 0 0' }}>{member.role}</p>
                      </div>
                      <WorkloadBadge workload={member.workload} />
                    </div>
                    <MiniBarChart schedule={member.schedule} period={period} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--ash)' }}>
                      <span style={{ ...monoSm, fontSize: '0.62rem', color: 'var(--stone)' }}>Projects</span>
                      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.75rem', color: 'var(--graphite)' }}>{member.projects}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Detail panel */}
            <AnimatePresence>
              {selectedMember && (
                <motion.div key={selectedMember.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }} style={{ flex: 1, minWidth: 0 }}>
                  <MemberDetailPanel member={selectedMember} allNotes={allNotes} onNotesUpdate={handleNotesUpdate} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--ash)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Session: 4920-A</span><span>Status: Synchronized</span><span>Server: US-EAST-1</span>
        </div>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '0.62rem', color: 'var(--stone)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Secure Access Portal — V2.4.1</span>
      </footer>
    </div>
  );
}
