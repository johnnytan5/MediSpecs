# Video Storage Setup Guide

## Architecture Overview

**Components:**
1. **S3 Bucket**: Stores video files and thumbnails
2. **DynamoDB**: Stores video metadata in `AppMain` table
3. **Lambda Function**: Handles video operations (list, create, get URLs, delete)
4. **API Gateway**: Routes video endpoints

**Video Flow:**
1. Frontend requests pre-signed upload URL from Lambda
2. Frontend uploads video directly to S3 using pre-signed URL
3. Frontend calls POST `/videos` to save metadata to DynamoDB
4. Frontend requests pre-signed download URL to view videos
5. Thumbnails stored in S3 (can be generated later with Rekognition)

---

## Step 1: Create S3 Bucket

### In AWS Console:

1. Go to **S3** → **Create bucket**
2. **Bucket name**: `medispecs-videos` (or your preferred name)
3. **Region**: Same as your Lambda (e.g., `ap-southeast-1`)
4. **Block Public Access**: Keep default (block all public access) - we'll use pre-signed URLs
5. **Bucket Versioning**: Disable (unless needed)
6. **Default encryption**: Enable (SSE-S3 is fine)
7. Click **Create bucket**

### Create Folders (Optional but Recommended):

After creating bucket, add these prefixes/folders:
- `videos/` - For video files
- `thumbnails/` - For thumbnail images

---

## Step 2: DynamoDB Schema (AppMain Table)

You already have `AppMain` table. We'll use the same pattern:

**Video Item Structure:**
```
PK: USER#{userId}
SK: VIDEO#{recordedAtIso}#{videoId}

Fields:
- entity: "VIDEO"
- videoId: "v_123..."
- userId: "u_123"
- deviceId: "d_123" (optional)
- title: "Video Recording"
- s3Key: "videos/u_123/v_123.mp4"
- s3Bucket: "medispecs-videos"
- thumbnailS3Key: "thumbnails/u_123/v_123.jpg" (optional)
- recordedAt: "2025-11-03T14:30:00Z" (ISO)
- durationSec: 120 (optional)
- fileSizeBytes: 10485760 (optional)
- mimeType: "video/mp4" (optional)
- status: "uploaded" | "processing" | "ready" | "error"
- createdAt: "2025-11-03T14:30:00Z"
- updatedAt: "2025-11-03T14:30:00Z"
- version: 1
```

**Query Pattern:**
- List videos by user: `PK = USER#{userId}` AND `SK begins_with VIDEO#`
- Sort by `recordedAt` (descending) in application code

---

## Step 3: Lambda Function Setup

### Create IAM Role for Lambda:

