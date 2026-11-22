
# AuraGen Backend Integration Guide

## Overview

The AuraGen backend exposes HTTP endpoints for:

- Health monitoring
- Natural-language UI intent analysis
- React JSX generation and validation

Default development URL:

http://127.0.0.1:8000

## Requirements

- Node.js 20+
- npm
- Backend dependencies installed

## Installation

From the repository root:

```powershell
npm.cmd --prefix backend install
```

## Start in mock mode

Use mock mode for local frontend integration without an API key.

```powershell
$env:AURAGEN_MOCK="1"
npm.cmd --prefix backend start
```

Mock mode returns a deterministic preview. It does not call a real LLM.

## API endpoints

### GET /api/health

Returns:

```json
{
  "status": "ok",
  "service": "auragen-backend"
}
```

### POST /api/analyze

Request:

```json
{
  "request": "Create a three-step registration form"
}
```

Response:

Returns detected intents, recommended components, and other analysis metadata.

### POST /api/generate

Request:

```json
{
  "request": "Create a registration form"
}
```

Successful response structure:

```json
{
  "valid": true,
  "output": {
    "componentName": "GeneratedUI",
    "code": "export default function GeneratedUI() { return <main />; }",
    "explanation": "Generated interface"
  },
  "attempts": [
    {
      "valid": true,
      "diagnostics": []
    }
  ]
}
```

This is an illustrative response structure, not a guarantee of the exact generated code.

## Frontend integration

Example using JavaScript:

```javascript
const API_BASE = "http://127.0.0.1:8000";

export async function generateUI(request) {
  const response = await fetch(
    `${API_BASE}/api/generate`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ request }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message ||
        result.error ||
        "UI generation failed"
    );
  }

  if (!result.valid) {
    throw new Error("Generated UI failed validation");
  }

  return result.output;
}
```

The frontend receives JSX source code as a string. It must not execute arbitrary returned code directly. Rendering requires a separate trusted, sandboxed or otherwise restricted pipeline and the approved component registry.

## Error responses

- 400: Invalid request
- 404: Unknown API route
- 405: Unsupported HTTP method
- 413: Request body too large
- 415: Unsupported content type
- 422: Generated UI failed validation
- 502: Provider or generation failure
- 504: Provider timeout

## Configuration

- AURAGEN_MOCK=1 enables mock generation
- OPENAI_API_KEY configures the real provider
- AURAGEN_MODEL selects the provider model
- AURAGEN_CORS_ORIGIN configures the allowed frontend origin
- PORT configures the backend port

Never commit API keys or .env files containing secrets.

## Run tests

```powershell
npm.cmd --prefix backend test
```

## Integration ownership

Role 1 owns:

- Intent analysis
- Prompt construction
- Component registry constraints
- JSX validation
- Generation repair workflow
- Provider reliability

Frontend teammates own:

- User interaction
- Request submission
- Loading and error states
- Safe preview rendering
- Adaptive interface behavior
```
