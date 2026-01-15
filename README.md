# TomeNest

TomeNest is a library management web app: browse a catalog, manage stock (admin), maintain wishlists, and handle rentals (request → approve → return).  
It uses a React (Vite) frontend and a PHP JSON API backend with session cookies. [file:18][file:2]

## Tech stack

- Frontend: React + Vite
- Backend: PHP (router in `Public/index.php`) [file:2]
- Database: MySQL (recommended: XAMPP MySQL)
- External API: Open Library (search/import) [file:2]

## Setup (local development)

### 1) Database (MySQL / XAMPP)

1. Start **MySQL** from the XAMPP Control Panel.
2. Create a database named `librarydb` (or use a different name and configure `DB_DSN`). [file:2]

Backend default DSN (if you don’t override it) is:
`mysql:host=127.0.0.1;dbname=librarydb;charset=utf8mb4` [file:2]

### 2) Backend (PHP + XAMPP)

The backend entry point is `Public/index.php` and all routes are served under `/api/*`. [file:2]

**Use Apache in XAMPP**
1. Copy the backend project into `C:\xampp\htdocs\TomeNest` (or similar).
2. Start **Apache** in XAMPP.
3. Your backend base URL will typically be:
   - `http://localhost/TomeNest/Public` (adjust to your folder name)
