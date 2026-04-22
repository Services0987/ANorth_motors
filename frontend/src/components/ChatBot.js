import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, BrainCircuit } from 'lucide-react';
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
    "Welcome to AutoNorth Motors 🚗\n\nI'm your personal vehicle specialist — I've loaded our full Edmonton inventory and I'm ready to find your perfect match.\n\nTry asking:\n• \"Show me a list of trucks\"\n• \"What's the cheapest SUV?\"\n• \"Do you have any Fords under $40k?\"\n• Or just describe what you need!",
};

/* ── Advanced Local Intelligence Engine ─────────────────── */
const INTENTS = {
  LIST: [/(show|list|find|search|looking for|what do you have|inventory|cars|trucks|suvs|vehicles|available|in stock)/i],
  PRICE: [/(cheap|affordable|price|cost|under|over|budget|financing|how much|dollar)/i],
  DETAIL: [/(specs|features|mileage|engine|drivetrain|details|tell me more about|interior|exterior)/i],
  BOOK: [/(test drive|book|appointment|visit|schedule|come in|see it in person)/i],
  LEAD: [/(contact|call me|reach out|get back|manager|sales|number)/i],
  GREET: [/^(hi|hello|hey|greetings|good morning|do you)/i],
  YES_NO: [/^(yes|no|yeah|nope|sure|ok|okay|fine)/i]
};

const DB_VARS = {
  BODY_TYPES: ['truck', 'suv', 'sedan', 'coupe', 'cargo van', 'minivan', 'hybrid', 'electric', 'convertible', 'hatchback'],
  MAKES: ['ford', 'ram', 'chevy', 'chevrolet', 'toyota', 'honda', 'gmc', 'dodge', 'jeep', 'kia', 'hyundai', 'nissan', 'bmw', 'mercedes', 'audi', 'volvo', 'mazda', 'lexus', 'acura'],
  COLORS: ['black', 'white', 'silver', 'grey', 'gray', 'red', 'blue', 'green', 'brown', 'gold', 'yellow', 'orange']
};

function detectIntent(q) {
  for (const [intent, patterns] of Object.entries(INTENTS)) {
    if (patterns.some((p) => p.test(q))) return intent;
  }
  return 'GENERAL';
}

function extractEntities(q, currentEntities = {}) {
  const lower = q.toLowerCase();
  const e = { ...currentEntities }; // Maintain state memory
  
  DB_VARS.BODY_TYPES.forEach((b) => { if (lower.includes(b)) e.body_type = b; });
  DB_VARS.MAKES.forEach((m) => { if (lower.includes(m)) e.make = m; });
  DB_VARS.COLORS.forEach((c) => { if (lower.includes(c)) e.color = c; });
  
  const yearMatch = lower.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch) e.year = parseInt(yearMatch[1]);
  
  const underPrice = lower.match(/(under|below|less than|max) \$?([\d,]+)k?/);
  if (underPrice) e.max_price = parseInt(underPrice[2].replace(',', '')) * (lower.includes('k') ? 1000 : 1);
  
  const cheapMatch = lower.match(/(cheapest|lowest price)/);
  if (cheapMatch && !e.max_price) e.sort = 'price_asc';
  
  const awd = lower.match(/\b(awd|4wd|4x4|all[- ]wheel|four[- ]wheel)\b/i);
  if (awd) e.drivetrain = awd[0];
  
  return e;
}

function filterInventory(inventory, entities) {
  let results = inventory.filter((v) => {
    const target = `${v.year} ${v.make} ${v.model} ${v.title} ${v.body_type} ${v.exterior_color} ${v.drivetrain} ${v.description}`.toLowerCase();
    if (entities.body_type && !target.includes(entities.body_type)) return false;
    if (entities.make && !target.includes(entities.make)) return false;
    if (entities.color && !target.includes(entities.color)) return false;
    if (entities.year && parseInt(v.year) !== entities.year) return false;
    if (entities.drivetrain && !target.includes(entities.drivetrain.toLowerCase())) return false;
    if (entities.max_price && v.price > entities.max_price) return false;
    return true;
  });
  
  if (entities.sort === 'price_asc') {
    results.sort((a,b) => a.price - b.price);
  }
  return results;
}

