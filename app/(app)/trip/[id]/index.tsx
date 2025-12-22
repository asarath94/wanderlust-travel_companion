import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, ScrollView, Text, TextInput } from 'react-native';
import { View, TouchableOpacity } from '../../../../components/ShadowView';
import AIChat from '../../../../components/AIChat';
import ItineraryTimeline from '../../../../components/ItineraryTimeline';
import { useAuth } from '../../../../context/AuthContext';
import { db, storage } from '../../../../firebaseConfig';
import { useIsMobile } from '../../../../hooks/useResponsive';
import { DayPlan, generateItinerary } from '../../../../services/aiService';
import { registerForPushNotificationsAsync, schedulePushNotification } from '../../../../services/notificationService';

interface Trip {
  name: string;
  startDate: string;
  endDate: string;
  startingPoint: string;
  destinations: string[];
  participants: string[];
  adminId: string;
  status: string;
  photosLink?: string;
  isSettled?: boolean;
}

interface TripDocument {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf';
  createdAt: Timestamp;
}

interface Reminder {
  id: string;
  text: string;
  date: string; // ISO string or simple date string
  createdAt: Timestamp;
}

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  paidBy: string;
  splitAmong: string[];
  createdBy: string;
}

interface SavedItinerary {
  id: string;
  label: string;
  days: DayPlan[];
  createdAt: Timestamp;
}

// Helper for cross-platform confirmation
const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) {
      onConfirm();
    }
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm }
      ]
    );
  }
};

