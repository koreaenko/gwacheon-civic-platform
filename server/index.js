import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './db.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// 1. 모든 풍선 가져오기 (메인 화면용 - 숨김 처리되거나 병합된 것은 제외)
app.get('/api/balloons', (req, res) => {
  db.all(`SELECT * FROM balloons WHERE isHidden = 0 AND mergedIntoId IS NULL`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // SQLite boolean(0/1) 변환
    const balloons = rows.map(r => ({
      ...r,
      isHidden: r.isHidden === 1
    }));
    res.json(balloons);
  });
});

// 1-1. 관리자용 모든 풍선 가져오기
app.get('/api/admin/balloons', (req, res) => {
  db.all(`SELECT * FROM balloons ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      ...r,
      isHidden: r.isHidden === 1
    })));
  });
});

// 2. 새 풍선 추가
app.post('/api/balloons', (req, res) => {
  const { id, author, text, likes, colorClass } = req.body;
  db.run(
    `INSERT INTO balloons (id, author, text, likes, colorClass) VALUES (?, ?, ?, ?, ?)`,
    [id, author || '익명', text, likes || 0, colorClass],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

// 3. 좋아요 증감
app.post('/api/balloons/:id/like', (req, res) => {
  const { id } = req.params;
  const { increment } = req.body; // 1 or -1
  
  db.run(
    `UPDATE balloons SET likes = MAX(0, likes + ?) WHERE id = ?`,
    [increment, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// 4. 관리자 삭제 (블라인드 처리)
app.delete('/api/balloons/:id', (req, res) => {
  const { id } = req.params;
  db.run(`UPDATE balloons SET isHidden = 1 WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 5. 관리자 병합 (Merge)
app.post('/api/balloons/merge', (req, res) => {
  const { mainId, mergeIds } = req.body;
  if (!mainId || !mergeIds || mergeIds.length === 0) {
    return res.status(400).json({ error: "Invalid merge data" });
  }

  const placeholders = mergeIds.map(() => '?').join(',');
  db.get(`SELECT SUM(likes) as totalLikes FROM balloons WHERE id IN (${placeholders})`, mergeIds, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const extraLikes = row.totalLikes || 0;
    
    // 선택된 녀석들을 메인 밑으로 숨김 처리
    db.run(`UPDATE balloons SET isHidden = 1, mergedIntoId = ? WHERE id IN (${placeholders})`, [mainId, ...mergeIds], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      // 메인 글에 좋아요 수 합산
      db.run(`UPDATE balloons SET likes = likes + ? WHERE id = ?`, [extraLikes, mainId], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ success: true });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
