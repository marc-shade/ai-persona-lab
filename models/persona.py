from datetime import datetime
from typing import List, Optional
import uuid
import json
import requests
import os
from pydantic import BaseModel

OLLAMA_API_URL = "http://localhost:11434/api"

class Persona(BaseModel):
    id: str
    name: str
    age: int
    nationality: str
    occupation: str
    background: str
    routine: str
    personality: str
    skills: List[str]
    avatar: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 1000
    created_at: datetime
    modified_at: datetime
    tags: List[str] = []
    notes: str = ""

class PersonaManager:
    def __init__(self):
        self.personas = []
        self.settings = {
            "default_model": None,
            "default_temperature": 0.7,
            "default_max_tokens": 1000
        }
        self._load_settings()
        self._load_personas()
    
    def _load_personas(self):
        try:
            with open("data/personas.json", "r") as f:
                data = json.load(f)
                self.personas = [Persona(**p) for p in data]
        except FileNotFoundError:
            self.personas = []
    
    def _save_personas(self):
        with open("data/personas.json", "w") as f:
            json.dump([p.dict() for p in self.personas], f, default=str)
    
    def _load_settings(self):
        """Load settings from settings.json"""
        try:
            with open("data/settings.json", "r") as f:
                loaded_settings = json.load(f)
                self.settings.update(loaded_settings)
        except FileNotFoundError:
            self._save_settings()
    
    def _save_settings(self):
        """Save settings to settings.json"""
        os.makedirs("data", exist_ok=True)
        with open("data/settings.json", "w") as f:
            json.dump(self.settings, f)
    
    def update_settings(self, settings: dict):
        """Update settings and save them"""
        # Update settings
        self.settings.update(settings)
        self._save_settings()
    
    def get_settings(self) -> dict:
        """Get current settings"""
        return self.settings.copy()

    def generate_persona(self, occupation: str, model: str = None, temperature: float = None, max_tokens: int = None) -> Optional[Persona]:
        """Generate a new persona with the given occupation using Ollama."""
        # Use provided model or fall back to default
        if model is None:
            model = self.settings.get("default_model")
            
        # If still no model, try to get available models
        if model is None:
            available_models = self.get_available_models()
            if available_models:
                model = available_models[0]
            else:
                raise ValueError("No available models")
                
        if temperature is None:
            temperature = self.settings["default_temperature"]
        if max_tokens is None:
            max_tokens = self.settings["default_max_tokens"]

        # Ensure max_tokens is large enough for complete responses
        if max_tokens < 1000:
            max_tokens = 1000

        prompt = f"""You are a JSON generator for creating detailed, realistic personas. You must ONLY output a valid JSON object - no other text.
        Generate a CONCISE persona for a {occupation} using this exact format:

{{
    "name": "Example Name",
    "age": 35,
    "nationality": "Example Nationality",
    "occupation": "{occupation}",
    "background": "One sentence about education and career.",
    "routine": "One sentence about daily schedule.",
    "personality": "One sentence about traits.",
    "skills": [
        "Skill 1",
        "Skill 2",
        "Skill 3"
    ]
}}

IMPORTANT:
1. Output ONLY valid JSON - no other text
2. Keep all text fields SHORT (one sentence each)
3. Age between 25-65
4. Use proper JSON quotes and commas
5. Ensure JSON is complete and valid"""

        try:
            response = requests.post(
                f"{OLLAMA_API_URL}/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                }
            )
            response.raise_for_status()
            
            # Extract and validate the response
            result = response.json()
            try:
                # Clean the response string
                response_text = result["response"].strip()
                
                # Find the JSON object
                start_idx = response_text.find("{")
                end_idx = response_text.rfind("}") + 1
                
                if start_idx == -1 or end_idx == 0:
                    print("Raw response:", response_text)
                    raise ValueError("No JSON object found in response")
                
                # Extract just the JSON part
                json_text = response_text[start_idx:end_idx]
                
                # Try to parse the JSON
                try:
                    persona_data = json.loads(json_text)
                except json.JSONDecodeError:
                    # If parsing fails, try to fix common issues
                    # 1. Fix unterminated strings by adding missing quotes
                    lines = json_text.split('\n')
                    fixed_lines = []
                    for i, line in enumerate(lines):
                        line = line.rstrip()
                        if i < len(lines) - 1 and ':' in line and not line.rstrip().endswith(',') and not line.rstrip().endswith('{'):
                            if line.count('"') % 2 == 1:  # Unterminated string
                                line = line + '"'
                            line = line + ','
                        fixed_lines.append(line)
                    json_text = '\n'.join(fixed_lines)
                    
                    # Try parsing again
                    persona_data = json.loads(json_text)
                
            except Exception as e:
                print("Raw response:", result["response"])
                print("JSON error:", str(e))
                raise ValueError("Invalid JSON response from model")
            
            # Validate required fields
            required_fields = ["name", "age", "nationality", "background", "routine", "personality", "skills"]
            missing_fields = [field for field in required_fields if field not in persona_data]
            if missing_fields:
                print("Raw response:", result["response"])
                raise ValueError(f"Missing required fields in persona data: {missing_fields}")
            
            if not isinstance(persona_data["skills"], list) or len(persona_data["skills"]) < 1:
                raise ValueError("Skills must be a non-empty list")
            
            if not (25 <= persona_data["age"] <= 65):
                raise ValueError("Age must be between 25 and 65")
            
            # Create new persona with validated data
            new_persona = Persona(
                id=str(uuid.uuid4()),
                name=persona_data["name"],
                age=persona_data["age"],
                nationality=persona_data["nationality"],
                occupation=occupation,
                background=persona_data["background"],
                routine=persona_data["routine"],
                personality=persona_data["personality"],
                skills=persona_data["skills"],
                avatar=self._generate_avatar(persona_data["name"]),
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            self.personas.append(new_persona)
            self._save_personas()
            return new_persona
            
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON response: {str(e)}")
            if response and response.text:
                print(f"Raw response: {response.text}")
            return None
        except Exception as e:
            print(f"Error generating persona: {str(e)}")
            return None
    
    def update_persona(self, persona: Persona):
        """Update an existing persona"""
        for i, p in enumerate(self.personas):
            if p.id == persona.id:
                persona.modified_at = datetime.now()
                self.personas[i] = persona
                self._save_personas()
                return True
        return False

    def get_available_models(self) -> List[str]:
        """Get list of available Ollama models"""
        try:
            response = requests.get(f"{OLLAMA_API_URL}/tags")
            if response.status_code == 200:
                models_data = response.json()["models"]
                return [model["name"] for model in models_data] if models_data else []
            return []
        except Exception as e:
            print(f"Error fetching models: {str(e)}")
            return []
    
    def _generate_avatar(self, name: str) -> str:
        """Generate an avatar URL using DiceBear API."""
        seed = str(uuid.uuid5(uuid.NAMESPACE_DNS, name))
        return f"https://api.dicebear.com/7.x/personas/svg?seed={seed}"

    def _get_first_available_model(self) -> str:
        """Get the first available model from Ollama, or a sensible default."""
        models = self.get_available_models()
        if models:
            # Prefer instruction-tuned models
            for model in models:
                if 'instruct' in model.lower() or 'chat' in model.lower():
                    return model
            return models[0]
        return "mistral:instruct"  # Fallback default
    
    def list_personas(self) -> List[Persona]:
        """Return list of all personas."""
        return self.personas
    
    def get_persona(self, persona_id: str) -> Optional[Persona]:
        """Get a specific persona by ID."""
        return next((p for p in self.personas if p.id == persona_id), None)
    
    def remove_persona(self, persona_id: str) -> bool:
        """Remove a persona by ID."""
        persona = self.get_persona(persona_id)
        if persona:
            self.personas.remove(persona)
            self._save_personas()
            return True
        return False

    def create_default_persona(self):
        """Create a default persona to get users started"""
        default_persona = {
            "id": str(uuid.uuid4()),
            "name": "Assistant",
            "age": 28,
            "nationality": "International",
            "occupation": "AI Assistant",
            "background": "I am a helpful AI assistant with expertise in various fields. I enjoy helping users accomplish their goals and learning from our interactions.",
            "personality": "Friendly, professional, and detail-oriented. I maintain a positive attitude while focusing on delivering accurate and helpful information.",
            "routine": "Available 24/7 to assist users with their queries and tasks. I continuously learn from interactions to provide better assistance.",
            "skills": ["Communication", "Problem Solving", "Research", "Technical Support", "Creative Thinking"],
            "model": self.settings["default_model"] if self.settings["default_model"] is not None else self._get_first_available_model(),
            "temperature": self.settings["default_temperature"],
            "max_tokens": self.settings["default_max_tokens"],
            "notes": "Default assistant persona to help you get started with AI Persona Lab.",
            "tags": ["assistant", "helpful", "default"],
            "created_at": datetime.now(),
            "modified_at": datetime.now()
        }
        
        # Generate an avatar for the default persona
        avatar = self._generate_avatar(default_persona["name"])
        default_persona["avatar"] = avatar
        
        # Create and save the persona
        persona = Persona(**default_persona)
        self.personas.append(persona)
        self._save_personas()
        return persona
