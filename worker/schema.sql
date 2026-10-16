-- itsa10but edge database. Counts only: no résumé text, role text, keys or IP addresses are stored.
-- limits.id is "bucket|SGT day" for daily caps, or "bucket|SGT hour|hash of visitor" for hourly ones (the address itself is never written).
CREATE TABLE IF NOT EXISTS limits (
  id    TEXT PRIMARY KEY,
  span  TEXT NOT NULL,
  count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS limits_span ON limits (span);

CREATE TABLE IF NOT EXISTS usage (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  day        TEXT NOT NULL,
  run_id     TEXT NOT NULL,
  agent      TEXT NOT NULL,
  model      TEXT NOT NULL,
  provider   TEXT NOT NULL,
  in_tokens  INTEGER NOT NULL,
  out_tokens INTEGER NOT NULL,
  ms         INTEGER NOT NULL,
  fallback   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS usage_day ON usage (day);
