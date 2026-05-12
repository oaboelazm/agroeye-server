export type Farm = {
  farm_id: number;
  name: string;
  location: string;
  area_size: number;
};

export type Field = {
  field_id: number;
  name: string;
  crop_type: string;
  area_size: number;
};

export type Device = {
  device_id: number;
  field_id?: number;
  device_type: string;
  serial_number: string;
  location_coords: string | null;
  status: string;
};

export type NotificationItem = {
  notification_id: number;
  user_id: number;
  farm_id: number;
  type: string;
  message: string;
  is_read: number;
  sent_at: string;
};
