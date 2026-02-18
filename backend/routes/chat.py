from flask import Blueprint, request, jsonify, Response
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
    MAX_HISTORY = 5
    SYSTEM_INSTRUCTION = """You are NeuraPulse, a personal healthcare companion. 
    Your goal is to be helpful, compassionate, and informative about health and wellness.
    
    CRITICAL INSTRUCTIONS FOR GREETINGS:
    - **DO NOT** repeat "I am NeuraPulse" or introductions if you have already greeted the user in the conversation history.
    - If the user asks a follow-up question, just answer directly.
    - Only introduce yourself if it is the very first message of the conversation.

    CRITICAL INSTRUCTIONS FOR RESPONSE FORMAT:
    - **NO BOLDING**: Do not use double asterisks (**) or single asterisks (*) for bolding or emphasis.
    - **BE CONCISE**: Keep answers short and to the point. Avoid fluff.
    - **USE HYPHENS FOR LISTS**: Format lists and steps with hyphens (-) rather than asterisks.
    - **NO LONG PARAGRAPHS**: Break text into short, readable chunks.
    - **NO DISCLAIMERS**: Do not add "I am an AI, not a doctor" or any medical disclaimers at the end of your response.

    Guidelines:
    1. If a user describes symptoms, suggest potential causes and simple home remedies.
    2. Suggest Over-The-Counter (OTC) medications if appropriate, but ALWAYS advise consulting a doctor.
    3. Use a calm, reassuring tone like NeuraPulse.
    """
    
    model = genai.GenerativeModel('models/gemini-flash-latest')
else:
    model = None

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('', methods=['POST'])
def chat():
    data = request.json
    messages = data.get('messages', [])
    
    # Extract the last user message
    user_message = next((m['content'] for m in reversed(messages) if m['role'] == 'user'), "")
    
    if not model:
        return jsonify({"error": "Gemini API Key not configured"}), 500
        
    def generate():
        try:
            # Convert frontend messages to Gemini history format
            # Format: [{'role': 'user', 'parts': ['msg']}, {'role': 'model', 'parts': ['msg']}]
            gemini_history = []
            
            # Skip the last message as it will be sent as the new prompt
            # Also, filter out any system messages if they exist in frontend (though usually not)
            # Limit history to MAX_HISTORY * 2 (user + model pairs)
            
            history_messages = messages[:-1] # All except last
            
            for msg in history_messages[-MAX_HISTORY*2:]:
                role = 'user' if msg['role'] == 'user' else 'model'
                gemini_history.append({
                    'role': role,
                    'parts': [msg['content']]
                })

            # Create chat session with history
            chat = model.start_chat(history=gemini_history)
            
            # Prepend system instruction to the message content for context if history is empty
            # If history exists, instruction is implicit in the persona, but we can remind if needed
            # For robust system instruction, usually it's better to pass it as the first 'user' part or use system_instruction param (if available)
            # Here we just prepend it to the current prompt to ensure adherence
            
            # Retrieve RAG Context
            from rag_utils import retrieve_context
            context = retrieve_context(user_message)
            
            rag_instruction = ""
            if context:
                rag_instruction = f"\n\nContext from Knowledge Base:\n{context}\n\nUse this context to answer if relevant."

            full_prompt = f"{SYSTEM_INSTRUCTION}{rag_instruction}\n\nUser Question: {user_message}"
            
            response = chat.send_message(full_prompt, stream=True)
            
            for chunk in response:
                if chunk.text:
                    # Format as SSE data
                    token = json.dumps({'choices': [{'delta': {'content': chunk.text}}]})
                    yield f"data: {token}\n\n"
            
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"Chat Error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(generate(), mimetype='text/event-stream')
