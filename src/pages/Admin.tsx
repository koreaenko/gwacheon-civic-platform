import React, { useState, useEffect } from 'react';

interface Balloon {
  id: string;
  text: string;
  likes: number;
  isHidden: boolean;
  mergedIntoId: string | null;
  createdAt: string;
}

export function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const API_URL = 'http://localhost:3000/api';

  useEffect(() => {
    if (isAuthenticated) {
      fetchBalloons();
    }
  }, [isAuthenticated]);

  const fetchBalloons = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/balloons`);
      const data = await res.json();
      setBalloons(data);
    } catch (err) {
      console.error(err);
      alert('서버 연결에 실패했습니다. 백엔드 서버가 켜져 있는지 확인하세요.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234') {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return alert('삭제할 항목을 선택해주세요.');
    if (!confirm(`선택한 ${selectedIds.size}개의 항목을 블라인드(삭제) 처리하시겠습니까?`)) return;

    for (const id of selectedIds) {
      await fetch(`${API_URL}/balloons/${id}`, { method: 'DELETE' });
    }
    alert('삭제 완료');
    setSelectedIds(new Set());
    fetchBalloons();
  };

  const handleMerge = async () => {
    if (selectedIds.size < 2) return alert('합치려면 최소 2개 이상의 항목을 선택해야 합니다.');
    
    // 선택된 항목 중에서 메인 글 고르기
    const selectedList = balloons.filter(b => selectedIds.has(b.id));
    const mainText = prompt(
      `다음 중 메인(대표)이 될 문구의 번호를 입력하세요:\n\n` +
      selectedList.map((b, i) => `[${i + 1}] ${b.text}`).join('\n')
    );

    if (!mainText) return;
    const index = parseInt(mainText) - 1;
    if (isNaN(index) || index < 0 || index >= selectedList.length) {
      return alert('올바른 번호를 입력하지 않아 취소되었습니다.');
    }

    const mainId = selectedList[index].id;
    const mergeIds = selectedList.filter(b => b.id !== mainId).map(b => b.id);

    try {
      const res = await fetch(`${API_URL}/balloons/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainId, mergeIds })
      });
      if (res.ok) {
        alert('합치기 완료!');
        setSelectedIds(new Set());
        fetchBalloons();
      } else {
        alert('합치기 실패');
      }
    } catch (err) {
      console.error(err);
      alert('오류 발생');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-96 flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-center mb-4">관리자 로그인</h1>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="border p-3 rounded"
          />
          <button type="submit" className="bg-sky-500 text-white p-3 rounded font-bold hover:bg-sky-600 transition-colors">
            접속
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">공약 관리 대시보드</h1>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-semibold hover:bg-red-100">
              선택 삭제(블라인드)
            </button>
            <button onClick={handleMerge} className="bg-sky-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-sky-600 shadow-sm shadow-sky-200">
              선택 합치기 (Merge)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-t text-sm text-slate-500">
                <th className="p-4 font-semibold w-12 text-center">선택</th>
                <th className="p-4 font-semibold">내용</th>
                <th className="p-4 font-semibold w-24 text-center">공감 수</th>
                <th className="p-4 font-semibold w-32 text-center">상태</th>
                <th className="p-4 font-semibold w-40 text-center">작성일시</th>
              </tr>
            </thead>
            <tbody>
              {balloons.map(b => (
                <tr key={b.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(b.id)}
                      onChange={() => toggleSelect(b.id)}
                      className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                    />
                  </td>
                  <td className="p-4 text-slate-700">{b.text}</td>
                  <td className="p-4 text-center font-bold text-pink-500">{b.likes}</td>
                  <td className="p-4 text-center text-sm">
                    {b.isHidden ? (
                      <span className="text-red-500 bg-red-50 px-2 py-1 rounded-full">숨김/삭제</span>
                    ) : b.mergedIntoId ? (
                      <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-full">합쳐짐</span>
                    ) : (
                      <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">정상 표시</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-slate-400 text-sm">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {balloons.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
