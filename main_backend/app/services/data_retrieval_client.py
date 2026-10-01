import os
import re
import logging
from typing import Dict, Any, List, Optional, Tuple
import httpx
from app.core.config import settings
from app.schemas.chat import CitationItem

logger = logging.getLogger("services.data_retrieval_client")

# Mapping phổ biến giữa tên gọi / từ khóa người dùng với mã trường chuẩn
UNI_KEYWORD_MAP = {
    "bách khoa hà nội": "BKA",
    "bách khoa": "BKA",
    "hust": "BKA",
    "bka": "BKA",
    "kinh tế quốc dân": "KHA",
    "neu": "KHA",
    "kha": "KHA",
    "ngoại thương": "FTU",
    "ftu": "FTU",
    "công nghệ đhqg": "QHI",
    "uet": "QHI",
    "qhi": "QHI",
    "đại học công nghệ": "QHI",
    "kinh tế tphcm": "DHK",
    "kinh tế tp.hcm": "DHK",
    "ueh": "DHK",
    "dhk": "DHK",
    "thương mại": "TMA",
    "tmu": "TMA",
    "tma": "TMA",
    "học viện ngoại giao": "NTH",
    "ngoại giao": "NTH",
    "dav": "NTH",
    "giao thông vận tải": "GHA",
    "utc": "GHA",
    "gha": "GHA",
    "y hà nội": "YHN",
    "yhn": "YHN",
    "hmu": "YHN",
    "xây dựng": "XDA",
    "xda": "XDA",
    "nuce": "XDA",
    "huce": "XDA",
    "bách khoa tphcm": "BKH",
    "bách khoa tp.hcm": "BKH",
    "bkh": "BKH",
    "hcmut": "BKH",
    "khoa học tự nhiên": "KTS",
    "kts": "KTS",
    "hcmus": "KTS",
    "sư phạm hà nội": "SPH",
    "sư phạm": "SPH",
    "sph": "SPH",
    "hnue": "SPH",
    "công nghệ thông tin đhqg": "QST",
    "uit": "QST",
    "qst": "QST"
}

# Các từ khóa tổ hợp xét tuyển
BLOCKS = ["A00", "A01", "B00", "C00", "D01", "D07", "A02", "D08"]

