-- CareerCompass-AI 2026 - Supabase PostgreSQL Schema
-- Deep Research University Admissions & Exam Data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Bảng universities (Danh mục cơ sở đào tạo đại học)
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,          -- Mã trường (ví dụ: BKA, KHA)
    name TEXT NOT NULL,                 -- Tên trường đầy đủ
    short_name TEXT,                    -- Tên viết tắt
    region TEXT,                        -- Miền: Bắc / Trung / Nam
    website TEXT,                       -- Trang web chính thức
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng majors (Danh mục ngành đào tạo chuẩn)
CREATE TABLE IF NOT EXISTS majors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    major_code TEXT NOT NULL,           -- Mã ngành (ví dụ: 7480201)
    major_name TEXT NOT NULL,           -- Tên ngành
    group_name TEXT,                    -- Nhóm ngành (ví dụ: Máy tính & CNTT)
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(major_code, major_name)
);

-- 3. Bảng admission_scores (Điểm chuẩn đại học các năm - Bảng chính)
CREATE TABLE IF NOT EXISTS admission_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    major_id UUID REFERENCES majors(id) ON DELETE CASCADE,
    year INT NOT NULL,
    subject_groups TEXT[],              -- Mảng tổ hợp môn: ['A00','A01','D07']
    cutoff_score NUMERIC(5,2),          -- Điểm chuẩn
    note TEXT,                          -- Ghi chú (tiêu chí phụ, học phí, chương trình)
    source TEXT,                        -- Nguồn dữ liệu: 'tuyensinh247', 'school_website', 'moet'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(university_id, major_id, year)
);

-- Indexes cho truy vấn nhanh (< 50ms)
CREATE INDEX IF NOT EXISTS idx_scores_year ON admission_scores(year);
CREATE INDEX IF NOT EXISTS idx_scores_cutoff ON admission_scores(cutoff_score);
CREATE INDEX IF NOT EXISTS idx_scores_subject_groups ON admission_scores USING GIN(subject_groups);

-- 4. Bảng exam_scores (Điểm thi THPT quốc gia - Ẩn danh theo Nghị định 13/2023)
CREATE TABLE IF NOT EXISTS exam_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_number TEXT NOT NULL,          -- Số báo danh (ẩn danh hóa)
    year INT NOT NULL,
    province_code TEXT,
    math NUMERIC(4,2),
    literature NUMERIC(4,2),
    physics NUMERIC(4,2),
    chemistry NUMERIC(4,2),
    biology NUMERIC(4,2),
    history NUMERIC(4,2),
    geography NUMERIC(4,2),
    foreign_language NUMERIC(4,2),
    civic_education NUMERIC(4,2),
    total_score NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_year_province ON exam_scores(year, province_code);
CREATE INDEX IF NOT EXISTS idx_exam_number ON exam_scores(exam_number);

-- 5. Bảng crawl_logs (Nhật ký theo dõi tiến trình crawler định kỳ)
CREATE TABLE IF NOT EXISTS crawl_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT,
    source_name TEXT,
    status TEXT,                        -- 'success', 'failed', 'partial', 'running'
    records_count INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_started ON crawl_logs(started_at DESC);

-- 6. Row Level Security (RLS) Policies
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for admission search
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public read universities'
    ) THEN
        CREATE POLICY "Public read universities" ON universities FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public read majors'
    ) THEN
        CREATE POLICY "Public read majors" ON majors FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public read admission_scores'
    ) THEN
        CREATE POLICY "Public read admission_scores" ON admission_scores FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public read exam_scores'
    ) THEN
        CREATE POLICY "Public read exam_scores" ON exam_scores FOR SELECT USING (true);
    END IF;
END
$$;
