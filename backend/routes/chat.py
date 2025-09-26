# routes/chat.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.dependecies import get_current_user
from ai.openai_client import ask_question

router = APIRouter(prefix="/chat", tags=["Chat"])

class HistoryItem(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    dog_id: Optional[str] = None
    conversation_id: Optional[str] = None
    history: Optional[List[HistoryItem]] = None

@router.post("/")
async def chat_with_ai(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    AI-only chat endpoint.
    Accepts optional `history` (list of {role, content}) — we will include it when calling the model.
    """
    # Convert pydantic history to plain list (or empty)
    history_payload = []
    if req.history:
        for h in req.history:
            # ensure roles are valid for the model
            if h.role in ("user", "assistant"):
                history_payload.append({"role": h.role, "content": h.content})

    # ask_question will accept the message and optional history
    reply = ask_question(req.message, history=history_payload)
    return {"reply": reply}
