# API.md - API Documentation

## Overview

The Fallo API provides programmatic access to boards, lists, cards, and related resources. This enables integration with external applications (like the PyQt5 companion app).

---

## Authentication

### Session Authentication (Web UI)
- Uses NextAuth.js session cookies
- Automatic for browser-based requests

### API Key Authentication (External)
```http
Authorization: Bearer pp_live_xxxxxxxxxxxxx
```

API keys are generated in user settings and scoped to specific boards or full account access.

---

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid card type",
    "details": {
      "field": "type",
      "received": "invalid",
      "expected": ["TASK", "USER_STORY", "EPIC", "UTILITY"]
    }
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### Boards

#### List Boards
```http
GET /api/boards
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20, max: 100) |
| `includeArchived` | boolean | Include archived boards |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "name": "Sprint 42",
      "description": "Q1 deliverables",
      "isTemplate": false,
      "createdAt": "2025-01-26T10:00:00Z",
      "updatedAt": "2025-01-26T15:30:00Z",
      "memberCount": 5,
      "listCount": 4,
      "cardCount": 23
    }
  ],
  "meta": { "pagination": { ... } }
}
```

#### Get Board
```http
GET /api/boards/:boardId
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `includeLists` | boolean | Include lists in response |
| `includeCards` | boolean | Include cards (requires includeLists) |

#### Create Board
```http
POST /api/boards
```

**Body:**
```json
{
  "name": "New Board",
  "description": "Optional description",
  "templateId": "clx456..." // Optional: create from template
}
```

#### Update Board
```http
PATCH /api/boards/:boardId
```

**Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "settings": { ... }
}
```

#### Delete Board
```http
DELETE /api/boards/:boardId
```

---

### Lists

#### Get Lists
```http
GET /api/boards/:boardId/lists
```

#### Create List
```http
POST /api/boards/:boardId/lists
```

**Body:**
```json
{
  "name": "To Do",
  "position": 0 // Optional, defaults to end
}
```

#### Update List
```http
PATCH /api/boards/:boardId/lists/:listId
```

**Body:**
```json
{
  "name": "In Progress",
  "position": 1
}
```

#### Delete List
```http
DELETE /api/boards/:boardId/lists/:listId
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `moveCardsTo` | string | List ID to move cards to (otherwise archived) |

---

### Cards

#### Get Cards
```http
GET /api/boards/:boardId/cards
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `listId` | string | Filter by list |
| `type` | string | Filter by card type |
| `assigneeId` | string | Filter by assignee |
| `includeArchived` | boolean | Include archived cards |

#### Get Card
```http
GET /api/cards/:cardId
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `includeComments` | boolean | Include comments |
| `includeAttachments` | boolean | Include attachments |
| `includeChecklists` | boolean | Include checklists |

#### Create Card
```http
POST /api/boards/:boardId/cards
```

**Body (Task):**
```json
{
  "type": "TASK",
  "title": "Implement login form",
  "listId": "clx789...",
  "description": "Create responsive login form with validation",
  "taskData": {
    "storyPoints": 5,
    "deadline": "2025-02-15",
    "linkedUserStoryId": "clx101..."
  }
}
```

**Body (User Story):**
```json
{
  "type": "USER_STORY",
  "title": "User Authentication",
  "listId": "clx789...",
  "description": "As a user, I want to log in securely",
  "userStoryData": {
    "linkedEpicId": "clx202...",
    "flags": ["HIGH_RISK"]
  }
}
```

#### Update Card
```http
PATCH /api/cards/:cardId
```

**Body:**
```json
{
  "title": "Updated title",
  "listId": "clx999...", // Move to different list
  "position": 2,
  "taskData": {
    "storyPoints": 8
  }
}
```

#### Delete Card
```http
DELETE /api/cards/:cardId
```

---

### Comments

#### Get Comments
```http
GET /api/cards/:cardId/comments
```

#### Create Comment
```http
POST /api/cards/:cardId/comments
```

**Body:**
```json
{
  "content": "This looks good, but let's discuss the color choice.",
  "attachmentId": "clx111..." // Optional: comment on attachment
}
```

---

### Checklists

#### Get Checklists
```http
GET /api/cards/:cardId/checklists
```

#### Create Checklist
```http
POST /api/cards/:cardId/checklists
```

**Body:**
```json
{
  "name": "Implementation Steps",
  "type": "todo",
  "items": [
    { "content": "Set up form structure", "isComplete": false },
    { "content": "Add validation", "isComplete": false }
  ]
}
```

#### Update Checklist Item
```http
PATCH /api/checklists/:checklistId/items/:itemId
```

**Body:**
```json
{
  "isComplete": true
}
```

---

### Attachments

#### Upload Attachment
```http
POST /api/cards/:cardId/attachments
Content-Type: multipart/form-data
```

**Form Fields:**
- `file`: File binary
- `name`: Optional custom name

#### Delete Attachment
```http
DELETE /api/attachments/:attachmentId
```

---

### Members

#### Get Board Members
```http
GET /api/boards/:boardId/members
```

#### Add Board Member
```http
POST /api/boards/:boardId/members
```

**Body:**
```json
{
  "userId": "clx333...",
  "role": "MEMBER"
}
```

#### Update Member Role
```http
PATCH /api/boards/:boardId/members/:userId
```

**Body:**
```json
{
  "role": "ADMIN"
}
```

#### Remove Member
```http
DELETE /api/boards/:boardId/members/:userId
```

---

## Webhooks

### Configure Webhook
```http
POST /api/webhooks
```

**Body:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["card.created", "card.moved", "card.updated"],
  "boardId": "clx444..." // Optional: filter by board
}
```

### Webhook Events

| Event | Payload |
|-------|---------|
| `card.created` | Card object |
| `card.updated` | Card object with changes |
| `card.moved` | Card object with from/to list |
| `card.deleted` | Card ID |
| `board.updated` | Board object |
| `member.added` | Member object |

### Webhook Payload
```json
{
  "event": "card.moved",
  "timestamp": "2025-01-26T15:30:00Z",
  "data": {
    "card": { ... },
    "fromListId": "clx555...",
    "toListId": "clx666..."
  }
}
```

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Read operations | 1000/hour |
| Write operations | 200/hour |
| File uploads | 50/hour |

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1706281200
```

---

## SDK Examples

### Python (for PyQt5 integration)
```python
import requests

class FalloAPI:
    def __init__(self, api_key: str, base_url: str = "https://your-domain.com/api"):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def get_boards(self) -> list:
        response = requests.get(f"{self.base_url}/boards", headers=self.headers)
        return response.json()["data"]
    
    def get_board_cards(self, board_id: str) -> list:
        response = requests.get(
            f"{self.base_url}/boards/{board_id}/cards",
            headers=self.headers
        )
        return response.json()["data"]
    
    def update_card(self, card_id: str, data: dict) -> dict:
        response = requests.patch(
            f"{self.base_url}/cards/{card_id}",
            headers=self.headers,
            json=data
        )
        return response.json()["data"]

# Usage
api = FalloAPI("pp_live_xxxxxxxxxxxxx")
boards = api.get_boards()
cards = api.get_board_cards(boards[0]["id"])
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-26 | Claude | Initial document |

---

*Refer to this document when building or consuming API endpoints.*
