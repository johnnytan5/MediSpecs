'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  User, 
  Mic,
  Images,
  Phone,
  Camera,
  Upload,
  Trash2,
  Plus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';

type ProfileForm = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  deviceId: string;
  notes: string;
};

type VoiceRecording = {
  id: string;
  label: string;
  filename: string;
  size: number;
  addedAt: string;
};

type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  photoUrl?: string | null;
  photoS3Key?: string;
  rekognitionFaceId?: string;
  addedAt?: string;
  isLocal?: boolean;
};

type ApiFamilyMember = {
  familyMemberId: string;
  name: string;
  relationship: string;
  photoS3Key?: string;
  photoUrl?: string;
  rekognitionFaceId?: string;
  createdAt?: string;
};


type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notes?: string;
};

const DEMO_PROFILE: ProfileForm = {
  fullName: 'Mary Tan',
  email: 'mary.tan@example.com',
  dateOfBirth: '1949-11-12',
  phone: '+65 9123 4567',
  address: 'Block 123, Clementi Ave 3, #08-05, Singapore',
  deviceId: 'd_123',
  notes: 'Prefers morning walks. Mild hearing loss on left ear.',
};

const INITIAL_VOICE_RECORDINGS: VoiceRecording[] = [
  {
    id: 'voice-1',
    label: 'Good morning reminder',
    filename: 'good-morning.mp3',
    size: 256000,
    addedAt: '2025-10-28T08:00:00Z',
  },
  {
    id: 'voice-2',
    label: 'Medication reminder',
    filename: 'medication-9am.mp3',
    size: 312000,
    addedAt: '2025-10-26T09:30:00Z',
  },
];

const INITIAL_CONTACTS: EmergencyContact[] = [
  {
    id: 'contact-1',
    name: 'Jonathan Tan',
    phone: '+65 9876 5432',
    relationship: 'Primary caregiver',
    notes: 'Lives 10 minutes away. Keyholder.',
  },
  {
    id: 'contact-2',
    name: 'Emily Tan',
    phone: '+65 9001 2345',
    relationship: 'Secondary caregiver',
    notes: 'Check-in every evening.',
  },
];

