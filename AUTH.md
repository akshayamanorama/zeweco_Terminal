# Authentication (Zeweco Terminal)

Real authentication is implemented: **email + password login** and **forgot password via email code**.

## What’s in place

- **Login**: Email + password; validated against the server (passwords hashed with bcrypt).
- **Forgot password**:
  1. User enters email → server sends a **6-digit code** to that email.
  2. User enters the code + new password (and confirm) → password is updated; they can log in with the new password.

## What you need to do

### 1. Run the backend

Login and reset only work when the API is running:

```bash
cd server
npm install   # if not done
npx prisma migrate dev   # if DB not set up (uses .env DATABASE_URL)
npm run dev
```

Keep this running on port **3001**. The frontend (Vite on 3000) proxies `/api` to it.

### 2. (Optional) Enable “Forgot password” emails

To send the 6-digit code by email, configure SMTP in **`server/.env`**:

- **Gmail (recommended for testing)**  
  - [Create an App Password](https://support.google.com/accounts/answer/185833) for your Google account.  
  - In `server/.env` add:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="Zeweco Terminal <your-email@gmail.com>"
```

- **Other SMTP**  
  Use your provider’s host, port, user, and password in the same variables.

If SMTP is **not** set, “Forgot password” will respond with an error asking you to configure SMTP. Login and the rest of the app still work.

### 3. Default logins (after seed)

After `npx prisma migrate dev` the seed creates:

| Role    | Email              | Password  |
|--------|--------------------|-----------|
| CXO    | akshaya@zeweco.com | 123456    |
| Manager| kirtii@zeweco.com  | password  |
| Manager| juhi@zeweco.com    | password  |

Change these in production (e.g. via Team Management or by re-seeding with your own users).

## Summary

- **Real login**: Yes — server validates email/password (bcrypt).
- **Forgot password**: Yes — request code → email → enter code + new password.
- **From you**: Run the server; optionally set SMTP in `server/.env` for reset emails.
