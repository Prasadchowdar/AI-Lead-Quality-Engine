from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, time as dt_time
import csv
import io
from openai import OpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

app = FastAPI()
api_router = APIRouter(prefix="/api")

# In-memory storage for leads (replaces MongoDB)
leads_db: List[dict] = []

# Scoring configuration - hardcoded for demo
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
    """
    Calculate lead score based on rule-based logic.
    
    Scoring rules:
    - High intent service → +25
    - Location matches target city → +20
    - Source = Google Ads or Website → +20
    - Submitted during business hours (9 AM - 6 PM) → +15
    - Email present → +10
    - Base score → +10
    
    Score range: 0-100
    """
    score = 0
    
    # High intent service check (+25)
    if lead_data['service_interest'] in HIGH_INTENT_SERVICES:
        score += 25
    
    # Location matches target city (+20)
    if lead_data['location'] in TARGET_CITIES:
        score += 20
    
    # High value source (+20)
    if lead_data['source'] in HIGH_VALUE_SOURCES:
        score += 20
    
    # Business hours check (+15)
    try:
        lead_time = datetime.fromisoformat(lead_data['timestamp'])
        if dt_time(9, 0) <= lead_time.time() <= dt_time(18, 0):
            score += 15
    except:
        pass
    
    # Email present (+10)
    if lead_data.get('email'):
        score += 10
    
    # Base score (+10)
    score += 10
    
    # Cap at 100
    score = min(score, 100)
    
    # Categorization
    if score >= 70:
        category = "Hot"
    elif score >= 40:
        category = "Warm"
    else:
        category = "Cold"
    
    return score, category

async def generate_ai_messages(lead: Lead) -> AIMessages:
    """
    Generate AI-powered follow-up messages using OpenAI.
    Falls back to template messages if API fails.
    """
    try:
        prompt = f"""Generate follow-up messages for this lead:
Name: {lead.name}
Service Interest: {lead.service_interest}
Location: {lead.location}
Category: {lead.category}

Generate 3 messages:
1. WhatsApp message (short, friendly, max 2-3 lines)
2. Email message (professional subject + body, max 5 lines)
3. Call opening script (warm, conversational, max 3 lines)

Format your response EXACTLY like this:
WHATSAPP:
[message]

EMAIL:
[message]

CALL:
[message]"""
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional marketing communication expert. Generate concise, friendly, and conversion-focused messages."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        response_text = response.choices[0].message.content
        
        # Parse the response
        whatsapp_msg = ""
        email_msg = ""
        call_msg = ""
        
        # Split by sections
        sections = response_text.split('\n\n')
        current_section = None
        
        for section in sections:
            if section.strip().startswith('WHATSAPP:'):
                whatsapp_msg = section.replace('WHATSAPP:', '').strip()
            elif section.strip().startswith('EMAIL:'):
                email_msg = section.replace('EMAIL:', '').strip()
            elif section.strip().startswith('CALL:'):
                call_msg = section.replace('CALL:', '').strip()
        
        # If parsing didn't work well, try line-by-line
        if not whatsapp_msg or not email_msg or not call_msg:
            lines = response_text.split('\n')
            current_section = None
            section_content = []
            
            for line in lines:
                if 'WHATSAPP:' in line:
                    if current_section and section_content:
                        if current_section == 'whatsapp':
                            whatsapp_msg = '\n'.join(section_content).strip()
                        elif current_section == 'email':
                            email_msg = '\n'.join(section_content).strip()
                        elif current_section == 'call':
                            call_msg = '\n'.join(section_content).strip()
                    current_section = 'whatsapp'
                    section_content = [line.replace('WHATSAPP:', '').strip()]
                elif 'EMAIL:' in line:
                    if current_section and section_content:
                        if current_section == 'whatsapp':
                            whatsapp_msg = '\n'.join(section_content).strip()
                    current_section = 'email'
                    section_content = [line.replace('EMAIL:', '').strip()]
                elif 'CALL:' in line:
                    if current_section and section_content:
                        if current_section == 'email':
                            email_msg = '\n'.join(section_content).strip()
                    current_section = 'call'
                    section_content = [line.replace('CALL:', '').strip()]
                elif current_section:
                    section_content.append(line)
            
            # Capture the last section
            if current_section == 'call' and section_content:
                call_msg = '\n'.join(section_content).strip()
        
        return AIMessages(
            whatsapp=whatsapp_msg or f"Hi {lead.name}! We saw your interest in {lead.service_interest}. Let's discuss how we can help you grow!",
            email=email_msg or f"Subject: Your {lead.service_interest} Inquiry\n\nHi {lead.name},\n\nThank you for your interest. We'd love to discuss your {lead.service_interest} needs.",
            call_script=call_msg or f"Hi {lead.name}, I'm calling about your interest in {lead.service_interest}. Is this a good time to chat?"
        )
    except Exception as e:
        logging.error(f"AI generation failed: {e}")
        # Fallback template messages
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
            
            # Store in memory
            leads_db.append(doc)
            leads_created.append(lead)
        
        return {"success": True, "count": len(leads_created), "message": f"Successfully uploaded {len(leads_created)} leads"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/leads", response_model=List[Lead])
async def get_leads():
    """Get all leads sorted by score (descending)"""
    # Sort by score descending
    sorted_leads = sorted(leads_db, key=lambda x: x['score'], reverse=True)
    
    # Convert created_at strings back to datetime for response
    for lead in sorted_leads:
        if isinstance(lead.get('created_at'), str):
            lead['created_at'] = datetime.fromisoformat(lead['created_at'])
    
    return sorted_leads

@api_router.get("/leads/{lead_id}", response_model=LeadWithMessages)
async def get_lead_with_messages(lead_id: str):
    """Get lead with AI-generated messages"""
    lead_data = next((lead for lead in leads_db if lead['id'] == lead_id), None)
    
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
    total_leads = len(leads_db)
    hot_count = sum(1 for lead in leads_db if lead['category'] == 'Hot')
    warm_count = sum(1 for lead in leads_db if lead['category'] == 'Warm')
    cold_count = sum(1 for lead in leads_db if lead['category'] == 'Cold')
    
    # Source distribution
    source_distribution = {}
    for lead in leads_db:
        source = lead['source']
        source_distribution[source] = source_distribution.get(source, 0) + 1
    
    # Best time of day calculation
    hour_counts = {}
    for lead in leads_db:
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
    global leads_db
    deleted_count = len(leads_db)
    leads_db = []
    return {"success": True, "deleted_count": deleted_count}

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