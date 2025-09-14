import os, requests
from dotenv import load_dotenv
import json
from typing import List, Dict, Optional

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
from datetime import datetime


def call_gpt_chat(
    user_message: str,
    subject: str,
    model: str = "gpt-4o",
    assistant_message: str = None,
    temperature: float = 0.7,
):
    if subject == "overview":
        system_message = (
            """
You are an expert veterinarian. 
Based on the dog's description form provided, medical standards, and scientific knowledge, provide accurate information to diagnose and guide the dog's health. Today's date is """
            + datetime.now().strftime("%Y-%m-%d")
            + """
Only return a JSON response in the following structure:
{
    "daily_meal_plan": [
        {"title": "Breakfast", "description": "..."},
        {"title": "Lunch", "description": "..."},
        {"title": "Dinner", "description": "..."}
    ],
    "what_to_do_goals": [
    // Generate a structured plan with DAILY goals for each day 
    // until the estimated_time period is over (e.g., 7 days, 14 days).
    // Each entry should include a "day" field to indicate which day it belongs to.
        {
            "title": "...",
            "description": "...",
            "priority": "...",
            "due_date": "...",
            "category": "stool_quality/energy_level/overall_health",
            "completed": false,
            "id": <add unique number here>,
            "achievement_badges": [
                {"title": "...", "description": "..."}
            ]
        }
    ],
    "estimated_time": <Time>,
    "next_revision": <Date>,
    "phase": {"title":<Any of reset, rebuild, strengthen>, "description": <A small phrase explaining the phase>}
}
Do not include any explanations outside this JSON and nothing before first '{'.
"""
        )
    elif subject == "protocol":
        system_message = (
            """
You are an expert veterinarian. 
Based on the dog's description form provided, medical standards, and scientific knowledge, provide accurate information to diagnose and guide the dog's health. Today's date is """
            + datetime.now().strftime("%Y-%m-%d")
            + """
Only return a JSON response in the following structure:
{
    "supplements": [
        {
            "title": "..."
        }, ...
    ],
    "lifestyle_recommendations":[
        {
            "title": "...",
            "id": <add unique number here>
        }, ...
    ],
    "next_steps": [
        {"id": <add unique number here>, "title":"..."}
    ],
    "confidence": <0 - 100>,
    "priority": "<low, medium, high, urgent>",
    "symptoms": [<list of symptoms>]
}
Do not include any explanations outside this JSON and nothing before first '{'.
"""
        )

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    # Build message list
    messages = [
        {"role": "system", "content": system_message},
        {
            "role": "user",
            "content": f"""My dog's description form is: \n{user_message}""",
        },
    ]

    if assistant_message:
        messages.insert(2, {"role": "assistant", "content": assistant_message})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    # Assuming at least one choice is returned
    res = {}
    try:
        res = json.loads(data["choices"][0]["message"]["content"])
    except Exception as e:
        print(e)

    return res


def ask_question(
    user_message: str,
    history: Optional[List[Dict[str, str]]] = None,
    model: str = "gpt-4o",
    temperature: float = 0.7,
) -> str:
    """
    Let users chat freely with the AI vet assistant.
    history: optional list of {"role": "user"|"assistant", "content": "..."}
    Returns the assistant reply string.
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    system_message = (
        "You are an expert veterinarian assistant.\n"
        "Answer user questions about their dog clearly, concisely, and in plain text.\n"
        "Do not output JSON, only human-readable text."
    )

    messages = [{"role": "system", "content": system_message}]

    # append history if provided (trusted roles only)
    if history:
        for h in history:
            role = h.get("role")
            content = h.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    # finally, append current user message
    messages.append({"role": "user", "content": user_message})

    payload = {"model": model, "messages": messages, "temperature": temperature}

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    # safe extraction
    try:
        reply = data["choices"][0]["message"]["content"].strip()
    except Exception:
        # fallback to a reasonable message
        reply = "Sorry — I couldn't parse a response. Please try again."
    return reply


def analyze_health_logs(
    health_logs: str,
    model: str = "gpt-4o",
    temperature: float = 0.5,
) -> Dict:
    """
    Analyze dog's health logs and return a JSON with a health score (0-100)
    and additional insights.
    """

    system_message = """
You are an expert veterinarian. 
You will analyze the dog's health logs (daily updates, symptoms, activity, meals, etc.).
Return only a JSON object with the following structure:
{
    "health_score": <0-100>,
    "key_observations": ["...", "..."],
    "recommendations": ["...", "..."],
    "confidence": <0-100>,
    "stool_quality":"<critical/improving/stable>",
    "energy_level": "<low/moderate/high>",
    "overall_health": "<critical/improving/stable>"
}
Do not include any explanations outside this JSON and nothing before first '{'.
"""

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Here are the dog's health logs:\n{health_logs}"},
    ]

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()

    try:
        result = json.loads(data["choices"][0]["message"]["content"])
    except Exception as e:
        print("Error parsing JSON:", e)
        result = {
            "health_score": 0,
            "key_observations": [],
            "recommendations": [],
            "confidence": 0,
        }

    return result

# Example usage
if __name__ == "__main__":
    system = """
You are an expert veterinarian. 
Based on the dog's description form provided, medical standards, and scientific knowledge, provide accurate information to diagnose and guide the dog's health. Today's date is """ + datetime.now().strftime("%Y-%m-%d") + """.
Only return a JSON response in the following structure:

{
    "daily_meal_plan": [
        {"title": "Breakfast", "description": "..."},
        {"title": "Lunch", "description": "..."},
        {"title": "Dinner", "description": "..."}
    ],
    "what_to_do_goals": [
        {
            "title": "...",
            "description": "...",
            "priority": "...",
            "due_date": "...",
            "completed": false,
            "id": <add unique number here>,
            "achievement_badges": [
                {"title": "...", "description": "..."}
            ]
        }
    ]
}

Do not include any explanations outside this JSON and nothing before first '{'.
"""

    user = """
    Field: Dog's Name
User value: haskldfhklj
---
Field: Breed
User value: hklhaskldhf
---
Field: Age (years)
User value: 2
---
Field: Weight (kg)
User value: 22
---
Field: Stool Type
User value: normal
---
Field: Symptoms
User value: ['diarrhea']
---
Field: Behavior Notes
User value: bkhkhkj
---
Field: Color
User value: black
Description: Color of the dog.
---"""
    try:
        reply = call_gpt_chat(user, "protocol")
        print("Assistant:", reply)
    except Exception as e:
        print("Error:", e)
