# Medications Lambda Setup Guide

Complete guide to deploy the medications management Lambda function with API Gateway and DynamoDB.

---

## 📦 S3 Bucket Configuration

### Bucket Name:
```
medispecs-medications
```

### Create the Bucket:

```bash
# Create S3 bucket in Singapore region
aws s3 mb s3://medispecs-medications --region ap-southeast-1

# Enable versioning (optional but recommended)
aws s3api put-bucket-versioning \
  --bucket medispecs-medications \
  --versioning-configuration Status=Enabled \
  --region ap-southeast-1

# Configure CORS for direct uploads (if needed)
aws s3api put-bucket-cors --bucket medispecs-medications --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# Block public access (keep bucket private)
aws s3api put-public-access-block \
  --bucket medispecs-medications \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Folder Structure:
```
medispecs-medications/
  └── medications/
      └── u_123/
          ├── med_abc123.jpg
          ├── med_def456.png
          └── med_ghi789.jpg
```

---

## 🚀 Lambda Function Setup

### 1. Create Lambda Function

```bash
# Create Lambda function
aws lambda create-function \
  --function-name medispecs-medications-handler \
  --runtime python3.12 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-medications-role \
  --handler medications_handler.handler \
  --timeout 30 \
  --memory-size 512 \
  --region ap-southeast-1
```

### 2. Package and Deploy Code

```bash
# Navigate to backend directory
cd /Users/johnnytan/Documents/MediSpecs/backend

# Create deployment package
zip medications_handler.zip medications_handler.py

# Upload to Lambda
aws lambda update-function-code \
  --function-name medispecs-medications-handler \
  --zip-file fileb://medications_handler.zip \
  --region ap-southeast-1
```

### 3. Configure Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name medispecs-medications-handler \
  --environment "Variables={
    TABLE_MAIN=medispecs-main-table,
    MEDICATIONS_BUCKET=medispecs-medications,
    MEDICATIONS_PREFIX=medications,
    MEDICATIONS_URL_EXPIRES=604800,
    API_BASE_URL=https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod
  }" \
  --region ap-southeast-1
```

**Environment Variables Explained:**
- `TABLE_MAIN`: Your DynamoDB table name (same as family/videos)
- `MEDICATIONS_BUCKET`: S3 bucket for medication photos
- `MEDICATIONS_PREFIX`: Folder prefix in S3 (default: "medications")
- `MEDICATIONS_URL_EXPIRES`: Photo URL expiry in seconds (7 days default)
- `API_BASE_URL`: Your API Gateway URL (set after creating API Gateway)

---

## 🔐 IAM Role Setup

### Create IAM Role for Lambda

Create file: `lambda-medications-trust-policy.json`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create file: `lambda-medications-policy.json`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:YOUR_ACCOUNT_ID:table/medispecs-main-table"
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::medispecs-medications/medications/*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-southeast-1:YOUR_ACCOUNT_ID:log-group:/aws/lambda/medispecs-medications-handler:*"
    }
  ]
}
```

Apply the policies:
```bash
# Create role
aws iam create-role \
  --role-name lambda-medications-role \
  --assume-role-policy-document file://lambda-medications-trust-policy.json

# Attach custom policy
aws iam put-role-policy \
  --role-name lambda-medications-role \
  --policy-name medications-access-policy \
  --policy-document file://lambda-medications-policy.json
```

---

## 🌐 API Gateway Setup

### 1. Create REST API

```bash
# Create API
aws apigatewayv2 create-api \
  --name medispecs-medications-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:ap-southeast-1:YOUR_ACCOUNT_ID:function:medispecs-medications-handler \
  --region ap-southeast-1
```

### 2. Configure Routes

**Required Routes:**
```
POST   /medications              - Create medication
GET    /medications              - List medications
GET    /medications/{id}         - Get single medication
PUT    /medications/{id}         - Update medication
DELETE /medications/{id}         - Delete medication
GET    /medications/{id}/photo   - Get medication photo
OPTIONS /medications             - CORS preflight
OPTIONS /medications/{id}        - CORS preflight
OPTIONS /medications/{id}/photo  - CORS preflight
```

### 3. Grant API Gateway Permission to Invoke Lambda

```bash
aws lambda add-permission \
  --function-name medispecs-medications-handler \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-southeast-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*/*" \
  --region ap-southeast-1
```

### 4. Deploy API

```bash
# Create deployment stage
aws apigatewayv2 create-stage \
  --api-id YOUR_API_ID \
  --stage-name prod \
  --auto-deploy \
  --region ap-southeast-1
```

### 5. Get API Gateway URL

```bash
# Get your API URL
aws apigatewayv2 get-api \
  --api-id YOUR_API_ID \
  --query 'ApiEndpoint' \
  --output text \
  --region ap-southeast-1
