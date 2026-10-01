import os
import json
from typing import Dict, Any, Optional, List
from app.core.config import settings

class SupabaseService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.client = None
        self._local_profiles: Dict[str, Dict[str, Any]] = {}
        self._local_bookmarks: List[Dict[str, Any]] = []

        if self.url and self.key:
            try:
                from supabase import create_client, Client
                self.client: Client = create_client(self.url, self.key)
            except Exception as e:
                # Fallback to local storage if connection error
                self.client = None

    async def save_student_profile(self, profile_data: Dict[str, Any]) -> str:
        profile_id = profile_data.get("id")
        self._local_profiles[profile_id] = profile_data

        if self.client:
            try:
                self.client.table("student_profiles").upsert(profile_data).execute()
            except Exception:
                pass
        return profile_id

    async def get_student_profile(self, profile_id: str) -> Optional[Dict[str, Any]]:
        if profile_id in self._local_profiles:
            return self._local_profiles[profile_id]

        if self.client:
            try:
                res = self.client.table("student_profiles").select("*").eq("id", profile_id).single().execute()
                if res.data:
                    self._local_profiles[profile_id] = res.data
                    return res.data
            except Exception:
                pass
        return None

    async def toggle_bookmark(self, student_id: str, university_code: str, major_code: str) -> Dict[str, Any]:
        item = {"student_id": student_id, "university_code": university_code, "major_code": major_code}
        exists = any(b["student_id"] == student_id and b["university_code"] == university_code and b["major_code"] == major_code for b in self._local_bookmarks)
        if exists:
            self._local_bookmarks = [b for b in self._local_bookmarks if not (b["student_id"] == student_id and b["university_code"] == university_code and b["major_code"] == major_code)]
            is_saved = False
        else:
            self._local_bookmarks.append(item)
            is_saved = True

        if self.client:
            try:
                if is_saved:
                    self.client.table("wishlists").insert(item).execute()
                else:
                    self.client.table("wishlists").delete().match(item).execute()
            except Exception:
                pass

        return {"success": True, "is_saved": is_saved}

supabase_service = SupabaseService()
