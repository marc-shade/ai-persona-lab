# AI Persona Lab

<img src="https://github.com/user-attachments/assets/64e969c8-e8bc-45ee-a858-1bf19b37998b" style="width: 300px;" align="right" />A powerful AI-driven application for creating and managing dynamic personas, enabling interactive group chats with AI personalities powered by Ollama.

**Key Features**

- **Dynamic Persona Generation**: Create detailed AI personas with unique backgrounds, personalities, and skills
- **Customizable Models**: Choose different Ollama models for each persona (mistral, llama2, etc.)
- **Advanced Settings**: Fine-tune temperature and token settings per persona
- **Interactive Group Chat**: Engage in conversations with multiple AI personas simultaneously
- **Persona Management**: Add tags, notes, and customize settings for each persona

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
persona-lab/
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