1. Go to **IAM** → **Roles** → **Create role**
2. **Trusted entity**: AWS service → Lambda
3. **Permissions**: Attach these policies:
   - `AWSLambdaBasicExecutionRole` (for CloudWatch logs)
   - Create custom policy with:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "dynamodb:GetItem",
             "dynamodb:PutItem",
             "dynamodb:UpdateItem",
             "dynamodb:DeleteItem",
             "dynamodb:Query",
             "dynamodb:Scan"
           ],
           "Resource": "arn:aws:dynamodb:REGION:ACCOUNT:table/AppMain"
         },
         {
           "Effect": "Allow",
           "Action": [
             "s3:GetObject",
             "s3:PutObject",
             "s3:DeleteObject"
           ],
           "Resource": "arn:aws:s3:::medispecs-videos/*"
         },
         {
           "Effect": "Allow",
           "Action": [
             "s3:GetObject"
           ],
           "Resource": "arn:aws:s3:::medispecs-videos/thumbnails/*"
         }
       ]
     }
     ```
   Replace `REGION`, `ACCOUNT`, and bucket name as needed.

4. **Role name**: `MediSpecsVideoLambdaRole`
5. Click **Create role**

### Create Lambda Function:

1. Go to **Lambda** → **Create function**
2. **Function name**: `videos-handler`
3. **Runtime**: Python 3.13 (or 3.12)
4. **Architecture**: x86_64
5. **Execution role**: Use existing role → `MediSpecsVideoLambdaRole`
6. Click **Create function**

### Set Environment Variables:

In Lambda function → **Configuration** → **Environment variables**:
- `TABLE_MAIN` = `AppMain`
- `S3_BUCKET` = `medispecs-videos`
- `S3_REGION` = `ap-southeast-1` (or your region)
- `PRE_SIGNED_URL_EXPIRY` = `3600` (1 hour, in seconds)

### Upload Code:

Copy the code from `videos_handler.py` (will be created next step)

---

## Step 4: API Gateway Setup

### Create Routes:

1. Go to **API Gateway** → Your existing API (or create new HTTP API)
2. **Routes** → **Create**
3. Create these routes:

   **GET `/videos`**
   - Integration: Lambda
   - Lambda function: `videos-handler`
   - Method: GET

   **POST `/videos`**
   - Integration: Lambda
   - Lambda function: `videos-handler`
   - Method: POST

   **GET `/videos/{videoId}`**
   - Integration: Lambda
   - Lambda function: `videos-handler`
   - Method: GET
   - Path parameter: `videoId`

   **GET `/videos/{videoId}/upload-url`**
   - Integration: Lambda
   - Lambda function: `videos-handler`
   - Method: GET
   - Path parameter: `videoId`

   **GET `/videos/{videoId}/playback-url`**
   - Integration: Lambda
   - Lambda function: `videos-handler`
   - Method: GET
   - Path parameter: `videoId`

   **DELETE `/videos/{videoId}`**
   - Integration: Lambda
   - Lambda function: `videos-handler`
   - Method: DELETE
   - Path parameter: `videoId`

### Configure CORS:

1. Go to **API** → **CORS**
2. Set:
   - **Access-Control-Allow-Origin**: `*`
   - **Access-Control-Allow-Headers**: `Content-Type,Authorization`
   - **Access-Control-Allow-Methods**: `GET,POST,DELETE,OPTIONS`

---

## Step 5: Lambda Function Code

See `videos_handler.py` file for the complete implementation.

**Key Features:**
- `GET /videos?userId=...` - List videos with optional date filters
- `POST /videos` - Create video metadata entry
- `GET /videos/{videoId}/upload-url` - Get pre-signed S3 upload URL
- `GET /videos/{videoId}/playback-url` - Get pre-signed S3 download URL
- `GET /videos/{videoId}` - Get video details
- `DELETE /videos/{videoId}` - Delete video and metadata

---

## Step 6: Test Events

### Test Event 1: List Videos
```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/videos"
    }
  },
  "queryStringParameters": {
    "userId": "u_123"
  }
}
```

### Test Event 2: Create Video Metadata
```json
{
  "requestContext": {
    "http": {
      "method": "POST",
      "path": "/videos"
    }
  },
  "body": "{\"userId\":\"u_123\",\"deviceId\":\"d_123\",\"title\":\"Morning Recording\",\"recordedAt\":\"2025-11-03T14:30:00Z\",\"durationSec\":120}"
}
```

### Test Event 3: Get Upload URL
```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/videos/v_123/upload-url"
    }
  },
  "pathParameters": {
    "videoId": "v_123"
  },
  "queryStringParameters": {
    "userId": "u_123"
  }
}
```

### Test Event 4: Get Playback URL
```json
{
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/videos/v_123/playback-url"
    }
  },
  "pathParameters": {
    "videoId": "v_123"
  },
  "queryStringParameters": {
    "userId": "u_123"
  }
}
```

---

## Step 7: Frontend Integration

Update `frontend/src/app/videos/page.tsx` to:
1. Fetch from `/videos?userId=...` instead of `/api/videos`
2. Use `fetchJson` helper with authentication token
3. Handle pre-signed URLs for video playback
4. Add upload functionality (request upload URL, upload to S3, save metadata)

---

## Next Steps (Optional Enhancements)

1. **Thumbnail Generation**: Use AWS Rekognition or FFmpeg (via Lambda Layer) to generate thumbnails
2. **Video Processing**: Use AWS MediaConvert or Lambda with FFmpeg for transcoding
3. **Upload Progress**: Track upload progress in frontend
4. **Video Metadata Extraction**: Extract duration, resolution from video file

