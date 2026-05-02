import { forwardRef } from "react";
import { Heart } from "lucide-react";
import { cn } from "../lib/utils";

export interface BalloonData {
  id: string;
  author?: string;
  text: string;
  likes: number;
  colorClass: string;
  opacity: number;
  hasLiked: boolean;
  createdAt?: string;
  isHiddenFromCanvas?: boolean;
}

interface BalloonProps {
  data: BalloonData;
  onLike: (id: string) => void;
  onDragStart?: (id: string, clientX: number, clientY: number) => void;
}

export const Balloon = forwardRef<HTMLDivElement, BalloonProps>(
  ({ data, onLike, onDragStart }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-0 left-0 flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing will-change-transform group transition-opacity duration-1000 border-2",
          data.colorClass
        )}
        style={{
          width: "100px",
          height: "100px",
          opacity: data.opacity,
          transformOrigin: "center center",
          touchAction: "none",
          boxShadow: "inset 0 -12px 24px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06), inset 0 2px 8px rgba(255,255,255,0.6)",
        }}
        onPointerDown={(e) => {
          // 버튼 클릭은 드래그하지 않음
          if ((e.target as HTMLElement).closest('button')) return;
          e.preventDefault();
          onDragStart?.(data.id, e.clientX, e.clientY);
        }}
      >
        <div className="flex flex-col items-center justify-center p-4 text-center h-full w-full">
          <p className="text-sm font-semibold leading-tight line-clamp-2 mb-2 w-full px-1 break-words">
            {data.text}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onLike(data.id); }}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-sm transition-all active:scale-90",
              data.hasLiked
                ? "bg-pink-100/80 text-pink-600 font-bold shadow-sm"
                : "bg-white/50 text-slate-500 hover:bg-white/80"
            )}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Heart className={cn("w-3.5 h-3.5 transition-transform", data.hasLiked ? "fill-pink-500 scale-110" : "")} />
            <span className="text-xs font-bold">{data.likes}</span>
          </button>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full mb-4 w-56 glass-strong text-slate-800 text-sm p-4 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="relative">
            <p className="mb-2 leading-relaxed text-slate-600">{data.text}</p>
            <p className="text-xs text-sky-600 font-bold text-right">— {data.author || '익명'} 님</p>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/92" />
          </div>
        </div>

        {/* Shine */}
        <div className="absolute top-3 left-4 w-5 h-3 bg-white/50 rounded-full rotate-[-40deg] blur-[1px]" />
        <div className="absolute top-5 left-6 w-2 h-1.5 bg-white/30 rounded-full rotate-[-40deg]" />
      </div>
    );
  }
);
