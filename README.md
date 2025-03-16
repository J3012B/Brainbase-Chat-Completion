# Story Editor API

This is a TypeScript API that integrates with the Brainbase chatbot service. It provides endpoints to create chat sessions, send messages to the chatbot, and receive responses.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
BRAINBASE_API_KEY=your_brainbase_api_key
WORKER_ID=your_worker_id
FLOW_ID=your_flow_id
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

For development, you can use:
```bash
npm run dev
```

## Supabase Setup

This application uses Supabase for storing job information. You'll need to:

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Create a table called `jobs` with the following schema:
   - `id`: uuid (primary key, default: uuid_generate_v4())
   - `message`: text
   - `status`: text
   - `created_at`: timestamp with time zone
   - `updated_at`: timestamp with time zone
3. Add your Supabase URL and key to the `.env` file

## API Endpoints

### Single-Call Chatbot Interaction (Recommended)

```
POST /api/chat
```

This endpoint handles the complete chatbot interaction in a single call. It:
1. Creates a new chat session
2. Sends your message to the chatbot
3. Waits for the response
4. Closes the session
5. Returns the response

**Request Body:**
```json
{
  "message": "Hello, how are you?"
}
```

**Response:**
```json
{
  "response": "I'm doing well, thank you for asking! How about you?"
}
```

### Polling Chatbot Interaction

```
POST /api/chat/polling
```

This endpoint initiates an asynchronous chatbot interaction:
1. Creates a new chat session
2. Sends your message to the chatbot
3. Stores the job in Supabase
4. Returns immediately with a job ID

**Request Body:**
```json
{
  "message": "Hello, how are you?"
}
```

**Response:**
```json
{
  "status": "ok",
  "jobId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Create a Chat Session

```
POST /api/chat/session
```

Creates a new chat session with the Brainbase chatbot.

**Response:**
```json
{
  "sessionId": "1621234567890",
  "message": "Hello there, how's it going?"
}
```

### Send a Message

```
POST /api/chat/:sessionId/message
```

Sends a message to an existing chat session.

**Request Body:**
```json
{
  "message": "Hello, how are you?"
}
```

**Response:**
```json
{
  "response": "I'm doing well, thank you for asking! How about you?"
}
```

### Close a Chat Session

```
DELETE /api/chat/:sessionId
```

Closes an existing chat session.

**Response:**
```json
{
  "message": "Chat session closed successfully"
}
```

### Health Check

```
GET /health
```

Checks if the API is running.

**Response:**
```json
{
  "status": "ok"
}
```

## Examples

The project includes several examples of how to use the API:

1. **Web Interface**: When you run the server, visit http://localhost:3000/ to use the full chat interface.

2. **Simple Web Example**: Visit http://localhost:3000/simple.html for a simple example using the single-call endpoint.

3. **Node.js Client**: Check the `examples` directory for a Node.js client example.

For more examples and usage instructions, see the [examples/README.md](examples/README.md) file.

## Integration with Python Chatbot

This API integrates with the Brainbase Python chatbot service using WebSockets. It handles the connection, message sending, and response processing, providing a RESTful API interface for client applications.

The original Python code is located in the `hello_world` directory and is used as a reference for the TypeScript implementation. 