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
ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["TABLE_MAIN"])

# Configuration from env vars
BUCKET = os.environ["MEDICATIONS_BUCKET"]
PREFIX = os.environ.get("MEDICATIONS_PREFIX", "medications")
URL_EXPIRES = int(os.environ.get("MEDICATIONS_URL_EXPIRES", "604800"))

# CORS headers
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

def json_default(o):
    if isinstance(o, Decimal):
        return float(o) if o % 1 else int(o)
    raise TypeError()

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def build_photo_url(key: str, medication_id: str = None, user_id: str = "u_123") -> str:
    """Generate API Gateway URL to proxy images"""
    if not key:
        return ""
    
    # Extract medication ID from key if not provided
    if not medication_id:
        # key format: medications/u_123/med_abc123.jpg
        parts = key.split("/")
        if len(parts) >= 3:
            filename = parts[-1]
            medication_id = filename.rsplit(".", 1)[0]  # Remove extension
    
    if not medication_id:
        print(f"Warning: Could not extract medication_id from key {key}")
        return ""
    
    # Use API Gateway base URL from environment
    api_base = os.environ.get("API_BASE_URL", "")
    if not api_base:
        print(f"Warning: API_BASE_URL not set, cannot generate photo URL for {key}")
        return ""
    
    # Generate URL through API Gateway
    photo_url = f"{api_base}/medications/{medication_id}/photo"
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

def generate_s3_key(user_id, medication_id, extension):
    prefix = PREFIX.strip("/")
    return f"{prefix}/{user_id}/{medication_id}.{extension}".lstrip("/")

def handler(event, context):
    method, path = get_http(event)
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    qs = event.get("queryStringParameters") or {}
    body = parse_body(event)
    user_id = get_user_id(body, qs)

    try:
        if method == "POST" and path.endswith("/medications"):
            return handle_create_medication(user_id, body)
        if method == "GET" and path.endswith("/medications"):
            return handle_list_medications(user_id)
        if method == "GET" and "/medications/" in path and "/photo" in path:
            # Proxy image through API Gateway
            medication_id = path.split("/medications/")[1].split("/")[0]
            return handle_get_photo(user_id, medication_id)
        if method == "GET" and "/medications/" in path:
            medication_id = event.get("pathParameters", {}).get("id") or path.rsplit("/", 1)[-1]
            return handle_get_medication(user_id, medication_id)
        if method == "PUT" and "/medications/" in path:
            medication_id = event.get("pathParameters", {}).get("id") or path.rsplit("/", 1)[-1]
            return handle_update_medication(user_id, medication_id, body)
        if method == "DELETE" and "/medications/" in path:
            medication_id = event.get("pathParameters", {}).get("id") or path.rsplit("/", 1)[-1]
            return handle_delete_medication(user_id, medication_id)
    except Exception as e:
        print(f"Handler error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Internal Server Error", "error": str(e)}),
        }

    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"message": "not found"})}

# ---------- handlers ----------

def handle_create_medication(user_id, body):
    medication_id = body.get("medicationId") or f"med_{uuid.uuid4().hex[:10]}"
    name = (body.get("name") or "").strip()
    time = (body.get("time") or "").strip()
    frequency = body.get("frequency", "daily")
    
    if not name or not time:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "name and time are required"}),
        }
    
    # Validate frequency
    valid_frequencies = ["daily", "weekly", "monthly", "as-needed"]
    if frequency not in valid_frequencies:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}"}),
        }
    
    # Weekly frequency requires frequencyDetails
    frequency_details = body.get("frequencyDetails", [])
    if frequency == "weekly" and not frequency_details:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "frequencyDetails required for weekly frequency"}),
        }

    # Handle optional photo upload
    photo_s3_key = None
    photo_url = None
    image_base64 = body.get("imageBase64")
    
    if image_base64:
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

        # Determine extension from content type
        content_type = body.get("contentType") or "image/jpeg"
        extension = "jpg"
        if "png" in content_type.lower():
            extension = "png"
        elif "jpeg" in content_type.lower() or "jpg" in content_type.lower():
            extension = "jpg"
        elif "heic" in content_type.lower():
            extension = "heic"

        photo_s3_key = generate_s3_key(user_id, medication_id, extension)

        # Upload to S3
        try:
            s3.put_object(
                Bucket=BUCKET,
                Key=photo_s3_key,
                Body=image_bytes,
                ContentType=content_type,
            )
            print(f"Successfully uploaded image to S3: {photo_s3_key}")
            
            # Generate photo URL
            photo_url = build_photo_url(photo_s3_key, medication_id=medication_id, user_id=user_id)
        except Exception as e:
            print(f"Error uploading to S3: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "statusCode": 500,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": f"Failed to upload to S3: {str(e)}"}),
            }

    # Create sort key with time for sorting
    created_at = now_iso()
    sk = f"MEDICATION#{created_at}#{medication_id}"
    
    # Save to DynamoDB
    item = {
        "PK": f"USER#{user_id}",
        "SK": sk,
        "entity": "MEDICATION",
        "medicationId": medication_id,
        "userId": user_id,
        "name": name,
        "time": time,
        "frequency": frequency,
        "createdAt": created_at,
        "updatedAt": created_at,
        "version": 1,
    }
    
    # Optional fields
    if photo_s3_key:
        item["photoS3Key"] = photo_s3_key
    if frequency_details:
        item["frequencyDetails"] = frequency_details
    if body.get("notes"):
        item["notes"] = body.get("notes").strip()

    table.put_item(Item=item)

    # Build response
    response_data = {
        "medicationId": medication_id,
        "name": name,
        "time": time,
        "frequency": frequency,
        "createdAt": created_at,
    }
    
    if photo_s3_key:
        response_data["photoS3Key"] = photo_s3_key
        response_data["photoUrl"] = photo_url
    if frequency_details:
        response_data["frequencyDetails"] = frequency_details
    if body.get("notes"):
        response_data["notes"] = body.get("notes").strip()
    
    return {
        "statusCode": 201,
        "headers": CORS_HEADERS,
        "body": json.dumps(response_data, default=json_default),
    }

