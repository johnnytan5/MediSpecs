'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  User, 
  Pill,
  Images,
  Phone,
  Camera,
  Upload,
  Trash2,
  Plus,
  Clock,
  Edit2
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

type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'as-needed';

type Medication = {
  id: string;
  name: string;
  photoUrl?: string | null;
  photoS3Key?: string;
  time: string; // HH:MM format
  frequency: FrequencyType;
  frequencyDetails?: number[]; // For weekly: [0,1,2] = Sun, Mon, Tue
  notes?: string;
  addedAt: string;
  isLocal?: boolean;
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

const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Aspirin 100mg',
    time: '09:00',
    frequency: 'daily',
    notes: 'Take with food',
    addedAt: '2025-11-01T08:00:00Z',
  },
  {
    id: 'med-2',
    name: 'Metformin 500mg',
    time: '20:00',
    frequency: 'weekly',
    frequencyDetails: [1, 3, 5], // Mon, Wed, Fri
    notes: 'Take after dinner',
    addedAt: '2025-10-28T09:30:00Z',
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

  const [activeTab, setActiveTab] = useState<'profile' | 'medications' | 'family' | 'contacts'>('profile');

  const [profileForm, setProfileForm] = useState<ProfileForm>(DEMO_PROFILE);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);

  // Medication state
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('09:00');
  const [medFrequency, setMedFrequency] = useState<FrequencyType>('daily');
  const [medFrequencyDetails, setMedFrequencyDetails] = useState<number[]>([]);
  const [medNotes, setMedNotes] = useState('');
  const [medFile, setMedFile] = useState<File | null>(null);
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const medInputRef = useRef<HTMLInputElement | null>(null);

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
      // Cleanup medication photos
      medications.forEach(med => {
        if (med.isLocal && med.photoUrl) {
          URL.revokeObjectURL(med.photoUrl);
        }
      });
      // Cleanup family photos
      familyMembers.forEach(member => {
        if (member.isLocal && member.photoUrl) {
          URL.revokeObjectURL(member.photoUrl);
        }
      });
    };
  }, [medications, familyMembers]);

  const tabs = useMemo(() => ([
    { id: 'profile', name: 'Senior Profile', icon: User },
    { id: 'medications', name: 'Medications', icon: Pill },
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

  // Medication state
  const [medicationsLoading, setMedicationsLoading] = useState(true);
  const [medicationsError, setMedicationsError] = useState<string | null>(null);
  const [isSubmittingMed, setIsSubmittingMed] = useState(false);

  // Webhook sync helper
  const syncMedicationsToDevice = async () => {
    const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL || '';
    if (!streamBaseUrl) {
      console.log('Stream URL not configured, skipping device sync');
      return;
    }

    try {
      const response = await fetch(`${streamBaseUrl}/webhook/medications/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        console.log(`✅ Synced ${data.syncedCount || 0} medications to device`);
      } else {
        console.warn('Device sync failed:', data.message);
      }
    } catch {
      // Silent failure - device might be offline, will auto-sync in 2 hours
      console.log('Device sync skipped (device may be offline)');
    }
  };

  // Fetch medications from API
  useEffect(() => {
    if (!token || activeTab !== 'medications') return;
    
    async function fetchMedications() {
      try {
        setMedicationsLoading(true);
        setMedicationsError(null);
        
        interface ApiMedication {
          medicationId?: string;
          id?: string;
          name: string;
          photoUrl?: string;
          photoS3Key?: string;
          time: string;
          frequency: string;
          frequencyDetails?: number[];
          notes?: string;
          createdAt?: string;
          addedAt?: string;
        }

        const data = await fetchJson<ApiMedication[]>(
          `/medications?userId=${API_USER_ID}`,
          { method: 'GET' },
          token || undefined
        );
        
        // Map API response to frontend format
        const mapped = data.map((item): Medication => ({
          id: item.medicationId || item.id || `med-${Date.now()}`,
          name: item.name,
          photoUrl: item.photoUrl || undefined,
          photoS3Key: item.photoS3Key || undefined,
          time: item.time,
          frequency: item.frequency as FrequencyType,
          frequencyDetails: item.frequencyDetails || [],
          notes: item.notes || '',
          addedAt: item.createdAt || item.addedAt || new Date().toISOString(),
          isLocal: false,
        }));
        
        setMedications(mapped);
      } catch (e) {
        console.error('Failed to fetch medications:', e);
        setMedicationsError(e instanceof Error ? e.message : 'Failed to load medications');
      } finally {
        setMedicationsLoading(false);
      }
    }
    
    fetchMedications();
  }, [token, activeTab, API_USER_ID]);

  // Medication handlers
  const resetMedicationForm = () => {
    setMedName('');
    setMedTime('09:00');
    setMedFrequency('daily');
    setMedFrequencyDetails([]);
    setMedNotes('');
    setMedFile(null);
    setEditingMedId(null);
    if (medInputRef.current) {
      medInputRef.current.value = '';
    }
  };

  const toggleMedDay = (dayIndex: number) => {
    setMedFrequencyDetails(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleAddMedication = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!medName.trim() || !medTime) return;
    if (medFrequency === 'weekly' && medFrequencyDetails.length === 0) return;
    if (!token) {
      setMedicationsError('You must be logged in');
      return;
    }

    setIsSubmittingMed(true);
    setMedicationsError(null);

    try {
      // Convert image to base64 if provided
      let imageBase64: string | undefined;
      let contentType: string | undefined;
      
      if (medFile) {
        const base64Result = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(medFile);
        });
        imageBase64 = base64Result;
        contentType = medFile.type || 'image/jpeg';
      }

      interface MedicationPayload {
        userId: string;
        name: string;
        time: string;
        frequency: FrequencyType;
        frequencyDetails?: number[];
        notes?: string;
        imageBase64?: string;
        contentType?: string;
      }

      const payload: MedicationPayload = {
        userId: API_USER_ID,
        name: medName.trim(),
        time: medTime,
        frequency: medFrequency,
      };

      if (medFrequency === 'weekly') {
        payload.frequencyDetails = medFrequencyDetails;
      }
      if (medNotes.trim()) {
        payload.notes = medNotes.trim();
      }
      if (imageBase64) {
        payload.imageBase64 = imageBase64;
        payload.contentType = contentType;
      }

      interface ApiMedicationResponse {
        medicationId: string;
        name: string;
        photoUrl?: string;
        photoS3Key?: string;
        time: string;
        frequency: string;
        frequencyDetails?: number[];
        notes?: string;
        createdAt: string;
      }

      if (editingMedId) {
        // Update existing medication
        const updated = await fetchJson<ApiMedicationResponse>(
          `/medications/${editingMedId}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
          token || undefined
        );

        setMedications(prev => prev.map(med => 
          med.id === editingMedId 
            ? {
                id: updated.medicationId || editingMedId,
                name: updated.name,
                photoUrl: updated.photoUrl || undefined,
                photoS3Key: updated.photoS3Key || undefined,
                time: updated.time,
                frequency: updated.frequency as FrequencyType,
                frequencyDetails: updated.frequencyDetails || [],
                notes: updated.notes || '',
                addedAt: updated.createdAt || med.addedAt,
                isLocal: false,
              }
            : med
        ));
      } else {
        // Create new medication
        const created = await fetchJson<ApiMedicationResponse>(
          '/medications',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          token || undefined
        );

        const newMed: Medication = {
          id: created.medicationId,
          name: created.name,
          photoUrl: created.photoUrl || undefined,
          photoS3Key: created.photoS3Key || undefined,
          time: created.time,
          frequency: created.frequency as FrequencyType,
          frequencyDetails: created.frequencyDetails || [],
          notes: created.notes || '',
          addedAt: created.createdAt,
          isLocal: false,
        };

        setMedications(prev => [newMed, ...prev]);
      }

      // Trigger device sync (fire-and-forget, 500ms delay for DynamoDB consistency)
      setTimeout(() => {
        syncMedicationsToDevice();
      }, 500);

      resetMedicationForm();
    } catch (e) {
      console.error('Failed to save medication:', e);
      setMedicationsError(e instanceof Error ? e.message : 'Failed to save medication');
    } finally {
      setIsSubmittingMed(false);
    }
  };

  const handleEditMedication = (med: Medication) => {
    setMedName(med.name);
    setMedTime(med.time);
    setMedFrequency(med.frequency);
    setMedFrequencyDetails(med.frequencyDetails || []);
    setMedNotes(med.notes || '');
    setEditingMedId(med.id);
    setMedicationsError(null);
    // Note: We don't set medFile here as we can't reconstruct a File object from URL
    // User will need to re-upload if they want to change the photo
  };

  const handleRemoveMedication = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this medication?')) return;

    try {
      await fetchJson(
        `/medications/${id}?userId=${API_USER_ID}`,
        { method: 'DELETE' },
        token || undefined
      );

      setMedications(prev => prev.filter(item => item.id !== id));

      // Trigger device sync (fire-and-forget, 500ms delay for DynamoDB consistency)
      setTimeout(() => {
        syncMedicationsToDevice();
      }, 500);
    } catch (e) {
      console.error('Failed to delete medication:', e);
      setMedicationsError(e instanceof Error ? e.message : 'Failed to delete medication');
    }
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

  const renderMedicationsTab = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const getFrequencyText = (med: Medication) => {
      switch (med.frequency) {
        case 'daily':
          return 'Daily';
        case 'weekly':
          if (med.frequencyDetails && med.frequencyDetails.length > 0) {
            return `Weekly (${med.frequencyDetails.map(d => dayNames[d]).join(', ')})`;
          }
          return 'Weekly';
        case 'monthly':
          return 'Monthly';
        case 'as-needed':
          return 'As needed';
        default:
          return med.frequency;
      }
    };

    const formatTime = (time: string) => {
      try {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
      } catch {
        return time;
      }
    };

    return (
      <div className="space-y-6">
        {/* Error Message */}
        {medicationsError && (
          <div className="p-4 rounded-2xl bg-red-500/20 border border-red-400/30 text-red-200">
            <p className="text-sm font-medium">{medicationsError}</p>
          </div>
        )}

        {/* Add/Edit Medication Form */}
        <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingMedId ? 'Edit Medication' : 'Add Medication'}
          </h2>
          <form onSubmit={handleAddMedication} className="space-y-4">
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Medication Photo (Optional)</label>
              <label className="inline-flex items-center gap-2 px-3 py-2.5 border border-dashed border-purple-400/30 rounded-xl cursor-pointer text-white hover:border-cyan-400 hover:text-cyan-300 hover:bg-white/10 transition-all duration-300">
                <Camera size={18} />
                <span>{medFile ? medFile.name : 'Select image'}</span>
                <input
                  ref={medInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setMedFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {medFile && (
                <div className="mt-2">
                  <img 
                    src={URL.createObjectURL(medFile)} 
                    alt="Preview" 
                    className="w-24 h-24 object-cover rounded-xl border border-purple-400/30"
                  />
                </div>
              )}
            </div>

            {/* Medication Name & Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Medication Name</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Aspirin 100mg"
                  className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Time</label>
                <input
                  type="time"
                  value={medTime}
                  onChange={(e) => setMedTime(e.target.value)}
                  className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 [color-scheme:dark]"
                  required
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Frequency</label>
              <select
                value={medFrequency}
                onChange={(e) => {
                  setMedFrequency(e.target.value as FrequencyType);
                  if (e.target.value !== 'weekly') {
                    setMedFrequencyDetails([]);
                  }
                }}
                className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="as-needed">As needed</option>
              </select>
            </div>

            {/* Weekly Day Selector */}
            {medFrequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">Select Days</label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleMedDay(index)}
                      className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                        medFrequencyDetails.includes(index)
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/40'
                          : 'bg-white/10 text-purple-200 border border-purple-400/30 hover:bg-white/20'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">Notes (Optional)</label>
              <textarea
                value={medNotes}
                onChange={(e) => setMedNotes(e.target.value)}
                placeholder="e.g. Take with food"
                rows={2}
                className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2 justify-end">
              {editingMedId && (
                <button
                  type="button"
                  onClick={resetMedicationForm}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all duration-300"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmittingMed}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmittingMed ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{editingMedId ? 'Updating...' : 'Adding...'}</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>{editingMedId ? 'Update Medication' : 'Add Medication'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Medications List */}
        <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-white text-xl">Your Medications</h3>
          </div>
          {medicationsLoading ? (
            <div className="p-6 text-center text-purple-200">
              <div className="w-12 h-12 mx-auto mb-3 border-4 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
              <p>Loading medications...</p>
            </div>
          ) : medications.length === 0 ? (
            <div className="p-6 text-center text-purple-200">
              <Pill className="w-12 h-12 mx-auto mb-3 text-purple-300" />
              <p>No medications added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map(med => (
                <div
                  key={med.id}
                  className="flex gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-400/20 hover:border-purple-400/40 transition-all duration-300"
                >
                  {/* Photo */}
                  <div className="flex-shrink-0">
                    {med.photoUrl ? (
                      <img
                        src={med.photoUrl}
                        alt={med.name}
                        className="w-20 h-20 object-cover rounded-xl border border-purple-400/30"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                        <Pill className="w-8 h-8 text-purple-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-lg truncate">{med.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-purple-200">
                      <Clock size={14} />
                      <span>{getFrequencyText(med)} at {formatTime(med.time)}</span>
                    </div>
                    {med.notes && (
                      <p className="text-sm text-purple-300 mt-1">{med.notes}</p>
                    )}
                    <p className="text-xs text-purple-400 mt-2">
                      Added {new Date(med.addedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEditMedication(med)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/30 hover:scale-105 transition-all duration-300 text-sm"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleRemoveMedication(med.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-200 border border-red-400/30 hover:bg-red-500/30 hover:scale-105 transition-all duration-300 text-sm"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        {activeTab === 'medications' && renderMedicationsTab()}
        {activeTab === 'family' && renderFamilyTab()}
        {activeTab === 'contacts' && renderContactsTab()}
      </div>
    </div>
  );
}
