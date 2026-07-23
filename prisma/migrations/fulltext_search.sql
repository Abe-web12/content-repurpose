-- Run this migration after prisma db push to enable fast full-text search
-- Requires pg_trgm extension (enabled via Prisma schema)

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Generation search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generations_content_trgm ON generations USING GIN (content gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generations_output_content_trgm ON generations USING GIN (output_content gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generations_title_trgm ON generations USING GIN (title gin_trgm_ops);

-- Template search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_templates_name_trgm ON content_templates USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_templates_description_trgm ON content_templates USING GIN (description gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_templates_content_trgm ON content_templates USING GIN (content gin_trgm_ops);

-- Voice profile search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_profiles_name_trgm ON voice_profiles USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voice_profiles_description_trgm ON voice_profiles USING GIN (description gin_trgm_ops);

-- Brand kit search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_kits_company_name_trgm ON brand_kits USING GIN (company_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_kits_company_description_trgm ON brand_kits USING GIN (company_description gin_trgm_ops);
