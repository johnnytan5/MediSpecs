"""
Mock location data generator for prototyping
Run this script to generate realistic location paths and POST them to your API

Usage:
    python generate_mock_locations.py                          # Use today's date
    python generate_mock_locations.py --date 2025-11-03        # Specify date
    python generate_mock_locations.py -d 2025-11-03           # Short form
"""
import requests
import json
import argparse
import time
from datetime import datetime, timedelta
import random
import math

API_BASE_URL = "https://zqglpdheqk.execute-api.ap-southeast-1.amazonaws.com/staging"
DEVICE_ID = "d_123"

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in meters"""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def generate_jogging_path(start_lat, start_lng, start_time, duration_minutes=30, interval_seconds=60):
    """
    Generate a realistic jogging path - continuous movement following a logical loop route
    
    Args:
        start_lat, start_lng: Starting coordinates
        start_time: datetime object
        duration_minutes: How long the jog lasts
        interval_seconds: Location update interval (60 seconds = 1 minute for more detail)
    """
    locations = []
    current_time = start_time
    
    # Jogging parameters
    jogging_speed_mps = 2.8  # ~10 km/h (meters per second) - realistic jogging pace
    total_steps = (duration_minutes * 60) // interval_seconds
    
    # Define waypoints for a realistic loop route around the starting point
    # These form a roughly rectangular/oval loop that a jogger might take
    waypoints = [
        (start_lat, start_lng),  # Start
        (start_lat + 0.0015, start_lng + 0.0005),  # Northeast
        (start_lat + 0.002, start_lng + 0.0015),  # East
        (start_lat + 0.0015, start_lng + 0.0025),  # Southeast
        (start_lat, start_lng + 0.003),  # South
        (start_lat - 0.0015, start_lng + 0.0025),  # Southwest
        (start_lat - 0.002, start_lng + 0.0015),  # West
        (start_lat - 0.0015, start_lng + 0.0005),  # Northwest
        (start_lat, start_lng),  # Back to start (for loop)
    ]
    
    # Calculate total distance for the loop
    total_loop_distance = 0
    for i in range(len(waypoints) - 1):
        total_loop_distance += haversine_distance(
            waypoints[i][0], waypoints[i][1],
            waypoints[i+1][0], waypoints[i+1][1]
        )
    
    # Calculate how many loops to complete in the duration
    distance_per_step = (interval_seconds * jogging_speed_mps)
    total_distance = distance_per_step * total_steps
    num_loops = max(1, int(total_distance / total_loop_distance))
    
    # Interpolate points along the route
    for step in range(total_steps):
        # Calculate progress through the entire route (including loops)
        progress = (step / total_steps) * num_loops
        loop_progress = progress % 1.0  # Progress within current loop (0 to 1)
        
        # Find which waypoint segment we're on
        segment_float = loop_progress * (len(waypoints) - 1)
        segment_idx = int(segment_float)
        segment_idx = min(segment_idx, len(waypoints) - 2)  # Ensure valid index
        next_idx = segment_idx + 1
        
        # Interpolate between waypoints smoothly
        wp1 = waypoints[segment_idx]
        wp2 = waypoints[next_idx]
        
        # Calculate interpolation factor (0 to 1)
        t = segment_float - segment_idx
        t_smooth = t * t * (3 - 2 * t)  # Smoothstep interpolation for smoother curves
        
        # Interpolate position
        current_lat = wp1[0] + (wp2[0] - wp1[0]) * t_smooth
        current_lng = wp1[1] + (wp2[1] - wp1[1]) * t_smooth
        
        # Add small GPS noise (realistic GPS accuracy)
        gps_noise = 0.00005  # ~5 meters
        current_lat += random.gauss(0, gps_noise)
        current_lng += random.gauss(0, gps_noise)
        
        # Vary speed slightly (realistic jogging variation)
        speed_variation = random.uniform(0.9, 1.1)
        current_speed = jogging_speed_mps * speed_variation
        
        locations.append({
            "lat": round(current_lat, 6),
            "lng": round(current_lng, 6),
            "timestamp": current_time.isoformat() + "Z",
            "speed": round(current_speed * 3.6, 1),  # Convert to km/h
            "accuracy": round(random.uniform(5, 12), 1)  # Good GPS accuracy when moving
        })
        
        current_time += timedelta(seconds=interval_seconds)
    
    return locations

def generate_senior_citizen_path(home_lat, home_lng, start_time, duration_hours=12, interval_seconds=120):
    """
    Generate senior citizen location activity - stays mostly around home with occasional movements
    
    Args:
        home_lat, home_lng: Home coordinates (center point)
        start_time: datetime object
        duration_hours: How long to simulate (e.g., 12 hours = morning to evening)
        interval_seconds: Location update interval
    """
    locations = []
    current_time = start_time
    end_time = start_time + timedelta(hours=duration_hours)
    total_steps = (duration_hours * 3600) // interval_seconds
    
    # Activity zones
    home_radius = 0.001  # ~100m radius around home
    nearby_radius = 0.005  # ~500m radius for nearby places
    
    for i in range(total_steps):
        # Determine activity type based on time of day
        hour = current_time.hour
        
        if 6 <= hour < 9:  # Morning
            # Small movements around home (getting ready)
            radius = random.uniform(0, home_radius * 0.5)
            speed = random.uniform(0.5, 1.5)  # Walking speed
        elif 9 <= hour < 12:  # Late morning
            # Might go for a short walk nearby
            if random.random() < 0.3:  # 30% chance of going out
                radius = random.uniform(home_radius, nearby_radius)
                speed = random.uniform(1.0, 2.0)
            else:
                radius = random.uniform(0, home_radius)
                speed = random.uniform(0.3, 1.0)
        elif 12 <= hour < 14:  # Lunch time
            # Usually at home
            radius = random.uniform(0, home_radius * 0.3)
            speed = random.uniform(0.2, 0.8)
        elif 14 <= hour < 17:  # Afternoon
            # Might go out for a walk
            if random.random() < 0.4:  # 40% chance
                radius = random.uniform(home_radius * 0.5, nearby_radius * 0.8)
                speed = random.uniform(1.0, 2.5)
            else:
                radius = random.uniform(0, home_radius)
                speed = random.uniform(0.3, 1.0)
        elif 17 <= hour < 20:  # Evening
            # Usually at home
            radius = random.uniform(0, home_radius * 0.4)
            speed = random.uniform(0.2, 0.9)
        else:  # Night
            # Very minimal movement (mostly at home)
            radius = random.uniform(0, home_radius * 0.2)
            speed = random.uniform(0.1, 0.5)
        
        # Generate location within radius
        angle = random.uniform(0, 2 * math.pi)
        lat_offset = radius * math.cos(angle)
        lng_offset = radius * math.sin(angle)
        
        current_lat = home_lat + lat_offset
        current_lng = home_lng + lng_offset
        
        locations.append({
            "lat": round(current_lat, 6),
            "lng": round(current_lng, 6),
            "timestamp": current_time.isoformat() + "Z",
            "speed": round(speed, 1),
            "accuracy": round(random.uniform(8, 20), 1)  # GPS less accurate when stationary
        })
        
        current_time += timedelta(seconds=interval_seconds)
        
        if current_time >= end_time:
            break
    
    return locations

def post_locations(device_id, locations, token=None):
    """POST locations to API in batches of 50 (smaller to avoid timeout/throttling)"""
    url = f"{API_BASE_URL}/locations"
    headers = {
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    # Batch locations into chunks of 50 (smaller to avoid Lambda timeout/throttling)
    batch_size = 50
    results = []
    
    for i in range(0, len(locations), batch_size):
        batch = locations[i:i + batch_size]
        payload = {
            "deviceId": device_id,
            "locations": batch
        }
        
        # Retry logic for failed batches
        max_retries = 3
        retry_count = 0
        success = False
        
        while retry_count < max_retries and not success:
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                if response.status_code in [200, 201, 207]:  # 207 is partial success
                    result = response.json() if response.text else {"status": "success"}
                    if response.status_code == 207:
                        # Partial success - show details
                        count = result.get("count", len(batch))
                        errors = result.get("errors", 0)
                        results.append(f"Batch {i//batch_size + 1}: {count}/{len(batch)} locations posted ({(errors)} errors)")
                    else:
                        results.append(f"Batch {i//batch_size + 1}: {len(batch)} locations posted")
                    success = True
                else:
                    error_detail = response.text[:200] if response.text else "No error details"
                    if retry_count < max_retries - 1:
                        retry_count += 1
                        results.append(f"Batch {i//batch_size + 1}: Error {response.status_code} - Retrying ({retry_count}/{max_retries})...")
                        time.sleep(1)  # Wait before retry
                    else:
                        results.append(f"Batch {i//batch_size + 1}: Error {response.status_code} - {error_detail}")
                        success = True  # Stop retrying
            except requests.exceptions.Timeout:
                if retry_count < max_retries - 1:
                    retry_count += 1
                    results.append(f"Batch {i//batch_size + 1}: Timeout - Retrying ({retry_count}/{max_retries})...")
                    time.sleep(2)
                else:
                    results.append(f"Batch {i//batch_size + 1}: Timeout after {max_retries} retries")
                    success = True
            except Exception as e:
                results.append(f"Batch {i//batch_size + 1}: Exception - {str(e)}")
                success = True  # Don't retry on exceptions
        
        # Small delay between batches to avoid overwhelming the API
        if i + batch_size < len(locations):
            time.sleep(0.5)
    
    return results

# Example usage
if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Generate mock location data for testing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_mock_locations.py                          # Use today's date
  python generate_mock_locations.py --date 2025-11-03        # Specify date (YYYY-MM-DD)
  python generate_mock_locations.py -d 2025-11-03           # Short form
        """
    )
    parser.add_argument(
        "-d", "--date",
        type=str,
        help="Date to generate data for (YYYY-MM-DD format). Defaults to today.",
        default=None
    )
    parser.add_argument(
        "--device-id",
        type=str,
        help=f"Device ID to use (default: {DEVICE_ID})",
        default=DEVICE_ID
    )
    parser.add_argument(
        "--no-post",
        action="store_true",
        help="Generate data but don't post to API (only save to JSON files)"
    )
    
    args = parser.parse_args()
    
    # Parse date
    if args.date:
        try:
            selected_date = datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print(f"❌ Error: Invalid date format '{args.date}'. Please use YYYY-MM-DD format.")
            exit(1)
    else:
        selected_date = datetime.now()
    
    device_id = args.device_id
    
    print(f"📅 Generating data for date: {selected_date.strftime('%Y-%m-%d')}")
    print(f"📱 Device ID: {device_id}\n")
    
    # Jogging example - University of Malaya area
    print("Generating jogging path...")
    jog_start = selected_date.replace(hour=7, minute=0, second=0, microsecond=0)  # 7 AM jog
    jog_locations = generate_jogging_path(
        start_lat=3.1199,
        start_lng=101.6544,
        start_time=jog_start,
        duration_minutes=30,
        interval_seconds=60  # Every 1 minute for more detail
    )
    print(f"Generated {len(jog_locations)} jogging locations")
    
    # Post jogging data
    if not args.no_post:
        print("Posting jogging data...")
        jog_results = post_locations(device_id, jog_locations)
        for msg in jog_results:
            print(f"  {msg}")
    else:
        print("Skipping jogging data post (--no-post flag)")
    
    # Senior citizen example - Home location
    print("\nGenerating senior citizen path...")
    senior_start = selected_date.replace(hour=6, minute=0, second=0, microsecond=0)  # 6 AM start
    senior_locations = generate_senior_citizen_path(
        home_lat=3.1199,
        home_lng=101.6544,
        start_time=senior_start,
        duration_hours=12,  # 6 AM to 6 PM
        interval_seconds=120
    )
    print(f"Generated {len(senior_locations)} senior citizen locations")
    
    # Post senior citizen data
    if not args.no_post:
        print("Posting senior citizen data...")
        senior_results = post_locations(device_id, senior_locations)
        for msg in senior_results:
            print(f"  {msg}")
    else:
        print("Skipping senior citizen data post (--no-post flag)")
    
    # Save to JSON file for manual review
    date_str = selected_date.strftime("%Y%m%d")
    jog_file = f"mock_jogging_{date_str}.json"
    senior_file = f"mock_senior_{date_str}.json"
    
    with open(jog_file, "w") as f:
        json.dump({"deviceId": device_id, "locations": jog_locations}, f, indent=2)
    print(f"\n💾 Saved jogging data to {jog_file}")
    
    with open(senior_file, "w") as f:
        json.dump({"deviceId": device_id, "locations": senior_locations}, f, indent=2)
    print(f"💾 Saved senior citizen data to {senior_file}")
    
    if not args.no_post:
        print("\n✅ All data posted successfully!")
    else:
        print("\n✅ All data generated successfully! (Use --no-post to skip API posting)")
