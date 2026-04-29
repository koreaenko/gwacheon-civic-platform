import { createClient } from '@supabase/supabase-js';

// Vercel 환경에서는 process.env에 직접 주입됨. dotenv는 로컬 개발용.
try { const dotenv = await import('dotenv'); dotenv.config(); } catch {}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되지 않았습니다.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
