import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, BrainCircuit, Phone, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function getSessionId() {
  const key = 'an_ai_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'chat_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

const WELCOME_MSG = {
  role: 'assistant',
  content:
    "Welcome to AutoNorth Motors. I'm your personal vehicle specialist — I know every car in our inventory and can help you find your perfect match, answer questions, or book a test drive.\n\nWhat kind of vehicle are you looking for today?",
};

/* ── Neural pulse (thinking indicator) ─────────────────── */
function ThinkingPulse() {
  const [step, setStep] = useState(0);
  const steps = [
    "Analyzing User Intent...",
    "Querying Live AutoNorth Inventory...",
    "Cross-Referencing Vehicle Specifications...",
    "Synthesizing Intelligent Response...",
    "Finalizing Professional Narrative..."
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s < 4 ? s + 1 : s));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start items-center gap-2 mb-3">
      <div className="w-7 h-7 bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
        <BrainCircuit size={13} className="text-black" />
      </div>
      <div className="flex flex-col gap-1 px-4 py-3 border border-white/[0.06] bg-[#0D0D0D] min-w-[200px]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full"
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          <span className="text-[#D4AF37] text-[9px] font-heading font-bold ml-2 tracking-widest uppercase">
            Thinking Brain
          </span>
        </div>
        <p className="text-white/30 text-[8px] uppercase tracking-tighter mt-1 animate-pulse">
           {steps[step]}
        </p>
      </div>
    </div>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 bg-[#D4AF37] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
          <BrainCircuit size={13} className="text-black" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 text-[13px] font-body leading-relaxed ${
          isUser
            ? 'bg-white/10 text-white border border-white/10'
            : 'bg-[#0D0D0D] text-white/80 border border-white/[0.06]'
        }`}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

export default function ChatBot() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [leadConfirmed, setLeadConfirmed] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = getSessionId();

  // Load Inventory for Zero-Cost Intelligence (Optional but helpful for local fallback)
  useEffect(() => {
    axios.get(`${API}/vehicles?limit=1000&t=${Date.now()}`).then(({ data }) => {
      setInventory(data.vehicles || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, thinking]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setThinking(true);

    try {
      // Prioritize backend AI sync
      const { data } = await axios.post(`${API}/chat`, { session_id: sessionId, message: text });
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
      
      if (data.lead_captured) {
        setLeadConfirmed(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection issue — please call us at 825-605-5050 or use the contact form.' },
      ]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, sessionId]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const QUICK_PROMPTS = ["I'm looking for a truck", "Show me SUVs under $60k", "Book a test drive", "Tell me about financing"];

  return (
    <>
      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22 }}
            className="fixed z-[9999] bottom-[76px] right-5 w-[420px] max-w-[calc(100vw-24px)] flex flex-col shadow-2xl overflow-hidden"
            style={{
              maxHeight: 'min(660px, 88vh)',
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
                  <BrainCircuit size={18} className="text-black relative z-10" />
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                  />
                </div>
                <div>
                  <p className="font-heading text-white text-xs font-bold tracking-[0.2em] uppercase">
                    AI Specialist
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-[9px] font-body uppercase tracking-widest">
                      {inventory.length > 0 ? `${inventory.length} vehicles loaded` : 'connecting…'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <a href="tel:+18256055050" className="text-white/30 hover:text-white transition-colors" title="Call Us"><Phone size={16} /></a>
                 <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white/70 transition-colors"><X size={18} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-1" style={{ scrollbarWidth: 'thin' }}>
              {messages.map((msg, i) => (
                <Bubble key={i} msg={msg} />
              ))}
              {thinking && <ThinkingPulse />}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {messages.length === 1 && (
              <div className="px-5 pb-3 flex flex-wrap gap-1.5 flex-shrink-0">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 100); }}
                    className="text-[10px] font-heading uppercase tracking-widest text-white/30 border border-white/10 px-3 py-2 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all">
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Lead confirmed banner */}
            {leadConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-5 py-2 bg-emerald-500/10 border-t border-emerald-500/20 text-emerald-400 text-[10px] font-heading uppercase tracking-widest text-center flex-shrink-0"
              >
                ✓ Specialist alerted — you'll get a call soon!
              </motion.div>
            )}

            {/* Input bar */}
            <div className="p-4 border-t border-white/[0.06] bg-black/40 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about trucks, pricing, test drives…"
                  rows={1}
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || thinking}
                  className={`w-11 h-11 flex items-center justify-center transition-all flex-shrink-0 ${
                    input.trim() && !thinking
                      ? 'bg-[#D4AF37] text-black shadow-[0_0_16px_rgba(212,175,55,0.25)] hover:shadow-[0_0_24px_rgba(212,175,55,0.4)]'
                      : 'bg-white/5 text-white/15 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating button ── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-[9999] bottom-5 right-5 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open AI chat"
      >
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 bg-[#D4AF37]/20 blur-xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <div className="relative w-14 h-14 bg-[#050505] border border-[#D4AF37]/40 flex items-center justify-center overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-[#D4AF37]/5"
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <BrainCircuit
            size={24}
            className="text-[#D4AF37] relative z-10 group-hover:scale-110 transition-transform"
          />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#050505] rounded-full" />
        </div>
      </motion.button>
    </>
  );
}
