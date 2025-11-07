# Video Integration Quick Start Checklist

## ✅ Step-by-Step Setup

### 1. Create S3 Bucket
- [ ] Go to S3 → Create bucket
- [ ] Name: `medispecs-videos` (or your choice)
- [ ] Region: Same as Lambda (e.g., `ap-southeast-1`)
- [ ] Block public access: Keep default (block all)
- [ ] Default encryption: Enable (SSE-S3)
- [ ] Create bucket

### 2. Create IAM Role for Lambda
- [ ] Go to IAM → Roles → Create role
- [ ] Trusted entity: AWS service → Lambda
- [ ] Attach policy: `AWSLambdaBasicExecutionRole`
- [ ] Create custom policy with DynamoDB + S3 permissions (see VIDEO_SETUP_GUIDE.md)
- [ ] Role name: `MediSpecsVideoLambdaRole`
- [ ] Create role

### 3. Create Lambda Function
- [ ] Go to Lambda → Create function
- [ ] Name: `videos-handler`
- [ ] Runtime: Python 3.13 (or 3.12)
- [ ] Architecture: x86_64
- [ ] Execution role: `MediSpecsVideoLambdaRole`
- [ ] Create function

### 4. Set Lambda Environment Variables
- [ ] `TABLE_MAIN` = `AppMain`
- [ ] `S3_BUCKET` = `medispecs-videos` (or your bucket name)
- [ ] `S3_REGION` = `ap-southeast-1` (or your region)
- [ ] `PRE_SIGNED_URL_EXPIRY` = `3600`

### 5. Upload Lambda Code
- [ ] Copy code from `videos_handler.py`
- [ ] Paste into Lambda function code editor
- [ ] Deploy

### 6. Create API Gateway Routes
- [ ] Go to API Gateway → Your API
- [ ] Create route: `GET /videos` → `videos-handler`
- [ ] Create route: `POST /videos` → `videos-handler`
- [ ] Create route: `GET /videos/{videoId}` → `videos-handler`
- [ ] Create route: `GET /videos/{videoId}/upload-url` → `videos-handler`
- [ ] Create route: `GET /videos/{videoId}/playback-url` → `videos-handler`
- [ ] Create route: `GET /videos/{videoId}/thumbnail-url` → `videos-handler`
- [ ] Create route: `DELETE /videos/{videoId}` → `videos-handler`

### 7. Configure CORS
- [ ] Go to API Gateway → CORS
- [ ] Access-Control-Allow-Origin: `*`
- [ ] Access-Control-Allow-Headers: `Content-Type,Authorization`
- [ ] Access-Control-Allow-Methods: `GET,POST,DELETE,OPTIONS`

### 8. Test Lambda Function
- [ ] Use test events from `video_test_events.json`
- [ ] Test: List videos
- [ ] Test: Create video metadata
- [ ] Test: Get upload URL
- [ ] Test: Get playback URL

### 9. Update Frontend
- [ ] Update `frontend/src/app/videos/page.tsx` to use API
- [ ] Replace `/api/videos` with `/videos?userId=...`
- [ ] Use `fetchJson` helper with auth token
- [ ] Add upload functionality (request upload URL, upload to S3, save metadata)

---

## 📋 API Endpoints Summary

### GET `/videos?userId=u_123&dateFrom=...&dateTo=...`
List videos for a user, optionally filtered by date range.

**Response:**
```json
[
  {
    "videoId": "v_123",
    "title": "Morning Recording",
    "recordedAt": "2025-11-03T14:30:00Z",
    "durationSec": 120,
    "s3Key": "videos/u_123/v_123.mp4",
    "thumbnailS3Key": "thumbnails/u_123/v_123.jpg",
    "status": "ready"
  }
]
```

### POST `/videos`
Create video metadata entry.

**Request:**
```json
{
  "userId": "u_123",
  "deviceId": "d_123",
  "title": "Morning Recording",
  "recordedAt": "2025-11-03T14:30:00Z",
  "durationSec": 120,
  "fileSizeBytes": 10485760,
  "mimeType": "video/mp4"
}
```

### GET `/videos/{videoId}/upload-url?userId=u_123&contentType=video/mp4`
Get pre-signed URL for uploading video to S3.

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "s3Key": "videos/u_123/v_123.mp4",
  "s3Bucket": "medispecs-videos",
  "expiresIn": 3600
}
```

### GET `/videos/{videoId}/playback-url?userId=u_123`
Get pre-signed URL for viewing/downloading video.

**Response:**
```json
{
  "playbackUrl": "https://s3.amazonaws.com/...",
  "s3Key": "videos/u_123/v_123.mp4",
  "expiresIn": 3600
}
```

### GET `/videos/{videoId}/thumbnail-url?userId=u_123`
Get pre-signed URL for thumbnail image.

**Response:**
```json
{
  "thumbnailUrl": "https://s3.amazonaws.com/...",
  "s3Key": "thumbnails/u_123/v_123.jpg",
  "expiresIn": 3600
}
```

### DELETE `/videos/{videoId}?userId=u_123`
Delete video metadata (and optionally S3 objects).

---

## 🔄 Video Upload Flow

1. **Frontend requests upload URL:**
   ```
   GET /videos/{videoId}/upload-url?userId=u_123
   ```

2. **Frontend uploads video to S3:**
   ```
   PUT {uploadUrl}
   Content-Type: video/mp4
   [video file binary]
   ```

3. **Frontend saves metadata:**
   ```
   POST /videos
   {
     "userId": "u_123",
     "videoId": "v_123",
     "title": "...",
     "recordedAt": "...",
     ...
   }
   ```

4. **Frontend displays video:**
   ```
   GET /videos/{videoId}/playback-url?userId=u_123
   → Use playbackUrl in <video> tag or download link
   ```

---

## 🎯 Next Steps

1. **Thumbnail Generation**: Use AWS Rekognition or FFmpeg to generate thumbnails automatically
2. **Video Processing**: Use AWS MediaConvert for transcoding to multiple formats
3. **Upload Progress**: Track upload progress in frontend UI
4. **Video Metadata Extraction**: Extract duration, resolution, codec from video file