```

**Example Output:**
```
https://abc123xyz.execute-api.ap-southeast-1.amazonaws.com
```

### 6. Update Lambda Environment Variable

Update the `API_BASE_URL` environment variable with your actual API Gateway URL:

```bash
aws lambda update-function-configuration \
  --function-name medispecs-medications-handler \
  --environment "Variables={
    TABLE_MAIN=medispecs-main-table,
    MEDICATIONS_BUCKET=medispecs-medications,
    MEDICATIONS_PREFIX=medications,
    MEDICATIONS_URL_EXPIRES=604800,
    API_BASE_URL=https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod
  }" \
  --region ap-southeast-1
```

---

## 🧪 Testing the Lambda Function

### Test Locally (Optional)

If you have SAM CLI installed:

```bash
# Test create medication
sam local invoke medispecs-medications-handler \
  --event medications_test_events.json \
  --event-name createMedicationWithoutPhoto

# Test list medications
sam local invoke medispecs-medications-handler \
  --event medications_test_events.json \
  --event-name listMedications
```

### Test via AWS Console

1. Go to Lambda Console
2. Select `medispecs-medications-handler`
3. Go to "Test" tab
4. Create test event using content from `medications_test_events.json`
5. Click "Test"

### Test via API Gateway

```bash
# Test create medication
curl -X POST https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/medications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "u_123",
    "name": "Test Medication",
    "time": "09:00",
    "frequency": "daily",
    "notes": "Test notes"
  }'

# Test list medications
curl https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/medications?userId=u_123

# Test get medication
curl https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/medications/med_abc123?userId=u_123

# Test update medication
curl -X PUT https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/medications/med_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "u_123",
    "name": "Updated Medication",
    "time": "10:00"
  }'

# Test delete medication
curl -X DELETE https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod/medications/med_abc123?userId=u_123
```

---

## 📊 DynamoDB Schema

### Item Structure

```json
{
  "PK": "USER#u_123",
  "SK": "MEDICATION#2025-11-12T10:30:00Z#med_abc123",
  "entity": "MEDICATION",
  "medicationId": "med_abc123",
  "userId": "u_123",
  "name": "Aspirin 100mg",
  "photoS3Key": "medications/u_123/med_abc123.jpg",
  "time": "09:00",
  "frequency": "daily",
  "frequencyDetails": [1, 3, 5],
  "notes": "Take with food",
  "createdAt": "2025-11-12T10:30:00Z",
  "updatedAt": "2025-11-12T10:30:00Z",
  "version": 1
}
```

### Query Patterns

**List all medications for user:**
```python
PK = "USER#u_123" AND SK begins_with "MEDICATION#"
```

---

## 🔗 Frontend Integration

### Update Frontend Environment Variables

Update `/Users/johnnytan/Documents/MediSpecs/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/prod
```

### Frontend API Calls Example

```typescript
// Create medication
const response = await fetch(`${API_BASE_URL}/medications`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'u_123',
    name: 'Aspirin 100mg',
    time: '09:00',
    frequency: 'daily',
    imageBase64: base64Image,
    contentType: 'image/jpeg',
    notes: 'Take with food'
  })
});

// List medications
const medications = await fetch(`${API_BASE_URL}/medications?userId=u_123`);

// Get photo URL
const photoUrl = `${API_BASE_URL}/medications/${medicationId}/photo`;
```

---

## 📝 Summary

### What You Need:

1. **S3 Bucket:** `medispecs-medications`
2. **Lambda Function:** `medispecs-medications-handler`
3. **DynamoDB Table:** Use existing `medispecs-main-table`
4. **IAM Role:** `lambda-medications-role`
5. **API Gateway:** HTTP API with Lambda proxy integration

### Quick Checklist:

- [ ] Create S3 bucket `medispecs-medications`
- [ ] Configure S3 CORS
- [ ] Create IAM role with DynamoDB + S3 permissions
- [ ] Create Lambda function
- [ ] Upload Lambda code (medications_handler.py)
- [ ] Set environment variables
- [ ] Create API Gateway
- [ ] Configure routes
- [ ] Grant Lambda invoke permission
- [ ] Deploy API to prod stage
- [ ] Update API_BASE_URL environment variable
- [ ] Test all endpoints
- [ ] Update frontend .env.local

---

## 🐛 Troubleshooting

### Issue: 403 Forbidden from S3
**Solution:** Check IAM role has `s3:PutObject` and `s3:GetObject` permissions

### Issue: 404 Not Found
**Solution:** Verify API Gateway routes are configured correctly

### Issue: Photos not displaying
**Solution:** 
1. Check `API_BASE_URL` environment variable is set
2. Verify `/medications/{id}/photo` route returns binary data
3. Check S3 bucket permissions

### Issue: CORS errors
**Solution:** Ensure all routes have OPTIONS method configured

---

## 📞 Support

For issues, check CloudWatch Logs:
```bash
aws logs tail /aws/lambda/medispecs-medications-handler --follow
```

---

**Created:** November 12, 2025  
**Version:** 1.0.0

