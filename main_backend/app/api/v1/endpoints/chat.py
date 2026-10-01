from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.deepseek_service import deepseek_service

router = APIRouter()

@router.post("/message", response_model=Dict[str, Any], summary="Trợ lý Hướng nghiệp AI (DeepSeek CoT + Deep Research tra cứu)")
async def chat_with_advisor(request: ChatRequest):
    try:
        response: ChatResponse = await deepseek_service.get_advisory_response(
            user_message=request.message,
            history=request.conversation_history,
            student_profile=request.student_profile_context,
            use_deep_research=request.use_deep_research
        )
        return {
            "success": True,
            "data": response.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi phản hồi cố vấn AI: {str(e)}")
