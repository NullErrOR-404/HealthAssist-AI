import os
import logging
import base64
import io
from typing import List, Optional
from pypdf import PdfReader
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client

# Rate Limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# AI Clients
from google import genai
from google.genai import types
from google.genai.errors import APIError
from openai import AsyncOpenAI

# Load environment variables
load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="HealthAssist AI Backend",
    description="Backend API for HealthAssist AI handling LLM logic and Supabase secure interactions.",
    version="1.0.0"
)

# Setup Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Clients
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

fallback_client = AsyncOpenAI(
    api_key=os.getenv("FREELLMAPI_KEY"),
    base_url=os.getenv("FREELLMAPI_BASE_URL", "http://127.0.0.1:31415/v1")
)

# Initialize Supabase Client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service role for backend operations
supabase: Client = create_client(supabase_url, supabase_key)

# Global Mock User ID (until auth is implemented)
MOCK_USER_ID = "demo-user-123"

# --- Models ---
class ChatRequest(BaseModel):
    message: str
    llm_engine: Optional[str] = 'fast'
    file_data: Optional[str] = None
    file_mime_type: Optional[str] = None

class DiseaseSearchRequest(BaseModel):
    disease: str

class DrugSearchRequest(BaseModel):
    drug: str

class DrugInteractionRequest(BaseModel):
    drugs: List[str]

class AnatomyRequest(BaseModel):
    structure: str

class ClinicalCaseRequest(BaseModel):
    specialty: str = 'General Medicine'

class FlashcardRequest(BaseModel):
    topic: str

class ProfileData(BaseModel):
    age: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[str] = None
    chronic_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    has_completed_onboarding: Optional[bool] = None

def get_user_profile(user_id: str):
    try:
        response = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return None

def update_user_profile_tool(age: int = None, sex: str = None, weight: str = None, chronic_conditions: list[str] = None, allergies: list[str] = None):
    """
    Updates the user's health profile in the database. Call this tool when the user mentions their age, sex, weight, chronic conditions, or allergies in conversation.
    """
    try:
        current_profile = get_user_profile(MOCK_USER_ID) or {}
        
        updates = {"user_id": MOCK_USER_ID}
        if age is not None: updates["age"] = age
        if sex is not None: updates["sex"] = sex
        if weight is not None: updates["weight"] = weight
        if chronic_conditions is not None: 
            existing = current_profile.get("chronic_conditions") or []
            updates["chronic_conditions"] = list(set(existing + chronic_conditions))
        if allergies is not None:
            existing = current_profile.get("allergies") or []
            updates["allergies"] = list(set(existing + allergies))

        response = supabase.table("profiles").upsert(updates, on_conflict="user_id").execute()
        return {"status": "success", "message": "Profile updated successfully.", "updated_fields": updates}
    except Exception as e:
        logger.error(f"Error updating profile tool: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/profile")
def get_profile():
    profile = get_user_profile(MOCK_USER_ID)
    if not profile:
        # Create empty profile
        supabase.table("profiles").insert({"user_id": MOCK_USER_ID}).execute()
        return {"user_id": MOCK_USER_ID, "age": None, "sex": None, "weight": None, "chronic_conditions": [], "allergies": []}
    return profile

@app.post("/profile")
def update_profile(profile: ProfileData):
    updates = {"user_id": MOCK_USER_ID, **profile.model_dump(exclude_unset=True)}
    try:
        response = supabase.table("profiles").upsert(updates, on_conflict="user_id").execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/profile/onboarding-status")
def get_onboarding_status():
    profile = get_user_profile(MOCK_USER_ID)
    if not profile:
        return {"hasCompletedOnboarding": False}
    return {"hasCompletedOnboarding": profile.get("has_completed_onboarding", False) or False}

@app.post("/profile/complete-onboarding")
def complete_onboarding():
    try:
        supabase.table("profiles").upsert(
            {"user_id": MOCK_USER_ID, "has_completed_onboarding": True},
            on_conflict="user_id"
        ).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
