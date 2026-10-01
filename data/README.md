# Ngân hàng Dữ liệu Trắc nghiệm Hướng nghiệp Sông An (Huong Nghiep Song An Assessment Bank)

Thư mục này chứa toàn bộ dữ liệu ngân hàng câu hỏi khảo sát hướng nghiệp đa chiều được cào và chuẩn hóa trực tiếp từ nền tảng **Hướng nghiệp Sông An** (`https://tracnghiem.huongnghiepsongan.com`).

---

## 1. Bản quyền & Nguồn dữ liệu (Attribution)
- **Nguồn dữ liệu**: Doanh nghiệp Xã hội Hướng nghiệp Sông An (`https://huongnghiepsongan.com/`)
- **Giấy phép bản quyền**: Creative Commons Attribution-NoDerivatives 4.0 International (**CC BY-ND 4.0**)
- **Mục đích sử dụng**: Phục vụ cộng đồng, phi thương mại, chuẩn hóa công cụ khảo sát cho học sinh THPT và sinh viên Việt Nam.

---

## 2. Danh mục các bộ công cụ trong thư mục `data/`

| Tên file | Bộ công cụ | Tác giả / Nền tảng | Đối tượng | Số lượng câu | Thang đo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`holland_thpt_84q.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/holland_thpt_84q.json) | **Khám phá sở thích Holland (HLKPST1622)** | John Holland / Sông An | Học sinh Cấp 3 (THPT) & Sinh viên | **84 câu** (14 câu x 6 nhóm) | Likert 5 mức |
| [`holland_worker_84q.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/holland_worker_84q.json) | **Khám phá sở thích Holland (HLKPST23)** | John Holland / Sông An | Người đi làm | **84 câu** (14 câu x 6 nhóm) | Likert 5 mức |
| [`gardner_mipq_35q.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/gardner_mipq_35q.json) | **Trí thông minh đa diện (MIPQVI)** | Howard Gardner / Sông An | Học sinh THPT & Sinh viên | **35 câu** (9 nhóm thông minh) | Likert 5 mức |
| [`grit_scale_12q.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/grit_scale_12q.json) | **Thang đo Bền chí (Grit Scale)** | Angela Duckworth / Sông An | Mọi đối tượng | **12 câu** | Likert 5 mức |
| [`ced_thpt_28q.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/ced_thpt_28q.json) | **Phát triển & GD Hướng nghiệp (CED-THPT)** | Col McCowan / Sông An | Học sinh THPT | **27 câu** (3 phần: Hiểu biết, Hành động, Thái độ) | Likert 5 mức |
| [`ced_dhcd_28q.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/ced_dhcd_28q.json) | **Phát triển & GD Hướng nghiệp (CED-DHCD)** | Col McCowan / Sông An | Sinh viên ĐH-CĐ | **27 câu** (3 phần: Hiểu biết, Hành động, Thái độ) | Likert 5 mức |
| [`career_difficulties_cdi_64q.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/career_difficulties_cdi_64q.json) | **Đánh giá Khó khăn nghề nghiệp (CDI)** | Shékina Rochat / Sông An | Người đi làm & Sinh viên | **64 câu** (9 phần chuyên sâu) | Likert 3 mức |
| [`songan_full_assessment_bank.json`](file:///d:/chatbot%20ai%20h%C6%B0%C6%A1%CC%81ng%20nghi%C3%AA%CC%A3p/data/songan_full_assessment_bank.json) | **Master Assessment Bank** | Toàn bộ 7 công cụ Sông An | Đa đối tượng | **333 câu** | Đầy đủ metadata |

---

## 3. Tích hợp vào Model & API
- Bộ câu hỏi `holland_thpt_84q.json` đã được nạp trực tiếp vào Model Backend `main_backend/app/data/holland_questions.json`.
- API endpoint `https://careercompass-ai-api.vercel.app/api/v1/surveys/questions` cung cấp trực tiếp ngân hàng câu hỏi chuẩn cho toàn bộ hệ thống client.
