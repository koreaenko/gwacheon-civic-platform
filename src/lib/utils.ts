import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 랜덤 파스텔톤 색상 생성 유틸리티
export const pastelColors = [
  "bg-pink-200 text-pink-900 border-pink-300",
  "bg-purple-200 text-purple-900 border-purple-300",
  "bg-indigo-200 text-indigo-900 border-indigo-300",
  "bg-blue-200 text-blue-900 border-blue-300",
  "bg-cyan-200 text-cyan-900 border-cyan-300",
  "bg-teal-200 text-teal-900 border-teal-300",
  "bg-emerald-200 text-emerald-900 border-emerald-300",
  "bg-green-200 text-green-900 border-green-300",
  "bg-lime-200 text-lime-900 border-lime-300",
  "bg-yellow-200 text-yellow-900 border-yellow-300",
  "bg-amber-200 text-amber-900 border-amber-300",
  "bg-orange-200 text-orange-900 border-orange-300",
  "bg-red-200 text-red-900 border-red-300",
];

export function getRandomPastelColor() {
  return pastelColors[Math.floor(Math.random() * pastelColors.length)];
}
