# Lead Forge - AI Lead Quality Engine

A premium AI-powered lead scoring and conversion platform for digital marketing agencies.

![Lead Forge UI](https://github.com/Prasadchowdar/AI-Lead-Quality-Engine/raw/main/screenshots/hero.png)

## ✨ Features

- **AI Lead Scoring** - Rule-based scoring (0-100) with intelligent categorization
- **Smart Categorization** - Hot 🔥 / Warm ⚡ / Cold ❄️ lead classification
- **AI Follow-Up Generator** - OpenAI-powered personalized messages (WhatsApp, Email, Call scripts)
- **Analytics Dashboard** - Lead source distribution, peak activity times
- **Premium UI** - Animated aurora background, glassmorphism, rich animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- OpenAI API Key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run the server
python -m uvicorn server:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Create .env file (copy from .env.example)
cp .env.example .env

# Run the development server
npm start
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
├── backend/
│   ├── server.py          # FastAPI server with OpenAI integration
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment template
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── index.css      # Premium design system
│   │   └── components/    # UI components
│   └── .env.example       # Environment template
└── sample_leads.csv       # Sample data for testing
```

## 🎨 Design System

- **Typography**: Space Grotesk (headings) + Plus Jakarta Sans (body)
- **Colors**: Deep space black with aurora gradients (blue/purple/pink)
- **Effects**: Glassmorphism, floating particles, animated borders
- **Animations**: Staggered entrances, hover glows, shimmer effects

## 📊 Lead Scoring Logic

| Factor | Points |
|--------|--------|
| High-intent service (SEO, PPC, Lead Gen) | +25 |
| Target location (Hyderabad, Vizag, Bengaluru) | +20 |
| High-value source (Google Ads, Website) | +20 |
| Business hours submission (9 AM - 6 PM) | +15 |
| Email provided | +10 |
| Base score | +10 |

**Categories:**
- 🔥 Hot: 70-100
- ⚡ Warm: 40-69
- ❄️ Cold: 0-39

## 🔒 Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=your_openai_api_key_here
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

## 📝 Sample CSV Format

```csv
name,phone,email,source,service_interest,location,timestamp
John Doe,+91-9876543210,john@email.com,Google Ads,SEO,Hyderabad,2024-12-15T10:30:00
```

## 🛠️ Tech Stack

- **Frontend**: React, Recharts, Tailwind CSS, Radix UI
- **Backend**: FastAPI, OpenAI API
- **Storage**: In-memory (demo mode)

## 📄 License

MIT License - Built for demo purposes.
