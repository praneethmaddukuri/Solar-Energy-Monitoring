from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import json
from jose import JWTError, jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "solar-energy-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
security = HTTPBearer()

# ThingSpeak Configuration
# THINGSPEAK_API_KEY = "BYE9OBX9W841PCGM"
# THINGSPEAK_CHANNEL_ID = os.getenv("THINGSPEAK_CHANNEL_ID", "2823968")
THINGSPEAK_BASE_URL = "https://api.thingspeak.com"

# Create the main app
app = FastAPI(title="Solar Energy Monitoring System")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== Models ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class EnergyReading(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime
    voltage: float
    current: float
    power: float
    entry_id: int

class DailyStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str
    energy_kwh: float
    avg_voltage: float
    avg_current: float
    avg_power: float
    peak_power: float
    co2_reduced: float
    savings: float

class Site(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    location: str
    capacity_kw: float
    channel_id: str
    api_key: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== Auth Utilities ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return User(**user)

# ==================== WebSocket Manager ====================

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"Client {user_id} connected")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"Client {user_id} disconnected")
    
    async def broadcast_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    disconnected.append(connection)
            
            for connection in disconnected:
                self.disconnect(connection, user_id)

ws_manager = WebSocketManager()

# ==================== ThingSpeak Service ====================

class ThingSpeakService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def fetch_latest_readings(self, channel_id: str = None, api_key: str = None, results: int = 100):
        try:
            if not channel_id or not api_key:
                logger.error("Missing ThingSpeak credentials")
                return []

            cid = channel_id
            key = api_key
            
            url = f"{THINGSPEAK_BASE_URL}/channels/{cid}/feeds.json"
            params = {"api_key": key, "results": results}
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            readings = []
            
            for feed in data.get("feeds", []):
                try:
                    voltage = float(feed.get('field1', 0) or 0)
                    current = float(feed.get('field2', 0) or 0)
                    power = float(feed.get('field3', 0) or 0)
                    
                    reading = EnergyReading(
                        timestamp=datetime.fromisoformat(feed['created_at'].replace('Z', '+00:00')),
                        voltage=voltage,
                        current=current,
                        power=power,
                        entry_id=feed['entry_id']
                    )
                    readings.append(reading)
                except (ValueError, KeyError) as e:
                    logger.warning(f"Skipping invalid feed: {e}")
                    continue
            
            logger.info(f"Fetched {len(readings)} readings from ThingSpeak")
            return readings
        except Exception as e:
            logger.error(f"ThingSpeak API error: {e}")
            return []

thingspeak = ThingSpeakService()

# ==================== Background Tasks ====================

async def sync_thingspeak_data():
    """Background task to sync ThingSpeak data every 30 seconds"""
    while True:
        try:
            await asyncio.sleep(30)
            
            # Get all sites
            sites = await db.sites.find({}).to_list(None)
            
            for site in sites:
                channel_id = site.get("channel_id")
                api_key = site.get("api_key")

                if not channel_id or not api_key:
                    continue

                readings = await thingspeak.fetch_latest_readings(
                    channel_id=channel_id,
                    api_key=api_key,
                    results=10
                )
                
                for reading in readings:
                    doc = reading.model_dump()
                    doc['timestamp'] = doc['timestamp'].isoformat()
                    doc['site_id'] = str(site['_id'])
                    doc['user_id'] = site['user_id']
                    
                    await db.readings.update_one(
                        {"entry_id": reading.entry_id, "site_id": str(site['_id'])},
                        {"$set": doc},
                        upsert=True
                    )
                    
                    # Broadcast to user
                    await ws_manager.broadcast_to_user(site['user_id'], {
                        "type": "new_reading",
                        "reading": doc
                    })
            
            logger.info("Completed sync cycle")
        except Exception as e:
            logger.error(f"Sync error: {e}")

# ==================== Auth Routes ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password)
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    user_dict = user.model_dump()
    user_dict.pop('hashed_password')
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_dict
    )

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_obj = User(**user)
    access_token = create_access_token(data={"sub": user_obj.id})
    
    user_dict = user_obj.model_dump()
    user_dict.pop('hashed_password')
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_dict
    )

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    user_dict = current_user.model_dump()
    user_dict.pop('hashed_password')
    return user_dict

# ==================== Energy Routes ====================

