import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Mic, MicOff, Send, Sparkles,
  ShieldAlert, Key, CheckCircle2, Copy, RefreshCw,
  ChevronDown, ChevronUp, Database, AlertCircle, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AiStatsService } from '../../services/aiStatsService';
import { voiceService } from '../../services/voiceService';

const PRESET_PROMPTS = [
  { icon: '💰', label: 'Revenue & Billing',     prompt: 'What is our total gross revenue, average invoice fee, and total kWh delivered?' },
  { icon: '⚡', label: 'Fleet Battery Status',  prompt: 'Show me fleet battery capacity, stored kWh, and truck operational status breakdown.' },
  { icon: '🚚', label: 'Driver Leaderboard',    prompt: 'Who are our top performing drivers by completed jobs and customer satisfaction ratings?' },
  { icon: '📦', label: 'Package Demand',        prompt: 'What are the most popular charging packages and peak ordering windows?' },
  { icon: '📊', label: 'Full Overview',         prompt: 'Give me a complete executive statistical summary of all fleet operations.' },
];

/**
 * Lightweight inline markdown → JSX renderer.
 * Supports: h1-h3, **bold**, *italic*, `code`, > blockquote, - lists, --- hr.
 */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} style={{ margin: '8px 0 8px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {inlineRender(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const inlineRender = (str) => {
    // Bold + italic, bold, italic, inline-code
    const parts = [];
    const re = /(\*\*\*(.+?)\*\*\*)|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
    let last = 0, m;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      if (m[1]) parts.push(<strong key={m.index}><em>{m[2]}</em></strong>);
      else if (m[3]) parts.push(<strong key={m.index} style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{m[4]}</strong>);
      else if (m[5]) parts.push(<em key={m.index}>{m[6]}</em>);
      else if (m[7]) parts.push(<code key={m.index} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em', background: 'rgba(16,185,129,.12)', color: 'var(--emerald-dark)', padding: '1px 5px', borderRadius: 4 }}>{m[8]}</code>);
      last = re.lastIndex;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
  };

  lines.forEach((raw) => {
    const line = raw;

    if (/^---+$/.test(line.trim())) {
      flushList();
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />);
      return;
    }
    if (/^### (.+)/.test(line)) {
      flushList();
      elements.push(<h3 key={key++} style={{ fontSize: 14, fontWeight: 800, margin: '16px 0 6px', color: 'var(--emerald-darker)', display: 'flex', alignItems: 'center', gap: 6 }}>{inlineRender(line.replace(/^### /, ''))}</h3>);
      return;
    }
    if (/^## (.+)/.test(line)) {
      flushList();
      elements.push(<h2 key={key++} style={{ fontSize: 15, fontWeight: 900, margin: '18px 0 6px', color: 'var(--text-primary)' }}>{inlineRender(line.replace(/^## /, ''))}</h2>);
      return;
    }
    if (/^# (.+)/.test(line)) {
      flushList();
      elements.push(<h1 key={key++} style={{ fontSize: 17, fontWeight: 900, margin: '18px 0 8px', color: 'var(--text-primary)' }}>{inlineRender(line.replace(/^# /, ''))}</h1>);
      return;
    }
    if (/^> (.+)/.test(line)) {
      flushList();
      elements.push(
        <blockquote key={key++} style={{ borderLeft: '3px solid var(--emerald-primary)', paddingLeft: 12, margin: '10px 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 13 }}>
          {inlineRender(line.replace(/^> /, ''))}
        </blockquote>
      );
      return;
    }
    if (/^[-*] (.+)/.test(line)) {
      listBuffer.push(line.replace(/^[-*] /, ''));
      return;
    }
    if (line.trim() === '') {
      flushList();
      elements.push(<div key={key++} style={{ height: 6 }} />);
      return;
    }
    flushList();
    elements.push(
      <p key={key++} style={{ fontSize: 13, lineHeight: 1.7, margin: '4px 0', color: 'var(--text-primary)' }}>
        {inlineRender(line)}
      </p>
    );
  });

  flushList();
  return <div>{elements}</div>;
}

export default function AdminAiAssistantModal({ isOpen = true, onClose, embedded = false }) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const isAuthorized = role === 'SUPER_ADMIN' || role === 'FLEET_DISPATCHER';

  const [question, setQuestion]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [currentStep, setCurrentStep]     = useState('');
  const [report, setReport]               = useState(null);
  const [error, setError]                 = useState(null);
  const [isListening, setIsListening]     = useState(false);
  const [showKeyInput, setShowKeyInput]   = useState(false);
  const [customApiKey, setCustomApiKey]   = useState(() => localStorage.getItem('atlas_gemini_key') || '');
  const [showQueries, setShowQueries]     = useState(false);
  const [copied, setCopied]               = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => () => { voiceService.stopListening(); }, []);

  const saveApiKey = () => {
    if (customApiKey.trim()) localStorage.setItem('atlas_gemini_key', customApiKey.trim());
    else localStorage.removeItem('atlas_gemini_key');
    setShowKeyInput(false);
  };

  const runQuery = async (q = question) => {
    const text = q.trim();
    if (!text || loading) return;
    setError(null); setLoading(true); setReport(null);

    try {
      const key = customApiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY || '';
      const result = await AiStatsService.queryStatisticalIntelligence(text, role, key, setCurrentStep);
      setReport(result);
    } catch (err) {
      setError(err.message || 'Failed to process query.');
    } finally {
      setLoading(false); setCurrentStep('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const toggleMic = () => {
    if (isListening) { voiceService.stopListening(); setIsListening(false); return; }
    voiceService.startListening(
      (t) => setQuestion(t),
      (e) => { setError(e); setIsListening(false); },
      (s) => setIsListening(s),
    );
  };

  const copyReport = () => {
    if (!report?.answerMarkdown) return;
    navigator.clipboard.writeText(report.answerMarkdown);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen && !embedded) return null;

  // ─── colour helper ────────────────────────────────────────────
  const kpiColor = (c) =>
    c === 'emerald' ? 'var(--emerald-darker)' : c === 'cyan' ? 'var(--cyan-primary)' : 'var(--amber-primary)';

  // ─── Main content ────────────────────────────────────────────
  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,.35)' }}>
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              Atlas AI Statistical Intelligence
              <span className="brand-pill" style={{ background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)', fontSize: 10, padding: '2px 8px' }}>
                <Sparkles size={10} /> Gemini 3.6 · Free Voice
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Secure real-time database intelligence · Admin &amp; Dispatcher only</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" style={{ width: 'auto', padding: '5px 11px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setShowKeyInput(v => !v)}>
            <Key size={13} /> {customApiKey ? '✓ Key Set' : 'API Key'}
          </button>
          {!embedded && onClose && (
            <button onClick={onClose} className="btn-outline" style={{ width: 30, height: 30, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Access Denied ── */}
      {!isAuthorized && (
        <div className="card-glass" style={{ borderLeft: '4px solid var(--amber-primary)', padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldAlert size={22} color="var(--amber-primary)" />
          <div>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Access Restricted — Admin &amp; Dispatcher Only</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Your current role is <b>{role || 'Guest'}</b>. Log in as Super Admin or Fleet Dispatcher to use this feature.
            </div>
          </div>
        </div>
      )}

      {isAuthorized && (
        <>
          {/* ── API Key Entry ── */}
          {showKeyInput && (
            <div className="card-glass" style={{ border: '1px solid var(--emerald-primary)', padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={14} color="var(--emerald-primary)" /> Gemini API Key (Optional)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Get a free key from <b>Google AI Studio</b> (aistudio.google.com). Stored in localStorage. Leave blank to use the local fallback engine.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={e => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)' }}
                />
                <button className="btn-emerald" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }} onClick={saveApiKey}>Save</button>
              </div>
            </div>
          )}

          {/* ── Quick Prompts ── */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {PRESET_PROMPTS.map((p, i) => (
              <button
                key={i}
                className="btn-outline"
                style={{ width: 'auto', whiteSpace: 'nowrap', padding: '5px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
                onClick={() => { setQuestion(p.prompt); runQuery(p.prompt); }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          {/* ── Input Row ── */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runQuery()}
                placeholder="Ask about revenue, drivers, fleet batteries, packages…"
                style={{
                  width: '100%', padding: '11px 44px 11px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isListening ? '2px solid var(--emerald-primary)' : '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 14,
                  boxShadow: isListening ? '0 0 14px rgba(16,185,129,.35)' : 'none',
                  transition: 'all .2s',
                }}
              />
              <button
                onClick={toggleMic}
                title={isListening ? 'Stop microphone' : 'Dictate question (free, no API needed)'}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: isListening ? 'var(--red-primary)' : 'transparent',
                  color: isListening ? '#fff' : 'var(--emerald-primary)',
                  border: 'none', borderRadius: '50%', width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all .2s',
                }}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            </div>
            <button
              className="btn-emerald"
              style={{ width: 'auto', padding: '11px 20px', fontSize: 14 }}
              onClick={() => runQuery()}
              disabled={loading || !question.trim()}
            >
              {loading ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
            </button>
          </div>

          {/* Mic live indicator */}
          {isListening && (
            <div style={{ fontSize: 12, color: 'var(--emerald-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="status-dot emerald pulse" /> Listening… Speak your statistical question clearly.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card-glass" style={{ borderLeft: '4px solid var(--red-primary)', padding: '10px 14px', color: 'var(--red-primary)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={17} /> {error}
            </div>
          )}

          {/* Loading progress */}
          {loading && (
            <div className="card-glass" style={{ padding: '20px', textAlign: 'center' }}>
              <div className="brand-pill" style={{ margin: '0 auto 10px', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px' }}>
                <RefreshCw size={13} className="spin" color="var(--emerald-primary)" />
                <span style={{ fontWeight: 700 }}>AI Engine Processing…</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{currentStep || 'Initialising…'}</div>
            </div>
          )}

          {/* ── Report ── */}
          {report && !loading && (
            <div className="card-glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                <span className="brand-pill" style={{ background: 'rgba(16,185,129,.12)', color: '#10b981' }}>
                  <CheckCircle2 size={11} /> Verified Database Insights
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-outline" style={{ width: 'auto', padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }} onClick={copyReport}>
                    {copied ? <CheckCircle2 size={13} color="var(--emerald-primary)" /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* KPI cards */}
              {report.kpis?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 12 }}>
                  {report.kpis.map((k, i) => (
                    <div key={i} className="card-glass" style={{ padding: '12px 14px', background: 'rgba(15,23,42,.6)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '.05em' }}>{k.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-mono)', margin: '4px 0', color: kpiColor(k.color) }}>{k.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{k.change}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rendered Markdown */}
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                {renderMarkdown(report.answerMarkdown)}
              </div>

              {/* Table */}
              {report.tableData?.rows?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                        {report.tableData.headers?.map((h, i) => <th key={i} style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {report.tableData.rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {row.map((cell, ci) => <td key={ci} style={{ padding: '8px 10px', fontWeight: ci === 0 ? 700 : 400 }}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SQL query inspector */}
              {report.executedQueries?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                  <button
                    onClick={() => setShowQueries(v => !v)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Database size={12} /> {showQueries ? 'Hide' : 'Inspect'} Executed Queries ({report.executedQueries.length})
                    {showQueries ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showQueries && (
                    <div style={{ marginTop: 8, background: '#090d16', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#10b981', lineHeight: 1.7 }}>
                      {report.executedQueries.map((q, i) => (
                        <div key={i}><span style={{ color: 'var(--text-muted)' }}>-- query {i + 1}</span><br />{q}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </>
      )}
    </div>
  );

  // Embedded mode — raw content
  if (embedded) return body;

  // Modal mode — overlay + card
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card-glass" style={{ maxWidth: 860, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, border: '1px solid var(--emerald-primary)', boxShadow: '0 24px 60px rgba(0,0,0,.55)' }}>
        {body}
      </div>
    </div>
  );
}
