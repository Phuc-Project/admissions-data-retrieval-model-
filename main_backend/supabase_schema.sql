-- ==============================================================================
-- CareerCompass-AI 2026: Comprehensive Supabase PostgreSQL Schema
-- User Data Management, Knowledge Graph (GraphRAG), RAG Corpus & Recommendations
-- Standardized according to Supabase PostgreSQL Best Practices (January 2026)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Try enabling pgvector if available in the Supabase environment
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension is not available or disabled; using standard vectors.';
END $$;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    school_name TEXT,
    grade INT DEFAULT 12,
    target_block TEXT DEFAULT 'A00',
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. ACADEMIC RECORDS (THPT 3-Year Transcripts & Exam Estimates)
CREATE TABLE IF NOT EXISTS public.academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    target_block TEXT NOT NULL DEFAULT 'A00',
    gpa_10 NUMERIC(3, 2),
    gpa_11 NUMERIC(3, 2),
    gpa_12 NUMERIC(3, 2),
    transcript_gpa_overall NUMERIC(3, 2),
    transcript_subject_scores JSONB DEFAULT '{}'::jsonb, -- {"Toán": 9.0, "Vật lý": 8.5, "Hóa học": 8.5}
    transcript_block_score NUMERIC(4, 2),
    academic_ranking TEXT DEFAULT 'Giỏi',
    conduct_ranking TEXT DEFAULT 'Tốt',
    estimated_exam_score NUMERIC(4, 2),
    favorite_subjects JSONB DEFAULT '[]'::jsonb,
    certificate_type TEXT, -- IELTS, VSTEP, SAT
    certificate_score NUMERIC(4, 2),
    awards TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academic_user_id ON public.academic_records(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_target_block ON public.academic_records(target_block);

-- 4. SURVEY SUBMISSIONS (Holland, SCCT, Gardner, DISC)
CREATE TABLE IF NOT EXISTS public.survey_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    school_name TEXT,
    holland_answers JSONB DEFAULT '{}'::jsonb, -- {"HL_R_1": 5, ...}
    scct_answers JSONB DEFAULT '{}'::jsonb,
    gardner_answers JSONB DEFAULT '{}'::jsonb,
    disc_answers JSONB DEFAULT '{}'::jsonb,
    qualitative_answers JSONB DEFAULT '{}'::jsonb,
    academic_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_user_id ON public.survey_submissions(user_id);

-- 5. STUDENT CAREER PROFILES (Career Passport)
CREATE TABLE IF NOT EXISTS public.student_career_profiles (
    id TEXT PRIMARY KEY, -- e.g. PRF_XXXXXX
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    school_name TEXT,
    holland_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    scct_result JSONB NOT NULL DEFAULT '[]'::jsonb,
    gardner_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    disc_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    academic_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended_majors JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_pedagogical_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.student_career_profiles(user_id);

-- 6. RECOMMENDATIONS HISTORY (3 Tiers: Dream, Target, Safety)
CREATE TABLE IF NOT EXISTS public.recommendations_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    profile_id TEXT REFERENCES public.student_career_profiles(id) ON DELETE SET NULL,
    target_block TEXT NOT NULL,
    estimated_score NUMERIC(4, 2),
    dream_tier JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_tier JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_tier JSONB NOT NULL DEFAULT '[]'::jsonb,
    decision_matrix JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations_history(user_id);

-- 7. USER WISHLISTS (Bookmarks for Universities & Majors)
CREATE TABLE IF NOT EXISTS public.user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    university_code TEXT NOT NULL,
    major_code TEXT NOT NULL,
    university_name TEXT,
    major_name TEXT,
    cutoff_score_2025 NUMERIC(4, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_wishlist UNIQUE (user_id, university_code, major_code)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.user_wishlists(user_id);

-- 8. CHAT CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Tư vấn Tuyển sinh & Hướng nghiệp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.chat_conversations(user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    graph_context JSONB DEFAULT '[]'::jsonb,
    rag_chunks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.chat_messages(conversation_id);

-- 9. KNOWLEDGE GRAPH NODES (GraphRAG: Holland, Majors, Universities, Careers, Blocks)
CREATE TABLE IF NOT EXISTS public.knowledge_graph_nodes (
    id TEXT PRIMARY KEY, -- e.g. 'MAJOR_748', 'UNI_BKA', 'HOLLAND_R', 'BLOCK_A00'
    label TEXT NOT NULL, -- 'Major', 'University', 'HollandTrait', 'GardnerTrait', 'AcademicBlock', 'CareerPath'
    name TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_label ON public.knowledge_graph_nodes(label);

-- 10. KNOWLEDGE GRAPH EDGES (Relations: MATCHES, REQUIRES, OFFERED_BY, LEADS_TO)
CREATE TABLE IF NOT EXISTS public.knowledge_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id TEXT REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
    target_node_id TEXT REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL, -- 'MATCHES_HOLLAND', 'REQUIRES_BLOCK', 'OFFERED_BY', 'LEADS_TO', 'EMPHASIZES_INTELLIGENCE'
    weight NUMERIC(4, 2) DEFAULT 1.0,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON public.knowledge_graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON public.knowledge_graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relation ON public.knowledge_graph_edges(relation_type);

-- 11. RAG DOCUMENTS & CORPUS (Admissions Regulations, Schemes, Benchmarks, Song An Bank)
CREATE TABLE IF NOT EXISTS public.rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'circular_06_2026', 'university_scheme', 'major_profile', 'holland_assessment'
    source_url TEXT,
    chunk_content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_category ON public.rag_documents(category);

-- 12. ENABLE ROW LEVEL SECURITY (RLS) FOR DEFENSE IN DEPTH
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

-- 13. POLICIES: GRANT ACCESS TO PUBLIC / AUTHENTICATED CLIENTS
-- Public/Anon Read-Write Policies for client application & API server access
DO $$
BEGIN
    -- users policies
    DROP POLICY IF EXISTS "Public access for users" ON public.users;
    CREATE POLICY "Public access for users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);

    -- academic_records policies
    DROP POLICY IF EXISTS "Public access for academic_records" ON public.academic_records;
    CREATE POLICY "Public access for academic_records" ON public.academic_records FOR ALL TO public USING (true) WITH CHECK (true);

    -- survey_submissions policies
    DROP POLICY IF EXISTS "Public access for survey_submissions" ON public.survey_submissions;
    CREATE POLICY "Public access for survey_submissions" ON public.survey_submissions FOR ALL TO public USING (true) WITH CHECK (true);

    -- student_career_profiles policies
    DROP POLICY IF EXISTS "Public access for student_career_profiles" ON public.student_career_profiles;
    CREATE POLICY "Public access for student_career_profiles" ON public.student_career_profiles FOR ALL TO public USING (true) WITH CHECK (true);

    -- recommendations_history policies
    DROP POLICY IF EXISTS "Public access for recommendations_history" ON public.recommendations_history;
    CREATE POLICY "Public access for recommendations_history" ON public.recommendations_history FOR ALL TO public USING (true) WITH CHECK (true);

    -- user_wishlists policies
    DROP POLICY IF EXISTS "Public access for user_wishlists" ON public.user_wishlists;
    CREATE POLICY "Public access for user_wishlists" ON public.user_wishlists FOR ALL TO public USING (true) WITH CHECK (true);

    -- chat_conversations policies
    DROP POLICY IF EXISTS "Public access for chat_conversations" ON public.chat_conversations;
    CREATE POLICY "Public access for chat_conversations" ON public.chat_conversations FOR ALL TO public USING (true) WITH CHECK (true);

    -- chat_messages policies
    DROP POLICY IF EXISTS "Public access for chat_messages" ON public.chat_messages;
    CREATE POLICY "Public access for chat_messages" ON public.chat_messages FOR ALL TO public USING (true) WITH CHECK (true);

    -- knowledge_graph_nodes policies (Read for all, Write for API)
    DROP POLICY IF EXISTS "Public read for graph_nodes" ON public.knowledge_graph_nodes;
    CREATE POLICY "Public read for graph_nodes" ON public.knowledge_graph_nodes FOR ALL TO public USING (true) WITH CHECK (true);

    -- knowledge_graph_edges policies
    DROP POLICY IF EXISTS "Public read for graph_edges" ON public.knowledge_graph_edges;
    CREATE POLICY "Public read for graph_edges" ON public.knowledge_graph_edges FOR ALL TO public USING (true) WITH CHECK (true);

    -- rag_documents policies
    DROP POLICY IF EXISTS "Public read for rag_documents" ON public.rag_documents;
    CREATE POLICY "Public read for rag_documents" ON public.rag_documents FOR ALL TO public USING (true) WITH CHECK (true);
END $$;

-- 14. EXPLICIT GRANTS TO ANON & AUTHENTICATED ROLES (DATA API ACCESS)
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.academic_records TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.survey_submissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.student_career_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.recommendations_history TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_wishlists TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_conversations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.knowledge_graph_nodes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.knowledge_graph_edges TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rag_documents TO anon, authenticated, service_role;

-- Done
