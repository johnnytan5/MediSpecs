import json, os
from datetime import datetime, timedelta
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

ddb = boto3.resource('dynamodb')
ddb_client = boto3.client('dynamodb')
table = ddb.Table(os.environ['TABLE_LOCATIONS'])

CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
}

def _json_default(o):
  if isinstance(o, Decimal):
    return int(o) if o % 1 == 0 else float(o)
  raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

def resp(status, body):
  return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps(body, default=_json_default)}

def get_http(event):
  http = event.get("requestContext", {}).get("http", {})
  return http.get("method", "GET").upper(), http.get("path", "")

def get_params(event):
  return (event.get("queryStringParameters") or {})

def parse_body(event):
  try:
    return json.loads(event.get("body") or "{}")
  except:
    return {}

def parse_date(date_str):
  """Parse YYYYMMDD string to date object"""
  try:
    return datetime.strptime(date_str, "%Y%m%d")
  except:
    return None

def date_range(start_date, end_date):
  """Generate list of dates between start and end (inclusive)"""
  dates = []
  current = start_date
  while current <= end_date:
    dates.append(current)
    current += timedelta(days=1)
  return dates

def query_single_day(device_id: str, date_str: str, limit: int = 1000):
  """Query locations for a single day"""
  pk = f"DEVICE#{device_id}#DATE#{date_str}"
  r = table.query(
    KeyConditionExpression=Key("DeviceDate").eq(pk),
    ScanIndexForward=True,  # oldest first
    Limit=limit
  )
  items = r.get("Items", [])
  # Convert to simple format
  return [
    {
      "lat": float(item.get("lat", 0)),
      "lng": float(item.get("lng", 0)),
      "timestamp": item.get("timestampIso", ""),
      "accuracy": float(item.get("accuracy", 0)) if item.get("accuracy") else None,
      "speed": float(item.get("speed", 0)) if item.get("speed") else None,
    }
    for item in items
    if "lat" in item and "lng" in item
  ]

def list_locations(qs: dict):
  device_id = qs.get("deviceId") or qs.get("device_id")
  if not device_id:
    return 400, {"message": "deviceId is required"}

  date = qs.get("date")  # YYYYMMDD format
  from_date = qs.get("fromDate")
  to_date = qs.get("toDate")
  limit = int(qs.get("limit", "500"))

  all_points = []

  if date:
    # Single day query
    points = query_single_day(device_id, date, limit)
    all_points.extend(points)
  elif from_date and to_date:
    # Date range query
    start = parse_date(from_date)
    end = parse_date(to_date)
    if not start or not end:
      return 400, {"message": "fromDate and toDate must be YYYYMMDD format"}
    if start > end:
      return 400, {"message": "fromDate must be <= toDate"}
    
    # Query each day in range
    dates = date_range(start, end)
    for d in dates:
      date_str = d.strftime("%Y%m%d")
      points = query_single_day(device_id, date_str, limit // len(dates) if dates else limit)
      all_points.extend(points)
    
    # Sort by timestamp
    all_points.sort(key=lambda x: x.get("timestamp", ""))
  else:
    # Default: today only
    today = datetime.utcnow().strftime("%Y%m%d")
    points = query_single_day(device_id, today, limit)
    all_points.extend(points)

  return 200, all_points

def batch_write_locations(body: dict):
  """Batch write location points to DynamoDB"""
  device_id = body.get("deviceId") or body.get("device_id")
  if not device_id:
    return 400, {"message": "deviceId is required"}

  locations = body.get("locations") or body.get("points", [])
  if not isinstance(locations, list):
    return 400, {"message": "locations must be an array"}

  if len(locations) == 0:
    return 400, {"message": "locations array cannot be empty"}

  if len(locations) > 100:  # DynamoDB batch limit
    return 400, {"message": "Maximum 100 locations per batch"}

  # Group by date for efficient writes
  items_to_write = []
  written_count = 0

  for loc in locations:
    lat_raw = loc.get("lat")
    lng_raw = loc.get("lng")
    timestamp = loc.get("timestamp") or loc.get("timestampIso")

    if lat_raw is None or lng_raw is None:
      continue  # Skip invalid entries

    # Convert to Decimal immediately (avoid any float operations)
    try:
      lat = Decimal(str(lat_raw))
      lng = Decimal(str(lng_raw))
    except (ValueError, TypeError):
      continue  # Skip invalid entries

    # Parse timestamp
    if timestamp:
      try:
        if isinstance(timestamp, str):
          dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        else:
          dt = datetime.fromtimestamp(float(timestamp))
      except:
        dt = datetime.utcnow()
    else:
      dt = datetime.utcnow()

    # Format date for partition key
    date_str = dt.strftime("%Y%m%d")
    ts_ms = int(dt.timestamp() * 1000)

    # Create item (use Decimal for numeric types)
    item = {
      "DeviceDate": f"DEVICE#{device_id}#DATE#{date_str}",
      "TS": ts_ms,
      "lat": lat,
      "lng": lng,
      "timestampIso": dt.isoformat() + "Z",
    }

    # Optional fields (convert to Decimal)
    if loc.get("accuracy") is not None:
      try:
        item["accuracy"] = Decimal(str(loc["accuracy"]))
      except (ValueError, TypeError):
        pass  # Skip invalid accuracy
    if loc.get("speed") is not None:
      try:
        item["speed"] = Decimal(str(loc["speed"]))
      except (ValueError, TypeError):
        pass  # Skip invalid speed
    
    # TTL (optional, if you want auto-cleanup)
    # expires_at = dt + timedelta(days=30)  # 30 days retention
    # item["expiresAt"] = int(expires_at.timestamp())

    items_to_write.append(item)
    written_count += 1

  if written_count == 0:
    return 400, {"message": "No valid locations to write"}

  # Write items using put_item (more reliable with Decimal types)
  errors = []
  success_count = 0
  
  for i, item in enumerate(items_to_write):
    try:
      table.put_item(Item=item)
      success_count += 1
    except Exception as e:
      errors.append(f"Item {i+1}: {str(e)}")
      # Continue with other items even if one fails
  
  if success_count == 0:
    return 500, {
      "message": "Failed to write any locations",
      "errors": errors[:5]  # Show first 5 errors
    }
  
  if errors:
    # Partial success
    return 207, {
      "message": f"Successfully wrote {success_count}/{written_count} location(s)",
      "count": success_count,
      "errors": len(errors),
      "error_details": errors[:5] if len(errors) <= 5 else errors[:5] + [f"... and {len(errors) - 5} more errors"]
    }
  
  return 201, {
    "message": f"Successfully wrote {written_count} location(s)",
    "count": written_count
  }

def handler(event, context):
  try:
    method, path = get_http(event)
    qs = get_params(event)
    body = parse_body(event)

    # Preflight
    if method == "OPTIONS":
      return resp(204, {})

    if path.endswith("/locations") and method == "GET":
      status, out = list_locations(qs)
      return resp(status, out)

    if path.endswith("/locations") and method == "POST":
      status, out = batch_write_locations(body)
      return resp(status, out)

    return resp(404, {"message": "not found"})
  except Exception as e:
    # Log full error for debugging
    error_msg = str(e)
    error_type = type(e).__name__
    return resp(500, {
      "message": "Internal Server Error",
      "error": error_msg,
      "type": error_type
    })
