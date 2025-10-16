'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Utensils, Zap } from 'lucide-react';

interface FoodRecord {
  id: number;
  name: string;
  time: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const foodRecords: FoodRecord[] = [
    {
      id: 1,
      name: 'Grilled Chicken Breast',
      time: '12:30 PM',
      calories: 165,
      type: 'lunch'
    },
    {
      id: 2,
      name: 'Greek Yogurt with Berries',
      time: '8:00 AM',
      calories: 120,
      type: 'breakfast'
    },
    {
      id: 3,
      name: 'Mixed Green Salad',
      time: '7:00 PM',
      calories: 85,
      type: 'dinner'
    },
    {
      id: 4,
      name: 'Apple',
      time: '3:00 PM',
      calories: 95,
      type: 'snack'
    }
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getFoodRecordsForDate = (date: Date) => {
    // In a real app, this would filter food records by date
    return foodRecords;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'bg-orange-100 text-orange-800';
      case 'lunch':
        return 'bg-blue-100 text-blue-800';
      case 'dinner':
        return 'bg-purple-100 text-purple-800';
      case 'snack':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalCalories = () => {
    return foodRecords.reduce((total, record) => total + record.calories, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Food Calendar</h1>
          <p className="text-sm text-gray-500">Track your daily food intake and nutrition</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Daily Summary */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Today's Nutrition</h2>
            <div className="flex items-center space-x-2 text-orange-600">
              <Zap className="w-5 h-5" />
              <span className="text-2xl font-bold">{getTotalCalories()}</span>
              <span className="text-sm">calories</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-white rounded-lg p-2">
              <div className="text-lg font-bold text-orange-600">2</div>
              <div className="text-xs text-gray-600">Meals</div>
            </div>
            <div className="bg-white rounded-lg p-2">
              <div className="text-lg font-bold text-blue-600">1</div>
              <div className="text-xs text-gray-600">Snacks</div>
            </div>
            <div className="bg-white rounded-lg p-2">
              <div className="text-lg font-bold text-green-600">3</div>
              <div className="text-xs text-gray-600">Items</div>
            </div>
            <div className="bg-white rounded-lg p-2">
              <div className="text-lg font-bold text-purple-600">85%</div>
              <div className="text-xs text-gray-600">Goal</div>
            </div>
          </div>
        </div>

        {/* Calendar Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            {getDaysInMonth(currentDate).map((day, index) => (
              <button
                key={index}
                onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                className={`p-2 text-center text-sm rounded-lg transition-colors ${
                  day === selectedDate.getDate() && 
                  currentDate.getMonth() === selectedDate.getMonth() &&
                  currentDate.getFullYear() === selectedDate.getFullYear()
                    ? 'bg-orange-600 text-white'
                    : day
                    ? 'hover:bg-gray-100 text-gray-900'
                    : 'text-gray-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Today's Food Records */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Food</h3>
            <button className="flex items-center space-x-2 text-orange-600 hover:text-orange-700">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Food</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {foodRecords.map(record => (
              <div key={record.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                  {record.type}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{record.name}</h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{record.time}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-orange-600">
                      <Utensils className="w-4 h-4" />
                      <span className="font-medium">{record.calories} cal</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="text-center">
                <Utensils className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Scan Food</span>
              </div>
            </button>
            <button className="p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
              <div className="text-center">
                <Plus className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Add Meal</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
