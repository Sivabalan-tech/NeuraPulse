# NeuraPulse AI - Personal Healthcare Companion

NeuraPulse AI is a comprehensive, personal healthcare companion application designed to help users track their wellness, manage appointments, and get AI-powered health insights.

## 🚀 Features

- **AI-Powered Chat**: Interact with NeuraPulse, a compassionate AI healthcare companion powered by Google Gemini.
- **RAG (Retrieval-Augmented Generation)**: The chatbot uses a verified medical knowledge base to provide more accurate and context-aware responses.
- **Health Dashboard**: Visualize your health trends including sleep, energy, and mood using interactive charts.
- **Wellness Forecast**: Predictive AI engine that analyzes your recent health logs to forecast tomorrow's wellness and detect potential risks.
- **Appointment Management**: 
    - **Users**: Book appointments with specialists (Cardiologists, Neurologists, etc.).
    - **Admins**: Manage, approve, or reject pending appointments.
- **Medication Tracking**: Log and track your medications and dosages.
- **Sensor Integration**: Simulate real-time sensor data like heart rate and vitals.
- **Health Reports**: Generate and export professional PDF health reports for your doctor.
- **Notification System**: Stay updated with real-time notifications for appointment approvals and status changes.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI / Radix UI
- **Icons**: Lucide React
- **Charts**: Recharts
- **PDF Generation**: jsPDF

### Backend
- **Framework**: Flask (Python)
- **Database**: MongoDB (PyMongo)
- **AI Model**: Google Gemini Flash
- **Vector Store**: FAISS (for RAG)
- **Embeddings**: Google Generative AI Embeddings
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt password hashing

## ⚙️ Setup Instructions

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a `.env` file and add your credentials:
   ```env
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_google_ai_key
   ```
4. Change directory
    ```bash
    cd backend
    ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   python app.py
   ```

### Frontend Setup
1. Navigate to the root directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `src/`: React frontend source code.
  - `components/`: Reusable UI components.
  - `pages/`: Main application pages.
  - `lib/`: API client and utility wrappers.
  - `utils/`: Logic for prediction engine and sentiment analysis.
- `backend/`: Flask backend source code.
  - `routes/`: API endpoint definitions (Auth, Appointments, Chat, etc.).
  - `data/`: Medical knowledge base for RAG.
  - `rag_utils.py`: Logic for vector store and document retrieval.

## 📝 Disclaimer
NeuraPulse AI is an educational tool. All medical advice provided by the AI is for informational purposes only and should not be used as a professional diagnosis. Always consult with a qualified healthcare professional for medical advice.
