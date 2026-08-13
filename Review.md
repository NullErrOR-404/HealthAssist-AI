# HealthAssist AI - Technical Review Document

## 1. Problem Statement
The digital healthcare landscape is deeply fragmented. Users interact with disjointed systems for storing medical records, analyzing symptoms, and finding localized medical care. Existing AI health assistants are passive text-generators—they lack the architectural authority to read a user's isolated medical records, execute real-time local facility searches, or autonomously update a user's dynamic health profile during a conversation.

## 2. Solution (The Architectural Differentiator)
HealthAssist AI is not a chatbot; it is a **secure, Agentic AI ecosystem**. We engineered a unified platform where a central LLM acts as an autonomous agent equipped with functional backend tools. It securely reads from an encrypted Data Vault, dynamically updates PostgreSQL tables based on user conversation, and executes complex external API requests (like geospatial querying) to provide an all-in-one, hyper-personalized medical companion.

---

## 3. Tech Stack & Advanced Integrations

Our architecture was intentionally designed to outperform existing niche health AIs by focusing on absolute uptime, strict data isolation, and agentic capabilities:

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Zustand (Global State Management).
- **Backend:** Python, FastAPI, deployed as zero-config Serverless Functions on Vercel.
- **Database & Storage:** Supabase (PostgreSQL), Supabase Auth, Supabase Buckets.
- **Primary AI Engine:** Google Gemini 2.0 Flash (via `google-genai` SDK) utilizing native Tool/Function Calling.

### 🔥 Advanced Integrations (What Makes Us Stand Out)
1. **Agentic Tool Calling:** Instead of just generating text, the AI evaluates intent and triggers Python backend functions. If a user says *"Where's a pharmacy?"*, the LLM invokes the `find_nearby_doctors_tool`, forcing the backend to execute an Overpass API query.
2. **Multi-Tier LLM Fallback:** To ensure 100% conversational uptime, the backend utilizes a try/except routing mechanism. If the primary Gemini engine fails or rate-limits, the request is seamlessly piped through an `AsyncOpenAI` instance connected to a secondary FreeLLM API.
3. **Triple-Layer Geolocation Fallback:** Real-time routing is critical in medical emergencies. If the browser's native `navigator.geolocation` is denied or times out, our `locationStore` falls back through a strict cascade of 3 separate IP-based geolocation APIs (GeoJS -> FreeIPAPI -> ipapi.co).
4. **Cryptographic Data Isolation (RLS):** Medical data demands enterprise-grade security. We implemented strict Row Level Security (RLS) on PostgreSQL. Even if the backend API is completely compromised, the database physically prevents cross-tenant data leakage.

---

## 4. Execution Flow of the Program

The application relies on a strictly typed, unidirectional data flow:

1. **Authentication & Initialization:**
   - User authenticates via Supabase (or enters via mock-session Guest Mode).
   - Zustand stores hydrate the frontend with JWTs and encrypted user metadata.
2. **Agentic Processing Loop (Chat Flow):**
   - User submits a query via the Chat UI.
   - Frontend serializes the query and the user's localized Context (Vitals, Chronic Conditions) into a `ChatRequest` payload.
   - The FastAPI backend validates the JWT and injects the payload into the LLM context window.
   - **Decision Matrix:** The LLM evaluates if it needs external data. If yes, it yields a `FunctionCall`. 
   - The backend halts the stream, executes the requested Python tool (e.g., querying the Overpass map database), appends the raw JSON result to the prompt, and resumes the LLM stream.
3. **Storage & Vault Retrieval Flow:**
   - User uploads a prescription (PDF/Image) via the Vault module.
   - The file is chunked and streamed directly to a private Supabase Storage Bucket.
   - The generated secure URL is logged in the `documents` table, mapped strictly to the user's UUID via RLS.

---

## 5. Comprehensive Module Breakdown

1. **AI Chat Engine (The Orchestrator)**
   - Manages prompt engineering, system instructions (enforcing medical safety bounds), and tool-call execution routing. 
2. **Secure Health Vault**
   - An isolated file management interface for medical records, prescriptions, and lab reports, utilizing signed URLs for access.
3. **Proximity Maps (Geospatial Routing)**
   - dynamically calculates proximity to hospitals, clinics, and pharmacies by injecting user coordinates into OpenStreetMap (Overpass API) queries. 
   - **Technical note:** Employs `application/x-www-form-urlencoded` POST requests to bypass complex CORS preflight issues inherent to Overpass GET queries.
4. **Profile & Vitals System**
   - A reactive CRUD module tracking height, weight, blood type, chronic conditions, and medications, synchronized globally via Zustand.
5. **Disease Library & Medical Glossary**
   - A high-speed, indexed UI component providing structured definitions and immediate context for complex medical terminologies.
6. **Guest Mode & Access Control**
   - A frictionless entry pipeline that utilizes an ephemeral mock-session, allowing users to experience the AI capabilities completely anonymously while intentionally locking down the Data Vault and Profile mutation endpoints.
