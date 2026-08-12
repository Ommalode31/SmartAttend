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
