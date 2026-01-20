import time

import requests
import streamlit as st

from adaptive_prompts import AdaptivePromptManager


class ChatInterface:
    def __init__(self):
        if "messages" not in st.session_state:
            st.session_state.messages = []
        if "active_personas" not in st.session_state:
            st.session_state.active_personas = set()
        if "persona_active_states" not in st.session_state:
            st.session_state.persona_active_states = {}

        # Initialize adaptive prompt manager
        if "adaptive_prompt_manager" not in st.session_state:
            st.session_state.adaptive_prompt_manager = AdaptivePromptManager()
        # Ensure persona manager is available for rendering and actions
        if (
            "persona_manager" not in st.session_state
            or st.session_state.persona_manager is None
        ):
            # Lazy import to avoid circulars in some environments
            from models.persona import PersonaManager

            st.session_state.persona_manager = PersonaManager()

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
                    "Other",
                ]

                with st.form("create_persona_form"):
                    selected_occupation = st.selectbox(
                        "Select Occupation",
                        options=occupations,
                        key="occupation_select",
                    )

                    # Show custom input if "Other" is selected
                    custom_occupation = None
                    if selected_occupation == "Other":
                        custom_occupation = st.text_input("Enter Custom Occupation")

                    if st.form_submit_button("🎯 Generate Persona"):
                        # Determine which occupation to use
                        occupation_to_use = (
                            custom_occupation
                            if selected_occupation == "Other"
                            else selected_occupation
                        )

                        if selected_occupation == "Other" and not custom_occupation:
                            st.error("Please enter a custom occupation")
                            return

                        try:
                            settings = st.session_state.persona_manager.get_settings()
                            if not settings.get("default_model"):
                                st.error("Please select a model in settings first!")
                                return

                            with st.spinner(
                                f"Generating {occupation_to_use} persona..."
                            ):
                                persona = (
                                    st.session_state.persona_manager.generate_persona(
                                        occupation=occupation_to_use,
                                        model=settings.get("default_model"),
                                        temperature=settings.get(
                                            "default_temperature", 0.7
                                        ),
                                        max_tokens=settings.get(
                                            "default_max_tokens", 150
                                        ),
                                    )
                                )
                                if persona:
                                    # Set new persona as active by default
                                    st.session_state.active_personas.add(persona.id)
                                    st.session_state.persona_active_states[
                                        persona.id
                                    ] = True
                                    st.success(
                                        f"Created {persona.name}, the {persona.occupation}!"
                                    )
                                    st.rerun()
                        except Exception as e:
                            st.error(f"Error: {str(e)}")

            # Current Personas section
            st.subheader("Current Personas")
            # Guard: ensure persona manager exists
            if (
                "persona_manager" not in st.session_state
                or st.session_state.persona_manager is None
            ):
                from models.persona import PersonaManager

                st.session_state.persona_manager = PersonaManager()
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
        # Display chat messages
        for message in st.session_state.messages:
            with st.chat_message(message["role"], avatar=message.get("avatar")):
                st.write(f"**{message.get('name', 'You')}:** {message['content']}")

        # Chat input
        if prompt := st.chat_input("Type your message..."):
            # Add user message
            st.session_state.messages.append(
                {"role": "user", "content": prompt, "name": "You"}
            )

            # Get responses from active personas
            active_personas = [
                p for p in personas if p.id in st.session_state.active_personas
            ]

            for persona in active_personas:
                response = self._get_persona_response(persona, prompt)
                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": response,
                        "name": persona.name,
                        "avatar": persona.avatar,
                    }
                )

            # Rerun to update the chat display
            st.rerun()

    def _get_persona_response(self, persona, prompt: str) -> str:
        """Get a response from a persona using the Ollama API with adaptive prompts."""
        try:
            start_time = time.time()

            # Get adaptive prompt manager
            prompt_manager = st.session_state.adaptive_prompt_manager

            # Get optimal template for this persona and context
            context = self._get_conversation_context()
            optimal_template = prompt_manager.get_optimal_template(
                persona=persona, context=context, user_message=prompt
            )

            # Generate the prompt using the adaptive template
            formatted_prompt = prompt_manager.generate_prompt(
                template=optimal_template,
                persona=persona,
                user_message=prompt,
                context=context,
            )

            # Make the API call
            # Build a rich system prompt that includes persona details
            system_prompt = (
                f"You are {persona.name}, a {persona.age}-year-old {persona.nationality} {persona.occupation}.\n\n"
                f"Background: {persona.background}\n"
                f"Daily Routine: {persona.routine}\n"
                f"Personality: {persona.personality}\n"
                f"Skills: {', '.join(persona.skills)}"
            )

            # Augment the formatted prompt to include previous message and explicit instruction
            final_prompt = (
                f"{formatted_prompt}\n\n"
                f"Previous message: {prompt}\n"
                f"Respond naturally as {persona.name}:"
            )

            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": persona.model,
                    "prompt": final_prompt,
                    "system": system_prompt,
                    "stream": False,
                    "options": {
                        "temperature": persona.temperature,
                        "num_predict": persona.max_tokens,
                    },
                },
                timeout=5,
            )
            response.raise_for_status()
            result = response.json()
            response_text = result["response"].strip()

            # Calculate response time
            response_time = time.time() - start_time

            # Calculate quality score (basic heuristic)
            quality_score = self._calculate_response_quality(response_text, prompt)

            # Record usage for learning
            prompt_manager.record_usage(
                template_id=optimal_template.id,
                persona_id=persona.id,
                context=context,
                input_prompt=formatted_prompt,
                generated_response=response_text,
                response_time=response_time,
                quality_score=quality_score,
                success=True,
            )

            return response_text

        except Exception as e:
            # Record failed usage
            if "optimal_template" in locals():
                prompt_manager.record_usage(
                    template_id=optimal_template.id,
                    persona_id=persona.id,
                    context=context,
                    input_prompt=(
                        formatted_prompt if "formatted_prompt" in locals() else prompt
                    ),
                    generated_response="",
                    response_time=0.0,
                    quality_score=0.0,
                    success=False,
                )

            # Log detailed error server-side, but return a generic message to users
            print(f"Error getting response from {persona.name}: {str(e)}")
            return "Sorry, I'm having trouble responding right now."

    def _get_conversation_context(self) -> str:
        """Extract context from recent conversation messages."""
        if not st.session_state.messages:
            return ""

        # Get last 3 messages for context
        recent_messages = st.session_state.messages[-3:]
        context_parts = []

        for msg in recent_messages:
            if msg["role"] == "user":
                context_parts.append(f"User: {msg['content']}")
            else:
                context_parts.append(
                    f"{msg.get('name', 'Assistant')}: {msg['content']}"
                )

        return " | ".join(context_parts)

    def _calculate_response_quality(self, response: str, user_prompt: str) -> float:
        """Calculate a basic quality score for the response."""
        if not response or not response.strip():
            return 0.0

        # Basic quality metrics
        score = 0.5  # Base score

        # Length appropriateness (not too short, not too long)
        length = len(response)
        if 50 <= length <= 500:
            score += 0.2
        elif length > 500:
            score += 0.1

        # Coherence (basic check for sentence structure)
        sentences = response.split(".")
        if len(sentences) >= 2:
            score += 0.1

        # Relevance (very basic keyword matching)
        user_words = set(user_prompt.lower().split())
        response_words = set(response.lower().split())
        common_words = user_words.intersection(response_words)

        if len(common_words) > 0:
            relevance_ratio = len(common_words) / len(user_words)
            score += min(0.2, relevance_ratio)

        return min(1.0, score)
