Tests: code + test results documentation
A) Test plan (what to test)
Minimum recommended test areas based on your features:

Authentication

Register works, login sets session, logout clears session, /api/auth/me returns the correct user.
​

Authorization

Non-admin cannot access admin endpoints (/api/wishlist/admin/summary, rental admin endpoints, stock set/delete).
​

Wishlist

Toggle adds then removes the same OLID correctly.
​

Rentals

Request creates pending.
​

Admin approve sets dates, status becomes approved, stock quantity decremented.
​

Admin complete sets status completed, stock quantity incremented.
​

B) Test code (simple runnable API tests)
Create a folder like tests/ and add this file:

tests/api-tests.http (for VS Code “REST Client” extension)
You can run each request and capture responses as evidence.

### 1) Register
POST http://localhost:8000/api/auth/register
Content-Type: application/json

{
  "email": "testuser@example.com",
  "name": "Test User",
  "password": "password123"
}

### 2) Login
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "password123"
}

### 3) Check session
GET http://localhost:8000/api/auth/me

### 4) Wishlist toggle add (use a valid edition OLID ending with M)
POST http://localhost:8000/api/wishlist/toggle
Content-Type: application/json

{
  "olid": "OL7353617M",
  "title": "Example title",
  "author": "Example author",
  "releaseyear": 2000,
  "coverurl": "https://covers.openlibrary.org/b/olid/OL7353617M-M.jpg?default=false"
}

### 5) Wishlist toggle remove (same OLID)
POST http://localhost:8000/api/wishlist/toggle
Content-Type: application/json

{
  "olid": "OL7353617M"
}

### 6) Logout
POST http://localhost:8000/api/auth/logout
Content-Type: application/json

{}
This is enough for a basic “tests performed” submission, and it matches your session-cookie approach.
​

C) Test results documentation (template you can paste into a report)
Create TEST_RESULTS.md and fill it in after running the requests:

text
# TomeNest – Test Results

Environment:
- Backend: PHP server on http://localhost:8000
- Frontend: React dev server (optional)
- Date:
- Tester:

## Authentication
1) Register new user
- Request: POST /api/auth/register
- Expected: 200/201 and JSON user object
- Actual:
- Result: PASS/FAIL

2) Login
- Request: POST /api/auth/login
- Expected: 200 and session established (cookie)
- Actual:
- Result: PASS/FAIL

3) Session check
- Request: GET /api/auth/me
- Expected: 200 and correct user returned
- Actual:
- Result: PASS/FAIL

4) Logout
- Request: POST /api/auth/logout
- Expected: 200 and session cleared
- Actual:
- Result: PASS/FAIL

## Wishlist
1) Toggle add item
- Request: POST /api/wishlist/toggle
- Expected: { wished: true }
- Actual:
- Result: PASS/FAIL

2) Toggle remove item
- Request: POST /api/wishlist/toggle
- Expected: { wished: false }
- Actual:
- Result: PASS/FAIL