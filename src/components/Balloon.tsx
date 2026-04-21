import React, { forwardRef } from "react";
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
}

interface BalloonProps {
  data: BalloonData;
  onLike: (id: string) => void;
}

export const Balloon = forwardRef<HTMLDivElement, BalloonProps>(
  ({ data, onLike }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-0 left-0 flex items-center justify-center rounded-full shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1),_0_10px_15px_rgba(0,0,0,0.05)] cursor-grab active:cursor-grabbing will-change-transform group transition-opacity duration-1000 border-2",
          data.colorClass
        )}
        style={{
          width: "140px",
          height: "140px",
          opacity: data.opacity,
          transformOrigin: "center center",
          touchAction: "none" // Prevent scroll when dragging
        }}
      >
        <div className="flex flex-col items-center justify-center p-4 text-center h-full w-full">
          <p className="text-sm font-semibold leading-tight line-clamp-2 mb-2 w-full px-1 break-words">
            {data.text}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(data.id);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-white/60 hover:bg-white/90 backdrop-blur-sm transition-all shadow-sm active:scale-95",
              data.hasLiked ? "text-pink-600 font-bold" : "text-slate-600"
            )}
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking like
          >
            <Heart
              className={cn("w-4 h-4 transition-transform", data.hasLiked ? "fill-pink-500 scale-110" : "")}
            />
            <span className="text-xs">{data.likes}</span>
          </button>
        </div>

        {/* CSS-only Tooltip */}
        <div className="absolute bottom-full mb-4 w-56 bg-white/95 backdrop-blur-md text-slate-800 text-sm p-3 rounded-2xl shadow-xl border border-sky-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="relative">
            <p className="mb-2 leading-relaxed">{data.text}</p>
            <p className="text-xs text-sky-600 font-bold text-right">- {data.author || '익명'} 님</p>
            {/* Arrow */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/95"></div>
          </div>
        </div>

        {/* Shine effect */}
        <div className="absolute top-2 left-3 w-6 h-4 bg-white/40 rounded-full rotate-[-45deg] blur-[1px]"></div>
      </div>
    );
  }
);
