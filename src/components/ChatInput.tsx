import React, { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (author: string, message: string) => boolean;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim()) {
      alert("아이디를 입력해주세요.");
      return;
    }
    if (message.trim()) {
      const success = onSend(author.trim(), message.trim());
      if (success) {
        setMessage("");
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-white/70 backdrop-blur-xl border-t border-white/40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50">
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-white shadow-sm border border-sky-100 rounded-full overflow-hidden transition-all focus-within:ring-2 focus-within:ring-sky-300 focus-within:border-sky-300"
        >
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="아이디"
            className="w-24 sm:w-32 bg-sky-50 py-4 pl-4 sm:pl-5 outline-none text-slate-800 placeholder:text-slate-400 border-r border-sky-100 font-bold text-center text-sm sm:text-base"
            maxLength={10}
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="김종천에게 바라는 점을 적어주세요"
            className="flex-1 bg-transparent py-4 pl-4 pr-14 outline-none text-slate-800 placeholder:text-slate-400 text-sm sm:text-base"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={!message.trim() || !author.trim()}
            className="absolute right-2 p-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