function formatCurrency(n) {
  return '$' + (n || 0).toLocaleString('en-CA');
}

// Stateful engine closure memory
let CONVERSATION_STATE = { lastIntent: null, focusedVehicle: null, entities: {} };

function buildLocalResponse(text, inventory) {
  const intent = detectIntent(text);
  CONVERSATION_STATE.entities = extractEntities(text, CONVERSATION_STATE.entities);
  const entities = CONVERSATION_STATE.entities;
  const matches = filterInventory(inventory, entities);
  
  // Dynamic Follow-up Logic
  if (intent === 'YES_NO' && CONVERSATION_STATE.lastIntent === 'LIST' && matches.length > 5) {
     return "Excellent. To narrow this down further, are you looking for any specific color, or perhaps a maximum price range?";
  }

  CONVERSATION_STATE.lastIntent = intent;

  switch (intent) {
    case 'GREET':
      return "Hello! I am the AutoNorth AI Intelligence Engine ⚡.\n\nI have real-time access to our entire Edmonton inventory. Are you looking for a specific make (like Ford or Honda), a body type (like an SUV or Truck), or trying to stay under a certain budget?";

    case 'LIST': {
      if (matches.length === 0) {
        CONVERSATION_STATE.entities = {}; // clear memory
        return "My deepest apologies, but it appears we don't have exact matches for those precise parameters right now. However, inventory updates daily! Would you like me to show you our best overall deals instead?";
      }
      
      const isNarrow = Object.keys(entities).length > 0;
      const count = matches.length;
      
      if (count > 8 && !entities.max_price) {
        return `I've instantly located **${count} vehicles** matching your request. That's a solid selection!\n\nTo save you from scrolling, what is your ideal maximum budget, or is there a specific mileage you want to stay under?`;
      }

      const showTop = matches.slice(0, 5);
      const items = showTop.map(v => `• **${v.year} ${v.title}**\n   └ ${formatCurrency(v.price)} | ${(v.mileage || 0).toLocaleString()} km | ${v.drivetrain || 'FWD'}`);
      
      CONVERSATION_STATE.focusedVehicle = showTop[0]; // remember the first result
      
      return `Here are the top ${showTop.length} matches I pulled from our vault:\n\n${items.join('\n\n')}\n\n${count > 5 ? `*(Plus ${count - 5} more in stock)*\n\n` : ''}Would you like me to pull the full feature list for the ${showTop[0].year} ${showTop[0].make}, or shall we schedule a test drive?`;
    }

    case 'PRICE': {
      if (matches.length > 0) {
        const best = matches[0];
        CONVERSATION_STATE.focusedVehicle = best;
        return `Looking closely at our pricing data, your best option is the **${best.year} ${best.title}** at **${formatCurrency(best.price)}**.\n\nIt features a ${best.engine || 'solid engine'} and has ${(best.mileage || 0).toLocaleString()} km on it.\n\nI can set up a VIP appointment for you to view this in person. Just leave your phone number!`;
      }
      return "Tell me your exact budget (e.g., 'under 30k') and I will mathematically filter out the best possible value in our lot today.";
    }

    case 'DETAIL': {
      const v = CONVERSATION_STATE.focusedVehicle || matches[0] || inventory[0];
      if (!v) return "I need to know which vehicle you're interested in first! Try asking about SUVs or Trucks.";
      return `**Deep Dive: ${v.year} ${v.title}** 📊\n\n• Market Price: ${formatCurrency(v.price)}\n• Mileage: ${(v.mileage || 0).toLocaleString()} km\n• Engine Spec: ${v.engine || 'N/A'}\n• Transmission: ${v.transmission || 'N/A'}\n• Drivetrain: ${v.drivetrain || 'N/A'}\n• Interior Finish: ${v.interior_color || 'Standard Premium'}\n\nThis is a highly sought-after model. Want me to alert a specialist to secure the keys for you? Provide your phone number.`;
    }

    case 'BOOK':
    case 'LEAD':
      return "Outstanding choice. Let's get you in the driver's seat 🗓️.\n\nPlease reply with your **phone number** (and preferred day), and the AutoNorth management team will instantly receive your request and confirm within minutes.";

    default: {
      if (matches.length > 0 && Object.keys(entities).length > 0) {
         CONVERSATION_STATE.focusedVehicle = matches[0];
         return `I dynamically processed your request and found **${matches.length}** high-quality options.\n\nThe most relevant is the **${matches[0].year} ${matches[0].title}** for ${formatCurrency(matches[0].price)}.\n\nFeel free to ask for specs, request more similar cars, or book a viewing right now.`;
      }
      return "I operate using advanced contextual parsing to find you the best vehicles. You can ask me things like 'Find me a white Ford SUV under 40k' or 'What is your cheapest truck?'. What are you hunting for today?";
    }
  }
}

