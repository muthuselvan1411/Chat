# This is the entry point for Vercel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Chat API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Chat API is running!",
        "status": "healthy",
        "service": "chat-backend"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "chat-backend"}

@app.get("/api/test")
async def test_endpoint():
    return {"message": "Backend is working correctly!"}

# For Vercel deployment
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
