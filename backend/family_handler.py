import base64
import json
import os
import uuid
from datetime import datetime
from decimal import Decimal

import boto3
from botocore.config import Config
from boto3.dynamodb.conditions import Key

# AWS clients
s3 = boto3.client("s3", config=Config(signature_version="s3v4"))
rekog = boto3.client("rekognition")
ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_MAIN"])

# Configuration from env vars
BUCKET = os.environ["FAMILY_BUCKET"]
PREFIX = os.environ.get("FAMILY_PREFIX", "family")
COLLECTION = os.environ["FAMILY_COLLECTION"]
GSI_FACE = os.environ.get("GSI_FACE", "GSI2")
URL_EXPIRES = int(os.environ.get("FAMILY_URL_EXPIRES", "604800"))

# CORS headers
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
}

def json_default(o):
    if isinstance(o, Decimal):
        return float(o) if o % 1 else int(o)
    raise TypeError()

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def build_public_url(key: str, family_id: str = None, user_id: str = "u_123") -> str:
    """Generate API Gateway URL to proxy images instead of presigned S3 URLs"""
    if not key:
        return ""
    
    # Extract family ID from key if not provided
    if not family_id:
        # key format: family/u_123/fam_abc123.jpg
        parts = key.split("/")
        if len(parts) >= 3:
            filename = parts[-1]
            family_id = filename.rsplit(".", 1)[0]  # Remove extension
    
    if not family_id:
        print(f"Warning: Could not extract family_id from key {key}")
        return ""
    
    # Use API Gateway base URL from environment or construct it
    api_base = os.environ.get("API_BASE_URL", "")
    if not api_base:
        print(f"Warning: API_BASE_URL not set, cannot generate photo URL for {key}")
        return ""
    
    # Generate URL through API Gateway
    photo_url = f"{api_base}/family/{family_id}/photo"
    print(f"Generated API Gateway photo URL for {key}: {photo_url}")
    return photo_url

def parse_body(event):
    try:
        return json.loads(event.get("body") or "{}")
    except Exception:
        return {}

def get_http(event):
    http = event.get("requestContext", {}).get("http", {})
    return http.get("method", "GET").upper(), http.get("path", "")

def get_user_id(body, qs):
    return body.get("userId") or qs.get("userId") or "u_123"

def generate_s3_key(user_id, family_id, extension):
    prefix = PREFIX.strip("/")
    return f"{prefix}/{user_id}/{family_id}.{extension}".lstrip("/")

def handler(event, context):
    method, path = get_http(event)
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    body = parse_body(event)
    user_id = get_user_id(body, qs)

    try:
        if method == "POST" and path.endswith("/family"):
            return handle_create_family(user_id, body)
        if method == "GET" and path.endswith("/family"):
            return handle_list_family(user_id)
        if method == "DELETE" and "/family/" in path:
            family_id = event.get("pathParameters", {}).get("id") or path.rsplit("/", 1)[-1]
            return handle_delete_family(user_id, family_id)
        if method == "POST" and path.endswith("/recognize"):
            return handle_recognize(user_id, body)
        if method == "GET" and "/family/" in path and "/photo" in path:
            # Proxy image through API Gateway
            family_id = path.split("/family/")[1].split("/")[0]
            return handle_get_photo(user_id, family_id)
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Internal Server Error", "error": str(e)}),
        }

    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"message": "not found"})}

# ---------- handlers ----------

def handle_create_family(user_id, body):
    family_id = body.get("familyMemberId") or f"fam_{uuid.uuid4().hex[:10]}"
    name = (body.get("name") or "").strip()
    relationship = (body.get("relationship") or "").strip()
    image_base64 = body.get("imageBase64")
    
    if not name or not relationship or not image_base64:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "name, relationship, imageBase64 are required"}),
        }

    # Decode base64 image
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Invalid base64 image: {str(e)}"}),
        }

    # Determine extension from content type or default to jpg
    content_type = body.get("contentType") or "image/jpeg"
    extension = "jpg"
    if "png" in content_type.lower():
        extension = "png"
    elif "jpeg" in content_type.lower() or "jpg" in content_type.lower():
        extension = "jpg"
    elif "heic" in content_type.lower():
        extension = "heic"

    s3_key = generate_s3_key(user_id, family_id, extension)

    # Upload to S3
    try:
        s3.put_object(
            Bucket=BUCKET,
            Key=s3_key,
            Body=image_bytes,
            ContentType=content_type,
        )
        print(f"Successfully uploaded image to S3: {s3_key}")
    except Exception as e:
        print(f"Error uploading to S3: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to upload to S3: {str(e)}"}),
        }

    # Index face in Rekognition
    try:
        index_resp = rekog.index_faces(
            CollectionId=COLLECTION,
            Image={"S3Object": {"Bucket": BUCKET, "Name": s3_key}},
            ExternalImageId=f"{user_id}:{family_id}",
            DetectionAttributes=[],
        )
        if not index_resp.get("FaceRecords"):
            # Delete from S3 if no face detected
            try:
                s3.delete_object(Bucket=BUCKET, Key=s3_key)
            except:
                pass
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "No face detected in image"}),
            }
        face_id = index_resp["FaceRecords"][0]["Face"]["FaceId"]
    except Exception as e:
        # Delete from S3 if Rekognition fails
        try:
            s3.delete_object(Bucket=BUCKET, Key=s3_key)
        except:
            pass
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to index face: {str(e)}"}),
        }

    # Save to DynamoDB
    item = {
        "PK": f"USER#{user_id}",
        "SK": f"FAMILY#{family_id}",
        "entity": "FAMILY",
        "familyMemberId": family_id,
        "userId": user_id,
        "name": name,
        "relationship": relationship,
        "photoS3Key": s3_key,
        "rekognitionFaceId": face_id,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
        "GSI2PK": f"FACE#{face_id}",
        "GSI2SK": f"USER#{user_id}#FAMILY#{family_id}",
    }

    table.put_item(Item=item)

    # Verify object exists before generating presigned URL
    try:
        s3.head_object(Bucket=BUCKET, Key=s3_key)
        print(f"Verified object exists in S3: {s3_key}")
    except Exception as e:
        print(f"Warning: Could not verify object exists: {str(e)}")
    
    photo_url = build_public_url(s3_key, family_id=family_id, user_id=user_id)
    
    return {
        "statusCode": 201,
        "headers": CORS_HEADERS,
        "body": json.dumps(
            {
                "familyMemberId": family_id,
                "name": name,
                "relationship": relationship,
                "photoS3Key": s3_key,
                "photoUrl": photo_url,
                "rekognitionFaceId": face_id,
                "createdAt": item["createdAt"],
            },
            default=json_default
        ),
    }

