[![Version](https://img.shields.io/github/v/release/marc-shade/ai-persona-lab?style=flat-square)](https://github.com/marc-shade/ai-persona-lab/releases)
[![Stars](https://img.shields.io/github/stars/marc-shade/ai-persona-lab?style=flat-square)](https://github.com/marc-shade/ai-persona-lab/stargazers)
[![Forks](https://img.shields.io/github/forks/marc-shade/ai-persona-lab?style=flat-square)](https://github.com/marc-shade/ai-persona-lab/network/members)
[![License](https://img.shields.io/github/license/marc-shade/ai-persona-lab?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)](https://streamlit.io)
[![Ollama](https://img.shields.io/badge/Ollama-000000?style=flat-square&logo=ollama&logoColor=white)](https://ollama.ai)

# AI Persona Lab

<img src="https://github.com/user-attachments/assets/64e969c8-e8bc-45ee-a858-1bf19b37998b" style="width: 300px;" align="right" />A powerful AI-driven application for creating and managing dynamic personas, enabling interactive group chats with AI personalities powered by Ollama.

## Features

- **Dynamic Persona Generation**: Create detailed AI personas with unique backgrounds, personalities, and skills
- **Customizable Models**: Choose different Ollama models for each persona (mistral, llama2, etc.)
- **Smart Model Selection**: Automatically prefers instruction-tuned models for better responses
- **Advanced Settings**: Fine-tune temperature and token settings per persona
- **Interactive Group Chat**: Engage in conversations with multiple AI personas simultaneously
- **Persona Management**: Add tags, notes, and customize settings for each persona
- **Delete Personas**: Remove personas you no longer need with confirmation warning
- **Clear Chat History**: One-click button to clear conversation history
- **User-Friendly Errors**: Helpful error messages when Ollama is unavailable or models are missing

![Screenshot 2024-12-02 at 9 36 52 AM (4)](https://github.com/user-attachments/assets/ae521600-3631-4c0c-9d7d-5c9dba61cdd3)

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
   - Delete personas via the "Danger Zone" section

4. Chat Interface:
   - Select which personas to include in the conversation
   - Start conversations with natural language
   - Watch personas interact based on their unique characteristics
   - Each persona maintains context and personality throughout the chat
   - Use "Clear Chat" to start fresh conversations

## Project Structure

```
ai-persona-lab/
├── app.py              # Main Streamlit application and UI
├── models/
│   └── persona.py      # Persona class and management logic
├── chat/
│   └── interface.py    # Chat interface and message handling
├── data/               # Storage for personas and chat history
├── requirements.txt    # Python dependencies
└── README.md          # Documentation
```

## Configuration

### Default Settings
- Ollama API URL: `http://localhost:11434/api`
- Default Model: Auto-selects best available (prefers instruction-tuned models)
- Temperature: `0.7`
- Max Tokens: `1000`
- Avatar Size: `200x200`

### Model Settings
Each persona can be configured with:
- Any Ollama model
- Temperature (0.0 to 1.0)
- Max tokens (50 to 2000)
- Custom system prompts via notes

### Data Storage
- Personas are automatically saved to `data/personas.json`
- Settings saved to `data/settings.json`
- Chat history is maintained during the session
- All changes are persisted immediately

## Troubleshooting

Common issues and solutions:

1. **Ollama Connection Error**
   - Ensure Ollama server is running (`ollama serve`)
   - Check if the API URL is accessible (`http://localhost:11434/api`)
   - Verify firewall settings
   - The app will show: *"Ollama is not running. Please start Ollama with `ollama serve`"*

2. **Model Not Found**
   - Pull the model explicitly: `ollama pull mistral:instruct`
   - Check available models: `ollama list`
   - Update persona model settings if needed
   - The app will show: *"Model 'X' not found. Please update the model in persona settings"*

3. **Response Timeout**
   - The model may be busy processing other requests
   - Try again or use a smaller/faster model
   - The app will show: *"Response timed out. The model may be busy or overloaded"*

4. **UI Issues**
   - Clear browser cache
   - Restart Streamlit server
   - Check console for JavaScript errors

## Contributing

Contributions are welcome! Please:

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