@limiter.limit("5/minute")
async def chat_endpoint(request: Request, body: ChatRequest):
    user_message = body.message
    llm_engine = body.llm_engine
    
    profile = get_user_profile(MOCK_USER_ID)
    system_instruction = """You are HealthAssist AI, a highly advanced Clinical Copilot and Detective. 
CRITICAL RULES FOR RESPONDING:
1. For EDUCATIONAL questions: Be extremely concise. Use a mix of short paragraphs and bullet points. Use generous vertical spacing.
2. For CLINICAL or DIAGNOSTIC questions: Act like a Clinical Detective. Offer a VERY brief initial thought, but immediately pivot to asking 1 or 2 highly targeted follow-up questions (interrogation style) to narrow down the diagnosis. REFUSE to give a final differential diagnosis until you have enough clinical context from the user."""

    if profile:
        system_instruction += f"\n\nUser Profile Context: Age: {profile.get('age') or 'Unknown'}, Sex: {profile.get('sex') or 'Unknown'}, Weight: {profile.get('weight') or 'Unknown'}, Chronic Conditions: {', '.join(profile.get('chronic_conditions') or []) or 'None'}, Allergies: {', '.join(profile.get('allergies') or []) or 'None'}."
    
    system_instruction += "\nIf the user mentions any new profile info (age, sex, weight, conditions, allergies), use the update_user_profile_tool to silently save it."

    file_content = None
    if body.file_data and body.file_mime_type:
        try:
            file_bytes = base64.b64decode(body.file_data)
            if body.file_mime_type == 'application/pdf':
                reader = PdfReader(io.BytesIO(file_bytes))
                pdf_text = ""
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        pdf_text += text + "\n"
                file_content = {"type": "pdf", "text": pdf_text, "bytes": file_bytes, "mime": body.file_mime_type}
            elif body.file_mime_type.startswith('image/'):
                file_content = {"type": "image", "bytes": file_bytes, "mime": body.file_mime_type, "base64": body.file_data}
        except Exception as e:
            logger.error(f"Error parsing file: {e}")
            raise HTTPException(status_code=400, detail="Invalid file data")

    try:
        # Construct fallback message format
        fallback_user_content = [{"type": "text", "text": user_message}]
        if file_content:
            if file_content["type"] == "pdf":
                fallback_user_content[0]["text"] += f"\n\n[Attached Document Text]:\n{file_content['text']}"
            elif file_content["type"] == "image":
                fallback_user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{file_content['mime']};base64,{file_content['base64']}"}
                })

        # If user explicitly requested deep analysis, route to fallback (or Pro model if available)
        if llm_engine == 'deep':
            logger.info("Deep Analysis requested, routing to FreeLLMAPI...")
            fallback_response = await fallback_client.chat.completions.create(
                model="auto",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": fallback_user_content if len(fallback_user_content) > 1 or file_content else user_message}
                ]
            )
            return {
                "response": fallback_response.choices[0].message.content, 
                "provider": "freellmapi (deep)"
            }

        logger.info("Attempting primary LLM (Gemini Fast)...")
        chat = gemini_client.chats.create(
            model='gemini-2.0-flash',
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[update_user_profile_tool]
            )
        )
        
        gemini_parts = [user_message]
        if file_content:
            gemini_parts.append(
                types.Part.from_bytes(data=file_content["bytes"], mime_type=file_content["mime"])
            )

        response = chat.send_message(gemini_parts)
        
        if response.function_calls:
            for call in response.function_calls:
                if call.name == "update_user_profile_tool":
                    result = update_user_profile_tool(**call.args)
                    response = chat.send_message(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_function_response(
                                name="update_user_profile_tool",
                                response=result
                            )]
                        )
                    )
        
        return {"response": response.text, "provider": "gemini"}

    except APIError as e:
        logger.warning(f"Gemini API Error (Code: {e.code}): {e.message}")
        if e.code == 429:
            try:
                fallback_response = await fallback_client.chat.completions.create(
                    model="auto",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": fallback_user_content if len(fallback_user_content) > 1 or file_content else user_message}
                    ]
                )
                return {
                    "response": fallback_response.choices[0].message.content, 
                    "provider": "freellmapi"
                }
            except Exception as fallback_err:
                raise HTTPException(status_code=503, detail="All AI systems unavailable.")
        else:
            raise HTTPException(status_code=500, detail="An error occurred with the AI system.")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

async def generate_with_fallback(system_instruction: str, user_message: str) -> str:
    try:
        chat = gemini_client.chats.create(
            model='gemini-2.0-flash',
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        response = chat.send_message(user_message)
        return response.text
    except APIError as e:
        logger.warning(f"Gemini API Error (Code: {e.code}): {e.message}")
        if e.code == 429:
            try:
                fallback_response = await fallback_client.chat.completions.create(
                    model="auto",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_message}
                    ]
                )
                return fallback_response.choices[0].message.content
            except Exception as fallback_err:
                logger.error(f"Fallback FreeLLM API failed: {fallback_err}")
                raise HTTPException(status_code=503, detail="All AI systems unavailable (Rate limited).")
        else:
            raise HTTPException(status_code=500, detail="AI provider error.")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/disease-library")