class DataRetrievalClient:
    """
    HTTP Client kết nối từ MAIN_BACKEND (Server 1) sang DATA_RETRIEVAL_SERVICE (Server 2 trên Vercel).
    - Tự động phát hiện ý định hỏi về trường đại học, ngành, điểm chuẩn, dự báo 2026.
    - Truy xuất dữ liệu thời gian thực từ API: https://admissions-data-retrieval-api.vercel.app
    - Cung cấp context chính xác, tránh ảo giác (Anti-hallucination) cho DeepSeek Reasoner.
    """
    def __init__(self):
        self.base_url = settings.RETRIEVAL_SERVICE_URL.rstrip("/")
        self.timeout = 12.0

    def detect_university_intent(self, message: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Phân tích câu hỏi của user để phát hiện: (Mã trường, Tổ hợp môn, Từ khóa ngành)
        """
        msg_lower = message.lower()

        # 1. Phát hiện mã trường
        detected_uni: Optional[str] = None
        for kw, code in UNI_KEYWORD_MAP.items():
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, msg_lower):
                detected_uni = code
                break

        # 2. Phát hiện khối / tổ hợp
        detected_block: Optional[str] = None
        for b in BLOCKS:
            pattern = r'\b' + re.escape(b.lower()) + r'\b'
            if re.search(pattern, msg_lower) or f"khối {b.lower()}" in msg_lower or f"tổ hợp {b.lower()}" in msg_lower:
                detected_block = b
                break

        # 3. Phát hiện từ khóa ngành
        major_keywords = [
            "khoa học máy tính", "công nghệ thông tin", "kỹ thuật phần mềm",
            "kinh doanh quốc tế", "marketing", "tài chính ngân hàng", "quản trị kinh doanh",
            "trí tuệ nhân tạo", "vi mạch bán dẫn", "logistics", "y khoa", "dược học",
            "luật", "ngôn ngữ anh", "kinh tế quốc tế", "tự động hóa", "cơ điện tử"
        ]
        detected_keyword: Optional[str] = None
        for kw in major_keywords:
            if kw in msg_lower:
                detected_keyword = kw
                break

        return detected_uni, detected_block, detected_keyword

    async def get_university(self, code: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin chi tiết trường đại học từ Server 2."""
        url = f"{self.base_url}/api/v1/universities/{code.upper()}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    return r.json().get("data")
        except Exception as e:
            logger.warning(f"Không thể kết nối Data Retrieval Service tại {url}: {e}")
        return None

    async def search_scores(
        self,
        university_code: Optional[str] = None,
        keyword: Optional[str] = None,
        year: Optional[int] = None,
        subject_group: Optional[str] = None,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """Truy xuất điểm chuẩn từ Server 2."""
        url = f"{self.base_url}/api/v1/retrieval/scores/search"
        params: Dict[str, Any] = {"limit": limit}
        if university_code:
            params["university_code"] = university_code.upper()
        if keyword:
            params["keyword"] = keyword
        if year:
            params["year"] = year
        if subject_group:
            params["subject_group"] = subject_group

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(url, params=params)
                if r.status_code == 200:
                    return r.json().get("data", [])
        except Exception as e:
            logger.warning(f"Lỗi truy xuất điểm chuẩn từ Data Retrieval Service: {e}")
        return []

    async def list_universities(self, region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lấy danh sách các trường đại học."""
        url = f"{self.base_url}/api/v1/retrieval/universities"
        params = {"region": region} if region else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(url, params=params)
                if r.status_code == 200:
                    return r.json().get("data", [])
        except Exception as e:
            logger.warning(f"Lỗi lấy danh mục trường từ Data Retrieval Service: {e}")
        return []

    async def predict_cutoff_score(
        self,
        university_code: str,
        major_code: str,
        exam_block: str = "A00",
        historical_scores: Optional[List[float]] = None
    ) -> Optional[Dict[str, Any]]:
        """Dự báo điểm chuẩn 2026 từ mô hình Server 2."""
        url = f"{self.base_url}/api/v1/retrieval/scores/predict"
        payload = {
            "university_code": university_code,
            "major_code": major_code,
            "exam_block": exam_block,
            "historical_scores": historical_scores or [27.0, 27.5, 28.0]
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.post(url, json=payload)
                if r.status_code == 200:
                    return r.json().get("data")
        except Exception as e:
            logger.warning(f"Lỗi dự đoán điểm chuẩn: {e}")
        return None

    async def get_admission_knowledge_for_query(self, user_message: str) -> Tuple[str, List[CitationItem]]:
        """
        Hàm trung tâm tích hợp vào luồng Chatbot:
        - Tự động trích xuất thông tin thực tế từ Server 2 (Vercel API)
        - Trả về (context_markdown, citations) để nạp vào prompt cho DeepSeek Reasoner
        """
        uni_code, block, keyword = self.detect_university_intent(user_message)
        
        # Kiểm tra xem câu hỏi có liên quan đến đại học / điểm chuẩn / ngành học hay không
        admissions_triggers = [
            "trường", "đại học", "điểm chuẩn", "xét tuyển", "nguyện vọng",
            "ngành", "học phí", "chỉ tiêu", "khoa học máy tính", "kinh tế",
            "bách khoa", "ngoại thương", "quốc gia", "khối a", "khối d", "khối b"
        ]
        has_admissions_intent = (
            uni_code is not None or
            keyword is not None or
            any(t in user_message.lower() for t in admissions_triggers)
        )

        if not has_admissions_intent:
            return "", []

        citations: List[CitationItem] = []
        lines: List[str] = []

        # 1. Truy xuất thông tin trường cụ thể nếu phát hiện mã trường
        if uni_code:
            uni_detail = await self.get_university(uni_code)
            if uni_detail:
                lines.append(f"### DỮ LIỆU CƠ SỞ ĐÀO TẠO: {uni_detail.get('name')} (Mã: {uni_detail.get('code')})")
                lines.append(f"- Khu vực: {uni_detail.get('region')} | Website: {uni_detail.get('website', 'Chính thức')}")
                lines.append(f"- Học phí ước tính: {uni_detail.get('tuition_fee', 'Theo quy chế của trường')}")
                lines.append(f"- Mô tả: {uni_detail.get('description', '')}")

            # Truy xuất điểm chuẩn của trường
            scores = await self.search_scores(university_code=uni_code, keyword=keyword, subject_group=block, limit=8)
            if scores:
                lines.append(f"\n#### BẢNG ĐIỂM CHUẨN ĐÃ THU THẬP & XÁC THỰC CỦA TRƯỜNG ({uni_code}):")
                for s in scores:
                    groups = ", ".join(s.get("subject_groups", []))
                    note = f" ({s.get('note')})" if s.get("note") else ""
                    lines.append(f"- Ngành: {s.get('major_name')} (Mã: {s.get('major_code')}) | Tổ hợp: [{groups}] | Điểm chuẩn gần nhất: **{s.get('cutoff_score')} điểm**{note}")

            citations.append(CitationItem(
                source_title=f"Đề án & Điểm chuẩn Đại học {uni_code} (Cập nhật thời gian thực)",
                source_url=f"{self.base_url}/api/v1/retrieval/scores/search?university_code={uni_code}",
                tier="Cấp 3 (Tuyển dụng/Trường)",
                verified=True
            ))

        # 2. Nếu không có trường cụ thể nhưng có từ khóa ngành (ví dụ: 'Khoa học máy tính', 'Marketing')
        elif keyword:
            scores = await self.search_scores(keyword=keyword, subject_group=block, limit=8)
            if scores:
                lines.append(f"### DỮ LIỆU ĐIỂM CHUẨN NGÀNH LIÊN QUAN ĐẾN '{keyword.upper()}':")
                for s in scores:
                    groups = ", ".join(s.get("subject_groups", []))
                    lines.append(f"- Trường: {s.get('uni_name', s.get('uni_code'))} | Ngành: {s.get('major_name')} | Tổ hợp: [{groups}] | Điểm chuẩn: **{s.get('cutoff_score')} điểm**")

            citations.append(CitationItem(
                source_title=f"Tra cứu Điểm chuẩn Ngành {keyword.title()} tại các trường Đại học",
                source_url=f"{self.base_url}/api/v1/retrieval/scores/search?keyword={keyword}",
                tier="Cấp 3 (Tuyển dụng/Trường)",
                verified=True
            ))

        # 3. Nếu là câu hỏi chung về danh sách các trường
        else:
            unis = await self.list_universities()
            if unis:
                lines.append("### DANH MỤC CÁC TRƯỜNG ĐẠI HỌC HÀNG ĐẦU VIỆT NAM (DỮ LIỆU THỜI GIAN THỰC):")
                for u in unis[:8]:
                    lines.append(f"- [{u.get('code')}] {u.get('name')} ({u.get('region')}) - Học phí: {u.get('tuition_fee', 'Theo đề án')}")

        if lines:
            context_header = (
                "\n[DỮ LIỆU ĐIỂM CHUẨN & TUYỂN SINH TRỰC TIẾP TỪ SERVER DATA RETRIEVAL API]\n"
                "(Dữ liệu dưới đây được lấy trực tiếp từ https://admissions-data-retrieval-api.vercel.app - Hãy sử dụng các số liệu chính xác này để tư vấn cho học sinh, không tự bịa đặt điểm chuẩn):\n"
            )
            return context_header + "\n".join(lines), citations

        return "", []

# Singleton instance
retrieval_client = DataRetrievalClient()