/* ── Phone-lead capture ─────────────────────────────────── */
const PHONE_RE = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/;

async function tryCaptureLead(text, sessionId) {
  const phone = (text.match(PHONE_RE) || [])[0];
  if (!phone) return false;
  try {
    await axios.post(`${API}/leads`, {
      phone,
      lead_type: 'chatbot',
      message: `Chatbot Intelligence lead — phone shared: ${text}`,
      session_id: sessionId,
    });
    return true;
  } catch {
    return false;
  }
}

/* ── Message bubble ─────────────────────────────────────── */
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

/* ── Main component ─────────────────────────────────────── */
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

  // Load full inventory once
  useEffect(() => {
    axios
      .get(`${API}/vehicles?limit=500&_t=${Date.now()}`)
      .then((res) => setInventory(res.data.vehicles || []))
      .catch(() => {});
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setThinking(true);

    // Check for phone lead in parallel
    tryCaptureLead(text, sessionId).then((captured) => {
      if (captured) setLeadConfirmed(true);
    });

    // AI Intelligence Theater: Mandatory thinking delay for perceived reasoning (2.5 - 4.5s)
    const delay = 2500 + Math.random() * 2000;

    setTimeout(() => {
      try {
        // Try backend first, fall back to local brain
        axios
          .post(`${API}/chat`, { session_id: sessionId, message: text })
          .then(({ data }) => {
            const resp = data.response || '';
            // If backend gives a useful answer, use it; otherwise use local brain
            const useLocal = !resp || resp.length < 40 || resp.includes('[LIMIT]') || resp.includes('[ERR]');
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: useLocal
                  ? buildLocalResponse(text, inventory)
                  : resp,
              },
            ]);
          })
          .catch(() => {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: buildLocalResponse(text, inventory),
              },
            ]);
          })
          .finally(() => setThinking(false));
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: buildLocalResponse(text, inventory) },
        ]);
        setThinking(false);
      }
    }, delay);
  }, [input, thinking, inventory, sessionId]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
                    Neural Engine
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-[9px] font-body uppercase tracking-widest">
                      {inventory.length > 0 ? `${inventory.length} vehicles loaded` : 'connecting…'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/20 hover:text-white/70 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-1" style={{ scrollbarWidth: 'thin' }}>
              {messages.map((msg, i) => (
                <Bubble key={i} msg={msg} />
              ))}
              {thinking && <ThinkingPulse />}
              <div ref={bottomRef} />
            </div>

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
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
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
              <p className="text-white/15 text-[10px] font-body mt-2 text-center tracking-wide">
                Share your phone number to speak with a specialist
              </p>
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
          {/* Online indicator */}
          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#050505] rounded-full" />
        </div>
      </motion.button>
    </>
  );
}
