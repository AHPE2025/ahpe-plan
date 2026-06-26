-- Supabase テーブル定義（SQL Editor で実行）
-- ※ service_role key は使用しません。アプリは anon public key + ユーザ JWT のみ使用します。

-- 年度計画データ（1年目: year1 / 2年目: year2）
CREATE TABLE IF NOT EXISTS ahpe_plan_data (
  year_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ahpe_plan_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ahpe_plan_data"
  ON ahpe_plan_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ahpe_plan_data"
  ON ahpe_plan_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ahpe_plan_data"
  ON ahpe_plan_data
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ahpe_plan_data"
  ON ahpe_plan_data
  FOR DELETE
  TO authenticated
  USING (true);

-- 共通設定（cost_item_templates / cost_categories / cost_item_names など）
CREATE TABLE IF NOT EXISTS ahpe_plan_settings (
  setting_key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ahpe_plan_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ahpe_plan_settings"
  ON ahpe_plan_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ahpe_plan_settings"
  ON ahpe_plan_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ahpe_plan_settings"
  ON ahpe_plan_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ahpe_plan_settings"
  ON ahpe_plan_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- Auth ユーザーは Supabase Dashboard > Authentication > Users から作成してください。
