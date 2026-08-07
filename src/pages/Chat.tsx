import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Paperclip, Mic, Menu, X, File as FileIcon } from 'lucide-react';
import { BottomMenu } from '@/components/ui/BottomMenu';
import logo from '@/assets/Logo.png';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AuthButton } from '@/components/ui/AuthButton';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const getInitialMessages = (): Message[] => {
  if (typeof window !== 'undefined' && sessionStorage.getItem('hasSeenGreeting')) {
    return [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I am HealthAssist AI, your Clinical Copilot.\n\nHow can I help you with your clinical or health-related questions today?',
        timestamp: new Date()
      }
    ];
  }
  return [];
};

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session, isGuest } = useAuthStore();
  const { latitude, longitude } = useLocationStore();
  const [attachedFile, setAttachedFile] = useState<{ file: File, base64: string } | null>(null);
  const { llmEngine, toggleToolsDrawer } = useSettingsStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Simulate AI greeting on initial load
    if (messages.length === 0) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am HealthAssist AI, your Clinical Copilot.\n\nHow can I help you with your clinical or health-related questions today?',
            timestamp: new Date()
          }
        ]);
        sessionStorage.setItem('hasSeenGreeting', 'true');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("File size exceeds the 3MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      setAttachedFile({ file, base64: base64String });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    const userText = input || "[Attached File]";
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input ? input : `Attached: ${attachedFile?.file.name}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    const filePayload = attachedFile ? { file_data: attachedFile.base64, file_mime_type: attachedFile.file.type } : {};
    setAttachedFile(null);
    finalTranscriptRef.current = '';
    setIsTyping(true);

    try {
      const API_BASE_URL = "/api";
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          message: userText, 
          llm_engine: llmEngine, 
          latitude: latitude,
          longitude: longitude,
          ...filePayload 
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before sending another message.');
        }
        throw new Error('Failed to communicate with AI server.');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**Error:** ${error.message || 'An unexpected error occurred.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          if (finalTranscriptRef.current && !finalTranscriptRef.current.endsWith(' ')) {
            finalTranscriptRef.current += ' ';
          }
          finalTranscriptRef.current += finalTranscript;
        }
        setInput(finalTranscriptRef.current + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        isListeningRef.current = false;
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
      };

      recognitionRef.current = recognition;
    }

    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn("Already started", e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground pb-32 selection:bg-primary/20">
      
      {/* Header section with clinical aesthetic */}
      <header className="pt-10 pb-6 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => toggleToolsDrawer(true)} className="p-2 -ml-2 text-foreground hover:bg-muted rounded-xl transition-colors">
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center overflow-hidden border border-border">
             <img src={logo} alt="HealthAssist AI" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground leading-tight">HealthAssist</h1>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">AI Clinical Copilot</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <AuthButton />
          <ThemeToggle />
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm hover:scale-110 hover:-translate-y-1 transition-all duration-300">
            <User size={18} />
          </button>
        </div>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto px-6 sm:px-12 pt-6 pb-32 max-w-4xl mx-auto w-full flex flex-col gap-6">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            
            return (
              <motion.div 
                key={message.id} 
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex gap-4 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {isUser ? (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
                    <User size={14} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[#166534] shadow-sm">
                    <Bot size={16} />
                  </div>
                )}
              </div>
              
              {/* Message Bubble */}
              <div className={`p-4 rounded-[20px] shadow-sm ${
                isUser 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-card border border-border text-card-foreground rounded-tl-sm'
              }`}>
                {isUser ? (
                  <p className="text-[15px] whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none text-[15px] text-card-foreground
                    prose-p:leading-loose prose-p:mb-6 prose-ul:mb-6 prose-li:mb-3 prose-pre:bg-muted prose-pre:border prose-pre:border-border
                    prose-a:text-blue-600 prose-strong:text-foreground prose-strong:font-bold
                    prose-table:border-collapse prose-table:w-full prose-th:bg-muted prose-th:p-2 prose-th:border prose-th:border-border
                    prose-td:p-2 prose-td:border prose-td:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              </motion.div>
            );
          })}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex gap-4 max-w-[85%]"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[#166534] shadow-sm">
                  <Bot size={16} />
                </div>
              </div>
              <div className="p-4 py-5 rounded-[20px] rounded-tl-sm bg-card border border-border shadow-sm flex items-center justify-center gap-1.5 min-w-[70px]">
                <motion.div 
                  className="w-2 h-2 rounded-full bg-muted-foreground/60"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                />
                <motion.div 
                  className="w-2 h-2 rounded-full bg-muted-foreground/60"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div 
                  className="w-2 h-2 rounded-full bg-muted-foreground/60"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="fixed bottom-[104px] left-0 right-0 px-6 sm:px-12 max-w-4xl mx-auto z-40 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-2">
        <AnimatePresence>
          {attachedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 bg-card border border-border rounded-xl px-3 py-2 flex items-center justify-between w-max shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                <FileIcon size={16} className="text-blue-600" />
                <span className="truncate max-w-[200px]">{attachedFile.file.name}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({(attachedFile.file.size / 1024 / 1024).toFixed(1)}MB)
                </span>
              </div>
              <button onClick={() => setAttachedFile(null)} className="ml-6 text-muted-foreground hover:text-red-500 transition-colors bg-muted/50 p-1 rounded-full">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <form onSubmit={handleSend} className="relative flex items-center shadow-lg rounded-2xl bg-card border border-border overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition-all">
          <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf,image/jpeg,image/png" onChange={handleFileSelect} />
          <button 
            type="button" 
            onClick={() => {
              if (isGuest) {
                alert("Guest Mode: File uploads are disabled. Please sign up to use this feature.");
                return;
              }
              fileInputRef.current?.click();
            }} 
            className="p-4 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Paperclip size={20} className={isGuest ? "opacity-50" : ""} />
          </button>
          
          <input 
            type="text" 
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              finalTranscriptRef.current = e.target.value;
            }}
            placeholder={isListening ? "Listening..." : "Describe your symptoms or ask a medical question..."} 
            className="flex-1 py-4 px-2 outline-none text-foreground bg-transparent placeholder-muted-foreground font-medium"
          />
          
          <div className="pr-2 flex gap-2">
            {isListening && (
              <button 
                type="button" 
                onClick={toggleListening}
                className="p-2.5 rounded-xl transition-colors relative shadow-md bg-red-500 text-white"
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-8 w-8 rounded-xl bg-red-400 opacity-75"></span>
                </span>
                <Mic size={18} className="relative z-10" />
              </button>
            )}
            
            {(!isListening && !input.trim() && !attachedFile) && (
              <button 
                type="button" 
                onClick={toggleListening}
                className="p-2.5 rounded-xl transition-colors relative shadow-md bg-muted/50 text-gray-500 hover:bg-muted"
              >
                <Mic size={18} className="relative z-10" />
              </button>
            )}

            {(input.trim() || attachedFile) ? (
              <button 
                type="submit" 
                onClick={() => {
                   if(isListening) toggleListening();
                }}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md"
              >
                <Send size={18} />
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {/* Persistent Bottom Nav */}
      <BottomMenu />
    </div>
  );
};

export default Chat;
