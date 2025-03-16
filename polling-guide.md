# How to Poll Job Data - Quick Reference

## Step 1: Submit a Message

**Endpoint:** `POST /api/chat/polling`

**Headers:**
- Content-Type: application/json

**Request Body:**
```json
{
  "message": "Your message here"
}
```

**Response:**
```json
{
  "status": "ok",
  "jobId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Step 2: Check Job Status

**Endpoint:** `GET /api/jobs/{jobId}`

Replace `{jobId}` with the ID received from the previous call.

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Your message here",
  "status": "complete", // or "processing" or "error"
  "response": "The chatbot's response", // when status is "complete"
  "error_message": "Error details", // when status is "error"
  "created_at": "2023-01-01T12:00:00.000Z",
  "updated_at": "2023-01-01T12:00:10.000Z"
}
```

## Status Values:
- `processing`: Still working on it
- `complete`: Done successfully
- `error`: Failed

That's it! Just keep checking the job status until it's no longer "processing". 