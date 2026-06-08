export interface AuthUser {
  user_id: number;
  username: string;
  email: string;
  role: string;
  phone?: string;
}

export interface LoginResponse {
  status: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface SignupResponse {
  status: string;
  message: string;
}

export interface AIAskResponse {
  answer: string;
  type: string;
  meta: {
    user: string;
    timestamp: number;
  };
}

export interface AISuggestion {
  title: string;
  subtitle: string;
  prompt: string;
}

export interface ChatSession {
  session_id: number;
  start_time: string;
  message_count: number;
  preview: string;
}

export interface ChatSessionMessage {
  message_id: number;
  sender: string;
  message_text: string;
  timestamp: string;
}

export interface AISuggestionsResponse {
  suggestions: AISuggestion[];
}

export interface ScanImage {
  image_id: string;
  device_id: number;
  field_id: number;
  image_path: string;
  capture_timestamp: string;
  file_size: number | null;
  source?: string;
  user_id?: number | null;
}

export interface ScanAnalysis {
  result_id: number;
  image_id: string;
  disease_detected: string | null;
  confidence_score: number | null;
  recommendation: string | null;
  analysis_timestamp: string | null;
}

export interface ScanHistoryItem extends ScanImage {
  result_id?: number | null;
  disease_detected?: string | null;
  confidence_score?: number | null;
  recommendation?: string | null;
  analysis_timestamp?: string | null;
}

export interface ScanHistoryResponse {
  history: ScanHistoryItem[];
}

export interface ScanDetailsResponse {
  image: ScanImage | null;
  analysis: ScanAnalysis | null;
}

export interface NodeStatusResponse {
  status: string;
  summary: {
    total_nodes: number;
    active: number;
    inactive: number;
    low_battery: number;
    offline: number;
  };
}
