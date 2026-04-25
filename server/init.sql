-- Supabase SQL Editor에 복사하여 실행하세요.

-- 1. balloons 테이블 생성
CREATE TABLE IF NOT EXISTS balloons (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL DEFAULT '익명',
    text TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    colorClass TEXT,
    isHidden BOOLEAN DEFAULT false,
    mergedIntoId TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    nickname TEXT PRIMARY KEY,
    deviceToken TEXT UNIQUE NOT NULL,
    score INTEGER DEFAULT 0,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 점수 증가용 함수 생성 (동시성 문제를 해결하기 위함)
CREATE OR REPLACE FUNCTION increment_user_score(user_nickname TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET score = GREATEST(0, score + amount)
  WHERE nickname = user_nickname;
END;
$$ LANGUAGE plpgsql;

-- 4. 풍선 좋아요 증가용 함수 생성
CREATE OR REPLACE FUNCTION increment_balloon_likes(balloon_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE balloons
  SET likes = GREATEST(0, likes + amount)
  WHERE id = balloon_id;
END;
$$ LANGUAGE plpgsql;

-- 5. 병합(Merge) 로직용 함수 생성
CREATE OR REPLACE FUNCTION merge_balloons(main_id TEXT, merge_ids TEXT[], extra_likes INTEGER)
RETURNS void AS $$
BEGIN
  -- 선택된 풍선들을 숨김 처리
  UPDATE balloons
  SET isHidden = true, mergedIntoId = main_id
  WHERE id = ANY(merge_ids);
  
  -- 메인 풍선에 좋아요 수 합산
  UPDATE balloons
  SET likes = likes + extra_likes
  WHERE id = main_id;
END;
$$ LANGUAGE plpgsql;
