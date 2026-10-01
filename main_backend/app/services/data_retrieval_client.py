import logging
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("services.data_retrieval_client")

class DataRetrievalClient:
    """
    HTTP Client kết nối từ MAIN_BACKEND (Server 1) sang DATA_RETRIEVAL_SERVICE (Server 2).
    - Lấy dữ liệu cào điểm chuẩn đại học, tổ hợp môn, đề án tuyển sinh.
    - Phục vụ context cho DeepSeek Reasoner phân tích & cố vấn.
    """
    def __init__(self):
        self.base_url = settings.RETRIEVAL_SERVICE_URL.rstrip("/")
        self.timeout = 10.0

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
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Truy xuất điểm chuẩn từ Server 2."""
        url = f"{self.base_url}/api/v1/retrieval/scores/search"
        params = {"limit": limit}
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

retrieval_client = DataRetrievalClient()
