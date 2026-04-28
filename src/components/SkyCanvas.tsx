import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Matter from "matter-js";
import { Balloon, type BalloonData } from "./Balloon";
import { ChatInput } from "./ChatInput";
import { IntroPopup } from "./IntroPopup";
import { getRandomPastelColor, cn } from "../lib/utils";
import { containsProfanity } from "../lib/filter";
import { List, MessageCircle, Heart, Trophy, X, Sparkles } from "lucide-react";

const MAX_BALLOONS = 40;
const BALLOON_RADIUS = 70;
const API_URL = '/api';

/* ── floating particles background ── */
function FloatingParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      size: Math.random() * 6 + 3,
      left: Math.random() * 100,
      delay: Math.random() * 12,
      duration: Math.random() * 10 + 14,
      opacity: Math.random() * 0.25 + 0.08,
      color: ['#7dd3fc','#f9a8d4','#fde68a','#a5b4fc','#86efac'][Math.floor(Math.random()*5)],
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            left: `${p.left}%`, bottom: '-20px',
            background: p.color, opacity: p.opacity,
            animation: `float-particle ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function SkyCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const balloonRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  
  const [balloons, setBalloons] = useState<BalloonData[]>([]);
  const [viewMode, setViewMode] = useState<'balloon' | 'list'>('balloon');
  const [sortMode, setSortMode] = useState<'latest' | 'popular'>('latest');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [rankings, setRankings] = useState<{nickname: string, score: number}[]>([]);

  const fetchRankings = useCallback(() => {
    fetch(`${API_URL}/rankings`)
      .then(res => res.json())
      .then(data => setRankings(data))
      .catch(err => console.error("Failed to load rankings", err));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const sortedBalloons = useMemo(() => {
    const list = [...balloons];
    if (sortMode === 'latest') return list.reverse();
    return list.sort((a, b) => b.likes - a.likes);
  }, [balloons, sortMode]);

  /* ── physics engine ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = Matter.Engine.create({ gravity: { x: 0, y: -0.05, scale: 0.001 } });
    engineRef.current = engine;

    Matter.Render.create({
      element: document.createElement('div'),
      engine, options: { width: window.innerWidth, height: window.innerHeight, wireframes: false }
    });

    const wallOpts = { isStatic: true, render: { visible: false } };
    const w = window.innerWidth, h = window.innerHeight;
    const walls = [
      Matter.Bodies.rectangle(-50, h/2, 100, h*2, wallOpts),
      Matter.Bodies.rectangle(w+50, h/2, 100, h*2, wallOpts),
      Matter.Bodies.rectangle(w/2, -900, w*2, 2000, wallOpts),
    ];
    Matter.World.add(engine.world, walls);

    //const mouse = Matter.Mouse.create(containerRef.current);
    //const mc = Matter.MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
    //Matter.World.add(engine.world, mc);

    Matter.Events.on(engine, "afterUpdate", () => {
      Matter.Composite.allBodies(engine.world).forEach(body => {
        if (body.label.startsWith("balloon-")) {
          const el = balloonRefs.current[body.label];
          if (el) {
            el.style.transform = `translate(${body.position.x - BALLOON_RADIUS}px, ${body.position.y - BALLOON_RADIUS}px) rotate(${body.angle}rad)`;
          }
        }
      });
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    runnerRef.current = runner;

    const handleResize = () => {
      const nw = window.innerWidth, nh = window.innerHeight;
      Matter.Body.setPosition(walls[0], { x: -50, y: nh/2 });
      Matter.Body.setPosition(walls[1], { x: nw+50, y: nh/2 });
      Matter.Body.setPosition(walls[2], { x: nw/2, y: -900 });
    };
    window.addEventListener("resize", handleResize);

    fetch(`${API_URL}/balloons`).then(r => r.json()).then(data => {
      data.forEach((b: any, i: number) => {
        setTimeout(() => addNewBalloon(b.author, b.text, b.likes, b.id, b.colorClass), i * 300);
      });
    }).catch(err => console.error("Failed to load balloons", err));

    return () => {
      window.removeEventListener("resize", handleResize);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      Matter.Mouse.clearSourceEvents(mouse);
    };
  }, []);

  /* ── cleanup old balloons ── */
  useEffect(() => {
    const visible = balloons.filter(b => !b.isHiddenFromCanvas);
    if (visible.length > MAX_BALLOONS) {
      const cnt = visible.length - MAX_BALLOONS;
      const top10 = [...visible].sort((a,b) => b.likes - a.likes).slice(0,10).map(b => b.id);
      const targets = visible.filter(b => !top10.includes(b.id)).slice(0, cnt).map(b => b.id);

      setBalloons(prev => prev.map(b => targets.includes(b.id) ? { ...b, opacity: 0 } : b));
      setTimeout(() => {
        setBalloons(prev => prev.map(b => targets.includes(b.id) ? { ...b, isHiddenFromCanvas: true } : b));
        if (engineRef.current) {
          const world = engineRef.current.world;
          targets.forEach(id => {
            const body = Matter.Composite.allBodies(world).find(b => b.label === id);
            if (body) { Matter.World.remove(world, body); delete balloonRefs.current[id]; }
          });
        }
      }, 1000);
    }
  }, [balloons.length]);

  const addNewBalloon = useCallback((author: string, text: string, initialLikes = 0, serverId?: string, serverColor?: string) => {
    if (containsProfanity(text)) { showToast("부적절한 단어가 포함되어 있습니다. 바르고 고운 말을 사용해주세요."); return false; }
    const today = new Date().toISOString().split('T')[0];
    if (!serverId) {
      const dpStr = localStorage.getItem('dailyPosts');
      let dailyPosts = dpStr ? JSON.parse(dpStr) : { date: today, count: 0 };
      if (dailyPosts.date !== today) dailyPosts = { date: today, count: 0 };
      if (dailyPosts.count >= 3) { showToast("오늘의 제안 횟수(3회)를 모두 사용했습니다."); return false; }
      dailyPosts.count += 1;
      localStorage.setItem('dailyPosts', JSON.stringify(dailyPosts));
    }
    if (!engineRef.current) return false;

    const id = serverId || `balloon-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    // 모바일에서도 풍선이 화면 전체에 분산되도록 랜덤 X 좌표
    const margin = BALLOON_RADIUS + 10;
    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = window.innerHeight + BALLOON_RADIUS + 50;
    const body = Matter.Bodies.circle(x, y, BALLOON_RADIUS, { label: id, restitution: 0.6, frictionAir: 0.02, density: 0.001 });
    Matter.Body.setAngularVelocity(body, (Math.random()-0.5)*0.1);
    Matter.Body.applyForce(body, body.position, { x: (Math.random()-0.5)*0.05, y: -0.1 });
    Matter.World.add(engineRef.current.world, body);

    const hasLiked = localStorage.getItem(`liked_${id}`) === 'true';
    const colorClass = serverColor || getRandomPastelColor();
    if (!serverId) {
      fetch(`${API_URL}/balloons`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id,author,text,likes:0,colorClass}) }).catch(console.error);
      showToast(`📝 첫 제안 등록 완료! (+10점)`);
    }
    setBalloons(prev => [...prev, { id, author, text, likes: initialLikes, colorClass, opacity: 1, hasLiked }]);
    return true;
  }, []);

  const handleLike = useCallback((id: string) => {
    const today = new Date().toISOString().split('T')[0];
    let dailyLikes = JSON.parse(localStorage.getItem('dailyLikes') || `{"date":"${today}","count":0}`);
    if (dailyLikes.date !== today) dailyLikes = { date: today, count: 0 };

    if (localStorage.getItem(`liked_${id}`) === 'true') {
      localStorage.removeItem(`liked_${id}`);
      dailyLikes.count = Math.max(0, dailyLikes.count - 1);
      localStorage.setItem('dailyLikes', JSON.stringify(dailyLikes));
      setBalloons(prev => prev.map(b => b.id === id ? { ...b, likes: Math.max(0, b.likes-1), hasLiked: false } : b));
      fetch(`${API_URL}/balloons/${id}/like`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ increment: -1 }) });
      return;
    }
    if (dailyLikes.count >= 3) { showToast("오늘 부여할 수 있는 공감 하트(3개)를 모두 소진했습니다."); return; }

    dailyLikes.count += 1;
    localStorage.setItem('dailyLikes', JSON.stringify(dailyLikes));
    localStorage.setItem(`liked_${id}`, 'true');
    setBalloons(prev => prev.map(b => b.id === id ? { ...b, likes: b.likes+1, hasLiked: true } : b));
    fetch(`${API_URL}/balloons/${id}/like`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ increment: 1, liker: localStorage.getItem('nickname') }) });
    showToast(`💖 공감 하트를 남겼습니다! (+2점)`);

    if (engineRef.current) {
      const body = Matter.Composite.allBodies(engineRef.current.world).find(b => b.label === id);
      if (body) {
        Matter.Body.scale(body, 1.1, 1.1);
        Matter.Body.applyForce(body, body.position, { x: 0, y: -0.15 });
        const el = balloonRefs.current[id];
        if (el) { const cw = parseFloat(el.style.width)||(BALLOON_RADIUS*2); el.style.width=`${cw*1.1}px`; el.style.height=`${cw*1.1}px`; }
      }
    }
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full overflow-hidden">
      {/* ── Premium gradient background ── */}
      <div className="absolute inset-0 z-0 animate-gradient" style={{
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 20%, #fdf2f8 40%, #fef3c7 60%, #e0f2fe 80%, #ede9fe 100%)',
        backgroundSize: '400% 400%',
      }} />

      {/* ── Soft radial overlays ── */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-25 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #fda4af 0%, transparent 70%)' }} />
      <div className="absolute top-[30%] left-[40%] w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, #c4b5fd 0%, transparent 70%)' }} />

      <FloatingParticles />

      {/* ── Intro popup ── */}
      <IntroPopup />

      {/* ── Hero section ── */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-[1] px-5 pt-4 md:pt-0 md:px-0 md:inset-0 md:flex md:flex-col md:justify-center md:pl-20">
        <div className="max-w-xl pointer-events-none text-left">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-1.5 glass px-3 py-1.5 md:px-5 md:py-2.5 rounded-full mb-2 md:mb-6 text-xs md:text-sm font-bold text-sky-700" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-amber-400" />
            시민과 함께 만드는 과천의 내일
          </div>

          {/* Title */}
          <h1 className="animate-fade-in-up text-3xl md:text-[clamp(2.5rem,7vw,4.5rem)] font-black tracking-tighter leading-[1.1] text-slate-800" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
            김종천에게{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 animate-gradient">
              제안하기
            </span>
          </h1>

          {/* Description - hidden on mobile for more balloon space */}
          <p className="animate-fade-in-up mt-2 md:mt-5 text-xs md:text-lg text-slate-500 font-medium leading-relaxed max-w-md" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            <span className="hidden md:inline">과천 시민 여러분의 소중한 의견이 풍선이 되어 하늘로 떠오릅니다.<br/>지금 바로 당신의 목소리를 띄워주세요!</span>
            <span className="md:hidden">풍선을 터치하고 💖으로 공감해주세요!</span>
          </p>
        </div>
      </div>

      {/* ── Top-right buttons ── */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2.5 items-end">
        <button
          onClick={() => setViewMode(prev => prev === 'balloon' ? 'list' : 'balloon')}
          className="glass hover:bg-white/70 px-4 py-2.5 rounded-2xl font-bold text-slate-600 flex items-center gap-2 active:scale-95 transition-all text-sm"
        >
          {viewMode === 'balloon' ? (
            <><List className="w-4 h-4 text-sky-500" /> 리스트</>
          ) : (
            <><MessageCircle className="w-4 h-4 text-pink-500" /> 풍선</>
          )}
        </button>
        <button
          onClick={() => { fetchRankings(); setIsRankingOpen(true); }}
          className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-all text-sm shadow-lg shadow-amber-200/50"
        >
          <Trophy className="w-4 h-4" /> 랭킹
        </button>
      </div>

      {/* ── Ranking modal ── */}
      {isRankingOpen && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-6 w-full max-w-sm shadow-2xl" style={{ animation: 'fade-in-up 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> 열혈시민 명예의 전당
              </h2>
              <button onClick={() => setIsRankingOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {rankings.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-medium text-sm">아직 랭킹 데이터가 없습니다.<br/>첫 번째 열혈시민이 되어보세요!</div>
              ) : rankings.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/60 border border-white/60 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-sm",
                      i===0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md shadow-amber-200/50" :
                      i===1 ? "bg-gradient-to-br from-slate-400 to-slate-500 shadow-md" :
                      i===2 ? "bg-gradient-to-br from-amber-600 to-amber-700 shadow-md" :
                      "bg-sky-500"
                    )}>{i+1}</div>
                    <span className="font-bold text-slate-700 text-sm">{r.nickname}</span>
                  </div>
                  <span className="font-bold text-sky-600 text-sm">{r.score}점</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] glass-strong text-slate-700 px-6 py-3 rounded-2xl shadow-xl font-bold text-sm text-center whitespace-nowrap animate-fade-in-up">
          {toastMessage}
        </div>
      )}

      {/* ── Balloons ── */}
      {balloons.map(balloon => (
        !balloon.isHiddenFromCanvas && (
          <Balloon key={balloon.id} ref={(el) => { balloonRefs.current[balloon.id] = el; }} data={balloon} onLike={handleLike} />
        )
      ))}

      {/* ── List view overlay ── */}
      {viewMode === 'list' && (
        <div className="absolute inset-0 z-40 backdrop-blur-2xl flex flex-col pt-20 pb-24 touch-auto" style={{ background: 'rgba(240,249,255,0.85)' }}>
          {/* Decorative blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply blur-3xl opacity-40 z-0" />
          <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply blur-3xl opacity-40 z-0" />
          <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply blur-3xl opacity-40 z-0" />

          {/* Sort tabs */}
          <div className="relative z-10 flex justify-center gap-3 mb-5 px-4">
            <button onClick={() => setSortMode('latest')}
              className={cn("px-5 py-2.5 rounded-2xl font-bold transition-all text-sm",
                sortMode==='latest' ? 'bg-sky-500 text-white shadow-lg shadow-sky-200/50' : 'glass text-slate-500 hover:bg-white/70')}>
              🌱 최신순
            </button>
            <button onClick={() => setSortMode('popular')}
              className={cn("px-5 py-2.5 rounded-2xl font-bold transition-all text-sm",
                sortMode==='popular' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200/50' : 'glass text-slate-500 hover:bg-white/70')}>
              🔥 공감많은순
            </button>
          </div>

          {/* List items */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-10 space-y-3">
            {sortedBalloons.length === 0 ? (
              <div className="text-center text-slate-400 mt-10 font-medium text-sm">첫 번째 제안을 남겨주세요!</div>
            ) : sortedBalloons.map(b => (
              <div key={b.id} className="glass-strong p-5 rounded-3xl flex flex-col gap-3 transform transition-all hover:scale-[1.01]">
                <div className="flex gap-3 items-start">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 shrink-0" />
                  <p className="text-slate-700 text-sm md:text-base font-medium break-words leading-relaxed flex-1">{b.text}</p>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                  <span className="text-xs text-sky-600 font-bold px-1">{b.author || '익명'} 님</span>
                  <button onClick={() => handleLike(b.id)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-bold",
                      b.hasLiked ? "bg-pink-50 text-pink-600 border border-pink-100" : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100")}>
                    <Heart className={cn("w-3.5 h-3.5 transition-transform", b.hasLiked ? "fill-pink-500 scale-110" : "")} />
                    <span>{b.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ChatInput onSend={addNewBalloon} />
    </div>
  );
}
