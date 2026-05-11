# =========================================================
# Imports
# =========================================================

import logging
import os
import uuid
import re
import base64
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional, Generator

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
from jose import jwt

from database import SessionLocal

logger = logging.getLogger(__name__)


# =========================================================
# App Configuration
# =========================================================

@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("AgroEye API Engine starting up")
    yield
    logger.info("AgroEye API Engine shutting down")

app = FastAPI(
    title="AGROEYE API Engine",
    root_path="",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow mobile app and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error"})


UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploaded_scans")
os.makedirs(UPLOAD_DIR, exist_ok=True)

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("FATAL: SECRET_KEY environment variable is not set. Refusing to start without it.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/mobile/auth/login")


# =========================================================
# Database Dependency
# =========================================================

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# Auth Models
# =========================================================

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str = Field(..., min_length=6, max_length=64)
    role: str = "farmer"
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# =========================================================
# Home Models
# =========================================================

class UserFarmsRequest(BaseModel):
    user_id: int


class FarmFieldsRequest(BaseModel):
    farm_id: int


class FieldDevicesRequest(BaseModel):
    field_id: int


class DeviceLatestReadingRequest(BaseModel):
    device_id: int


class UserNotificationsRequest(BaseModel):
    user_id: int
    farm_id: int


class MarkNotificationReadRequest(BaseModel):
    notification_id: int

class NodeStatusRequest(BaseModel):
    field_id: int

# =========================================================
# Scan Models
# =========================================================

class AnalyzeRequest(BaseModel):
    image_id: str


class ScanHistoryRequest(BaseModel):
    field_id: int


class ScanDetailsRequest(BaseModel):
    image_id: str


# =========================================================
# Reports Models
# =========================================================

class ReadingsRangeRequest(BaseModel):
    field_id: int
    from_date: str
    to_date: str


class IrrigationRequest(BaseModel):
    field_id: int


class SummaryRequest(BaseModel):
    field_id: int


# =========================================================
# Management Models
# =========================================================

class CreateFarmRequest(BaseModel):
    user_id: int
    name: str
    location: str
    area_size: float


class UpdateFarmRequest(BaseModel):
    farm_id: int
    name: str
    location: str
    area_size: float


class DeleteFarmRequest(BaseModel):
    farm_id: int


class CreateFieldRequest(BaseModel):
    farm_id: int
    name: str
    crop_type: str
    area_size: float


class UpdateFieldRequest(BaseModel):
    field_id: int
    name: str
    crop_type: str
    area_size: float


class DeleteFieldRequest(BaseModel):
    field_id: int


class CreateDeviceRequest(BaseModel):
    field_id: int
    device_type: str
    serial_number: str
    location_coords: Optional[str] = None
    status: str = "active"


class UpdateDeviceRequest(BaseModel):
    device_id: int
    device_type: Optional[str] = None
    serial_number: Optional[str] = None
    location_coords: Optional[str] = None
    status: Optional[str] = None


class DeleteDeviceRequest(BaseModel):
    device_id: int


# =========================================================
# Auth Helpers
# =========================================================

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# =========================================================
# Auth Endpoints
# =========================================================

@app.post("/mobile/auth/signup")
def signup_user(data: SignupRequest, db: Session = Depends(get_db)):

    existing = db.execute(
        text("SELECT user_id FROM Users WHERE email = :email"),
        {"email": data.email}
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    clean_password = data.password.strip()

    if len(clean_password.encode("utf-8")) > 256:
        raise HTTPException(status_code=400, detail="Password too long")

    hashed_password = pwd_context.hash(clean_password)

    db.execute(
        text("""
            INSERT INTO Users (username, email, password_hash, role, phone)
            VALUES (:username, :email, :password_hash, :role, :phone)
        """),
        {
            "username": data.username,
            "email": data.email,
            "password_hash": hashed_password,
            "role": data.role,
            "phone": data.phone
        }
    )
    db.commit()

    return {"status": "success", "message": "User registered successfully"}


@app.post("/mobile/auth/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.execute(
        text("""
            SELECT user_id, username, email, password_hash, role
            FROM Users
            WHERE email = :email
        """),
        {"email": data.email}
    ).mappings().first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not pwd_context.verify(data.password.strip(), user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "user_id": user["user_id"],
        "role": user["role"]
    })

    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"]
        }
    }


