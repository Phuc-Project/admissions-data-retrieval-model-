/**
 * CareerCompass-AI 2026 - Frontend Configuration
 */
export const CONFIG = {
    // API Tổng: Cố vấn Hướng nghiệp, Chấm điểm khảo sát & DeepSeek Reasoner
    API_BASE_URL: "https://careercompass-ai-api.vercel.app/api/v1",

    // API Cào Data: Tra cứu điểm chuẩn & tuyển sinh thời gian thực
    RETRIEVAL_API_URL: "https://admissions-data-retrieval-api.vercel.app/api/v1",

    // Supabase Authentication & Database
    SUPABASE: {
        URL: "https://ijkilhwpwxdkoxhgnjut.supabase.co",
        KEY: "sb_publishable_vwDvpC0qBnb1Ui5l-u8A3A_dper7ezO"
    },

    // Local Storage Keys
    STORAGE_KEYS: {
        AUTH_USER: "careercompass_auth_user",
        PROFILE_DATA: "careercompass_student_profile",
        SURVEY_ANSWERS: "careercompass_survey_answers",
        CHAT_HISTORY: "careercompass_chat_history"
    }
};
