#!/usr/bin/env python3
"""
Script to upload location data from CSV to API Gateway.

CSV Format (with header):
timestamp,lat,lng,accuracy,speed

Example:
2024-01-15T08:00:00Z,3.1199,101.6544,10.5,0.0
2024-01-15T08:01:00Z,3.1200,101.6545,12.0,1.2

Usage:
    python upload_locations_from_csv.py --csv locations.csv --device-id d_123 --api-url https://your-api.execute-api.region.amazonaws.com/staging
"""

import csv
import json
import argparse
import requests
from typing import List, Dict, Optional

def parse_csv(csv_path: str) -> List[Dict]:
    """Parse CSV file and return list of location dictionaries."""
    locations = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Skip empty rows
            if not row.get('lat') or not row.get('lng'):
                continue
            
            location = {
                'lat': float(row['lat']),
                'lng': float(row['lng']),
            }
            
            # Timestamp (required)
            if 'timestamp' in row and row['timestamp']:
                location['timestamp'] = row['timestamp']
            else:
                # If no timestamp, use current time
                from datetime import datetime
                location['timestamp'] = datetime.utcnow().isoformat() + 'Z'
            
            # Optional fields
            if 'accuracy' in row and row['accuracy']:
                try:
                    location['accuracy'] = float(row['accuracy'])
                except ValueError:
                    pass
            
            if 'speed' in row and row['speed']:
                try:
                    location['speed'] = float(row['speed'])
                except ValueError:
                    pass
            
            locations.append(location)
    
    return locations

def upload_locations(api_url: str, device_id: str, locations: List[Dict], batch_size: int = 100):
    """
    Upload locations to API Gateway in batches.
    
    API expects:
    POST /locations
    {
        "deviceId": "d_123",
        "locations": [
            {"lat": 3.1199, "lng": 101.6544, "timestamp": "2024-01-15T08:00:00Z", "accuracy": 10.5}
        ]
    }
    """
    total = len(locations)
    uploaded = 0
    errors = []
    
    # Process in batches (API limit is 100 per request)
    for i in range(0, total, batch_size):
        batch = locations[i:i + batch_size]
        
        payload = {
            'deviceId': device_id,
            'locations': batch
        }
        
        try:
            response = requests.post(
                f"{api_url}/locations",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code in [201, 207]:  # 201 = success, 207 = partial success
                result = response.json()
                count = result.get('count', len(batch))
                uploaded += count
                print(f"✅ Batch {i//batch_size + 1}: Uploaded {count}/{len(batch)} locations")
                
                if response.status_code == 207:
                    print(f"   ⚠️  Partial success: {result.get('errors', 0)} errors")
                    if 'error_details' in result:
                        for err in result['error_details'][:3]:
                            print(f"      - {err}")
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                errors.append(error_msg)
                print(f"❌ Batch {i//batch_size + 1} failed: {error_msg}")
        
        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            errors.append(error_msg)
            print(f"❌ Batch {i//batch_size + 1} failed: {error_msg}")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 Upload Summary:")
    print(f"   Total locations: {total}")
    print(f"   Successfully uploaded: {uploaded}")
    print(f"   Failed: {total - uploaded}")
    if errors:
        print(f"\n⚠️  Errors encountered:")
        for err in errors[:5]:
            print(f"   - {err}")
        if len(errors) > 5:
            print(f"   ... and {len(errors) - 5} more errors")
    print(f"{'='*60}")

def main():
    parser = argparse.ArgumentParser(
        description='Upload location data from CSV to API Gateway'
    )
    parser.add_argument(
        '--csv',
        required=True,
        help='Path to CSV file'
    )
    parser.add_argument(
        '--device-id',
        required=True,
        help='Device ID (e.g., d_123)'
    )
    parser.add_argument(
        '--api-url',
        required=True,
        help='API Gateway base URL (e.g., https://xxx.execute-api.region.amazonaws.com/staging)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Number of locations per batch (default: 100, max: 100)'
    )
    
    args = parser.parse_args()
    
    # Validate batch size
    if args.batch_size > 100:
        print("⚠️  Warning: API limit is 100 locations per batch. Using 100.")
        args.batch_size = 100
    
    # Parse CSV
    print(f"📖 Reading CSV: {args.csv}")
    try:
        locations = parse_csv(args.csv)
        print(f"✅ Parsed {len(locations)} locations from CSV")
    except Exception as e:
        print(f"❌ Failed to parse CSV: {e}")
        return 1
    
    if len(locations) == 0:
        print("❌ No valid locations found in CSV")
        return 1
    
    # Upload to API
    print(f"\n📤 Uploading to API: {args.api_url}")
    upload_locations(args.api_url, args.device_id, locations, args.batch_size)
    
    return 0

if __name__ == '__main__':
    exit(main())