@api_router.get("/readings/latest")
async def get_latest_readings(
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    readings = await db.readings.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return readings

@api_router.get("/readings/sync")
async def manual_sync(current_user: User = Depends(get_current_user)):
    sites = await db.sites.find({"user_id": current_user.id}).to_list(None)
    
    total_synced = 0
    for site in sites:
        channel_id = site.get("channel_id")
        api_key = site.get("api_key")

        if not channel_id or not api_key:
            continue

        readings = await thingspeak.fetch_latest_readings(
            channel_id=channel_id,
            api_key=api_key,
            results=100
        )
        
        for reading in readings:
            doc = reading.model_dump()
            doc['timestamp'] = doc['timestamp'].isoformat()
            doc['site_id'] = str(site['_id'])
            doc['user_id'] = current_user.id
            
            await db.readings.update_one(
                {"entry_id": reading.entry_id, "site_id": str(site['_id'])},
                {"$set": doc},
                upsert=True
            )
            total_synced += 1
    
    return {"synced": total_synced, "status": "success"}

@api_router.get("/stats/daily")
async def get_daily_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    # Get readings from last N days
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    readings = await db.readings.find(
        {
            "user_id": current_user.id,
            "timestamp": {"$gte": start_date.isoformat()}
        },
        {"_id": 0}
    ).to_list(None)
    
    # Group by date
    daily_data = {}
    for reading in readings:
        ts = datetime.fromisoformat(reading['timestamp'])
        date_key = ts.strftime('%Y-%m-%d')
        
        if date_key not in daily_data:
            daily_data[date_key] = []
        daily_data[date_key].append(reading)
    
    # Calculate stats
    stats = []
    for date_key, day_readings in sorted(daily_data.items()):
        voltages = [r['voltage'] for r in day_readings]
        currents = [r['current'] for r in day_readings]
        powers = [r['power'] for r in day_readings]
        
        avg_power = sum(powers) / len(powers) if powers else 0
        energy_kwh = (avg_power / 1000) * (len(powers) / 12)  # Assuming 5 min intervals
        
        # CO2 reduction: 0.5 kg per kWh
        co2_reduced = energy_kwh * 0.5
        
        # Savings: ₹6 per kWh
        savings = energy_kwh * 6
        
        stats.append({
            "date": date_key,
            "energy_kwh": round(energy_kwh, 2),
            "avg_voltage": round(sum(voltages) / len(voltages), 2) if voltages else 0,
            "avg_current": round(sum(currents) / len(currents), 2) if currents else 0,
            "avg_power": round(avg_power, 2),
            "peak_power": round(max(powers), 2) if powers else 0,
            "co2_reduced": round(co2_reduced, 2),
            "savings": round(savings, 2)
        })
    
    return stats

@api_router.get("/stats/summary")
async def get_summary_stats(current_user: User = Depends(get_current_user)):
    # Get all readings
    readings = await db.readings.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).to_list(None)
    
    if not readings:
        return {
            "today_energy": 0,
            "month_energy": 0,
            "lifetime_energy": 0,
            "today_savings": 0,
            "month_savings": 0,
            "lifetime_savings": 0,
            "today_co2": 0,
            "total_co2": 0,
            "trees_equivalent": 0,
            "fuel_saved": 0
        }
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    today_readings = [r for r in readings if datetime.fromisoformat(r['timestamp']) >= today_start]
    month_readings = [r for r in readings if datetime.fromisoformat(r['timestamp']) >= month_start]
    
    def calc_energy(readings_list):
        if not readings_list:
            return 0
        avg_power = sum(r['power'] for r in readings_list) / len(readings_list)
        return (avg_power / 1000) * (len(readings_list) / 12)
    
    today_energy = calc_energy(today_readings)
    month_energy = calc_energy(month_readings)
    lifetime_energy = calc_energy(readings)
    
    return {
        "today_energy": round(today_energy, 2),
        "month_energy": round(month_energy, 2),
        "lifetime_energy": round(lifetime_energy, 2),
        "today_savings": round(today_energy * 6, 2),
        "month_savings": round(month_energy * 6, 2),
        "lifetime_savings": round(lifetime_energy * 6, 2),
        "today_co2": round(today_energy * 0.5, 2),
        "total_co2": round(lifetime_energy * 0.5, 2),
        "trees_equivalent": round(lifetime_energy * 0.5 / 20, 0),  # 1 tree absorbs ~20kg CO2/year
        "fuel_saved": round(lifetime_energy * 0.3, 2)  # Liters
    }

# ==================== Sites Routes ====================

@api_router.get("/sites")
async def get_sites(current_user: User = Depends(get_current_user)):
    sites = await db.sites.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    return sites

@api_router.post("/sites")
async def create_site(site_data: dict, current_user: User = Depends(get_current_user)):
    # Validate required fields
    if not site_data.get("channel_id") or not site_data.get("api_key"):
        raise HTTPException(status_code=400, detail="Channel ID and API Key are required")

    site = Site(
        user_id=current_user.id,
        name=site_data["name"],
        location=site_data["location"],
        capacity_kw=site_data["capacity_kw"],
        channel_id=site_data["channel_id"],
        api_key=site_data["api_key"]
    )

    doc = site.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()

    await db.sites.insert_one(doc)

    return doc

@api_router.get("/user/thingspeak-status")
async def check_thingspeak_status(current_user: User = Depends(get_current_user)):
    site = await db.sites.find_one({"user_id": current_user.id})
    if site:
        return {"connected": True}
    return {"connected": False}

@api_router.post("/user/connect")
async def connect_thingspeak(
    data: dict,
    current_user: User = Depends(get_current_user)
):
    if not data.get("channel_id") or not data.get("api_key"):
        raise HTTPException(status_code=400, detail="Channel ID and API Key required")

    await db.sites.update_one(
        {"user_id": current_user.id},
        {
            "$set": {
                "user_id": current_user.id,
                "name": "Main Solar Installation",
                "location": "Home",
                "capacity_kw": 5.0,
                "channel_id": data["channel_id"],
                "api_key": data["api_key"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    return {"message": "Connected successfully"}
# ==================== WebSocket Route ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await ws_manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)

# ==================== Main App Setup ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.readings.create_index([("timestamp", -1)])
    await db.readings.create_index([("entry_id", 1)])
    await db.users.create_index([("email", 1)], unique=True)
    
    # Start background sync task
    asyncio.create_task(sync_thingspeak_data())
    logger.info("Application started")

@app.on_event("shutdown")
async def shutdown_event():
    client.close()
    await thingspeak.client.aclose()
    logger.info("Application shutdown")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}