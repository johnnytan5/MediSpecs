'use client';

import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Meow! I'm Dr. Whiskers, your friendly medical cat assistant. How can I help you with your health today? 🐱",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: inputText,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setInputText('');

      // Simulate bot response
      setTimeout(() => {
        const botResponse: Message = {
          id: messages.length + 2,
          text: "Purr... I understand you're asking about: " + inputText + ". Let me help you with that! 🐾",
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">MediSpecs Assistant</h1>
              <p className="text-sm text-gray-500">Your smart medical companion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cat Character Section */}
      <div className="bg-gradient-to-br from-orange-100 to-pink-100 border-b border-orange-200 p-6">
        <div className="text-center">
          {/* Cat Character */}
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full mx-auto flex items-center justify-center relative">
              {/* Cat ears */}
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-orange-500 rounded-full transform rotate-12"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full transform -rotate-12"></div>
              {/* Cat face */}
              <div className="w-16 h-16 bg-orange-300 rounded-full flex items-center justify-center">
                {/* Eyes */}
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-black rounded-full"></div>
                  <div className="w-3 h-3 bg-black rounded-full"></div>
                </div>
                {/* Nose */}
                <div className="absolute bottom-4 w-2 h-2 bg-pink-400 rounded-full"></div>
              </div>
            </div>
            {/* Cat tail */}
            <div className="absolute top-8 -right-4 w-8 h-2 bg-orange-500 rounded-full transform rotate-12"></div>
          </div>
          
          <h2 className="text-xl font-bold text-orange-800 mb-2">Dr. Whiskers</h2>
          <p className="text-sm text-orange-700 mb-3">Your friendly medical cat assistant</p>
          
          {/* Cat status */}
          <div className="inline-flex items-center space-x-2 bg-white bg-opacity-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-orange-800">Online & Ready to Help</span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.sender === 'bot' && (
                  <div className="w-4 h-4 mt-1 flex-shrink-0">
                    <div className="w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                    </div>
                  </div>
                )}
                {message.sender === 'user' && (
                  <User className="w-4 h-4 mt-1 text-white flex-shrink-0" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Dr. Whiskers anything about your health..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}