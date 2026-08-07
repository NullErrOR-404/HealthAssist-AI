import os
import logging
import base64
import io
from typing import List, Optional
from pypdf import PdfReader
import httpx
from fastapi import FastAPI, Request, HTTPException, Depends, UploadFile, File, Form
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
    api_key=os.getenv("FREELLMAPI_KEY", "dummy_key_to_prevent_startup_crash"),
    base_url=os.getenv("FREELLMAPI_BASE_URL", "http://127.0.0.1:31415/v1")
)

# Initialize Supabase Client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service role for backend operations
supabase: Client = create_client(supabase_url, supabase_key)

# Guest Rate Limiting
GUEST_USAGE = {}
MAX_GUEST_ATTEMPTS = 3

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    token = auth_header.split(" ")[1]
    
    if token == "mock-token":
        ip = get_remote_address(request)
        usage = GUEST_USAGE.get(ip, 0)
        if usage >= MAX_GUEST_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Guest rate limit exceeded (max 3 attempts). Please sign up for an account.")
        GUEST_USAGE[ip] = usage + 1
        return "guest-user-123"
        
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# --- Models ---
class ChatRequest(BaseModel):
    message: str
    llm_engine: Optional[str] = 'fast'
    file_data: Optional[str] = None
    file_mime_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

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
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    blood_type: Optional[str] = None
    smoking_status: Optional[str] = None
    emergency_contact: Optional[str] = None
    primary_physician: Optional[str] = None
    chronic_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []
    family_history: Optional[List[str]] = []
    has_completed_onboarding: Optional[bool] = None

class VitalRecord(BaseModel):
    metric_type: str
    value: str
    unit: Optional[str] = None

