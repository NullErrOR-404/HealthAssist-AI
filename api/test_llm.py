import os
from dotenv import load_dotenv
from google import genai
from openai import OpenAI

# Load the environment variables from the .env file we just set up
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FREELLMAPI_KEY = os.getenv("FREELLMAPI_KEY")
FREELLMAPI_BASE_URL = os.getenv("FREELLMAPI_BASE_URL", "http://127.0.0.1:31415/v1")

def call_gemini(prompt: str):
    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=prompt,
    )
    return response.text

def call_freellmapi(prompt: str):
    # Uses the OpenAI SDK but points the router URL to FreeLLMAPI
    client = OpenAI(
        api_key=FREELLMAPI_KEY,
        base_url=FREELLMAPI_BASE_URL
    )
    response = client.chat.completions.create(
        model="auto", # FreeLLMAPI auto-router
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def ask_healthassist_ai(prompt: str, simulate_gemini_failure=False):
    print("--------------------------------------------------")
    print("Attempting to use Primary LLM: Google Gemini...")
    
    if simulate_gemini_failure:
        print("[!] Simulating Gemini Quota Exceeded (HTTP 429 Resource Exhausted)...")
        gemini_success = False
    else:
        try:
            res = call_gemini(prompt)
            print("[SUCCESS] Gemini Response SUCCESS!")
            return res
        except Exception as e:
            print(f"[ERROR] Gemini failed with error: {e}")
            gemini_success = False
            
    # Fallback Logic triggered if Gemini fails
    if not gemini_success:
        print("[!] Falling back to Secondary LLM Router: FreeLLMAPI...")
        try:
            res = call_freellmapi(prompt)
            print("[SUCCESS] FreeLLMAPI Response SUCCESS!")
            return res
        except Exception as e:
            print(f"[ERROR] FreeLLMAPI also failed with error: {e}")
            return "Critical Error: All LLMs are down."

if __name__ == "__main__":
    test_prompt = "Reply strictly with: 'Hello from [Your Model Name]!'"
    
    print("=== TEST 1: Normal Execution (Gemini Should Win) ===")
    print("Response:", ask_healthassist_ai(test_prompt, simulate_gemini_failure=False))
    
    print("\n=== TEST 2: Quota Exceeded Execution (FreeLLMAPI Should Catch) ===")
    print("Response:", ask_healthassist_ai(test_prompt, simulate_gemini_failure=True))
