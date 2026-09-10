import { useState, useCallback } from 'react';
import { Upload as UploadIcon, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export default function UploadDocument() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const simulateUpload = useCallback((fileName: string, fileSize: number) => {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newFile: UploadedFile = {
      id,
      name: fileName,
      size: fileSize,
      status: 'uploading',
      progress: 0,
    };
    setFiles((prev) => [newFile, ...prev]);

    // Simulate upload progress
    let progress = 0;
    const uploadInterval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress >= 100) {
        progress = 100;
        clearInterval(uploadInterval);
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'processing', progress: 100 } : f))
        );

        // Simulate processing
        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: 'complete' } : f))
          );
        }, 2000);
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress } : f))
        );
      }
    }, 300);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach((file) => {
        simulateUpload(file.name, file.size);
      });
    },
    [simulateUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach((file) => {
      simulateUpload(file.name, file.size);
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing...';
      case 'complete': return 'Complete';
      case 'error': return 'Error';
      default: return '';
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Document</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload documents for automated verification and fraud detection
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-4">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            isDragging ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <UploadIcon className={`w-7 h-7 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports JPG, PNG, PDF • Max 10MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Priority Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Processing Priority</h3>
        <div className="flex gap-3">
          {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                priority === p
                  ? p === 'critical'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : p === 'high'
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : p === 'medium'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-50 border-slate-300 text-slate-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="capitalize">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Upload Queue ({files.length} files)
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-4 px-5 py-4">
                {getStatusIcon(file.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span className={`text-xs font-medium ${
                      file.status === 'complete' ? 'text-green-600' :
                      file.status === 'error' ? 'text-red-600' :
                      'text-slate-500'
                    }`}>
                      {getStatusText(file.status)}
                    </span>
                  </div>
                  {file.status === 'uploading' && (
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Processing Pipeline</h4>
        <p className="text-xs text-blue-700 leading-relaxed">
          Uploaded documents go through: <strong>OCR (Tesseract)</strong> → <strong>NER (HuggingFace)</strong> → <strong>Forensic Analysis (ELA/PRNU/FFT)</strong> → <strong>Fraud Rules Engine</strong>. 
          Results include confidence and tamper scores. Idempotency keys ensure no duplicate processing.
          Notifications are sent via SMS/WhatsApp upon completion.
        </p>
      </div>
    </div>
  );
}
