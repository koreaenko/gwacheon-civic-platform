import { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Lightbulb, UserPlus } from 'lucide-react';

interface IntroPopupProps {
  onRegister?: () => void;
}

const ATTENDANCE_STORAGE_KEY = 'lastAttendanceClaimDate';

function getTodayKeyInSeoul() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function IntroPopup({ onRegister }: IntroPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hideToday, setHideToday] = useState(false);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(() => Boolean(localStorage.getItem('nickname')));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname');
    const todayKey = getTodayKeyInSeoul();

    if (savedNickname && localStorage.getItem(ATTENDANCE_STORAGE_KEY) !== todayKey) {
      fetch('/api/users/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: savedNickname })
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Attendance request failed');
          return res.json();
        })
        .then(() => {
          localStorage.setItem(ATTENDANCE_STORAGE_KEY, todayKey);
        })
        .catch(() => {});
    }

    const hideUntil = localStorage.getItem('hideIntroUntil');
    if (hideUntil && savedNickname) {
      if (new Date().getTime() < parseInt(hideUntil, 10)) {
        return; // 아직 하루가 지나지 않음
      } else {
        localStorage.removeItem('hideIntroUntil'); // 만료됨
      }
    }
    // 약간의 딜레이 후 팝업 표시 (부드러운 진입)
    const timer = setTimeout(() => setIsOpen(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = async () => {
    if (!isRegistered) {
      if (!nickname.trim()) {
        setError('닉네임을 입력해주세요.');
        return;
      }
      
      setIsLoading(true);
      setError('');
      
      const deviceToken = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      try {
        const res = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: nickname.trim(), deviceToken })
        });
        
        if (res.ok) {
          localStorage.setItem('nickname', nickname.trim());
          localStorage.setItem('deviceToken', deviceToken);
          setIsRegistered(true);
          if (onRegister) onRegister();
          setIsOpen(false);
        } else if (res.status === 409) {
          setError('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');
        } else {
          // 서버 오류 시 로컬 폴백
          localStorage.setItem('nickname', nickname.trim());
          localStorage.setItem('deviceToken', deviceToken);
          setIsRegistered(true);
          if (onRegister) onRegister();
          setIsOpen(false);
        }
      } catch {
        // 서버 미연결 시 로컬로 바로 진행
        localStorage.setItem('nickname', nickname.trim());
        localStorage.setItem('deviceToken', deviceToken);
        setIsRegistered(true);
        if (onRegister) onRegister();
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (hideToday) {
      const tomorrow = new Date().getTime() + 24 * 60 * 60 * 1000;
      localStorage.setItem('hideIntroUntil', tomorrow.toString());
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black/25 backdrop-blur-md p-4" style={{ touchAction: 'auto', userSelect: 'auto', WebkitUserSelect: 'auto' }}>
      <div 
        className="glass-strong pointer-events-auto rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-fade-in-up"
        style={{ animationDuration: '0.4s', touchAction: 'auto', userSelect: 'auto', WebkitUserSelect: 'auto' } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isRegistered ? 'bg-gradient-to-br from-sky-400 to-blue-500' : 'bg-gradient-to-br from-violet-400 to-purple-500'} shadow-lg`}>
            {isRegistered ? <Sparkles className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">
              {isRegistered ? '시민이 만드는 공약집' : '열혈시민 등록하기'}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {isRegistered ? '과천의 더 나은 내일을 함께 만들어요' : '닉네임 하나로 바로 시작'}
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {!isRegistered ? (
            <div className="bg-gradient-to-br from-violet-50 to-sky-50 p-5 rounded-2xl border border-violet-100/60">
              <p className="text-sm text-slate-600 mb-4 font-medium leading-relaxed">
                앞으로 활동하며 랭킹을 누적할 닉네임을 하나 정해주세요. 한 번 정하면 변경할 수 없으며, 로그인 없이 자동으로 기억됩니다!
              </p>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.currentTarget.focus()}
                style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }}
                placeholder="사용할 닉네임 (최대 10자)"
                className="w-full px-4 py-3 rounded-xl border border-violet-200/60 bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-transparent font-medium text-sm placeholder:text-slate-400 transition-all"
                maxLength={10}
              />
              {error && <p className="text-red-500 text-xs mt-2 font-medium px-1">{error}</p>}
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-4 rounded-2xl border border-sky-100/60">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-sky-500" />
                  <h3 className="font-bold text-slate-700 text-sm">사용 방법</h3>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <li className="flex gap-2"><span className="text-sky-400 shrink-0">•</span> 하단 입력창에 바라는 점을 적어주세요.</li>
                  <li className="flex gap-2"><span className="text-sky-400 shrink-0">•</span> 작성된 제안은 예쁜 풍선이 되어 하늘로 떠오릅니다.</li>
                  <li className="flex gap-2"><span className="text-pink-400 shrink-0">•</span> 풍선을 클릭해 전체 내용을 보고 <span className="text-pink-500 font-bold">♥</span>를 눌러 공감하세요.</li>
                </ul>
                <div className="mt-3 p-2.5 bg-white/60 rounded-xl text-[11px] text-sky-700 font-medium leading-relaxed border border-sky-100/40">
                  ※ 풍선이 많아지면 오래된 순서대로 사라지지만, <strong>리스트 보기</strong>에는 영구 보관됩니다. <strong>공감 상위 10개</strong>는 항상 떠 있습니다!
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-2xl border border-red-100/60">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="font-bold text-red-600 text-sm">주의 사항</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  욕설, 비방, 명예훼손, 허위사실 유포 등 부적절한 게시물은 <strong>관련 법령에 따라 처벌</strong>받을 수 있으며, 통보 없이 <strong>삭제</strong>될 수 있습니다.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100/60">
          {isRegistered ? (
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
              <input 
                type="checkbox" 
                checked={hideToday}
                onChange={(e) => setHideToday(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer accent-sky-500"
              />
              오늘 하루 보지 않기
            </label>
          ) : <div />}
          
          <button 
            onClick={handleClose}
            disabled={isLoading}
            className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 text-white px-6 py-2.5 rounded-xl font-bold transition-all text-sm active:scale-95 shadow-lg shadow-sky-200/40"
          >
            {isLoading ? '등록 중...' : (isRegistered ? '확인 및 참여하기' : '등록하고 시작하기')}
          </button>
        </div>
      </div>
    </div>
  );
}
