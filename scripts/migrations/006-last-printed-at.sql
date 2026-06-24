-- Migration: track when an order's documents (job order / invoice) were last
-- printed or saved to PDF. Stamped on `beforeprint` from the doc pages.
-- Run once in the SQL Editor.

alter table orders add column if not exists last_printed_at timestamptz;
