import os
import json
import re
import math
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import requests
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    prompt: str
    sort_by: str = "total_ratings"  # can be 'total_ratings', 'rating', or 'price_level'

def parse_prompt_with_gemini(prompt):
    system_message = (
        "Extract the following fields from the user request and return ONLY a valid JSON object with these keys: "
        "dish, max_budget, people, time, location, max_distance_km. "
        "If a field is missing, use null. If multiple locations are mentioned (like 'between X and Y'), set 'location' as a list of those locations. "
        "Do not include any explanation, only output the JSON object. "
        "Example: {\"dish\": \"pizza\", \"max_budget\": 15, \"people\": 2, \"time\": \"8pm\", \"location\": [\"Whitefield\", \"Indiranagar\"], \"max_distance_km\": null}"
    )
    full_prompt = f"{system_message}\nUser request: {prompt}"
    response = model.generate_content(full_prompt)
    raw_response = response.text
    print("RAW LLM RESPONSE:", raw_response)
    try:
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            if parsed.get("location") and isinstance(parsed["location"], str) and " and " in parsed["location"]:
                parsed["location"] = [loc.strip() for loc in parsed["location"].split(" and ")]
            return parsed
        return fallback_parsing(prompt)
    except Exception as e:
        print(f"Error parsing: {e}")
        return fallback_parsing(prompt)

def fallback_parsing(prompt):
    result = {"dish": None, "max_budget": None, "people": None, "time": None, "location": None, "max_distance_km": None}
    prompt_lower = prompt.lower()
    for dish in ["pizza", "burger", "sushi", "coffee"]:
        if dish in prompt_lower:
            result["dish"] = dish
            break
    budget_match = re.search(r'(?:under|less than)\s*\$?(\d+)', prompt_lower)
    if budget_match:
        result["max_budget"] = int(budget_match.group(1))
    people_match = re.search(r'(\d+)\s*people', prompt_lower)
    if people_match:
        result["people"] = int(people_match.group(1))
    time_match = re.search(r'(?:at|around|by)\s*(\d+(?::\d+)?\s*[ap]m?)', prompt_lower)
    if time_match:
        result["time"] = time_match.group(1)
    between_match = re.search(r'between\s+([\w\s]+)\s+and\s+([\w\s]+)', prompt_lower)
    if between_match:
        locations = [between_match.group(1).strip(), between_match.group(2).strip()]
        result["location"] = locations
    else:
        loc_match = re.findall(r'(?:in|near|at|around)\s+([\w\s]+?)(?:,|$)', prompt_lower)
        if loc_match:
            result["location"] = [loc.strip() for loc in loc_match]
    return result

def geocode_location(location):
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": location, "key": GOOGLE_API_KEY}
    response = requests.get(url, params=params)
    resp_json = response.json()
    if resp_json.get("status") == "OK" and resp_json.get("results"):
        loc = resp_json["results"][0]["geometry"]["location"]
        return loc["lat"], loc["lng"]
    return None, None

def calculate_midpoint(locations):
    coords = []
    location_details = []
    for loc in locations:
        lat, lng = geocode_location(loc)
        if lat is not None and lng is not None:
            coords.append((lat, lng))
            location_details.append({"name": loc, "lat": lat, "lng": lng})
    if not coords:
        return None, []
    avg_lat = sum(lat for lat, _ in coords) / len(coords)
    avg_lng = sum(lng for _, lng in coords) / len(coords)
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"latlng": f"{avg_lat},{avg_lng}", "key": GOOGLE_API_KEY}
    response = requests.get(url, params=params)
    resp_json = response.json()
    midpoint_address = None
    if resp_json.get("status") == "OK" and resp_json.get("results"):
        midpoint_address = resp_json["results"][0]["formatted_address"]
    midpoint_info = {"address": midpoint_address, "lat": avg_lat, "lng": avg_lng}
    for loc in location_details:
        distance = haversine_distance(loc["lat"], loc["lng"], avg_lat, avg_lng)
        loc["distance_to_midpoint"] = distance
    return midpoint_info, location_details

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def search_restaurants_with_google(dish, lat, lng, radius_km=2):
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"{dish} restaurant",
        "location": f"{lat},{lng}",
        "radius": int(radius_km) * 1000,
        "key": GOOGLE_API_KEY
    }
    response = requests.get(url, params=params)
    return response.json().get("results", [])

def get_place_details(place_id):
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,geometry,formatted_phone_number,website,opening_hours,photos,reviews,price_level,rating,user_ratings_total",
        "key": GOOGLE_API_KEY
    }
    response = requests.get(url, params=params)
    return response.json().get("result", {})

