import { useState, useEffect } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase/client'
import type { Upload, Profile } from '../types/supabase'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'admin_queue' | 'failed'

interface UploadState {
  id: string | null
  status: UploadStatus
  progress: number
  error: string | null
  fileName: string | null
}

export default function UploadPage() {
  const [uploadState, setUploadState] = useState<UploadState>({
    id: null,
    status: 'idle',
    progress: 0,
    error: null,
    fileName: null,
  })

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900 mb-2">
                Supabase Not Configured
              </h2>
              <p className="text-sm text-amber-800 mb-3">
                The upload functionality requires Supabase to be configured. Please set the following environment variables:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 mb-3">
                <li><code className="bg-amber-100 px-2 py-0.5 rounded">VITE_SUPABASE_URL</code></li>
                <li><code className="bg-amber-100 px-2 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
              <p className="text-sm text-amber-800">
                See <code className="bg-amber-100 px-2 py-0.5 rounded">.env.example</code> for reference.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Subscribe to realtime updates for uploads
  useEffect(() => {
    if (!uploadState.id) return

    const channel = supabase
      .channel(`upload-${uploadState.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'uploads',
          filter: `id=eq.${uploadState.id}`,
        },
        (payload) => {
          const updatedUpload = payload.new as Upload
          
          console.log('Upload status update:', updatedUpload.status)
          
          setUploadState((prev) => ({
            ...prev,
            status: updatedUpload.status as UploadStatus,
            error: (updatedUpload.ocr_confidence as any)?.error as string | null,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [uploadState.id])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset state
    setUploadState({
      id: null,
      status: 'uploading',
      progress: 0,
      error: null,
      fileName: file.name,
    })

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const profile = profileData as Profile | null

      if (profileError || !profile) {
        throw new Error('Profile not found')
      }

      // Check if user has permission to upload
      if (!['patwari', 'tehsildar', 'admin'].includes(profile.role)) {
        throw new Error('You do not have permission to upload documents')
      }

      // Calculate checksum (SHA-256)
      const fileBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // Upload to Supabase Storage
      const storagePath = `uploads/${user.id}/${Date.now()}-${file.name}`

      console.log('Uploading to storage:', storagePath)

      const { error: uploadError } = await supabase.storage
        .from('document-scans')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Create uploads record
      console.log('Creating uploads record')

      const { data: uploadData, error: insertError } = await supabase
        .from('uploads')
        .insert({
          storage_path: storagePath,
          uploader_id: user.id,
          status: 'pending',
          checksum,
          file_size: file.size,
          mime_type: file.type,
        } as any)
        .select()
        .single()

      const uploadRecord = uploadData as Upload | null

      if (insertError || !uploadRecord) {
        throw new Error(`Failed to create upload record: ${insertError?.message || 'Unknown error'}`)
      }

      console.log('Upload record created:', uploadRecord.id)

      // Update state with upload ID
      setUploadState((prev) => ({
        ...prev,
        id: uploadRecord.id,
        status: 'processing',
        progress: 100,
      }))
    } catch (error) {
      console.error('Upload error:', error)
      setUploadState((prev) => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'admin_queue':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <UploadIcon className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusMessage = (status: UploadStatus) => {
    switch (status) {
      case 'idle':
        return 'Select a file to upload'
      case 'uploading':
        return 'Uploading to storage...'
      case 'processing':
        return 'Processing document (OCR + NER)...'
      case 'completed':
        return 'Document processed and saved'
      case 'admin_queue':
        return 'Document requires manual review'
      case 'failed':
        return 'Processing failed'
      default:
        return ''
    }
  }

  const getStatusColor = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'admin_queue':
        return 'text-amber-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Upload Document</h1>
        <p className="text-sm text-slate-500 mb-6">
          Upload a land record document for OCR processing and verification
        </p>

        {/* File Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Document
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadIcon className="w-10 h-10 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, or PDF (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                disabled={uploadState.status === 'uploading' || uploadState.status === 'processing'}
              />
            </label>
          </div>
        </div>

        {/* Status Display */}
        {uploadState.status !== 'idle' && (
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              {getStatusIcon(uploadState.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-sm font-medium ${getStatusColor(uploadState.status)}`}>
                    {getStatusMessage(uploadState.status)}
                  </p>
                </div>
                {uploadState.fileName && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileText className="w-3 h-3" />
                    <span>{uploadState.fileName}</span>
                  </div>
                )}
                {uploadState.id && (
                  <div className="mt-2 text-xs text-slate-400 font-mono">
                    Upload ID: {uploadState.id}
                  </div>
                )}
                {uploadState.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {uploadState.error}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
              <div className="mt-4">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Processing Pipeline</h3>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Image preprocessing (deskew, denoise, enhance)</li>
            <li>OCR text extraction (Tesseract with Hindi + English)</li>
            <li>Named entity recognition (extract structured fields)</li>
            <li>Routing decision (auto-save or admin queue)</li>
          </ol>
          <p className="text-xs text-blue-700 mt-2">
            <strong>Note:</strong> Documents with confidence &lt; 90% on any field will be routed to admin queue for manual review.
          </p>
        </div>
      </div>
    </div>
  )
}
