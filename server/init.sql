-- Supabase SQL Editor에 복사하여 실행하세요.
-- ⚠️ 기존 테이블이 있으면 먼저 삭제 후 실행:
-- DROP TABLE IF EXISTS balloons; DROP TABLE IF EXISTS users;
-- DROP FUNCTION IF EXISTS increment_user_score; DROP FUNCTION IF EXISTS increment_balloon_likes; DROP FUNCTION IF EXISTS merge_balloons;

-- 기존 users 테이블을 유지하는 경우 아래 ALTER도 함께 실행하세요.
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastAttendanceAt" TIMESTAMP WITH TIME ZONE;

-- 1. balloons 테이블 생성 (camelCase 컬럼은 반드시 큰따옴표 필요)
CREATE TABLE IF NOT EXISTS balloons (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL DEFAULT '익명',
    text TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    "colorClass" TEXT,
    "isHidden" BOOLEAN DEFAULT false,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    nickname TEXT PRIMARY KEY,
    "deviceToken" TEXT UNIQUE NOT NULL,
    score INTEGER DEFAULT 0,
    "lastAttendanceAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 점수 증가용 함수
CREATE OR REPLACE FUNCTION increment_user_score(user_nickname TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET score = GREATEST(0, score + amount)
  WHERE nickname = user_nickname;
END;
$$ LANGUAGE plpgsql;

-- 4. 풍선 좋아요 증가용 함수
CREATE OR REPLACE FUNCTION increment_balloon_likes(balloon_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE balloons
  SET likes = GREATEST(0, likes + amount)
  WHERE id = balloon_id;
END;
$$ LANGUAGE plpgsql;

-- 5. 병합(Merge) 로직용 함수
CREATE OR REPLACE FUNCTION merge_balloons(main_id TEXT, merge_ids TEXT[], extra_likes INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE balloons
  SET "isHidden" = true, "mergedIntoId" = main_id
  WHERE id = ANY(merge_ids);
  
  UPDATE balloons
  SET likes = likes + extra_likes
  WHERE id = main_id;
END;
$$ LANGUAGE plpgsql;