class MedicationRecord(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    active: Optional[bool] = True

def get_user_profile(user_id: str):
    try:
        response = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return None

def update_user_profile_tool(
    name: str = None, age: int = None, sex: str = None, height: str = None, weight: str = None, 
    blood_type: str = None, smoking_status: str = None, emergency_contact: str = None, primary_physician: str = None,
    chronic_conditions: list[str] = None, allergies: list[str] = None, current_medications: list[str] = None, family_history: list[str] = None
):
    """
    """
    Updates the user's health profile in the database. Call this tool when the user mentions their name, age, sex, height, weight, blood type, smoking status, emergency contact, primary physician, chronic conditions, allergies, current medications, or family history in conversation.
    """
    pass

def find_nearby_doctors_tool(specialty: str):
    """
    Locates doctors or specialists matching the requested medical specialty near the user's location.
    Call this tool when the user's symptoms require medical attention, or if they explicitly ask for a doctor.
    """
    pass

def log_vital_sign_tool(metric_type: str, value: str, unit: str = None):
    """
    Logs a vital sign (e.g. blood_pressure, heart_rate, weight, blood_sugar) when the user reports it.
    metric_type should be formatted exactly as one of: blood_pressure, heart_rate, weight, blood_sugar.
    """
    pass

def add_medication_tool(name: str, dosage: str = None, frequency: str = None):
    """
    Adds a new medication to the user's active medication list when they report taking a new medication.
    """
    pass

def search_vault_tool(query: str):
    """
    Searches the user's uploaded medical documents (lab results, X-rays, etc.) for information.
    Call this tool when the user asks a question about their past medical history or test results that might be in their uploaded documents.
    """
    pass

def execute_profile_update(user_id: str, kwargs: dict):
    try:
        current_profile = get_user_profile(user_id) or {}
        
        updates = {"user_id": user_id}
        for key in ["name", "age", "sex", "height", "weight", "blood_type", "smoking_status", "emergency_contact", "primary_physician"]:
            if key in kwargs and kwargs[key] is not None:
                updates[key] = kwargs[key]
        
        for key in ["chronic_conditions", "allergies", "current_medications", "family_history"]:
            if key in kwargs and kwargs[key] is not None:
                existing = current_profile.get(key) or []
                updates[key] = list(set(existing + kwargs[key]))

        response = supabase.table("profiles").upsert(updates, on_conflict="user_id").execute()
        return {"status": "success", "message": "Profile updated successfully.", "updated_fields": updates}
    except Exception as e:
        logger.error(f"Error updating profile tool: {e}")
        return {"status": "error", "message": str(e)}

def execute_doctor_search(specialty: str, latitude: float, longitude: float):
    import random
    try:
        if not latitude or not longitude:
            return {"status": "error", "message": "Location not provided by the user."}

        # Overpass API query for doctors (highly generic since OSM is sparse with specialties)
        query = f\"\"\"
        [out:json];
        (
          node["amenity"="doctors"](around:5000, {latitude}, {longitude});
          node["healthcare"="doctor"](around:5000, {latitude}, {longitude});
        );
        out tags;
        \"\"\"
        
        response = httpx.post("https://overpass-api.de/api/interpreter", data=query, timeout=10.0)
        data = response.json()
        
        results = []
        if data.get("elements"):
            for element in data["elements"]:
                tags = element.get("tags", {})
                name = tags.get("name")
                if not name: continue
                # Basic check if it matches specialty (often empty in OSM, so we include generic clinics too)
                spec = tags.get("healthcare:speciality", "").lower()
                if specialty.lower() in spec or spec == "":
                    address = f"{tags.get('addr:street', '')} {tags.get('addr:city', '')}".strip()
                    phone = tags.get("phone", "Contact info unavailable")
                    results.append({"name": name, "specialty": spec or "General/Unspecified", "address": address or "Address unavailable", "phone": phone})
                    if len(results) >= 5: break
        
        # Fallback Mock Data if OSM returns nothing useful for the demo
        if not results:
            mock_names = ["Dr. Smith", "Dr. Patel", "Dr. Garcia", "Dr. Lee"]
            results.append({
                "name": f"{random.choice(mock_names)} ({specialty.title()} Clinic)",
                "specialty": specialty.title(),
                "address": "123 Medical Center Drive, Suite 100",
                "phone": "555-019-3842"
            })
            
        return {"status": "success", "results": results}
    except Exception as e:
        logger.error(f"Error finding doctors: {e}")
        return {"status": "error", "message": str(e)}

def execute_vital_log(user_id: str, metric_type: str, value: str, unit: str = None):
    try:
        data = {
            "user_id": user_id,
            "metric_type": metric_type,
            "value": value,
            "unit": unit
        }
        supabase.table("vitals").insert(data).execute()
        return {"status": "success", "message": f"Logged {metric_type} successfully."}
    except Exception as e:
        logger.error(f"Error logging vital: {e}")
        return {"status": "error", "message": str(e)}

def execute_add_medication(user_id: str, name: str, dosage: str = None, frequency: str = None):
    try:
        data = {
            "user_id": user_id,
            "name": name,
            "dosage": dosage,
            "frequency": frequency,
            "active": True
        }
        supabase.table("medications").insert(data).execute()
        return {"status": "success", "message": f"Added medication {name} successfully."}
    except Exception as e:
        logger.error(f"Error adding medication: {e}")
        return {"status": "error", "message": str(e)}

def execute_search_vault(user_id: str, query: str):
    try:
        # Simplistic keyword search across document summaries and filenames for the demo
        response = supabase.table("documents").select("*").eq("user_id", user_id).execute()
        if not response.data:
            return {"status": "success", "results": "No documents found in the vault."}
            
        results = []
        q = query.lower()
        for doc in response.data:
            if q in doc.get("file_name", "").lower() or q in doc.get("summary", "").lower():
                results.append(f"Document: {doc['file_name']}, Summary: {doc['summary']}")
        
        if not results:
             return {"status": "success", "results": f"No specific matches found for '{query}', but here are the available documents: " + ", ".join([d['file_name'] for d in response.data])}
        
        return {"status": "success", "results": results}
    except Exception as e:
        logger.error(f"Error searching vault: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/profile")
def get_profile(user_id: str = Depends(get_current_user)):
    profile = get_user_profile(user_id)
    if not profile:
        # Create empty profile
        supabase.table("profiles").insert({"user_id": user_id}).execute()
        return {"user_id": user_id, "age": None, "sex": None, "weight": None, "chronic_conditions": [], "allergies": []}
    return profile

@app.post("/api/profile")
def update_profile(profile: ProfileData, user_id: str = Depends(get_current_user)):
    updates = {"user_id": user_id, **profile.model_dump(exclude_unset=True)}
    try:
        response = supabase.table("profiles").upsert(updates, on_conflict="user_id").execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vitals")
def get_vitals(user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("vitals").select("*").eq("user_id", user_id).order("recorded_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vitals")
def add_vital(vital: VitalRecord, user_id: str = Depends(get_current_user)):
    try:
        data = {"user_id": user_id, **vital.model_dump(exclude_unset=True)}
        response = supabase.table("vitals").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/medications")
def get_medications(user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("medications").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/medications")
def add_medication(med: MedicationRecord, user_id: str = Depends(get_current_user)):
    try:
        data = {"user_id": user_id, **med.model_dump(exclude_unset=True)}
        response = supabase.table("medications").insert(data).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vault/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    try:
        file_bytes = await file.read()
        file_name = file.filename
        file_type = file.content_type
        
        summary = "No summary generated."
        try:
            chat = gemini_client.chats.create(model='gemini-2.0-flash')
            if file_type == 'application/pdf':
                reader = PdfReader(io.BytesIO(file_bytes))
                text = ""
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted: text += extracted + "\n"
                response = chat.send_message(f"Summarize this medical document concisely in 1-2 sentences: {text}")
                summary = response.text
            elif file_type.startswith('image/'):
                part = types.Part.from_bytes(data=file_bytes, mime_type=file_type)
                response = chat.send_message([part, "Summarize this medical document concisely in 1-2 sentences."])
                summary = response.text
        except Exception as ai_e:
            logger.warning(f"Failed to generate AI summary: {ai_e}")
            
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        file_path = f"{user_id}/{unique_id}_{file_name}"
        
        supabase.storage.from_("vault").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": file_type, "upsert": "true"}
        )
        
        doc_data = {
            "user_id": user_id,
            "file_name": file_name,
            "storage_path": file_path,
            "file_type": file_type,
            "summary": summary
        }
        response = supabase.table("documents").insert(doc_data).execute()
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vault")
def get_documents(user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("documents").select("*").eq("user_id", user_id).order("uploaded_at", desc=True).execute()
        docs = response.data
        for doc in docs:
            url_res = supabase.storage.from_("vault").create_signed_url(doc["storage_path"], 3600)
            # The Supabase python client returns {"signedURL": "..."} or similar
            doc["url"] = url_res.get("signedURL") or url_res.get("signedUrl")
        return docs
    except Exception as e:
        logger.error(f"Get vault error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile/onboarding-status")
def get_onboarding_status(user_id: str = Depends(get_current_user)):
    profile = get_user_profile(user_id)
    if not profile:
        return {"hasCompletedOnboarding": False}
    return {"hasCompletedOnboarding": profile.get("has_completed_onboarding", False) or False}

@app.post("/api/profile/complete-onboarding")
def complete_onboarding(user_id: str = Depends(get_current_user)):
    try:
        supabase.table("profiles").upsert(
            {"user_id": user_id, "has_completed_onboarding": True},
            on_conflict="user_id"
        ).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
@limiter.limit("5/minute")
async def chat_endpoint(request: Request, body: ChatRequest, user_id: str = Depends(get_current_user)):
    user_message = body.message
    llm_engine = body.llm_engine
    
    profile = get_user_profile(user_id)
    system_instruction = """You are HealthAssist AI, a highly advanced Clinical Copilot and Detective. 
CRITICAL RULES FOR RESPONDING:
1. For EDUCATIONAL questions: Be extremely concise. Use a mix of short paragraphs and bullet points. Use generous vertical spacing.
2. For CLINICAL or DIAGNOSTIC questions: Act like a Clinical Detective. Offer a VERY brief initial thought, but immediately pivot to asking 1 or 2 highly targeted follow-up questions (interrogation style) to narrow down the diagnosis. REFUSE to give a final differential diagnosis until you have enough clinical context from the user."""

    if profile:
        system_instruction += f"\n\nUser Profile Context: Name: {profile.get('name') or 'Unknown'}, Age: {profile.get('age') or 'Unknown'}, Sex: {profile.get('sex') or 'Unknown'}, Height: {profile.get('height') or 'Unknown'}, Weight: {profile.get('weight') or 'Unknown'}, Blood Type: {profile.get('blood_type') or 'Unknown'}, Smoking Status: {profile.get('smoking_status') or 'Unknown'}, Emergency Contact: {profile.get('emergency_contact') or 'Unknown'}, Primary Physician: {profile.get('primary_physician') or 'Unknown'}, Chronic Conditions: {', '.join(profile.get('chronic_conditions') or []) or 'None'}, Allergies: {', '.join(profile.get('allergies') or []) or 'None'}, Medications: {', '.join(profile.get('current_medications') or []) or 'None'}, Family History: {', '.join(profile.get('family_history') or []) or 'None'}."
    
    system_instruction += "\nIf the user mentions any new profile info (name, age, sex, height, weight, blood type, conditions, allergies, medications, etc.), use the update_user_profile_tool to silently save it."
    system_instruction += "\nIf the user mentions taking a measurement (e.g. blood pressure, heart rate), use the log_vital_sign_tool to save it."
    system_instruction += "\nIf the user mentions taking a new medicine, use the add_medication_tool to save it to their active medications."
    system_instruction += "\nIf the user's symptoms require medical attention, or if they explicitly ask for a doctor, IMMEDIATELY call the find_nearby_doctors_tool with the required specialty to find local doctors, and present their contact details to the user."
    system_instruction += "\nIf the user asks a question about their past medical history, test results, or uploaded documents, use the search_vault_tool to retrieve the information from their Document Vault."

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
                tools=[update_user_profile_tool, find_nearby_doctors_tool, log_vital_sign_tool, add_medication_tool, search_vault_tool]
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
                    result = execute_profile_update(user_id, call.args)
                    response = chat.send_message(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_function_response(
                                name="update_user_profile_tool",
                                response=result
                            )]
                        )
                    )
                elif call.name == "find_nearby_doctors_tool":
                    result = execute_doctor_search(
                        specialty=call.args.get("specialty"), 
                        latitude=body.latitude, 
                        longitude=body.longitude
                    )
                    response = chat.send_message(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_function_response(
                                name="find_nearby_doctors_tool",
                                response=result
                            )]
                        )
                    )
                elif call.name == "log_vital_sign_tool":
                    result = execute_vital_log(
                        user_id=user_id,
                        metric_type=call.args.get("metric_type"),
                        value=call.args.get("value"),
                        unit=call.args.get("unit")
                    )
                    response = chat.send_message(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_function_response(
                                name="log_vital_sign_tool",
                                response=result
                            )]
                        )
                    )
                elif call.name == "add_medication_tool":
                    result = execute_add_medication(
                        user_id=user_id,
                        name=call.args.get("name"),
                        dosage=call.args.get("dosage"),
                        frequency=call.args.get("frequency")
                    )
                    response = chat.send_message(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_function_response(
                                name="add_medication_tool",
                                response=result
                            )]
                        )
                    )
                elif call.name == "search_vault_tool":
                    result = execute_search_vault(
                        user_id=user_id,
                        query=call.args.get("query")
                    )
                    response = chat.send_message(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_function_response(
                                name="search_vault_tool",
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

@app.post("/api/disease-library")
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

@app.post("/api/drug-info")
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

@app.post("/api/drug-interactions")
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

@app.post("/api/anatomy-atlas")
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

@app.post("/api/clinical-case")
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

@app.post("/api/flashcards")
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