def handle_list_medications(user_id):
    try:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("MEDICATION#"),
            Limit=500,
        )
        
        items = response.get("Items", [])
        
        # Add photo URLs to items
        for item in items:
            if item.get("photoS3Key"):
                item["photoUrl"] = build_photo_url(
                    item["photoS3Key"],
                    medication_id=item.get("medicationId"),
                    user_id=user_id
                )
        
        # Sort by time (optional, client can also sort)
        items.sort(key=lambda x: x.get("time", "00:00"))
        
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(items, default=json_default),
        }
    except Exception as e:
        print(f"Error listing medications: {str(e)}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to list medications: {str(e)}"}),
        }

def handle_get_medication(user_id, medication_id):
    try:
        # Query to find the medication
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("MEDICATION#"),
            Limit=500,
        )
        
        # Find the specific medication
        for item in response.get("Items", []):
            if item.get("medicationId") == medication_id:
                # Add photo URL if exists
                if item.get("photoS3Key"):
                    item["photoUrl"] = build_photo_url(
                        item["photoS3Key"],
                        medication_id=medication_id,
                        user_id=user_id
                    )
                
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps(item, default=json_default),
                }
        
        return {
            "statusCode": 404,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Medication not found"}),
        }
    except Exception as e:
        print(f"Error getting medication: {str(e)}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to get medication: {str(e)}"}),
        }

