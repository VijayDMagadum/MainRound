"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  StopCircle, 
  AlertTriangle, 
  User, 
  Bot, 
  Loader2, 
  HelpCircle,
  ShieldCheck
} from "lucide-react";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AssistantChatProps {
  householdProfile: any;
  weatherForecast: any;
  locale: string;
}

export default function AssistantChat({
  householdProfile,
  weatherForecast,
  locale
}: AssistantChatProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? searchParams.get("q") : null;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: locale === "hi" 
        ? "नमस्ते! मैं मानसून साथी हूँ। मैं आपके स्थान के लिए अनुकूलित बाढ़ सुरक्षा, आपातकालीन सामग्री बैग और मानसून सावधानियों पर मार्गदर्शन दे सकता हूँ। आप मुझसे क्या पूछना चाहते हैं?" 
        : locale === "mr"
        ? "नमस्कार! मी पावसाळा साथी आहे. मी आपल्या भागात पूर सुरक्षा, आपत्कालीन बॅग आणि पावसाळ्यातील काळजी याबद्दल माहिती देऊ शकतो. आपण काय विचारू इच्छिता?"
        : "Hello! I am Monsoon Saathi, your AI safety advisor. I can assist you with storm preparedness checklists, travel warnings, power outage precautions, or post-event cleanups tailored to your household. How can I help you today?"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Suggested questions
  const suggestedQuestions = [
    { en: "What should my family do before tonight's rain?", hi: "आज रात की बारिश से पहले मेरे परिवार को क्या करना चाहिए?", mr: "आज रात्रीच्या पावसापूर्वी माझ्या कुटुंबाने काय करावे?" },
    { en: "What should I keep in an emergency bag?", hi: "आपातकालीन बैग में मुझे क्या रखना चाहिए?", mr: "आपत्कालीन बॅगमध्ये काय असावे?" },
    { en: "What should I do during a power outage?", hi: "बिजली कटौती के दौरान मुझे क्या करना चाहिए?", mr: "वीज गेल्यास काय करावे?" },
    { en: "What should I do if water starts entering my home?", hi: "अगर घर में पानी घुसने लगे तो क्या करें?", mr: "घरात पाणी शिरू लागल्यास काय करावे?" }
  ];

  // Auto-fill query from URL search param (e.g. from dashboard link)
  useEffect(() => {
    if (initialQuery) {
      sendMessage(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInputValue("");
    setLoading(true);

    // Setup abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          history: messages, // Send past history logs
          household: householdProfile,
          forecast: weatherForecast,
          locale
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error("Assistant service failed to respond.");
      }

      const data = await res.json();
      
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "I'm sorry, I couldn't generate an answer."
        }
      ]);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "Network error. AI is temporarily offline. Your weather widget and offline checklists remain accessible."
          }
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "[Generation Stopped by User]" }
      ]);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: "assistant",
        content: "Conversation history cleared. How can I help you prepare now?"
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[78vh] bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Safety header disclaimer */}
      <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-850 flex items-center gap-2 text-[10px] text-slate-400">
        <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
        <span>
          <strong>Safety Grounding Enabled</strong>: AI answers are computed based on deterministic weather models. We never fabricate evacuation notices or emergency closures. Follow municipal disaster announcements.
        </span>
      </div>

      {/* Message logs area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isBot = msg.role === "assistant";
          return (
            <div 
              key={index} 
              className={`flex items-start gap-3 max-w-[85%] ${
                isBot ? "mr-auto" : "ml-auto flex-row-reverse"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 border ${
                isBot 
                  ? "bg-slate-950 border-slate-850 text-teal-400" 
                  : "bg-teal-950/30 border-teal-500/20 text-teal-400"
              }`}>
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                isBot 
                  ? "bg-slate-900/60 border-slate-850 text-slate-350" 
                  : "bg-slate-900 border-slate-800 text-slate-100"
              }`}>
                {/* Process answers as simple markdown paragraphs */}
                <div className="whitespace-pre-line space-y-2">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 mr-auto max-w-[85%]">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-850 text-teal-400 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl flex items-center gap-2 text-xs text-slate-450">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              <span>Consulting Saathi AI...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Suggested questions box */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-slate-850 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-500" /> Suggested Queries
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedQuestions.map((q, idx) => {
              const text = locale === "hi" ? q.hi : locale === "mr" ? q.mr : q.en;
              return (
                <button
                  key={idx}
                  onClick={() => sendMessage(text)}
                  className="text-left px-3 py-2 bg-slate-950/60 border border-slate-850 hover:bg-slate-900/80 hover:border-slate-750 text-[11px] text-slate-350 hover:text-teal-400 rounded-xl transition-all truncate cursor-pointer"
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat controls input bar */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-850 flex items-center gap-2">
        <button
          onClick={handleClearHistory}
          className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-450 hover:text-slate-300 rounded-xl transition-colors cursor-pointer"
          title="Clear chat history"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage(inputValue);
          }}
          placeholder="Ask about storm warnings, compound safety, go-bag lists..."
          className="flex-1 glass-input px-4 py-2.5 rounded-xl text-xs outline-none focus:border-teal-500/80"
          disabled={loading}
        />

        {loading ? (
          <button
            onClick={handleStopGeneration}
            className="p-2.5 bg-red-950/40 border border-red-900/50 hover:bg-red-900/30 text-red-400 rounded-xl flex items-center justify-center cursor-pointer"
            title="Stop generating"
          >
            <StopCircle className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim()}
            className="p-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 rounded-xl flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
