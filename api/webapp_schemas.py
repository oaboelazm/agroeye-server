from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WebDashboardRequest(BaseModel):
    farm_id: Optional[int] = None


class WebFieldsListRequest(BaseModel):
    farm_id: int


class WebFieldOverviewRequest(BaseModel):
    field_id: int


class WebDevicesListRequest(BaseModel):
    farm_id: int


class WebDeviceDetailsRequest(BaseModel):
    device_id: int


class WebIrrigationUpcomingRequest(BaseModel):
    farm_id: int


class WebIrrigationRecentRequest(BaseModel):
    farm_id: int


class WebIrrigationSummaryRequest(BaseModel):
    farm_id: int


class WebNotificationsListRequest(BaseModel):
    farm_id: int


class WebNotificationsUnreadRequest(BaseModel):
    farm_id: int


class WebMarkNotificationReadRequest(BaseModel):
    notification_id: int


class WebReportsSummaryRequest(BaseModel):
    farm_id: int


class WebReportFieldRequest(BaseModel):
    field_id: int


class WebSensorsLatestRequest(BaseModel):
    farm_id: Optional[int] = None
    device_id: Optional[int] = None


class WebDashboardData(BaseModel):
    total_fields: int = 0
    total_devices: int = 0
    active_devices: int = 0
    total_nodes: int = 0
    active_nodes: int = 0
    low_battery_nodes: int = 0
    alerts_count: int = 0
    unread_notifications: int = 0
    today_irrigation_events: int = 0
    today_irrigation_duration_minutes: float = 0.0


class WebFieldOverview(BaseModel):
    field_id: int
    name: str
    crop_type: str
    area_size: float
    devices_count: int = 0
    active_devices: int = 0
    avg_temperature_air: Optional[float] = None
    avg_humidity_air: Optional[float] = None
    avg_soil_moisture: Optional[float] = None
    avg_soil_ph: Optional[float] = None
    avg_nitrogen: Optional[float] = None
    avg_phosphorus: Optional[float] = None
    avg_potassium: Optional[float] = None
    last_irrigation: Optional[datetime] = None
    next_irrigation: Optional[datetime] = None


class WebDeviceInfo(BaseModel):
    device_id: int
    field_id: int
    field_name: Optional[str] = None
    device_type: str
    serial_number: str
    status: str
    location_coords: Optional[str] = None


class WebDeviceDetail(BaseModel):
    device_id: int
    field_id: int
    field_name: Optional[str] = None
    device_type: str
    serial_number: str
    status: str
    location_coords: Optional[str] = None
    nodes_count: int = 0
    active_nodes: int = 0
    latest_reading: Optional["WebSensorData"] = None


class WebIrrigationEvent(BaseModel):
    irrigation_id: int
    field_id: int
    field_name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    status: str = "scheduled"


class WebIrrigationSummary(BaseModel):
    today_events: int = 0
    today_duration_minutes: float = 0.0
    week_events: int = 0
    month_events: int = 0


class WebNotificationItem(BaseModel):
    notification_id: int
    type: str
    message: str
    is_read: int = 0
    sent_at: Optional[datetime] = None


class WebReportSummary(BaseModel):
    total_fields: int = 0
    total_devices: int = 0
    total_irrigation_events: int = 0
    avg_temperature_air: Optional[float] = None
    avg_humidity_air: Optional[float] = None
    avg_soil_moisture: Optional[float] = None
    avg_soil_ph: Optional[float] = None
    avg_nitrogen: Optional[float] = None
    avg_phosphorus: Optional[float] = None
    avg_potassium: Optional[float] = None


class WebFieldReport(BaseModel):
    field_id: int
    field_name: str
    devices_count: int = 0
    avg_temperature_air: Optional[float] = None
    avg_humidity_air: Optional[float] = None
    avg_soil_moisture: Optional[float] = None
    avg_soil_ph: Optional[float] = None
    avg_nitrogen: Optional[float] = None
    avg_phosphorus: Optional[float] = None
    avg_potassium: Optional[float] = None
    avg_conductivity: Optional[float] = None
    avg_light_intensity: Optional[float] = None
    avg_co2: Optional[float] = None
    last_irrigation: Optional[datetime] = None
    irrigation_30d_count: int = 0


class WebFieldsByFarmRequest(BaseModel):
    farm_id: int


class WebDevicesByFieldRequest(BaseModel):
    field_id: int


class WebNodeStatusRequest(BaseModel):
    field_id: int


class WebFieldReadingsRequest(BaseModel):
    field_id: int
    from_date: str
    to_date: str


class WebScanHistoryRequest(BaseModel):
    field_id: int


class WebUpdateDeviceRequest(BaseModel):
    device_id: int
    device_type: Optional[str] = None
    serial_number: Optional[str] = None
    location_coords: Optional[str] = None
    status: Optional[str] = None


class WebFieldSummaryRequest(BaseModel):
    field_id: int


class WebFarmCreateRequest(BaseModel):
    name: str
    location: str
    area_size: float


class WebFarmUpdateRequest(BaseModel):
    farm_id: int
    name: str
    location: str
    area_size: float


class WebFieldCreateRequest(BaseModel):
    farm_id: int
    name: str
    crop_type: str
    area_size: float


class WebFieldUpdateRequest(BaseModel):
    field_id: int
    name: str
    crop_type: str
    area_size: float


class WebFieldDeleteRequest(BaseModel):
    field_id: int


class WebAIAssistRequest(BaseModel):
    question: str
    dbSnapshot: Optional[str] = None


class WebAIAssistResponse(BaseModel):
    answer: str
    type: str = "agro_assist_response"
    meta: dict = Field(default_factory=lambda: {"user": "User", "timestamp": 0})


class WebAISuggestionsRequest(BaseModel):
    userText: str
    dbSnapshot: Optional[str] = None


class WebAISessionCreateRequest(BaseModel):
    farm_id: Optional[int] = None


class WebAISessionListItem(BaseModel):
    session_id: int
    start_time: datetime
    message_count: int
    preview: str = ""


class WebAISessionMessagesRequest(BaseModel):
    session_id: int


class WebAISessionMessageItem(BaseModel):
    message_id: int
    sender: str
    message_text: str
    timestamp: datetime


class WebAIAddMessageRequest(BaseModel):
    session_id: int
    sender: str
    message_text: str


class WebSensorData(BaseModel):
    reading_id: Optional[int] = None
    device_id: int
    timestamp: Optional[datetime] = None
    temperature_air: Optional[float] = None
    humidity_air: Optional[float] = None
    temperature_soil: Optional[float] = None
    humidity_soil: Optional[float] = None
    soil_moisture: Optional[float] = None
    soil_ph: Optional[float] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    conductivity: Optional[float] = None
    light_intensity: Optional[float] = None
    co2: Optional[float] = None
    battery_level: Optional[float] = None