def handle_update_medication(user_id, medication_id, body):
    try:
        # First, get the existing medication
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("MEDICATION#"),
            Limit=500,
        )
        
        existing_item = None
        for item in response.get("Items", []):
            if item.get("medicationId") == medication_id:
                existing_item = item
                break
        
        if not existing_item:
            return {
                "statusCode": 404,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Medication not found"}),
            }
        
        # Handle photo update if provided
        new_photo_s3_key = existing_item.get("photoS3Key")
        new_photo_url = None
        image_base64 = body.get("imageBase64")
        
        if image_base64:
            # Delete old photo if exists
            if existing_item.get("photoS3Key"):
                try:
                    s3.delete_object(Bucket=BUCKET, Key=existing_item["photoS3Key"])
                    print(f"Deleted old photo: {existing_item['photoS3Key']}")
                except Exception as e:
                    print(f"Warning: Could not delete old photo: {str(e)}")
            
            # Upload new photo
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
            
            content_type = body.get("contentType") or "image/jpeg"
            extension = "jpg"
            if "png" in content_type.lower():
                extension = "png"
            elif "jpeg" in content_type.lower() or "jpg" in content_type.lower():
                extension = "jpg"
            elif "heic" in content_type.lower():
                extension = "heic"
            
            new_photo_s3_key = generate_s3_key(user_id, medication_id, extension)
            
            try:
                s3.put_object(
                    Bucket=BUCKET,
                    Key=new_photo_s3_key,
                    Body=image_bytes,
                    ContentType=content_type,
                )
                print(f"Successfully uploaded new image to S3: {new_photo_s3_key}")
                new_photo_url = build_photo_url(new_photo_s3_key, medication_id=medication_id, user_id=user_id)
            except Exception as e:
                return {
                    "statusCode": 500,
                    "headers": CORS_HEADERS,
                    "body": json.dumps({"message": f"Failed to upload new photo: {str(e)}"}),
                }
        
        # Build update expression
        update_parts = []
        expr_attr_names = {}
        expr_attr_values = {}
        
        # Always update updatedAt
        update_parts.append("#updatedAt = :updatedAt")
        expr_attr_names["#updatedAt"] = "updatedAt"
        expr_attr_values[":updatedAt"] = now_iso()
        
        # Update fields if provided
        if "name" in body and body["name"].strip():
            update_parts.append("#name = :name")
            expr_attr_names["#name"] = "name"
            expr_attr_values[":name"] = body["name"].strip()
        
        if "time" in body and body["time"].strip():
            update_parts.append("#time = :time")
            expr_attr_names["#time"] = "time"
            expr_attr_values[":time"] = body["time"].strip()
        
        if "frequency" in body:
            update_parts.append("#frequency = :frequency")
            expr_attr_names["#frequency"] = "frequency"
            expr_attr_values[":frequency"] = body["frequency"]
        
        if "frequencyDetails" in body:
            update_parts.append("#frequencyDetails = :frequencyDetails")
            expr_attr_names["#frequencyDetails"] = "frequencyDetails"
            expr_attr_values[":frequencyDetails"] = body["frequencyDetails"]
        
        if "notes" in body:
            update_parts.append("#notes = :notes")
            expr_attr_names["#notes"] = "notes"
            expr_attr_values[":notes"] = body["notes"].strip()
        
        if new_photo_s3_key:
            update_parts.append("#photoS3Key = :photoS3Key")
            expr_attr_names["#photoS3Key"] = "photoS3Key"
            expr_attr_values[":photoS3Key"] = new_photo_s3_key
        
        # Perform update
        table.update_item(
            Key={"PK": existing_item["PK"], "SK": existing_item["SK"]},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
        )
        
        # Get updated item
        updated_response = table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("MEDICATION#"),
            Limit=500,
        )
        
        for item in updated_response.get("Items", []):
            if item.get("medicationId") == medication_id:
                if item.get("photoS3Key"):
                    item["photoUrl"] = build_photo_url(
                        item["photoS3Key"],
                        medication_id=medication_id,
                        user_id=user_id
                    )
                
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": json.dumps(item, default=json_default),
                }
        
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Updated successfully"}),
        }
        
    except Exception as e:
        print(f"Error updating medication: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to update medication: {str(e)}"}),
        }

def handle_delete_medication(user_id, medication_id):
    try:
        # First, get the medication to find SK and photo
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("MEDICATION#"),
            Limit=500,
        )
        
        item_to_delete = None
        for item in response.get("Items", []):
            if item.get("medicationId") == medication_id:
                item_to_delete = item
                break
        
        if not item_to_delete:
            return {
                "statusCode": 404,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Medication not found"}),
            }
        
        # Delete from DynamoDB
        table.delete_item(
            Key={"PK": item_to_delete["PK"], "SK": item_to_delete["SK"]}
        )
        
        # Delete photo from S3 if exists
        if item_to_delete.get("photoS3Key"):
            try:
                s3.delete_object(Bucket=BUCKET, Key=item_to_delete["photoS3Key"])
                print(f"Deleted photo from S3: {item_to_delete['photoS3Key']}")
            except Exception as e:
                print(f"Warning: Could not delete photo from S3: {str(e)}")
        
        return {
            "statusCode": 204,
            "headers": CORS_HEADERS,
            "body": "",
        }
    except Exception as e:
        print(f"Error deleting medication: {str(e)}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to delete medication: {str(e)}"}),
        }

def handle_get_photo(user_id, medication_id):
    """Proxy medication photo through API Gateway"""
    try:
        # Get medication to find S3 key
        response = table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("MEDICATION#"),
            Limit=500,
        )
        
        s3_key = None
        for item in response.get("Items", []):
            if item.get("medicationId") == medication_id:
                s3_key = item.get("photoS3Key")
                break
        
        if not s3_key:
            return {
                "statusCode": 404,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Photo not found"}),
            }
        
        # Get image from S3
        try:
            s3_response = s3.get_object(Bucket=BUCKET, Key=s3_key)
            image_bytes = s3_response["Body"].read()
            content_type = s3_response.get("ContentType", "image/jpeg")
            
            # Return binary image
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": content_type,
                    "Access-Control-Allow-Origin": "*",
                },
                "body": base64.b64encode(image_bytes).decode("utf-8"),
                "isBase64Encoded": True,
            }
        except Exception as e:
            print(f"Error getting photo from S3: {str(e)}")
            return {
                "statusCode": 404,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Photo not found in S3"}),
            }
    except Exception as e:
        print(f"Error in handle_get_photo: {str(e)}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": f"Failed to get photo: {str(e)}"}),
        }