# =========================================================
# Home Endpoints
# =========================================================

@app.post("/mobile/home/get-farms")
def get_farms(data: UserFarmsRequest, db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT farm_id, name, location, area_size FROM Farms WHERE user_id = :uid"),
        {"uid": data.user_id}
    ).mappings().all()
    return {"farms": [dict(r) for r in rows]}


@app.post("/mobile/home/get-fields")
def get_fields(data: FarmFieldsRequest, db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT field_id, name, crop_type, area_size FROM Fields WHERE farm_id = :fid"),
        {"fid": data.farm_id}
    ).mappings().all()
    return {"fields": [dict(r) for r in rows]}


@app.post("/mobile/home/get-devices")
def get_devices(data: FieldDevicesRequest, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT device_id, device_type, serial_number, location_coords, status
            FROM Devices WHERE field_id = :fid
        """),
        {"fid": data.field_id}
    ).mappings().all()
    return {"devices": [dict(r) for r in rows]}


@app.post("/mobile/home/get-latest-reading")
def get_latest_reading(data: DeviceLatestReadingRequest, db: Session = Depends(get_db)):
    row = db.execute(
        text("""
            SELECT *
            FROM SensorReadings
            WHERE device_id = :did
            ORDER BY timestamp DESC
            LIMIT 1
        """),
        {"did": data.device_id}
    ).mappings().first()
    return {"latest_reading": dict(row) if row else None}


@app.post("/mobile/home/get-notifications")
def get_notifications(data: UserNotificationsRequest, db: Session = Depends(get_db)):
    query = text("""
        SELECT 
            notification_id,
            user_id,
            farm_id,
            type,
            message,
            is_read,
            sent_at
        FROM Notifications
        WHERE user_id = :uid AND farm_id = :fid
        ORDER BY sent_at DESC
    """)

    rows = db.execute(query, {"uid": data.user_id, "fid": data.farm_id}).mappings().all()

    return {"notifications": [dict(row) for row in rows]}



@app.post("/mobile/home/mark-notification-read")
def mark_notification_read(
    data: MarkNotificationReadRequest,
    db: Session = Depends(get_db)
):
    query = text("""
        UPDATE Notifications
        SET is_read = 1
        WHERE notification_id = :nid
    """)

    result = db.execute(query, {"nid": data.notification_id})
    db.commit()

  
    if result.rowcount == 0:
        return {
            "status": "error",
            "message": "Notification not found"
        }

    return {
        "status": "success",
        "notification_id": data.notification_id,
        "is_read": 1
    }


@app.post("/mobile/home/get-node-status")
def get_node_status(data: NodeStatusRequest, db: Session = Depends(get_db)):

   
    devices = db.execute(
        text("SELECT device_id FROM Devices WHERE field_id = :fid"),
        {"fid": data.field_id}
    ).mappings().all()

    
    if not devices:
        return {
            "status": "success",
            "summary": {
                "total_nodes": 0,
                "active": 0,
                "inactive": 0,
                "low_battery": 0,
                "offline": 0
            }
        }

    
    device_ids = [d["device_id"] for d in devices]
    id_placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
    id_params = {f"did_{i}": did for i, did in enumerate(device_ids)}

    rows = db.execute(
        text(f"""
            SELECT status, COUNT(*) as count
            FROM SensingNodes
            WHERE device_id IN ({id_placeholders})
            GROUP BY status
        """),
        id_params
    ).mappings().all()

    low_battery = db.execute(
        text(f"""
            SELECT COUNT(*) as count
            FROM SensingNodes
            WHERE device_id IN ({id_placeholders}) AND battery_level < 20
        """),
        id_params
    ).mappings().first()

   
    result = {
        "total_nodes": 0,
        "active": 0,
        "inactive": 0,
        "low_battery": 0,
        "offline": 0
    }

  
    for r in rows:
        status = r["status"]
        count = r["count"]

        result["total_nodes"] += count

        if status in result:
            result[status] = count

   
    result["low_battery"] = low_battery["count"]

    
    return {
        "status": "success",
        "summary": result
    }

# =========================================================
# Scan Endpoints
# =========================================================

@app.post("/mobile/scan/upload")
async def upload_image(
    device_id: int = Form(...),
    field_id: int = Form(...),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    original_name = image_file.filename or "upload.bin"
    ext = original_name.rsplit(".", 1)[-1] if "." in original_name else "bin"
    filename = f"scan_{uuid.uuid4()}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)

    content = await image_file.read()
    with open(path, "wb") as f:
        f.write(content)

    image_id = str(uuid.uuid4())

    db.execute(
        text("""
            INSERT INTO Images (image_id, device_id, field_id, image_path, capture_timestamp, file_size)
            VALUES (:iid, :did, :fid, :path, NOW(), :size)
        """),
        {
            "iid": image_id,
            "did": device_id,
            "fid": field_id,
            "path": filename,
            "size": len(content)
        }
    )
    db.commit()

    return {"status": "uploaded", "image_id": image_id}


@app.post("/mobile/scan/analyze")
def analyze_image(data: AnalyzeRequest, db: Session = Depends(get_db)):
    db.execute(
        text("""
            INSERT INTO AIResults (image_id, disease_detected, confidence_score, recommendation, analysis_timestamp)
            VALUES (:iid, 'Leaf Blight', 0.92, 'Use organic fungicide', NOW())
        """),
        {"iid": data.image_id}
    )
    db.commit()
    return {"status": "analyzed", "image_id": data.image_id}


@app.post("/mobile/scan/history")
def get_scan_history(data: ScanHistoryRequest, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT i.*, r.*
            FROM Images i
            LEFT JOIN AIResults r ON i.image_id = r.image_id
            WHERE i.field_id = :fid
            ORDER BY i.capture_timestamp DESC
        """),
        {"fid": data.field_id}
    ).mappings().all()
    return {"history": [dict(r) for r in rows]}


