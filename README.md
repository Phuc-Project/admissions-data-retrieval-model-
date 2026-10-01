# admissions-data-retrieval-model-

# EDUPATH 2026 - BACKEND AI CAREER, DATA RETRIEVAL & ADMISSIONS PIPELINE

Hệ thống Backend API Hướng nghiệp & Data Retrieval Pipeline Tuyển sinh Đại học Việt Nam, tuân thủ chặt chẽ **Thông tư 06/2026/TT-BGDĐT** của Bộ Giáo dục và Đào tạo và **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân.

Kiến trúc cốt lõi:
- **FastAPI** (Python 3.10+ async RESTful API, Uvicorn ASGI)
- **Data Retrieval & Crawler Pipeline**:
  - `TuyenSinh247Crawler`: Cào điểm chuẩn, mã ngành, tổ hợp môn, chỉ tiêu, ghi chú từ Tuyensinh247 (HTML parsed via BeautifulSoup CSS Selectors, không tốn API token).
  - `VietnamNetExamCrawler`: Cào điểm thi tốt nghiệp THPT theo số báo danh (SBD) từ VietnamNet, tuân thủ Nghị định 13/2023 (hoàn toàn ẩn danh, không lưu PII như SĐT, CCCD, Email).
  - `GeminiUnstructuredExtractor`: Trích xuất điểm chuẩn từ website các trường ĐH có cấu trúc HTML tự do. Tối ưu token thông qua bộ tiền xử lý Markdownify (giảm ~45-80% token) + Schema JSON OpenAPI phẳng + Lưu bộ nhớ đệm SHA-256 (0 token khi gọi lại).
- **DeepSeek Reasoning Engine** (`DEEPSEEK_API_KEY`) phân tích logic tuyển sinh, xu hướng điểm chuẩn và chuỗi suy luận Chain-of-Thought.
- **Google Deep Research & Search Grounding** (`GOOGLE_API_KEY`) tra cứu văn bản quy chế và đề án tuyển sinh thời gian thực.
- **Supabase / PostgreSQL**: Bảng cơ sở dữ liệu quan hệ tối ưu hóa với GIN index và Row-Level Security (RLS).

---

## 🏛️ CẤU TRÚC BACKEND

```
d:/chatbot ai hướng nghiệp/backend/
├── app/
│   ├── api/v1/endpoints/            # 8 Router Endpoints
│   │   ├── survey.py                # Khảo sát & Đánh giá tự động (Holland, SCCT, Gardner, DISC)
│   │   ├── profile.py               # Hồ sơ Career Passport & Demo sample
│   │   ├── recommendations.py       # Phân tầng Mơ ước / Vừa sức / An toàn
│   │   ├── universities.py          # Tra cứu 50+ trường ĐH 3 miền
│   │   ├── regulations.py           # Thông tư 06/2026/TT-BGDĐT & Bảng quy đổi
│   │   ├── roadmap.py               # 6 Giai đoạn lộ trình lớp 12
│   │   ├── chat.py                  # Cố vấn AI DeepSeek + Deep Research
│   │   └── retrieval.py             # Data Retrieval API & Crawler Trigger
│   ├── core/config.py               # Cấu hình Pydantic Settings & API Keys
│   ├── crawler/                     # Bộ Crawling Dữ liệu Tuyển sinh
│   │   ├── base.py                  # BaseCrawler (Retry, Rate-Limit, Checkpoint, Decree 13/2023)
│   │   ├── tuyensinh247.py          # Crawler điểm chuẩn Tuyensinh247
│   │   ├── vietnamnet.py            # Crawler điểm thi THPT VietnamNet
│   │   └── gemini_extractor.py      # Trích xuất HTML phi cấu trúc qua Gemini Flash + Cache
│   ├── db/                          # Supabase & PostgreSQL Client
│   │   └── supabase_client.py       # Client hỗ trợ supabase-py, asyncpg & fallback
│   ├── tasks/                       # Tác vụ định kỳ (APScheduler)
│   │   └── scheduler.py             # Lịch cào hàng tuần (Tuyensinh247) và hàng ngày (VietnamNet)
│   ├── schemas/                     # Pydantic V2 Models
│   ├── services/                    # Business Logic Services
│   │   ├── scoring_engine.py        # Động cơ chấm điểm đa chiều
│   │   ├── recommendation_engine.py # Thuật toán phân bổ nguyện vọng
│   │   ├── deepseek_service.py      # Tích hợp DeepSeek R1/V3 + CoT
│   │   └── deep_research_service.py # Google Deep Research tra cứu văn bản
│   └── main.py                      # FastAPI Application Entrypoint
├── scripts/
│   └── test_live_crawlers.py        # Kịch bản kiểm thử cào dữ liệu thực tế
├── tests/
│   └── test_parsers.py              # Unit tests cho các bộ parser
├── schema.sql                       # DDL PostgreSQL/Supabase (Universities, Scores, Logs...)
├── requirements.txt
└── .env
```

