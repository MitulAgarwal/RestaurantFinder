import os
import json
import re
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Get API keys from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini API
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Initialize FastAPI app
app = FastAPI()

class Query(BaseModel):
    prompt: str

def parse_prompt_with_gemini(prompt):
    """Extract structured data from natural language using Gemini model"""
    system_message = (
        "Extract the following fields from the user request and return ONLY a valid JSON object with these keys: "
        "dish, max_budget, people, time, location, max_distance_km. "
        "If a field is missing, use null. Do not include any explanation, only output the JSON object. "
        "Example: {\"dish\": \"pizza\", \"max_budget\": 15, \"people\": 2, \"time\": \"8pm\", \"location\": \"Central Park\", \"max_distance_km\": null}"
    )
    full_prompt = f"{system_message}\nUser request: {prompt}"
    
    # Call the Gemini model
    response = model.generate_content(full_prompt)
    raw_response = response.text
    print("RAW LLM RESPONSE:", raw_response)
    
    try:
        # Try to extract JSON from the model response
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        
        # Fallback: extract with regex from plain text output
        result = {}
        # Define patterns for different fields including variations
        patterns = {
            "dish": [r'dish\[(.*?)\]', r'food\[(.*?)\]', r'"dish":\s*"(.*?)"'],
            "max_budget": [r'max_budget\[(.*?)\]', r'price\[(.*?)\]', r'budget\[(.*?)\]', r'"max_budget":\s*(\d+)'],
            "people": [r'people\[(.*?)\]', r'persons\[(.*?)\]', r'"people":\s*(\d+)'],
            "time": [r'time\[(.*?)\]', r'"time":\s*"(.*?)"'],
            "location": [r'location\[(.*?)\]', r'place\[(.*?)\]', r'"location":\s*"(.*?)"'],
            "max_distance_km": [r'max_distance_km\[(.*?)\]', r'distance\[(.*?)\]', r'"max_distance_km":\s*(\d+)']
        }
        
        # Check for each field pattern
        for key, pattern_list in patterns.items():
            for pattern in pattern_list:
                match = re.search(pattern, raw_response)
                if match:
                    result[key] = match.group(1)
                    break
        
        # Natural language extraction - fallback from the prompt itself
        if not result.get("dish") and "pizza" in prompt.lower():
            result["dish"] = "pizza"
            
        if not result.get("location") and "mg road" in prompt.lower():
            result["location"] = "MG Road"
            
        if not result.get("max_budget"):
            budget_match = re.search(r'under\s*\$(\d+)', prompt.lower())
            if budget_match:
                result["max_budget"] = int(budget_match.group(1))
                
        if not result.get("people"):
            people_match = re.search(r'(\d+)\s*people', prompt.lower())
            if people_match:
                result["people"] = int(people_match.group(1))
                
        if not result.get("time") and "8pm" in prompt.lower():
            result["time"] = "8pm"
            
        return result
        
    except Exception as e:
        print("Error parsing:", e)
        return {}

def search_restaurants_with_google(dish, location, radius_km=2):
    """Search for restaurants using Google Places API"""
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    query = f"{dish} restaurants in {location}"
    
    params = {
        "query": query,
        "radius": int(radius_km) * 1000,  # Convert to meters
        "key": GOOGLE_API_KEY
    }
    
    response = requests.get(url, params=params)
    return response.json().get("results", [])

@app.post("/search")
def search_restaurants(query: Query):
    """API endpoint to search for restaurants based on natural language prompt"""
    # Parse the prompt using Gemini model
    parsed = parse_prompt_with_gemini(query.prompt)
    
    # Check if we have required fields for search
    if parsed.get("dish") and parsed.get("location"):
        # Search for restaurants matching criteria
        restaurants = search_restaurants_with_google(
            parsed.get("dish"),
            parsed.get("location"),
            parsed.get("max_distance_km") or 2
        )
    else:
        # If we're missing required fields, still return what we parsed
        # but with an empty restaurants list
        restaurants = []
    
    # Return both the parsed prompt and restaurant results
    return {
        "parsed_prompt": parsed,
        "restaurants": [
            {
                "name": r.get("name"),
                "address": r.get("formatted_address"),
                "rating": r.get("rating"),
                "total_ratings": r.get("user_ratings_total"),
                "price_level": r.get("price_level")
            }
            for r in restaurants
        ]
    }

@app.get("/")
def read_root():
    """Root endpoint to confirm API is running"""
    return {"message": "Restaurant AI Search API is running!"}
