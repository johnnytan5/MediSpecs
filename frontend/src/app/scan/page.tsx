'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, RotateCcw } from 'lucide-react';

export default function ScanPage() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTakePicture = () => {
    setIsCapturing(true);
    // Simulate taking a picture
    setTimeout(() => {
      setCapturedImage('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=');
      setIsCapturing(false);
    }, 1000);
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Camera View */}
      <div className="relative h-screen bg-gray-900">
        {/* Camera Preview */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          {!capturedImage ? (
            <div className="text-center text-white">
              <div className="w-32 h-32 border-4 border-white border-dashed rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-16 h-16 text-white opacity-50" />
              </div>
              <p className="text-lg font-medium mb-2">Point camera at food</p>
              <p className="text-sm text-gray-300">Tap to capture or upload from gallery</p>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured food"
                className="w-full h-full object-cover"
              />
              {/* Overlay for captured image */}
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        <div className="absolute bottom-8 left-0 right-0 px-6">
          <div className="flex items-center justify-center space-x-8">
            {/* Upload Button */}
            <button
              onClick={handleUpload}
              className="w-14 h-14 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-opacity-30 transition-all"
            >
              <Upload className="w-6 h-6" />
            </button>

            {/* Capture Button */}
            <button
              onClick={capturedImage ? handleRetake : handleTakePicture}
              disabled={isCapturing}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                capturedImage 
                  ? 'bg-white text-black hover:bg-gray-200' 
                  : 'bg-white text-black hover:bg-gray-200'
              } ${isCapturing ? 'opacity-50' : ''}`}
            >
              {isCapturing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              ) : capturedImage ? (
                <RotateCcw className="w-8 h-8" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </button>

            {/* Retake/Close Button */}
            {capturedImage && (
              <button
                onClick={handleRetake}
                className="w-14 h-14 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-opacity-30 transition-all"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
