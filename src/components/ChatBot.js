import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, X, Phone, Send, Bot, User, Loader2 as Loader, 
  BrainCircuit, ChevronDown, RefreshCw, CheckCircle, AlertTriangle 
} from 'lucide-react';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const QUICK_PROMPTS = [
  "I'm looking for a truck under $50k",
  "Show me SUVs with low mileage",
  "Book a test drive for a Ford F-150",
  "What financing options do you have?",
  "Tell me about your warranty"
];

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon) return null;
  const Component = Icon;
  return <Component {...props} />;
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AutoNorth AI Vehicle Specialist. I have complete knowledge of our entire inventory. What vehicle are you looking for today?" }
  ]);
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/vehicles?limit=1000&status=available`).then(({ data }) => {
      setInventory(data.vehicles || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || thinking) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setThinking(true);

    try {
      const { data } = await axios.post(`${API}/chat`, {
        message: userMsg,
        session_id: sessionId || `session_${Math.random().toString(36).substr(2, 9)}`
      });
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      if (data.lead_captured) setLeadCaptured(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue — please call us at 825-605-5050 or use the contact form.' }]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, sessionId, inventory]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => { setOpen(!open); setMinimized(false); }}
        className="fixed z-[9998] bottom-5 right-5 w-14 h-14 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black flex items-center justify-center shadow-2xl transition-all"
        style={{ borderRadius: '50%', boxShadow: '0 8px 30px rgba(212,175,55,0.4)' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="chatbot-toggle"
      >
        {open ? SAFE_ICON(X, { size: 20 }) : SAFE_ICON(MessageSquare, { size: 20 })}
        {!open && !leadCaptured && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#050505] animate-pulse" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22 }}
            className="fixed z-[9999] bottom-[76px] right-5 w-[420px] max-w-[calc(100vw-24px)] flex flex-col shadow-2xl overflow-hidden"
            style={{
              maxHeight: minimized ? '60px' : 'min(660px, 88vh)',
              background: 'rgba(4,4,4,0.97)',
              border: '1px solid rgba(212,175,55,0.15)',
              backdropFilter: 'blur(32px)',
            }}
            data-testid="chatbot-panel"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-black/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D4AF37] flex items-center justify-center relative overflow-hidden">
                  {SAFE_ICON(BrainCircuit, { size: 18, className: "text-black relative z-10" })}
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                  />
                </div>
                <div>
                  <p className="font-heading text-white text-xs font-bold tracking-[0.2em] uppercase">AI Specialist</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-[9px] font-body uppercase tracking-widest">
                      {inventory.length > 0 ? `${inventory.length} vehicles loaded` : 'Connecting...'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => setMinimized(!minimized)} className="text-white/20 hover:text-white/70 transition-colors">
                   {SAFE_ICON(ChevronDown, { size: 16, className: `transition-transform ${minimized ? 'rotate-180' : ''}` })}
                 </button>
                  <a href="tel:+18256055050" className="text-white/30 hover:text-white transition-colors" title="Call Us">{SAFE_ICON(Phone, { size: 16 })}</a>
                  <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white/70 transition-colors">{SAFE_ICON(X, { size: 18 })}</button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white/10' : 'bg-[#D4AF37]'}`}>
                          {msg.role === 'user' ? SAFE_ICON(User, { size: 12, className: "text-white/50" }) : SAFE_ICON(Bot, { size: 12, className: "text-black" })}
                        </div>
                        <div className={`px-4 py-3 text-sm font-body leading-relaxed overflow-hidden ${
                          msg.role === 'user' 
                            ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-white' 
                            : 'bg-white/[0.03] border border-white/[0.05] text-white/80'
                        }`} style={{ borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px' }}>
                          {msg.content.split('\n').map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={idx} className="h-2" />;
                            
                            // Markdown Table detection
                            if (trimmed.startsWith('|') && trimmed.includes('---')) return null;
                            if (trimmed.startsWith('|')) {
                              const cells = trimmed.split('|').filter(c => c.trim());
                              if (cells.length === 0) return null;
                              return (
                                <div key={idx} className="flex border-b border-white/5 py-1.5 gap-3 text-[11px]">
                                  {cells.map((cell, cidx) => (
                                    <span key={cidx} className={cidx === 0 ? "font-bold text-[#D4AF37] min-w-[80px]" : "flex-1 text-white/60"}>
                                      {cell.trim()}
                                    </span>
                                  ))}
                                </div>
                              );
                            }

                            // Headers and Lists
                            if (trimmed.startsWith('###')) return <h3 key={idx} className="text-[#D4AF37] font-bold mt-4 mb-2 uppercase text-[10px] tracking-[0.2em]">{trimmed.replace(/###/g, '')}</h3>;
                            if (trimmed.startsWith('**')) return <p key={idx} className="font-bold text-white mt-2 mb-1">{trimmed.replace(/\*\*/g, '')}</p>;
                            if (trimmed.startsWith('*') || trimmed.startsWith('-')) return <li key={idx} className="ml-4 list-disc marker:text-[#D4AF37] text-white/70 mb-1">{trimmed.substring(1).trim()}</li>;
                            
                            // Interactive Vehicle Links
                            if (line.includes('[') && line.includes('](')) {
                              const parts = line.split(/(\[.*?\]\(.*?\))/g);
                              return (
                                <p key={idx} className="mb-2 last:mb-0 text-white/80">
                                  {parts.map((part, pidx) => {
                                    const match = part.match(/\[(.*?)\]\((.*?)\)/);
                                    if (match) {
                                      return (
                                        <a 
                                          key={pidx} 
                                          href={match[2]} 
                                          className="text-[#D4AF37] font-bold border-b border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 px-1 transition-all inline-block rounded-sm"
                                        >
                                          {match[1]}
                                        </a>
                                      );
                                    }
                                    return part;
                                  })}
                                </p>
                              );
                            }

                            return <p key={idx} className="mb-2 last:mb-0 text-white/80">{line}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/[0.05]">
                        {SAFE_ICON(Loader, { size: 12, className: "animate-spin text-[#D4AF37]" })}
                        <span className="text-white/30 text-xs font-body">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Quick prompts */}
                {messages.length === 1 && (
                  <div className="px-5 pb-3 flex flex-wrap gap-1.5 flex-shrink-0">
                    {QUICK_PROMPTS.map(p => (
                      <button key={p} onClick={() => { setInput(p); setTimeout(() => sendMessage(), 100); }}
                        className="text-[10px] font-heading uppercase tracking-widest text-white/30 border border-white/10 px-3 py-2 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Lead confirmed banner */}
                {leadCaptured && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="mx-5 mb-3 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                    {SAFE_ICON(CheckCircle, { size: 14, className: "text-emerald-400" })}
                    <span className="text-emerald-400 text-[10px] font-heading uppercase tracking-widest">Lead Captured! We'll call you soon.</span>
                  </motion.div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
                  <div className="flex gap-2">
                    <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 text-sm font-body text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
                      placeholder="Ask about any vehicle..." data-testid="chatbot-input" />
                    <button onClick={sendMessage} disabled={!input.trim() || thinking}
                      className="w-10 h-10 bg-[#D4AF37] hover:bg-[#F3E5AB] text-black flex items-center justify-center transition-all disabled:opacity-30">
                      {SAFE_ICON(Send, { size: 14 })}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
