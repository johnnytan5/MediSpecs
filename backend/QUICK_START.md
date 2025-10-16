# Quick Start Guide - MediSpecs Backend

## 🚀 Get Running in 5 Minutes

Install python on your local device first, if no python can run this script from the terminal:
Platform-Specific Scripts:
Mac/Linux: ./run.sh
Windows: Double-click run.bat

### 1. Open Terminal
- **Mac:** Press `Cmd + Space`, type "Terminal"
- **Windows:** Press `Win + R`, type `cmd`

### 2. Navigate to Backend
```bash
cd /Users/johnnytan/Documents/MediSpecs/backend
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python main.py
```

### 5. Test It Works
Open browser: http://localhost:8000

---

## ✅ Success Indicators

You'll know it's working when you see:
- Terminal shows: `Uvicorn running on http://0.0.0.0:8000`
- Browser shows: `{"message": "Welcome to MediSpecs API", "status": "running"}`

## 🛑 Stopping the Server

Press `Ctrl + C` in the terminal

## 🆘 Need Help?

Read the full `README.md` file for detailed instructions and troubleshooting.

---

**That's it!** Your backend is now running and ready for the frontend to connect to it.
