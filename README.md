# AI Persona Lab

<img src="https://github.com/user-attachments/assets/64e969c8-e8bc-45ee-a858-1bf19b37998b" style="width: 300px;" align="right" />A powerful AI-driven application for creating and managing dynamic personas, enabling interactive group chats with AI personalities powered by Ollama.

**Key Features**

- **Dynamic Persona Generation**: Create detailed AI personas with unique backgrounds, personalities, and skills
- **Customizable Models**: Choose different Ollama models for each persona (mistral, llama2, etc.)
- **Advanced Settings**: Fine-tune temperature and token settings per persona
- **Interactive Group Chat**: Engage in conversations with multiple AI personas simultaneously
- **Persona Management**: Add tags, notes, and customize settings for each persona
- **In-Context Learning (ICL)**: Advanced learning system that overcomes traditional LLM limitations
- **Persistent Memory**: Long-term context retention across conversations
- **Knowledge Graph**: Relationship mapping between personas, topics, and concepts
- **Adaptive Learning**: Continuous improvement from persona interactions and feedback
- **Confidence Scoring**: Intelligent fallback strategies for reliable responses

![Screenshot 2024-12-02 at 9 36 52 AM (4)](https://github.com/user-attachments/assets/ae521600-3631-4c0c-9d7d-5c9dba61cdd3)

## Requirements

- Python 3.8+
- [Ollama](https://ollama.ai/) server running locally
- Required Python packages (see `requirements.txt`)

## Installation

1. Install Ollama following the instructions at [ollama.ai](https://ollama.ai)

2. Clone the repository:
   ```bash
   git clone https://github.com/marc-shade/ai-persona-lab.git
   cd ai-persona-lab
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start Ollama server and pull required models:
   ```bash
   ollama serve  # Start the Ollama server
   ollama pull mistral:instruct  # Pull the default model
   ```

## Usage

1. Start the application:
   ```bash
   streamlit run app.py
   ```

2. Create Personas:
   - Use the quick generate buttons or custom input for new personas
   - Edit persona details in the expandable sections
   - Customize model settings and parameters
   - Add tags and notes for better organization

3. Manage Personas:
   - Edit any persona attribute through the UI
   - Add/remove tags and update notes
   - Customize model settings per persona
   - Toggle personas active/inactive in chat

4. Chat Interface:
   - Select which personas to include in the conversation
   - Start conversations with natural language
   - Watch personas interact based on their unique characteristics
   - Each persona maintains context and personality throughout the chat

## Project Structure

```
ai-persona-lab/
├── app.py                      # Main Streamlit application and UI
├── models/
│   └── persona.py              # Persona class and management logic
├── chat/
│   └── interface.py            # Chat interface and message handling
├── icl_components/             # In-Context Learning components
│   ├── memory_system.py        # Persistent memory with embeddings
│   ├── learning_pipeline.py    # General learning and adaptation
│   ├── persona_learning_pipeline.py  # Persona-specific learning
│   ├── scoring_engine.py       # Response quality scoring
│   ├── prompt_templates.py     # Adaptive prompt optimization
│   ├── knowledge_graph.py      # Entity relationship management
│   ├── persona_knowledge_graph.py    # Persona relationship graph
│   └── confidence_scorer.py    # Confidence scoring and fallbacks
├── icl_orchestrator.py         # Central ICL coordinator
├── icl_integration.py          # ICL system integration helpers
├── icl_config.py              # ICL configuration management
├── config/
│   └── icl_config.json        # ICL system configuration
├── data/                      # Storage for personas and ICL data
├── requirements.txt           # Python dependencies
├── AGENTS.md                  # Agentic tooling documentation
└── README.md                  # Main documentation
```

## Configuration

### Default Settings
- Ollama API URL: `http://localhost:11434/api`
- Default Model: `mistral:instruct`
- Temperature: `0.7`
- Max Tokens: `500`
- Avatar Size: `200x200`

### Model Settings
Each persona can be configured with:
- Any Ollama model
- Temperature (0.0 to 1.0)
- Max tokens (50 to 2000)
- Custom system prompts via notes

### Data Storage
- Personas are automatically saved to `data/personas.json`
- Chat history is maintained during the session
- All changes are persisted immediately

## In-Context Learning (ICL) System

The ICL system addresses fundamental limitations of traditional LLMs by providing true learning capabilities beyond simple pattern matching. Based on research from paper 2509.10414, our implementation includes:

### ICL Components

- **Memory System**: Persistent embeddings-based memory using sentence-transformers
- **Learning Pipelines**: Dual reinforcement learning for general and persona-specific improvements
- **Knowledge Graphs**: NetworkX-powered relationship mapping between personas and concepts
- **Confidence Scoring**: Intelligent fallback strategies with circuit breaker patterns
- **Adaptive Templates**: A/B tested prompt optimization with performance tracking

### ICL Configuration

Edit `config/icl_config.json` to customize:
- Memory retention settings
- Learning rates and batch sizes
- Confidence thresholds
- Knowledge graph parameters
- Template optimization frequency

### Using ICL Features

```python
from icl_integration import get_icl_integration

# Get ICL integration instance
icl = get_icl_integration()

# Enhance persona generation
enhancement = icl.enhance_persona_generation(
    occupation="Data Scientist",
    existing_personas=current_personas
)

# Improve chat responses
improvement = icl.improve_chat_response(
    persona=persona_obj,
    user_message="Tell me about AI",
    conversation_context=context
)

# Analyze conversations
analysis = icl.analyze_conversation(
    messages=chat_messages,
    personas=active_personas
)
```

## Troubleshooting

Common issues and solutions:

1. **Ollama Connection Error**
   - Ensure Ollama server is running (`ollama serve`)
   - Check if the API URL is accessible (`http://localhost:11434/api`)
   - Verify firewall settings

2. **Model Loading Issues**
   - Pull the model explicitly: `ollama pull mistral:instruct`
   - Check available models: `ollama list`
   - Ensure sufficient disk space

3. **UI Issues**
   - Clear browser cache
   - Restart Streamlit server
   - Check console for JavaScript errors

## Contributing

Contributions are welcome! Before you start, review `AGENTS.md` for the repository guidelines and agentic tooling notes. Then:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Ollama](https://ollama.ai/) for the amazing local LLM server
- [Streamlit](https://streamlit.io/) for the powerful UI framework
- The open-source AI community
