// Shared type definitions - single source of truth for frontend types
// In production, these would be generated from a shared schema (zod/OpenAPI)

export type DocumentStatus = 'pending' | 'processing' | 'analyzed' | 'flagged' | 'approved' | 'rejected';
export type AnalysisStage = 'upload' | 'ocr' | 'ner' | 'forensic' | 'fraud_rules' | 'complete';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface ForensicScores {
  ela: number;        // Error Level Analysis (0-100)
  prnu: number;       // Photo Response Non-Uniformity (0-100)
  fft: number;        // Fast Fourier Transform (0-100)
  metadata: number;   // Metadata integrity (0-100)
}

export interface OCRExtraction {
  text: string;
  confidence: number;
  language: string;
  fields: Record<string, string>;
}

export interface NEREntities {
  names: string[];
  dates: string[];
  addresses: string[];
  documentNumbers: string[];
  organizations: string[];
}

export interface FraudRule {
  id: string;
  name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface DocumentAnalysis {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  status: DocumentStatus;
  currentStage: AnalysisStage;
  priority: Priority;
  
  // Analysis results
  ocr: OCRExtraction | null;
  ner: NEREntities | null;
  forensic: ForensicScores | null;
  fraudRules: FraudRule[];
  
  // Final scores
  confidenceScore: number;    // 0-100
  tamperScore: number;        // 0-100 (higher = more likely tampered)
  
  // Metadata
  correlationId: string;
  processingTime: number;     // ms
  idempotencyKey: string;
}

export interface QueueItem {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: DocumentStatus;
  priority: Priority;
  tamperScore: number;
  confidenceScore: number;
  uploadedBy: string;
  currentStage: AnalysisStage;
}

export interface SystemMetrics {
  totalDocuments: number;
  pendingReview: number;
  flaggedToday: number;
  avgProcessingTime: number;
  ocrAccuracy: number;
  fraudDetectionRate: number;
}

export interface Notification {
  id: string;
  type: 'sms' | 'whatsapp' | 'webhook' | 'email';
  status: 'sent' | 'failed' | 'pending';
  recipient: string;
  message: string;
  timestamp: string;
  correlationId: string;
}
