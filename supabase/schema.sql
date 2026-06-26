-- Supabase テーブル定義（SQL Editor で実行）
CREATE TABLE IF NOT EXISTS year_data (
  year_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE year_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read write on year_data"
  ON year_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