@limiter.limit("5/minute")
async def disease_library_endpoint(request: Request, body: DiseaseSearchRequest):
    disease = body.disease
    
    system_instruction = """You are a highly advanced Medical Research Librarian. 
Your task is to generate a structured, academic study guide and syllabus for a given disease or medical condition.
Your audience consists of medical students, research analysts, and trainee doctors.
Format your output in clean Markdown with the following strict sections:
# [Disease Name]
## 1. Overview & Pathophysiology
## 2. Clinical Presentation (Symptoms)
## 3. Diagnostics & Biomarkers
## 4. Treatment Protocols
## 5. Key Research & Literature
Be rigorous, concise, and academically accurate. Do not include introductory fluff.
CRITICAL FORMATTING INSTRUCTION: Use a beautiful mix of short, readable paragraphs and heavily favor bulleted lists for data-dense information (like symptoms, biomarkers, protocols). Use generous spacing."""

    try:
        logger.info(f"Generating Disease Library entry for: {disease}")
        
        # Fetch from Wikipedia API
        wiki_title = disease.replace(" ", "_")
        wiki_summary = ""
        wiki_image_url = ""
        try:
            async with httpx.AsyncClient() as client:
                wiki_res = await client.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_title}", timeout=5.0)
                if wiki_res.status_code == 200:
                    wiki_data = wiki_res.json()
                    wiki_summary = wiki_data.get("extract", "")
                    if "originalimage" in wiki_data:
                        wiki_image_url = wiki_data["originalimage"].get("source", "")
                    elif "thumbnail" in wiki_data:
                        wiki_image_url = wiki_data["thumbnail"].get("source", "")
        except Exception as e:
            logger.warning(f"Failed to fetch from Wikipedia: {e}")

        if wiki_summary:
            system_instruction += f"\n\nHere is verified background information from Wikipedia to ground your response:\n{wiki_summary}"

        response_text = await generate_with_fallback(system_instruction, f"Generate a study guide for: {disease}")
        
        # Inject the image markdown safely below the first Header (if it exists)
        if wiki_image_url:
            image_md = f"![{disease} Clinical Image]({wiki_image_url})\n"
            if response_text.strip().startswith("# "):
                lines = response_text.split('\n')
                lines.insert(1, "\n" + image_md)
                response_text = "\n".join(lines)
            else:
                response_text = image_md + "\n" + response_text

        return {"response": response_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/drug-info")
@limiter.limit("5/minute")
async def drug_info_endpoint(request: Request, body: DrugSearchRequest):
    drug = body.drug
    system_instruction = """You are a clinical pharmacologist. Your task is to generate a structured clinical profile for the requested medication or drug.
Format your output in clean Markdown with the following strict sections:
# [Drug Name]
## 1. Mechanism of Action & Drug Class
## 2. Indications & Clinical Uses
## 3. Common Dosages & Administration
## 4. Side Effects & Adverse Reactions
## 5. Contraindications & Monitoring
Be highly rigorous, concise, and clinically accurate.
CRITICAL FORMATTING INSTRUCTION: Use a beautiful mix of short, readable paragraphs and heavily favor bulleted lists for data-dense information (like side effects, dosages, monitoring). Use generous spacing."""

    try:
        logger.info(f"Generating Drug Info entry for: {drug}")
        
        # Fetch from Wikipedia API
        wiki_title = drug.replace(" ", "_")
        wiki_summary = ""
        wiki_image_url = ""
        try:
            async with httpx.AsyncClient() as client:
                wiki_res = await client.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_title}", timeout=5.0)
                if wiki_res.status_code == 200:
                    wiki_data = wiki_res.json()
                    wiki_summary = wiki_data.get("extract", "")
                    if "originalimage" in wiki_data:
                        wiki_image_url = wiki_data["originalimage"].get("source", "")
                    elif "thumbnail" in wiki_data:
                        wiki_image_url = wiki_data["thumbnail"].get("source", "")
        except Exception as e:
            logger.warning(f"Failed to fetch from Wikipedia: {e}")

        # Fallback to PubChem for image if Wikipedia didn't provide one
        if not wiki_image_url:
            pubchem_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{drug}/PNG"
            try:
                async with httpx.AsyncClient() as client:
                    pubchem_res = await client.head(pubchem_url, timeout=5.0)
                    if pubchem_res.status_code == 200:
                        wiki_image_url = pubchem_url
            except Exception as e:
                logger.warning(f"Failed to check PubChem fallback: {e}")

        if wiki_summary:
            system_instruction += f"\n\nHere is verified background information from Wikipedia to ground your response:\n{wiki_summary}"

        response_text = await generate_with_fallback(system_instruction, f"Generate a clinical profile for: {drug}")
        
        # Inject the image markdown safely below the first Header (if it exists)
        if wiki_image_url:
            image_md = f"![{drug} Molecule/Pill]({wiki_image_url})\n"
            if response_text.strip().startswith("# "):
                lines = response_text.split('\n')
                lines.insert(1, "\n" + image_md)
                response_text = "\n".join(lines)
            else:
                response_text = image_md + "\n" + response_text

        return {"response": response_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/drug-interactions")
@limiter.limit("5/minute")
async def drug_interactions_endpoint(request: Request, body: DrugInteractionRequest):
    drugs = body.drugs
    system_instruction = """You are a clinical pharmacology expert. Analyze the following list of medications for potential drug-drug interactions.
For each interaction found, report:
- **Severity** (Minor / Moderate / Major / Contraindicated)
- **Mechanism** of interaction
- **Clinical Effect** on the patient
- **Recommendation** (dose adjustment, monitoring, avoid combination)
Format your output as clean Markdown. If no interactions are found, state that clearly."""
    try:
        logger.info(f"Checking drug interactions for: {drugs}")
        response_text = await generate_with_fallback(system_instruction, f"Check interactions between these medications: {', '.join(drugs)}")
        return {"response": response_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/anatomy-atlas")
@limiter.limit("5/minute")
async def anatomy_atlas_endpoint(request: Request, body: AnatomyRequest):
    structure = body.structure
    system_instruction = """You are an expert anatomy and physiology professor. Generate a comprehensive structural breakdown for the given body system or organ.
Include these sections in Markdown:
# [Structure Name]
## 1. Gross Anatomy & Location
## 2. Microscopic Structure (Histology)
## 3. Blood Supply & Innervation
## 4. Physiological Function
## 5. Clinical Correlations (common pathologies)
Be concise, rigorous, and suitable for medical students."""
    try:
        logger.info(f"Generating anatomy breakdown for: {structure}")
        response_text = await generate_with_fallback(system_instruction, f"Generate an anatomical breakdown for: {structure}")
        return {"response": response_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/clinical-case")
@limiter.limit("5/minute")
async def clinical_case_endpoint(request: Request, body: ClinicalCaseRequest):
    specialty = body.specialty
    system_instruction = f"""You are a medical education expert specializing in {specialty}. Generate a realistic clinical case scenario for medical students to practice differential diagnosis.
Format in Markdown with these sections:
# Clinical Case: [Brief Title]
## Patient Presentation
## History of Present Illness
## Past Medical History
## Vital Signs & Physical Examination
## Laboratory & Imaging Results
## Questions for the Student
1. What is your differential diagnosis? (list 3-5)
2. What is the most likely diagnosis and why?
3. What additional workup would you order?
4. What is the initial management plan?
## Answer Key (hidden below a horizontal rule)
---
Provide detailed answers to each question."""
    try:
        logger.info(f"Generating clinical case for: {specialty}")
        response_text = await generate_with_fallback(system_instruction, f"Generate a clinical case in {specialty}")
        return {"response": response_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@app.post("/flashcards")
@limiter.limit("5/minute")
async def flashcards_endpoint(request: Request, body: FlashcardRequest):
    topic = body.topic
    system_instruction = """You are a medical education flashcard generator. Generate exactly 10 high-yield study flashcards for the given medical topic.
Return your response as a valid JSON array of objects, each with "question" and "answer" keys.
Example format:
[{"question": "What is the most common cause of X?", "answer": "Y is the most common cause..."}]
Do NOT include any text before or after the JSON array. Return ONLY the JSON."""
    try:
        logger.info(f"Generating flashcards for: {topic}")
        response_text = await generate_with_fallback(system_instruction, f"Generate 10 flashcards for: {topic}")
        return {"response": response_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

