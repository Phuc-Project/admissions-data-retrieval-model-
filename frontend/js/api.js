/**
 * CareerCompass-AI 2026 - API Client
 * Kết nối API Tổng (CareerCompass-AI Vercel) & API Cào Data (Admissions Vercel)
 */
import { CONFIG } from './config.js';

class ApiClient {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.retrievalUrl = CONFIG.RETRIEVAL_API_URL;
    }

    async _request(url, options = {}) {
        const defaultHeaders = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Lỗi máy chủ (${response.status})`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Request Error [${url}]:`, error);
            throw error;
        }
    }

    /**
     * 1. Lấy toàn bộ 89 câu hỏi khảo sát đa chiều (Holland, SCCT, Gardner, DISC)
     */
    async getSurveyQuestions() {
        return await this._request(`${this.baseUrl}/surveys/questions`);
    }

    /**
     * 2. Nộp kết quả khảo sát & tính toán hồ sơ Career Passport
     */
    async submitSurvey(submissionData) {
        return await this._request(`${this.baseUrl}/surveys/submit`, {
            method: "POST",
            body: JSON.stringify(submissionData)
        });
    }

    /**
     * 3. Lấy hồ sơ Career Passport theo ID
     */
    async getProfile(profileId) {
        return await this._request(`${this.baseUrl}/profiles/${profileId}`);
    }

    /**
     * 4. Lấy danh sách gợi ý phân tầng nguyện vọng (Mơ ước / Vừa sức / An toàn)
     */
    async getRecommendations(profileId, params = {}) {
        const queryParams = new URLSearchParams({ profile_id: profileId });
        if (params.target_block) queryParams.append("target_block", params.target_block);
        if (params.min_score) queryParams.append("min_score", params.min_score);
        if (params.max_score) queryParams.append("max_score", params.max_score);
        if (params.admission_method) queryParams.append("admission_method", params.admission_method);

        return await this._request(`${this.baseUrl}/recommendations?${queryParams.toString()}`);
    }

    /**
     * 5. Lấy quy chế tuyển sinh 2026 (Thông tư 06/2026/TT-BGDĐT)
     */
    async getRegulations2026() {
        return await this._request(`${this.baseUrl}/regulations/2026`);
    }

    /**
     * 6. Lấy 6 giai đoạn lộ trình tuyển sinh lớp 12
     */
    async getRoadmap() {
        return await this._request(`${this.baseUrl}/roadmap/milestones`);
    }

    /**
     * 7. Gửi câu hỏi đến Cố vấn AI DeepSeek Reasoner
     */
    async sendChatMessage(message, studentProfile = null, chatHistory = []) {
        return await this._request(`${this.baseUrl}/chat/message`, {
            method: "POST",
            body: JSON.stringify({
                message: message,
                student_profile: studentProfile,
                history: chatHistory
            })
        });
    }

    /**
     * 8. Tra cứu dữ liệu điểm chuẩn từ API Cào Data thời gian thực
     */
    async searchAdmissions(query) {
        try {
            return await this._request(`${this.retrievalUrl}/admissions/search?q=${encodeURIComponent(query)}`);
        } catch (err) {
            console.warn("Direct retrieval search failed, falling back to empty:", err);
            return { success: false, data: [] };
        }
    }
}

export const api = new ApiClient();
