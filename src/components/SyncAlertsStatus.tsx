/**
 * Sync & Alerts Status Component — Phase 5
 * 
 * Shows notification delivery status and sync status/history for a record.
 * Reuses existing badge components from Phase 4.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/client'
import type { Notification, SyncLog } from '../types/supabase'
import { format } from 'date-fns'
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Globe,
  AlertTriangle
} from 'lucide-react'

interface SyncAlertsProps {
  recordId: string
}

export default function SyncAlertsStatus({ recordId }: SyncAlertsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatus()
  }, [recordId])

  const loadStatus = async () => {
    setLoading(true)
    try {
      // Load notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: false })

      if (notifError) throw notifError
      setNotifications((notifData || []) as Notification[])

      // Load sync logs
      const { data: syncData, error: syncError } = await supabase
        .from('sync_log')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: false })

      if (syncError) throw syncError
      setSyncLogs((syncData || []) as SyncLog[])
    } catch (err) {
      console.error('Failed to load sync/alerts status:', err)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      retrying: 'bg-amber-100 text-amber-700',
      failed_permanent: 'bg-red-100 text-red-700',
    }

    const icons: Record<string, any> = {
      pending: Clock,
      sent: CheckCircle2,
      delivered: CheckCircle2,
      failed: XCircle,
      retrying: RefreshCw,
      failed_permanent: XCircle,
    }

    const Icon = icons[status] || Clock

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${styles[status] || styles.pending}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    )
  }

  const getSyncStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-blue-100 text-blue-700',
      success: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      retrying: 'bg-amber-100 text-amber-700',
    }

    const icons: Record<string, any> = {
      pending: Clock,
      in_progress: RefreshCw,
      success: CheckCircle2,
      failed: XCircle,
      retrying: RefreshCw,
    }

    const Icon = icons[status] || Clock

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${styles[status] || styles.pending}`}>
        <Icon className={status === 'in_progress' || status === 'retrying' ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} />
        {status.replace('_', ' ')}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Loading status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notifications Section */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications ({notifications.length})
          </h3>
        </div>
        <div className="p-6">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No notifications sent</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getNotificationStatusBadge(notif.status)}
                      <span className="text-xs text-slate-500 uppercase">{notif.channel}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      To: {notif.owner_contact}
                    </p>
                    {(notif.payload as any)?.message && (
                      <p className="text-xs text-slate-500 mt-1">
                        {(notif.payload as any).message}
                      </p>
                    )}
                    {notif.error_message && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {notif.error_message}
                      </p>
                    )}
                    {notif.retry_count > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Retries: {notif.retry_count}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(notif.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sync Logs Section */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            DILRMP Sync History ({syncLogs.length})
          </h3>
        </div>
        <div className="p-6">
          {syncLogs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No sync attempts</p>
          ) : (
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSyncStatusBadge(log.status)}
                      <span className="text-xs text-slate-500 uppercase">{log.target}</span>
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {log.error_message}
                      </p>
                    )}
                    {log.retry_count > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Retries: {log.retry_count}
                      </p>
                    )}
                    {log.response && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">View Response</summary>
                        <pre className="mt-1 text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </details>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
