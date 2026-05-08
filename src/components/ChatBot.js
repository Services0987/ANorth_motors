import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, X, Phone, Send, Bot, User, RefreshCw, 
  BrainCircuit, ChevronDown, PhoneCall, CheckCircle, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const API = '/api';

const QUICK_PROMPTS = [
  "I'm looking for a truck under $50k",
  "Show me SUVs with low mileage",
  "What financing options do you have?",
  "Tell me about your warranty",
  "Where are you located?"
];

const SAFE_ICON = (Icon, props = {}) => {
  if (!Icon) return null;
  const Component = Icon;
  return <Component {...props} />;
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('autonorth_chat_session');
    if (saved) {
      try {
        const { msgs, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < 30 * 60 * 1000) return msgs;
      } catch (e) { console.error("Session restore failed", e); }
    }
    return [{ 
      role: 'assistant', 
      content: 'Welcome to AutoNorth Motors. I am your AI Specialist, connected to our live Edmonton inventory. How can I assist you today?' 
    }];
  });

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { pathname } = useLocation();

  // Auto-minimize on navigation
  useEffect(() => {
    setMinimized(true);
  }, [pathname]);

  // Persistence & Auto-Scroll
  useEffect(() => {
    localStorage.setItem('autonorth_chat_session', JSON.stringify({
      msgs: messages,
      timestamp: Date.now()
    }));
    
    if (messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      setTimeout(() => {
        const lastMsgId = `msg-${messages.length - 1}`;
        document.getElementById(lastMsgId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load Inventory Info
  useEffect(() => {
    axios.get(`${API}/public/stats`).then(({ data }) => {
      setInventoryCount(data.inventoryCount || 0);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open && !minimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const sendMessage = useCallback(async (overrideInput) => {
    const msgToSend = (overrideInput || input).trim();
    if (!msgToSend || thinking) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msgToSend }]);
    setThinking(true);

    try {
      const { data } = await axios.post(`${API}/chat`, { message: msgToSend });
      const botResponse = data.response || data.message || "I'm having a technical moment. Please call us at 825-605-5050.";
      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
      if (data.lead_captured) setLeadCaptured(true);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'Connection issue — please call our Edmonton floor at 825-605-5050.' }]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  };

  const renderMessageContent = (content, msgIndex) => {
    return content.split('\n').map((line, idx) => {
      // 1. Sanitization & Cleaning
      let clean = line
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\\?\*/g, '')
        .replace(/^#+\s*/, '')
        .trim();

      if (!clean && !line.includes('|')) return <div key={idx} className="h-2" />;

      // 2. Vertical Spec Cards (from Tables)
      if (line.includes('|') && (line.includes('---') || line.includes('---'))) return null;
      if (line.includes('|')) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.length === 0 || cells.every(c => /^(vehicle|year|price|specs|#|id)$/i.test(c))) return null;
        
        let titleCell = null;
        let linkMatch = null;
        let specs = [];

        cells.forEach(cell => {
          const match = cell.match(/\[(.*?)\]\((.*?)\)/);
          if (match && !linkMatch) {
            linkMatch = match;
            titleCell = match[1];
          } else if (cell && cell !== '-' && !/^\d+$/.test(cell)) {
            specs.push(cell);
          }
        });

        if (!linkMatch) {
          titleCell = cells.find(c => !/^\d+$/.test(c) && c !== '-' && !/^(vehicle|year|price|specs)$/i.test(c));
          if (!titleCell) return null;
        }

        return (
          <div key={idx} className="my-3 p-4 bg-white/[0.02] border-l-2 border-[#D4AF37] group hover:bg-white/[0.04] transition-all">
            <div className="mb-2">
              {linkMatch ? (
                <a 
                  href={linkMatch[2]} 
                  onClick={() => setMinimized(true)}
                  className="text-[#D4AF37] font-bold text-sm hover:underline flex items-center gap-1.5"
                >
                  {linkMatch[1]} <ExternalLink size={10} />
                </a>
              ) : (
                <span className="text-[#D4AF37] font-bold text-sm uppercase tracking-tight">{titleCell}</span>
              )}
            </div>
            <div className="space-y-1">
              {specs.map((spec, sidx) => (
                <div key={sidx} className="flex gap-2 text-[10px] items-start">
                  <div className="w-1 h-1 bg-[#D4AF37]/40 rounded-full mt-1.5" />
                  <span className="text-white/50 leading-tight">{spec}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 3. Bullet Points
      if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
        return <li key={idx} className="ml-4 list-disc marker:text-[#D4AF37] text-white/70 mb-1 text-xs">{clean}</li>;
      }

      // 4. Interactive Links
      if (line.includes('[') && line.includes('](')) {
        const parts = line.split(/(\[.*?\]\(.*?\))/g);
        return (
          <p key={idx} className="mb-2 last:mb-0 text-white/80 break-words text-xs leading-relaxed">
            {parts.map((part, pidx) => {
              const match = part.match(/\[(.*?)\]\((.*?)\)/);
              if (match) return (
                <a key={pidx} href={match[2]} onClick={() => setMinimized(true)} className="text-[#D4AF37] font-bold border-b border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 px-1 transition-all rounded-sm">
                  {match[1]}
                </a>
              );
              return part.replace(/\\?\*/g, '');
            })}
          </p>
        );
      }

      return <p key={idx} className="mb-2 last:mb-0 text-white/80 text-xs leading-relaxed">{clean}</p>;
    });
  };

  return (
    <>
      <motion.button
        onClick={() => { setOpen(!open); setMinimized(false); }}
        className="fixed z-[9998] bottom-6 right-6 w-14 h-14 bg-[#D4AF37] text-black flex items-center justify-center shadow-[0_8px_30px_rgba(212,175,55,0.3)] hover:scale-105 transition-all"
        style={{ borderRadius: '50%' }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
        {!open && !leadCaptured && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#050505]" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed z-[9999] bottom-[90px] right-6 w-[400px] max-w-[calc(100vw-32px)] flex flex-col shadow-2xl overflow-hidden bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10"
            style={{ height: minimized ? '72px' : 'min(640px, 85vh)' }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D4AF37] flex items-center justify-center relative overflow-hidden">
                  <BrainCircuit size={20} className="text-black relative z-10" />
                  <motion.div
                    className="absolute inset-0 bg-white/30"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  />
                </div>
                <div>
                  <p className="font-heading text-white text-[10px] font-bold tracking-[0.2em] uppercase">Intelligence Specialist</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-500/80 text-[8px] font-body uppercase tracking-widest font-bold">
                      {inventoryCount > 0 ? `${inventoryCount} Vehicles Online` : 'Syncing Engine...'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => setMinimized(!minimized)} className="text-white/20 hover:text-white transition-colors">
                   <ChevronDown size={18} className={`transition-transform duration-300 ${minimized ? 'rotate-180' : ''}`} />
                 </button>
                 <a href="tel:+18256055050" className="text-white/20 hover:text-white transition-colors"><Phone size={16} /></a>
                 <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>

            {!minimized && (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'none' }}>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-sm ${msg.role === 'user' ? 'bg-white/5 border border-white/10' : 'bg-[#D4AF37]'}`}>
                          {msg.role === 'user' ? SAFE_ICON(User, { size: 14, className: "text-white/40" }) : SAFE_ICON(Bot, { size: 14, className: "text-black" })}
                        </div>
                        <div id={`msg-${i}`} className={`px-4 py-3 rounded-xl border transition-all ${
                          msg.role === 'user' 
                            ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20 text-white' 
                            : 'bg-white/[0.03] border-white/5 text-white/90'
                        }`}>
                          {renderMessageContent(msg.content, i)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl">
                        {SAFE_ICON(RefreshCw, { size: 12, className: "animate-spin text-[#D4AF37]" })}
                        <span className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Specialist is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>

                {/* Quick prompts */}
                {messages.length === 1 && !thinking && (
                  <div className="px-5 pb-4 flex flex-wrap gap-2 flex-shrink-0">
                    {QUICK_PROMPTS.map(p => (
                      <button key={p} 
                        onClick={() => sendMessage(p)}
                        className="text-[9px] font-heading uppercase tracking-widest text-white/30 border border-white/5 px-3 py-2 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all bg-white/[0.01]">
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Lead banner */}
                {leadCaptured && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mx-5 mb-4 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 text-[9px] font-heading uppercase tracking-widest font-bold">Intelligence Link Established! We'll reach out.</span>
                  </motion.div>
                )}

                {/* Input Area */}
                <div className="p-5 border-t border-white/5 bg-white/[0.01] flex-shrink-0">
                  <div className="flex gap-2">
                    <input 
                      ref={inputRef} 
                      value={input} 
                      onChange={e => setInput(e.target.value)} 
                      onKeyDown={handleKey}
                      className="flex-1 bg-black/40 border border-white/10 px-4 py-3 text-sm font-body text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50 transition-all"
                      placeholder="Search inventory or ask about financing..." 
                    />
                    <button 
                      onClick={() => sendMessage()} 
                      disabled={!input.trim() || thinking}
                      className="w-12 h-12 bg-[#D4AF37] hover:bg-[#B8962D] text-black flex items-center justify-center transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <p className="text-[8px] text-white/10 uppercase tracking-widest mt-3 text-center font-heading">
                    Powered by AutoNorth Neural Engine · 24/7 Edmonton Sales Support
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
