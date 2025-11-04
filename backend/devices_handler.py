import json, os
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

ddb = boto3.resource('dynamodb')
table = ddb.Table(os.environ['TABLE_MAIN'])

CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
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

def list_devices(user_id: str):
  r = table.query(
    KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("DEVICE#"),
    Limit=100
  )
  items = r.get("Items", [])
  # Map to simple format
  return [
    {
      "deviceId": item.get("deviceId") or (item.get("SK", "").split("DEVICE#")[1] if "DEVICE#" in item.get("SK", "") else ""),
      "name": item.get("name", "Untitled Device"),
      "status": item.get("status", "active"),
      "createdAt": item.get("createdAt", ""),
    }
    for item in items
  ]

def get_device(user_id: str, device_id: str):
  r = table.get_item(Key={"PK": f"USER#{user_id}", "SK": f"DEVICE#{device_id}"})
  return r.get("Item")

def create_device(user_id: str, body: dict):
  name = body.get("name", "Untitled Device")
  device_id = body.get("deviceId") or f"d_{datetime.utcnow().strftime('%Y%m%dT%H%M%S%f')}"
  ts = now_iso()
  
  item = {
    "PK": f"USER#{user_id}",
    "SK": f"DEVICE#{device_id}",
    "entity": "DEVICE",
    "deviceId": device_id,
    "name": str(name),
    "status": body.get("status", "active"),
    "createdAt": ts,
    "updatedAt": ts,
  }
  item = {k: v for k, v in item.items() if v is not None}
  table.put_item(Item=item)
  return 201, item

def handler(event, context):
  method, path = get_http(event)
  qs, path_params = get_params(event)
  body = parse_body(event)

  # In production, derive userId from auth; for now accept via query/body
  user_id = qs.get("userId") or body.get("userId") or "demo_user"

  if method == "OPTIONS":
    return resp(204, {})

  if path.endswith("/devices") and method == "GET":
    return resp(200, list_devices(user_id))

  if "/devices/" in path and method == "GET":
    did = path_params.get("id") or path.rsplit("/", 1)[-1]
    item = get_device(user_id, did)
    if not item:
      return resp(404, {"message": "not found"})
    return resp(200, {
      "deviceId": item.get("deviceId") or (item.get("SK", "").split("DEVICE#")[1] if "DEVICE#" in item.get("SK", "") else ""),
      "name": item.get("name", "Untitled Device"),
      "status": item.get("status", "active"),
      "createdAt": item.get("createdAt", ""),
    })

  if path.endswith("/devices") and method == "POST":
    status, out = create_device(user_id, body)
    return resp(status, out)

  return resp(404, {"message": "not found"})
