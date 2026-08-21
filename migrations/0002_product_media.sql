-- Cover art and preview audio, both served from piras-public. The full
-- file is never one of these — it lives in piras-private and is reachable
-- only through a download_grants row (see product_files / download_grants
-- in 0001_init.sql). Nullable: a product can exist before media is uploaded.

ALTER TABLE products ADD COLUMN cover_url TEXT;
ALTER TABLE products ADD COLUMN preview_url TEXT;
