import os
from unittest.mock import MagicMock
from datetime import datetime

os.environ["SECRET_KEY"] = "test-secret-key-for-testing"
os.environ["MYSQL_USER"] = "test"
os.environ["MYSQL_PASSWORD"] = "test"
os.environ["DB_HOST"] = "localhost"
os.environ["MYSQL_DATABASE"] = "test_db"

import pytest
from fastapi.testclient import TestClient

from api_server import app, get_db


class TestWebAppEndpoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        app.dependency_overrides.clear()
        yield
        app.dependency_overrides.clear()

    def _override_get_db(self, mock_db):
        def _gen():
            yield mock_db
        app.dependency_overrides[get_db] = _gen

    def _override_user_id(self, user_id=1):
        from api_server import _get_user_id_from_token
        app.dependency_overrides[_get_user_id_from_token] = lambda: user_id

    @staticmethod
    def _exec_result(all_rows=None, first_row=None):
        r = MagicMock()
        r.mappings.return_value.all.return_value = all_rows or []
        r.mappings.return_value.first.return_value = first_row
        return r

    @staticmethod
    def _count_row(count=0, dur=0):
        return {"c": count, "dur": dur}

    # ── Dashboard ──

    def test_dashboard_no_farms(self):
        self._override_user_id()
        mock_db = MagicMock()
        mock_db.execute.return_value = self._exec_result(all_rows=[])
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/dashboard", json={})
        assert resp.status_code == 200
        assert resp.json()["total_fields"] == 0

    def test_dashboard_no_farm_id(self):
        self._override_user_id()
        mock_db = MagicMock()
        mock_db.execute.return_value = self._exec_result(all_rows=[])
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/dashboard", json={})
        assert resp.status_code == 200

    def test_dashboard_returns_counts(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "SELECT field_id FROM Fields" in s:
                return self._exec_result(all_rows=[{"field_id": 1}])
            if "SELECT device_id FROM Devices" in s:
                return self._exec_result(all_rows=[{"device_id": 1}])
            if "COUNT" in s or "count" in s.lower():
                return self._exec_result(first_row=self._count_row(5))
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/dashboard", json={"farm_id": 1})
        assert resp.status_code == 200

    # ── Fields ──

    def test_fields_list_forbidden(self):
        self._override_user_id()
        mock_db = MagicMock()
        mock_db.execute.return_value = self._exec_result(all_rows=[])
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/fields/list", json={"farm_id": 999})
        assert resp.status_code == 403

    def test_fields_list_success(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "SELECT field_id, name, crop_type, area_size FROM Fields" in s:
                return self._exec_result(all_rows=[
                    {"field_id": 1, "name": "Field A", "crop_type": "Tomato", "area_size": 10.5},
                    {"field_id": 2, "name": "Field B", "crop_type": "Corn", "area_size": 20.0},
                ])
            if "Devices WHERE field_id" in s:
                return self._exec_result(first_row={"c": 3})
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/fields/list", json={"farm_id": 1})
        assert resp.status_code == 200
        assert len(resp.json()["fields"]) == 2

    def test_field_overview_not_found(self):
        self._override_user_id()
        mock_db = MagicMock()
        mock_db.execute.return_value = self._exec_result(first_row=None)
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/fields/overview", json={"field_id": 999})
        assert resp.status_code == 404

    def test_field_overview_success(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "JOIN Farms" in s:
                return self._exec_result(first_row={"field_id": 1, "name": "Field A", "crop_type": "Tomato", "area_size": 10.5, "farm_id": 1})
            if "Devices WHERE field_id" in s:
                return self._exec_result(first_row={"c": 2})
            if "SensorReadings" in s:
                return self._exec_result(first_row={"avg_temperature_air": 25.5, "avg_humidity_air": 60.0, "avg_soil_moisture": 45.0, "avg_soil_ph": 6.5, "avg_nitrogen": 10.0, "avg_phosphorus": 5.0, "avg_potassium": 8.0})
            return self._exec_result(first_row=None)

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/fields/overview", json={"field_id": 1})
        assert resp.status_code == 200

    # ── Devices ──

    def test_devices_list_success(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "SELECT field_id FROM Fields" in s:
                return self._exec_result(all_rows=[{"field_id": 1}])
            if "Devices d" in s:
                return self._exec_result(all_rows=[{"device_id": 1, "field_id": 1, "field_name": "Field A", "device_type": "sensor", "serial_number": "SN001", "status": "active", "location_coords": None}])
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/devices/list", json={"farm_id": 1})
        assert resp.status_code == 200
        assert "devices" in resp.json()

    def test_device_details_not_found(self):
        self._override_user_id()
        mock_db = MagicMock()
        mock_db.execute.return_value = self._exec_result(first_row=None)
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/devices/details", json={"device_id": 999})
        assert resp.status_code == 404

    # ── Irrigation ──

    def test_irrigation_upcoming(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "SELECT field_id FROM Fields" in s:
                return self._exec_result(all_rows=[{"field_id": 1}])
            if "IrrigationEvents e" in s:
                return self._exec_result(all_rows=[])
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/irrigation/upcoming", json={"farm_id": 1})
        assert resp.status_code == 200
        assert resp.json()["events"] == []

    def test_irrigation_recent(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "SELECT field_id FROM Fields" in s:
                return self._exec_result(all_rows=[{"field_id": 1}])
            if "IrrigationEvents e" in s:
                return self._exec_result(all_rows=[])
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/irrigation/recent", json={"farm_id": 1})
        assert resp.status_code == 200
        assert resp.json()["events"] == []

    def test_irrigation_summary(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "Fields" in s:
                return self._exec_result(all_rows=[{"field_id": 1}])
            if "IrrigationEvents" in s:
                return self._exec_result(first_row=self._count_row(5, 120.0))
            return self._exec_result(all_rows=[], first_row=self._count_row(0))

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/irrigation/summary", json={"farm_id": 1})
        assert resp.status_code == 200
        data = resp.json()
        assert data["today_events"] == 5
        assert data["today_duration_minutes"] == 120.0

    # ── Notifications ──

    def test_notifications_list(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "SELECT notification_id" in s:
                return self._exec_result(all_rows=[{"notification_id": 1, "type": "alert", "message": "Test notif", "is_read": 0, "sent_at": "2025-01-01T00:00:00"}])
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/notifications/list", json={"farm_id": 1})
        assert resp.status_code == 200
        assert len(resp.json()["notifications"]) == 1

    def test_notifications_unread_count(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "Notifications" in s:
                return self._exec_result(first_row={"c": 5})
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/notifications/unread-count", json={"farm_id": 1})
        assert resp.status_code == 200
        assert resp.json()["unread_count"] == 5

    def test_mark_notification_read_not_found(self):
        self._override_user_id()
        mock_db = MagicMock()
        mock_db.execute.return_value.rowcount = 0
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/notifications/mark-read", json={"notification_id": 999})
        assert resp.status_code == 404

    # ── Reports ──

    def test_reports_summary(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            if "SELECT field_id FROM Fields" in s:
                return self._exec_result(all_rows=[{"field_id": 1}])
            if "IrrigationEvents" in s:
                return self._exec_result(first_row={"c": 3})
            return self._exec_result(all_rows=[], first_row=None)

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/reports/summary", json={"farm_id": 1})
        assert resp.status_code == 200

    def test_report_field_not_found(self):
        self._override_user_id()
        mock_db = MagicMock()
        mock_db.execute.return_value = self._exec_result(first_row=None)
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/reports/field", json={"field_id": 999})
        assert resp.status_code == 404

    # ── Sensors ──

    def test_sensors_latest(self):
        self._override_user_id()
        mock_db = MagicMock()

        def exec_sql(sql, params=None):
            s = str(sql) if hasattr(sql, '__str__') else ""
            if "Farms WHERE user_id" in s:
                return self._exec_result(all_rows=[{"farm_id": 1}])
            return self._exec_result(all_rows=[])

        mock_db.execute = exec_sql
        self._override_get_db(mock_db)
        resp = TestClient(app).post("/webapp/sensors/latest", json={"farm_id": 1})
        assert resp.status_code == 200
        assert resp.json()["readings"] == []

    # ── Auth ──

    def test_unauthorized_access(self):
        resp = TestClient(app).post("/webapp/dashboard", json={})
        assert resp.status_code == 401

    def test_invalid_token(self):
        resp = TestClient(app).post("/webapp/dashboard", json={}, headers={"Authorization": "Bearer invalid-token"})
        assert resp.status_code == 401
