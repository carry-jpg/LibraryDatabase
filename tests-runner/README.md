# TomeNest API Tests (Automated)

## What this is
A small Node-based test runner that:
- Creates an admin + a user account
- Tests auth + authorization
- Adds stock for a chosen OpenLibrary edition (OLID)
- Tests wishlist toggle/ids
- Tests rentals workflow (2 requests -> approve one -> out-of-stock -> dismiss -> complete return)

## Prerequisites
1) Start your PHP backend locally (example):
   http://localhost:8000

2) Recommended: Use a fresh database for a full admin-flow test.
   The backend assigns `admin` role to the *first registered user*.

## Setup
From the project root:

cd tests-runner
npm install
Run
bash
npm run test:api



Optional env vars:

API_BASE (default: http://localhost:8000)

TEST_OLID (default: OL7353617M)



Example:

bash
API_BASE=http://localhost:8000 TEST_OLID=OL7353617M npm run test:api
Outputs
After running, check:

tests-runner/output/TEST_RESULTS.md

tests-runner/output/test-results.json

The stock tests rely on `/api/stock/list` returning `stockid`, `openlibraryid`, and `quantity`, which your repository query provides.
The rentals tests cover the admin approve/dismiss/complete routes and the “out of stock” approval behavior defined in the router logic.