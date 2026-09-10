/**
 * Database Types - Generated from Supabase Schema
 * Single source of truth for all database operations
 * 
 * IMPORTANT: These types must match the database schema exactly.
 * Any changes to the database require regenerating these types.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'public' | 'patwari' | 'tehsildar' | 'admin'

export type RecordStatus = 'draft' | 'verified' | 'disputed' | 'archived'

export type VersionSource = 'manual' | 'ocr' | 'system' | 'migration'

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'admin_queue' | 'quarantine'

export type FraudType = 
  | 'tamper_detected'
  | 'duplicate_upload'
  | 'boundary_conflict'
  | 'ownership_conflict'
  | 'ocr_mismatch'
  | 'metadata_anomaly'
  | 'pattern_anomaly'
  | 'area_mismatch'
  | 'spatial_overlap'
  | 'exact_duplicate'
  | 'near_duplicate'

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical'

export type NotificationChannel = 'sms' | 'whatsapp' | 'email' | 'push'

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'retrying' | 'failed_permanent'

export type SyncTarget = 'dilrmp' | 'revenue_dept' | 'court_system' | 'backup'

export type SyncStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'retrying'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          tehsil_scope: string | null
          name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          tehsil_scope?: string | null
          name: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: UserRole
          tehsil_scope?: string | null
          name?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      records: {
        Row: {
          id: string
          khasra_no: string
          khata_no: string
          owner_name: string
          village: string
          tehsil: string
          district: string
          area_declared: number | null
          land_class: string | null
          geom: Json | null // GeoJSON
          status: RecordStatus
          locked_fields: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          khasra_no: string
          khata_no: string
          owner_name: string
          village: string
          tehsil: string
          district: string
          area_declared?: number | null
          land_class?: string | null
          geom?: Json | null
          status?: RecordStatus
          locked_fields?: Json
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          khasra_no?: string
          khata_no?: string
          owner_name?: string
          village?: string
          tehsil?: string
          district?: string
          area_declared?: number | null
          land_class?: string | null
          geom?: Json | null
          status?: RecordStatus
          locked_fields?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      record_versions: {
        Row: {
          id: string
          record_id: string
          field_diffs: Json
          source: VersionSource
          tamper_score: number | null
          ocr_confidence: Json | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          record_id: string
          field_diffs?: Json
          source: VersionSource
          tamper_score?: number | null
          ocr_confidence?: Json | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          record_id?: string
          field_diffs?: Json
          source?: VersionSource
          tamper_score?: number | null
          ocr_confidence?: Json | null
          created_by?: string
          created_at?: string
        }
      }
      uploads: {
        Row: {
          id: string
          storage_path: string
          uploader_id: string
          record_id: string | null
          status: UploadStatus
          ocr_confidence: Json | null
          tamper_score: number | null
          tamper_details: Json | null
          text_embedding: string | null // vector(384)
          checksum: string
          device_fingerprint: string | null
          file_size: number | null
          mime_type: string | null
          claimed_by: string | null
          claimed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          storage_path: string
          uploader_id: string
          record_id?: string | null
          status?: UploadStatus
          ocr_confidence?: Json | null
          tamper_score?: number | null
          checksum: string
          device_fingerprint?: string | null
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          storage_path?: string
          uploader_id?: string
          record_id?: string | null
          status?: UploadStatus
          ocr_confidence?: Json | null
          tamper_score?: number | null
          checksum?: string
          device_fingerprint?: string | null
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fraud_alerts: {
        Row: {
          id: string
          record_id: string
          type: FraudType
          severity: FraudSeverity
          details: Json
          resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          record_id: string
          type: FraudType
          severity?: FraudSeverity
          details?: Json
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          record_id?: string
          type?: FraudType
          severity?: FraudSeverity
          details?: Json
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          owner_contact: string
          record_id: string | null
          channel: NotificationChannel
          payload: Json
          status: NotificationStatus
          retry_count: number
          next_retry_at: string | null
          sent_at: string | null
          delivered_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_contact: string
          record_id?: string | null
          channel: NotificationChannel
          payload?: Json
          status?: NotificationStatus
          sent_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_contact?: string
          record_id?: string | null
          channel?: NotificationChannel
          payload?: Json
          status?: NotificationStatus
          sent_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      sync_log: {
        Row: {
          id: string
          record_id: string
          target: SyncTarget
          status: SyncStatus
          payload: Json
          response: Json | null
          retry_count: number
          next_retry_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          record_id: string
          target: SyncTarget
          status?: SyncStatus
          payload?: Json
          response?: Json | null
          retry_count?: number
          next_retry_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          record_id?: string
          target?: SyncTarget
          status?: SyncStatus
          payload?: Json
          response?: Json | null
          retry_count?: number
          next_retry_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Convenience type exports
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Record = Database['public']['Tables']['records']['Row']
export type RecordVersion = Database['public']['Tables']['record_versions']['Row']
export type Upload = Database['public']['Tables']['uploads']['Row']
export type FraudAlert = Database['public']['Tables']['fraud_alerts']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type SyncLog = Database['public']['Tables']['sync_log']['Row']
