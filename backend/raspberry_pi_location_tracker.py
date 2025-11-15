#!/usr/bin/env python3
"""
Raspberry Pi Location Tracker
Collects GPS coordinates and uploads to API Gateway

Features:
- GPS module support (GPSD, serial GPS, or mock data)
- Comprehensive logging
- Automatic retry on failures
- Configurable sampling interval

Setup:
1. Install dependencies: pip install gpsd-py3 requests
2. For GPSD: sudo apt-get install gpsd gpsd-clients
3. Configure device_id and api_url below
4. Run: python raspberry_pi_location_tracker.py

Logging:
- All logs go to console (stdout/stderr)
- Use systemd journalctl or redirect to file for production
"""

import os
import sys
import time
import json
import logging
import requests
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass

# ============================================================================
# CONFIGURATION
# ============================================================================

# Device ID (change this to your device ID)
DEVICE_ID = os.environ.get('DEVICE_ID', 'd_123')

# API Gateway URL
API_BASE_URL = os.environ.get(
    'API_BASE_URL',
    'https://zqglpdheqk.execute-api.ap-southeast-1.amazonaws.com/staging'
)

# Location sampling interval (seconds)
SAMPLING_INTERVAL = int(os.environ.get('SAMPLING_INTERVAL', '60'))  # 1 minute default

# GPS Configuration
USE_GPSD = os.environ.get('USE_GPSD', 'false').lower() == 'true'
USE_SERIAL_GPS = os.environ.get('USE_SERIAL_GPS', 'false').lower() == 'true'
SERIAL_PORT = os.environ.get('SERIAL_PORT', '/dev/ttyUSB0')
USE_MOCK_DATA = os.environ.get('USE_MOCK_DATA', 'false').lower() == 'true'  # For testing

# Logging Configuration
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
LOG_FILE = os.environ.get('LOG_FILE', None)  # Optional: log to file

# Mock location (for testing without GPS)
MOCK_LAT = float(os.environ.get('MOCK_LAT', '3.1199'))  # University of Malaya
MOCK_LNG = float(os.environ.get('MOCK_LNG', '101.6544'))

# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging():
    """Configure logging with timestamps and levels"""
    log_format = '%(asctime)s [%(levelname)8s] %(name)s: %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'
    
    handlers = [logging.StreamHandler(sys.stdout)]
    
    if LOG_FILE:
        handlers.append(logging.FileHandler(LOG_FILE))
    
    logging.basicConfig(
        level=getattr(logging, LOG_LEVEL, logging.INFO),
        format=log_format,
        datefmt=date_format,
        handlers=handlers
    )
    
    return logging.getLogger(__name__)

logger = setup_logging()

# ============================================================================
# GPS INTERFACE
# ============================================================================

@dataclass
class Location:
    """Location data structure"""
    lat: float
    lng: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    timestamp: Optional[str] = None

class GPSInterface:
    """Abstract GPS interface"""
    
    def initialize(self) -> bool:
        """Initialize GPS connection. Returns True if successful."""
        raise NotImplementedError
    
    def get_location(self) -> Optional[Location]:
        """Get current location. Returns None if not available."""
        raise NotImplementedError
    
    def is_available(self) -> bool:
        """Check if GPS is available and ready."""
        raise NotImplementedError

