import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Global Vector Store
vector_store = None

def initialize_rag():
    global vector_store
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("RAG Error: GEMINI_API_KEY not found.")
            return

        # Initialize Embeddings
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)

        # Load Document
        file_path = os.path.join(os.path.dirname(__file__), 'data', 'medical_guidelines.txt')
        if not os.path.exists(file_path):
            print(f"RAG Error: File not found at {file_path}")
            return

        loader = TextLoader(file_path, encoding='utf-8')
        documents = loader.load()

        # Split Text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)

        # Create Vector Store
        vector_store = FAISS.from_documents(chunks, embeddings)
        print("RAG: Vector store initialized successfully.")

    except Exception as e:
        print(f"RAG Initialization Error: {e}")

def retrieve_context(query):
    global vector_store
    if not vector_store:
        return ""
    
    try:
        # Retrieve top 3 relevant chunks
        docs = vector_store.similarity_search(query, k=3)
        context = "\n\n".join([doc.page_content for doc in docs])
        return context
    except Exception as e:
        print(f"RAG Retrieval Error: {e}")
        return ""
