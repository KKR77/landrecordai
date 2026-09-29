import os
import time
import requests
from supabase import create_client, Client

# --- CONFIGURATION ---
POLL_INTERVAL_SECONDS = 5  # How often to check for new work
AI_SERVICE_URL = "http://localhost:8000"  # Your local AI service
STORAGE_BUCKET = 'document-scans'

# --- INITIALIZE SUPABASE CLIENT (using service_role key) ---
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise Exception("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

def process_upload(upload_id: str, storage_path: str, mime_type: str) -> dict:
    """Call your local AI service to process the document"""
    try:
        # Call the pipeline endpoint (uses storage_path to fetch from Supabase Storage)
        response = requests.post(
            f"{AI_SERVICE_URL}/pipeline",
            json={
                "storage_path": storage_path,
                "upload_id": upload_id,
                # You can add other parameters like languages if needed
            },
            timeout=30  # Wait up to 30 seconds for processing
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "decision": "failed"
        }

def main():
    print("🚀 LOCAL WORKER STARTED - Polling for uploads...")
    print(f"   Checking every {POLL_INTERVAL_SECONDS} seconds for status 'uploading'")
    print("   Press Ctrl+C to stop\n")

    while True:
        try:
            # STEP 1: Find one candidate upload with status 'uploading'
            candidate = supabase.table('uploads')\
                .select('id, storage_path, mime_type')\
                .eq('status', 'uploading')\
                .limit(1)\
                .execute()

            if not candidate.data:
                # No work available, wait before checking again
                time.sleep(POLL_INTERVAL_SECONDS)
                continue

            upload_id = candidate.data[0]['id']
            storage_path = candidate.data[0]['storage_path']
            mime_type = candidate.data[0]['mime_type']

            # STEP 2: Try to atomically claim this upload by updating status from 'uploading' to 'processing'
            # We use eq('status', 'uploading') to ensure we only claim it if it's still 'uploading'
            update_result = supabase.table('uploads')\
                .update({'status': 'processing'})\
                .eq('id', upload_id)\
                .eq('status', 'uploading')\
                .execute()

            # Check if we successfully claimed it (update affected 1 row)
            if update_result.count == 0:
                # Someone else took it, skip and try next
                continue

            # STEP 3: Fetch the full record (now with status 'processing')
            upload = supabase.table('uploads')\
                .select('*')\
                .eq('id', upload_id)\
                .single()\
                .execute()

            if not upload.data:
                # This shouldn't happen, but skip if it does
                continue

            upload = upload.data
            print(f"📥 Processing upload {upload['id']}...")

            # STEP 4: Process with local AI service
            result = process_upload(upload['id'], upload['storage_path'], upload['mime_type'])

            # STEP 5: Update record with result
            update_data = {
                'status': 'completed' if result.get('success') and result.get('decision') == 'auto_save' else
                          'admin_queue' if result.get('success') and result.get('decision') == 'admin_queue' else
                          'failed',
                'updated_at': 'now()'
            }

            # Add extracted data if available
            if result.get('success'):
                if 'extracted_data' in result:
                    update_data['extracted_text'] = str(result['extracted_data'])  # Adjust based on your actual response
                if 'confidence_scores' in result:
                    update_data['confidence'] = result['confidence_scores']
                # Add any other fields your AI service returns

            # Add error if failed
            if not result.get('success') and 'error' in result:
                update_data['error'] = result['error']

            supabase.table('uploads')\
                .update(update_data)\
                .eq('id', upload['id'])\
                .execute()

            status = update_data['status']
            print(f"✅ Upload {upload['id']} processed → {status}")

        except KeyboardInterrupt:
            print("\n👋 Worker stopped by user")
            break
        except Exception as e:
            print(f"💥 Worker error: {str(e)}")
            time.sleep(POLL_INTERVAL_SECONDS)  # Wait before retrying after error

if __name__ == "__main__":
    main()