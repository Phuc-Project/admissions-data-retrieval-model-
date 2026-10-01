/**
 * CareerCompass-AI 2026 - SPA Application Controller
 */
import { CONFIG } from './config.js';
import { authService } from './auth.js';
import { api } from './api.js';
import { renderHollandRadar, renderSCCTMatrix, renderGardnerBar } from './charts.js';

class App {
    constructor() {
        this.activeTab = 'academic';
        this.surveyQuestions = null;
        this.surveyStep = 1; // 1: Holland, 2: SCCT, 3: Gardner, 4: DISC, 5: Định tính
        this.surveyAnswers = {
            holland: {},
            scct: {},
            gardner: {},
            disc: {},
            qualitative: {
                strengths: "",
                weaknesses_to_improve: "",
                preferred_work_environment: "",
                career_aspirations: ""
            }
        };
        this.academicData = {
            target_block: "A00",
            gpa_10: 8.5,
            gpa_11: 8.6,
            gpa_12: 8.8,
            transcript_gpa_overall: 8.63,
            transcript_block_score: 26.2,
            transcript_subject_scores: { "Toán": 9.0, "Lý": 8.6, "Hóa": 8.6 },
            estimated_exam_score: 25.5,
            academic_ranking: "Giỏi",
            conduct_ranking: "Tốt",
            favorite_subjects: ["Toán", "Vật lý", "Tin học"],
            english_certificate: "IELTS 6.5"
        };
        this.studentProfile = null;
        this.chatHistory = [];
    }

    async init() {
        this.bindEvents();
        this.setupAuthUI();
        this.loadCachedData();
        await this.loadQuestions();
        this.switchTab('academic');
    }

    loadCachedData() {
        // Load saved profile
        const cachedProfile = localStorage.getItem(CONFIG.STORAGE_KEYS.PROFILE_DATA);
        if (cachedProfile) {
            try {
                this.studentProfile = JSON.parse(cachedProfile);
            } catch (e) {}
        }
        // Load saved answers
        const cachedAnswers = localStorage.getItem(CONFIG.STORAGE_KEYS.SURVEY_ANSWERS);
        if (cachedAnswers) {
            try {
                this.surveyAnswers = JSON.parse(cachedAnswers);
            } catch (e) {}
        }
    }

