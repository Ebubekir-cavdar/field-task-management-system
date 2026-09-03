
A full-stack mobile application built for managing field tasks, tracking task progress, and uploading proof photos.

Features
- **Task Management:** View assigned tasks, start work (`IN_PROGRESS`), and complete them.
- **Proof Photo:** Capture a photo using the phone camera to verify task completion.
- **Task History:** View historical logs (`CREATED`, `STARTED`, `COMPLETED`) for each task.
- **Authentication:** User registration and login with password hashing.

Tech Stack
- **Backend:** .NET 8 Web API, Entity Framework Core, PostgreSQL
- **Mobile:** React Native (Expo), Zustand (State Management), Axios

Folder Structure
- `backend/TaskManagement.API/`: .NET 8 API project source code
- `mobile/`: React Native Expo app source code

How to Run

1. Backend
```bash
cd backend/TaskManagement.API
dotnet run --urls "http://0.0.0.0:5000"
```

2. Mobile
```bash
cd mobile
npm install
npx expo start -c
```
