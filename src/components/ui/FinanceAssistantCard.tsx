import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Bot, Sparkles, AlertCircle, Send, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

export const FinanceAssistantCard = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialInsight();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchInitialInsight = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('financial-assistant', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw new Error(response.error.message);
      
      setMessages([{ role: 'assistant', text: response.data.insight }]);
      setIsFallback(response.data.isFallback);
    } catch (error) {
      console.error("Error fetching insight:", error);
      setMessages([{ role: 'assistant', text: "Tu balance es saludable este mes. Sigue controlando tus gastos." }]);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setInputText('');
    
    // Optimistic UI update
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await supabase.functions.invoke('financial-assistant', {
        body: { messages: newMessages },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw new Error(response.error.message);
      
      setMessages([...newMessages, { role: 'assistant', text: response.data.insight }]);
      setIsFallback(response.data.isFallback);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([...newMessages, { role: 'assistant', text: "Lo siento, hubo un problema al procesar tu mensaje." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-slate-900 rounded-3xl p-5 shadow-lg relative overflow-hidden mb-6">
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 bg-slate-800" />
            <Skeleton className="h-3 w-3/4 bg-slate-800" />
            <Skeleton className="h-3 w-1/2 bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 rounded-3xl p-5 shadow-lg relative overflow-hidden mb-6 flex flex-col max-h-[400px]">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 relative z-10 border-b border-slate-800 pb-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 shadow-inner">
          <Bot size={20} className="text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-white font-semibold text-sm">Asistente Financiero</h4>
            {!isFallback ? (
              <span className="flex items-center gap-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                <Sparkles size={10} /> IA
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                <AlertCircle size={10} /> Local
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Analizando tus finanzas en tiempo real</p>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 relative z-10 scrollbar-thin scrollbar-thumb-slate-700 max-h-[200px]"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-primary/20 text-primary'}`}>
              {msg.role === 'user' ? <User size={12} className="text-slate-300" /> : <Bot size={12} />}
            </div>
            <div className={`p-2.5 rounded-2xl text-sm max-w-[85%] ${
              msg.role === 'user' 
                ? 'bg-slate-700 text-white rounded-tr-none' 
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Bot size={12} />
            </div>
            <div className="p-3 bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-none flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative z-10 flex gap-2">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={isFallback ? "IA desconectada..." : "Pregúntame sobre tus gastos..."}
          disabled={isTyping || isFallback}
          className="flex-1 bg-slate-800 text-white text-sm rounded-full px-4 py-2 border border-slate-700 focus:outline-none focus:border-primary/50 disabled:opacity-50"
        />
        <button 
          onClick={handleSendMessage}
          disabled={isTyping || !inputText.trim() || isFallback}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-50 disabled:bg-slate-700 transition-colors shrink-0"
        >
          <Send size={16} className={isTyping ? "animate-pulse" : ""} />
        </button>
      </div>
    </div>
  );
};
