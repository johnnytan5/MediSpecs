import json, os
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

ddb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
table = ddb.Table(os.environ['TABLE_MAIN'])
s3_bucket = os.environ.get('S3_BUCKET', 'medispecs-videos')
s3_region = os.environ.get('S3_REGION', 'ap-southeast-1')
pre_signed_expiry = int(os.environ.get('PRE_SIGNED_URL_EXPIRY', '3600'))

CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
}

def _json_default(o):
  if isinstance(o, Decimal):
    return int(o) if o % 1 == 0 else float(o)
  raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

def resp(status, body):
  return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(body, default=_json_default)}

def parse_body(event):
  try:
    return json.loads(event.get("body") or "{}")
  except:
    return {}

def get_http(event):
  http = event.get("requestContext", {}).get("http", {})
  return http.get("method", "GET").upper(), http.get("path", "")

def get_params(event):
  return (event.get("queryStringParameters") or {}), (event.get("pathParameters") or {})

def now_iso():
  return datetime.utcnow().isoformat() + "Z"

def list_videos(user_id: str, date_from: str = None, date_to: str = None, time_from: str = None, time_to: str = None):
  """List videos for a user, optionally filtered by date and time range"""
  # Query all videos for user
  r = table.query(
    KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("VIDEO#"),
    Limit=500
  )
  items = r.get("Items", [])
  
  # Filter by date/time if provided
  if date_from or date_to or time_from or time_to:
    filtered = []
    for item in items:
      recorded_at = item.get("recordedAt")
      if not recorded_at:
        continue
      
      try:
        dt = datetime.fromisoformat(recorded_at.replace('Z', '+00:00'))
        
        # Build from_datetime (combine date_from + time_from)
        if date_from or time_from:
          if date_from:
            # Parse date_from (could be YYYY-MM-DD or ISO datetime)
            if 'T' in date_from or ' ' in date_from:
              from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            else:
              # YYYY-MM-DD format, combine with time_from
              from_dt = datetime.fromisoformat(f"{date_from}T00:00:00+00:00")
              if time_from:
                # Parse time_from (HH:MM format)
                time_parts = time_from.split(':')
                from_dt = from_dt.replace(hour=int(time_parts[0]), minute=int(time_parts[1]) if len(time_parts) > 1 else 0)
          else:
            # Only time_from, use today's date
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            time_parts = time_from.split(':')
            from_dt = today.replace(hour=int(time_parts[0]), minute=int(time_parts[1]) if len(time_parts) > 1 else 0)
          
          if dt < from_dt:
            continue
        
        # Build to_datetime (combine date_to + time_to)
        if date_to or time_to:
          if date_to:
            # Parse date_to (could be YYYY-MM-DD or ISO datetime)
            if 'T' in date_to or ' ' in date_to:
              to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            else:
              # YYYY-MM-DD format, combine with time_to
              to_dt = datetime.fromisoformat(f"{date_to}T23:59:59+00:00")
              if time_to:
                # Parse time_to (HH:MM format)
                time_parts = time_to.split(':')
                to_dt = to_dt.replace(hour=int(time_parts[0]), minute=int(time_parts[1]) if len(time_parts) > 1 else 0, second=59)
          else:
            # Only time_to, use today's date
            today = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=0)
            time_parts = time_to.split(':')
            to_dt = today.replace(hour=int(time_parts[0]), minute=int(time_parts[1]) if len(time_parts) > 1 else 0, second=59)
          
          if dt > to_dt:
            continue
        
        filtered.append(item)
      except Exception as e:
        # Skip items with invalid dates
        continue
    items = filtered
  
  # Sort by recordedAt descending
  items.sort(key=lambda x: x.get("recordedAt", ""), reverse=True)
  return items

def get_video(user_id: str, video_id: str):
  """Get a single video by ID"""
  # Query to find video with this ID
  r = table.query(
    KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("VIDEO#"),
    Limit=500
  )
  for item in r.get("Items", []):
    if item.get("videoId") == video_id:
      return item
  return None

def create_video(user_id: str, body: dict):
  """Create video metadata entry"""
  # Demo override: force shared device for everyone
  device_id = 'd_123'
  title = body.get("title") or "Video Recording"
  recorded_at = body.get("recordedAt") or body.get("recordedAtIso") or now_iso()
  
  # Generate video ID
  video_id = body.get("videoId") or datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")
  
  # S3 key structure: videos/{userId}/{videoId}.{ext}
  # Default to .mp4 if not specified
  file_ext = body.get("fileExtension") or "mp4"
  s3_key = f"videos/{user_id}/{video_id}.{file_ext}"
  
  ts = now_iso()
  item = {
    "PK": f"USER#{user_id}",
    "SK": f"VIDEO#{recorded_at}#{video_id}",  # Sort key includes timestamp for ordering
    "entity": "VIDEO",
    "videoId": video_id,
    "userId": user_id,
    "deviceId": device_id,
    "title": str(title),
    "s3Key": s3_key,
    "s3Bucket": s3_bucket,
    "recordedAt": recorded_at,
    "durationSec": body.get("durationSec"),
    "fileSizeBytes": body.get("fileSizeBytes"),
    "mimeType": body.get("mimeType") or f"video/{file_ext}",
    "status": body.get("status") or "uploaded",  # uploaded | processing | ready | error
    "createdAt": ts,
    "updatedAt": ts,
    "version": 1
  }
  
  # Remove None attributes
  item = {k: v for k, v in item.items() if v is not None}
  table.put_item(Item=item)
  return 201, item

