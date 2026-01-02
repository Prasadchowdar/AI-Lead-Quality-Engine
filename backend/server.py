from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, time as dt_time
import csv
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

TARGET_CITIES = ['Hyderabad', 'Vizag', 'Bengaluru']
HIGH_INTENT_SERVICES = [
    'Real Estate Marketing',
    'Lead Generation',
    'SEO',
    'PPC',
    'Website Development'
]
HIGH_VALUE_SOURCES = ['Google Ads', 'Website']

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[str] = None
    source: str
    service_interest: str
    location: str
    timestamp: str
    score: int = 0
    category: str = "Cold"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIMessages(BaseModel):
    whatsapp: str
    email: str
    call_script: str

class LeadWithMessages(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    phone: str
    email: Optional[str]
    source: str
    service_interest: str
    location: str
    timestamp: str
    score: int
    category: str
    ai_messages: AIMessages

class DashboardStats(BaseModel):
    total_leads: int
    hot_count: int
    warm_count: int
    cold_count: int
    source_distribution: dict
    best_time_of_day: str

def calculate_lead_score(lead_data: dict) -> tuple[int, str]:
    """Calculate lead score based on rule-based logic"""
    score = 0
    
    if lead_data['service_interest'] in HIGH_INTENT_SERVICES:
        score += 25
    
    if lead_data['location'] in TARGET_CITIES:
        score += 20
    
    if lead_data['source'] in HIGH_VALUE_SOURCES:
        score += 20
    
    try:
        lead_time = datetime.fromisoformat(lead_data['timestamp'])
        if dt_time(9, 0) <= lead_time.time() <= dt_time(18, 0):
            score += 15
    except:
        pass
    
    if lead_data.get('email'):
        score += 10
    
    score += 10
    
    score = min(score, 100)
    
    if score >= 70:
        category = "Hot"
    elif score >= 40:
        category = "Warm"
    else:
        category = "Cold"
    
    return score, category

async def generate_ai_messages(lead: Lead) -> AIMessages:
    """Generate AI-powered follow-up messages"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"lead_{lead.id}",
            system_message="You are a professional marketing communication expert. Generate concise, friendly, and conversion-focused messages."
        )
        chat.with_model("openai", "gpt-5.2")
        
        prompt = f"""Generate follow-up messages for this lead:
Name: {lead.name}
Service Interest: {lead.service_interest}
Location: {lead.location}
Category: {lead.category}

Generate 3 messages:
1. WhatsApp message (short, friendly, max 2-3 lines)
2. Email message (professional subject + body, max 5 lines)
3. Call opening script (warm, conversational, max 3 lines)

Format:
WHATSAPP:
[message]

EMAIL:
[message]

CALL:
[message]"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        parts = response.split('\n\n')
        whatsapp_msg = ""
        email_msg = ""
        call_msg = ""
        
        for part in parts:
            if part.startswith('WHATSAPP:'):
                whatsapp_msg = part.replace('WHATSAPP:', '').strip()
            elif part.startswith('EMAIL:'):
                email_msg = part.replace('EMAIL:', '').strip()
            elif part.startswith('CALL:'):
                call_msg = part.replace('CALL:', '').strip()
        
        return AIMessages(
            whatsapp=whatsapp_msg or f"Hi {lead.name}! We saw your interest in {lead.service_interest}. Let's discuss how we can help you grow!",
            email=email_msg or f"Subject: Your {lead.service_interest} Inquiry\n\nHi {lead.name},\n\nThank you for your interest. We'd love to discuss your {lead.service_interest} needs.",
            call_script=call_msg or f"Hi {lead.name}, I'm calling about your interest in {lead.service_interest}. Is this a good time to chat?"
        )
    except Exception as e:
        logging.error(f"AI generation failed: {e}")
        return AIMessages(
            whatsapp=f"Hi {lead.name}! We saw your interest in {lead.service_interest}. Can we schedule a quick call to discuss your needs?",
            email=f"Subject: Your {lead.service_interest} Inquiry\n\nHi {lead.name},\n\nThank you for reaching out regarding {lead.service_interest}. We'd love to help you achieve your marketing goals in {lead.location}.\n\nBest regards,\nMarketing Team",
            call_script=f"Hi {lead.name}, this is [Your Name] from [Agency]. I'm calling about your interest in {lead.service_interest}. Do you have a few minutes to discuss how we can help?"
        )

@api_router.post("/leads/upload")
async def upload_leads(file: UploadFile = File(...)):
    """Upload CSV file with leads"""
    try:
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(csv_file)
        
        leads_created = []
        for row in reader:
            score, category = calculate_lead_score(row)
            
            lead_dict = {
                'name': row['name'],
                'phone': row['phone'],
                'email': row.get('email', ''),
                'source': row['source'],
                'service_interest': row['service_interest'],
                'location': row['location'],
                'timestamp': row['timestamp'],
                'score': score,
                'category': category
            }
            
            lead = Lead(**lead_dict)
            doc = lead.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            
            await db.leads.insert_one(doc)
            leads_created.append(lead)
        
        return {"success": True, "count": len(leads_created), "message": f"Successfully uploaded {len(leads_created)} leads"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/leads", response_model=List[Lead])
async def get_leads():
    """Get all leads"""
    leads = await db.leads.find({}, {"_id": 0}).sort("score", -1).to_list(1000)
    
    for lead in leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return leads

@api_router.get("/leads/{lead_id}", response_model=LeadWithMessages)
async def get_lead_with_messages(lead_id: str):
    """Get lead with AI-generated messages"""
    lead_data = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    
    if not lead_data:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if isinstance(lead_data.get('created_at'), str):
        lead_data['created_at'] = datetime.fromisoformat(lead_data['created_at'])
    
    lead = Lead(**lead_data)
    ai_messages = await generate_ai_messages(lead)
    
    return LeadWithMessages(
        **lead.model_dump(),
        ai_messages=ai_messages
    )

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    all_leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    
    total_leads = len(all_leads)
    hot_count = sum(1 for lead in all_leads if lead['category'] == 'Hot')
    warm_count = sum(1 for lead in all_leads if lead['category'] == 'Warm')
    cold_count = sum(1 for lead in all_leads if lead['category'] == 'Cold')
    
    source_distribution = {}
    for lead in all_leads:
        source = lead['source']
        source_distribution[source] = source_distribution.get(source, 0) + 1
    
    hour_counts = {}
    for lead in all_leads:
        try:
            lead_time = datetime.fromisoformat(lead['timestamp'])
            hour = lead_time.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1
        except:
            pass
    
    if hour_counts:
        best_hour = max(hour_counts, key=hour_counts.get)
        if 9 <= best_hour < 12:
            best_time = "Morning (9 AM - 12 PM)"
        elif 12 <= best_hour < 15:
            best_time = "Afternoon (12 PM - 3 PM)"
        elif 15 <= best_hour < 18:
            best_time = "Late Afternoon (3 PM - 6 PM)"
        elif 18 <= best_hour < 21:
            best_time = "Evening (6 PM - 9 PM)"
        else:
            best_time = "Off Hours"
    else:
        best_time = "No data"
    
    return DashboardStats(
        total_leads=total_leads,
        hot_count=hot_count,
        warm_count=warm_count,
        cold_count=cold_count,
        source_distribution=source_distribution,
        best_time_of_day=best_time
    )

@api_router.delete("/leads")
async def delete_all_leads():
    """Delete all leads (for demo purposes)"""
    result = await db.leads.delete_many({})
    return {"success": True, "deleted_count": result.deleted_count}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()