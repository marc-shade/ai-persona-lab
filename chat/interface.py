import streamlit as st
import requests

class ChatInterface:
    def __init__(self):
        if 'messages' not in st.session_state:
            st.session_state.messages = []
        if 'active_personas' not in st.session_state:
            st.session_state.active_personas = set()
        if 'persona_active_states' not in st.session_state:
            st.session_state.persona_active_states = {}

    def render(self):
        """Render the chat interface."""
        # Sidebar for persona management
        with st.sidebar:
            st.header("Manage Personas")
            
            # Create Persona Form
            with st.expander("Create New Persona", expanded=False):
                occupations = [
                    "Business Owner",
                    "Marketing Manager",
                    "Finance Director",
                    "Sales Representative",
                    "Customer Service Manager",
                    "Operations Manager",
                    "Other"
                ]
                
                with st.form("create_persona_form"):
                    selected_occupation = st.selectbox(
                        "Select Occupation",
                        options=occupations,
                        key="occupation_select"
                    )
                    
                    # Show custom input if "Other" is selected
                    custom_occupation = None
                    if selected_occupation == "Other":
                        custom_occupation = st.text_input("Enter Custom Occupation")
                    
                    if st.form_submit_button("🎯 Generate Persona"):
                        # Determine which occupation to use
                        occupation_to_use = custom_occupation if selected_occupation == "Other" else selected_occupation
                        
                        if selected_occupation == "Other" and not custom_occupation:
                            st.error("Please enter a custom occupation")
                            return
                        
                        try:
                            settings = st.session_state.persona_manager.get_settings()
                            if not settings.get("default_model"):
                                st.error("Please select a model in settings first!")
                                return
                            
                            with st.spinner(f"Generating {occupation_to_use} persona..."):
                                persona = st.session_state.persona_manager.generate_persona(
                                    occupation=occupation_to_use,
                                    model=settings.get("default_model"),
                                    temperature=settings.get("default_temperature", 0.7),
                                    max_tokens=settings.get("default_max_tokens", 150)
                                )
                                if persona:
                                    # Set new persona as active by default
                                    st.session_state.active_personas.add(persona.id)
                                    st.session_state.persona_active_states[persona.id] = True
                                    st.success(f"Created {persona.name}, the {persona.occupation}!")
                                    st.rerun()
                        except Exception as e:
                            st.error(f"Error: {str(e)}")
            
            # Current Personas section
            st.subheader("Current Personas")
            personas = st.session_state.persona_manager.list_personas()
            for persona in personas:
                col1, col2 = st.columns([1, 3])
                with col1:
                    st.image(persona.avatar, width=50)
                with col2:
                    st.write(f"**{persona.name}**")
                    st.write(f"*{persona.occupation}*")
                
                # Get the saved state or default to True for new personas
                is_active = st.session_state.persona_active_states.get(persona.id, True)
                
                if st.toggle("Active", value=is_active, key=f"toggle_{persona.id}"):
                    st.session_state.active_personas.add(persona.id)
                    st.session_state.persona_active_states[persona.id] = True
                else:
                    st.session_state.active_personas.discard(persona.id)
                    st.session_state.persona_active_states[persona.id] = False
                st.divider()
        
        # Main chat area
        # Chat controls
        col1, col2 = st.columns([4, 1])
        with col2:
            if st.button("Clear Chat", key="clear_chat"):
                st.session_state.messages = []
                st.rerun()

        # Display chat messages
        for message in st.session_state.messages:
            with st.chat_message(message["role"], avatar=message.get("avatar")):
                st.write(f"**{message.get('name', 'You')}:** {message['content']}")
        
        # Chat input
        if prompt := st.chat_input("Type your message..."):
            # Add user message
            st.session_state.messages.append({
                "role": "user",
                "content": prompt,
                "name": "You"
            })
            
            # Get responses from active personas
            active_personas = [p for p in personas if p.id in st.session_state.active_personas]
            
            for persona in active_personas:
                response = self._get_persona_response(persona, prompt)
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response,
                    "name": persona.name,
                    "avatar": persona.avatar
                })
            
            # Rerun to update the chat display
            st.rerun()
    
    def _get_persona_response(self, persona, prompt: str) -> str:
        """Get a response from a persona using the Ollama API."""
        try:
            system_prompt = f"""You are {persona.name}, a {persona.age}-year-old {persona.nationality} {persona.occupation}.
            Background: {persona.background}
            Daily Routine: {persona.routine}
            Personality: {persona.personality}
            Skills: {', '.join(persona.skills)}

            Respond to messages in character, incorporating your background, personality, and expertise.
            Keep responses concise (2-3 sentences) and natural.
            """

            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": persona.model,
                    "prompt": f"Previous message: {prompt}\nRespond naturally as {persona.name}:",
                    "system": system_prompt,
                    "stream": False,
                    "options": {
                        "temperature": persona.temperature,
                        "num_predict": persona.max_tokens
                    }
                },
                timeout=60
            )
            response.raise_for_status()
            result = response.json()
            return result["response"].strip()

        except requests.exceptions.ConnectionError:
            print(f"Connection error for {persona.name}: Ollama not running")
            return f"*{persona.name} is unavailable* - Ollama is not running. Please start Ollama with `ollama serve`."
        except requests.exceptions.Timeout:
            print(f"Timeout for {persona.name}")
            return f"*{persona.name} is thinking...* Response timed out. The model may be busy or overloaded."
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"Model not found for {persona.name}: {persona.model}")
                return f"*{persona.name} needs a different model* - Model '{persona.model}' not found. Please update the model in persona settings."
            elif e.response.status_code == 500:
                print(f"Server error for {persona.name}")
                return f"*{persona.name} encountered an issue* - Ollama server error. Try restarting Ollama."
            else:
                print(f"HTTP error for {persona.name}: {e}")
                return f"*{persona.name} is unavailable* - Server returned error {e.response.status_code}."
        except Exception as e:
            print(f"Error getting response from {persona.name}: {str(e)}")
            return f"*{persona.name} couldn't respond* - An unexpected error occurred. Please try again."