def get_upload_url(user_id: str, video_id: str, content_type: str = "video/mp4"):
  """Generate pre-signed URL for uploading video to S3"""
  s3_key = f"videos/{user_id}/{video_id}.mp4"
  
  try:
    url = s3_client.generate_presigned_url(
      'put_object',
      Params={
        'Bucket': s3_bucket,
        'Key': s3_key,
        'ContentType': content_type
      },
      ExpiresIn=pre_signed_expiry
    )
    return 200, {
      "uploadUrl": url,
      "s3Key": s3_key,
      "s3Bucket": s3_bucket,
      "expiresIn": pre_signed_expiry
    }
  except Exception as e:
    return 500, {"message": f"Failed to generate upload URL: {str(e)}"}

def get_playback_url(user_id: str, video_id: str):
  """Generate pre-signed URL for downloading/viewing video from S3"""
  video_item = get_video(user_id, video_id)
  if not video_item:
    return 404, {"message": "video not found"}
  
  s3_key = video_item.get("s3Key")
  if not s3_key:
    return 400, {"message": "video S3 key not found"}
  
  try:
    url = s3_client.generate_presigned_url(
      'get_object',
      Params={
        'Bucket': s3_bucket,
        'Key': s3_key
      },
      ExpiresIn=pre_signed_expiry
    )
    return 200, {
      "playbackUrl": url,
      "s3Key": s3_key,
      "expiresIn": pre_signed_expiry
    }
  except Exception as e:
    return 500, {"message": f"Failed to generate playback URL: {str(e)}"}

## Thumbnail handling intentionally omitted in this simplified version

def delete_video(user_id: str, video_id: str):
  """Delete video metadata and optionally S3 objects"""
  video_item = get_video(user_id, video_id)
  if not video_item:
    return 404, {"message": "video not found"}
  
  # Delete from DynamoDB
  sk = video_item.get("SK")
  if sk:
    table.delete_item(Key={"PK": f"USER#{user_id}", "SK": sk})
  
  # Optionally delete from S3 (uncomment if you want to delete files too)
  # s3_key = video_item.get("s3Key")
  # if s3_key:
  #   try:
  #     s3_client.delete_object(Bucket=s3_bucket, Key=s3_key)
  #   except:
  #     pass
  # 
  # thumbnail_key = video_item.get("thumbnailS3Key")
  # if thumbnail_key:
  #   try:
  #     s3_client.delete_object(Bucket=s3_bucket, Key=thumbnail_key)
  #   except:
  #     pass
  
  return 204, {}

def handler(event, context):
  try:
    method, path = get_http(event)
    qs, path_params = get_params(event)
    body = parse_body(event)
    
    # Demo override: force shared user for everyone
    user_id = 'u_123'
    
    # Preflight
    if method == "OPTIONS":
      return resp(204, {})
    
    # Routing
    if path.endswith("/videos") and method == "GET":
      date_from = qs.get("dateFrom") or qs.get("date_from")
      date_to = qs.get("dateTo") or qs.get("date_to")
      time_from = qs.get("timeFrom") or qs.get("time_from")
      time_to = qs.get("timeTo") or qs.get("time_to")
      videos = list_videos(user_id, date_from, date_to, time_from, time_to)
      return resp(200, videos)
    
    if path.endswith("/videos") and method == "POST":
      status, out = create_video(user_id, body)
      return resp(status, out)
    
    if "/videos/" in path and method == "GET":
      video_id = path_params.get("videoId") or path.rsplit("/", 1)[-1]
      item = get_video(user_id, video_id)
      if not item:
        return resp(404, {"message": "not found"})
      return resp(200, item)
    
    if "/videos/" in path and path.endswith("/upload-url") and method == "GET":
      video_id = path_params.get("videoId") or path.split("/videos/")[1].split("/")[0]
      content_type = qs.get("contentType") or "video/mp4"
      status, out = get_upload_url(user_id, video_id, content_type)
      return resp(status, out)
    
    if "/videos/" in path and path.endswith("/playback-url") and method == "GET":
      video_id = path_params.get("videoId") or path.split("/videos/")[1].split("/")[0]
      status, out = get_playback_url(user_id, video_id)
      return resp(status, out)
    
    # No thumbnail endpoint in simplified implementation
    
    if "/videos/" in path and method == "DELETE":
      video_id = path_params.get("videoId") or path.rsplit("/", 1)[-1]
      status, out = delete_video(user_id, video_id)
      return resp(status, out)
    
    return resp(404, {"message": "not found"})
  except Exception as e:
    error_msg = str(e)
    error_type = type(e).__name__
    return resp(500, {
      "message": "Internal Server Error",
      "error": error_msg,
      "type": error_type
    })

