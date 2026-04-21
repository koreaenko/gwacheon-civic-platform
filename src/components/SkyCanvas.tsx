import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Matter from "matter-js";
import { Balloon, type BalloonData } from "./Balloon";
import { ChatInput } from "./ChatInput";
import { IntroPopup } from "./IntroPopup";
import { getRandomPastelColor, cn } from "../lib/utils";
import { containsProfanity } from "../lib/filter";
import { List, MessageCircle, Heart } from "lucide-react";

const MAX_BALLOONS = 40;
const BALLOON_RADIUS = 70; // 140px width/height / 2
const API_URL = 'http://localhost:3000/api';

export function SkyCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const balloonRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  
  const [balloons, setBalloons] = useState<BalloonData[]>([]);
  const [viewMode, setViewMode] = useState<'balloon' | 'list'>('balloon');
  const [sortMode, setSortMode] = useState<'latest' | 'popular'>('latest');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 리스트 정렬
  const sortedBalloons = useMemo(() => {
    const list = [...balloons];
    if (sortMode === 'latest') {
      // id에 Date.now() 값이 들어있으므로 문자열 비교로도 대략 최신순 정렬이 되지만, 
      // 생성 역순(최신이 위로)을 위해 reverse
      return list.reverse(); 
    } else {
      // 공감 많은 순 (내림차순)
      return list.sort((a, b) => b.likes - a.likes);
    }
  }, [balloons, sortMode]);

  // 초기 엔진 세팅
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: -0.05, scale: 0.001 } // 위로 살짝 떠오르는 중력
    });
    const world = engine.world;
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: document.createElement('div'), // Headless
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
      }
    });

    // 벽 생성 (좌, 우, 상단)
    const wallOptions = { isStatic: true, render: { visible: false } };
    const w = window.innerWidth;
    const h = window.innerHeight;
    const groundHeight = 1000;
    
    const walls = [
      Matter.Bodies.rectangle(-50, h / 2, 100, h * 2, wallOptions), // Left
      Matter.Bodies.rectangle(w + 50, h / 2, 100, h * 2, wallOptions), // Right
      Matter.Bodies.rectangle(w / 2, -900, w * 2, 2000, wallOptions), // Top (천장을 100px 내려서 모바일 상단 바에 가려지지 않게 함)
      // 바닥은 뚫려있음
    ];
    Matter.World.add(world, walls);

    // 마우스/터치 컨트롤 (드래그)
    const mouse = Matter.Mouse.create(containerRef.current);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });
    Matter.World.add(world, mouseConstraint);

    // 렌더링 동기화 루프
    Matter.Events.on(engine, "afterUpdate", () => {
      const bodies = Matter.Composite.allBodies(engine.world);
      bodies.forEach((body) => {
        if (body.label.startsWith("balloon-")) {
          const el = balloonRefs.current[body.label];
          if (el) {
            const x = body.position.x - BALLOON_RADIUS;
            const y = body.position.y - BALLOON_RADIUS;
            el.style.transform = `translate(${x}px, ${y}px) rotate(${body.angle}rad)`;
          }
        }
      });
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    // 리사이즈 핸들러
    const handleResize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      
      // 벽 위치 업데이트
      Matter.Body.setPosition(walls[0], { x: -50, y: newH / 2 });
      Matter.Body.setPosition(walls[1], { x: newW + 50, y: newH / 2 });
      Matter.Body.setPosition(walls[2], { x: newW / 2, y: -900 });
    };
    window.addEventListener("resize", handleResize);

    // 서버에서 데이터 가져오기
    fetch(`${API_URL}/balloons`)
      .then(res => res.json())
      .then(data => {
        data.forEach((b: any, i: number) => {
          setTimeout(() => {
            addNewBalloon(b.author, b.text, b.likes, b.id, b.colorClass);
          }, i * 300);
        });
      })
      .catch(err => console.error("Failed to load balloons", err));

    return () => {
      window.removeEventListener("resize", handleResize);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      if (mouseConstraint) {
        Matter.Mouse.clearSourceEvents(mouse);
      }
    };
  }, []); // 의존성 배열 비움 (최초 1회 실행)

  // 40개 초과 시 오래된 것부터 정리하는 로직
  useEffect(() => {
    if (balloons.length > MAX_BALLOONS) {
      const toRemoveCount = balloons.length - MAX_BALLOONS;
      
      // 좋아요가 가장 적은 순, 같다면 오래된 순(먼저 생성된 순)으로 정렬하여 삭제 타겟 선정
      const sorted = [...balloons].sort((a, b) => {
        if (a.likes === b.likes) return 0; // 배열의 기존 순서(시간순) 유지
        return a.likes - b.likes;
      });
      
      const targetsToRemove = sorted.slice(0, toRemoveCount);
      const targetIds = targetsToRemove.map(b => b.id);

      // 서서히 사라지게(opacity 0) 상태 업데이트
      setBalloons(prev => prev.map(b => 
        targetIds.includes(b.id) ? { ...b, opacity: 0 } : b
      ));

      // 1초 후(Fade out 완료 후) 실제 삭제
      setTimeout(() => {
        setBalloons(prev => prev.filter(b => !targetIds.includes(b.id)));
        
        // 물리 엔진에서도 삭제
        if (engineRef.current) {
          const world = engineRef.current.world;
          targetIds.forEach(id => {
            const bodyToRemove = Matter.Composite.allBodies(world).find(b => b.label === id);
            if (bodyToRemove) {
              Matter.World.remove(world, bodyToRemove);
              delete balloonRefs.current[id];
            }
          });
        }
      }, 1000);
    }
  }, [balloons.length]); // balloons 전체가 아니라 length만 구독하여 최적화

  const addNewBalloon = useCallback((author: string, text: string, initialLikes = 0, serverId?: string, serverColor?: string) => {
    // 1. 욕설 및 비방 필터링
    if (containsProfanity(text)) {
      showToast("부적절한 단어가 포함되어 있습니다. 바르고 고운 말을 사용해주세요.");
      return false;
    }

    // 2. 일일 작성 횟수 제한 검사 (서버 초기 로딩 시점은 통과)
    const today = new Date().toISOString().split('T')[0];
    if (!serverId) {
      const lastPostDate = localStorage.getItem('lastPostDate');
      if (lastPostDate === today) {
        showToast("하루에 한 번만 정책을 제안할 수 있습니다. (테스트를 위해 내일 다시 참여해주세요!)");
        return false;
      }
      localStorage.setItem('lastPostDate', today);
    }

    if (!engineRef.current) return false;
    
    const id = serverId || `balloon-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const x = window.innerWidth / 2 + (Math.random() * 100 - 50); // 화면 중앙 근처에서 살짝 랜덤
    const y = window.innerHeight + BALLOON_RADIUS + 50; // 화면 약간 아래에서 스폰

    // 물리 엔진에 Body 추가
    const body = Matter.Bodies.circle(x, y, BALLOON_RADIUS, {
      label: id,
      restitution: 0.6, // 통통 튀는 탄성
      frictionAir: 0.02, // 공기 저항
      density: 0.001,
    });
    
    // 약간의 초기 회전 및 위쪽으로의 힘 가하기
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1);
    Matter.Body.applyForce(body, body.position, { x: (Math.random() - 0.5) * 0.05, y: -0.1 });

    Matter.World.add(engineRef.current.world, body);

    const hasLiked = localStorage.getItem(`liked_${id}`) === 'true';
    const colorClass = serverColor || getRandomPastelColor();

    if (!serverId) {
      // 새로운 글이면 서버로 전송
      fetch(`${API_URL}/balloons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, author, text, likes: 0, colorClass })
      }).catch(err => console.error("Save failed", err));
    }

    setBalloons(prev => [...prev, {
      id,
      author,
      text,
      likes: initialLikes,
      colorClass,
      opacity: 1,
      hasLiked
    }]);

    return true;
  }, []);

  const handleLike = useCallback((id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const dailyLikesStr = localStorage.getItem('dailyLikes');
    let dailyLikes = dailyLikesStr ? JSON.parse(dailyLikesStr) : { date: today, count: 0 };

    if (dailyLikes.date !== today) {
      dailyLikes = { date: today, count: 0 };
    }

    if (localStorage.getItem(`liked_${id}`) === 'true') {
      // 이미 좋아요를 누름 (토글 해제)
      localStorage.removeItem(`liked_${id}`);
      // 좋아요 취소 시 카운트 복구
      dailyLikes.count = Math.max(0, dailyLikes.count - 1);
      localStorage.setItem('dailyLikes', JSON.stringify(dailyLikes));

      setBalloons(prev => prev.map(b => b.id === id ? { ...b, likes: Math.max(0, b.likes - 1), hasLiked: false } : b));
      
      // 서버에 좋아요 감소 전송
      fetch(`${API_URL}/balloons/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: -1 })
      });
      return;
    }

    // 새로운 좋아요 누름 시도
    if (dailyLikes.count >= 3) {
      showToast("오늘 부여할 수 있는 공감 하트(3개)를 모두 소진했습니다.");
      return;
    }

    // 성공 처리
    dailyLikes.count += 1;
    localStorage.setItem('dailyLikes', JSON.stringify(dailyLikes));
    localStorage.setItem(`liked_${id}`, 'true');

    setBalloons(prev => prev.map(b => b.id === id ? { ...b, likes: b.likes + 1, hasLiked: true } : b));

    // 서버에 좋아요 증가 전송
    fetch(`${API_URL}/balloons/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment: 1 })
    });

    // 물리적 효과: 커지고 떠오름
    if (engineRef.current) {
      const body = Matter.Composite.allBodies(engineRef.current.world).find(b => b.label === id);
      if (body) {
        // 크기 10% 증가 (시각적 + 물리적)
        const scale = 1.1;
        Matter.Body.scale(body, scale, scale);
        
        // 위로 강한 힘 부여
        Matter.Body.applyForce(body, body.position, { x: 0, y: -0.15 });
        
        // Balloon 컴포넌트의 DOM 크기도 키우려면 CSS transform scale을 주거나 반지름을 동기화해야 하지만,
        // 단순함을 위해 React 컴포넌트에는 scale 클래스를 토글하거나(이미 Balloon.tsx에 active:scale-95 존재),
        // Matter.js scale에 맞춰 DOM의 직접적인 width/height를 업데이트 해줄 수 있습니다.
        // 현재는 물리 엔진의 body 크기만 커지게 하여 다른 풍선을 밀어내는 효과를 극대화합니다.
        
        const el = balloonRefs.current[id];
        if (el) {
            // 현재 크기 가져와서 10% 증가
            const currentWidth = parseFloat(el.style.width) || (BALLOON_RADIUS * 2);
            el.style.width = `${currentWidth * scale}px`;
            el.style.height = `${currentWidth * scale}px`;
        }
      }
    }
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 w-full h-full bg-sky-50 overflow-hidden"
    >
      {/* 안내 팝업 */}
      <IntroPopup />

      {/* 실제 배경 이미지 (사용자가 첨부한 사진을 public/bg.jpg 로 저장했다고 가정) */}
      <div 
        className="absolute inset-0 z-0 bg-[url('/bg.jpg')] bg-cover bg-center opacity-40 blur-[2px]"
      ></div>
      
      {/* 배경 이미지를 덮는 부드러운 그라데이션 오버레이 (풍선이 잘 보이도록) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-sky-100/50 via-white/50 to-white/80 pointer-events-none"></div>

      {/* 배경 텍스트 장식 */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-0 opacity-20">
        <h1 className="text-5xl md:text-7xl font-black text-sky-800 tracking-tighter text-center leading-tight drop-shadow-2xl select-none" style={{ textShadow: "0 4px 20px rgba(255, 255, 255, 0.8)" }}>
          살기좋은 과천을 위해<br/>김종천에게 바란다
        </h1>
      </div>

      {/* 뷰 전환 버튼 */}
      <button
        onClick={() => setViewMode(prev => prev === 'balloon' ? 'list' : 'balloon')}
        className="absolute top-4 right-4 z-50 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg font-bold text-slate-700 flex items-center gap-2 border border-white/50 active:scale-95 transition-transform"
      >
        {viewMode === 'balloon' ? (
          <><List className="w-5 h-5 text-sky-500" /> 리스트 보기</>
        ) : (
          <><MessageCircle className="w-5 h-5 text-pink-500" /> 풍선 보기</>
        )}
      </button>

      {/* 토스트 메시지 UI */}
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] bg-slate-800/90 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 font-medium text-center whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* 풍선 렌더링 */}
      {balloons.map((balloon) => (
        <Balloon
          key={balloon.id}
          ref={(el) => (balloonRefs.current[balloon.id] = el)}
          data={balloon}
          onLike={handleLike}
        />
      ))}

      {/* 리스트 뷰 오버레이 */}
      {viewMode === 'list' && (
        <div className="absolute inset-0 z-40 bg-slate-50/80 backdrop-blur-xl flex flex-col pt-20 pb-24 touch-auto">
          {/* 장식용 배경 원 */}
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0"></div>
          <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0"></div>

          {/* 정렬 탭 */}
          <div className="relative z-10 flex justify-center gap-3 mb-6 px-4">
            <button 
              onClick={() => setSortMode('latest')} 
              className={cn("px-6 py-2.5 rounded-full font-bold transition-all shadow-sm", sortMode === 'latest' ? 'bg-sky-500 text-white shadow-sky-200' : 'bg-white/90 text-slate-500 border border-white')}
            >
              🌱 최신순
            </button>
            <button 
              onClick={() => setSortMode('popular')} 
              className={cn("px-6 py-2.5 rounded-full font-bold transition-all shadow-sm", sortMode === 'popular' ? 'bg-pink-500 text-white shadow-pink-200' : 'bg-white/90 text-slate-500 border border-white')}
            >
              🔥 공감많은순
            </button>
          </div>

          {/* 리스트 영역 */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-10 space-y-4">
            {sortedBalloons.length === 0 ? (
              <div className="text-center text-slate-500 mt-10 font-medium">첫 번째 정책을 남겨주세요!</div>
            ) : (
              sortedBalloons.map(b => (
                <div key={b.id} className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col gap-4 transform transition-all hover:scale-[1.01]">
                  <div className="flex gap-3 items-start">
                    <div className="mt-1 w-2 h-2 rounded-full bg-sky-400 shrink-0"></div>
                    <p className="text-slate-700 text-base md:text-lg font-medium break-words leading-relaxed flex-1">{b.text}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <span className="text-sm text-sky-600 font-bold px-2">{b.author || '익명'} 님</span>
                    <button
                      onClick={() => handleLike(b.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all shadow-sm border",
                        b.hasLiked ? "bg-pink-50 border-pink-100 text-pink-600 font-bold" : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <Heart className={cn("w-4 h-4 transition-transform", b.hasLiked ? "fill-pink-500 scale-110" : "")} />
                      <span className="text-sm">{b.likes}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ChatInput onSend={addNewBalloon} />
    </div>
  );
}
