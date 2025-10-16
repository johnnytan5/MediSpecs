# MediSpecs Backend Setup Guide

Welcome to the MediSpecs backend! This guide will help you set up and run the FastAPI backend server, even if you don't have a technical background.

## What is this?

This is the **backend** (server) part of the MediSpecs application. Think of it as the "brain" that handles data processing, business logic, and provides information to the frontend (the part users see and interact with).

## Prerequisites

Before you start, you'll need to install Python on your computer:

### Installing Python

1. **For Windows:**
   - Go to [python.org](https://www.python.org/downloads/)
   - Download Python 3.11 or newer
   - During installation, make sure to check "Add Python to PATH"

2. **For Mac:**
   - Open Terminal (press Cmd + Space, type "Terminal")
   - Run: `brew install python` (if you have Homebrew)
   - Or download from [python.org](https://www.python.org/downloads/)

3. **For Linux:**
   - Run: `sudo apt update && sudo apt install python3 python3-pip`

## Step-by-Step Setup

### Step 1: Open Terminal/Command Prompt

- **Windows:** Press `Win + R`, type `cmd`, press Enter
- **Mac:** Press `Cmd + Space`, type "Terminal", press Enter
- **Linux:** Press `Ctrl + Alt + T`

### Step 2: Navigate to the Backend Folder

```bash
cd /Users/johnnytan/Documents/MediSpecs/backend
```

### Step 3: Create a Virtual Environment (Recommended)

A virtual environment keeps your project dependencies separate from other Python projects:

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate
```

You'll know it's activated when you see `(venv)` at the beginning of your terminal line.

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

This installs all the necessary packages for the FastAPI backend.

### Step 5: Run the Server

```bash
python main.py
```

You should see output like:
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Step 6: Test the API

Open your web browser and go to:
- **Main page:** http://localhost:8000
- **API documentation:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health

## Understanding the Files

- `main.py` - The main application file that defines the API
- `requirements.txt` - Lists all the Python packages needed
- `env.example` - Example environment configuration file
- `README.md` - This guide you're reading

## Common Commands

### Starting the server:
```bash
python main.py
```

### Stopping the server:
Press `Ctrl + C` in the terminal

### Installing new packages:
```bash
pip install package-name
pip freeze > requirements.txt  # Update requirements file
```

## Troubleshooting

### "Python not found" error:
- Make sure Python is installed and added to your PATH
- Try `python3` instead of `python`

### "Module not found" error:
- Make sure you're in the correct directory
- Make sure you've activated the virtual environment
- Run `pip install -r requirements.txt`

### "Port already in use" error:
- Another application is using port 8000
- Change the port in `main.py` (line with `port=8000`)
- Or stop the other application

### Virtual environment not activating:
- **Windows:** Try `venv\Scripts\activate.bat`
- **Mac/Linux:** Make sure you're in the right directory

## Development Tips

1. **Always activate your virtual environment** before working
2. **Keep your dependencies updated** by running `pip install -r requirements.txt`
3. **Use the API documentation** at http://localhost:8000/docs to test endpoints
4. **Check the console output** for error messages

## Getting Help

If you encounter issues:

1. **Check the terminal output** for error messages
2. **Make sure all steps were followed** in this guide
3. **Try restarting** your terminal and running commands again
4. **Ask a team member** who has successfully set up the backend

## Next Steps

Once the backend is running:

1. The API will be available at `http://localhost:8000`
2. You can view interactive API documentation at `http://localhost:8000/docs`
3. The frontend can connect to this backend for data processing
4. You can add new API endpoints in `main.py`

## Environment Configuration

For advanced configuration, copy `env.example` to `.env` and modify the values as needed.

---

**Remember:** This backend needs to be running for the frontend to work properly. Keep this terminal window open while developing!
