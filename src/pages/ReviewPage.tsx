/**
 * Review Page — Phase 4
 * 
 * Side-by-side layout: original scan + extracted fields
 * Shows OCR confidence badges, tamper heatmap, fraud alerts
 * Inline editing with accept/reject/escalate actions
 * Quarantine requires explicit forensic sign-off
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import type { Upload, Profile } from '../types/supabase'
import { format } from 'date-fns'
import { 
  ArrowLeft, 
  Check, 
  X, 
  AlertTriangle, 
  Shield, 
  Edit3,
  Save,
  Eye
} from 'lucide-react'

interface ReviewData {
  upload: Upload
  extracted: Record<string, any>
  fraudAlerts: any[]
  profile: Profile
}

export default function ReviewPage() {
  const { uploadId } = useParams<{ uploadId: string }>()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReviewData | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showForensicSignoff, setShowForensicSignoff] = useState(false)

  useEffect(() => {
    if (uploadId) {
      loadReviewData()
    }
  }, [uploadId])

  const loadReviewData = async () => {
    if (!uploadId) {
      setError('No upload ID provided')
      setLoading(false)
      return
    }

    const id = uploadId // TypeScript type guard

    setLoading(true)
    try {
      // Get current user
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) throw new Error('Not authenticated')

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      const profile = profileData as Profile | null
      if (!profile || !['tehsildar', 'admin'].includes(profile.role)) {
        throw new Error('Access denied')
      }

      // Get upload
      const { data: uploadData, error: uploadError } = await supabase
        .from('uploads')
        .select('*')
        .eq('id', id)
        .single()

      if (uploadError || !uploadData) throw new Error('Upload not found')
      const upload = uploadData as Upload

      // Check if claimed by someone else
      if (upload.claimed_by && upload.claimed_by !== user.id) {
        throw new Error('This record is already being reviewed by another admin')
      }

      // Claim it if not already claimed
      if (!upload.claimed_by) {
        await (supabase.from('uploads') as any).update({
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
        }).eq('id', id)
      }

      // Get extracted data from ocr_confidence
      const extracted = (upload.ocr_confidence as any) || {}

      // Get fraud alerts
      const { data: alertsData } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('upload_id', id)

      const fraudAlerts = alertsData || []

      setData({
        upload,
        extracted,
        fraudAlerts,
        profile,
      })

      // Initialize edited fields
      setEditedFields({ ...extracted })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review data')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (action: 'accept' | 'reject' | 'escalate') => {
    if (!data || !uploadId) return

    // Quarantine requires forensic sign-off
    if (data.upload.status === 'quarantine' && action === 'accept' && !showForensicSignoff) {
      setShowForensicSignoff(true)
      return
    }

    setSubmitting(true)
    try {
      if (action === 'accept') {
        // Create or update record
        const { data: recordData, error: recordError } = await (supabase
          .from('records') as any)
          .insert({
            ...editedFields,
            upload_id: uploadId,
            status: 'verified',
            verified_by: data.profile.id,
            verified_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (recordError) throw recordError

        // Create audit trail
        await (supabase.from('record_versions') as any).insert({
          record_id: recordData.id,
          action: 'admin_review',
          changes: {
            before: data.extracted,
            after: editedFields,
          },
          reviewer_id: data.profile.id,
          tamper_score: data.upload.tamper_score,
          confidence_scores: data.upload.ocr_confidence,
        })

        // Update upload status
        await (supabase.from('uploads') as any).update({
          status: 'approved',
          record_id: recordData.id,
          claimed_by: null,
        }).eq('id', uploadId)

      } else if (action === 'reject') {
        // Update upload status
        await (supabase.from('uploads') as any).update({
          status: 'rejected',
          claimed_by: null,
        }).eq('id', uploadId)

        // Create audit trail
        await (supabase.from('record_versions') as any).insert({
          record_id: null,
          upload_id: uploadId,
          action: 'admin_reject',
          changes: {
            reason: 'Rejected by admin',
          },
          reviewer_id: data.profile.id,
        })

      } else if (action === 'escalate') {
        // Update upload status
        await (supabase.from('uploads') as any).update({
          status: 'escalated',
          claimed_by: null,
        }).eq('id', uploadId)

        // Create audit trail
        await (supabase.from('record_versions') as any).insert({
          record_id: null,
          upload_id: uploadId,
          action: 'admin_escalate',
          changes: {
            reason: 'Escalated by admin',
          },
          reviewer_id: data.profile.id,
        })
      }

      navigate('/queue')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const getConfidenceBadge = (confidence: number | null | undefined) => {
    if (confidence === null || confidence === undefined) {
      return <span className="text-xs text-slate-400">N/A</span>
    }

    if (confidence >= 0.9) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
          {(confidence * 100).toFixed(0)}%
        </span>
      )
    } else if (confidence >= 0.7) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
          {(confidence * 100).toFixed(0)}%
        </span>
      )
    } else {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
          {(confidence * 100).toFixed(0)}%
        </span>
      )
    }
  }

  const getTamperBadge = (score: number | null) => {
    if (!score) return null
    
    if (score >= 71) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
          High ({score.toFixed(0)}%)
        </span>
      )
    } else if (score >= 31) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
          Medium ({score.toFixed(0)}%)
        </span>
      )
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
          Low ({score.toFixed(0)}%)
        </span>
      )
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading review data...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-sm text-red-700">{error || 'Failed to load review data'}</p>
          <button
            onClick={() => navigate('/queue')}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            Back to Queue
          </button>
        </div>
      </div>
    )
  }

  const fields = [
    { key: 'owner_name', label: 'Owner Name' },
    { key: 'khasra_no', label: 'Khasra Number' },
    { key: 'khata_no', label: 'Khata Number' },
    { key: 'village', label: 'Village' },
    { key: 'tehsil', label: 'Tehsil' },
    { key: 'district', label: 'District' },
    { key: 'area_declared', label: 'Area (acres)' },
    { key: 'land_class', label: 'Land Class' },
  ]

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/queue')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queue
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Document Review</h1>
            <p className="text-sm text-slate-500">
              Upload ID: {uploadId?.slice(0, 8)}... • Uploaded {format(new Date(data.upload.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getTamperBadge(data.upload.tamper_score)}
            {data.upload.status === 'quarantine' && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Quarantine
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fraud Alerts */}
      {data.fraudAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Fraud Alerts ({data.fraudAlerts.length})
          </h3>
          <div className="space-y-2">
            {data.fraudAlerts.map((alert, idx) => (
              <div key={idx} className="text-sm text-red-700">
                <span className="font-medium">{alert.type}:</span> {alert.details?.message || JSON.stringify(alert.details)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tamper Details */}
      {data.upload.tamper_score && data.upload.tamper_score >= 31 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">Forensic Analysis</h3>
          <div className="text-sm text-amber-700">
            <p>Tamper Score: {data.upload.tamper_score.toFixed(1)}%</p>
            {data.upload.tamper_details && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">View Details</summary>
                <pre className="mt-2 text-xs bg-amber-100 p-3 rounded overflow-x-auto">
                  {JSON.stringify(data.upload.tamper_details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Original Image */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Original Document</h3>
          <div className="aspect-[3/4] bg-slate-100 rounded flex items-center justify-center">
            <img
              src={data.upload.storage_path}
              alt="Document scan"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement!.innerHTML = '<p class="text-sm text-slate-500">Image not available</p>'
              }}
            />
          </div>
        </div>

        {/* Right: Extracted Fields */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Extracted Fields</h3>
          <div className="space-y-3">
            {fields.map(({ key, label }) => {
              const value = editedFields[key] || ''
              const confidence = data.extracted[`${key}_confidence`]
              const isEdited = value !== data.extracted[key]

              return (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {getConfidenceBadge(confidence)}
                    {isEdited && <Edit3 className="w-4 h-4 text-blue-600" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quarantine Forensic Sign-off */}
      {showForensicSignoff && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-2">Forensic Sign-off Required</h3>
          <p className="text-sm text-red-700 mb-3">
            This document has a high tamper score and requires explicit forensic sign-off before approval.
          </p>
          <label className="flex items-center gap-2 text-sm text-red-900">
            <input
              type="checkbox"
              checked={showForensicSignoff}
              onChange={(e) => setShowForensicSignoff(e.target.checked)}
              className="rounded"
            />
            I have reviewed the forensic analysis and approve this document despite the tamper indicators
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={() => handleSubmit('reject')}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-slate-300 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Reject
        </button>
        <button
          onClick={() => handleSubmit('escalate')}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded hover:bg-amber-700 disabled:bg-slate-300 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Escalate
        </button>
        <button
          onClick={() => handleSubmit('accept')}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-slate-300 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {data.upload.status === 'quarantine' && !showForensicSignoff ? 'Forensic Sign-off' : 'Accept'}
        </button>
      </div>
    </div>
  )
}
