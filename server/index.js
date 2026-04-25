import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { supabase } from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// 1. 모든 풍선 가져오기 (메인 화면용 - 숨김 처리되거나 병합된 것은 제외)
app.get('/api/balloons', async (req, res) => {
  const { data, error } = await supabase
    .from('balloons')
    .select('*')
    .eq('isHidden', false)
    .is('mergedIntoId', null);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// 1-1. 관리자용 모든 풍선 가져오기
app.get('/api/admin/balloons', async (req, res) => {
  const { data, error } = await supabase
    .from('balloons')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// 2. 새 풍선 추가
app.post('/api/balloons', async (req, res) => {
  const { id, author, text, likes, colorClass } = req.body;
  
  const { error } = await supabase
    .from('balloons')
    .insert([{ id, author: author || '익명', text, likes: likes || 0, colorClass }]);
    
  if (error) return res.status(500).json({ error: error.message });
  
  if (author) {
    await supabase.rpc('increment_user_score', { user_nickname: author, amount: 10 });
  }
  
  res.json({ success: true, id });
});

// 3. 좋아요 증감
app.post('/api/balloons/:id/like', async (req, res) => {
  const { id } = req.params;
  const { increment, liker } = req.body; // 1 or -1, liker nickname
  
  const { error } = await supabase.rpc('increment_balloon_likes', { balloon_id: id, amount: increment });
  if (error) return res.status(500).json({ error: error.message });
  
  if (increment > 0 && liker) {
    await supabase.rpc('increment_user_score', { user_nickname: liker, amount: 2 });
  } else if (increment < 0 && liker) {
    await supabase.rpc('increment_user_score', { user_nickname: liker, amount: -2 });
  }

  res.json({ success: true });
});

// 4. 관리자 삭제 (블라인드 처리)
app.delete('/api/balloons/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('balloons')
    .update({ isHidden: true })
    .eq('id', id);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// 5. 관리자 병합 (Merge)
app.post('/api/balloons/merge', async (req, res) => {
  const { mainId, mergeIds } = req.body;
  if (!mainId || !mergeIds || mergeIds.length === 0) {
    return res.status(400).json({ error: "Invalid merge data" });
  }

  const { data: sumData, error: sumError } = await supabase
    .from('balloons')
    .select('likes')
    .in('id', mergeIds);
    
  if (sumError) return res.status(500).json({ error: sumError.message });
  
  const extraLikes = sumData ? sumData.reduce((acc, curr) => acc + curr.likes, 0) : 0;
  
  const { error: mergeError } = await supabase.rpc('merge_balloons', {
    main_id: mainId,
    merge_ids: mergeIds,
    extra_likes: extraLikes
  });
  
  if (mergeError) return res.status(500).json({ error: mergeError.message });
  res.json({ success: true });
});

// 6. 유저 닉네임 등록 (중복 검사 및 토큰 발급)
app.post('/api/users/register', async (req, res) => {
  const { nickname, deviceToken } = req.body;
  if (!nickname || !deviceToken) {
    return res.status(400).json({ error: "Nickname and deviceToken required" });
  }

  // 중복 검사
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('nickname')
    .eq('nickname', nickname)
    .single();

  // existingUser가 있으면 중복
  if (existingUser) {
    return res.status(409).json({ error: "이미 사용 중인 닉네임입니다." });
  }

  const { error: insertError } = await supabase
    .from('users')
    .insert([{ nickname, deviceToken, score: 0 }]);
    
  if (insertError) return res.status(500).json({ error: insertError.message });
  res.json({ success: true, nickname });
});

// 7. 유저 출석체크 (+1점)
app.post('/api/users/attendance', async (req, res) => {
  const { nickname } = req.body;
  if (!nickname) return res.status(400).json({ error: "Nickname required" });

  const { error } = await supabase.rpc('increment_user_score', { user_nickname: nickname, amount: 1 });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// 8. 랭킹 조회
app.get('/api/rankings', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('nickname, score')
    .order('score', { ascending: false })
    .limit(100);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