---

## 🗄️ CẤU TRÚC DATABASE (SUPABASE / POSTGRESQL)

File `backend/schema.sql` khởi tạo các bảng sau:
1. `universities`: Mã trường (`BKA`, `KHA`), tên trường, website, khu vực.
2. `majors`: Mã ngành (`7480201`), tên ngành, nhóm ngành.
3. `admission_scores`: Điểm chuẩn trúng tuyển theo năm, mảng tổ hợp môn `subject_groups TEXT[]`, GIN Index.
4. `exam_scores`: Điểm thi THPT theo môn, số báo danh ẩn danh, mã tỉnh, không lưu PII.
5. `crawl_logs`: Nhật ký theo dõi tác vụ crawler (trạng thái, số bản ghi, lỗi nếu có).

---

## 📡 DANH SÁCH ENDPOINTS DATA RETRIEVAL & API

Tất cả endpoints phục vụ tại tiền tố `/api/v1`:

### Data Retrieval & Crawler (`/api/v1/retrieval`)
- `GET /api/v1/retrieval/scores/search`: Tra cứu điểm chuẩn theo mã trường, mã ngành, khối xét tuyển, năm, khoảng điểm (tốc độ < 50ms).
- `GET /api/v1/retrieval/universities`: Danh sách trường đại học phân chia theo vùng miền.
- `GET /api/v1/retrieval/majors`: Danh mục các nhóm ngành đào tạo đại học.
- `POST /api/v1/retrieval/scores/predict`: Dự đoán điểm chuẩn 2026 dựa trên chuỗi suy luận của DeepSeek AI kết hợp phổ điểm các năm trước.
- `POST /api/v1/retrieval/crawler/trigger`: Kích hoạt crawler thủ công qua API (`tuyensinh247` hoặc `vietnamnet`).
- `GET /api/v1/retrieval/crawler/logs`: Xem lịch sử và tiến độ của các tác vụ cào dữ liệu.

### Hướng nghiệp & AI Advisor
- `GET /api/v1/surveys/questions` & `POST /api/v1/surveys/submit`: Khảo sát Holland RIASEC, SCCT, Đa trí tuệ, DISC.
- `POST /api/v1/recommendations/generate`: Phân tầng 3 nhóm nguyện vọng (Mơ ước / Vừa sức / An toàn).
- `POST /api/v1/recommendations/compare`: So sánh ma trận 2-4 ngành/trường.
- `POST /api/v1/chat/message`: Chatbot AI cố vấn hướng nghiệp thời gian thực kết hợp DeepSeek và Google Deep Research.

---

## 🚀 HƯỚNG DẪN CHẠY VÀ KIỂM THỬ

### 1. Khởi chạy FastAPI Backend
```powershell
cd "d:\chatbot ai hướng nghiệp\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 2. Chạy Bộ Kiểm Thử Unit Test Parser
```powershell
python tests/test_parsers.py
```
*Kết quả: 100% Passed (Parser Tuyensinh247, VietnamNet 2-column & horizontal, Gemini HTML Cleaner).*

### 3. Chạy Kiểm Thử Cào Dữ Liệu Thực Tế (Live Scraping & Extraction)
```powershell
python scripts/test_live_crawlers.py
```
*Đã kiểm thử thực tế thành công:*
- **Tuyensinh247**: Cào và lưu thành công 728 bản ghi điểm chuẩn ĐH Kinh tế Quốc dân (`KHA`).
- **VietnamNet**: Cào thành công kết quả thi THPT các SBD `01000001`, `01000002`, `01000003` và lưu trữ an toàn.
- **Gemini Flash Extractor**: Rút gọn 45.1% token qua Markdownify, trích xuất cấu trúc chuẩn OpenAPI và kích hoạt cache SHA256 (0 token ở lần gọi thứ 2).