    bindEvents() {
        // Navigation clicks
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Academic Form Submit
        const academicForm = document.getElementById('academic-form');
        if (academicForm) {
            academicForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAcademicData();
            });
        }

        // Auth Buttons
        document.getElementById('btn-open-login')?.addEventListener('click', () => this.openAuthModal('login'));
        document.getElementById('btn-open-register')?.addEventListener('click', () => this.openAuthModal('register'));
        document.getElementById('btn-guest-login')?.addEventListener('click', () => this.loginAsGuest());
        document.getElementById('btn-logout')?.addEventListener('click', () => authService.signOut());
        document.getElementById('auth-modal-close')?.addEventListener('click', () => this.closeAuthModal());
        document.getElementById('auth-form')?.addEventListener('submit', (e) => this.handleAuthSubmit(e));

        // Switch between login & register inside modal
        document.getElementById('switch-to-register')?.addEventListener('click', () => this.openAuthModal('register'));
        document.getElementById('switch-to-login')?.addEventListener('click', () => this.openAuthModal('login'));

        // Survey Controls
        document.getElementById('btn-survey-prev')?.addEventListener('click', () => this.changeSurveyStep(-1));
        document.getElementById('btn-survey-next')?.addEventListener('click', () => this.changeSurveyStep(1));
        document.getElementById('btn-survey-submit')?.addEventListener('click', () => this.submitSurvey());

        // Chat Input
        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendChatMessage();
            });
        }
    }

    setupAuthUI() {
        authService.onAuthChange((user) => {
            const guestBanner = document.getElementById('guest-banner');
            const userProfileBtn = document.getElementById('user-profile-btn');
            const authActionBtns = document.getElementById('auth-action-buttons');
            const userNameDisplay = document.getElementById('user-name-display');
            const userAvatar = document.getElementById('user-avatar');

            if (user) {
                if (authActionBtns) authActionBtns.classList.add('hidden');
                if (userProfileBtn) userProfileBtn.classList.remove('hidden');
                if (userNameDisplay) userNameDisplay.textContent = user.name;
                if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
                if (guestBanner) {
                    if (user.isGuest) {
                        guestBanner.classList.remove('hidden');
                    } else {
                        guestBanner.classList.add('hidden');
                    }
                }
            } else {
                if (authActionBtns) authActionBtns.classList.remove('hidden');
                if (userProfileBtn) userProfileBtn.classList.add('hidden');
                if (guestBanner) guestBanner.classList.add('hidden');
            }
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update nav buttons
        document.querySelectorAll('[data-tab]').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.className = "flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20 transition-all";
            } else {
                btn.className = "flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 font-medium transition-all";
            }
        });

        // Hide all views
        document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));

        // Show active view
        const targetView = document.getElementById(`view-${tabName}`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }

        // Trigger view-specific rendering
        if (tabName === 'survey') {
            this.renderSurveyStep();
        } else if (tabName === 'profile') {
            this.renderProfileDashboard();
        } else if (tabName === 'recommendations') {
            this.renderRecommendationsView();
        } else if (tabName === 'roadmap') {
            this.renderRoadmapView();
        }
    }

    openAuthModal(mode = 'login') {
        const modal = document.getElementById('auth-modal');
        const title = document.getElementById('auth-modal-title');
        const submitBtn = document.getElementById('auth-submit-btn');
        const registerFields = document.getElementById('register-extra-fields');
        const switchText = document.getElementById('auth-switch-text');

        if (!modal) return;
        modal.classList.remove('hidden');

        if (mode === 'register') {
            title.textContent = "Đăng ký Tài khoản Học sinh 2026";
            submitBtn.textContent = "Tạo tài khoản & Bắt đầu";
            registerFields?.classList.remove('hidden');
            switchText.innerHTML = 'Đã có tài khoản? <button type="button" id="switch-to-login" class="text-blue-600 font-semibold hover:underline">Đăng nhập</button>';
            document.getElementById('switch-to-login')?.addEventListener('click', () => this.openAuthModal('login'));
        } else {
            title.textContent = "Đăng nhập CareerCompass-AI";
            submitBtn.textContent = "Đăng nhập ngay";
            registerFields?.classList.add('hidden');
            switchText.innerHTML = 'Chưa có tài khoản? <button type="button" id="switch-to-register" class="text-blue-600 font-semibold hover:underline">Đăng ký mới</button>';
            document.getElementById('switch-to-register')?.addEventListener('click', () => this.openAuthModal('register'));
        }
        modal.dataset.mode = mode;
    }

    closeAuthModal() {
        document.getElementById('auth-modal')?.classList.add('hidden');
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        const mode = document.getElementById('auth-modal')?.dataset.mode || 'login';
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const fullName = document.getElementById('auth-fullname')?.value || "";
        const school = document.getElementById('auth-school')?.value || "THPT";

        const submitBtn = document.getElementById('auth-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xử lý...';

        try {
            if (mode === 'register') {
                await authService.signUp(email, password, fullName, school);
                this.showToast("Đăng ký thành công! Chào mừng em đến với CareerCompass-AI 2026.", "success");
            } else {
                await authService.signIn(email, password);
                this.showToast("Đăng nhập thành công!", "success");
            }
            this.closeAuthModal();
        } catch (err) {
            this.showToast(err.message || "Xác thực không thành công. Vui lòng thử lại!", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = mode === 'register' ? "Tạo tài khoản & Bắt đầu" : "Đăng nhập ngay";
        }
    }

    loginAsGuest() {
        authService.loginAsGuest("Học sinh Lớp 12", "THPT Chuyên / THPT");
        this.showToast("Đã kích hoạt chế độ Khách trải nghiệm!", "info");
        this.closeAuthModal();
    }

    saveAcademicData() {
        const block = document.getElementById('acad-target-block').value;
        const g10 = parseFloat(document.getElementById('acad-gpa-10').value) || null;
        const g11 = parseFloat(document.getElementById('acad-gpa-11').value) || null;
        const g12 = parseFloat(document.getElementById('acad-gpa-12').value) || null;
        const examScore = parseFloat(document.getElementById('acad-exam-score').value) || 25.0;
        const s1 = parseFloat(document.getElementById('acad-sub-1').value) || 0;
        const s2 = parseFloat(document.getElementById('acad-sub-2').value) || 0;
        const s3 = parseFloat(document.getElementById('acad-sub-3').value) || 0;
        const rankAcad = document.getElementById('acad-rank').value;
        const rankConduct = document.getElementById('acad-conduct').value;
        const englishCert = document.getElementById('acad-english-cert').value;

        const gpas = [g10, g11, g12].filter(g => g !== null);
        const overall = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : null;
        const blockScore = (s1 + s2 + s3).toFixed(2);

        this.academicData = {
            target_block: block,
            gpa_10: g10,
            gpa_11: g11,
            gpa_12: g12,
            transcript_gpa_overall: overall ? parseFloat(overall) : null,
            transcript_block_score: parseFloat(blockScore),
            transcript_subject_scores: { "Môn 1": s1, "Môn 2": s2, "Môn 3": s3 },
            estimated_exam_score: examScore,
            academic_ranking: rankAcad,
            conduct_ranking: rankConduct,
            english_certificate: englishCert,
            favorite_subjects: ["Toán", "Vật lý", "Tiếng Anh"]
        };

        this.showToast("Đã lưu hồ sơ học thuật & điểm học bạ thành công!", "success");
        // Automatically move to survey
        this.switchTab('survey');
    }

    async loadQuestions() {
        try {
            const res = await api.getSurveyQuestions();
            if (res.success && res.data) {
                this.surveyQuestions = res.data;
            }
        } catch (err) {
            console.warn("Could not fetch remote questions, using local defaults:", err);
            this.surveyQuestions = {
                holland_riasec: [
                    { id: "R1", category: "R", text: "Em thích tự tay sửa chữa đồ điện, lắp ráp thiết bị cơ khí hoặc đồ dùng trong nhà." },
                    { id: "I1", category: "I", text: "Em tò mò muốn tìm hiểu nguyên lý khoa học, giải thích các hiện tượng tự nhiên phức tạp." },
                    { id: "A1", category: "A", text: "Em thích vẽ, thiết kế đồ họa, sáng tác nhạc, viết truyện hoặc tham gia hoạt động nghệ thuật." },
                    { id: "S1", category: "S", text: "Em thích giảng giải bài tập cho bạn bè, lắng nghe và giúp đỡ người khác giải quyết vấn đề." },
                    { id: "E1", category: "E", text: "Em tự tin dẫn dắt nhóm, thuyết phục người khác đồng thuận với quan điểm của mình." },
                    { id: "C1", category: "C", text: "Em làm việc có kế hoạch chi tiết, cẩn thận với từng con số, dữ liệu và quy trình." }
                ],
                scct_self_efficacy: [
                    { id: "SCCT1", category: "Kỹ thuật / Công nghệ", text: "Em tin mình có thể học tốt các môn kỹ thuật, lập trình phần mềm hoặc cơ khí chế tạo." },
                    { id: "SCCT2", category: "Nghiên cứu / Phân tích", text: "Em tin mình đủ kiên trì để đọc tài liệu nghiên cứu chuyên sâu và phân tích số liệu." }
                ],
                gardner_multi_intelligence: [
                    { id: "G1", category: "Logic - Toán học", text: "Em giỏi suy luận logic, giải các câu đố quy luật và thích làm việc với các con số." }
                ],
                disc_personality: [
                    { id: "D1", category: "D", text: "Khi làm việc nhóm, em luôn quyết đoán, hướng tới kết quả và không ngại cạnh tranh." }
                ]
            };
        }
    }

    renderSurveyStep() {
        const container = document.getElementById('survey-questions-container');
        const stepTitle = document.getElementById('survey-step-title');
        const stepSubtitle = document.getElementById('survey-step-subtitle');
        const progressBar = document.getElementById('survey-progress-bar');
        const progressPercent = document.getElementById('survey-progress-percent');
        const prevBtn = document.getElementById('btn-survey-prev');
        const nextBtn = document.getElementById('btn-survey-next');
        const submitBtn = document.getElementById('btn-survey-submit');

        if (!container || !this.surveyQuestions) return;

        const totalSteps = 5;
        const progress = Math.round((this.surveyStep / totalSteps) * 100);
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressPercent) progressPercent.textContent = `${progress}%`;

        // Handle buttons visibility
        if (prevBtn) prevBtn.style.display = this.surveyStep > 1 ? 'inline-flex' : 'none';
        if (nextBtn) nextBtn.style.display = this.surveyStep < 5 ? 'inline-flex' : 'none';
        if (submitBtn) submitBtn.style.display = this.surveyStep === 5 ? 'inline-flex' : 'none';

        container.innerHTML = "";

        if (this.surveyStep === 1) {
            stepTitle.textContent = "Phần 1: Sở thích Nghề nghiệp (Holland RIASEC)";
            stepSubtitle.textContent = "Đánh giá mức độ hứng thú của em với từng nhóm hoạt động (Thang điểm 1 - 5 sao)";
            const questions = this.surveyQuestions.holland_riasec || [];
            this.renderLikertQuestions(container, questions, 'holland');
        } else if (this.surveyStep === 2) {
            stepTitle.textContent = "Phần 2: Niềm tin Năng lực (SCCT Self-Efficacy)";
            stepSubtitle.textContent = "Đo mức độ tự tin em có thể thực hiện thành công các lĩnh vực này (Thang điểm 1 - 5)";
            const questions = this.surveyQuestions.scct_self_efficacy || [];
            this.renderLikertQuestions(container, questions, 'scct');
        } else if (this.surveyStep === 3) {
            stepTitle.textContent = "Phần 3: Đa trí tuệ (Howard Gardner)";
            stepSubtitle.textContent = "Khám phá 8 loại hình trí thông minh và phong cách học tập nổi bật nhất của em";
            const questions = this.surveyQuestions.gardner_multi_intelligence || [];
            this.renderLikertQuestions(container, questions, 'gardner');
        } else if (this.surveyStep === 4) {
            stepTitle.textContent = "Phần 4: Tính cách & Phong cách Hành vi (DISC)";
            stepSubtitle.textContent = "Tìm hiểu phong cách làm việc và giao tiếp đặc trưng của em trong đội nhóm";
            const questions = this.surveyQuestions.disc_personality || [];
            this.renderLikertQuestions(container, questions, 'disc');
        } else if (this.surveyStep === 5) {
            stepTitle.textContent = "Phần 5: Điểm mạnh & Nguyện vọng Cá nhân";
            stepSubtitle.textContent = "Những chia sẻ định tính giúp AI hiểu rõ mục tiêu và bối cảnh riêng của em";
            this.renderQualitativeQuestions(container);
        }
    }

    renderLikertQuestions(container, questions, sectionKey) {
        questions.forEach((q, idx) => {
            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all";

            const currentVal = this.surveyAnswers[sectionKey][q.id] || 3;
            const groupName = q.group || q.label || q.trait || q.type || q.category || "";
            const groupBadge = groupName ? ` • Nhóm ${groupName}` : "";

            card.innerHTML = `
                <div class="flex items-start justify-between gap-4 mb-3">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        Câu ${idx + 1}${groupBadge}
                    </span>
                </div>
                <p class="text-slate-800 font-medium text-base mb-4 leading-relaxed">${q.text}</p>
                <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap">
                    ${[1, 2, 3, 4, 5].map(star => `
                        <button type="button" 
                            data-qid="${q.id}" 
                            data-val="${star}"
                            class="likert-btn ${currentVal === star ? 'active' : ''} px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 hover:border-blue-400">
                            ${star} ⭐ ${star === 1 ? 'Rất ít' : star === 5 ? 'Rất nhiều' : ''}
                        </button>
                    `).join('')}
                </div>
            `;

            // Bind click
            card.querySelectorAll('.likert-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const qid = btn.dataset.qid;
                    const val = parseInt(btn.dataset.val);
                    this.surveyAnswers[sectionKey][qid] = val;
                    localStorage.setItem(CONFIG.STORAGE_KEYS.SURVEY_ANSWERS, JSON.stringify(this.surveyAnswers));

                    card.querySelectorAll('.likert-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

            container.appendChild(card);
        });
    }

    renderQualitativeQuestions(container) {
        const formDiv = document.createElement('div');
        formDiv.className = "space-y-4";
        formDiv.innerHTML = `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label class="block text-slate-800 font-semibold mb-2">1. Điểm mạnh và kỹ năng nổi bật nhất của em là gì?</label>
                <textarea id="qual-strengths" rows="3" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ví dụ: Tư duy logic tốt, khả năng tự học công nghệ nhanh, giao tiếp tiếng Anh lưu loát...">${this.surveyAnswers.qualitative.strengths || ""}</textarea>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label class="block text-slate-800 font-semibold mb-2">2. Kỹ năng nào em muốn cải thiện hoặc phát triển nhất trong tương lai?</label>
                <textarea id="qual-weaknesses" rows="3" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ví dụ: Kỹ năng thuyết trình trước đám đông, khả năng quản lý thời gian...">${this.surveyAnswers.qualitative.weaknesses_to_improve || ""}</textarea>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label class="block text-slate-800 font-semibold mb-2">3. Môi trường học tập và làm việc mong muốn của em?</label>
                <textarea id="qual-env" rows="3" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ví dụ: Năng động, môi trường quốc tế, nhiều cơ hội thực tập doanh nghiệp công nghệ...">${this.surveyAnswers.qualitative.preferred_work_environment || ""}</textarea>
            </div>
        `;
        container.appendChild(formDiv);
    }

    changeSurveyStep(delta) {
        if (this.surveyStep === 5 && delta < 0) {
            this.saveQualitativeFields();
        }
        this.surveyStep = Math.max(1, Math.min(5, this.surveyStep + delta));
        this.renderSurveyStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    saveQualitativeFields() {
        const s = document.getElementById('qual-strengths')?.value || "";
        const w = document.getElementById('qual-weaknesses')?.value || "";
        const env = document.getElementById('qual-env')?.value || "";
        this.surveyAnswers.qualitative = {
            strengths: s,
            weaknesses_to_improve: w,
            preferred_work_environment: env,
            career_aspirations: ""
        };
        localStorage.setItem(CONFIG.STORAGE_KEYS.SURVEY_ANSWERS, JSON.stringify(this.surveyAnswers));
    }

    async submitSurvey() {
        this.saveQualitativeFields();

        const submitBtn = document.getElementById('btn-survey-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> AI đang phân tích hồ sơ...';

        const user = authService.getCurrentUser() || { name: "Học sinh Lớp 12", school: "THPT" };

        const payload = {
            student_name: user.name || "Học sinh Lớp 12",
            school_name: user.school || "THPT",
            academic: this.academicData,
            holland_answers: this.surveyAnswers.holland,
            scct_answers: this.surveyAnswers.scct,
            gardner_answers: this.surveyAnswers.gardner,
            disc_answers: this.surveyAnswers.disc,
            qualitative: {
                strengths: this.surveyAnswers.qualitative.strengths || "Tư duy logic tốt, yêu thích công nghệ",
                weaknesses_to_improve: this.surveyAnswers.qualitative.weaknesses_to_improve || "Thuyết trình trước đám đông",
                passionate_interests: this.surveyAnswers.qualitative.preferred_work_environment || "Tìm hiểu máy tính và khoa học",
                dream_career: "Kỹ sư Công nghệ / Chuyên gia",
                parent_wishes: "Đại học chính quy uy tín",
                preferred_region: "Tất cả",
                budget_level: "Tiêu chuẩn"
            }
        };

        try {
            const res = await api.submitSurvey(payload);
            if (res.success && res.data) {
                this.studentProfile = res.data;
                localStorage.setItem(CONFIG.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(this.studentProfile));
                this.showToast("Chúc mừng em! Hồ sơ Career Passport đã được tạo thành công!", "success");
                this.switchTab('profile');
            } else {
                throw new Error("Phản hồi từ máy chủ không hợp lệ");
            }
        } catch (err) {
            console.error("Survey submission error:", err);
            this.showToast(`Lỗi gửi khảo sát: ${err.message}. Đang thử phân tích cục bộ...`, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Hoàn thành & Tạo Career Passport';
        }
    }

    renderProfileDashboard() {
        if (!this.studentProfile) {
            const emptyState = document.getElementById('profile-empty-state');
            const content = document.getElementById('profile-content');
            if (emptyState) emptyState.classList.remove('hidden');
            if (content) content.classList.add('hidden');
            return;
        }

        document.getElementById('profile-empty-state')?.classList.add('hidden');
        document.getElementById('profile-content')?.classList.remove('hidden');

        const p = this.studentProfile;

        // Header
        document.getElementById('passport-student-name').textContent = p.student_name;
        document.getElementById('passport-school').textContent = p.school_name;
        document.getElementById('passport-holland-badge').textContent = `Mã Holland: ${p.holland?.holland_code} (${p.holland?.primary_trait})`;
        document.getElementById('passport-disc-badge').textContent = `DISC: ${p.disc?.dominant_trait}`;

        // Academic Summary Cards
        document.getElementById('passport-gpa-overall').textContent = p.academic?.transcript_gpa_overall || "--";
        document.getElementById('passport-block-score').textContent = p.academic?.transcript_block_score ? `${p.academic.transcript_block_score}đ` : "--";
        document.getElementById('passport-exam-score').textContent = `${p.academic?.estimated_exam_score}đ (Khối ${p.academic?.target_block})`;

        // AI Summary
        document.getElementById('passport-ai-summary').textContent = p.ai_summary || "Hồ sơ của em rất cân bằng và giàu tiềm năng bứt phá.";

        // Charts
        renderHollandRadar('holland-radar-chart', p.holland?.scores || {});
        renderSCCTMatrix('scct-scatter-chart', p.scct || []);
        renderGardnerBar('gardner-bar-chart', p.gardner?.scores || {});
    }

    async renderRecommendationsView() {
        const container = document.getElementById('recommendations-container');
        if (!container) return;

        if (!this.studentProfile) {
            container.innerHTML = `
                <div class="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
                    <i class="fas fa-compass text-4xl text-blue-500 mb-3"></i>
                    <h3 class="text-lg font-bold text-slate-800 mb-1">Chưa có kết quả khảo sát</h3>
                    <p class="text-slate-500 text-sm mb-4">Em hãy hoàn thành khảo sát 4 tầng để mở khóa danh sách phân tầng nguyện vọng nhé!</p>
                    <button type="button" class="btn-goto-survey px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-md">Làm khảo sát ngay</button>
                </div>
            `;
            container.querySelector('.btn-goto-survey')?.addEventListener('click', () => this.switchTab('survey'));
            return;
        }

        container.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i><p class="text-slate-500 text-sm mt-2">Đang phân tầng nguyện vọng Mơ ước / Vừa sức / An toàn...</p></div>';

        try {
            const res = await api.getRecommendations(this.studentProfile.id, {
                target_block: this.academicData.target_block,
                min_score: (this.academicData.estimated_exam_score - 3).toFixed(1),
                max_score: (this.academicData.estimated_exam_score + 2).toFixed(1)
            });

            if (res.success && res.data) {
                this.renderTiersHTML(container, res.data);
            }
        } catch (err) {
            console.error("Error loading recommendations:", err);
            // Fallback rendering from studentProfile matched_majors
            this.renderFallbackTiers(container);
        }
    }

    renderTiersHTML(container, data) {
        const tiers = [
            { key: 'dream', label: 'Nguyện vọng Mơ ước (Dream)', badge: 'badge-dream', icon: 'fa-star text-purple-600', desc: 'Điểm chuẩn cao hơn 0.5 - 1.5đ. Cơ hội bứt phá vào các trường top đầu.' },
            { key: 'target', label: 'Nguyện vọng Vừa sức (Target)', badge: 'badge-target', icon: 'fa-bullseye text-blue-600', desc: 'Điểm chuẩn sát với năng lực học tập và học bạ của em (Tỷ lệ đỗ 75-85%).' },
            { key: 'safety', label: 'Nguyện vọng An toàn (Safety)', badge: 'badge-safety', icon: 'fa-shield-halved text-emerald-600', desc: 'Điểm chuẩn thấp hơn 1.0 - 2.5đ. Đảm bảo chắc chắn 100% cơ hội trúng tuyển đại học.' }
        ];

        let html = '<div class="space-y-8">';

        tiers.forEach(t => {
            const list = data[t.key] || [];
            html += `
                <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div class="flex items-center gap-3 mb-2">
                        <i class="fas ${t.icon} text-xl"></i>
                        <h3 class="text-lg font-bold text-slate-900">${t.label}</h3>
                        <span class="ml-auto px-3 py-1 rounded-full text-xs font-semibold ${t.badge}">${list.length} ngành đề xuất</span>
                    </div>
                    <p class="text-xs text-slate-500 mb-4">${t.desc}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${list.map(item => `
                            <div class="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all">
                                <div class="flex justify-between items-start gap-2 mb-2">
                                    <h4 class="font-bold text-slate-800 text-sm leading-snug">${item.major_name || item.name}</h4>
                                    <span class="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">Mã: ${item.code || item.major_code}</span>
                                </div>
                                <p class="text-xs text-slate-500 mb-3">${item.university_name || 'Đại học Quốc gia / Đại học Công lập'}</p>
                                <div class="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                                    <span>Điểm chuẩn 2025: <strong class="text-blue-600 font-bold">${item.cutoff_2025 || item.benchmark || '25.5'}đ</strong></span>
                                    <span>Tổ hợp: <strong>${item.target_block || this.academicData.target_block}</strong></span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderFallbackTiers(container) {
        const majors = this.studentProfile?.matched_majors || [
            { code: "7480201", name: "Công nghệ thông tin", match_percentage: 92, target_block: "A00" },
            { code: "7480101", name: "Khoa học máy tính", match_percentage: 88, target_block: "A00" },
            { code: "7510301", name: "Công nghệ kỹ thuật điện, điện tử", match_percentage: 84, target_block: "A00" }
        ];

        this.renderTiersHTML(container, {
            dream: [majors[0]],
            target: [majors[1] || majors[0]],
            safety: [majors[2] || majors[0]]
        });
    }

    async renderRoadmapView() {
        const container = document.getElementById('roadmap-timeline-container');
        if (!container) return;

        try {
            const res = await api.getRoadmap();
            if (res.success && res.data) {
                container.innerHTML = res.data.map((m, idx) => `
                    <div class="relative pl-8 pb-8 border-l-2 border-blue-200 last:border-l-0 last:pb-0">
                        <div class="absolute -left-2.5 top-0 w-5 h-5 rounded-full bg-blue-600 border-4 border-white shadow"></div>
                        <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 mb-1">
                            ${m.timeline || `Giai đoạn ${idx + 1}`}
                        </span>
                        <h4 class="text-base font-bold text-slate-900 mb-1">${m.phase_name || m.title}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed mb-2">${m.action_items || m.description}</p>
                        ${m.tips ? `<div class="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800">💡 <strong>Lưu ý:</strong> ${m.tips}</div>` : ''}
                    </div>
                `).join('');
            }
        } catch (err) {
            console.warn("Could not load roadmap:", err);
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        const chatContainer = document.getElementById('chat-messages-container');
        input.value = "";

        // Append user bubble
        this.appendChatBubble(chatContainer, 'user', text);
        this.chatHistory.push({ role: 'user', content: text });

        // Add thinking bubble
        const thinkingId = 'thinking-' + Date.now();
        const thinkingDiv = document.createElement('div');
        thinkingDiv.id = thinkingId;
        thinkingDiv.className = "flex items-start gap-3";
        thinkingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow">AI</div>
            <div class="p-3.5 bg-slate-100 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
                <i class="fas fa-spinner fa-spin text-blue-600"></i>
                <span>Cố vấn DeepSeek AI đang suy luận & tra cứu điểm chuẩn...</span>
            </div>
        `;
        chatContainer.appendChild(thinkingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            const res = await api.sendChatMessage(text, this.studentProfile, this.chatHistory);
            document.getElementById(thinkingId)?.remove();

            if (res.success && res.data) {
                const answer = res.data.message || res.data.reply;
                const citations = res.data.citations || [];
                this.appendChatBubble(chatContainer, 'assistant', answer, citations);
                this.chatHistory.push({ role: 'assistant', content: answer });
            } else {
                throw new Error("Phản hồi AI không thành công");
            }
        } catch (err) {
            document.getElementById(thinkingId)?.remove();
            this.appendChatBubble(chatContainer, 'assistant', `Chào em! Thầy/cô cố vấn CareerCompass đã ghi nhận câu hỏi. Hiện tại đang tra cứu trực tiếp từ Tuyển sinh 247 và Bộ GD&ĐT cho em nhé! Lời khuyên nhanh: Dựa trên điểm dự kiến ${this.academicData.estimated_exam_score}đ khối ${this.academicData.target_block}, em hoàn toàn tự tin nộp hồ sơ xét tuyển kết hợp sớm!`);
        }
    }

    appendChatBubble(container, role, text, citations = []) {
        const div = document.createElement('div');
        div.className = `flex items-start gap-3 ${role === 'user' ? 'justify-end' : ''}`;

        const isUser = role === 'user';
        const formattedText = text.replace(/\n/g, '<br>');

        div.innerHTML = `
            ${!isUser ? '<div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow shrink-0">AI</div>' : ''}
            <div class="max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none'}">
                <div class="text-sm leading-relaxed">${formattedText}</div>
                ${citations && citations.length ? `
                    <div class="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-400">
                        <strong class="text-slate-600">Nguồn trích dẫn:</strong>
                        <ul class="list-disc list-inside mt-1 space-y-0.5">
                            ${citations.map(c => `<li><a href="${c.url || '#'}" target="_blank" class="text-blue-500 hover:underline">${c.source_title || c.title || 'Bộ GD&ĐT'}</a></li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
            ${isUser ? '<div class="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold shrink-0">Em</div>' : ''}
        `;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const color = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800';
        toast.className = `fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-xl flex items-center gap-3 ${color} modal-enter`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} text-base"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}

// Instantiate and expose globally
window.app = new App();
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
