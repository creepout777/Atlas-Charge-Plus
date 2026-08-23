import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, MicOff, Volume2, VolumeX, Send, Sparkles, ShieldAlert, Key, CheckCircle2, Copy, RefreshCw, ChevronDown, ChevronUp, Database, BarChart3, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AiStatsService } from '../../services/aiStatsService';
import { voiceService } from '../../services/voiceService';

const PRESET_PROMPTS = [
  { icon: '💰', label: 'Revenue & kWh Sales', prompt: 'What is our total gross revenue, average invoice fee, and total kWh delivered?' },
  { icon: '⚡', label: 'Fleet Battery Readiness', prompt: 'Show me fleet battery capacity, stored kWh, and truck operational status breakdown.' },
  { icon: '🚚', label: 'Driver Leaderboard & CSAT', prompt: 'Who are our top performing drivers by completed jobs and customer ratings?' },
  { icon: '📦', label: 'Package Demand & Peak Hours', prompt: 'What are the peak ordering windows and most popular charging packages?' },
  { icon: '📊', label: 'Full Operational Briefing', prompt: 'Give me a complete executive statistical summary of all fleet operations.' }
];

export default function AdminAiAssistantModal({ isOpen = true, onClose, embedded = false }) {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const isAuthorized = role === 'SUPER_ADMIN' || role === 'FLEET_DISPATCHER';

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // API Key Settings toggle
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('atlas_gemini_key') || '');
  const [showExecutedQueries, setShowExecutedQueries] = useState(false);
  const [copied, setCopied] = useState(false);

  const responseEndRef = useRef(null);

  useEffect(() => {
    return () => {
      voiceService.stopListening();
      voiceService.stopSpeech();
    };
  }, []);

  const handleSaveApiKey = () => {
    if (customApiKey) {
      localStorage.setItem('atlas_gemini_key', customApiKey.trim());
    } else {
      localStorage.removeItem('atlas_gemini_key');
    }
    setShowApiKeyInput(false);
  };

  const handleQuery = async (queryText = question) => {
    const targetQuery = queryText.trim();
    if (!targetQuery || loading) return;

    setError(null);
    setLoading(true);
    setReport(null);
    voiceService.stopSpeech();

    try {
      const activeKey = customApiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY || '';
      const result = await AiStatsService.queryStatisticalIntelligence(
        targetQuery,
        role,
        activeKey,
        (stepText) => setCurrentStep(stepText)
      );

      setReport(result);
    } catch (err) {
      console.error('AI Query Error:', err);
      setError(err.message || 'Failed to process statistical query');
    } finally {
      setLoading(false);
      setCurrentStep('');
      setTimeout(() => {
        responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const toggleVoiceDictation = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      voiceService.startListening(
        (transcript) => {
          setQuestion(transcript);
        },
        (errMessage) => {
          setError(errMessage);
          setIsListening(false);
        },
        (listeningState) => {
          setIsListening(listeningState);
        }
      );
    }
  };

  const toggleVoiceReadAloud = () => {
    if (isSpeaking) {
      voiceService.stopSpeech();
      setIsSpeaking(false);
    } else if (report?.answerMarkdown) {
      setIsSpeaking(true);
      voiceService.speakText(
        report.answerMarkdown,
        () => setIsSpeaking(false),
        (err) => {
          console.warn('Speech error:', err);
          setIsSpeaking(false);
        }
      );
    }
  };

  const handleCopyReport = () => {
    if (report?.answerMarkdown) {
      navigator.clipboard.writeText(report.answerMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen && !embedded) return null;

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <Bot size={22} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Atlas AI Statistical Intelligence
              <span className="brand-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '10px', padding: '2px 8px' }}>
                <Sparkles size={10} /> Gemini 2.5 + Free Voice
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Natural language database statistical assistant strictly for Admins & Fleet Dispatchers
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Key Settings Button */}
          <button
            className="btn-outline"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            title="Configure Gemini API Key"
          >
            <Key size={13} /> {customApiKey ? 'Key Set' : 'Gemini Key'}
          </button>

          {/* Close button if modal mode */}
          {!embedded && onClose && (
            <button
              onClick={onClose}
              className="btn-outline"
              style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyCenter: 'center', borderRadius: '50%' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Role Check Alert if not authorized */}
      {!isAuthorized ? (
        <div className="card-glass" style={{ borderLeft: '4px solid var(--amber-primary)', padding: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <ShieldAlert size={24} color="var(--amber-primary)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>Access Restricted to Admin & Dispatcher</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                The AI Statistical Intelligence console performs real-time SQL queries across operational fleet data.
                Your current role is <b>{role || 'Unauthenticated Guest'}</b>. Please log in as a Super Admin or Fleet Dispatcher to use this feature.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* API Key Configuration Drawer */}
          {showApiKeyInput && (
            <div className="card-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--emerald-primary)', padding: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={16} color="var(--emerald-primary)" /> Gemini API Key Setup (Optional)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Enter your Google AI Studio Gemini API Key below. If left blank, the app will use default environment variables or intelligent fallback statistical engine.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
                <button className="btn-emerald" style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }} onClick={handleSaveApiKey}>
                  Save Key
                </button>
              </div>
            </div>
          )}

          {/* Quick Preset Prompts Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                className="btn-outline"
                style={{
                  width: 'auto',
                  whiteSpace: 'nowrap',
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)'
                }}
                onClick={() => {
                  setQuestion(p.prompt);
                  handleQuery(p.prompt);
                }}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          {/* Input & Dictation Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                placeholder="Ask about revenue, driver ratings, truck batteries, or session stats..."
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isListening ? '2px solid var(--emerald-primary)' : '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  boxShadow: isListening ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {/* Mic Icon Inside Input */}
              <button
                type="button"
                onClick={toggleVoiceDictation}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: isListening ? 'var(--red-primary)' : 'transparent',
                  color: isListening ? '#ffffff' : 'var(--emerald-primary)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title={isListening ? 'Stop Dictating' : 'Dictate with Voice (100% Free)'}
              >
                {isListening ? <MicOff size={16} className="pulse" /> : <Mic size={16} />}
              </button>
            </div>

            <button
              className="btn-emerald"
              style={{ width: 'auto', padding: '12px 20px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
              onClick={() => handleQuery()}
              disabled={loading || !question.trim()}
            >
              {loading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
            </button>
          </div>

          {/* Listening State Banner */}
          {isListening && (
            <div style={{ fontSize: '12px', color: 'var(--emerald-dark)', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
              <span className="status-dot emerald pulse" /> Listening to your microphone... Speak your statistical question clearly.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="card-glass" style={{ borderLeft: '4px solid var(--red-primary)', padding: '12px 16px', color: 'var(--red-primary)', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={18} />
              <div>{error}</div>
            </div>
          )}

          {/* Progress Indicator when querying */}
          {loading && (
            <div className="card-glass" style={{ padding: '20px', textAlign: 'center' }}>
              <div className="brand-pill" style={{ margin: '0 auto 12px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px' }}>
                <RefreshCw size={14} className="spin" color="var(--emerald-primary)" />
                <span style={{ fontWeight: 700 }}>AI Database Engine Working...</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {currentStep || 'Analyzing statistical schemas...'}
              </div>
            </div>
          )}

          {/* AI Response Report Container */}
          {report && !loading && (
            <div className="card-glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Report Action Tools */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <span className="brand-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <CheckCircle2 size={12} /> Verified Database Insights
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-outline"
                    style={{ width: 'auto', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={toggleVoiceReadAloud}
                    title="Read Aloud with Free Voice Synthesis"
                  >
                    {isSpeaking ? <VolumeX size={14} color="var(--red-primary)" /> : <Volume2 size={14} color="var(--emerald-primary)" />}
                    {isSpeaking ? 'Stop Voice' : 'Read Aloud'}
                  </button>
                  <button
                    className="btn-outline"
                    style={{ width: 'auto', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={handleCopyReport}
                  >
                    {copied ? <CheckCircle2 size={14} color="var(--emerald-primary)" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* KPI Cards Grid */}
              {report.kpis && report.kpis.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`, gap: '12px' }}>
                  {report.kpis.map((kpi, i) => (
                    <div key={i} className="card-glass" style={{ padding: '12px 14px', background: 'rgba(15, 23, 42, 0.6)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                        {kpi.label}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', margin: '4px 0', color: kpi.color === 'emerald' ? 'var(--emerald-darker)' : kpi.color === 'cyan' ? 'var(--cyan-primary)' : 'var(--amber-primary)' }}>
                        {kpi.value}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {kpi.change}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Markdown Content */}
              <div
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {report.answerMarkdown}
              </div>

              {/* Table Data if present */}
              {report.tableData && report.tableData.rows && report.tableData.rows.length > 0 && (
                <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                        {report.tableData.headers?.map((h, i) => (
                          <th key={i} style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: '8px 10px', fontWeight: cIdx === 0 ? 700 : 400 }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Executed Queries Inspector Toggle */}
              {report.executedQueries && report.executedQueries.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button
                    onClick={() => setShowExecutedQueries(!showExecutedQueries)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Database size={13} /> {showExecutedQueries ? 'Hide' : 'Inspect'} Executed SQL Queries ({report.executedQueries.length})
                    {showExecutedQueries ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showExecutedQueries && (
                    <div style={{ marginTop: '8px', background: '#090d16', padding: '12px', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#10b981' }}>
                      {report.executedQueries.map((q, idx) => (
                        <div key={idx} style={{ marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>-- Query #{idx + 1}</span><br />
                          {q}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div ref={responseEndRef} />
        </>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card-glass" style={{
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        border: '1px solid var(--emerald-primary)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
      }}>
        {content}
      </div>
    </div>
  );
}
