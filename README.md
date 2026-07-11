\# EduLingo AI Agent



\## Overview



EduLingo AI Agent is an AI-powered multilingual learning assistant developed using Python, Flask, IBM watsonx.ai, IBM Granite Models, and Retrieval-Augmented Generation (RAG). The application enables students to upload academic documents and receive intelligent translations, summaries, explanations, quizzes, and document-based question answering while preserving educational context and technical accuracy.



\---



\## Features



\* Multi-language translation of academic documents

\* PDF document upload and processing

\* AI-powered document summarization

\* Simplified content explanation

\* Automatic quiz generation from uploaded documents

\* AI Chat using Retrieval-Augmented Generation (RAG)

\* Document-based question answering

\* History management for previous translations, summaries, explanations, quizzes, and chats

\* Responsive and user-friendly web interface



\---



\## Technologies Used



\* Python

\* Flask

\* IBM watsonx.ai

\* IBM Granite Models

\* HTML5

\* CSS3

\* JavaScript

\* Bootstrap

\* Retrieval-Augmented Generation (RAG)

\* PyMuPDF

\* Python-dotenv



\---



\## Project Structure



```text

EduLingo-AI-Agent/

│

├── app.py

├── requirements.txt

├── .env

├── .gitignore

├── templates/

├── static/

│   ├── css/

│   ├── js/

│   └── uploads/

├── uploads/

├── translated/

└── README.md

```



\---



\## Modules



\### Translate



Translate academic documents into multiple regional languages while preserving educational context.



\### Summarize



Generate concise summaries and highlight important concepts from uploaded documents.



\### Explain



Provide simple explanations for difficult academic topics to improve understanding.



\### Quiz Generator



Automatically generate multiple-choice questions based on uploaded learning material.



\### AI Chat (RAG)



Answer user questions by retrieving relevant information from uploaded documents.



\### History



Store previous translations, summaries, explanations, quizzes, and AI chat sessions for future reference.



\---



\## IBM Technologies



\* IBM watsonx.ai

\* IBM Granite Foundation Models

\* Retrieval-Augmented Generation (RAG)



\---



\## How to Run



\### Clone the Repository



```bash

git clone https://github.com/tejaswiii1818/EduLingo-AI-Agent.git

cd EduLingo-AI-Agent

```



\### Create Virtual Environment



```bash

python -m venv venv

venv\\Scripts\\activate

```



\### Install Dependencies



```bash

pip install -r requirements.txt

```



\### Configure Environment Variables



Create a `.env` file and add:



```text

WATSONX\_API\_KEY=

WATSONX\_PROJECT\_ID=

WATSONX\_URL=https://us-south.ml.cloud.ibm.com

WATSONX\_MODEL\_ID=ibm/granite-3-3-8b-instruct

FLASK\_SECRET\_KEY=

```



\### Run the Application



```bash

python app.py

```



Open your browser:



```

http://localhost:5000

```



\---



\## Future Enhancements



\* Voice-based document interaction

\* OCR support for handwritten notes

\* Support for DOCX and PPT files

\* Personalized learning recommendations

\* Cloud deployment



\---



\## Developed By



\*\*Medipally Tejaswini\*\*



B.Tech – Information Technology



Institute of Aeronautical Engineering



\---



\## License



This project is developed for educational and academic purposes.

