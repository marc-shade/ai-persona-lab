import streamlit as st
from models.persona import PersonaManager
from chat.interface import ChatInterface
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    filename='app.log',
    filemode='a',
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger()

st.set_page_config(
    page_title="AI Persona Lab",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

def initialize_session_state():
    """Initialize session state with default values."""
    if 'persona_manager' not in st.session_state:
        st.session_state.persona_manager = PersonaManager()
    if 'chat_interface' not in st.session_state:
        st.session_state.chat_interface = ChatInterface()
        
    # Load current settings
    settings = st.session_state.persona_manager.get_settings()
    
    # Initialize model settings in session state if not present
    if 'selected_model' not in st.session_state:
        st.session_state.selected_model = settings.get('default_model')
    if 'temperature' not in st.session_state:
        st.session_state.temperature = float(settings.get('default_temperature', 0.7))
    if 'max_tokens' not in st.session_state:
        st.session_state.max_tokens = int(settings.get('default_max_tokens', 150))

def update_settings():
    """Update settings in the PersonaManager."""
    new_settings = {
        'default_model': st.session_state.selected_model,
        'default_temperature': st.session_state.temperature,
        'default_max_tokens': st.session_state.max_tokens
    }
    st.session_state.persona_manager.update_settings(new_settings)
    logger.info(f"Settings updated: {new_settings}")

def on_model_change():
    """Callback when model selection changes."""
    update_settings()

def on_temperature_change():
    """Callback when temperature changes."""
    update_settings()

def on_tokens_change():
    """Callback when max tokens changes."""
    update_settings()

def render_model_settings():
    """Render model settings section in sidebar."""
    with st.sidebar:
        with st.expander("⚙️ Model Settings", expanded=False):
            available_models = st.session_state.persona_manager.get_available_models()
            if not available_models:
                st.error("No Ollama models available. Please install models using 'ollama pull <model>'")
                return
            
            # Model selection
            model_index = available_models.index(st.session_state.selected_model) if st.session_state.selected_model in available_models else 0
            st.selectbox(
                "Model",
                options=available_models,
                index=model_index,
                key='selected_model',
                on_change=on_model_change,
                help="Select the default model for generating personas and responses"
            )
            
            # Temperature setting
            st.slider(
                "Temperature",
                min_value=0.0,
                max_value=1.0,
                value=st.session_state.temperature,
                step=0.1,
                key='temperature',
                on_change=on_temperature_change,
                help="Higher values make output more random, lower values more deterministic"
            )
            
            # Max tokens setting
            st.number_input(
                "Max Tokens",
                min_value=50,
                max_value=2000,
                value=st.session_state.max_tokens,
                step=50,
                key='max_tokens',
                on_change=on_tokens_change,
                help="Maximum number of tokens in model responses"
            )

def main():
    # Initialize session state
    initialize_session_state()
    
    st.title("AI Persona Lab")
    
    # Render model settings in sidebar
    render_model_settings()
    
    # Main content area
    personas = st.session_state.persona_manager.list_personas()
    if not personas:
        st.info("Add some personas using the sidebar to start chatting!")
        return
    
    # Display detailed persona information in tabs
    tabs = st.tabs([f"{p.name}" for p in personas])
    
    for idx, tab in enumerate(tabs):
        with tab:
            persona = personas[idx]
            
            # Layout with columns
            left_col, right_col = st.columns([1, 3])
            
            with left_col:
                st.image(persona.avatar, width=200)
                st.markdown(f"### {persona.name}")
                with st.expander("Basic Information", expanded=False):
                    with st.form(f"basic_info_{persona.id}"):
                        new_name = st.text_input("Name", value=persona.name)
                        new_age = st.number_input("Age", min_value=25, max_value=65, value=persona.age)
                        new_nationality = st.text_input("Nationality", value=persona.nationality)
                        new_occupation = st.text_input("Occupation", value=persona.occupation)
                        
                        if st.form_submit_button("Update Basic Info"):
                            persona.name = new_name
                            persona.age = new_age
                            persona.nationality = new_nationality
                            persona.occupation = new_occupation
                            persona.modified_at = datetime.now()
                            st.session_state.persona_manager._save_personas()
                            st.success("Basic information updated!")
                            st.rerun()
            
            with right_col:
                # Background section
                with st.expander("Background & Story", expanded=False):
                    with st.form(f"background_{persona.id}"):
                        new_background = st.text_area(
                            "Background",
                            value=persona.background,
                            height=100
                        )
                        if st.form_submit_button("Update Background"):
                            persona.background = new_background
                            persona.modified_at = datetime.now()
                            st.session_state.persona_manager._save_personas()
                            st.success("Background updated!")
                            st.rerun()
                
                # Personality section
                with st.expander("Personality", expanded=False):
                    with st.form(f"personality_{persona.id}"):
                        new_personality = st.text_area(
                            "Personality",
                            value=persona.personality,
                            height=100
                        )
                        if st.form_submit_button("Update Personality"):
                            persona.personality = new_personality
                            persona.modified_at = datetime.now()
                            st.session_state.persona_manager._save_personas()
                            st.success("Personality updated!")
                            st.rerun()
                
                # Daily Routine section
                with st.expander("Daily Routine", expanded=False):
                    with st.form(f"routine_{persona.id}"):
                        new_routine = st.text_area(
                            "Daily Routine",
                            value=persona.routine,
                            height=100
                        )
                        if st.form_submit_button("Update Routine"):
                            persona.routine = new_routine
                            persona.modified_at = datetime.now()
                            st.session_state.persona_manager._save_personas()
                            st.success("Routine updated!")
                            st.rerun()
                
                # Skills section
                with st.expander("Skills", expanded=False):
                    with st.form(f"skills_{persona.id}"):
                        # Skills as a comma-separated list
                        skills_str = ", ".join(persona.skills)
                        new_skills = st.text_area(
                            "Skills (comma-separated)",
                            value=skills_str,
                            height=100,
                            help="Enter skills separated by commas"
                        )
                        if st.form_submit_button("Update Skills"):
                            persona.skills = [s.strip() for s in new_skills.split(",") if s.strip()]
                            persona.modified_at = datetime.now()
                            st.session_state.persona_manager._save_personas()
                            st.success("Skills updated!")
                            st.rerun()
                
                # Model Settings section
                with st.expander("Model Settings", expanded=False):
                    with st.form(f"model_settings_{persona.id}"):
                        models = st.session_state.persona_manager.get_available_models()
                        if not models:
                            st.error("No Ollama models available. Please install models using 'ollama pull <model>'")
                        else:
                            new_model = st.selectbox(
                                "Model",
                                options=models,
                                index=models.index(persona.model) if persona.model in models else 0,
                                help="Select the model for this persona"
                            )
                            
                            new_temperature = st.slider(
                                "Temperature",
                                min_value=0.0,
                                max_value=1.0,
                                value=persona.temperature,
                                step=0.1,
                                help="Higher values make output more random, lower values more deterministic"
                            )
                            
                            new_max_tokens = st.number_input(
                                "Max Tokens",
                                min_value=50,
                                max_value=2000,
                                value=persona.max_tokens,
                                step=50,
                                help="Maximum number of tokens in responses"
                            )
                            
                            if st.form_submit_button("Update Model Settings"):
                                persona.model = new_model
                                persona.temperature = new_temperature
                                persona.max_tokens = new_max_tokens
                                persona.modified_at = datetime.now()
                                st.session_state.persona_manager._save_personas()
                                st.success("Model settings updated!")
                                st.rerun()
                
                # Notes section
                with st.expander("Notes", expanded=False):
                    with st.form(f"notes_{persona.id}"):
                        new_notes = st.text_area(
                            "Notes",
                            value=persona.notes,
                            height=100
                        )
                        if st.form_submit_button("Update Notes"):
                            persona.notes = new_notes
                            persona.modified_at = datetime.now()
                            st.session_state.persona_manager._save_personas()
                            st.success("Notes updated!")
                            st.rerun()
                
                # Tags section
                with st.expander("Tags", expanded=False):
                    with st.form(f"tags_{persona.id}"):
                        # Show existing tags with delete buttons
                        st.write("Current Tags:")
                        tags_to_remove = []
                        for tag in persona.tags:
                            col1, col2 = st.columns([3, 1])
                            with col1:
                                st.write(f"• {tag}")
                            with col2:
                                if st.checkbox("Remove", key=f"remove_tag_{persona.id}_{tag}"):
                                    tags_to_remove.append(tag)
                        
                        # Add new tag
                        new_tag = st.text_input("Add New Tag")
                        
                        if st.form_submit_button("Update Tags"):
                            # Remove selected tags
                            for tag in tags_to_remove:
                                persona.tags.remove(tag)
                            
                            # Add new tag if provided
                            if new_tag and new_tag not in persona.tags:
                                persona.tags.append(new_tag)
                            
                            persona.modified_at = datetime.now()
                            st.session_state.persona_manager._save_personas()
                            st.success("Tags updated!")
                            st.rerun()
                
                # Show metadata at the bottom
                with st.expander("Metadata", expanded=False):
                    st.write(f"Created: {persona.created_at.strftime('%Y-%m-%d %H:%M')}")
                    st.write(f"Last Modified: {persona.modified_at.strftime('%Y-%m-%d %H:%M')}")
    
    # Chat interface at the bottom
    st.markdown("---")
    st.session_state.chat_interface.render()

if __name__ == "__main__":
    main()
