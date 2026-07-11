# 🌍 EduLingo AI Agent

AI-powered multilingual learning assistant built using **Python Flask**, **IBM watsonx.ai**, **IBM Granite Models**, and **Retrieval-Augmented Generation (RAG)**.

The application enables students to upload academic documents and receive intelligent translations, summaries, explanations, quizzes, and document-based AI chat while preserving educational context and technical accuracy.

---

# Features

| Feature | Description |
|---------|-------------|
| 🌐 Multi-language Translation | Translate academic documents into multiple regional languages |
| 📄 PDF Upload | Upload PDF documents for AI-powered processing |
| 📝 AI Summarization | Generate concise summaries from uploaded documents |
| 💡 Content Explanation | Simplify difficult concepts for better understanding |
| 🎯 Quiz Generation | Automatically generate quizzes from uploaded content |
| 🤖 AI Chat | Ask questions about uploaded documents using RAG |
| 📚 History Management | Store previous translations, summaries, quizzes and AI chats |
| ⚡ IBM Granite Models | High-quality language understanding and reasoning |
| 🔍 Retrieval-Augmented Generation (RAG) | Retrieves document context before generating responses |
| 📱 Responsive Interface | Clean web interface accessible on desktop and mobile |

---

# Project Structure

```text
EduLingo-AI-Agent/
│
├── app.py                     # Flask backend
├── README.md
├── requirements.txt
├── .gitignore
│
├── templates/
│   └── index.html             # Main user interface
│
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│
├── uploads/                   # Uploaded academic documents
├── translated/                # Generated translated documents
│
├── check_import.py
├── inspect_sdk.py
├── _test_upload.py
├── _test_translate.py
├── _test_summarize.py
├── _test_explain.py
└── _test_persistence.py
```

---

# Quick Start

## 1. Clone Repository

```bash
git clone https://github.com/tejaswiii1818/EduLingo-AI-Agent.git

cd EduLingo-AI-Agent
```

---

## 2. Create Virtual Environment

```bash
python -m venv venv
```

Windows

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
source venv/bin/activate
```

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Configure Environment Variables

Create a **.env** file and add:

```env
WATSONX_API_KEY=your_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-3-8b-instruct
```

---

## 5. Run the Application

```bash
python app.py
```

Open

```
http://localhost:5000
```

---

# IBM Technologies Used

| Technology | Purpose |
|------------|---------|
| IBM watsonx.ai | AI model platform |
| IBM Granite Models | Translation, summarization, explanation, quiz generation and AI chat |
| IBM Cloud Lite | Cloud services |
| Retrieval-Augmented Generation (RAG) | Context-aware document question answering |
| Python Flask | Backend development |
| HTML, CSS, JavaScript | Frontend development |

---

# Application Workflow

1. Upload an academic document.
2. Extract text from the uploaded file.
3. Store document content for retrieval.
4. Retrieve relevant document chunks using RAG.
5. IBM Granite Model processes the retrieved context.
6. Generate:
   - Translation
   - Summary
   - Explanation
   - Quiz
   - AI Chat responses
7. Store outputs in History.
8. Display results through the web interface.

---

# API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/upload | Upload document |
| POST | /api/translate | Translate document |
| POST | /api/summarize | Generate summary |
| POST | /api/explain | Explain document |
| POST | /api/quiz | Generate quiz |
| POST | /api/chat | Document-based AI chat |
| GET | /api/history | Retrieve previous activities |

---

# Security Features

- Environment variables for IBM credentials
- Secure API communication
- File upload validation
- Prompt engineering for controlled responses
- Retrieval-Augmented Generation (RAG) for accurate responses

---

# Future Enhancements

- Voice-based interaction
- OCR support for scanned PDFs
- PowerPoint and Word document support
- Personalized learning recommendations
- Cloud deployment on IBM Cloud

---

# License
Educational project focused on improving multilingual learning through AI-powered translation, summarization, explanation, quiz generation, and document-based question answering using IBM watsonx.ai and IBM Granite Models.
