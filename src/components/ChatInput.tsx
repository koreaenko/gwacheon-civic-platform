import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { ExternalLink, LayoutGrid, Send } from "lucide-react";

interface ChatInputProps {
  onSend: (author: string, message: string) => boolean;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [heartsLeft, setHeartsLeft] = useState(3);
  const [petitionsLeft, setPetitionsLeft] = useState(3);

  useEffect(() => {
    const updateStats = () => {
      setAuthor(localStorage.getItem('nickname') || "");
      const today = new Date().toISOString().split('T')[0];
      const dpStr = localStorage.getItem('dailyPosts');
      if (dpStr) {
        const dp = JSON.parse(dpStr);
        setPetitionsLeft(dp.date === today ? Math.max(0, 3 - dp.count) : 3);
      } else {
        setPetitionsLeft(3);
      }
      const dl = localStorage.getItem('dailyLikes');
      if (dl) {
        const parsed = JSON.parse(dl);
        setHeartsLeft(parsed.date === today ? Math.max(0, 3 - parsed.count) : 3);
      } else setHeartsLeft(3);
    };
    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!author.trim()) { alert("열혈시민 등록(새로고침) 후 이용해주세요."); return; }
    if (message.trim()) { if (onSend(author.trim(), message.trim())) setMessage(""); }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50" style={{ animation: 'slide-in-bottom 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="glass-strong border-t-0 rounded-t-3xl px-4 pt-3 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.06)]">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <div className="flex justify-start px-1">
            <a
              href="https://linktr.ee/2026jckim?utm_source=linktree_profile_share&ltsid=47f7fea8-fd9b-480d-8317-8e67264b6ef5"
              target="_blank"
              rel="noreferrer"
              className="glass group inline-flex items-center gap-2 rounded-2xl border border-white/60 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-white/80 hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-sm shadow-sky-200/60">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <span className="text-left leading-tight">
                김종천 공약보기
              </span>
              <ExternalLink className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          {/* Status badges */}
          <div className="flex justify-end gap-2 text-xs font-bold text-slate-500 px-1">
            <div className="glass px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              📝 <span className={petitionsLeft > 0 ? "text-sky-500" : "text-slate-400"}>{petitionsLeft}/3</span>
            </div>
            <div className="glass px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              💖 <span className={heartsLeft > 0 ? "text-pink-500" : "text-slate-400"}>{heartsLeft}/3</span>
            </div>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="relative flex items-center bg-white/90 shadow-sm border border-sky-100/60 rounded-2xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-sky-300/50 focus-within:border-sky-200">
            <input
              type="text"
              value={author}
              readOnly
              placeholder="등록필요"
              className="w-20 sm:w-28 bg-sky-50/60 py-3.5 pl-3 sm:pl-4 outline-none text-slate-600 placeholder:text-slate-400 border-r border-sky-100/60 font-bold text-center text-xs sm:text-sm cursor-not-allowed"
            />
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={petitionsLeft > 0 ? "김종천에게 바라는 점을 적어주세요" : "오늘의 제안을 완료했습니다!"}
              disabled={petitionsLeft === 0}
              className="flex-1 bg-transparent py-3.5 pl-3 pr-12 outline-none text-slate-700 placeholder:text-slate-400 text-sm disabled:bg-slate-50/50 disabled:cursor-not-allowed"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={!message.trim() || petitionsLeft === 0}
              className="absolute right-2 p-2 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all flex items-center justify-center active:scale-90 shadow-sm shadow-sky-200/50"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
