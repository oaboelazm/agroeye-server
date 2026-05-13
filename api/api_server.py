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

from fastapi import APIRouter, FastAPI, UploadFile, File, Form, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
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

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
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

    if len(clean_password.encode("utf-8")) > 72:
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
        text("SELECT farm_id, name, location, area_size FROM Farms WHERE user_id = :uid AND deleted_at IS NULL"),
        {"uid": data.user_id}
    ).mappings().all()
    return {"farms": [dict(r) for r in rows]}


@app.post("/mobile/home/get-fields")
def get_fields(data: FarmFieldsRequest, db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT field_id, name, crop_type, area_size FROM Fields WHERE farm_id = :fid AND deleted_at IS NULL"),
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
            WHERE farm_id = :fid AND deleted_at IS NULL
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
        text("UPDATE Farms SET deleted_at = NOW() WHERE farm_id = :fid"),
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
            WHERE field_id = :fid AND deleted_at IS NULL
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
        text("UPDATE Fields SET deleted_at = NOW() WHERE field_id = :fid"),
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


def _generate_recommendation(disease: str) -> str:
    recommendations = {
        "ripe": "Fruit is ripe and ready for harvest. Schedule picking within 2-3 days.",
        "unripe": "Fruit is still developing. Maintain current care routine and monitor weekly.",
        "blight": "Apply copper-based fungicide immediately. Remove affected leaves and improve air circulation.",
        "leaf_blight": "Apply copper-based fungicide immediately. Remove affected leaves and improve air circulation.",
        "early_blight": "Apply fungicide (chlorothalonil or mancozeb). Practice crop rotation next season.",
        "late_blight": "Apply metalaxyl-based fungicide. Destroy severely infected plants to prevent spread.",
        "powdery_mildew": "Apply sulfur-based fungicide or neem oil. Ensure adequate spacing between plants.",
        "downy_mildew": "Apply fungicide (metalaxyl or fosetyl-Al). Reduce humidity and avoid overhead watering.",
        "rust": "Apply fungicide (tebuconazole or propiconazole). Remove and destroy infected tissue.",
        "healthy": "No disease detected. Continue regular monitoring and preventive care.",
    }
    key = disease.lower().replace(" ", "_")
    return recommendations.get(key, f"Monitor the detected condition ({disease}) and consult an agronomist for targeted treatment.")


@app.post("/ai/vision/analyze")
async def ai_vision_analyze(
    image_file: UploadFile = File(...),
    device_id: int = Form(...),
    field_id: int = Form(...),
    user_id: Optional[int] = Form(None),
    return_annotated: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    timestamp = datetime.now(timezone.utc)
    ts_str = timestamp.strftime("%Y%m%dT%H%M%SZ")
    ext = os.path.splitext(image_file.filename or "")[1].lstrip(".") or "jpg"

    image_id = str(uuid.uuid4())
    filename = f"scan_{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    content = await image_file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    model = _get_vision_model()
    results = model.predict(source=file_path, verbose=False)
    result = results[0]

    names = getattr(result, "names", None) or getattr(model, "names", {})
    detections = []
    confs = []
    top_disease = "Unknown"
    max_conf = 0.0
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
        max_conf = max(confs)
        top_disease = detections[confs.index(max_conf)]["label"]

    recommendation = _generate_recommendation(top_disease)

    db.execute(
        text("""
            INSERT INTO Images (image_id, device_id, field_id, image_path, capture_timestamp, file_size)
            VALUES (:iid, :did, :fid, :path, :ts, :size)
        """),
        {
            "iid": image_id,
            "did": device_id,
            "fid": field_id,
            "path": filename,
            "ts": timestamp,
            "size": len(content),
        },
    )

    db.execute(
        text("""
            INSERT INTO AIResults (image_id, disease_detected, confidence_score, recommendation, analysis_timestamp)
            VALUES (:iid, :disease, :confidence, :recommendation, :ts)
        """),
        {
            "iid": image_id,
            "disease": top_disease,
            "confidence": round(max_conf, 4),
            "recommendation": recommendation,
            "ts": timestamp,
        },
    )
    db.commit()

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
        "meta": {
            "timestamp_utc": ts_str,
            "user_id": user_id,
            "device_id": device_id,
            "field_id": field_id,
        },
        "detections": detections,
        "max_confidence": float(max_conf),
        "count": len(detections),
        "analysis": {
            "disease_detected": top_disease,
            "confidence_score": float(max_conf),
            "recommendation": recommendation,
        },
    }

    if annotated_b64 is not None:
        response["annotated_image_base64"] = annotated_b64
        response["annotated_image_format"] = "jpg"

    return response


# =========================================================
# Hardware — Base Station API Section
# =========================================================
# Three main APIs:
#   API 1  → POST /hardware/nodes/upload   (raw node readings → SensorLog)
#   API 2  → POST /hardware/field/decide   (processed → SensorReadings + AI → Events)
#   API 3  → POST /hardware/field/sync     (offline sync → SensorLog + SensorReadings + Events)
# =========================================================

# ── Helper ─────────────────────────────────────────────────

def _validate_base_station(db: Session, bs_id: int, field_id: int):
    row = db.execute(
        text("SELECT 1 FROM Devices WHERE device_id = :did AND field_id = :fid LIMIT 1"),
        {"did": bs_id, "fid": field_id},
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Base station not found in this field")


# ═══════════════════════════════════════════════════════════
# API 1 – Upload Raw Sensing Node Readings → SensorLog
# ═══════════════════════════════════════════════════════════

class NodeReadingPayload(BaseModel):
    node_id: str = Field(..., min_length=1, max_length=50)
    soil_moisture: Optional[float] = None
    soil_ph: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    light_intensity: Optional[float] = None
    water_level: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    battery_level: Optional[float] = None
    signal_strength: Optional[int] = None
    timestamp: Optional[datetime] = None


class NodesUploadRequest(BaseModel):
    base_station_id: int = Field(..., gt=0)
    field_id: int = Field(..., gt=0)
    timestamp: Optional[datetime] = None
    nodes: list[NodeReadingPayload] = Field(..., min_length=1)


_COL_MAP_NODE_TO_SENSORLOG = {
    "temperature": "temperature_soil",
    "humidity": "humidity_soil",
    "soil_moisture": "soil_moisture",
    "soil_ph": "soil_ph",
    "light_intensity": "light_intensity",
    "nitrogen": "nitrogen",
    "phosphorus": "phosphorus",
    "potassium": "potassium",
    "battery_level": "battery_level",
    "signal_strength": "signal_strength",
    "node_id": "node_id",
}


@app.post("/hardware/nodes/upload", status_code=201)
def upload_node_readings(
    payload: NodesUploadRequest,
    db: Session = Depends(get_db),
):
    """
    API 1: Base station uploads raw readings from all sensing nodes
           into the SensorLog table.
    """
    _validate_base_station(db, payload.base_station_id, payload.field_id)
    now = payload.timestamp or datetime.now(timezone.utc)
    stored = 0
    errors = []

    for idx, node in enumerate(payload.nodes):
        node_data = node.model_dump(exclude_none=True)

        mapped = {"device_id": payload.base_station_id}
        for req_key, db_col in _COL_MAP_NODE_TO_SENSORLOG.items():
            if req_key in node_data:
                mapped[db_col] = node_data[req_key]

        sensor_keys = [k for k in mapped if k not in ("device_id", "node_id")]
        if not sensor_keys:
            errors.append({"index": idx, "node_id": node.node_id, "error": "no sensor data"})
            continue

        mapped["created_at"] = node.timestamp or now
        columns = list(mapped.keys())
        placeholders = [f":{col}" for col in columns]

        try:
            db.execute(
                text(f"INSERT INTO SensorLog ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"),
                mapped,
            )
            stored += 1
        except Exception as e:
            db.rollback()
            errors.append({"index": idx, "node_id": node.node_id, "error": str(e)})

    if stored > 0:
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to commit readings")

    return {
        "status": "ok",
        "base_station_id": payload.base_station_id,
        "field_id": payload.field_id,
        "nodes_received": len(payload.nodes),
        "nodes_stored": stored,
        "errors": errors if errors else None,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════════
# API 2 – Send Processed Readings → Cloud AI → Events
# ═══════════════════════════════════════════════════════════

class FieldDecideRequest(BaseModel):
    base_station_id: int = Field(..., gt=0)
    field_id: int = Field(..., gt=0)
    timestamp: Optional[datetime] = None
    aggregation_method: str = "average"
    node_count: int = Field(1, ge=1)
    avg_soil_moisture: Optional[float] = None
    avg_temperature: Optional[float] = None
    avg_humidity: Optional[float] = None
    avg_soil_ph: Optional[float] = None
    avg_light_intensity: Optional[float] = None
    avg_nitrogen: Optional[float] = None
    avg_phosphorus: Optional[float] = None
    avg_potassium: Optional[float] = None


@app.post("/hardware/field/decide")
def request_field_decision(
    payload: FieldDecideRequest,
    db: Session = Depends(get_db),
):
    """
    API 2: Base station sends processed (averaged) field readings.
    1. Store in SensorReadings table
    2. Run Cloud AI decision
    3. Store decision in Events table
    4. Return decision + event_id to base station for execution
    """
    _validate_base_station(db, payload.base_station_id, payload.field_id)
    now = payload.timestamp or datetime.now(timezone.utc)

    # ── 1. Store processed reading in SensorReadings ──────
    reading_id = None
    try:
        r_result = db.execute(
            text("""
                INSERT INTO SensorReadings
                    (device_id, timestamp,
                     temperature_soil, humidity_soil, soil_moisture,
                     soil_ph, nitrogen, phosphorus, potassium,
                     light_intensity)
                VALUES
                    (:did, :ts,
                     :temp_soil, :hum_soil, :soil_moist,
                     :ph, :n, :p, :k,
                     :light)
            """),
            {
                "did": payload.base_station_id,
                "ts": now,
                "temp_soil": payload.avg_temperature,
                "hum_soil": payload.avg_humidity,
                "soil_moist": payload.avg_soil_moisture,
                "ph": payload.avg_soil_ph,
                "n": payload.avg_nitrogen,
                "p": payload.avg_phosphorus,
                "k": payload.avg_potassium,
                "light": payload.avg_light_intensity,
            },
        )
        db.commit()
        reading_id = getattr(r_result, "lastrowid", None)
    except Exception:
        db.rollback()
        logger.exception("Failed to store processed reading")
        raise HTTPException(status_code=500, detail="Failed to store processed reading")

    # ── 2. Run Cloud AI Decision ──────────────────────────
    try:
        runtime = _get_decision_runtime()
        ts_iso = now.isoformat() if isinstance(now, datetime) else datetime.now(timezone.utc).isoformat()

        ai_sensors = {}
        if payload.avg_temperature is not None:
            ai_sensors["air_temperature"] = payload.avg_temperature
        if payload.avg_humidity is not None:
            ai_sensors["air_humidity"] = payload.avg_humidity
        if payload.avg_soil_moisture is not None:
            ai_sensors["soil_moisture"] = payload.avg_soil_moisture
        if payload.avg_soil_ph is not None:
            ai_sensors["soil_ph"] = payload.avg_soil_ph
        if payload.avg_nitrogen is not None:
            ai_sensors["soil_n"] = payload.avg_nitrogen
        if payload.avg_phosphorus is not None:
            ai_sensors["soil_p"] = payload.avg_phosphorus
        if payload.avg_potassium is not None:
            ai_sensors["soil_k"] = payload.avg_potassium
        if payload.avg_light_intensity is not None:
            ai_sensors["light_lux"] = payload.avg_light_intensity

        ai_result = runtime.decide(ts_iso, ai_sensors)
    except Exception as e:
        logger.exception("Cloud AI decision failed")
        raise HTTPException(status_code=500, detail=f"AI decision failed: {str(e)}")

    # ── 3. Store AI decision in Events table ──────────────
    event_id = None
    try:
        actions_json = json.dumps(ai_result.get("actions", {}))
        sensor_json = json.dumps(ai_sensors)
        quality = ai_result.get("quality_score_pct", 0)
        confidence = quality / 100.0
        rationale = ai_result.get("rationale")

        ev_result = db.execute(
            text("""
                INSERT INTO Events
                    (device_id, field_id, event_type,
                     actions, sensor_data, rationale,
                     confidence, quality_score)
                VALUES
                    (:did, :fid, 'cloud_ai',
                     :actions, :sensor, :rationale,
                     :confidence, :quality)
            """),
            {
                "did": payload.base_station_id,
                "fid": payload.field_id,
                "actions": actions_json,
                "sensor": sensor_json,
                "rationale": rationale,
                "confidence": confidence,
                "quality": quality,
            },
        )
        db.commit()
        event_id = getattr(ev_result, "lastrowid", None)
    except Exception:
        db.rollback()
        logger.warning("Failed to store AI event (non-critical)")

    ai_actions = ai_result.get("actions", {})

    return {
        "status": "ok",
        "base_station_id": payload.base_station_id,
        "field_id": payload.field_id,
        "reading_id": reading_id,
        "event_id": event_id,
        "decision": {
            "actions": ai_actions,
            "rationale": ai_result.get("rationale"),
            "quality_score_pct": ai_result.get("quality_score_pct"),
            "safety": ai_result.get("safety"),
        },
        "timestamp_utc": ai_result.get("timestamp_utc"),
    }


# ═══════════════════════════════════════════════════════════
# API 3 – Offline Sync After Reconnection
# ═══════════════════════════════════════════════════════════

class SyncNodeReading(BaseModel):
    node_id: str = Field(..., min_length=1)
    soil_moisture: Optional[float] = None
    soil_ph: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    light_intensity: Optional[float] = None
    water_level: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    battery_level: Optional[float] = None
    signal_strength: Optional[int] = None
    timestamp: Optional[datetime] = None


class SyncProcessedReading(BaseModel):
    aggregation_method: str = "average"
    node_count: int = 1
    avg_soil_moisture: Optional[float] = None
    avg_temperature: Optional[float] = None
    avg_humidity: Optional[float] = None
    avg_soil_ph: Optional[float] = None
    avg_light_intensity: Optional[float] = None
    avg_nitrogen: Optional[float] = None
    avg_phosphorus: Optional[float] = None
    avg_potassium: Optional[float] = None
    timestamp: Optional[datetime] = None


class SyncDecision(BaseModel):
    event_type: str = "local_ai"
    actions: dict = Field(default_factory=dict)
    confidence: float = 0.0
    is_executed: bool = True
    executed_at: Optional[datetime] = None
    timestamp: Optional[datetime] = None


class OfflineSyncRequest(BaseModel):
    base_station_id: int = Field(..., gt=0)
    field_id: int = Field(..., gt=0)
    raw_readings: list[SyncNodeReading] = Field(default_factory=list)
    processed_readings: list[SyncProcessedReading] = Field(default_factory=list)
    local_decisions: list[SyncDecision] = Field(default_factory=list)


@app.post("/hardware/field/sync", status_code=201)
def sync_offline_data(
    payload: OfflineSyncRequest,
    db: Session = Depends(get_db),
):
    """
    API 3: Base station reconnects and syncs all offline data.
    - Raw node readings   → SensorLog
    - Processed readings  → SensorReadings
    - Local AI decisions  → Events (is_synced = FALSE)
    """
    _validate_base_station(db, payload.base_station_id, payload.field_id)
    now = datetime.now(timezone.utc)
    readings_stored = 0
    processed_stored = 0
    decisions_stored = 0
    errors = []

    # ── 1. Raw node readings → SensorLog ──────────────────
    for idx, node in enumerate(payload.raw_readings):
        node_data = node.model_dump(exclude_none=True)
        mapped = {"device_id": payload.base_station_id}
        for req_key, db_col in _COL_MAP_NODE_TO_SENSORLOG.items():
            if req_key in node_data:
                mapped[db_col] = node_data[req_key]

        sensor_keys = [k for k in mapped if k not in ("device_id", "node_id")]
        if not sensor_keys:
            continue

        mapped["created_at"] = node.timestamp or now
        columns = list(mapped.keys())
        placeholders = [f":{col}" for col in columns]

        try:
            db.execute(
                text(f"INSERT INTO SensorLog ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"),
                mapped,
            )
            readings_stored += 1
        except Exception as e:
            errors.append(f"raw_reading[{idx}]: {str(e)}")

    # ── 2. Processed readings → SensorReadings ────────────
    for idx, pr in enumerate(payload.processed_readings):
        try:
            db.execute(
                text("""
                    INSERT INTO SensorReadings
                        (device_id, timestamp,
                         temperature_soil, humidity_soil, soil_moisture,
                         soil_ph, nitrogen, phosphorus, potassium,
                         light_intensity)
                    VALUES
                        (:did, :ts,
                         :temp_soil, :hum_soil, :soil_moist,
                         :ph, :n, :p, :k,
                         :light)
                """),
                {
                    "did": payload.base_station_id,
                    "ts": pr.timestamp or now,
                    "temp_soil": pr.avg_temperature,
                    "hum_soil": pr.avg_humidity,
                    "soil_moist": pr.avg_soil_moisture,
                    "ph": pr.avg_soil_ph,
                    "n": pr.avg_nitrogen,
                    "p": pr.avg_phosphorus,
                    "k": pr.avg_potassium,
                    "light": pr.avg_light_intensity,
                },
            )
            processed_stored += 1
        except Exception as e:
            errors.append(f"processed_reading[{idx}]: {str(e)}")

    # ── 3. Local AI decisions → Events ────────────────────
    for idx, dec in enumerate(payload.local_decisions):
        actions_json = json.dumps(dec.actions)
        try:
            db.execute(
                text("""
                    INSERT INTO Events
                        (device_id, field_id, event_type,
                         actions, confidence,
                         is_executed, executed_at)
                    VALUES
                        (:did, :fid, :etype,
                         :actions, :confidence,
                         :executed, :executed_at)
                """),
                {
                    "did": payload.base_station_id,
                    "fid": payload.field_id,
                    "etype": dec.event_type,
                    "actions": actions_json,
                    "confidence": dec.confidence,
                    "executed": dec.is_executed,
                    "executed_at": dec.executed_at or now,
                },
            )
            decisions_stored += 1
        except Exception as e:
            errors.append(f"decision[{idx}]: {str(e)}")

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to commit sync data")

    return {
        "status": "ok",
        "base_station_id": payload.base_station_id,
        "field_id": payload.field_id,
        "raw_readings_stored": readings_stored,
        "processed_readings_stored": processed_stored,
        "local_decisions_stored": decisions_stored,
        "errors": errors if errors else None,
        "synced_at": now.isoformat(),
    }


# =========================================================
# Web App Endpoints (POST-based)
# =========================================================

import webapp_schemas as web_schemas

webapp_router = APIRouter(prefix="/webapp", tags=["Web App"])


def _get_user_id_from_token(token: str = Depends(oauth2_scheme)) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("user_id")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return uid
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _get_farm_ids_for_user(uid: int, db: Session) -> list[int]:
    rows = db.execute(
        text("SELECT farm_id FROM Farms WHERE user_id = :uid AND deleted_at IS NULL AND is_Archived = 0"),
        {"uid": uid}
    ).mappings().all()
    return [r["farm_id"] for r in rows]


def _get_field_ids_for_farms(farm_ids: list[int], db: Session) -> list[int]:
    if not farm_ids:
        return []
    placeholders = ", ".join([f":fid_{i}" for i in range(len(farm_ids))])
    params = {f"fid_{i}": fid for i, fid in enumerate(farm_ids)}
    rows = db.execute(
        text(f"SELECT field_id FROM Fields WHERE farm_id IN ({placeholders}) AND deleted_at IS NULL"),
        params
    ).mappings().all()
    return [r["field_id"] for r in rows]


def _get_device_ids_for_fields(field_ids: list[int], db: Session) -> list[int]:
    if not field_ids:
        return []
    placeholders = ", ".join([f":fid_{i}" for i in range(len(field_ids))])
    params = {f"fid_{i}": fid for i, fid in enumerate(field_ids)}
    rows = db.execute(
        text(f"SELECT device_id FROM Devices WHERE field_id IN ({placeholders})"),
        params
    ).mappings().all()
    return [r["device_id"] for r in rows]


@webapp_router.post("/dashboard")
def web_dashboard(
    data: web_schemas.WebDashboardRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id:
        if data.farm_id not in farm_ids:
            raise HTTPException(status_code=403, detail="Farm not accessible")
        farm_ids = [data.farm_id]

    if not farm_ids:
        return web_schemas.WebDashboardData()

    field_ids = _get_field_ids_for_farms(farm_ids, db)
    device_ids = _get_device_ids_for_fields(field_ids, db)

    total_fields = len(field_ids)
    total_devices = len(device_ids)

    active_devices = 0
    total_nodes = 0
    active_nodes = 0
    low_battery_nodes = 0
    today_irrigation_events = 0
    today_irrigation_duration = 0.0
    alerts_count = 0

    if device_ids:
        placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
        params = {f"did_{i}": did for i, did in enumerate(device_ids)}

        active_row = db.execute(
            text(f"SELECT COUNT(*) as c FROM Devices WHERE device_id IN ({placeholders}) AND status = 'active'"),
            params
        ).mappings().first()
        active_devices = active_row["c"] if active_row else 0

        node_row = db.execute(
            text(f"SELECT COUNT(*) as c FROM SensingNodes WHERE device_id IN ({placeholders})"),
            params
        ).mappings().first()
        total_nodes = node_row["c"] if node_row else 0

        active_node_row = db.execute(
            text(f"SELECT COUNT(*) as c FROM SensingNodes WHERE device_id IN ({placeholders}) AND status = 'active'"),
            params
        ).mappings().first()
        active_nodes = active_node_row["c"] if active_node_row else 0

        lb_row = db.execute(
            text(f"SELECT COUNT(*) as c FROM SensingNodes WHERE device_id IN ({placeholders}) AND battery_level < 20"),
            params
        ).mappings().first()
        low_battery_nodes = lb_row["c"] if lb_row else 0

    if field_ids:
        fid_placeholders = ", ".join([f":fid_{i}" for i in range(len(field_ids))])
        fid_params = {f"fid_{i}": fid for i, fid in enumerate(field_ids)}

        today_irr = db.execute(
            text(f"""
                SELECT COUNT(*) as c, COALESCE(SUM(TIMESTAMPDIFF(MINUTE, created_at, executed_at)), 0) as dur
                FROM Events
                WHERE field_id IN ({fid_placeholders})
                AND DATE(created_at) = CURDATE()
            """),
            fid_params
        ).mappings().first()
        if today_irr:
            today_irrigation_events = today_irr["c"]
            today_irrigation_duration = float(today_irr["dur"])

        alert_row = db.execute(
            text(f"""
                SELECT COUNT(*) as c FROM Notifications
                WHERE farm_id IN ({', '.join([f':afid_{i}' for i in range(len(farm_ids))])})
                AND is_read = 0
            """),
            {f"afid_{i}": fid for i, fid in enumerate(farm_ids)}
        ).mappings().first()
        alerts_count = alert_row["c"] if alert_row else 0

    unread_row = db.execute(
        text("SELECT COUNT(*) as c FROM Notifications WHERE user_id = :uid AND is_read = 0"),
        {"uid": uid}
    ).mappings().first()
    unread_notifications = unread_row["c"] if unread_row else 0

    return web_schemas.WebDashboardData(
        total_fields=total_fields,
        total_devices=total_devices,
        active_devices=active_devices,
        total_nodes=total_nodes,
        active_nodes=active_nodes,
        low_battery_nodes=low_battery_nodes,
        alerts_count=alerts_count,
        unread_notifications=unread_notifications,
        today_irrigation_events=today_irrigation_events,
        today_irrigation_duration_minutes=today_irrigation_duration,
    )


@webapp_router.post("/fields/list")
def web_fields_list(
    data: web_schemas.WebFieldsListRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    rows = db.execute(
        text("SELECT field_id, name, crop_type, area_size FROM Fields WHERE farm_id = :fid AND deleted_at IS NULL"),
        {"fid": data.farm_id}
    ).mappings().all()

    result = []
    for r in rows:
        dev_count = db.execute(
            text("SELECT COUNT(*) as c FROM Devices WHERE field_id = :fid"),
            {"fid": r["field_id"]}
        ).mappings().first()
        result.append({
            "field_id": r["field_id"],
            "name": r["name"],
            "crop_type": r["crop_type"],
            "area_size": r["area_size"],
            "devices_count": dev_count["c"] if dev_count else 0,
        })
    return {"fields": result}


@webapp_router.post("/fields/overview")
def web_field_overview(
    data: web_schemas.WebFieldOverviewRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field = db.execute(
        text("""
            SELECT f.field_id, f.name, f.crop_type, f.area_size, f.farm_id
            FROM Fields f
            JOIN Farms fa ON f.farm_id = fa.farm_id
            WHERE f.field_id = :fid AND fa.user_id = :uid AND f.deleted_at IS NULL
        """),
        {"fid": data.field_id, "uid": uid}
    ).mappings().first()

    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    device_ids = _get_device_ids_for_fields([data.field_id], db)
    devices_count = len(device_ids)

    active_row = db.execute(
        text("SELECT COUNT(*) as c FROM Devices WHERE field_id = :fid AND status = 'active'"),
        {"fid": data.field_id}
    ).mappings().first()
    active_devices = active_row["c"] if active_row else 0

    avg_data = None
    if device_ids:
        placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
        params = {f"did_{i}": did for i, did in enumerate(device_ids)}
        avg_data = db.execute(
            text(f"""
                SELECT
                    AVG(temperature_air) AS avg_temperature_air,
                    AVG(humidity_air) AS avg_humidity_air,
                    AVG(soil_moisture) AS avg_soil_moisture,
                    AVG(soil_ph) AS avg_soil_ph,
                    AVG(nitrogen) AS avg_nitrogen,
                    AVG(phosphorus) AS avg_phosphorus,
                    AVG(potassium) AS avg_potassium
                FROM SensorReadings
                WHERE device_id IN ({placeholders})
            """),
            params
        ).mappings().first()

    last_irr = db.execute(
        text("""
            SELECT created_at AS start_time FROM Events
            WHERE field_id = :fid AND created_at <= NOW()
            ORDER BY created_at DESC LIMIT 1
        """),
        {"fid": data.field_id}
    ).mappings().first()

    next_irr = db.execute(
        text("""
            SELECT created_at AS start_time FROM Events
            WHERE field_id = :fid AND created_at > NOW()
            ORDER BY created_at ASC LIMIT 1
        """),
        {"fid": data.field_id}
    ).mappings().first()

    return web_schemas.WebFieldOverview(
        field_id=field["field_id"],
        name=field["name"],
        crop_type=field["crop_type"],
        area_size=field["area_size"],
        devices_count=devices_count,
        active_devices=active_devices,
        avg_temperature_air=avg_data["avg_temperature_air"] if avg_data else None,
        avg_humidity_air=avg_data["avg_humidity_air"] if avg_data else None,
        avg_soil_moisture=avg_data["avg_soil_moisture"] if avg_data else None,
        avg_soil_ph=avg_data["avg_soil_ph"] if avg_data else None,
        avg_nitrogen=avg_data["avg_nitrogen"] if avg_data else None,
        avg_phosphorus=avg_data["avg_phosphorus"] if avg_data else None,
        avg_potassium=avg_data["avg_potassium"] if avg_data else None,
        last_irrigation=last_irr["start_time"] if last_irr else None,
        next_irrigation=next_irr["start_time"] if next_irr else None,
    )


@webapp_router.post("/devices/list")
def web_devices_list(
    data: web_schemas.WebDevicesListRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    field_ids = _get_field_ids_for_farms([data.farm_id], db)
    if not field_ids:
        return {"devices": []}

    placeholders = ", ".join([f":fid_{i}" for i in range(len(field_ids))])
    params = {f"fid_{i}": fid for i, fid in enumerate(field_ids)}

    rows = db.execute(
        text(f"""
            SELECT d.device_id, d.field_id, f.name AS field_name, d.device_type,
                   d.serial_number, d.status, d.location_coords
            FROM Devices d
            JOIN Fields f ON d.field_id = f.field_id
            WHERE d.field_id IN ({placeholders})
        """),
        params
    ).mappings().all()

    return {"devices": [dict(r) for r in rows]}


@webapp_router.post("/devices/details")
def web_device_details(
    data: web_schemas.WebDeviceDetailsRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    device = db.execute(
        text("""
            SELECT d.*, f.name AS field_name
            FROM Devices d
            JOIN Fields f ON d.field_id = f.field_id
            JOIN Farms fa ON f.farm_id = fa.farm_id
            WHERE d.device_id = :did AND fa.user_id = :uid
        """),
        {"did": data.device_id, "uid": uid}
    ).mappings().first()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    nodes_row = db.execute(
        text("SELECT COUNT(*) as c FROM SensingNodes WHERE device_id = :did"),
        {"did": data.device_id}
    ).mappings().first()
    nodes_count = nodes_row["c"] if nodes_row else 0

    active_nodes_row = db.execute(
        text("SELECT COUNT(*) as c FROM SensingNodes WHERE device_id = :did AND status = 'active'"),
        {"did": data.device_id}
    ).mappings().first()
    active_nodes = active_nodes_row["c"] if active_nodes_row else 0

    latest = db.execute(
        text("""
            SELECT * FROM SensorReadings
            WHERE device_id = :did
            ORDER BY timestamp DESC LIMIT 1
        """),
        {"did": data.device_id}
    ).mappings().first()

    latest_reading = None
    if latest:
        latest_reading = web_schemas.WebSensorData(
            reading_id=latest.get("reading_id"),
            device_id=latest["device_id"],
            timestamp=latest.get("timestamp"),
            temperature_air=latest.get("temperature_air"),
            humidity_air=latest.get("humidity_air"),
            temperature_soil=latest.get("temperature_soil"),
            humidity_soil=latest.get("humidity_soil"),
            soil_moisture=latest.get("soil_moisture"),
            soil_ph=latest.get("soil_ph"),
            nitrogen=latest.get("nitrogen"),
            phosphorus=latest.get("phosphorus"),
            potassium=latest.get("potassium"),
            conductivity=latest.get("conductivity"),
            light_intensity=latest.get("light_intensity"),
            co2=latest.get("co2"),
            battery_level=latest.get("battery_level"),
        )

    return web_schemas.WebDeviceDetail(
        device_id=device["device_id"],
        field_id=device["field_id"],
        field_name=device.get("field_name"),
        device_type=device["device_type"],
        serial_number=device["serial_number"],
        status=device["status"],
        location_coords=device.get("location_coords"),
        nodes_count=nodes_count,
        active_nodes=active_nodes,
        latest_reading=latest_reading,
    )


@webapp_router.post("/irrigation/upcoming")
def web_irrigation_upcoming(
    data: web_schemas.WebIrrigationUpcomingRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    field_ids = _get_field_ids_for_farms([data.farm_id], db)
    if not field_ids:
        return {"events": []}

    placeholders = ", ".join([f":fid_{i}" for i in range(len(field_ids))])
    params = {f"fid_{i}": fid for i, fid in enumerate(field_ids)}

    rows = db.execute(
        text(f"""
            SELECT e.event_id AS irrigation_id, e.field_id, f.name AS field_name,
                   e.created_at AS start_time, e.executed_at AS end_time,
                   IF(e.is_executed, 'completed', 'scheduled') AS status
            FROM Events e
            JOIN Fields f ON e.field_id = f.field_id
            WHERE e.field_id IN ({placeholders})
            AND e.created_at > NOW()
            ORDER BY e.created_at ASC
            LIMIT 5
        """),
        params
    ).mappings().all()

    events = []
    for r in rows:
        duration = None
        if r["start_time"] and r["end_time"]:
            duration = (r["end_time"] - r["start_time"]).total_seconds() / 60.0
        events.append(web_schemas.WebIrrigationEvent(
            irrigation_id=r["irrigation_id"],
            field_id=r["field_id"],
            field_name=r.get("field_name"),
            start_time=r.get("start_time"),
            end_time=r.get("end_time"),
            duration_minutes=duration if duration else 0,
            status=r.get("status", "scheduled"),
        ))

    return {"events": events}


@webapp_router.post("/irrigation/recent")
def web_irrigation_recent(
    data: web_schemas.WebIrrigationRecentRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    field_ids = _get_field_ids_for_farms([data.farm_id], db)
    if not field_ids:
        return {"events": []}

    placeholders = ", ".join([f":fid_{i}" for i in range(len(field_ids))])
    params = {f"fid_{i}": fid for i, fid in enumerate(field_ids)}

    rows = db.execute(
        text(f"""
            SELECT e.event_id AS irrigation_id, e.field_id, f.name AS field_name,
                   e.created_at AS start_time, e.executed_at AS end_time,
                   IF(e.is_executed, 'completed', 'scheduled') AS status
            FROM Events e
            JOIN Fields f ON e.field_id = f.field_id
            WHERE e.field_id IN ({placeholders})
            AND e.created_at <= NOW()
            ORDER BY e.created_at DESC
            LIMIT 10
        """),
        params
    ).mappings().all()

    events = []
    for r in rows:
        duration = None
        if r["start_time"] and r["end_time"]:
            duration = (r["end_time"] - r["start_time"]).total_seconds() / 60.0
        events.append(web_schemas.WebIrrigationEvent(
            irrigation_id=r["irrigation_id"],
            field_id=r["field_id"],
            field_name=r.get("field_name"),
            start_time=r.get("start_time"),
            end_time=r.get("end_time"),
            duration_minutes=duration if duration else 0,
            status=r.get("status", "completed"),
        ))

    return {"events": events}


@webapp_router.post("/irrigation/summary")
def web_irrigation_summary(
    data: web_schemas.WebIrrigationSummaryRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    field_ids = _get_field_ids_for_farms([data.farm_id], db)
    if not field_ids:
        return web_schemas.WebIrrigationSummary()

    placeholders = ", ".join([f":fid_{i}" for i in range(len(field_ids))])
    params = {f"fid_{i}": fid for i, fid in enumerate(field_ids)}

    today = db.execute(
        text(f"""
            SELECT COUNT(*) as c, COALESCE(SUM(TIMESTAMPDIFF(MINUTE, created_at, executed_at)), 0) as dur
            FROM Events
            WHERE field_id IN ({placeholders})
            AND DATE(created_at) = CURDATE()
        """),
        params
    ).mappings().first()

    week = db.execute(
        text(f"""
            SELECT COUNT(*) as c FROM Events
            WHERE field_id IN ({placeholders})
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        """),
        params
    ).mappings().first()

    month = db.execute(
        text(f"""
            SELECT COUNT(*) as c FROM Events
            WHERE field_id IN ({placeholders})
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        """),
        params
    ).mappings().first()

    return web_schemas.WebIrrigationSummary(
        today_events=today["c"] if today else 0,
        today_duration_minutes=float(today["dur"]) if today else 0.0,
        week_events=week["c"] if week else 0,
        month_events=month["c"] if month else 0,
    )


@webapp_router.post("/notifications/list")
def web_notifications_list(
    data: web_schemas.WebNotificationsListRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    rows = db.execute(
        text("""
            SELECT notification_id, type, message, is_read, sent_at
            FROM Notifications
            WHERE user_id = :uid AND farm_id = :fid
            ORDER BY sent_at DESC
            LIMIT 100
        """),
        {"uid": uid, "fid": data.farm_id}
    ).mappings().all()

    return {"notifications": [dict(r) for r in rows]}


@webapp_router.post("/notifications/unread-count")
def web_notifications_unread(
    data: web_schemas.WebNotificationsUnreadRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    row = db.execute(
        text("""
            SELECT COUNT(*) as c FROM Notifications
            WHERE user_id = :uid AND farm_id = :fid AND is_read = 0
        """),
        {"uid": uid, "fid": data.farm_id}
    ).mappings().first()

    return {"unread_count": row["c"] if row else 0}


@webapp_router.post("/notifications/mark-read")
def web_mark_notification_read(
    data: web_schemas.WebMarkNotificationReadRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    result = db.execute(
        text("""
            UPDATE Notifications SET is_read = 1
            WHERE notification_id = :nid AND user_id = :uid
        """),
        {"nid": data.notification_id, "uid": uid}
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"status": "success", "notification_id": data.notification_id}


@webapp_router.post("/reports/summary")
def web_reports_summary(
    data: web_schemas.WebReportsSummaryRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    field_ids = _get_field_ids_for_farms([data.farm_id], db)
    if not field_ids:
        return web_schemas.WebReportSummary()

    total_fields = len(field_ids)
    device_ids = _get_device_ids_for_fields(field_ids, db)
    total_devices = len(device_ids)

    irr_fid_ph = ", ".join([f":fid_{i}" for i in range(len(field_ids))])
    irr_fid_params = {f"fid_{i}": fid for i, fid in enumerate(field_ids)}
    irr_row = db.execute(
        text(f"SELECT COUNT(*) as c FROM Events WHERE field_id IN ({irr_fid_ph})"),
        irr_fid_params
    ).mappings().first()
    total_irrigation = irr_row["c"] if irr_row else 0

    avg_data = None
    if device_ids:
        placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
        params = {f"did_{i}": did for i, did in enumerate(device_ids)}
        avg_data = db.execute(
            text(f"""
                SELECT
                    AVG(temperature_air) AS avg_temperature_air,
                    AVG(humidity_air) AS avg_humidity_air,
                    AVG(soil_moisture) AS avg_soil_moisture,
                    AVG(soil_ph) AS avg_soil_ph,
                    AVG(nitrogen) AS avg_nitrogen,
                    AVG(phosphorus) AS avg_phosphorus,
                    AVG(potassium) AS avg_potassium
                FROM SensorReadings
                WHERE device_id IN ({placeholders})
            """),
            params
        ).mappings().first()

    return web_schemas.WebReportSummary(
        total_fields=total_fields,
        total_devices=total_devices,
        total_irrigation_events=total_irrigation,
        avg_temperature_air=avg_data["avg_temperature_air"] if avg_data else None,
        avg_humidity_air=avg_data["avg_humidity_air"] if avg_data else None,
        avg_soil_moisture=avg_data["avg_soil_moisture"] if avg_data else None,
        avg_soil_ph=avg_data["avg_soil_ph"] if avg_data else None,
        avg_nitrogen=avg_data["avg_nitrogen"] if avg_data else None,
        avg_phosphorus=avg_data["avg_phosphorus"] if avg_data else None,
        avg_potassium=avg_data["avg_potassium"] if avg_data else None,
    )


@webapp_router.post("/reports/field")
def web_report_field(
    data: web_schemas.WebReportFieldRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field = db.execute(
        text("""
            SELECT f.field_id, f.name
            FROM Fields f
            JOIN Farms fa ON f.farm_id = fa.farm_id
            WHERE f.field_id = :fid AND fa.user_id = :uid AND f.deleted_at IS NULL
        """),
        {"fid": data.field_id, "uid": uid}
    ).mappings().first()

    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    device_ids = _get_device_ids_for_fields([data.field_id], db)
    devices_count = len(device_ids)

    avg_data = None
    if device_ids:
        placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
        params = {f"did_{i}": did for i, did in enumerate(device_ids)}
        avg_data = db.execute(
            text(f"""
                SELECT
                    AVG(temperature_air) AS avg_temperature_air,
                    AVG(humidity_air) AS avg_humidity_air,
                    AVG(soil_moisture) AS avg_soil_moisture,
                    AVG(soil_ph) AS avg_soil_ph,
                    AVG(nitrogen) AS avg_nitrogen,
                    AVG(phosphorus) AS avg_phosphorus,
                    AVG(potassium) AS avg_potassium,
                    AVG(conductivity) AS avg_conductivity,
                    AVG(light_intensity) AS avg_light_intensity,
                    AVG(co2) AS avg_co2
                FROM SensorReadings
                WHERE device_id IN ({placeholders})
            """),
            params
        ).mappings().first()

    last_irr = db.execute(
        text("""
            SELECT created_at AS start_time FROM Events
            WHERE field_id = :fid AND created_at <= NOW()
            ORDER BY created_at DESC LIMIT 1
        """),
        {"fid": data.field_id}
    ).mappings().first()

    irr_30d = db.execute(
        text("""
            SELECT COUNT(*) as c FROM Events
            WHERE field_id = :fid AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        """),
        {"fid": data.field_id}
    ).mappings().first()

    return web_schemas.WebFieldReport(
        field_id=field["field_id"],
        field_name=field["name"],
        devices_count=devices_count,
        avg_temperature_air=avg_data["avg_temperature_air"] if avg_data else None,
        avg_humidity_air=avg_data["avg_humidity_air"] if avg_data else None,
        avg_soil_moisture=avg_data["avg_soil_moisture"] if avg_data else None,
        avg_soil_ph=avg_data["avg_soil_ph"] if avg_data else None,
        avg_nitrogen=avg_data["avg_nitrogen"] if avg_data else None,
        avg_phosphorus=avg_data["avg_phosphorus"] if avg_data else None,
        avg_potassium=avg_data["avg_potassium"] if avg_data else None,
        avg_conductivity=avg_data["avg_conductivity"] if avg_data else None,
        avg_light_intensity=avg_data["avg_light_intensity"] if avg_data else None,
        avg_co2=avg_data["avg_co2"] if avg_data else None,
        last_irrigation=last_irr["start_time"] if last_irr else None,
        irrigation_30d_count=irr_30d["c"] if irr_30d else 0,
    )


@webapp_router.post("/sensors/latest")
def web_sensors_latest(
    data: web_schemas.WebSensorsLatestRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    field_ids = []
    device_ids = []

    if data.device_id:
        device_ids = [data.device_id]
    elif data.farm_id:
        if data.farm_id not in farm_ids:
            raise HTTPException(status_code=403, detail="Farm not accessible")
        field_ids = _get_field_ids_for_farms([data.farm_id], db)
        device_ids = _get_device_ids_for_fields(field_ids, db)
    else:
        field_ids = _get_field_ids_for_farms(farm_ids, db)
        device_ids = _get_device_ids_for_fields(field_ids, db)

    if not device_ids:
        return {"readings": []}

    results = []
    for did in device_ids:
        row = db.execute(
            text("""
                SELECT * FROM SensorReadings
                WHERE device_id = :did
                ORDER BY timestamp DESC LIMIT 1
            """),
            {"did": did}
        ).mappings().first()
        if row:
            results.append(web_schemas.WebSensorData(
                reading_id=row.get("reading_id"),
                device_id=row["device_id"],
                timestamp=row.get("timestamp"),
                temperature_air=row.get("temperature_air"),
                humidity_air=row.get("humidity_air"),
                temperature_soil=row.get("temperature_soil"),
                humidity_soil=row.get("humidity_soil"),
                soil_moisture=row.get("soil_moisture"),
                soil_ph=row.get("soil_ph"),
                nitrogen=row.get("nitrogen"),
                phosphorus=row.get("phosphorus"),
                potassium=row.get("potassium"),
                conductivity=row.get("conductivity"),
                light_intensity=row.get("light_intensity"),
                co2=row.get("co2"),
                battery_level=row.get("battery_level"),
            ))

    return {"readings": results}


# =========================================================
# AI Chat Endpoints (AgroAssist)
# =========================================================

import json as _json
import httpx as _httpx

_CLOUDFLARE_AI_ACCOUNT_ID = os.environ.get("CLOUDFLARE_AI_ACCOUNT_ID", "")
_CLOUDFLARE_AI_API_TOKEN = os.environ.get("CLOUDFLARE_AI_API_TOKEN", "")
_CLOUDFLARE_AI_MODEL = os.environ.get(
    "CLOUDFLARE_AI_MODEL", "@cf/qwen/qwen3-30b-a3b-fp8"
)
_CLOUDFLARE_AI_URL = (
    f"https://api.cloudflare.com/client/v4/accounts/"
    f"{_CLOUDFLARE_AI_ACCOUNT_ID}/ai/run/{_CLOUDFLARE_AI_MODEL}"
)
_AI_HEADERS = {
    "Authorization": f"Bearer {_CLOUDFLARE_AI_API_TOKEN}",
    "Content-Type": "application/json",
}

_MAX_FARMS = 3
_MAX_FIELDS_PER_FARM = 3
_MAX_DEVICES_PER_FIELD = 5


def _ai_build_db_snapshot(uid: int, db: Session) -> str:
    try:
        farms = db.execute(
            text("SELECT farm_id, name FROM Farms WHERE user_id = :uid"),
            {"uid": uid},
        ).mappings().all()
        if not farms:
            return "No greenhouses found for this user."

        lines = [f"User has {len(farms)} greenhouses:"]
        for i, farm in enumerate(farms):
            if i >= _MAX_FARMS:
                lines.append(f"- ... and {len(farms) - i} more greenhouses")
                break
            farm_name = (farm["name"] or f"Greenhouse {farm['farm_id']}").strip()
            lines.append(f"- Greenhouse: {farm_name}")

            fields = db.execute(
                text(
                    "SELECT field_id, name, crop_type FROM Fields WHERE farm_id = :fid"
                ),
                {"fid": farm["farm_id"]},
            ).mappings().all()

            if not fields:
                lines.append("  - No fields")
                continue

            for j, field in enumerate(fields):
                if j >= _MAX_FIELDS_PER_FARM:
                    lines.append(f"  - ... and {len(fields) - j} more fields")
                    break
                field_name = (field["name"] or f"Field {field['field_id']}").strip()
                crop = (field["crop_type"] or "").strip()
                crop_label = f" (crop: {crop})" if crop else ""
                lines.append(f"  - Field: {field_name}{crop_label}")

                devices = db.execute(
                    text(
                        "SELECT device_id, device_type, serial_number "
                        "FROM Devices WHERE field_id = :fid"
                    ),
                    {"fid": field["field_id"]},
                ).mappings().all()

                if not devices:
                    lines.append("    - Devices: none")
                    continue

                for k, device in enumerate(devices):
                    if k >= _MAX_DEVICES_PER_FIELD:
                        lines.append(
                            f"    - ... and {len(devices) - k} more devices"
                        )
                        break
                    dtype = (device["device_type"] or "Device").strip()
                    serial = (device["serial_number"] or "").strip()
                    serial_label = f" (serial: {serial})" if serial else ""
                    lines.append(
                        f"    - Device: {dtype} #{device['device_id']}{serial_label}"
                    )

        return "\n".join(lines)
    except Exception as exc:
        logger.warning("build_db_snapshot error: %s", exc)
        return "Database snapshot unavailable."


def _ai_build_system_prompt(user_name: str, db_snapshot: str) -> str:
    name = (user_name or "User").strip() or "User"
    return (
        "You are AgroAssist, an AI assistant inside the AgroEye agriculture system.\n"
        "\n"
        f'Your role is to help the user named "{name}" with general questions, '
        "with strong expertise in agriculture and smart farming.\n"
        "\n"
        "Guidelines:\n"
        "- Be concise, clear, and practical.\n"
        "- Use simple language unless more detail is needed.\n"
        "- Prioritize accurate, real-world agricultural knowledge.\n"
        "- Don't use emojis at all, only words.\n"
        "- Don't say hello more than one time per session; avoid repeated greetings.\n"
        "- Answer must be in the same language as user input.\n"
        "- Use the name of the user mentioned above for better communication.\n"
        "- DON'T ANSWER ANYTHING EXCEPT AGRICULTURE RELATED QUESTIONS.\n"
        "\n"
        "Behavior:\n"
        "- Provide confident and reliable answers, especially for agriculture topics.\n"
        "- Base answers on trusted agricultural knowledge and best practices.\n"
        "- Use the provided context (sensor readings, environment data, "
        "and system details) to inform your answers.\n"
        "- Always consider the full context before responding.\n"
        "- Do not repeat greetings in every message.\n"
        "- If the request is unclear or missing details, ask for clarification.\n"
        "- Do not make up facts or uncertain information.\n"
        "\n"
        "Context Input:\n"
        "You may receive structured data along with the user message, such as:\n"
        "- Environmental conditions\n"
        "- System status or device data\n"
        "- Database Snapshot (user farms hierarchy)\n"
        "\n"
        "Database Snapshot:\n"
        f"{db_snapshot or 'No database context available.'}\n"
        "\n"
        "Use this information as background context to improve accuracy and relevance.\n"
        "\n"
        "Context:\n"
        "- You are part of a smart system, so responses should be structured "
        "and useful inside an app.\n"
        "- When relevant, suggest practical next steps or actions.\n"
        "\n"
        "Goal:\n"
        "Provide clear, accurate, and actionable answers with confidence.\n"
        "\n"
        "Understand user input intent clearly and respond accordingly."
    )


def _ai_build_suggestion_instruction() -> str:
    return (
        "You are generating follow-up suggestions for the user.\n"
        "Return ONLY valid JSON (no markdown, no code fences).\n"
        'Return a JSON array of exactly 3 objects with keys: title, subtitle, prompt.\n'
        "Keep them short and directly related to the user's last message."
    )


def _ai_parse_suggestions(content: str) -> list:
    try:
        trimmed = content.strip()
        start = trimmed.find("[")
        end = trimmed.rfind("]")
        if start != -1 and end != -1 and end > start:
            trimmed = trimmed[start : end + 1]
        decoded = _json.loads(trimmed)
        if not isinstance(decoded, list):
            return []
        result = []
        for raw in decoded:
            if not isinstance(raw, dict):
                continue
            title = (raw.get("title") or "").strip()
            subtitle = (raw.get("subtitle") or "").strip()
            prompt = (raw.get("prompt") or "").strip()
            if title and prompt:
                result.append(
                    {"title": title, "subtitle": subtitle, "prompt": prompt}
                )
        return result
    except Exception:
        return []


# ── Synchronous Ask ──


@webapp_router.post("/ai/ask")
def web_ai_ask(
    data: web_schemas.WebAIAssistRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    question = (data.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    user_row = db.execute(
        text("SELECT username, email FROM Users WHERE user_id = :uid"),
        {"uid": uid},
    ).mappings().first()
    user_name = (user_row["username"] or user_row["email"].split("@")[0] or "User") if user_row else "User"

    db_snapshot = data.dbSnapshot or _ai_build_db_snapshot(uid, db)
    system_prompt = _ai_build_system_prompt(user_name, db_snapshot)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]

    try:
        with _httpx.Client(timeout=_httpx.Timeout(120.0)) as client:
            resp = client.post(
                _CLOUDFLARE_AI_URL,
                json={"messages": messages},
                headers=_AI_HEADERS,
            )
            resp.raise_for_status()
            body = resp.json()
    except Exception as exc:
        logger.error("AI ask error: %s", exc)
        raise HTTPException(status_code=502, detail="AI service unavailable")

    answer = (
        body.get("result", {})
        .get("choices", [{}])[0]
        .get("message", {})
        .get("content")
        or body.get("result", {}).get("response")
        or "No response"
    )

    return {
        "answer": answer,
        "type": "agro_assist_response",
        "meta": {
            "user": user_name,
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        },
    }


# ── Streaming Ask ──


@webapp_router.post("/ai/ask-stream")
async def web_ai_ask_stream(
    data: web_schemas.WebAIAssistRequest,
    request: Request,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    question = (data.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    user_row = db.execute(
        text("SELECT username, email FROM Users WHERE user_id = :uid"),
        {"uid": uid},
    ).mappings().first()
    user_name = (user_row["username"] or user_row["email"].split("@")[0] or "User") if user_row else "User"

    db_snapshot = data.dbSnapshot or _ai_build_db_snapshot(uid, db)
    system_prompt = _ai_build_system_prompt(user_name, db_snapshot)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]

    async def _event_stream():
        full_answer = ""
        try:
            async with _httpx.AsyncClient(timeout=_httpx.Timeout(120.0)) as client:
                async with client.stream(
                    "POST",
                    _CLOUDFLARE_AI_URL,
                    json={"messages": messages, "stream": True},
                    headers=_AI_HEADERS,
                ) as resp:
                    buffer = ""
                    async for chunk in resp.aiter_bytes():
                        if await request.is_disconnected():
                            yield f"data: {_json.dumps({'type': 'cancelled'})}\n\n"
                            return

                        buffer += chunk.decode()
                        lines = buffer.split("\n")
                        buffer = lines.pop() if lines else ""

                        for line in lines:
                            trimmed = line.strip()
                            if not trimmed or trimmed == "data: [DONE]":
                                continue

                            token = None
                            if trimmed.startswith("data: "):
                                try:
                                    parsed = _json.loads(trimmed[6:])
                                    token = parsed.get("response")
                                    if not token:
                                        choices = parsed.get("choices", [])
                                        if choices:
                                            token = choices[0].get("delta", {}).get("content")
                                except _json.JSONDecodeError:
                                    pass
                            else:
                                try:
                                    parsed = _json.loads(trimmed)
                                    token = parsed.get("response")
                                    if not token:
                                        choices = parsed.get("choices", [])
                                        if choices:
                                            token = choices[0].get("delta", {}).get("content")
                                except _json.JSONDecodeError:
                                    pass

                            if token:
                                full_answer += token
                                yield f"data: {_json.dumps({'type': 'token', 'content': token})}\n\n"

            if not await request.is_disconnected():
                yield f"data: {_json.dumps({'type': 'done'})}\n\n"
                yield (
                    f"data: {_json.dumps({'type': 'answer', 'data': {
                        'answer': full_answer,
                        'type': 'agro_assist_response',
                        'meta': {
                            'user': user_name,
                            'timestamp': int(
                                datetime.now(timezone.utc).timestamp() * 1000
                            ),
                        },
                    }})}\n\n"
                )
        except Exception as exc:
            logger.error("AI stream error: %s", exc)
            try:
                yield f"data: {_json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            except Exception:
                pass

    return StreamingResponse(
        _event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Suggestions ──


@webapp_router.post("/ai/suggestions")
def web_ai_suggestions(
    data: web_schemas.WebAISuggestionsRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    user_text = (data.userText or "").strip()
    if not user_text:
        return {"suggestions": []}

    user_row = db.execute(
        text("SELECT username, email FROM Users WHERE user_id = :uid"),
        {"uid": uid},
    ).mappings().first()
    user_name = (user_row["username"] or user_row["email"].split("@")[0] or "User") if user_row else "User"

    db_snapshot = data.dbSnapshot or _ai_build_db_snapshot(uid, db)
    system_prompt = _ai_build_system_prompt(user_name, db_snapshot)
    suggestion_prompt = _ai_build_suggestion_instruction()
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": suggestion_prompt},
        {"role": "user", "content": user_text},
    ]

    try:
        with _httpx.Client(timeout=_httpx.Timeout(30.0)) as client:
            resp = client.post(
                _CLOUDFLARE_AI_URL,
                json={"messages": messages},
                headers=_AI_HEADERS,
            )
            resp.raise_for_status()
            body = resp.json()
    except Exception as exc:
        logger.error("AI suggestions error: %s", exc)
        return {"suggestions": []}

    content = (
        body.get("result", {})
        .get("choices", [{}])[0]
        .get("message", {})
        .get("content")
        or body.get("result", {}).get("response")
        or ""
    )

    suggestions = _ai_parse_suggestions(content)
    return {"suggestions": suggestions}


# ── Chat Sessions ──


@webapp_router.post("/ai/sessions/list")
def web_ai_sessions_list(
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    rows = db.execute(
        text("""
            SELECT s.session_id, s.start_time,
                   (SELECT COUNT(*) FROM ChatMessages WHERE session_id = s.session_id) AS message_count,
                   COALESCE(
                       (SELECT message_text FROM ChatMessages
                        WHERE session_id = s.session_id
                        ORDER BY timestamp DESC LIMIT 1),
                       ''
                   ) AS preview
            FROM ChatbotSessions s
            WHERE s.user_id = :uid
            ORDER BY s.start_time DESC
            LIMIT 50
        """),
        {"uid": uid},
    ).mappings().all()
    return {"sessions": [dict(r) for r in rows]}


@webapp_router.post("/ai/sessions/create")
def web_ai_session_create(
    data: web_schemas.WebAISessionCreateRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    result = db.execute(
        text("""
            INSERT INTO ChatbotSessions (user_id, farm_id, start_time)
            VALUES (:uid, :fid, NOW())
        """),
        {"uid": uid, "fid": data.farm_id},
    )
    db.commit()
    session_id = result.lastrowid
    return {"session_id": session_id}


@webapp_router.post("/ai/sessions/messages")
def web_ai_session_messages(
    data: web_schemas.WebAISessionMessagesRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    session = db.execute(
        text("SELECT session_id FROM ChatbotSessions WHERE session_id = :sid AND user_id = :uid"),
        {"sid": data.session_id, "uid": uid},
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rows = db.execute(
        text("""
            SELECT message_id, sender, message_text, timestamp
            FROM ChatMessages
            WHERE session_id = :sid
            ORDER BY timestamp ASC
        """),
        {"sid": data.session_id},
    ).mappings().all()
    return {"messages": [dict(r) for r in rows]}


@webapp_router.post("/ai/sessions/add-message")
def web_ai_add_message(
    data: web_schemas.WebAIAddMessageRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    session = db.execute(
        text("SELECT session_id FROM ChatbotSessions WHERE session_id = :sid AND user_id = :uid"),
        {"sid": data.session_id, "uid": uid},
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.execute(
        text("""
            INSERT INTO ChatMessages (session_id, sender, message_text, timestamp)
            VALUES (:sid, :sender, :text, NOW())
        """),
        {"sid": data.session_id, "sender": data.sender, "text": data.message_text},
    )
    db.commit()
    return {"status": "ok"}


# ── Image Serving ──


@webapp_router.get("/images/{filename}")
def web_serve_image(
    filename: str,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)


# ── Rescan (re-run vision AI) ──


class WebRescanRequest(BaseModel):
    image_id: str
    return_annotated: bool = False


@webapp_router.post("/ai/vision/rescan")
async def web_ai_vision_rescan(
    data: WebRescanRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    image = db.execute(
        text("SELECT * FROM Images WHERE image_id = :iid"),
        {"iid": data.image_id},
    ).mappings().first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = os.path.join(UPLOAD_DIR, image["image_path"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    model = _get_vision_model()
    results = model.predict(source=file_path, verbose=False)
    result = results[0]

    names = getattr(result, "names", None) or getattr(model, "names", {})
    detections = []
    confs = []
    top_disease = "Unknown"
    max_conf = 0.0
    if result.boxes is not None and len(result.boxes) > 0:
        xyxy = result.boxes.xyxy.tolist()
        conf = result.boxes.conf.tolist()
        cls_ids = result.boxes.cls.tolist()
        for i in range(len(xyxy)):
            cls_id = int(cls_ids[i])
            label = names.get(cls_id, str(cls_id)) if isinstance(names, dict) else str(cls_id)
            score = float(conf[i])
            confs.append(score)
            detections.append({"label": label, "confidence": score, "bbox_xyxy": [float(v) for v in xyxy[i]]})
        max_conf = max(confs)
        top_disease = detections[confs.index(max_conf)]["label"]

    recommendation = _generate_recommendation(top_disease)

    response = {
        "status": "ok",
        "image_id": data.image_id,
        "detections": detections,
        "max_confidence": float(max_conf),
        "count": len(detections),
        "analysis": {
            "disease_detected": top_disease,
            "confidence_score": float(max_conf),
            "recommendation": recommendation,
        },
    }

    if data.return_annotated:
        import cv2
        annotated = result.plot()
        ok, encoded = cv2.imencode(".jpg", annotated)
        if ok:
            response["annotated_image_base64"] = base64.b64encode(encoded.tobytes()).decode("utf-8")
            response["annotated_image_format"] = "jpg"

    return response


# ── Webapp Farm Management (excludes deleted/archived) ──


class WebFarmActionRequest(BaseModel):
    farm_id: int


class WebFarmCreateRequest(BaseModel):
    name: str
    location: str
    area_size: float


@webapp_router.post("/farms/list")
def web_farms_list(
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    rows = db.execute(
        text("""
            SELECT farm_id, name, location, area_size, created_at, is_Archived, deleted_at
            FROM Farms
            WHERE user_id = :uid AND deleted_at IS NULL AND is_Archived = 0
            ORDER BY created_at DESC
        """),
        {"uid": uid},
    ).mappings().all()
    return {"farms": [dict(r) for r in rows]}


@webapp_router.post("/farms/archive")
def web_farm_archive(
    data: WebFarmActionRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")
    db.execute(
        text("UPDATE Farms SET is_Archived = 1 WHERE farm_id = :fid"),
        {"fid": data.farm_id},
    )
    db.commit()
    return {"status": "ok", "message": "Farm archived"}


@webapp_router.post("/farms/unarchive")
def web_farm_unarchive(
    data: WebFarmActionRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    row = db.execute(
        text("SELECT farm_id FROM Farms WHERE farm_id = :fid AND user_id = :uid AND deleted_at IS NULL"),
        {"fid": data.farm_id, "uid": uid},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=403, detail="Farm not accessible")
    db.execute(
        text("UPDATE Farms SET is_Archived = 0 WHERE farm_id = :fid"),
        {"fid": data.farm_id},
    )
    db.commit()
    return {"status": "ok", "message": "Farm unarchived"}


@webapp_router.post("/farms/delete")
def web_farm_soft_delete(
    data: WebFarmActionRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")
    db.execute(
        text("UPDATE Farms SET deleted_at = NOW() WHERE farm_id = :fid"),
        {"fid": data.farm_id},
    )
    db.commit()
    return {"status": "ok", "message": "Farm deleted"}


@webapp_router.post("/farms/archived-list")
def web_farms_archived_list(
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    rows = db.execute(
        text("""
            SELECT farm_id, name, location, area_size, created_at, is_Archived, deleted_at
            FROM Farms
            WHERE user_id = :uid AND deleted_at IS NULL AND is_Archived = 1
            ORDER BY created_at DESC
        """),
        {"uid": uid},
    ).mappings().all()
    return {"farms": [dict(r) for r in rows]}


# ── Webapp Fields by Farm (matches mobile /mobile/home/get-fields shape) ──


@webapp_router.post("/fields/by-farm")
def web_fields_by_farm(
    data: web_schemas.WebFieldsByFarmRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")
    rows = db.execute(
        text("SELECT field_id, name, crop_type, area_size FROM Fields WHERE farm_id = :fid AND deleted_at IS NULL"),
        {"fid": data.farm_id},
    ).mappings().all()
    return {"fields": [dict(r) for r in rows]}


# ── Webapp Devices by Field (matches mobile /mobile/home/get-devices shape) ──


@webapp_router.post("/devices/by-field")
def web_devices_by_field(
    data: web_schemas.WebDevicesByFieldRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field_ids = _get_field_ids_for_farms(_get_farm_ids_for_user(uid, db), db)
    if data.field_id not in field_ids:
        raise HTTPException(status_code=403, detail="Field not accessible")
    rows = db.execute(
        text("""
            SELECT device_id, device_type, serial_number, location_coords, status
            FROM Devices WHERE field_id = :fid
        """),
        {"fid": data.field_id},
    ).mappings().all()
    return {"devices": [dict(r) for r in rows]}


# ── Webapp Node Status (matches mobile /mobile/home/get-node-status shape) ──


@webapp_router.post("/devices/node-status")
def web_node_status(
    data: web_schemas.WebNodeStatusRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field_ids = _get_field_ids_for_farms(_get_farm_ids_for_user(uid, db), db)
    if data.field_id not in field_ids:
        raise HTTPException(status_code=403, detail="Field not accessible")

    devices = db.execute(
        text("SELECT device_id FROM Devices WHERE field_id = :fid"),
        {"fid": data.field_id},
    ).mappings().all()

    if not devices:
        return {"status": "success", "summary": {"total_nodes": 0, "active": 0, "inactive": 0, "low_battery": 0, "offline": 0}}

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
        id_params,
    ).mappings().all()

    low_battery = db.execute(
        text(f"""
            SELECT COUNT(*) as count
            FROM SensingNodes
            WHERE device_id IN ({id_placeholders}) AND battery_level < 20
        """),
        id_params,
    ).mappings().first()

    result = {"total_nodes": 0, "active": 0, "inactive": 0, "low_battery": 0, "offline": 0}
    for r in rows:
        status = r["status"]
        count = r["count"]
        result["total_nodes"] += count
        if status in result:
            result[status] = count
    result["low_battery"] = low_battery["count"] if low_battery else 0

    return {"status": "success", "summary": result}


# ── Webapp Field Readings (matches mobile /mobile/reports/get-readings shape) ──


@webapp_router.post("/reports/field-readings")
def web_field_readings(
    data: web_schemas.WebFieldReadingsRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field_ids = _get_field_ids_for_farms(_get_farm_ids_for_user(uid, db), db)
    if data.field_id not in field_ids:
        raise HTTPException(status_code=403, detail="Field not accessible")

    devices = db.execute(
        text("SELECT device_id FROM Devices WHERE field_id = :fid"),
        {"fid": data.field_id},
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
        id_params,
    ).mappings().all()

    return {"readings": [dict(r) for r in rows]}


# ── Webapp Field Summary (matches mobile /mobile/reports/get-summary shape) ──


@webapp_router.post("/reports/field-summary")
def web_field_summary(
    data: web_schemas.WebFieldSummaryRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field_ids = _get_field_ids_for_farms(_get_farm_ids_for_user(uid, db), db)
    if data.field_id not in field_ids:
        raise HTTPException(status_code=403, detail="Field not accessible")

    devices = db.execute(
        text("SELECT device_id FROM Devices WHERE field_id = :fid"),
        {"fid": data.field_id},
    ).mappings().all()

    if not devices:
        return {"devices_count": 0, "latest_reading": None, "averages": {}, "irrigation_summary": {}}

    device_ids = [d["device_id"] for d in devices]
    id_placeholders = ", ".join([f":did_{i}" for i in range(len(device_ids))])
    id_params = {f"did_{i}": did for i, did in enumerate(device_ids)}

    avg_data = db.execute(
        text(f"""
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
        """),
        id_params,
    ).mappings().first()

    latest_reading = db.execute(
        text(f"""
            SELECT device_id, timestamp, temperature_air, humidity_air, temperature_soil,
                   humidity_soil, soil_moisture, soil_ph, nitrogen, phosphorus, potassium,
                   conductivity, light_intensity, co2
            FROM SensorReadings
            WHERE device_id IN ({id_placeholders})
            ORDER BY timestamp DESC LIMIT 1
        """),
        id_params,
    ).mappings().first()

    last_irrigation = db.execute(
        text("""
            SELECT
                event_id AS irrigation_id,
                field_id,
                created_at AS start_time,
                executed_at AS end_time,
                duration_minutes,
                CASE WHEN is_executed = 1 THEN 'completed' ELSE 'scheduled' END AS status
            FROM Events
            WHERE field_id = :fid
            ORDER BY created_at DESC LIMIT 1
        """),
        {"fid": data.field_id},
    ).mappings().first()

    irrigation30 = db.execute(
        text("""
            SELECT COUNT(*) AS events_count
            FROM Events
            WHERE field_id = :fid AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        """),
        {"fid": data.field_id},
    ).mappings().first()

    return {
        "devices_count": len(devices),
        "latest_reading": dict(latest_reading) if latest_reading else None,
        "averages": dict(avg_data) if avg_data else {},
        "irrigation_summary": {
            "last_event": dict(last_irrigation) if last_irrigation else None,
            "events_last_30_days": irrigation30["events_count"] if irrigation30 else 0,
        },
    }


# ── Webapp Scan History (matches mobile /mobile/scan/history shape) ──


@webapp_router.post("/scans/history")
def web_scan_history(
    data: web_schemas.WebScanHistoryRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field_ids = _get_field_ids_for_farms(_get_farm_ids_for_user(uid, db), db)
    if data.field_id not in field_ids:
        raise HTTPException(status_code=403, detail="Field not accessible")
    rows = db.execute(
        text("""
            SELECT i.*, r.*
            FROM Images i
            LEFT JOIN AIResults r ON i.image_id = r.image_id
            WHERE i.field_id = :fid
            ORDER BY i.capture_timestamp DESC
        """),
        {"fid": data.field_id},
    ).mappings().all()
    return {"history": [dict(r) for r in rows]}


# ── Webapp Update Device (matches mobile /mobile/manage/update-device shape) ──


@webapp_router.post("/manage/update-device")
def web_update_device(
    data: web_schemas.WebUpdateDeviceRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    device = db.execute(
        text("""
            SELECT d.device_id FROM Devices d
            JOIN Fields f ON d.field_id = f.field_id
            JOIN Farms fa ON f.farm_id = fa.farm_id
            WHERE d.device_id = :did AND fa.user_id = :uid
        """),
        {"did": data.device_id, "uid": uid},
    ).mappings().first()
    if not device:
        raise HTTPException(status_code=403, detail="Device not accessible")

    fields = {k: v for k, v in data.model_dump().items() if v is not None and k != "device_id"}
    if not fields:
        return {"status": "error", "message": "No fields provided"}

    set_clause = ", ".join(f"{k} = :{k}" for k in fields.keys())
    fields["device_id"] = data.device_id

    db.execute(
        text(f"UPDATE Devices SET {set_clause} WHERE device_id = :device_id"),
        fields,
    )
    db.commit()
    return {"status": "success", "message": "Device updated"}


# ── Webapp Create Farm ──


@webapp_router.post("/farms/create")
def web_farm_create(
    data: web_schemas.WebFarmCreateRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    db.execute(
        text("""
            INSERT INTO Farms (user_id, name, location, area_size)
            VALUES (:uid, :name, :location, :area)
        """),
        {"uid": uid, "name": data.name, "location": data.location, "area": data.area_size},
    )
    db.commit()
    return {"status": "success", "message": "Farm created"}


# ── Webapp Update Farm ──


@webapp_router.post("/farms/update")
def web_farm_update(
    data: web_schemas.WebFarmUpdateRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    result = db.execute(
        text("""
            UPDATE Farms SET name = :name, location = :location, area_size = :area
            WHERE farm_id = :fid
        """),
        {"fid": data.farm_id, "name": data.name, "location": data.location, "area": data.area_size},
    )
    db.commit()

    if result.rowcount == 0:
        return {"status": "error", "message": "Farm not found"}

    return {"status": "success", "message": "Farm updated"}


# ── Webapp Create Field ──


@webapp_router.post("/fields/create")
def web_field_create(
    data: web_schemas.WebFieldCreateRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    farm_ids = _get_farm_ids_for_user(uid, db)
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Farm not accessible")

    db.execute(
        text("""
            INSERT INTO Fields (farm_id, name, crop_type, area_size)
            VALUES (:fid, :name, :crop, :area)
        """),
        {"fid": data.farm_id, "name": data.name, "crop": data.crop_type, "area": data.area_size},
    )
    db.commit()
    return {"status": "success", "message": "Field created"}


# ── Webapp Update Field ──


@webapp_router.post("/fields/update")
def web_field_update(
    data: web_schemas.WebFieldUpdateRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field = db.execute(
        text("""
            SELECT f.field_id FROM Fields f
            JOIN Farms fa ON f.farm_id = fa.farm_id
            WHERE f.field_id = :fid AND fa.user_id = :uid AND f.deleted_at IS NULL
        """),
        {"fid": data.field_id, "uid": uid},
    ).mappings().first()
    if not field:
        raise HTTPException(status_code=403, detail="Field not accessible")

    result = db.execute(
        text("""
            UPDATE Fields SET name = :name, crop_type = :crop, area_size = :area
            WHERE field_id = :fid
        """),
        {"fid": data.field_id, "name": data.name, "crop": data.crop_type, "area": data.area_size},
    )
    db.commit()

    if result.rowcount == 0:
        return {"status": "error", "message": "Field not found"}

    return {"status": "success", "message": "Field updated"}


# ── Webapp Delete Field ──


@webapp_router.post("/fields/delete")
def web_field_delete(
    data: web_schemas.WebFieldDeleteRequest,
    db: Session = Depends(get_db),
    uid: int = Depends(_get_user_id_from_token),
):
    field = db.execute(
        text("""
            SELECT f.field_id FROM Fields f
            JOIN Farms fa ON f.farm_id = fa.farm_id
            WHERE f.field_id = :fid AND fa.user_id = :uid AND f.deleted_at IS NULL
        """),
        {"fid": data.field_id, "uid": uid},
    ).mappings().first()
    if not field:
        raise HTTPException(status_code=403, detail="Field not accessible")

    db.execute(
        text("UPDATE Fields SET deleted_at = NOW() WHERE field_id = :fid"),
        {"fid": data.field_id},
    )
    db.commit()
    return {"status": "success", "message": "Field deleted"}


app.include_router(webapp_router)

