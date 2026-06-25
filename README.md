# PropertyRental — Full Stack Property Booking Platform

A full-stack property rental and booking web application built with Next.js and Node.js. Users can browse properties, make bookings, and pay online. Owners can list and manage their properties. Admins have full control over the platform.

---

## Features

- User registration with OTP email verification
- Google OAuth login support
- Role-based access: Admin, Owner, and Tenant
- Property listings with image upload and filters
- Booking system with move-in date selection
- SSLCommerz payment gateway integration (simulation included)
- Email invoice sent after successful payment
- Admin dashboard with user management and property verification
- Owner dashboard with booking requests and earnings analytics
- Tenant dashboard with booking history and saved favorites
- Fully responsive design with dark mode support

---

## Tech Stack

**Frontend (Client)**
- Next.js 15 (App Router)
- React 19
- CSS Modules
- Recharts (for analytics charts)
- Lucide React (icons)
- Canvas Confetti (success animation)

**Backend (Server)**
- Node.js + Express.js
- MongoDB + Mongoose
- JSON Web Token (JWT) for authentication
- Nodemailer for transactional emails
- Bcrypt for password hashing
- Stripe SDK (optional)

---

## Project Structure

```
Booking Platform/
├── client/          # Next.js frontend
│   ├── src/
│   │   ├── app/             # All pages (login, register, dashboard, etc.)
│   │   ├── components/      # Reusable UI components
│   │   └── context/         # Auth and Theme context
│   └── package.json
│
└── server/          # Express.js backend
    ├── models/              # Mongoose models (User, Booking, Property, etc.)
    ├── routes/              # API routes (auth, bookings, payments, etc.)
    ├── middleware/          # JWT auth middleware
    ├── utils/               # Email utility
    └── index.js             # Entry point
```

---

## Getting Started

### Prerequisites

Make sure you have these installed:
- Node.js v18 or higher
- MongoDB (local or MongoDB Atlas)
- npm

---

### 1. Clone the Repository

```bash
git clone https://github.com/abir-hos-sen/PropertyRental-Server.git
cd PropertyRental-Server
```

---

### 2. Setup the Server

```bash
cd server
npm install
```

Create a `.env` file inside the `server/` folder:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/propertyrental
JWT_SECRET=your_secret_key_here

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

Start the server:

```bash
node index.js
```

The server will run at `http://localhost:5000`

---

### 3. Setup the Client

```bash
cd client
npm install
```

Create a `.env.local` file inside the `client/` folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

The app will run at `http://localhost:3000`

---

## Default Test Accounts

After running the seed script, you can log in with these accounts:

| Role   | Email                  | Password   |
|--------|------------------------|------------|
| Admin  | admin@rental.com       | admin123   |
| Owner  | owner@rental.com       | owner123   |
| Tenant | tenant@rental.com      | tenant123  |

To seed the database:
```bash
cd server
node seed.js
```

---

## API Overview

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | /api/auth/register                | Register a new user            |
| POST   | /api/auth/login                   | Login and get JWT token        |
| GET    | /api/properties                   | Get all approved properties    |
| POST   | /api/properties                   | Add a new property (Owner)     |
| PATCH  | /api/properties/admin/verify/:id  | Approve or reject property     |
| POST   | /api/bookings                     | Create a new booking           |
| PATCH  | /api/bookings/:id/status          | Update booking status          |
| POST   | /api/payments/create-checkout-session | Start a payment session   |
| POST   | /api/payments/verify-session      | Verify payment and send invoice|
| GET    | /api/analytics/admin-overview     | Admin dashboard stats          |
| GET    | /api/analytics/owner-overview     | Owner dashboard stats          |

---

## Environment Notes

- If SMTP credentials are missing, emails will be logged to the console instead of sent
- If Stripe keys are missing, a local SSLCommerz simulation page will be used
- The server handles offline/fallback mode for development without MongoDB

---

## License

This project was built for educational and portfolio purposes.

a
