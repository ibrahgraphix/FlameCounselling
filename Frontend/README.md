## 🛠️ Tech Stack

| Feature          | Technology Used                              |
| ---------------- | -------------------------------------------- |
| Frontend         | React.js (Functional + Hooks)                |
| Styling          | TailwindCSS                                  |
| Routing          | React Router DOM                             |
| State Management | Context API (or Redux)                       |
| API Integration  | Axios + Fake APIs (JSONPlaceholder, MockAPI) |
| Authentication   | useAuth                                      |
| Deployment       | Vercel                                       |
| Animations       | Framer Motion                                |

---

## 📁 Folder Structure

```
Backend/
├─ .env                    # Environment variables (DB creds, JWT secret)
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ server.ts            # Entry point
│  ├─ app.ts               # Express app + middleware + routes
│  ├─ config/
│  │  └─ db.ts             # PostgreSQL connection pool
│  ├─ models/
│  │  └─ Counselor.ts      # TypeScript interface for counselor
│  ├─ repositories/
│  │  └─ counselorRepository.ts  # DB access functions for counselors
│  ├─ services/
│  │  └─ authService.ts    # Business logic for login
│  ├─ controllers/
│  │  └─ authController.ts # Express request handlers for login
│  ├─ routes/
│  │  └─ auth.ts           # Router for /api/auth
│  └─ utils/
│     └─ jwt.ts            # JWT token generation/verification
└─ create_counselors_table.sql  # SQL to create table + insert sample data
--------------------------------------------------------------------------------------

src/
├── components/
│   ├── Auth/              # SignIn, Register, ForgotPassword
│   ├── Dashboard/         # Mood charts, analytics
│   ├── Blog/              # Blog UI components
│   ├── Admin/             # Admin panel features
├── pages/
│   ├── Dashboard.jsx
│   ├── BookAppointment.jsx
│   ├── Blog.jsx
│   ├── Community.jsx
│   ├── ContactUs.jsx
│   ├── AboutUs.jsx
├── services/
│   └── api.js             # Axios setup for mock APIs
├── utils/
│   └── auth.js            # Auth helpers
├── App.jsx
├── index.js
```

---
