-- Supabase テーブル定義（SQL Editor で実行）
-- ※ service_role key は使用しません。アプリは anon public key + ユーザ JWT のみ使用します。

CREATE TABLE IF NOT EXISTS year_data (
  year_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE year_data ENABLE ROW LEVEL SECURITY;

-- 開発用の全公開ポリシー（本番では削除して下記の認証済みポリシーに置き換えてください）
-- CREATE POLICY "Allow public read write on year_data"
--   ON year_data
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- 推奨: 認証済みユーザーのみ読み書き
DROP POLICY IF EXISTS "Allow public read write on year_data" ON year_data;
DROP POLICY IF EXISTS "Authenticated users can read year_data" ON year_data;
DROP POLICY IF EXISTS "Authenticated users can insert year_data" ON year_data;
DROP POLICY IF EXISTS "Authenticated users can update year_data" ON year_data;

CREATE POLICY "Authenticated users can read year_data"
  ON year_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert year_data"
  ON year_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update year_data"
  ON year_data
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Auth ユーザーは Supabase Dashboard > Authentication > Users から作成してください。
