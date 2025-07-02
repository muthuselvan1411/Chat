# RealTime Chat Application

A modern, full-stack real-time chat application built with React (TypeScript) frontend and Python FastAPI backend with WebSocket support.

## 🚀 Features

- **Real-time messaging** with WebSocket connections
- **Multiple chat rooms** (General, Random, Tech Talk)
- **User presence indicators** (online/offline status)
- **Typing indicators** when users are typing
- **Message history** persistence
- **Responsive design** that works on desktop and mobile
- **Professional UI** with Tailwind CSS
- **TypeScript support** for better development experience
- **Modern tech stack** with latest frameworks

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Socket.IO Client** for WebSocket communication
- **Lucide React** for icons

### Backend
- **Python 3.8+**
- **FastAPI** for the web framework
- **WebSockets** for real-time communication
- **Uvicorn** as ASGI server
- **Pydantic** for data validation
- **CORS middleware** for cross-origin requests

## 📋 Prerequisites

Before running the application, make sure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** or **yarn**
- **Python** (version 3.8 or higher)
- **pip** (Python package manager)

## 🚀 Getting Started

### 1. Clone/Extract the Project

Extract the provided ZIP file or clone the repository:

```bash
# Extract the ZIP file and navigate to the project directory
cd realtime-chat-app
```

### 2. Backend Setup

Navigate to the backend directory and set up the Python environment:

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

Open a new terminal, navigate to the frontend directory and install dependencies:

```bash
# Navigate to frontend directory (from root)
cd frontend

# Install dependencies
npm install

# Or if you prefer yarn:
yarn install
```

## 🏃 Running the Application

### 1. Start the Backend Server

In the backend directory with your virtual environment activated:

```bash
# Make sure you're in the backend directory
cd backend

# Start the FastAPI server
python main.py

# Or alternatively:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend server will start at `http://localhost:8000`

You can verify it's running by visiting `http://localhost:8000` in your browser.

### 2. Start the Frontend Development Server

In a new terminal, navigate to the frontend directory:

```bash
# Make sure you're in the frontend directory
cd frontend

# Start the development server
npm run dev

# Or if you prefer yarn:
yarn dev
```

The frontend will start at `http://localhost:3000`

## 🌐 Using the Application

1. **Open your browser** and go to `http://localhost:3000`
2. **Enter your username** in the login form
3. **Select a chat room** from the dropdown (General, Random, or Tech Talk)
4. **Click "Join Chat"** to enter the chat room
5. **Start chatting!** Your messages will appear in real-time to all users in the same room

### Features in Action

- **Real-time messaging**: Messages appear instantly for all users
- **User list**: See who's currently online in the sidebar
- **Multiple rooms**: Switch between different chat rooms
- **Typing indicators**: See when someone is typing
- **Message timestamps**: Each message shows when it was sent
- **System messages**: Get notified when users join or leave

## 🔧 Development

### Frontend Development

```bash
cd frontend

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Backend Development

```bash
cd backend

# Start with auto-reload for development
python main.py

# Or run with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📁 Project Structure

```
realtime-chat-app/
├── frontend/                   # React frontend application
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ChatRoom.tsx   # Main chat interface
│   │   │   ├── MessageList.tsx # Message display
│   │   │   ├── MessageInput.tsx # Message input form
│   │   │   └── UserList.tsx   # Online users sidebar
│   │   ├── hooks/
│   │   │   └── useSocket.ts   # Socket.IO hook
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript types
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── package.json           # Frontend dependencies
│   ├── tsconfig.json          # TypeScript config
│   ├── tailwind.config.js     # Tailwind CSS config
│   └── vite.config.ts         # Vite configuration
└── backend/                   # Python FastAPI backend
    ├── main.py                # Main FastAPI application
    ├── requirements.txt       # Python dependencies
    └── README.md              # This file
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   - Backend: Change port in `main.py` or kill the process using port 8000
   - Frontend: Change port in `vite.config.ts` or kill the process using port 3000

2. **CORS errors**
   - Make sure the backend is running on port 8000
   - Check that CORS origins in `main.py` include your frontend URL

3. **WebSocket connection failed**
   - Ensure the backend server is running
   - Check that the frontend is connecting to the correct backend URL
   - Verify firewall settings aren't blocking the connection

4. **Dependencies installation fails**
   - Frontend: Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
   - Backend: Make sure you're using Python 3.8+, try upgrading pip: `pip install --upgrade pip`

### Environment-Specific Issues

**Windows Users:**
```bash
# If you have issues with virtual environment
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux Users:**
```bash
# If you have permission issues
sudo pip install -r requirements.txt
# Or use --user flag
pip install --user -r requirements.txt
```

## 🔐 Security Notes

This is a development version. For production deployment, consider:

- Add authentication and authorization
- Implement rate limiting
- Add input validation and sanitization
- Use HTTPS/WSS for secure connections
- Add logging and monitoring
- Implement proper error handling
- Add database persistence
- Use environment variables for configuration

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Make sure all prerequisites are installed
3. Verify that both frontend and backend servers are running
4. Check the browser console and terminal for error messages

## 🎉 Enjoy!

You now have a fully functional real-time chat application! Happy chatting! 🚀