def handle_list_family(user_id):
    resp = table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("FAMILY#"),
        Limit=200,
    )
    items = resp.get("Items", [])
    mapped = [
        {
            "familyMemberId": it.get("familyMemberId"),
            "name": it.get("name"),
            "relationship": it.get("relationship"),
            "photoS3Key": it.get("photoS3Key"),
            "photoUrl": build_public_url(it.get("photoS3Key"), family_id=it.get("familyMemberId"), user_id=user_id),
            "rekognitionFaceId": it.get("rekognitionFaceId"),
            "createdAt": it.get("createdAt"),
        }
        for it in items
    ]
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(mapped, default=json_default)}

def handle_delete_family(user_id, family_id):
    resp = table.get_item(Key={"PK": f"USER#{user_id}", "SK": f"FAMILY#{family_id}"})
    item = resp.get("Item")
    if not item:
        return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"message": "not found"})}

    photo_key = item.get("photoS3Key")
    face_id = item.get("rekognitionFaceId")

    table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"FAMILY#{family_id}"})

    if photo_key:
        try:
            s3.delete_object(Bucket=BUCKET, Key=photo_key)
        except Exception:
            pass

    if face_id:
        try:
            rekog.delete_faces(CollectionId=COLLECTION, FaceIds=[face_id])
        except Exception:
            pass

    return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

def handle_get_photo(user_id, family_id):
    """Proxy S3 image through API Gateway to avoid presigned URL issues"""
    try:
        # Get family member details from DynamoDB
        resp = table.get_item(Key={"PK": f"USER#{user_id}", "SK": f"FAMILY#{family_id}"})
        item = resp.get("Item")
        if not item:
            return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"message": "not found"})}
        
        s3_key = item.get("photoS3Key")
        if not s3_key:
            return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"message": "photo not found"})}
        
        # Get object from S3
        s3_obj = s3.get_object(Bucket=BUCKET, Key=s3_key)
        image_bytes = s3_obj["Body"].read()
        content_type = s3_obj.get("ContentType", "image/jpeg")
        
        # Return image as base64-encoded body
        return {
            "statusCode": 200,
            "headers": {
                **CORS_HEADERS,
                "Content-Type": content_type,
            },
            "body": base64.b64encode(image_bytes).decode("utf-8"),
            "isBase64Encoded": True,
        }
    except Exception as e:
        print(f"Error getting photo: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to get photo: {str(e)}"}),
        }

def handle_recognize(user_id, body):
    image_b64 = body.get("imageBase64")
    if not image_b64:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"message": "imageBase64 is required"})}

    min_conf = float(body.get("minConfidence", 85))

    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_b64)

    search_resp = rekog.search_faces_by_image(
        CollectionId=COLLECTION,
        Image={"Bytes": image_bytes},
        FaceMatchThreshold=min_conf,
        MaxFaces=1,
    )
    matches = search_resp.get("FaceMatches", [])
    if not matches:
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"match": None})}

    match = matches[0]
    face_id = match["Face"]["FaceId"]
    similarity = match.get("Similarity")

    ddb_resp = table.query(
        IndexName=GSI_FACE,
        KeyConditionExpression=Key("GSI2PK").eq(f"FACE#{face_id}"),
        Limit=1,
    )
    if not ddb_resp.get("Items"):
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"match": {"faceId": face_id, "similarity": similarity, "metadata": None}}),
        }

    item = ddb_resp["Items"][0]
    result = {
        "faceId": face_id,
        "similarity": similarity,
        "metadata": {
            "familyMemberId": item.get("familyMemberId"),
            "name": item.get("name"),
            "relationship": item.get("relationship"),
            "photoS3Key": item.get("photoS3Key"),
            "userId": item.get("userId"),
        },
    }
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"match": result}, default=json_default)}