class GPSDInterface(GPSInterface):
    """GPSD (GPS daemon) interface"""
    
    def __init__(self):
        self.gpsd = None
        self.connected = False
    
    def initialize(self) -> bool:
        """Initialize GPSD connection"""
        try:
            import gpsd
            gpsd.connect()
            self.gpsd = gpsd
            self.connected = True
            logger.info("✅ GPSD connection established")
            return True
        except ImportError:
            logger.error("❌ gpsd-py3 not installed. Install with: pip install gpsd-py3")
            return False
        except Exception as e:
            logger.error(f"❌ Failed to connect to GPSD: {e}")
            logger.info("💡 Make sure GPSD is running: sudo systemctl start gpsd")
            return False
    
    def get_location(self) -> Optional[Location]:
        """Get location from GPSD"""
        if not self.connected:
            return None
        
        try:
            packet = self.gpsd.get_current()
            
            if packet.mode < 2:  # Mode 0=no fix, 1=no fix, 2=2D fix, 3=3D fix
                logger.debug(f"⚠️  GPS fix not available (mode={packet.mode})")
                return None
            
            return Location(
                lat=packet.lat,
                lng=packet.lon,
                accuracy=packet.error.get('c', None),  # Circular error
                speed=packet.speed() if hasattr(packet, 'speed') else None,
                timestamp=datetime.utcnow().isoformat() + 'Z'
            )
        except Exception as e:
            logger.debug(f"⚠️  GPSD read error: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check GPSD availability"""
        if not self.connected:
            return False
        try:
            packet = self.gpsd.get_current()
            return packet.mode >= 2
        except:
            return False

class SerialGPSInterface(GPSInterface):
    """Serial GPS module interface (NMEA)"""
    
    def __init__(self, port: str = '/dev/ttyUSB0'):
        self.port = port
        self.serial = None
        self.connected = False
    
    def initialize(self) -> bool:
        """Initialize serial GPS connection"""
        try:
            import serial
            self.serial = serial.Serial(self.port, baudrate=9600, timeout=1)
            self.connected = True
            logger.info(f"✅ Serial GPS connected on {self.port}")
            return True
        except ImportError:
            logger.error("❌ pyserial not installed. Install with: pip install pyserial")
            return False
        except Exception as e:
            logger.error(f"❌ Failed to open serial port {self.port}: {e}")
            return False
    
    def get_location(self) -> Optional[Location]:
        """Parse NMEA sentences from serial GPS"""
        if not self.connected:
            return None
        
        try:
            # Read NMEA sentences (simplified - you may want to use pynmea2 library)
            line = self.serial.readline().decode('ascii', errors='ignore')
            
            if line.startswith('$GPGGA'):  # Global Positioning System Fix Data
                parts = line.split(',')
                if len(parts) >= 6 and parts[6] != '0':  # Fix quality > 0
                    try:
                        lat_deg = float(parts[2][:2])
                        lat_min = float(parts[2][2:])
                        lat = lat_deg + lat_min / 60.0
                        if parts[3] == 'S':
                            lat = -lat
                        
                        lng_deg = float(parts[4][:3])
                        lng_min = float(parts[4][3:])
                        lng = lng_deg + lng_min / 60.0
                        if parts[5] == 'W':
                            lng = -lng
                        
                        # HDOP (Horizontal Dilution of Precision) as accuracy estimate
                        hdop = float(parts[8]) if parts[8] else None
                        accuracy = hdop * 5 if hdop else None  # Rough estimate: HDOP * 5 meters
                        
                        return Location(
                            lat=lat,
                            lng=lng,
                            accuracy=accuracy,
                            timestamp=datetime.utcnow().isoformat() + 'Z'
                        )
                    except (ValueError, IndexError) as e:
                        logger.debug(f"⚠️  Failed to parse NMEA: {e}")
                        return None
        except Exception as e:
            logger.debug(f"⚠️  Serial read error: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check serial GPS availability"""
        return self.connected and self.serial and self.serial.is_open

class MockGPSInterface(GPSInterface):
    """Mock GPS for testing (returns fixed coordinates)"""
    
    def __init__(self, lat: float, lng: float):
        self.lat = lat
        self.lng = lng
        self.counter = 0
    
    def initialize(self) -> bool:
        logger.info("🧪 Mock GPS initialized (testing mode)")
        return True
    
    def get_location(self) -> Optional[Location]:
        """Return mock location with slight variation"""
        import random
        self.counter += 1
        
        # Add small random variation to simulate movement
        lat_offset = random.uniform(-0.0001, 0.0001)
        lng_offset = random.uniform(-0.0001, 0.0001)
        
        return Location(
            lat=self.lat + lat_offset,
            lng=self.lng + lng_offset,
            accuracy=random.uniform(5, 15),
            speed=random.uniform(0, 2),
            timestamp=datetime.utcnow().isoformat() + 'Z'
        )
    
    def is_available(self) -> bool:
        return True

# ============================================================================
# API UPLOAD
# ============================================================================

def upload_location(location: Location) -> bool:
    """Upload single location to API Gateway"""
    payload = {
        'deviceId': DEVICE_ID,
        'locations': [{
            'lat': location.lat,
            'lng': location.lng,
            'timestamp': location.timestamp or datetime.utcnow().isoformat() + 'Z',
        }]
    }
    
    if location.accuracy is not None:
        payload['locations'][0]['accuracy'] = location.accuracy
    if location.speed is not None:
        payload['locations'][0]['speed'] = location.speed
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/locations",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code in [201, 207]:
            result = response.json()
            count = result.get('count', 1)
            logger.info(f"✅ Location uploaded successfully (count={count})")
            return True
        else:
            logger.error(f"❌ API upload failed: HTTP {response.status_code} - {response.text}")
            return False
    
    except requests.exceptions.Timeout:
        logger.error("❌ API upload timeout (server not responding)")
        return False
    except requests.exceptions.ConnectionError:
        logger.error("❌ API upload connection error (check network/API URL)")
        return False
    except Exception as e:
        logger.error(f"❌ API upload error: {e}")
        return False

# ============================================================================
# MAIN LOOP
# ============================================================================

def main():
    """Main tracking loop"""
    logger.info("=" * 60)
    logger.info("🚀 Raspberry Pi Location Tracker Starting")
    logger.info("=" * 60)
    logger.info(f"Device ID: {DEVICE_ID}")
    logger.info(f"API URL: {API_BASE_URL}")
    logger.info(f"Sampling Interval: {SAMPLING_INTERVAL} seconds")
    logger.info(f"Log Level: {LOG_LEVEL}")
    logger.info("=" * 60)
    
    # Initialize GPS
    gps: Optional[GPSInterface] = None
    
    if USE_MOCK_DATA:
        logger.info("🧪 Using MOCK GPS data (testing mode)")
        gps = MockGPSInterface(MOCK_LAT, MOCK_LNG)
    elif USE_GPSD:
        logger.info("📡 Initializing GPSD interface...")
        gps = GPSDInterface()
    elif USE_SERIAL_GPS:
        logger.info(f"📡 Initializing Serial GPS on {SERIAL_PORT}...")
        gps = SerialGPSInterface(SERIAL_PORT)
    else:
        logger.error("❌ No GPS interface configured!")
        logger.info("💡 Set one of: USE_MOCK_DATA=true, USE_GPSD=true, or USE_SERIAL_GPS=true")
        return 1
    
    if not gps.initialize():
        logger.error("❌ GPS initialization failed. Exiting.")
        return 1
    
    logger.info("✅ GPS initialized successfully")
    logger.info("=" * 60)
    logger.info("📍 Starting location tracking loop...")
    logger.info("=" * 60)
    
    consecutive_failures = 0
    max_failures = 5
    
    try:
        while True:
            # Get location
            location = gps.get_location()
            
            if location:
                logger.info(f"📍 Location: lat={location.lat:.6f}, lng={location.lng:.6f}, "
                          f"accuracy={location.accuracy:.1f}m" if location.accuracy else "accuracy=N/A")
                
                # Upload to API
                if upload_location(location):
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    if consecutive_failures >= max_failures:
                        logger.warning(f"⚠️  {consecutive_failures} consecutive upload failures. "
                                     f"GPS still working, but API uploads are failing.")
            else:
                logger.debug("⚠️  No GPS fix available (waiting for satellite lock...)")
                if not gps.is_available():
                    logger.warning("⚠️  GPS not available. Check GPS module and antenna.")
            
            # Wait for next sample
            time.sleep(SAMPLING_INTERVAL)
    
    except KeyboardInterrupt:
        logger.info("")
        logger.info("=" * 60)
        logger.info("🛑 Location tracker stopped by user")
        logger.info("=" * 60)
        return 0
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}", exc_info=True)
        return 1

if __name__ == '__main__':
    sys.exit(main())


