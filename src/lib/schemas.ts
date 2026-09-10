/**
 * Zod Validation Schemas
 * Single source of truth for form validation
 * Must match database schema exactly
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const UserRoleSchema = z.enum(['public', 'patwari', 'tehsildar', 'admin']);
export const RecordStatusSchema = z.enum(['draft', 'verified', 'disputed', 'archived']);
export const VersionSourceSchema = z.enum(['manual', 'ocr', 'system', 'migration']);
export const UploadStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export const FraudTypeSchema = z.enum([
  'tamper_detected',
  'duplicate_upload',
  'boundary_conflict',
  'ownership_conflict',
  'ocr_mismatch',
  'metadata_anomaly',
  'pattern_anomaly',
]);
export const FraudSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const NotificationChannelSchema = z.enum(['sms', 'whatsapp', 'email', 'push']);
export const NotificationStatusSchema = z.enum(['pending', 'sent', 'delivered', 'failed']);
export const SyncTargetSchema = z.enum(['dilrmp', 'revenue_dept', 'court_system', 'backup']);
export const SyncStatusSchema = z.enum(['pending', 'in_progress', 'success', 'failed', 'retrying']);

// ============================================================================
// JSON SCHEMA (for flexible JSON fields)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JsonSchema: z.ZodType<any> = z.any();

// ============================================================================
// TABLE SCHEMAS
// ============================================================================

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  role: UserRoleSchema,
  tehsil_scope: z.string().nullable(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ProfileInsertSchema = z.object({
  id: z.string().uuid(),
  role: UserRoleSchema.optional(),
  tehsil_scope: z.string().nullable().optional(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const ProfileUpdateSchema = z.object({
  role: UserRoleSchema.optional(),
  tehsil_scope: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

export const RecordSchema = z.object({
  id: z.string().uuid(),
  khasra_no: z.string().min(1, 'Khasra number is required'),
  khata_no: z.string().min(1, 'Khata number is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  village: z.string().min(1, 'Village is required'),
  tehsil: z.string().min(1, 'Tehsil is required'),
  district: z.string().min(1, 'District is required'),
  area_declared: z.number().positive().nullable(),
  land_class: z.string().nullable(),
  geom: JsonSchema.nullable(), // GeoJSON
  status: RecordStatusSchema,
  locked_fields: JsonSchema.default({}),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const RecordInsertSchema = z.object({
  id: z.string().uuid().optional(),
  khasra_no: z.string().min(1, 'Khasra number is required'),
  khata_no: z.string().min(1, 'Khata number is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  village: z.string().min(1, 'Village is required'),
  tehsil: z.string().min(1, 'Tehsil is required'),
  district: z.string().min(1, 'District is required'),
  area_declared: z.number().positive().nullable().optional(),
  land_class: z.string().nullable().optional(),
  geom: JsonSchema.nullable().optional(),
  status: RecordStatusSchema.optional(),
  locked_fields: JsonSchema.optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const RecordUpdateSchema = z.object({
  khasra_no: z.string().min(1).optional(),
  khata_no: z.string().min(1).optional(),
  owner_name: z.string().min(1).optional(),
  village: z.string().min(1).optional(),
  tehsil: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  area_declared: z.number().positive().nullable().optional(),
  land_class: z.string().nullable().optional(),
  geom: JsonSchema.nullable().optional(),
  status: RecordStatusSchema.optional(),
  locked_fields: JsonSchema.optional(),
  updated_at: z.string().datetime().optional(),
});

export const RecordVersionSchema = z.object({
  id: z.string().uuid(),
  record_id: z.string().uuid(),
  field_diffs: JsonSchema,
  source: VersionSourceSchema,
  tamper_score: z.number().min(0).max(100).nullable(),
  ocr_confidence: JsonSchema.nullable(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
});

export const RecordVersionInsertSchema = z.object({
  id: z.string().uuid().optional(),
  record_id: z.string().uuid(),
  field_diffs: JsonSchema.optional(),
  source: VersionSourceSchema,
  tamper_score: z.number().min(0).max(100).nullable().optional(),
  ocr_confidence: JsonSchema.nullable().optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime().optional(),
});

export const UploadSchema = z.object({
  id: z.string().uuid(),
  storage_path: z.string().min(1),
  uploader_id: z.string().uuid(),
  record_id: z.string().uuid().nullable(),
  status: UploadStatusSchema,
  ocr_confidence: JsonSchema.nullable(),
  tamper_score: z.number().min(0).max(100).nullable(),
  checksum: z.string().min(1),
  device_fingerprint: z.string().nullable(),
  file_size: z.number().int().positive().nullable(),
  mime_type: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UploadInsertSchema = z.object({
  id: z.string().uuid().optional(),
  storage_path: z.string().min(1),
  uploader_id: z.string().uuid(),
  record_id: z.string().uuid().nullable().optional(),
  status: UploadStatusSchema.optional(),
  ocr_confidence: JsonSchema.nullable().optional(),
  tamper_score: z.number().min(0).max(100).nullable().optional(),
  checksum: z.string().min(1),
  device_fingerprint: z.string().nullable().optional(),
  file_size: z.number().int().positive().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const FraudAlertSchema = z.object({
  id: z.string().uuid(),
  record_id: z.string().uuid(),
  type: FraudTypeSchema,
  severity: FraudSeveritySchema,
  details: JsonSchema,
  resolved: z.boolean(),
  resolved_by: z.string().uuid().nullable(),
  resolved_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export const FraudAlertInsertSchema = z.object({
  id: z.string().uuid().optional(),
  record_id: z.string().uuid(),
  type: FraudTypeSchema,
  severity: FraudSeveritySchema.optional(),
  details: JsonSchema.optional(),
  resolved: z.boolean().optional(),
  resolved_by: z.string().uuid().nullable().optional(),
  resolved_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  owner_contact: z.string().min(1),
  record_id: z.string().uuid().nullable(),
  channel: NotificationChannelSchema,
  payload: JsonSchema,
  status: NotificationStatusSchema,
  sent_at: z.string().datetime().nullable(),
  delivered_at: z.string().datetime().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const NotificationInsertSchema = z.object({
  id: z.string().uuid().optional(),
  owner_contact: z.string().min(1),
  record_id: z.string().uuid().nullable().optional(),
  channel: NotificationChannelSchema,
  payload: JsonSchema.optional(),
  status: NotificationStatusSchema.optional(),
  sent_at: z.string().datetime().nullable().optional(),
  delivered_at: z.string().datetime().nullable().optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export const SyncLogSchema = z.object({
  id: z.string().uuid(),
  record_id: z.string().uuid(),
  target: SyncTargetSchema,
  status: SyncStatusSchema,
  payload: JsonSchema,
  response: JsonSchema.nullable(),
  retry_count: z.number().int().nonnegative(),
  next_retry_at: z.string().datetime().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const SyncLogInsertSchema = z.object({
  id: z.string().uuid().optional(),
  record_id: z.string().uuid(),
  target: SyncTargetSchema,
  status: SyncStatusSchema.optional(),
  payload: JsonSchema.optional(),
  response: JsonSchema.nullable().optional(),
  retry_count: z.number().int().nonnegative().optional(),
  next_retry_at: z.string().datetime().nullable().optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// ============================================================================
// FORM SCHEMAS (for UI forms)
// ============================================================================

export const CreateRecordFormSchema = z.object({
  khasra_no: z.string().min(1, 'Khasra number is required'),
  khata_no: z.string().min(1, 'Khata number is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  village: z.string().min(1, 'Village is required'),
  tehsil: z.string().min(1, 'Tehsil is required'),
  district: z.string().min(1, 'District is required'),
  area_declared: z.number().positive().optional(),
  land_class: z.string().optional(),
});

export const SignupFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type ProfileFormData = z.infer<typeof ProfileInsertSchema>;
export type RecordFormData = z.infer<typeof RecordInsertSchema>;
export type CreateRecordFormData = z.infer<typeof CreateRecordFormSchema>;
export type SignupFormData = z.infer<typeof SignupFormSchema>;
export type LoginFormData = z.infer<typeof LoginFormSchema>;
