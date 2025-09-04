import os, requests
from dotenv import load_dotenv
import json

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
    if subject=="overview":
        system_message="""
You are an expert veterinarian. 
Based on the dog's description form provided, medical standards, and scientific knowledge, provide accurate information to diagnose and guide the dog's health. Today's date is """ + datetime.now().strftime("%Y-%m-%d") + """
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
    elif subject=="protocol":
        system_message="""
You are an expert veterinarian. 
Based on the dog's description form provided, medical standards, and scientific knowledge, provide accurate information to diagnose and guide the dog's health. Today's date is """ + datetime.now().strftime("%Y-%m-%d") + """
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
        "title":"..."
    ]
}
Do not include any explanations outside this JSON and nothing before first '{'.
"""

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    # Build message list
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"""My dog's description form is: \n{user_message}"""}
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
    res={}
    try:
        res=json.loads(data["choices"][0]["message"]["content"])
    except Exception as e:
        print(e)

    return res


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
