# ChatApp Server

This is the backend server for ChatApp, built with Node.js, Express, and Socket.IO. It handles real-time bidirectional communication, user authentication, and data persistence.

## 🚀 Features

- **Real-time Engine**: Socket.IO integration for instant messaging, typing indicators, presence tracking, and read receipts.
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing.
- **Database**: MongoDB with Mongoose ODM for scalable data storage.
- **Media Management**: Cloudinary integration via Multer for secure and optimized file uploads.
- **Security & Reliability**: Configured with Helmet, CORS, Express Rate Limit, and Winston for structured logging.
- **Data Validation & Sanitization**: Uses DOMPurify to clean incoming data and prevent XSS.

## 🛠 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: Express
- **Real-time**: Socket.IO
- **Database**: MongoDB (Mongoose)
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **File Uploads**: Multer & Cloudinary
- **Language**: TypeScript

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)
- [Cloudinary](https://cloudinary.com/) Account (for handling file uploads)

### Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root of the server directory with the following keys:
   ```env
   PORT=4000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLIENT_URL=http://localhost:3000
   ```

4. (Optional) Seed the database with demo users:
   ```bash
   npm run seed
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` and automatically reload when you make changes.