def format_restaurant_response(restaurant_data, midpoint_info=None, original_locations=None):
    address = restaurant_data.get("formatted_address", "")
    maps_link = f"https://www.google.com/maps/search/?api=1&query={address.replace(' ', '+')}&query_place_id={restaurant_data.get('place_id', '')}"
    photos = []
    for photo in restaurant_data.get("photos", [])[:5]:
        if photo.get("photo_reference"):
            photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo.get('photo_reference')}&key={GOOGLE_API_KEY}"
            photos.append(photo_url)
    reviews = []
    for review in restaurant_data.get("reviews", [])[:3]:
        reviews.append({
            "author_name": review.get("author_name", "Anonymous"),
            "rating": review.get("rating", 0),
            "text": review.get("text", ""),
            "time": review.get("relative_time_description", "")
        })
    opening_hours = None
    if "opening_hours" in restaurant_data:
        opening_hours = {
            "open_now": restaurant_data["opening_hours"].get("open_now"),
            "weekday_text": restaurant_data["opening_hours"].get("weekday_text", [])
        }
    price_level = restaurant_data.get("price_level")
    approx_price = None
    if price_level is not None:
        if price_level == 1:
            approx_price = "Under $10 per person"
        elif price_level == 2:
            approx_price = "$11-$30 per person"
        elif price_level == 3:
            approx_price = "$31-$60 per person"
        elif price_level == 4:
            approx_price = "Over $60 per person"
    socials = {}
    website = restaurant_data.get("website")
    if website:
        socials = {
            "website": website,
            "instagram": f"https://www.instagram.com/search?q={restaurant_data.get('name', '').replace(' ', '')}" if restaurant_data.get('name') else None,
            "facebook": f"https://www.facebook.com/search?q={restaurant_data.get('name', '').replace(' ', '')}" if restaurant_data.get('name') else None
        }
    reservation_link = f"{website}/reservations" if website else None
    menu_link = f"{website}/menu" if website else None
    restaurant_lat = restaurant_data.get("geometry", {}).get("location", {}).get("lat")
    restaurant_lng = restaurant_data.get("geometry", {}).get("location", {}).get("lng")
    distance_info = {}
    if midpoint_info and restaurant_lat and restaurant_lng:
        distance_from_midpoint = haversine_distance(
            midpoint_info["lat"], midpoint_info["lng"],
            restaurant_lat, restaurant_lng
        )
        distance_info["from_midpoint"] = f"{distance_from_midpoint:.2f} km"
    if original_locations and restaurant_lat and restaurant_lng:
        location_distances = {}
        for loc in original_locations:
            distance = haversine_distance(
                loc["lat"], loc["lng"],
                restaurant_lat, restaurant_lng
            )
            location_distances[loc["name"]] = f"{distance:.2f} km"
        distance_info["from_locations"] = location_distances
    return {
        "name": restaurant_data.get("name"),
        "address": address,
        "maps_link": maps_link,
        "price_level": price_level,
        "approx_price": approx_price,
        "rating": restaurant_data.get("rating"),
        "total_ratings": restaurant_data.get("user_ratings_total"),
        "opening_hours": opening_hours,
        "phone_number": restaurant_data.get("formatted_phone_number"),
        "website": website,
        "socials": socials,
        "photos": photos,
        "reviews": reviews,
        "reservation_link": reservation_link,
        "menu_link": menu_link,
        "distances": distance_info
    }

@app.post("/search")
def search_restaurants(query: Query):
    parsed = parse_prompt_with_gemini(query.prompt)
    print("Parsed prompt:", parsed)
    restaurants = []
    midpoint_info = None
    original_locations = []
    locations = []

    if parsed.get("location"):
        locations = parsed["location"] if isinstance(parsed["location"], list) else [parsed["location"]]

    if len(locations) > 1:
        midpoint_info, original_locations = calculate_midpoint(locations)
    elif len(locations) == 1:
        search_location = locations[0]
        lat, lng = geocode_location(search_location)
        if lat and lng:
            midpoint_info = {"address": search_location, "lat": lat, "lng": lng}
            original_locations = [{"name": search_location, "lat": lat, "lng": lng, "distance_to_midpoint": 0}]

    if midpoint_info:
        dish = parsed.get("dish") or "restaurant"
        raw_restaurants = search_restaurants_with_google(
            dish,
            midpoint_info["lat"],
            midpoint_info["lng"],
            parsed.get("max_distance_km") or 2
        )
        for r in raw_restaurants:
            place_id = r.get("place_id")
            if place_id:
                details = get_place_details(place_id)
                restaurants.append(format_restaurant_response(
                    {**r, **details}, midpoint_info, original_locations
                ))
            else:
                restaurants.append(format_restaurant_response(
                    r, midpoint_info, original_locations
                ))

    # Apply sorting
    sort_key = query.sort_by.lower()
    if sort_key in ["rating", "price_level", "total_ratings", "reviews"]:
        restaurants.sort(key=lambda r: r.get(sort_key, 0) or 0, reverse=True)

    return {
        "parsed_prompt": parsed,
        "midpoint": midpoint_info,
        "original_locations": original_locations,
        "restaurants": restaurants
    }

@app.get("/")
def read_root():
    return {"message": "Restaurant Search API with midpoint calculations is running!"}
