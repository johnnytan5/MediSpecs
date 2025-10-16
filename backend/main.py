from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create FastAPI instance
app = FastAPI(
    title="MediSpecs API",
    description="A FastAPI backend for MediSpecs application",
    version="1.0.0"
)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to MediSpecs API", "status": "running"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# Example API endpoint
@app.get("/api/version")
async def get_version():
    return {"version": "1.0.0", "api": "MediSpecs"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
