import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Sparkles, Phone, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function getSessionId() {
  const key = 'an_ai_session';
  let id = sessionStorage.getItem(key);
  if (!id) { id = 'chat_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36); sessionStorage.setItem(key, id); }
  return id;
}

const WELCOME = { role: 'assistant', content: "Welcome to AutoNorth Motors. I'm your personal vehicle specialist — I know every car in our inventory and can help you find your perfect match, answer questions, or book a test drive.\n\nWhat kind of vehicle are you looking for today?" };

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-2 h-2 bg-[#D4AF37] rounded-full"
          animate={{ y: [0, -6, 0] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 bg-[#D4AF37] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
          <Sparkles size={13} className="text-black" />
        </div>
      )}
      <div className={`max-w-[80%] px-4 py-3 text-sm font-body leading-relaxed ${isUser ? 'bg-white/10 text-white border border-white/10' : 'bg-[#0D0D0D] text-white/80 border border-white/[0.06]'}`}
        style={{ whiteSpace: 'pre-wrap' }}>
        {msg.content}
      </div>
    </motion.div>
  );
}

function BookingConfirmed() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="mx-2 mb-3 p-4 bg-emerald-500/10 border border-emerald-500/30">
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle size={16} className="text-emerald-400" />
        <span className="text-emerald-400 font-heading text-xs tracking-wider uppercase font-medium">Test Drive Booked</span>
      </div>
      <p className="text-white/50 text-xs font-body">Our team will confirm your appointment within 1 hour.</p>
    </motion.div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = getSessionId();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 300); setPulse(false); } }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/chat`, { session_id: sessionId, message: text });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      if (data.lead_captured) setBookingConfirmed(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue — please call us at 825-605-5050 or use the contact form.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const QUICK_PROMPTS = ["I'm looking for a truck", "Show me SUVs under $60k", "Book a test drive", "Tell me about financing"];

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-[9999] bottom-[76px] right-5 w-[380px] max-w-[calc(100vw-40px)] flex flex-col shadow-2xl"
            style={{ 
              height: 'auto', 
              maxHeight: 'min(600px, 80vh)',
              background: 'rgba(8,8,8,0.97)', 
              border: '1px solid rgba(212,175,55,0.2)', 
              backdropFilter: 'blur(20px)' 
            }}
            data-testid="chatbot-panel"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="relative">
                <div className="w-9 h-9 bg-[#D4AF37] flex items-center justify-center">
                  <Sparkles size={16} className="text-black" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#080808]" />
              </div>
              <div className="flex-1">
                <p className="font-heading text-white text-sm font-medium tracking-wide">AI Vehicle Specialist</p>
                <p className="text-emerald-400 text-xs font-body flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                  Online · Typically replies instantly
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href="tel:+18256055050" className="text-white/30 hover:text-white transition-colors" title="Call Us">
                  <Phone size={16} />
                </a>
                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 transparent' }}>
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="w-7 h-7 bg-[#D4AF37] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Sparkles size={13} className="text-black" />
                  </div>
                  <div className="bg-[#0D0D0D] border border-white/[0.06]">
                    <TypingDots />
                  </div>
                </div>
              )}
              {bookingConfirmed && <BookingConfirmed />}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 100); }}
                    className="text-xs font-body text-white/50 border border-white/10 px-3 py-1.5 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all">
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 border-t border-white/[0.06] p-3 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about any vehicle, financing, or test drives..."
                rows={1}
                style={{ resize: 'none', minHeight: '40px', maxHeight: '80px' }}
                className="flex-1 input-dark px-3 py-2.5 text-sm font-body"
                data-testid="chat-input"
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading}
                className={`w-10 h-10 flex items-center justify-center transition-all flex-shrink-0 ${input.trim() && !loading ? 'bg-[#D4AF37] text-black hover:bg-[#F3E5AB]' : 'bg-white/5 text-white/20'}`}
                data-testid="chat-send-btn">
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button — hidden when panel is open (header has close) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 bottom-5 right-5 flex items-center gap-2 pr-4 overflow-hidden"
          style={{ height: '52px', background: 'linear-gradient(135deg, #D4AF37 0%, #F3E5AB 50%, #D4AF37 100%)', border: '1px solid #D4AF37', backdropFilter: 'blur(10px)' }}
          data-testid="chatbot-toggle"
        >
          {pulse && (
            <motion.span className="absolute inset-0 rounded-none"
              animate={{ opacity: [0.6, 0], scale: [1, 1.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ background: 'rgba(212,175,55,0.3)', pointerEvents: 'none' }}
            />
          )}
          <div className="w-10 h-full flex items-center justify-center flex-shrink-0 text-black">
            <Sparkles size={18} />
          </div>
          <span className="text-xs font-heading tracking-widest uppercase font-semibold whitespace-nowrap text-black">
            AI Specialist
          </span>
        </button>
      )}
    </>
  );
}
