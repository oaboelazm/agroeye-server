# AgroEye Hardware API — Payload Reference

Three endpoints that connect the **Base Station** to the **Cloud Server**.

---

## API 1 — Upload Raw Node Readings

Stores each sensing node's raw data into `SensorLog`.

### `POST /hardware/nodes/upload`

**Request:**
```json
{
  "base_station_id": 1,
  "field_id": 1,
  "timestamp": "2026-05-13T10:00:00Z",
  "nodes": [
    {
      "node_id": "NODE-001",
      "soil_moisture": 45.2,
      "soil_ph": 6.8,
      "temperature": 24.5,
      "humidity": 65.0,
      "light_intensity": 1200.0,
      "water_level": 80.0,
      "nitrogen": 30.0,
      "phosphorus": 15.0,
      "potassium": 25.0,
      "battery_level": 85.0,
      "signal_strength": -65,
      "timestamp": "2026-05-13T10:00:00Z"
    },
    {
      "node_id": "NODE-002",
      "soil_moisture": 42.1,
      "temperature": 25.0,
      "battery_level": 72.0
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `base_station_id` | int | ✅ | Base station (device) ID |
| `field_id` | int | ✅ | Field ID |
| `timestamp` | datetime | optional | Batch timestamp (defaults to now) |
| `nodes` | array | ✅ | Array of node readings |
| `nodes[].node_id` | string | ✅ | Node identifier |
| `nodes[].soil_moisture` | float | optional | % |
| `nodes[].soil_ph` | float | optional | pH level |
| `nodes[].temperature` | float | optional | °C (maps to temperature_soil) |
| `nodes[].humidity` | float | optional | % (maps to humidity_soil) |
| `nodes[].light_intensity` | float | optional | lux |
| `nodes[].water_level` | float | optional | % |
| `nodes[].nitrogen` | float | optional | mg/kg |
| `nodes[].phosphorus` | float | optional | mg/kg |
| `nodes[].potassium` | float | optional | mg/kg |
| `nodes[].battery_level` | float | optional | 0–100 |
| `nodes[].signal_strength` | int | optional | dBm |
| `nodes[].timestamp` | datetime | optional | Per-node timestamp |

**Response `201`**
```json
{
  "status": "ok",
  "base_station_id": 1,
  "field_id": 1,
  "nodes_received": 2,
  "nodes_stored": 2,
  "errors": null,
  "received_at": "2026-05-13T10:00:05.123456Z"
}
```

---

## API 2 — Processed Readings → AI Decision

Sends field-level averaged readings to the Cloud AI. Stores the processed data in `SensorReadings` and the AI decision in `Events`.

### `POST /hardware/field/decide`

**Request:**
```json
{
  "base_station_id": 1,
  "field_id": 1,
  "timestamp": "2026-05-13T10:00:00Z",
  "aggregation_method": "average",
  "node_count": 5,
  "avg_soil_moisture": 44.8,
  "avg_temperature": 25.2,
  "avg_humidity": 63.5,
  "avg_soil_ph": 6.7,
  "avg_light_intensity": 1150.0,
  "avg_nitrogen": 28.5,
  "avg_phosphorus": 14.2,
  "avg_potassium": 24.1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `base_station_id` | int | ✅ | Base station (device) ID |
| `field_id` | int | ✅ | Field ID |
| `timestamp` | datetime | optional | Defaults to now |
| `aggregation_method` | string | optional | `"average"`, `"weighted_median"` |
| `node_count` | int | ✅ | Number of active nodes |
| `avg_*` fields | float | optional | Averaged sensor values |

**Response `200`**
```json
{
  "status": "ok",
  "base_station_id": 1,
  "field_id": 1,
  "reading_id": 42,
  "event_id": 7,
  "decision": {
    "actions": {
      "irrigation": {
        "on": true,
        "duration_s": 300,
        "flow_lph": 120
      },
      "temperature": {
        "mode": "heating",
        "target_c": 22.0
      },
      "ventilation": {
        "fan_speed_pct": 60,
        "vent_open_pct": 30
      },
      "humidity": {
        "mode": "off",
        "target_rh_pct": 70.0
      }
    },
    "rationale": "Decision from imitation controller using key readings: soil_humidity=44.8, air_temperature=25.2.",
    "quality_score_pct": 82.0,
    "safety": {
      "clamped": false,
      "violations": []
    }
  },
  "timestamp_utc": "2026-05-13T10:00:00.123456Z"
}
```

The base station **must execute** the `actions` after receiving them.

---

## API 3 — Offline Sync

Called when the base station reconnects after being offline. Syncs all locally stored data.

### `POST /hardware/field/sync`

**Request:**
```json
{
  "base_station_id": 1,
  "field_id": 1,
  "raw_readings": [
    {
      "node_id": "NODE-001",
      "soil_moisture": 44.0,
      "temperature": 24.8,
      "battery_level": 80.0,
      "timestamp": "2026-05-12T22:00:00Z"
    }
  ],
  "processed_readings": [
    {
      "aggregation_method": "average",
      "node_count": 4,
      "avg_soil_moisture": 43.5,
      "avg_temperature": 25.0,
      "timestamp": "2026-05-12T22:00:00Z"
    }
  ],
  "local_decisions": [
    {
      "event_type": "local_ai",
      "actions": {
        "irrigation": {"on": true, "duration_s": 180}
      },
      "confidence": 0.65,
      "is_executed": true,
      "executed_at": "2026-05-12T22:01:00Z",
      "timestamp": "2026-05-12T22:00:00Z"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `raw_readings` | array | Offline node readings (same fields as API 1 nodes) |
| `processed_readings` | array | Offline processed readings (same fields as API 2) |
| `local_decisions` | array | Local AI decisions made offline |

**Response `201`**
```json
{
  "status": "ok",
  "base_station_id": 1,
  "field_id": 1,
  "raw_readings_stored": 5,
  "processed_readings_stored": 3,
  "local_decisions_stored": 2,
  "errors": null,
  "synced_at": "2026-05-13T10:05:00.123456Z"
}
```

---

## Data Flow Summary

```
Sensing Nodes
      │ (ESP-NOW mesh)
      ▼
Base Station
      │
      ├─ API 1: POST /hardware/nodes/upload  ──→ SensorLog table
      │
      ├─ Aggregation (average / weighted_median)
      │
      ├─ API 2: POST /hardware/field/decide
      │     ├── Store → SensorReadings
      │     ├── AI    → runtime.decide()
      │     ├── Store → Events
      │     └── Return actions to Base Station → execute physically
      │
      └─ [OFFLINE] Local AI → store in local storage
            │
            └─ API 3: POST /hardware/field/sync (on reconnect)
                  ├── Raw readings   → SensorLog
                  ├── Processed      → SensorReadings
                  └── Local decisions → Events
```
