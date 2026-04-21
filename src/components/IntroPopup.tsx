import React, { useState, useEffect } from 'react';

export function IntroPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hideToday, setHideToday] = useState(false);

  useEffect(() => {
    const hideUntil = localStorage.getItem('hideIntroUntil');
    if (hideUntil) {
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

  const handleClose = () => {
    if (hideToday) {
      // 현재 시간으로부터 24시간 뒤로 설정
      const tomorrow = new Date().getTime() + 24 * 60 * 60 * 1000;
      localStorage.setItem('hideIntroUntil', tomorrow.toString());
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-black text-sky-600 mb-6 flex items-center gap-2">
          <span>🎈</span> 시민이 만드는 공약집
        </h2>

        <div className="space-y-4 mb-6">
          <div className="bg-sky-50 p-4 rounded-2xl">
            <h3 className="font-bold text-slate-800 mb-2">💡 사용 방법</h3>
            <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
              <li>하단 입력창에 아이디와 바라는 점을 적어주세요.</li>
              <li>작성된 정책은 예쁜 풍선이 되어 하늘로 떠오릅니다.</li>
              <li>풍선을 클릭해 전체 내용을 보고 <span className="text-pink-500 font-bold">♥</span>를 눌러 공감할 수 있습니다.</li>
            </ul>
          </div>

          <div className="bg-red-50 p-4 rounded-2xl">
            <h3 className="font-bold text-red-600 mb-2">⚠️ 주의 사항</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              본 게시판에 욕설, 비방, 명예훼손, 허위사실 유포 등 부적절한 게시물을 작성할 경우 <strong>관련 법령에 따라 처벌</strong>받을 수 있으며, 관리자에 의해 통보 없이 <strong>삭제(블라인드)</strong> 처리될 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700">
            <input 
              type="checkbox" 
              checked={hideToday}
              onChange={(e) => setHideToday(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer"
            />
            오늘 하루 보지 않기
          </label>
          <button 
            onClick={handleClose}
            className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
          >
            확인 및 참여하기
          </button>
        </div>
      </div>
    </div>
  );
}
