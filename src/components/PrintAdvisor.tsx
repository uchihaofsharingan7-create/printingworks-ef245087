import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/print-advisor`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || 'Something went wrong');
    return;
  }

  if (!resp.body) { onError('No response'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial json, skip */ }
    }
  }
  onDone();
}

const SUGGESTIONS = [
  'What printer is best for a beginner?',
  'PLA vs PETG — which should I use?',
  'I need a strong, functional part',
  "What's the cheapest option?",
];

export function PrintAdvisor() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    await streamChat({
      messages: allMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      },
      onDone: () => setLoading(false),
      onError: (err) => {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${err}` }]);
        setLoading(false);
      },
    });
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all',
          'bg-primary text-primary-foreground hover:scale-105 glow-primary',
          open && 'rotate-90'
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-secondary/50">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Print Advisor</p>
              <p className="text-[10px] text-muted-foreground">AI-powered printing help</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[280px] max-h-[360px]">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center pt-4">
                  👋 Hi! I can help you pick the right printer and filament. Try asking:
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="h-6 w-6 shrink-0 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-6 w-6 shrink-0 rounded-full bg-muted flex items-center justify-center mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-2">
                <div className="h-6 w-6 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 text-primary animate-spin" />
                </div>
                <div className="bg-secondary rounded-xl px-3 py-2 rounded-bl-sm">
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2.5 flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask about printers & filaments…"
              disabled={loading}
              className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 transition-all shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
