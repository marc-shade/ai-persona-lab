import json
import uuid
from datetime import datetime
from typing import Optional

import requests

from models.persona import Persona

OLLAMA_API_URL = "http://localhost:11434/api"

PERSONA_PROMPT = """You are a creative AI assistant specializing in creating detailed, realistic personas. Generate a complete persona for a {occupation}.

You must respond with ONLY a valid JSON object using this EXACT schema - no other text or explanation:

{
    "name": string,           # Full name (be diverse and realistic)
    "age": number,           # Between 25-65
    "nationality": string,   # Country of origin (be diverse)
    "occupation": string,    # The provided occupation
    "background": string,    # 3-4 sentences about education and career progression
    "routine": string,       # Detailed daily schedule and habits
    "personality": string,   # Key personality traits and communication style
    "skills": [             # List of 3-5 specific skills
        string,             # Technical skills related to occupation
        string,             # Soft skills that define work style
        string              # Unique/interesting skill that makes them stand out
    ],
    "model_config": {
        "model": string,    # Default LLM model to use
        "temperature": number,  # Creativity level (0.0-1.0)
        "max_tokens": number    # Maximum response length
    }
}

Make the persona feel authentic with:
1. A coherent background story showing career progression
2. A realistic daily routine matching their profession
3. Personality traits that affect their work style
4. Specific and measurable skills

Ensure the response is ONLY the JSON object with no additional text or markdown formatting."""


def generate_persona(occupation: str) -> Optional[Persona]:
    """Generate a new persona with the given occupation using Ollama."""
    response = None
    try:
        # Request JSON format explicitly
        response = requests.post(
            f"{OLLAMA_API_URL}/generate",
            json={
                "model": "mistral:instruct",
                # Avoid str.format brace conflicts by simple replacement
                "prompt": PERSONA_PROMPT.replace("{occupation}", occupation),
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 1000,
                },
            },
        )
        response.raise_for_status()

        # Parse the response
        result = response.json()
        persona_data = json.loads(result["response"])

        # Create new persona from the structured data
        return Persona(
            id=str(uuid.uuid4()),
            name=persona_data["name"],
            age=persona_data["age"],
            nationality=persona_data["nationality"],
            occupation=persona_data["occupation"],
            background=persona_data["background"],
            routine=persona_data["routine"],
            personality=persona_data["personality"],
            skills=persona_data["skills"],
            avatar=f"https://api.dicebear.com/7.x/personas/svg?seed={uuid.uuid5(uuid.NAMESPACE_DNS, persona_data['name'])}",
            model=persona_data["model_config"]["model"],
            temperature=persona_data["model_config"]["temperature"],
            max_tokens=persona_data["model_config"]["max_tokens"],
            created_at=datetime.now(),
            modified_at=datetime.now(),
        )

    except Exception as e:
        print(f"Error generating persona: {str(e)}")
        if response and response.text:
            print(f"Response text: {response.text}")
        return None
