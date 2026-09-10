# Operations Runbook

## Overview

This runbook provides step-by-step procedures for common operational tasks, troubleshooting, and incident response for the Land Record Digitisation Platform.

## Table of Contents

1. [Deployment](#deployment)
2. [Monitoring](#monitoring)
3. [Common Issues](#common-issues)
4. [Incident Response](#incident-response)
5. [Maintenance](#maintenance)
6. [Disaster Recovery](#disaster-recovery)

---

## Deployment

### Initial Setup

1. **Supabase Project**
   ```bash
   # Create project at https://supabase.com
   # Note project URL and anon key
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with actual values
   ```

3. **Database Migrations**
   ```bash
   # Apply migrations in order
   supabase db push
   ```

4. **Deploy AI Service**
   ```bash
   cd ai-service
   docker build -t land-record-ai-service .
   docker run -p 8000:8000 --env-file ../.env land-record-ai-service
   ```

5. **Deploy Frontend**
   ```bash
   npm run build
   # Deploy dist/ to Vercel/Netlify
   ```

### Updating Deployment

```bash
# Pull latest changes
git pull origin main

# Apply new migrations
supabase db push

# Rebuild and redeploy AI service
cd ai-service
docker build -t land-record-ai-service:latest .
docker stop land-record-ai-service
docker rm land-record-ai-service
docker run -d -p 8000:8000 --env-file ../.env --name land-record-ai-service land-record-ai-service:latest

# Rebuild and redeploy frontend
cd ..
npm run build
# Deploy to hosting provider
```

---

## Monitoring

### Health Checks

**AI Service:**
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Supabase:**
Check status at https://status.supabase.com

### Key Metrics

**Upload Processing:**
- Average processing time: < 30 seconds
- Success rate: > 95%
- Queue length: < 10 pending uploads

**OCR Performance:**
- Average confidence: > 85%
- Correction rate: < 10%

**Forensic Analysis:**
- Average processing time: < 5 seconds
- False positive rate: < 5%

**Notification Delivery:**
- Success rate: > 98%
- Average delivery time: < 10 seconds

### Alerting

Set up alerts for:
- AI service health check failures
- Upload processing failures > 5%
- Queue length > 50
- Notification delivery failures > 2%
- Database connection errors

---

## Common Issues

### Issue: Upload Stuck in "processing"

**Symptoms:**
- Upload status remains "processing" for > 5 minutes
- No record created

**Diagnosis:**
```sql
-- Check upload status
SELECT id, status, created_at, updated_at
FROM uploads
WHERE status = 'processing'
AND updated_at < NOW() - INTERVAL '5 minutes';

-- Check Edge Function logs
-- In Supabase Dashboard → Edge Functions → process-upload → Logs
```

**Resolution:**
1. Check AI service health: `curl http://localhost:8000/health`
2. Check Edge Function logs for errors
3. If AI service is down, restart it
4. If Edge Function failed, manually retry:
   ```sql
   UPDATE uploads
   SET status = 'pending', updated_at = NOW()
   WHERE id = '<upload_id>';
   ```

---

### Issue: OCR Confidence Too Low

**Symptoms:**
- Average OCR confidence < 70%
- Many uploads routed to admin_queue

**Diagnosis:**
```sql
-- Check recent OCR confidence
SELECT 
  upload_id,
  ocr_confidence,
  created_at
FROM uploads
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 20;
```

**Resolution:**
1. Check image quality in uploads
2. Verify Tesseract is properly installed with Hindi language pack
3. Check preprocessing parameters in `ai-service/app/preprocess.py`
4. Consider adjusting preprocessing thresholds

---

### Issue: High Tamper Scores

**Symptoms:**
- Many uploads quarantined (tamper_score > 0.70)
- Users complaining about false positives

**Diagnosis:**
```sql
-- Check recent tamper scores
SELECT 
  id,
  tamper_score,
  tamper_details,
  created_at
FROM uploads
WHERE tamper_score > 0.70
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

**Resolution:**
1. Review tamper_details to understand which forensic checks triggered
2. Check if forensic thresholds are too aggressive
3. Adjust thresholds in `ai-service/app/forensic.py`:
   ```python
   # Current thresholds
   ELA_WEIGHT = 0.30
   PRNU_WEIGHT = 0.20
   FONT_BASELINE_WEIGHT = 0.20
   FFT_WEIGHT = 0.15
   METADATA_WEIGHT = 0.15
   
   # Adjust if needed
   ```
4. Retrain forensic models if necessary

---

### Issue: Notifications Not Delivered

**Symptoms:**
- Notification status = "failed" or "failed_permanent"
- Users not receiving SMS/WhatsApp

**Diagnosis:**
```sql
-- Check failed notifications
SELECT 
  id,
  channel,
  recipient,
  status,
  retry_count,
  error_message,
  created_at
FROM notifications
WHERE status IN ('failed', 'failed_permanent')
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

**Resolution:**
1. Check Twilio/WhatsApp credentials in `.env`
2. Verify recipient phone numbers are in correct format (E.164)
3. Check Twilio/WhatsApp dashboard for delivery failures
4. Review notification adapter logs in AI service
5. If provider is down, wait for recovery or switch to backup provider

---

### Issue: DILRMP Sync Failures

**Symptoms:**
- sync_log status = "failed"
- Records not syncing to DILRMP

**Diagnosis:**
```sql
-- Check failed syncs
SELECT 
  id,
  record_id,
  status,
  retry_count,
  response,
  created_at
FROM sync_log
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

**Resolution:**
1. **Note:** DILRMP is currently a STUB endpoint
2. Check DILRMP stub service is running: `curl http://localhost:8001/health`
3. For real DILRMP integration:
   - Verify API endpoint URL in `.env`
   - Check API credentials
   - Review DILRMP API documentation
   - Check network connectivity
4. Manually retry failed syncs:
   ```sql
   UPDATE sync_log
   SET status = 'pending', retry_count = 0, next_retry_at = NOW()
   WHERE id = '<sync_log_id>';
   ```

---

### Issue: Admin Queue Backlog

**Symptoms:**
- Queue length > 50 uploads
- Long wait times for admin review

**Diagnosis:**
```sql
-- Check queue length
SELECT 
  status,
  COUNT(*) as count
FROM uploads
WHERE status IN ('admin_queue', 'quarantine')
GROUP BY status;

-- Check oldest pending uploads
SELECT 
  id,
  status,
  created_at,
  NOW() - created_at as wait_time
FROM uploads
WHERE status IN ('admin_queue', 'quarantine')
ORDER BY created_at ASC
LIMIT 10;
```

**Resolution:**
1. Notify admins of backlog
2. Temporarily increase admin staff
3. Review if routing thresholds are too strict
4. Consider auto-approving low-risk uploads (adjust routing logic)

---

### Issue: Database Performance

**Symptoms:**
- Slow query response times
- Dashboard loading slowly
- Timeout errors

**Diagnosis:**
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

**Resolution:**
1. Add missing indexes
2. Analyze and vacuum tables:
   ```sql
   ANALYZE uploads;
   ANALYZE records;
   VACUUM ANALYZE;
   ```
3. Consider materialized views for complex aggregations
4. Upgrade Supabase plan if needed

---

## Incident Response

### Severity Levels

**P0 - Critical:**
- System completely down
- Data loss or corruption
- Security breach

**P1 - High:**
- Major feature broken
- Many users affected
- No workaround

**P2 - Medium:**
- Minor feature broken
- Some users affected
- Workaround available

**P3 - Low:**
- Cosmetic issue
- Minimal user impact

### Response Procedures

**P0 Incident:**
1. Immediately notify team lead
2. Assess impact and scope
3. Implement emergency fix or rollback
4. Communicate status to stakeholders every 15 minutes
5. Conduct post-mortem within 24 hours

**P1 Incident:**
1. Notify team within 30 minutes
2. Assign owner and start investigation
3. Implement fix or workaround
4. Communicate status every hour
5. Conduct post-mortem within 48 hours

**P2 Incident:**
1. Log issue in tracking system
2. Assign to next available engineer
3. Fix within 24 hours
4. Update documentation if needed

**P3 Incident:**
1. Log issue in tracking system
2. Fix in next sprint
3. Update documentation if needed

---

## Maintenance

### Regular Tasks

**Daily:**
- Check system health
- Review error logs
- Monitor queue lengths
- Check notification delivery rates

**Weekly:**
- Review upload processing metrics
- Check OCR confidence trends
- Review fraud alert patterns
- Update documentation

**Monthly:**
- Database maintenance (VACUUM, ANALYZE)
- Review and optimize slow queries
- Update dependencies
- Security audit
- Backup verification

### Database Maintenance

```sql
-- Analyze tables (update statistics)
ANALYZE uploads;
ANALYZE records;
ANALYZE record_versions;
ANALYZE fraud_alerts;
ANALYZE notifications;
ANALYZE sync_log;

-- Vacuum (reclaim storage)
VACUUM ANALYZE uploads;
VACUUM ANALYZE records;
VACUUM ANALYZE record_versions;

-- Check table bloat
SELECT 
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

### Dependency Updates

```bash
# Update Python dependencies
cd ai-service
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt

# Update Node dependencies
cd ..
npm update

# Test thoroughly before deploying
```

---

## Disaster Recovery

### Backup Strategy

**Database:**
- Supabase automatic daily backups
- Point-in-time recovery up to 7 days
- Manual weekly exports for long-term retention

**Storage:**
- Supabase Storage automatic replication
- Manual backup of critical documents monthly

**Code:**
- Git repository with full history
- Branch protection on main

### Recovery Procedures

**Database Recovery:**
1. Identify recovery point
2. Use Supabase dashboard to restore from backup
3. Verify data integrity
4. Test application functionality
5. Monitor for issues

**Storage Recovery:**
1. Identify missing files
2. Restore from backup
3. Update database references if needed
4. Verify file accessibility

**Application Recovery:**
1. Redeploy from Git repository
2. Verify environment variables
3. Run health checks
4. Test critical workflows

### Recovery Time Objectives

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 24 hours

---

## Contact Information

**Development Team:**
- Team Lead: [Name, Email, Phone]
- Backend Engineer: [Name, Email, Phone]
- Frontend Engineer: [Name, Email, Phone]

**Supabase Support:**
- Website: https://supabase.com
- Support: support@supabase.com
- Status: https://status.supabase.com

**Twilio Support:**
- Website: https://twilio.com
- Support: https://support.twilio.com

---

## Appendix

### Useful SQL Queries

**Find uploads stuck in processing:**
```sql
SELECT *
FROM uploads
WHERE status = 'processing'
AND updated_at < NOW() - INTERVAL '5 minutes';
```

**Find failed notifications:**
```sql
SELECT *
FROM notifications
WHERE status IN ('failed', 'failed_permanent')
AND created_at > NOW() - INTERVAL '1 day';
```

**Find quarantined uploads:**
```sql
SELECT 
  id,
  tamper_score,
  tamper_details,
  created_at
FROM uploads
WHERE status = 'quarantine'
ORDER BY created_at DESC;
```

**Find records with fraud alerts:**
```sql
SELECT 
  r.id,
  r.khasra_no,
  r.owner_name,
  fa.type,
  fa.severity,
  fa.details
FROM records r
JOIN fraud_alerts fa ON fa.record_id = r.id
WHERE fa.resolved = false
ORDER BY fa.created_at DESC;
```

### Useful Commands

**Restart AI Service:**
```bash
docker restart land-record-ai-service
```

**View AI Service Logs:**
```bash
docker logs -f land-record-ai-service
```

**Check Database Size:**
```sql
SELECT pg_size_pretty(pg_database_size('postgres'));
```

**List Active Connections:**
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

---

**Document Version:** 1.0  
**Last Updated:** Phase 7 Completion  
**Status:** Production-Ready
