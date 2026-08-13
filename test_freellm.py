import os
import asyncio
from openai import AsyncOpenAI

async def main():
    client = AsyncOpenAI(
        api_key='freellmapi-2267101cd793b2478acdd25621a02d3d03af406d26917b22', 
        base_url='http://127.0.0.1:31415/v1'
    )
    response = await client.chat.completions.create(
        model='auto', 
        messages=[{'role': 'user', 'content': 'Hello from FreeLLM test!'}]
    )
    print("SUCCESS: " + response.choices[0].message.content)

asyncio.run(main())
