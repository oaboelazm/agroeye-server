export interface Farm {
  farm_id: number;
  name: string;
  location: string;
  area_size: number;
}

export interface Field {
  field_id: number;
  name: string;
  crop_type: string;
  area_size: number;
  farm_id: number;
}

export interface Device {
  device_id: number;
  device_type: string;
  serial_number: string;
  location_coords: string | null;
  status: string;
  field_id: number;
}

export interface NotificationItem {
  notification_id: number;
  user_id: number;
  farm_id: number;
  type: string;
  message: string;
  is_read: number;
  sent_at: string;
}

export interface NodeStatusSummary {
  total_nodes: number;
  active: number;
  inactive: number;
  low_battery: number;
  offline: number;
}

export interface IrrigationSummary {
  last_event: Record<string, unknown> | null;
  events_last_30_days: number;
}

export interface FieldSummary {
  devices_count: number;
  latest_reading: Record<string, unknown> | null;
  averages: Record<string, unknown>;
  irrigation_summary: IrrigationSummary;
}