export default function TripDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'expenses' | 'balances' | 'ai_planner' | 'itineraries' | 'vault'>('details');
  const [showTabMenu, setShowTabMenu] = useState(false);
  
  // AI State
  const [itinerary, setItinerary] = useState<DayPlan[] | null>(null);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [selectedSavedItinerary, setSelectedSavedItinerary] = useState<SavedItinerary | null>(null);
  const [isSavingItinerary, setIsSavingItinerary] = useState(false);

  // Vault & Reminders State
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderDate, setNewReminderDate] = useState(new Date());
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  
  // Rename Itinerary State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItineraryId, setRenameItineraryId] = useState<string>('');
  const [renameValue, setRenameValue] = useState('');
  
  // Rename Document State
  const [showRenameDocModal, setShowRenameDocModal] = useState(false);
  const [renameDocumentId, setRenameDocumentId] = useState<string>('');
  const [renameDocValue, setRenameDocValue] = useState('');

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    setLoading(true);
    const tripRef = doc(db, 'trips', id);

    const unsubscribe = onSnapshot(tripRef, (doc) => {
      if (doc.exists()) {
        setTrip(doc.data() as Trip);
      } else {
        Alert.alert('Error', 'Trip not found');
        router.back();
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching trip details:', error);
      setLoading(false);
    });

    registerForPushNotificationsAsync();

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const expensesRef = collection(db, `trips/${id}/expenses`);
    // Note: orderBy might require index. If it fails, we can sort client-side.
    // Let's try client-side sorting first to be safe.
    const q = query(expensesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses: Expense[] = [];
      snapshot.forEach((doc) => {
        fetchedExpenses.push({ id: doc.id, ...doc.data() } as Expense);
      });
      
      // Sort by date (newest first)
      fetchedExpenses.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('-').map(Number);
        const [dayB, monthB, yearB] = b.date.split('-').map(Number);
        return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
      });

      setExpenses(fetchedExpenses);
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const itinerariesRef = collection(db, `trips/${id}/itineraries`);
    const q = query(itinerariesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItineraries: SavedItinerary[] = [];
      snapshot.forEach((doc) => {
        fetchedItineraries.push({ id: doc.id, ...doc.data() } as SavedItinerary);
      });
      // Sort by createdAt (newest first)
      fetchedItineraries.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setSavedItineraries(fetchedItineraries);
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const docsRef = collection(db, `trips/${id}/documents`);
    const q = query(docsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDocs: TripDocument[] = [];
      snapshot.forEach((doc) => {
        fetchedDocs.push({ id: doc.id, ...doc.data() } as TripDocument);
      });
      setDocuments(fetchedDocs);
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const remindersRef = collection(db, `trips/${id}/reminders`);
    const q = query(remindersRef, orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReminders: Reminder[] = [];
      snapshot.forEach((doc) => {
        fetchedReminders.push({ id: doc.id, ...doc.data() } as Reminder);
      });
      setReminders(fetchedReminders);
    });

    return () => unsubscribe();
  }, [id]);

  const handleUploadDocument = async (type: 'image' | 'pdf') => {
    if (!id || typeof id !== 'string') return;

    try {
      let result: any;
      
      if (type === 'image') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        const filename = asset.name || `doc_${Date.now()}.${type === 'image' ? 'jpg' : 'pdf'}`;
        const storageRef = ref(storage, `trips/${id}/documents/${filename}`);
        
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        await addDoc(collection(db, `trips/${id}/documents`), {
          name: filename,
          url: downloadURL,
          type,
          createdAt: serverTimestamp(),
        });

        Alert.alert('Success', 'Document uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRenameDocument = (documentId: string, currentName: string) => {
    setRenameDocumentId(documentId);
    setRenameDocValue(currentName);
    setShowRenameDocModal(true);
  };

  const confirmRenameDocument = async () => {
    if (!id || typeof id !== 'string' || !renameDocumentId) return;

    if (!renameDocValue || !renameDocValue.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }
    
    try {
      await updateDoc(doc(db, `trips/${id}/documents`, renameDocumentId), {
        name: renameDocValue.trim()
      });
      Alert.alert('Success', 'Document renamed successfully');
      setShowRenameDocModal(false);
      setRenameDocumentId('');
      setRenameDocValue('');
    } catch (error) {
      console.error('Error renaming document:', error);
      Alert.alert('Error', 'Failed to rename document');
    }
  };

  const handleDeleteDocument = async (documentId: string, documentUrl: string, documentName: string) => {
    if (!id || typeof id !== 'string') return;

    confirmAction(
      'Delete Document',
      `Are you sure you want to delete "${documentName}"? This action cannot be undone.`,
      async () => {
        try {
          // Delete from storage first
          const storageRef = ref(storage, documentUrl);
          await deleteObject(storageRef);

          // Then delete from Firestore
          await deleteDoc(doc(db, `trips/${id}/documents`, documentId));
          Alert.alert('Success', 'Document deleted successfully');
        } catch (error) {
          console.error('Error deleting document:', error);
          Alert.alert('Error', 'Failed to delete document');
        }
      }
    );
  };

  const handleAddReminder = async () => {
    if (!id || typeof id !== 'string') return;
    if (!newReminderText.trim()) {
      Alert.alert('Error', 'Please enter reminder text');
      return;
    }

    try {
      await addDoc(collection(db, `trips/${id}/reminders`), {
        text: newReminderText.trim(),
        date: newReminderDate.toISOString(),
        createdAt: serverTimestamp(),
      });

      // Schedule local notification
      await schedulePushNotification(
        'Trip Reminder',
        newReminderText.trim(),
        newReminderDate
      );

      setNewReminderText('');
      setNewReminderDate(new Date());
      Alert.alert('Success', 'Reminder added and notification scheduled');
    } catch (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder');
    }
  };

  const handleSetAlert = async (reminder: Reminder) => {
    try {
      const reminderDate = new Date(reminder.date);
      if (reminderDate < new Date()) {
        Alert.alert('Error', 'Cannot schedule notification for past date');
        return;
      }
      
      await schedulePushNotification(
        'Trip Reminder',
        reminder.text,
        reminderDate
      );
      Alert.alert('Success', 'Notification scheduled for this device');
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Failed to schedule notification');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!id || typeof id !== 'string') return;
    
    confirmAction(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      async () => {
        try {
          await deleteDoc(doc(db, `trips/${id}/reminders`, reminderId));
        } catch (error) {
          console.error('Error deleting reminder:', error);
          Alert.alert('Error', 'Failed to delete reminder');
        }
      }
    );
  };

  const handleSettleUp = async () => {
    if (!id || typeof id !== 'string') return;

    confirmAction(
      'Settle Up',
      'Mark this trip as settled? This indicates all debts have been paid.',
      async () => {
        try {
          await updateDoc(doc(db, 'trips', id), {
            isSettled: true,
            status: 'completed'
          });
          Alert.alert('Success', 'Trip marked as settled!');
          // Refresh trip data handled by onSnapshot
        } catch (error) {
          console.error('Error settling trip:', error);
          Alert.alert('Error', 'Failed to settle trip');
        }
      }
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <Text className="text-slate-500">Trip not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-blue-600 px-6 py-3 rounded">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = trip.adminId === user?.uid;

  const renderDetails = () => (
    <ScrollView className="flex-1 p-6">
      {/* Dates */}
      <View className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Trip Dates</Text>
        <Text className="text-slate-900 text-xl font-semibold">
          {trip.startDate} - {trip.endDate}
        </Text>
      </View>

      {/* Starting Point */}
      <View className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Starting Point</Text>
        <Text className="text-slate-900 text-xl">{trip.startingPoint}</Text>
      </View>

      {/* Destinations */}
      <View className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Destinations ({trip.destinations.length})</Text>
        {trip.destinations.map((dest, index) => (
          <View key={index} className="flex-row items-center mb-3 last:mb-0">
            <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Text className="text-blue-900 text-sm font-bold">{index + 1}</Text>
            </View>
            <Text className="text-slate-900 text-lg">{dest}</Text>
          </View>
        ))}
      </View>

      {/* Participants */}
      <View className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Participants ({trip.participants.length})</Text>
        {trip.participants.map((email, index) => (
          <View key={index} className="flex-row items-center mb-3 last:mb-0">
            <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3 border border-slate-200">
              <Text className="text-slate-700 font-bold text-lg">{email.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 text-base font-medium">{email}</Text>
              {trip.adminId === user?.uid && email === user?.email && (
                <Text className="text-amber-600 text-xs font-bold mt-0.5">ADMIN (YOU)</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Status */}
      <View className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Status</Text>
        <View className="flex-row items-center">
          <View className={`w-3 h-3 rounded-full mr-2 ${trip.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} />
          <Text className="text-slate-900 text-xl capitalize font-medium">{trip.status}</Text>
        </View>
      </View>

      {/* Photos Link */}
      {trip.photosLink && (
        <View className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Photos Link</Text>
          <TouchableOpacity onPress={() => Linking.openURL(trip.photosLink!)} className="flex-row items-center">
            <Text className="text-blue-700 underline text-lg mr-2" numberOfLines={1}>{trip.photosLink}</Text>
            <Text className="text-blue-700">↗</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reminders Section */}
      {renderRemindersSection()}

      {/* Delete Trip Button (Admin Only) */}
      {isAdmin && (
        <TouchableOpacity 
          className="bg-red-50 border border-red-200 p-4 rounded-xl mt-4 mb-8 active:bg-red-100"
          onPress={handleDeleteTrip}
        >
          <Text className="text-red-600 font-bold text-center text-lg">Delete Trip</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderExpenses = () => (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 p-6">
        {expenses.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-slate-400 text-xl font-medium mb-2">No expenses yet</Text>
            <Text className="text-slate-500">Add an expense to start tracking costs.</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <TouchableOpacity
              key={expense.id}
              className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100 active:bg-slate-50"
              onPress={() => router.push(`/(app)/trip/${id}/edit-expense?expenseId=${expense.id}` as any)}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-4">
                  <Text className="text-xl font-bold text-slate-900 mb-1">{expense.description}</Text>
                  <Text className="text-slate-500 text-sm font-medium">Paid by <Text className="text-blue-700 font-bold">{expense.paidBy === user?.email ? 'You' : expense.paidBy}</Text></Text>
                </View>
                <Text className="text-2xl font-bold text-blue-900">{`₹${expense.amount.toFixed(2)}`}</Text>
              </View>
              <View className="flex-row justify-between items-center pt-3 border-t border-slate-100">
                <Text className="text-slate-400 text-xs font-medium uppercase tracking-wide">{expense.date}</Text>
                <View className="bg-slate-100 px-3 py-1 rounded-full">
                  <Text className="text-slate-600 text-xs font-bold">
                    SPLIT: {expense.splitAmong.length} PEOPLE
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View className="h-24" />
      </ScrollView>

      <TouchableOpacity 
        className="absolute bottom-8 right-8 bg-blue-900 px-8 py-4 rounded-full shadow-xl flex-row items-center active:bg-blue-800"
        onPress={() => router.push(`/(app)/trip/${id}/add-expense` as any)}
        activeOpacity={0.8}
      >
        <Text className="text-white font-bold text-lg">+ Add Expense</Text>
      </TouchableOpacity>
    </View>
  );

  const handleGenerateItinerary = async () => {
    if (!trip) return;
    setIsGeneratingItinerary(true);
    try {
      const result = await generateItinerary(trip);
      setItinerary(result.days);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate itinerary. Please check your API key.');
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  const handleSaveItinerary = async () => {
    if (!itinerary || !trip || !id) return;
    
    setIsSavingItinerary(true);
    try {
      const label = `Itinerary generated on ${new Date().toLocaleDateString()}`;
      await addDoc(collection(db, `trips/${id}/itineraries`), {
        label,
        days: itinerary,
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });
      Alert.alert('Success', 'Itinerary saved successfully!');
      setActiveTab('itineraries');
      setItinerary(null); // Clear current to go back to chat or just reset
    } catch (error) {
      console.error('Error saving itinerary:', error);
      Alert.alert('Error', 'Failed to save itinerary');
    } finally {
      setIsSavingItinerary(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!id || typeof id !== 'string' || !isAdmin) return;

    confirmAction(
      'Delete Trip',
      'Are you sure you want to delete this trip? This will also delete all expenses and itineraries. This action cannot be undone.',
      async () => {
        try {
          // Delete all expenses
          const expensesSnapshot = await getDocs(collection(db, `trips/${id}/expenses`));
          const expenseDeletes = expensesSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(expenseDeletes);

          // Delete all itineraries
          const itinerariesSnapshot = await getDocs(collection(db, `trips/${id}/itineraries`));
          const itineraryDeletes = itinerariesSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(itineraryDeletes);

          // Delete the trip itself
          await deleteDoc(doc(db, 'trips', id));

          Alert.alert('Success', 'Trip deleted successfully');
          router.replace('/(app)/dashboard');
        } catch (error) {
          console.error('Error deleting trip:', error);
          Alert.alert('Error', 'Failed to delete trip');
        }
      }
    );
  };

  const handleDeleteItinerary = async (itineraryId: string) => {
    if (!id || typeof id !== 'string') return;

    confirmAction(
      'Delete Itinerary',
      'Are you sure you want to delete this saved itinerary? This action cannot be undone.',
      async () => {
        try {
          await deleteDoc(doc(db, `trips/${id}/itineraries`, itineraryId));
          Alert.alert('Success', 'Itinerary deleted successfully');
          setSelectedSavedItinerary(null);
        } catch (error) {
          console.error('Error deleting itinerary:', error);
          Alert.alert('Error', 'Failed to delete itinerary');
        }
      }
    );
  };

  const handleRenameItinerary = async (itineraryId: string, currentLabel: string) => {
    if (!id || typeof id !== 'string') return;

    setRenameItineraryId(itineraryId);
    setRenameValue(currentLabel);
    setShowRenameModal(true);
  };

  const confirmRenameItinerary = async () => {
    if (!id || typeof id !== 'string' || !renameItineraryId) return;

    if (!renameValue || !renameValue.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }
    
    try {
      await updateDoc(doc(db, `trips/${id}/itineraries`, renameItineraryId), {
        label: renameValue.trim()
      });
      Alert.alert('Success', 'Itinerary renamed successfully');
      setShowRenameModal(false);
      setRenameItineraryId('');
      setRenameValue('');
    } catch (error) {
      console.error('Error renaming itinerary:', error);
      Alert.alert('Error', 'Failed to rename itinerary');
    }
  };

  const renderItineraries = () => (
    <View className="flex-1 bg-slate-50">
      {selectedSavedItinerary ? (
        <View className="flex-1">
          <View className="flex-row justify-between items-center p-6 bg-white border-b border-slate-100 shadow-sm">
            <TouchableOpacity onPress={() => setSelectedSavedItinerary(null)} className="flex-row items-center">
              <Text className="text-blue-700 text-lg mr-1">←</Text>
              <Text className="text-blue-700 font-semibold">Back</Text>
            </TouchableOpacity>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-blue-50 px-4 py-2 rounded-lg mr-3 border border-blue-100"
                onPress={() => handleRenameItinerary(selectedSavedItinerary.id, selectedSavedItinerary.label)}
              >
                <Text className="text-blue-900 font-bold text-sm">Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-50 px-4 py-2 rounded-lg border border-red-100"
                onPress={() => handleDeleteItinerary(selectedSavedItinerary.id)}
              >
                <Text className="text-red-600 font-bold text-sm">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View className="p-6 bg-white border-b border-slate-100">
            <Text className="text-2xl font-bold text-slate-900">{selectedSavedItinerary.label}</Text>
          </View>
          <ItineraryTimeline itinerary={selectedSavedItinerary.days} />
        </View>
      ) : (
        <ScrollView className="flex-1 p-6">
          {savedItineraries.length === 0 ? (
            <View className="items-center mt-20">
              <Text className="text-slate-400 text-xl font-medium mb-2">No saved itineraries</Text>
              <Text className="text-slate-500">Generate one with the AI Planner!</Text>
            </View>
          ) : (
            savedItineraries.map((item) => (
              <View key={item.id} className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
                <TouchableOpacity
                  className="flex-1 mb-4"
                  onPress={() => setSelectedSavedItinerary(item)}
                >
                  <Text className="text-xl font-bold text-slate-900 mb-2">{item.label}</Text>
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 px-3 py-1 rounded-full mr-3">
                      <Text className="text-blue-900 text-xs font-bold">{item.days.length} DAYS</Text>
                    </View>
                    <Text className="text-slate-500 text-sm">
                      Created {item.createdAt?.toDate().toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  className="absolute top-6 right-6 bg-red-50 p-2 rounded-lg"
                  onPress={() => handleDeleteItinerary(item.id)}
                >
                  <Text className="text-red-500 font-bold text-xs">DELETE</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderVault = () => (
    <View className="flex-1 bg-slate-50 p-6">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-slate-900">Documents</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-blue-50 px-4 py-2 rounded-lg mr-3 border border-blue-100 active:bg-blue-100"
            onPress={() => handleUploadDocument('image')}
            disabled={isUploading}
          >
            <Text className="text-blue-900 font-bold text-sm">{isUploading ? '...' : '+ Image'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 active:bg-blue-100"
            onPress={() => handleUploadDocument('pdf')}
            disabled={isUploading}
          >
            <Text className="text-blue-900 font-bold text-sm">{isUploading ? '...' : '+ PDF'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {documents.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-slate-400 text-xl font-medium mb-2">No documents</Text>
            <Text className="text-slate-500">Upload tickets, bookings, and IDs.</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {documents.map((doc) => (
              <View 
                key={doc.id}
                className="bg-white w-[48%] p-4 rounded-xl mb-4 shadow-lg border border-slate-100 items-center relative"
              >
                {/* Main card content - tappable */}
                <TouchableOpacity
                  className="items-center w-full"
                  onPress={() => Linking.openURL(doc.url)}
                  activeOpacity={0.7}
                >
                  <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-3 border border-slate-100">
                    <Text className="text-3xl">{doc.type === 'image' ? '🖼️' : '📄'}</Text>
                  </View>
                  <Text className="text-slate-900 font-bold text-center text-sm mb-1" numberOfLines={2}>
                    {doc.name}
                  </Text>
                  <Text className="text-slate-400 text-xs">
                    {doc.createdAt?.toDate().toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {/* Action buttons - overlay */}
                <View className="absolute top-2 right-2 flex-row">
                  <TouchableOpacity
                    className="bg-blue-50 p-2 rounded-lg mr-1"
                    onPress={() => handleRenameDocument(doc.id, doc.name)}
                  >
                    <Text className="text-blue-600 font-bold text-xs">✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-red-50 p-2 rounded-lg"
                    onPress={() => handleDeleteDocument(doc.id, doc.url, doc.name)}
                  >
                    <Text className="text-red-500 font-bold text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderRemindersSection = () => (
    <View className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100">
      <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Reminders</Text>
      
      {/* Add Reminder Input */}
      <View className="flex-row items-center mb-4">
        <TextInput
          className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200 mr-2 text-slate-900"
          placeholder="Add a reminder..."
          placeholderTextColor="#9ca3af"
          value={newReminderText}
          onChangeText={setNewReminderText}
        />
        <TouchableOpacity
          className="bg-blue-900 px-4 py-3 rounded-lg shadow-sm active:bg-blue-800"
          onPress={handleAddReminder}
        >
          <Text className="text-white font-bold text-lg">+</Text>
        </TouchableOpacity>
      </View>

      {/* Date and Time Pickers for Reminder */}
      <View className="mb-6">
        <Text className="text-slate-700 font-medium mb-2 text-sm">Remind me on:</Text>
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <input
              type="date"
              value={newReminderDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                newDate.setHours(newReminderDate.getHours());
                newDate.setMinutes(newReminderDate.getMinutes());
                setNewReminderDate(newDate);
              }}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
            />
            <input
              type="time"
              value={`${String(newReminderDate.getHours()).padStart(2, '0')}:${String(newReminderDate.getMinutes()).padStart(2, '0')}`}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':');
                const newDate = new Date(newReminderDate);
                newDate.setHours(parseInt(hours));
                newDate.setMinutes(parseInt(minutes));
                setNewReminderDate(newDate);
              }}
              style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
            />
          </View>
        ) : (
          <View className="flex-row">
            {/* Date Button */}
            <TouchableOpacity
              onPress={() => setShowReminderDatePicker(true)}
              className="flex-1 bg-slate-50 px-4 py-3 mr-3 rounded-lg border border-slate-200"
            >
              <Text className="text-xs text-slate-500 font-bold uppercase mb-1">Date</Text>
              <Text className="text-slate-900 font-medium">{newReminderDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            
            {/* Time Button */}
            <TouchableOpacity
              onPress={() => setShowReminderTimePicker(true)}
              className="flex-1 bg-slate-50 px-4 py-3 rounded-lg border border-slate-200"
            >
              <Text className="text-xs text-slate-500 font-bold uppercase mb-1">Time</Text>
              <Text className="text-slate-900 font-medium">{newReminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Date Picker Modal */}
      {showReminderDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={newReminderDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowReminderDatePicker(false);
            if (selectedDate) {
              // Preserve the time when updating date
              const newDate = new Date(selectedDate);
              newDate.setHours(newReminderDate.getHours());
              newDate.setMinutes(newReminderDate.getMinutes());
              setNewReminderDate(newDate);
            }
          }}
        />
      )}
      
      {/* Time Picker Modal */}
      {showReminderTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={newReminderDate}
          mode="time"
          display="default"
          onChange={(event, selectedDate) => {
            setShowReminderTimePicker(false);
            if (selectedDate) {
              // Preserve the date when updating time
              const newDate = new Date(newReminderDate);
              newDate.setHours(selectedDate.getHours());
              newDate.setMinutes(selectedDate.getMinutes());
              setNewReminderDate(newDate);
            }
          }}
        />
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <View className="bg-slate-50 p-4 rounded-lg items-center">
          <Text className="text-slate-500 text-sm italic">No reminders set.</Text>
        </View>
      ) : (
        reminders.map((reminder) => (
          <View key={reminder.id} className="flex-row justify-between items-center py-3 border-b border-slate-100 last:border-0">
            <View className="flex-1 mr-3">
              <Text className="text-slate-900 font-medium text-base">{reminder.text}</Text>
              <Text className="text-slate-500 text-xs mt-1">
                {new Date(reminder.date).toLocaleDateString()} at {new Date(reminder.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => handleSetAlert(reminder)}
                className="bg-blue-50 p-2 rounded-lg mr-2"
              >
                <Text className="text-blue-700 text-xs font-bold">🔔 ALERT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteReminder(reminder.id)}
                className="bg-red-50 p-2 rounded-lg"
              >
                <Text className="text-red-500 font-bold">×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderAIPlanner = () => (
    <View className="flex-1 bg-slate-50">
      {itinerary ? (
        <View className="flex-1">
          <View className="flex-row justify-between items-center p-6 bg-white border-b border-slate-100 shadow-sm">
            <Text className="text-xl font-bold text-slate-900">Your AI Itinerary</Text>
            <TouchableOpacity onPress={() => setItinerary(null)}>
              <Text className="text-blue-700 font-semibold">Back to Chat</Text>
            </TouchableOpacity>
          </View>
          <ItineraryTimeline itinerary={itinerary} />
          <View className="p-6 bg-white border-t border-slate-100 shadow-lg">
            <TouchableOpacity
              className={`bg-blue-900 py-4 rounded-xl items-center shadow-md active:bg-blue-800 ${isSavingItinerary ? 'opacity-70' : ''}`}
              onPress={handleSaveItinerary}
              disabled={isSavingItinerary}
            >
              {isSavingItinerary ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Save Itinerary</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <AIChat 
          tripContext={trip} 
          onGenerateItinerary={handleGenerateItinerary}
          isGenerating={isGeneratingItinerary}
        />
      )}
    </View>
  );

  const renderBalances = () => {
    // 1. Calculate Net Balances
    const balances: { [key: string]: number } = {};
    trip?.participants.forEach(p => balances[p] = 0);

    let totalTripCost = 0;

    expenses.forEach(expense => {
      const amount = expense.amount;
      totalTripCost += amount;
      
      // Payer paid the full amount
      if (balances[expense.paidBy] !== undefined) {
        balances[expense.paidBy] += amount;
      }

      // Splitters owe their share
      const splitCount = expense.splitAmong.length;
      if (splitCount > 0) {
        const share = amount / splitCount;
        expense.splitAmong.forEach(person => {
          if (balances[person] !== undefined) {
            balances[person] -= share;
          }
        });
      }
    });

    // 2. Simplify Debts
    const debtors: { person: string; amount: number }[] = [];
    const creditors: { person: string; amount: number }[] = [];

    Object.entries(balances).forEach(([person, amount]) => {
      if (amount < -0.01) debtors.push({ person, amount }); // owes money
      if (amount > 0.01) creditors.push({ person, amount }); // is owed money
    });

    debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
    creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

    const debts: { from: string; to: string; amount: number }[] = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // The amount to settle is the minimum of what debtor owes and creditor is owed
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      
      debts.push({ from: debtor.person, to: creditor.person, amount });

      debtor.amount += amount;
      creditor.amount -= amount;

      if (Math.abs(debtor.amount) < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return (
      <ScrollView className="flex-1 p-6">
        {/* Total Cost */}
        <View className="bg-blue-900 p-8 rounded-xl mb-8 shadow-lg items-center">
          <Text className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-2">Total Trip Cost</Text>
          <Text className="text-white text-5xl font-bold">{`₹${totalTripCost.toFixed(2)}`}</Text>
        </View>

        {/* Debts Summary */}
        <Text className="text-slate-900 font-bold text-xl mb-4 px-1">Who Owes Whom</Text>
        {debts.length === 0 ? (
          <View className="bg-white p-8 rounded-xl items-center shadow-lg border border-slate-100">
            <Text className="text-green-600 font-bold text-xl">All settled up! 🎉</Text>
            <Text className="text-slate-500 mt-2">No outstanding debts.</Text>
          </View>
        ) : (
          debts.map((debt, index) => (
            <View key={index} className="bg-white p-6 rounded-xl mb-4 shadow-lg border-l-4 border-red-500 flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-slate-900 text-lg">
                  <Text className="font-bold text-blue-900">{debt.from === user?.email ? 'You' : debt.from}</Text>
                  <Text className="text-slate-500">{' owe '}</Text>
                  <Text className="font-bold text-blue-900">{debt.to === user?.email ? 'You' : debt.to}</Text>
                </Text>
              </View>
              <Text className="text-red-600 font-bold text-xl ml-4">{`₹${debt.amount.toFixed(2)}`}</Text>
            </View>
          ))
        )}

        {/* Individual Spending */}
        <Text className="text-slate-900 font-bold text-xl mt-8 mb-4 px-1">Net Balances</Text>
        <View className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          {Object.entries(balances).map(([person, amount], index) => (
            <View key={index} className={`p-5 flex-row justify-between items-center border-b border-slate-100 ${index === Object.keys(balances).length - 1 ? 'border-b-0' : ''}`}>
              <Text className="text-slate-700 font-medium text-base">{person === user?.email ? 'You' : person}</Text>
              <Text className={`font-bold text-lg ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {`${amount >= 0 ? '+' : ''}₹${amount.toFixed(2)}`}
              </Text>
            </View>
          ))}
        </View>

        {/* Settle Up Button (Admin Only) */}
        {isAdmin && !trip.isSettled && (
          <TouchableOpacity 
            className="bg-green-600 p-5 rounded-xl mt-8 mb-8 shadow-lg active:bg-green-700"
            onPress={handleSettleUp}
          >
            <Text className="text-white font-bold text-center text-xl">✓ Settle Up</Text>
          </TouchableOpacity>
        )}
        
        {trip.isSettled && (
          <View className="bg-green-50 border border-green-200 p-6 rounded-xl mt-8 mb-8">
            <Text className="text-green-800 font-bold text-center text-xl">✓ Trip Settled</Text>
            <Text className="text-green-600 text-center text-base mt-2">All expenses have been settled</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      {!isMobile ? (
        <View className="bg-blue-900 pt-6 pb-6 px-6 shadow-md z-10">
          <View className="flex-row">
            {/* Left Column: Trip Info & Tabs */}
            <View className="flex-1">
              {/* Row 1: Back Button & Trip Name */}
              <View className="flex-row items-center mb-4">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 w-10 h-10 rounded-full items-center justify-center active:bg-white/30">
                  <Text className="text-white text-xl font-bold pb-1.5">←</Text>
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-white text-3xl font-bold tracking-tight">{trip.name}</Text>
                  {isAdmin && (
                    <View className="flex-row items-center mt-2">
                      <View className="bg-amber-500 px-2 py-0.5 rounded mr-2">
                        <Text className="text-white text-xs font-bold uppercase">ADMIN</Text>
                      </View>
                      <TouchableOpacity 
                        className="bg-white/20 px-3 py-1 rounded-full active:bg-white/30"
                        onPress={() => router.push(`/(app)/trip/${id}/edit` as any)}
                      >
                        <Text className="text-white text-xs font-semibold">Edit Trip</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Row 2: Tabs */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 24 }}
              >
                <TouchableOpacity 
                  className={`mr-6 pb-2 ${activeTab === 'details' ? 'border-b-4 border-amber-400' : ''}`}
                  onPress={() => setActiveTab('details')}
                >
                  <Text className={`font-bold text-base ${activeTab === 'details' ? 'text-white' : 'text-blue-200'}`}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`mr-6 pb-2 ${activeTab === 'expenses' ? 'border-b-4 border-amber-400' : ''}`}
                  onPress={() => setActiveTab('expenses')}
                >
                  <Text className={`font-bold text-base ${activeTab === 'expenses' ? 'text-white' : 'text-blue-200'}`}>Expenses</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`mr-6 pb-2 ${activeTab === 'balances' ? 'border-b-4 border-amber-400' : ''}`}
                  onPress={() => setActiveTab('balances')}
                >
                  <Text className={`font-bold text-base ${activeTab === 'balances' ? 'text-white' : 'text-blue-200'}`}>Balances</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`mr-6 pb-2 ${activeTab === 'ai_planner' ? 'border-b-4 border-amber-400' : ''}`}
                  onPress={() => setActiveTab('ai_planner')}
                >
                  <Text className={`font-bold text-base ${activeTab === 'ai_planner' ? 'text-white' : 'text-blue-200'}`}>AI Planner</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`mr-6 pb-2 ${activeTab === 'itineraries' ? 'border-b-4 border-amber-400' : ''}`}
                  onPress={() => setActiveTab('itineraries')}
                >
                  <Text className={`font-bold text-base ${activeTab === 'itineraries' ? 'text-white' : 'text-blue-200'}`}>Itineraries</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`mr-6 pb-2 ${activeTab === 'vault' ? 'border-b-4 border-amber-400' : ''}`}
                  onPress={() => setActiveTab('vault')}
                >
                  <Text className={`font-bold text-base ${activeTab === 'vault' ? 'text-white' : 'text-blue-200'}`}>Vault</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Right Column: Logo */}
            <View className="justify-center ml-4">
              <Image 
                source={require('../../../../assets/images/logo.png')} 
                style={{ width: 200, height: 90 }}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="bg-blue-900 pt-12 pb-3 px-6 shadow-md z-50">
          <View className="flex-row items-center justify-between mb-3">
            {/* Left: Back Button + Trip Name + Edit */}
            <View className="flex-row items-center flex-1 mr-3">
              <TouchableOpacity onPress={() => router.back()} className="mr-3 bg-white/20 w-10 h-10 rounded-full items-center justify-center active:bg-white/30">
                <Text className="text-white text-xl font-bold pb-1.5">←</Text>
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-white text-xl font-bold tracking-tight" numberOfLines={1}>{trip.name}</Text>
                {isAdmin && (
                  <TouchableOpacity 
                    className="bg-white/20 px-2 py-1 rounded mt-1 self-start"
                    onPress={() => router.push(`/(app)/trip/${id}/edit` as any)}
                  >
                    <Text className="text-white text-xs font-semibold">Edit Trip</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Right: Logo */}
            <Image 
              source={require('../../../../assets/images/logo.png')} 
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          </View>

          {/* Tab Dropdown */}
          <View className="relative">
            <TouchableOpacity 
              onPress={() => setShowTabMenu(!showTabMenu)} 
              className="bg-white/20 px-4 py-2 rounded-lg flex-row items-center justify-between"
            >
              <Text className="text-white font-semibold">
                {activeTab === 'details' && 'Details'}
                {activeTab === 'expenses' && 'Expenses'}
                {activeTab === 'balances' && 'Balances'}
                {activeTab === 'ai_planner' && 'AI Planner'}
                {activeTab === 'itineraries' && 'Itineraries'}
                {activeTab === 'vault' && 'Vault'}
              </Text>
              <Ionicons name={showTabMenu ? "chevron-up" : "chevron-down"} size={20} color="white" />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {showTabMenu && (
              <View className="absolute top-12 left-0 right-0 bg-white rounded-lg shadow-xl py-2 z-50">
                <TouchableOpacity onPress={() => { setActiveTab('details'); setShowTabMenu(false); }} className="px-4 py-3 border-b border-slate-100">
                  <Text className={`font-semibold ${activeTab === 'details' ? 'text-blue-900' : 'text-slate-700'}`}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setActiveTab('expenses'); setShowTabMenu(false); }} className="px-4 py-3 border-b border-slate-100">
                  <Text className={`font-semibold ${activeTab === 'expenses' ? 'text-blue-900' : 'text-slate-700'}`}>Expenses</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setActiveTab('balances'); setShowTabMenu(false); }} className="px-4 py-3 border-b border-slate-100">
                  <Text className={`font-semibold ${activeTab === 'balances' ? 'text-blue-900' : 'text-slate-700'}`}>Balances</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setActiveTab('ai_planner'); setShowTabMenu(false); }} className="px-4 py-3 border-b border-slate-100">
                  <Text className={`font-semibold ${activeTab === 'ai_planner' ? 'text-blue-900' : 'text-slate-700'}`}>AI Planner</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setActiveTab('itineraries'); setShowTabMenu(false); }} className="px-4 py-3 border-b border-slate-100">
                  <Text className={`font-semibold ${activeTab === 'itineraries' ? 'text-blue-900' : 'text-slate-700'}`}>Itineraries</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setActiveTab('vault'); setShowTabMenu(false); }} className="px-4 py-3">
                  <Text className={`font-semibold ${activeTab === 'vault' ? 'text-blue-900' : 'text-slate-700'}`}>Vault</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      <View className="flex-1">
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'expenses' && renderExpenses()}
        {activeTab === 'balances' && renderBalances()}
        {activeTab === 'ai_planner' && renderAIPlanner()}
        {activeTab === 'itineraries' && renderItineraries()}
        {activeTab === 'vault' && renderVault()}
      </View>

      {/* Rename Itinerary Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showRenameModal}
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-11/12 max-w-md shadow-xl">
            <Text className="text-xl font-bold text-gray-900 mb-4">Rename Itinerary</Text>
            <Text className="text-gray-600 mb-3">Enter a new name for this itinerary:</Text>
            
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 mb-6 text-gray-900"
              placeholder="Itinerary name"
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
            />

            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-gray-200 mr-3"
                onPress={() => {
                  setShowRenameModal(false);
                  setRenameValue('');
                  setRenameItineraryId('');
                }}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-blue-600"
                onPress={confirmRenameItinerary}
              >
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Document Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showRenameDocModal}
        onRequestClose={() => setShowRenameDocModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-6 w-11/12 max-w-md shadow-xl">
            <Text className="text-xl font-bold text-gray-900 mb-4">Rename Document</Text>
            <Text className="text-gray-600 mb-3">Enter a new name for this document:</Text>
            
            <TextInput
              className="bg-gray-50 border border-gray-300 rounded-lg p-3 mb-6 text-gray-900"
              placeholder="Document name"
              value={renameDocValue}
              onChangeText={setRenameDocValue}
              autoFocus
            />

            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-gray-200 mr-3"
                onPress={() => {
                  setShowRenameDocModal(false);
                  setRenameDocValue('');
                  setRenameDocumentId('');
                }}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-blue-600"
                onPress={confirmRenameDocument}
              >
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
