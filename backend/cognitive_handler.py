import json, os, re
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

def list_cognitive(user_id: str):
  r = table.query(
    KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("COG#"),
    Limit=200
  )
  return [it for it in r.get("Items", [])]

def get_cognitive(user_id: str, exercise_id: str):
  r = table.get_item(Key={"PK": f"USER#{user_id}", "SK": f"COG#{exercise_id}"})
  return r.get("Item")

def create_cognitive(user_id: str, body: dict):
  question = body.get("question")
  if not question or not question.strip():
    return 400, {"message": "question is required"}

  eid = body.get("exerciseId") or datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")
  ts = now_iso()
  item = {
    "PK": f"USER#{user_id}",
    "SK": f"COG#{eid}",
    "entity": "COGNITIVE",
    "exerciseId": eid,
    "question": str(question).strip(),
    "category": body.get("category"),
    "difficulty": body.get("difficulty"),
    "createdAt": ts,
    "updatedAt": ts,
    "version": 1
  }
  # Remove None attributes
  item = {k: v for k, v in item.items() if v is not None}
  table.put_item(Item=item)
  return 201, item

def update_cognitive(user_id: str, exercise_id: str, body: dict):
  current = get_cognitive(user_id, exercise_id)
  if not current:
    return 404, {"message": "not found"}

  allowed = ["question", "category", "difficulty"]
  for k in allowed:
    if k in body:
      current[k] = body[k] if body[k] is not None else None

  current["updatedAt"] = now_iso()
  current["version"] = int(current.get("version", 0)) + 1

  # Clean None values
  current = {k: v for k, v in current.items() if v is not None}
  table.put_item(Item=current)
  return 200, current

def delete_cognitive(user_id: str, exercise_id: str):
  table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"COG#{exercise_id}"})
  return 204, {}

def handler(event, context):
  method, path = get_http(event)
  qs, path_params = get_params(event)
  body = parse_body(event)

  # In production, derive userId from auth; for now accept via query/body
  user_id = qs.get("userId") or body.get("userId") or "demo_user"

  # Preflight
  if method == "OPTIONS":
    return resp(204, {})

  # Routing
  if path.endswith("/cognitive") and method == "GET":
    return resp(200, list_cognitive(user_id))

  if "/cognitive/" in path and method == "GET":
    eid = path_params.get("id") or path.rsplit("/", 1)[-1]
    item = get_cognitive(user_id, eid)
    if not item:
      return resp(404, {"message": "not found"})
    return resp(200, item)

  if path.endswith("/cognitive") and method == "POST":
    status, out = create_cognitive(user_id, body)
    return resp(status, out)

  if "/cognitive/" in path and method == "PATCH":
    eid = path_params.get("id") or path.rsplit("/", 1)[-1]
    status, out = update_cognitive(user_id, eid, body)
    return resp(status, out)

  if "/cognitive/" in path and method == "DELETE":
    eid = path_params.get("id") or path.rsplit("/", 1)[-1]
    status, out = delete_cognitive(user_id, eid)
    return resp(status, out)

  return resp(404, {"message": "not found"})
