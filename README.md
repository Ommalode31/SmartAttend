# SmartAttend – Smart Training & Attendance Management System

SmartAttend is a full-stack Training and Attendance Management System designed to replace manual attendance processes with a secure, automated and intelligent attendance system.

It provides separate dashboards for Admin, Trainer and Student and uses dynamic QR codes, device verification, location validation and risk scoring to reduce proxy attendance and unauthorized attendance attempts.

---

##  Live Project

Frontend:
https://smartattend-five.vercel.app/

Backend API:
https://smartattend-backend-108w.onrender.com/

GitHub:
https://github.com/Ommalode31/SmartAttend

---

##  Problem Statement

Traditional attendance systems often depend on manual entries and trainer involvement.

This can lead to:

- Proxy attendance
- Incorrect attendance records
- Manual data entry
- Time consumption
- Difficulty tracking attendance
- Lack of security
- No centralized attendance monitoring

SmartAttend solves these problems through automated digital attendance verification.

---

#  Key Features

1) Admin

- Admin login
- Admin dashboard
- View registered users
- View trainers
- View students
- View courses
- View attendance records
- Monitor attendance information

2)  Trainer

- Trainer authentication
- Create and manage courses
- Schedule course sessions
- Start attendance sessions
- Generate dynamic QR codes
- Refresh QR codes automatically
- Set classroom location
- Configure attendance radius
- End attendance sessions
- Monitor attendance

# Student

- Student authentication
- Student dashboard
- View available sessions
- Scan attendance QR
- Location verification
- Device verification
- Attendance status
- Attendance history

---

# Anti-Proxy Attendance System

SmartAttend uses multiple security layers to reduce proxy attendance.

# 1. Dynamic QR Code

Attendance QR codes expire after a short period and can be refreshed.

This prevents students from simply sharing an old QR code.

## 2. Location Verification

The student's current location is compared with the classroom location.

Attendance is accepted only when the student is within the configured attendance radius.

### 3. Device Verification

Each student device is registered and trusted.

Unregistered or blocked devices cannot mark attendance.

#### 4. Duplicate Attendance Detection

The system detects repeated attendance attempts for the same session.

##### 5. Risk Score

Every attendance attempt can be evaluated using a risk score based on:

- QR validity
- Session validity
- Device trust
- Location validity
- Duplicate attempt
- Distance from classroom

Suspicious attempts are logged as security events.

---

##  System Architecture

```text
                    ┌─────────────────────┐
                    │      Student        │
                    │  Web Application    │
                    └──────────┬──────────┘
                               │
                               │
                    ┌──────────▼──────────┐
                    │      Trainer        │
                    │  Web Application    │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │   Node.js + Express │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        Authentication     Attendance       Security
           JWT             System           Validation
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      MongoDB        │
                    │       Atlas         │
                    └─────────────────────┘

 Technology Stack
Frontend
React.js
JavaScript
HTML5
CSS3
Vite
HTML5 QR Code
QR Code Library
Backend
Node.js
Express.js
REST APIs
JWT Authentication
bcrypt.js
QR Code Generation
Database
MongoDB
Mongoose
MongoDB Atlas
Security
JWT
Password Hashing
Role-Based Access Control
Device Verification
Location Verification
Dynamic QR Validation
Risk Scoring
Security Event Logging
Deployment
Frontend: Vercel
Backend: Render
Database: MongoDB Atlas
 Project Structure
SmartAttend/
│
├── backend/
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   │
│   ├── models/
│   │   ├── Attendance.js
│   │   ├── AttendanceSession.js
│   │   ├── Course.js
│   │   ├── CourseSession.js
│   │   ├── Device.js
│   │   ├── SecurityEvent.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   ├── courseRoutes.js
│   │   ├── courseSessionRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── utils/
│   │   └── riskScore.js
│   │
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md

 Attendance Workflow
Trainer Login
      ↓
Select Course Session
      ↓
Start Attendance
      ↓
Generate Dynamic QR
      ↓
Student Scans QR
      ↓
Verify QR Token
      ↓
Verify Student Device
      ↓
Verify Student Location
      ↓
Check Duplicate Attendance
      ↓
Calculate Risk Score
      ↓
Mark Attendance
      ↓
Store Attendance in MongoDB

 User Roles
Role	    Main Responsibilities
Admin	    Manage and monitor the complete system
Trainer	  Manage courses, sessions and attendance
Student	  Join sessions and mark attendance.

 Authentication

SmartAttend uses JWT-based authentication.

After successful login:

User Login
    ↓
Server validates credentials
    ↓
JWT generated
    ↓
Token stored by frontend
    ↓
Token sent with API requests
    ↓
Backend verifies token
    ↓
Role-based access granted

Passwords are securely hashed using bcrypt.

 Important API Endpoints
Authentication
POST /api/auth/register
POST /api/auth/login
Courses
GET  /api/courses
POST /api/courses
Course Sessions
GET  /api/course-sessions
POST /api/course-sessions
Attendance
POST /api/attendance/session/start
POST /api/attendance/check-in
POST /api/attendance/session/:sessionId/refresh-qr
POST /api/attendance/session/:sessionId/end
POST /api/attendance/device/register
GET  /api/attendance/admin
 Local Installation
1. Clone Repository
git clone https://github.com/Ommalode31/SmartAttend.git
cd SmartAttend
2. Backend
cd backend
npm install


Start backend:
node server.js


3. Frontend
Open another terminal:

cd frontend
npm install
npm run dev


 Security & Risk Management

SmartAttend evaluates attendance attempts using a risk scoring mechanism.

Example security checks:

Invalid QR              → Risk Increase
Invalid Session         → Risk Increase
Untrusted Device        → Risk Increase
Outside Location       → Risk Increase
Duplicate Attendance    → Risk Increase
Near Radius Boundary    → Risk Increase

The system categorizes suspicious attendance attempts using risk levels.

 Project Objectives
Automate attendance management
Reduce manual trainer involvement
Reduce proxy attendance
Provide secure attendance verification
Maintain centralized attendance records
Improve attendance transparency
Provide role-based dashboards
Provide real-time attendance validation
 Future Enhancements

Possible future improvements:

Face verification
Liveness detection
WebSocket-based real-time attendance
Advanced analytics dashboard
Attendance reports in PDF/Excel
Email notifications
Mobile application
AI-based fraud detection
Advanced admin security monitoring
Cloud deployment with CI/CD

 Developer

Om Malode

GitHub:
https://github.com/Ommalode31

 License

This project is developed for educational, training and demonstration purposes.


