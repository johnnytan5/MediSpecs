'use client';

import { useState } from 'react';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Heart, 
  FileText, 
  Download,
  Edit,
  Camera
} from 'lucide-react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { id: 'personal', name: 'Personal', icon: User },
    { id: 'medical', name: 'Medical', icon: Heart },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const medicalHistory = [
    { id: 1, condition: 'Hypertension', status: 'Active', date: '2023-01-15' },
    { id: 2, condition: 'Diabetes Type 2', status: 'Managed', date: '2022-08-20' },
    { id: 3, condition: 'Allergic Rhinitis', status: 'Seasonal', date: '2023-03-10' },
  ];

  const medications = [
    { id: 1, name: 'Lisinopril', dosage: '10mg', frequency: 'Daily', nextRefill: '2024-02-15' },
    { id: 2, name: 'Metformin', dosage: '500mg', frequency: 'Twice Daily', nextRefill: '2024-02-20' },
    { id: 3, name: 'Loratadine', dosage: '10mg', frequency: 'As Needed', nextRefill: '2024-03-01' },
  ];

  const documents = [
    { id: 1, name: 'Insurance Card', type: 'Insurance', date: '2024-01-15' },
    { id: 2, name: 'Lab Results - Blood Work', type: 'Lab Results', date: '2024-01-10' },
    { id: 3, name: 'Prescription - Dr. Smith', type: 'Prescription', date: '2024-01-08' },
  ];

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      {/* Profile Photo */}
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center relative">
          <User className="w-12 h-12 text-blue-600" />
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">John Doe</h2>
        <p className="text-sm text-gray-500">john.doe@email.com</p>
      </div>

      {/* Personal Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Date of Birth</span>
            <span className="font-medium">January 15, 1985</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone</span>
            <span className="font-medium">(555) 123-4567</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Address</span>
            <span className="font-medium">123 Main St, City, State</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Emergency Contact</span>
            <span className="font-medium">Jane Doe (555) 987-6543</span>
          </div>
        </div>
        <button className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
          <Edit className="w-4 h-4" />
          <span>Edit Information</span>
        </button>
      </div>
    </div>
  );

  const renderMedicalInfo = () => (
    <div className="space-y-6">
      {/* Medical History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Medical History</h3>
        <div className="space-y-3">
          {medicalHistory.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{item.condition}</h4>
                <p className="text-sm text-gray-500">Diagnosed: {item.date}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.status === 'Active' ? 'bg-red-100 text-red-800' :
                item.status === 'Managed' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Medications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Current Medications</h3>
        <div className="space-y-3">
          {medications.map(med => (
            <div key={med.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{med.name}</h4>
                <span className="text-sm text-gray-500">{med.dosage}</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{med.frequency}</p>
              <p className="text-xs text-gray-500">Next refill: {med.nextRefill}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Medical Documents</h3>
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
                  <p className="text-sm text-gray-500">{doc.type} • {doc.date}</p>
                </div>
              </div>
              <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">Push Notifications</span>
            </div>
            <button className="w-12 h-6 bg-blue-600 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="text-gray-900">Privacy Mode</span>
            </div>
            <button className="w-12 h-6 bg-gray-300 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
        <div className="space-y-3">
          <button className="w-full text-left py-2 text-gray-700 hover:text-gray-900 transition-colors">
            Change Password
          </button>
          <button className="w-full text-left py-2 text-gray-700 hover:text-gray-900 transition-colors">
            Export Data
          </button>
          <button className="w-full text-left py-2 text-red-600 hover:text-red-700 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">Manage your medical information</p>
        </div>
      </div>

      <div className="p-4">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'personal' && renderPersonalInfo()}
        {activeTab === 'medical' && renderMedicalInfo()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
}
