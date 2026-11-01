-- Run this migration exactly once on the existing STUDIA D1 database.
ALTER TABLE materials ADD COLUMN category TEXT NOT NULL DEFAULT 'სხვა';
ALTER TABLE study_files ADD COLUMN category TEXT NOT NULL DEFAULT 'სხვა';
