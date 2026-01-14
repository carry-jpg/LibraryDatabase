<?php
declare(strict_types=1);

final class AuthController extends Controller
{
    public function __construct(private UserRepository $users) {}

    private function publicUser(array $u): array
    {
        return [
            'userid' => (int)$u['userid'],
            'email' => (string)$u['email'],
            'name' => (string)$u['name'],
            'role' => (string)$u['role'],
            'createdat' => (string)$u['createdat'],
        ];
    }

    public function me(): void
    {
        $uid = $_SESSION['userid'] ?? null;
        if (!$uid) {
            $this->json(['error' => 'Not authenticated'], 401);
            return;
        }

        $u = $this->users->findById((int)$uid);
        if (!$u) {
            $this->json(['error' => 'Session user not found'], 401);
            return;
        }

        $this->json(['user' => $this->publicUser($u)]);
    }

    public function register(): void
    {
        try {
            $b = $this->body();
            $email = strtolower(trim($this->requireString($b, 'email')));
            $name = trim($this->requireString($b, 'name'));
            $password = (string)$this->requireString($b, 'password');

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->json(['error' => 'Invalid email'], 400);
                return;
            }
            if (mb_strlen($password) < 8) {
                $this->json(['error' => 'Password must be at least 8 characters'], 400);
                return;
            }

            if ($this->users->findByEmail($email)) {
                $this->json(['error' => 'Email already registered'], 409);
                return;
            }

            // Bootstrap rule: first user becomes admin
            $role = ($this->users->countUsers() === 0) ? 'admin' : 'user';

            $hash = password_hash($password, PASSWORD_DEFAULT);
            if ($hash === false) {
                $this->json(['error' => 'Failed to hash password'], 500);
                return;
            }

            $id = $this->users->create($email, $name, $hash, $role);

            session_regenerate_id(true);
            $_SESSION['userid'] = $id;

            $u = $this->users->findById($id);
            $this->json(['user' => $this->publicUser($u)], 201);
        } catch (InvalidArgumentException $e) {
            $this->json(['error' => $e->getMessage()], 400);
        }
    }

    public function login(): void
    {
        try {
            $b = $this->body();
            $email = strtolower(trim($this->requireString($b, 'email')));
            $password = (string)$this->requireString($b, 'password');

            $u = $this->users->findByEmail($email);
            if (!$u || !password_verify($password, (string)$u['passwordhash'])) {
                $this->json(['error' => 'Invalid credentials'], 401);
                return;
            }

            session_regenerate_id(true);
            $_SESSION['userid'] = (int)$u['userid'];

            $this->json(['user' => $this->publicUser($u)]);
        } catch (InvalidArgumentException $e) {
            $this->json(['error' => $e->getMessage()], 400);
        }
    }

    public function logout(): void
    {
        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }

        session_destroy();
        $this->json(['ok' => true]);
    }
}