@app.post("/mobile/scan/details")
def get_scan_details(data: ScanDetailsRequest, db: Session = Depends(get_db)):
    image = db.execute(
        text("SELECT * FROM Images WHERE image_id = :iid"),
        {"iid": data.image_id}
    ).mappings().first()

    analysis = db.execute(
        text("SELECT * FROM AIResults WHERE image_id = :iid ORDER BY result_id DESC LIMIT 1"),
        {"iid": data.image_id}
    ).mappings().first()

    return {
        "image": dict(image) if image else None,
        "analysis": dict(analysis) if analysis else None
    }


# =========================================================
# Reports Endpoints
# =========================================================

@app.post("/mobile/reports/get-readings")
def get_readings(data: ReadingsRangeRequest, db: Session = Depends(get_db)):
    devices = db.execute(
        text("SELECT device_id FROM Devices WHERE field_id = :fid"),
        {"fid": data.field_id}
    ).mappings().all()

    if not devices:
        return {"readings": []}

    device_ids = [d["device_id"] for d in devices]
    id_placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
    id_params = {f"did_{i}": did for i, did in enumerate(device_ids)}
    id_params["start"] = data.from_date
    id_params["end"] = data.to_date

    rows = db.execute(
        text(f"""
            SELECT *
            FROM SensorReadings
            WHERE device_id IN ({id_placeholders})
            AND timestamp BETWEEN :start AND :end
            ORDER BY timestamp ASC
        """),
        id_params
    ).mappings().all()

    return {"readings": [dict(r) for r in rows]}