export default function ProfilePage() {
  const { token } = useAuth();
  const API_USER_ID = 'u_123';

  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'family' | 'contacts'>('profile');

  const [profileForm, setProfileForm] = useState<ProfileForm>(DEMO_PROFILE);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);

  const [voiceLabel, setVoiceLabel] = useState('');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceRecordings, setVoiceRecordings] = useState<VoiceRecording[]>(INITIAL_VOICE_RECORDINGS);
  const voiceInputRef = useRef<HTMLInputElement | null>(null);

  const [familyName, setFamilyName] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('');
  const [familyFile, setFamilyFile] = useState<File | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [isSubmittingFamily, setIsSubmittingFamily] = useState(false);
  const [deletingFamilyId, setDeletingFamilyId] = useState<string | null>(null);
  const familyInputRef = useRef<HTMLInputElement | null>(null);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(INITIAL_CONTACTS);

  useEffect(() => {
    return () => {
      familyMembers.forEach(member => {
        if (member.isLocal && member.photoUrl) {
          URL.revokeObjectURL(member.photoUrl);
        }
      });
    };
  }, [familyMembers]);

  const tabs = useMemo(() => ([
    { id: 'profile', name: 'Senior Profile', icon: User },
    { id: 'voice', name: 'Voice Library', icon: Mic },
    { id: 'family', name: 'Family Album', icon: Images },
    { id: 'contacts', name: 'Emergency Contacts', icon: Phone },
  ]), []);

  const mapApiFamilyMember = (api: ApiFamilyMember): FamilyMember => ({
    id: api.familyMemberId,
    name: api.name,
    relationship: api.relationship,
    photoUrl: api.photoUrl || '',
    photoS3Key: api.photoS3Key,
    rekognitionFaceId: api.rekognitionFaceId,
    addedAt: api.createdAt,
    isLocal: false,
  });

  useEffect(() => {
    if (!token) return;

    async function loadFamily() {
      try {
        setFamilyLoading(true);
        setFamilyError(null);
        const data = await fetchJson<ApiFamilyMember[]>(`/family?userId=${API_USER_ID}`, { method: 'GET' }, token || undefined);
        const mapped = (Array.isArray(data) ? data : []).map(mapApiFamilyMember);
        setFamilyMembers(mapped);
      } catch (e) {
        setFamilyError(e instanceof Error ? e.message : 'Failed to load family members');
      } finally {
        setFamilyLoading(false);
      }
    }

    loadFamily();
  }, [token]);

  const handleProfileChange = (field: keyof ProfileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileSavedAt(null);
  };

  const handleProfileSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSavedAt(new Date().toISOString());
  };

  const handleAddVoiceRecording = (event: React.FormEvent) => {
    event.preventDefault();
    if (!voiceLabel.trim() || !voiceFile) return;

    const newRecording: VoiceRecording = {
      id: `voice-${Date.now()}`,
      label: voiceLabel.trim(),
      filename: voiceFile.name,
      size: voiceFile.size,
      addedAt: new Date().toISOString(),
    };

    setVoiceRecordings(prev => [newRecording, ...prev]);
    setVoiceLabel('');
    setVoiceFile(null);
    if (voiceInputRef.current) {
      voiceInputRef.current.value = '';
    }
  };

  const handleRemoveVoiceRecording = (id: string) => {
    setVoiceRecordings(prev => prev.filter(item => item.id !== id));
  };

  const handleAddFamilyMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!familyName.trim() || !familyRelationship.trim() || !familyFile) return;
    if (!token) {
      setFamilyError('You must be logged in to upload photos.');
      return;
    }

    setIsSubmittingFamily(true);
    setFamilyError(null);

    try {
      const file = familyFile;
      const contentType = file.type || 'image/jpeg';

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const created = await fetchJson<ApiFamilyMember>(
        '/family',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: API_USER_ID,
            name: familyName.trim(),
            relationship: familyRelationship.trim(),
            imageBase64: base64,
            contentType,
          }),
        },
        token || undefined
      );

      console.log('Created family member response:', created);
      const mapped = mapApiFamilyMember(created);
      console.log('Mapped family member:', mapped);
      setFamilyMembers(prev => [mapped, ...prev]);
      setFamilyName('');
      setFamilyRelationship('');
      setFamilyFile(null);
      if (familyInputRef.current) {
        familyInputRef.current.value = '';
      }
    } catch (e) {
      setFamilyError(e instanceof Error ? e.message : 'Failed to add family member');
    } finally {
      setIsSubmittingFamily(false);
    }
  };

  const handleRemoveFamilyMember = async (id: string) => {
    if (!token) {
      setFamilyError('You must be logged in to delete photos.');
      return;
    }

    setDeletingFamilyId(id);
    setFamilyError(null);

    try {
      await fetchJson(`/family/${id}?userId=${API_USER_ID}`, { method: 'DELETE' }, token || undefined);
      setFamilyMembers(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      setFamilyError(e instanceof Error ? e.message : 'Failed to delete family member');
    } finally {
      setDeletingFamilyId(null);
    }
  };

  const handleAddContact = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || !contactRelationship.trim()) return;

    const newContact: EmergencyContact = {
      id: `contact-${Date.now()}`,
      name: contactName.trim(),
      phone: contactPhone.trim(),
      relationship: contactRelationship.trim(),
      notes: contactNotes.trim() || undefined,
    };

    setEmergencyContacts(prev => [newContact, ...prev]);
    setContactName('');
    setContactPhone('');
    setContactRelationship('');
    setContactNotes('');
  };

  const handleRemoveContact = (id: string) => {
    setEmergencyContacts(prev => prev.filter(item => item.id !== id));
  };

  const profileSavedMessage = profileSavedAt
    ? `Last saved ${new Date(profileSavedAt).toLocaleString()}`
    : null;

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-semibold shadow-lg shadow-purple-500/30">
                {profileForm.fullName.charAt(0)}
              </div>
              <button
                type="button"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-110 transition-transform"
                title="Upload photo"
              >
                <Camera size={16} />
          </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{profileForm.fullName}</h2>
              <p className="text-sm text-purple-200">Smart glasses ID: {profileForm.deviceId}</p>
            </div>
          </div>
          {profileSavedMessage && (
            <span className="text-sm text-white bg-gradient-to-r from-green-500/30 to-emerald-500/20 border border-green-400/30 backdrop-blur-xl rounded-full px-3 py-1 shadow-lg shadow-green-500/20">
              {profileSavedMessage}
            </span>
          )}
        </div>

        <form onSubmit={handleProfileSubmit} className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Full name</label>
            <input
              type="text"
              value={profileForm.fullName}
              onChange={(e) => handleProfileChange('fullName', e.target.value)}
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
            />
      </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Date of birth</label>
            <input
              type="date"
              value={profileForm.dateOfBirth}
              onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)}
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Phone number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-white">Address</label>
            <input
              type="text"
              value={profileForm.address}
              onChange={(e) => handleProfileChange('address', e.target.value)}
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-white">Care notes</label>
            <textarea
              rows={3}
              value={profileForm.notes}
              onChange={(e) => handleProfileChange('notes', e.target.value)}
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
            />
        </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/30"
            >
              <Plus size={16} />
              Save profile
        </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderVoiceTab = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Upload voice clip</h2>
        <form onSubmit={handleAddVoiceRecording} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Label</label>
              <input
                type="text"
                value={voiceLabel}
                onChange={(e) => setVoiceLabel(e.target.value)}
                placeholder="e.g. Drink water reminder"
                className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
                required
              />
            </div>
              <div>
              <label className="block text-sm font-medium text-white mb-1">Choose audio file</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2.5 border border-dashed border-purple-400/30 rounded-xl cursor-pointer text-white hover:border-cyan-400 hover:text-cyan-300 hover:bg-white/10 transition-all duration-300">
                  <Upload size={18} />
                  <span>{voiceFile ? voiceFile.name : 'Select file (.mp3, .wav)'}</span>
                  <input
                    ref={voiceInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setVoiceFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
        </div>
          <button
            type="submit"
            className="md:self-end inline-flex items-center justify-center h-12 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={!voiceLabel.trim() || !voiceFile}
          >
            Add recording
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-white text-xl">Your voice clips</h3>
        </div>
        {voiceRecordings.length === 0 ? (
          <div className="p-6 text-center text-purple-200">
            <p>No voice recordings yet. Upload one to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-purple-400/20">
            {voiceRecordings.map(item => (
              <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{item.label}</p>
                  <p className="text-sm text-purple-200 truncate">{item.filename}</p>
                  <p className="text-xs text-purple-300 mt-1">
                    Uploaded {new Date(item.addedAt).toLocaleString()} • {(item.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveVoiceRecording(item.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-400/30 bg-red-500/10 backdrop-blur-xl text-white hover:bg-red-500/20 hover:border-red-400 hover:scale-105 transition-all duration-300"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderFamilyTab = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Add family member</h2>
        <form onSubmit={handleAddFamilyMember} className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 space-y-2">
            <label className="block text-sm font-medium text-white">Family member</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. Jonathan Tan"
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
              required
            />
          </div>
          <div className="md:col-span-1 space-y-2">
            <label className="block text-sm font-medium text-white">Relationship</label>
            <input
              type="text"
              value={familyRelationship}
              onChange={(e) => setFamilyRelationship(e.target.value)}
              placeholder="e.g. Son"
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
              required
            />
          </div>
          <div className="md:col-span-1 space-y-2">
            <label className="block text-sm font-medium text-white">Photo</label>
            <label className="inline-flex items-center gap-2 h-full px-3 py-2.5 border border-dashed border-purple-400/30 rounded-xl cursor-pointer text-white hover:border-cyan-400 hover:text-cyan-300 hover:bg-white/10 transition-all duration-300">
              <Upload size={18} />
              <span className="truncate">{familyFile ? familyFile.name : 'Select image'}</span>
              <input
                ref={familyInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFamilyFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={isSubmittingFamily || !familyName.trim() || !familyRelationship.trim() || !familyFile}
            >
              <Plus size={16} />
              {isSubmittingFamily ? 'Uploading…' : 'Add to album'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-white text-xl">Family album</h3>
        </div>
        {familyError && (
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-red-400/30 bg-gradient-to-br from-red-500/20 to-rose-500/10 backdrop-blur-xl text-white text-sm px-3 py-2 shadow-lg shadow-red-500/20">
              {familyError}
            </div>
          </div>
        )}
        {familyLoading ? (
          <div className="p-6 text-center text-purple-200">
            <p>Loading family photos…</p>
          </div>
        ) : familyMembers.length === 0 ? (
          <div className="p-6 text-center text-purple-200">
            <p>No photos yet. Upload your first family member to fill this space.</p>
          </div>
        ) : (
          <div className="p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {familyMembers.map(member => (
              <div key={member.id} className="border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-xl shadow-cyan-500/20 hover:scale-[1.02] transition-all duration-300">
                <div className="aspect-square bg-gradient-to-br from-purple-900/50 to-indigo-900/50 relative overflow-hidden">
                  {member.photoUrl && member.photoUrl.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={member.photoUrl} 
                      alt={member.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Failed to load image:', member.photoUrl);
                        // Replace with placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-full h-full flex items-center justify-center text-purple-300 text-sm bg-gradient-to-br from-purple-900/50 to-indigo-900/50';
                        placeholder.textContent = 'No photo';
                        target.parentElement?.appendChild(placeholder);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-300 text-sm">
                      No photo
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-white">{member.name}</p>
                  <p className="text-sm text-cyan-200">{member.relationship}</p>
                  {member.addedAt && (
                    <p className="text-xs text-purple-300 mt-1">Added {new Date(member.addedAt).toLocaleDateString()}</p>
                  )}
                  <button
                    onClick={() => handleRemoveFamilyMember(member.id)}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-white hover:text-red-300 disabled:text-purple-400 disabled:opacity-50 transition-colors"
                    disabled={deletingFamilyId === member.id}
                  >
                    <Trash2 size={14} />
                    {deletingFamilyId === member.id ? 'Removing…' : 'Remove'}
                  </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );

  const renderContactsTab = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Add emergency contact</h2>
        <form onSubmit={handleAddContact} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jonathan Tan"
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Phone number</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="e.g. +65 9123 4567"
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
              required
            />
            </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Relationship</label>
            <input
              type="text"
              value={contactRelationship}
              onChange={(e) => setContactRelationship(e.target.value)}
              placeholder="e.g. Primary caregiver"
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Notes (optional)</label>
            <textarea
              rows={2}
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="e.g. Holds house keys, available after 6pm"
              className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
            />
            </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={!contactName.trim() || !contactPhone.trim() || !contactRelationship.trim()}
            >
              <Plus size={16} />
              Add contact
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-white text-xl">Emergency list</h3>
        </div>
        {emergencyContacts.length === 0 ? (
          <div className="p-6 text-center text-purple-200">
            <p>No contacts yet. Add a caregiver so we can reach them quickly.</p>
          </div>
        ) : (
          <ul className="divide-y divide-purple-400/20">
            {emergencyContacts.map(contact => (
              <li key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{contact.name}</p>
                  <p className="text-sm text-purple-200">{contact.phone} • {contact.relationship}</p>
                  {contact.notes && <p className="text-xs text-purple-300 mt-1">{contact.notes}</p>}
                </div>
                <button
                  onClick={() => handleRemoveContact(contact.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-400/30 bg-red-500/10 backdrop-blur-xl text-white hover:bg-red-500/20 hover:border-red-400 hover:scale-105 transition-all duration-300"
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-10">
      <div className="relative z-10 pt-4 pb-6 px-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white text-center">Profile</h1>
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-xl mb-6">
          <div className="grid grid-cols-2 sm:flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-300 border-b ${
                    isActive
                      ? 'text-cyan-400 border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/20'
                      : 'text-white border-transparent hover:text-cyan-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'voice' && renderVoiceTab()}
        {activeTab === 'family' && renderFamilyTab()}
        {activeTab === 'contacts' && renderContactsTab()}
      </div>
    </div>
  );
}