@app.post("/mobile/reports/get-irrigation")
def get_irrigation(data: IrrigationRequest, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT *
            FROM IrrigationEvents
            WHERE field_id = :fid
            ORDER BY start_time DESC
        """),
        {"fid": data.field_id}
    ).mappings().all()
    return {"irrigation_events": [dict(r) for r in rows]}


@app.post("/mobile/reports/get-summary")
def get_summary(data: SummaryRequest, db: Session = Depends(get_db)):
    
    # ✅ 1) Get devices inside this field
    device_query = text("""
        SELECT device_id 
        FROM Devices
        WHERE field_id = :fid
    """)

    devices = db.execute(device_query, {"fid": data.field_id}).mappings().all()

    if not devices:
        return {
            "devices_count": 0,
            "latest_reading": None,
            "averages": {},
            "irrigation_summary": {}
        }

    device_ids = [d["device_id"] for d in devices]
    id_placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
    id_params = {f"did_{i}": did for i, did in enumerate(device_ids)}

    # ✅ 2) Averages
    avg_query = text(f"""
        SELECT 
            AVG(temperature_air) AS avg_air_temp,
            AVG(humidity_air) AS avg_air_humidity,
            AVG(temperature_soil) AS avg_soil_temp,
            AVG(humidity_soil) AS avg_soil_humidity,
            AVG(soil_moisture) AS avg_soil_moist,
            AVG(soil_ph) AS avg_soil_ph,
            AVG(nitrogen) AS avg_nitrogen,
            AVG(phosphorus) AS avg_phosphorus,
            AVG(potassium) AS avg_potassium,
            AVG(conductivity) AS avg_conductivity,
            AVG(light_intensity) AS avg_light,
            AVG(co2) AS avg_co2
        FROM SensorReadings
        WHERE device_id IN ({id_placeholders})
    """)

    avg_data = db.execute(avg_query, id_params).mappings().first()

    # ✅ 3) Latest Reading
    latest_query = text(f"""
        SELECT 
            device_id,
            timestamp,
            temperature_air,
            humidity_air,
            temperature_soil,
            humidity_soil,
            soil_moisture,
            soil_ph,
            nitrogen,
            phosphorus,
            potassium,
            conductivity,
            light_intensity,
            co2
        FROM SensorReadings
        WHERE device_id IN ({id_placeholders})
        ORDER BY timestamp DESC
        LIMIT 1
    """)

    latest_reading = db.execute(latest_query, id_params).mappings().first()

    # ✅ 4) Irrigation Summary
    irrigation_last = text("""
        SELECT *
        FROM IrrigationEvents
        WHERE field_id = :fid
        ORDER BY start_time DESC
        LIMIT 1
    """)
    last_irrigation = db.execute(irrigation_last, {"fid": data.field_id}).mappings().first()

    irrigation_count = text("""
        SELECT COUNT(*) AS events_count
        FROM IrrigationEvents
        WHERE field_id = :fid
        AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    """)
    irrigation30 = db.execute(irrigation_count, {"fid": data.field_id}).mappings().first()

    return {
        "devices_count": len(devices),
        "latest_reading": dict(latest_reading) if latest_reading else None,
        "averages": dict(avg_data) if avg_data else {},
        "irrigation_summary": {
            "last_event": dict(last_irrigation) if last_irrigation else None,
            "events_last_30_days": irrigation30["events_count"]
        }
    }


# =========================================================
# Management Endpoints
# =========================================================

@app.post("/mobile/manage/create-farm")
def create_farm(data: CreateFarmRequest, db: Session = Depends(get_db)):
    db.execute(
        text("""
            INSERT INTO Farms (user_id, name, location, area_size)
            VALUES (:uid, :name, :location, :area)
        """),
        {
            "uid": data.user_id,
            "name": data.name,
            "location": data.location,
            "area": data.area_size
        }
    )
    db.commit()
    return {"status": "success", "message": "Farm created"}


@app.post("/mobile/manage/update-farm")
def update_farm(data: UpdateFarmRequest, db: Session = Depends(get_db)):
    result = db.execute(
        text("""
            UPDATE Farms
            SET name = :name, location = :location, area_size = :area
            WHERE farm_id = :fid
        """),
        {
            "fid": data.farm_id,
            "name": data.name,
            "location": data.location,
            "area": data.area_size
        }
    )
    db.commit()

    if result.rowcount == 0:
        return {"status": "error", "message": "Farm not found"}

    return {"status": "success", "message": "Farm updated"}


@app.post("/mobile/manage/delete-farm")
def delete_farm(data: DeleteFarmRequest, db: Session = Depends(get_db)):
    db.execute(
        text("DELETE FROM Farms WHERE farm_id = :fid"),
        {"fid": data.farm_id}
    )
    db.commit()
    return {"status": "success", "message": "Farm deleted"}


@app.post("/mobile/manage/create-field")
def create_field(data: CreateFieldRequest, db: Session = Depends(get_db)):
    db.execute(
        text("""
            INSERT INTO Fields (farm_id, name, crop_type, area_size)
            VALUES (:fid, :name, :crop, :area)
        """),
        {
            "fid": data.farm_id,
            "name": data.name,
            "crop": data.crop_type,
            "area": data.area_size
        }
    )
    db.commit()
    return {"status": "success", "message": "Field created"}


@app.post("/mobile/manage/update-field")
def update_field(data: UpdateFieldRequest, db: Session = Depends(get_db)):
    result = db.execute(
        text("""
            UPDATE Fields
            SET name = :name, crop_type = :crop, area_size = :area
            WHERE field_id = :fid
        """),
        {
            "fid": data.field_id,
            "name": data.name,
            "crop": data.crop_type,
            "area": data.area_size
        }
    )
    db.commit()

    if result.rowcount == 0:
        return {"status": "error", "message": "Field not found"}

    return {"status": "success", "message": "Field updated"}


@app.post("/mobile/manage/delete-field")
def delete_field(data: DeleteFieldRequest, db: Session = Depends(get_db)):
    db.execute(
        text("DELETE FROM Fields WHERE field_id = :fid"),
        {"fid": data.field_id}
    )
    db.commit()
    return {"status": "success", "message": "Field deleted"}


@app.post("/mobile/manage/create-device")
def create_device(data: CreateDeviceRequest, db: Session = Depends(get_db)):
    db.execute(
        text("""
            INSERT INTO Devices
            (field_id, device_type, serial_number, location_coords, status)
            VALUES (:fid, :type, :serial, :coords, :status)
        """),
        {
            "fid": data.field_id,
            "type": data.device_type,
            "serial": data.serial_number,
            "coords": data.location_coords,
            "status": data.status
        }
    )
    db.commit()
    return {"status": "success", "message": "Device created"}


@app.post("/mobile/manage/update-device")
def update_device(data: UpdateDeviceRequest, db: Session = Depends(get_db)):
    fields = {k: v for k, v in data.model_dump().items() if v is not None and k != "device_id"}
    if not fields:
        return {"status": "error", "message": "No fields provided"}

    set_clause = ", ".join(f"{k} = :{k}" for k in fields.keys())
    fields["device_id"] = data.device_id

    db.execute(
        text(f"""
            UPDATE Devices
            SET {set_clause}
            WHERE device_id = :device_id
        """),
        fields
    )
    db.commit()
    return {"status": "success", "message": "Device updated"}


@app.post("/mobile/manage/delete-device")
def delete_device(data: DeleteDeviceRequest, db: Session = Depends(get_db)):
    db.execute(
        text("DELETE FROM Devices WHERE device_id = :did"),
        {"did": data.device_id}
    )
    db.commit()
    return {"status": "success", "message": "Device deleted"}


# =========================================================
# AgroEye Decision Makers (AI) Endpoints
# =========================================================

class AIDecisionRequest(BaseModel):
    timestamp_utc: Optional[str] = None
    sensors: dict[str, Optional[float]] = Field(default_factory=dict)
    override_config: Optional[dict] = None


_decision_runtime = None


def _get_decision_runtime():
    global _decision_runtime
    if _decision_runtime is not None:
        return _decision_runtime

    import sys

    base_dir = os.path.dirname(os.path.abspath(__file__))
    decision_dir = os.path.join(base_dir, "AI", "agroeye-decision-maker")
    decision_src = os.path.join(decision_dir, "src")
    if decision_src not in sys.path:
        sys.path.append(decision_src)

    from agroeye_decision_maker.runtime import DecisionRuntime
    from agroeye_decision_maker.utils.config import load_yaml

    cfg = load_yaml(os.path.join(decision_dir, "configs", "base.yaml"))
    safety_cfg = load_yaml(os.path.join(decision_dir, "configs", "safety.yaml"))

    cfg["paths"]["artifacts_dir"] = os.path.join(decision_dir, "artifacts")
    _decision_runtime = DecisionRuntime(cfg, safety_cfg)
    return _decision_runtime


@app.post("/ai/decide")
def ai_decide(payload: AIDecisionRequest):
    runtime = _get_decision_runtime()
    return runtime.decide(payload.timestamp_utc, payload.sensors, payload.override_config)


# =========================================================
# Base Health Endpoint
# =========================================================

SERVICE_START_UTC = datetime.now(timezone.utc)


class BaseHealthResponse(BaseModel):
    status: str
    uptime_seconds: int
    started_at_utc: str


@app.get("/", response_model=BaseHealthResponse)
def base_health() -> BaseHealthResponse:
    uptime_seconds = int((datetime.now(timezone.utc) - SERVICE_START_UTC).total_seconds())
    return BaseHealthResponse(
        status="ok",
        uptime_seconds=uptime_seconds,
        started_at_utc=SERVICE_START_UTC.isoformat() + "Z",
    )


# =========================================================
# Vision (YOLO) Endpoints
# =========================================================

_vision_model = None


def _safe_tag(value: Optional[str]) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-zA-Z0-9_-]+", "", str(value))


def _to_bool(value: Optional[str]) -> bool:
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _get_vision_model_path() -> str:
    model_path = os.environ.get("VISION_MODEL_PATH")
    if model_path:
        return model_path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "AI", "yolo", "ripe_tomato.pt")


def _get_vision_model():
    global _vision_model
    if _vision_model is not None:
        return _vision_model

    from ultralytics import YOLO

    model_path = _get_vision_model_path()
    if not os.path.exists(model_path):
        raise RuntimeError(f"Vision model not found: {model_path}")
    _vision_model = YOLO(model_path)
    return _vision_model


@app.post("/ai/vision/analyze")
async def ai_vision_analyze(
    image_file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    field_id: Optional[str] = Form(None),
    return_annotated: Optional[str] = Form(None),
):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "upload")
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    ext = os.path.splitext(image_file.filename or "")[1].lstrip(".") or "jpg"
    tags = []
    if user_id:
        tags.append(f"user-{_safe_tag(user_id)}")
    if device_id:
        tags.append(f"device-{_safe_tag(device_id)}")
    if field_id:
        tags.append(f"field-{_safe_tag(field_id)}")

    image_id = str(uuid.uuid4())
    tag_part = "_".join(tags) if tags else "anon"
    filename = f"upload_{timestamp}_{tag_part}_{image_id}.{ext}"
    file_path = os.path.join(upload_dir, filename)

    content = await image_file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    model = _get_vision_model()
    results = model.predict(source=file_path, verbose=False)
    result = results[0]

    names = getattr(result, "names", None) or getattr(model, "names", {})
    detections = []
    confs = []
    if result.boxes is not None and len(result.boxes) > 0:
        xyxy = result.boxes.xyxy.tolist()
        conf = result.boxes.conf.tolist()
        cls_ids = result.boxes.cls.tolist()
        for i in range(len(xyxy)):
            cls_id = int(cls_ids[i])
            label = names.get(cls_id, str(cls_id)) if isinstance(names, dict) else str(cls_id)
            score = float(conf[i])
            confs.append(score)
            detections.append(
                {
                    "label": label,
                    "confidence": score,
                    "bbox_xyxy": [float(v) for v in xyxy[i]],
                }
            )

    stored_rel_path = os.path.relpath(file_path, base_dir)
    max_conf = max(confs) if confs else 0.0

    annotated_b64 = None
    if _to_bool(return_annotated):
        import cv2

        annotated = result.plot()
        ok, encoded = cv2.imencode(".jpg", annotated)
        if not ok:
            raise RuntimeError("Failed to encode annotated image")
        annotated_b64 = base64.b64encode(encoded.tobytes()).decode("utf-8")
    response = {
        "status": "ok",
        "image_id": image_id,
        "filename": filename,
        "stored_path": stored_rel_path,
        "meta": {
            "timestamp_utc": timestamp,
            "user_id": user_id,
            "device_id": device_id,
            "field_id": field_id,
        },
        "detections": detections,
        "max_confidence": float(max_conf),
        "count": len(detections),
    }

    if annotated_b64 is not None:
        response["annotated_image_base64"] = annotated_b64
        response["annotated_image_format"] = "jpg"

    return response


# =========================================================
# Hardware Logging Endpoint
# =========================================================


class HardwareLogRequest(BaseModel):
    node_id: int = Field(..., gt=0)
    temperature_air: Optional[float] = Field(None, ge=-40, le=85)
    humidity_air: Optional[float] = Field(None, ge=0, le=100)
    light_intensity: Optional[float] = Field(None, ge=0, le=9999.99)
    co2: Optional[float] = Field(None, ge=0, le=9999.99)
    temperature_soil: Optional[float] = Field(None, ge=-40, le=85)
    humidity_soil: Optional[float] = Field(None, ge=0, le=100)
    conductivity: Optional[float] = Field(None, ge=0, le=999.99)
    phosphorus: Optional[float] = Field(None, ge=0, le=999.99)
    potassium: Optional[float] = Field(None, ge=0, le=999.99)
    nitrogen: Optional[float] = Field(None, ge=0, le=999.99)
    soil_moisture: Optional[float] = Field(None, ge=0, le=100)
    soil_ph: Optional[float] = Field(None, ge=0, le=14)
    battery_level: Optional[float] = Field(None, ge=0, le=100)
    signal_strength: Optional[int] = None
    created_at: Optional[datetime] = None


def _normalize_hw_created_at(ts: Optional[datetime]) -> datetime:
    if ts is None:
        return datetime.now(timezone.utc)
    if ts.tzinfo is not None:
        return ts.astimezone(timezone.utc).replace(tzinfo=None)
    return ts


@app.post("/devices/{device_id}/log", status_code=201)
def ingest_hardware_log(
    device_id: int,
    payload: HardwareLogRequest,
    db: Session = Depends(get_db),
):
    try:
        device_exists = db.execute(
            text("SELECT 1 FROM Devices WHERE device_id = :device_id LIMIT 1"),
            {"device_id": device_id},
        ).first()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to validate device")

    if not device_exists:
        raise HTTPException(status_code=404, detail="Device not found")

    try:
        node_row = db.execute(
            text(
                """
                SELECT 1
                FROM SensingNodes
                WHERE node_id = :node_id AND device_id = :device_id
                LIMIT 1
                """
            ),
            {"node_id": payload.node_id, "device_id": device_id},
        ).first()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to validate node")

    if not node_row:
        raise HTTPException(status_code=409, detail="Node does not belong to this device")

    payload_data = payload.model_dump(exclude_none=True)
    sensor_fields = set(payload_data.keys()) - {"node_id", "created_at"}
    if not sensor_fields:
        raise HTTPException(status_code=400, detail="At least one sensor field is required")

    if "created_at" in payload_data:
        payload_data["created_at"] = _normalize_hw_created_at(payload_data["created_at"])

    columns = ["device_id"] + list(payload_data.keys())
    params = {"device_id": device_id, **payload_data}
    placeholders = [f":{col}" for col in columns]

    insert_sql = text(
        f"INSERT INTO SensorLog ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
    )

    try:
        result = db.execute(insert_sql, params)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to store sensor log")

    return {
        "status": "ok",
        "device_id": device_id,
        "node_id": payload.node_id,
        "log_id": getattr(result, "lastrowid", None),
        "created_at": payload_data.get("created_at"),
        "saved_fields": [
            col for col in columns if col not in {"device_id", "node_id", "created_at"}
        ],
        "received_at": datetime.now(timezone.utc),
    }

