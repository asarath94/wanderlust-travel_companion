import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Image, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { useIsMobile } from '../../hooks/useResponsive';

export default function NewTrip() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startingPoint, setStartingPoint] = useState('');
  const [destinations, setDestinations] = useState(['']);
  const [participantEmails, setParticipantEmails] = useState([user?.email || '']);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    tripName: '',
    startingPoint: '',
    destinations: '',
    dates: '',
    participants: '',
  });

  const addDestination = () => {
    setDestinations([...destinations, '']);
  };

  const removeDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const updateDestination = (index: number, value: string) => {
    const newDestinations = [...destinations];
    newDestinations[index] = value;
    setDestinations(newDestinations);
  };

  const addParticipant = () => {
    setParticipantEmails([...participantEmails, '']);
  };

  const removeParticipant = (index: number) => {
    if (participantEmails.length > 1) {
      setParticipantEmails(participantEmails.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index: number, value: string) => {
    const newEmails = [...participantEmails];
    newEmails[index] = value;
    setParticipantEmails(newEmails);
  };

  const handleSubmit = async () => {
    // Reset errors
    const newErrors = {
      tripName: '',
      startingPoint: '',
      destinations: '',
      dates: '',
      participants: '',
    };

    // Validation
    if (!tripName.trim()) {
      newErrors.tripName = 'Trip name is required';
    } else if (tripName.trim().length < 3) {
      newErrors.tripName = 'Trip name must be at least 3 characters';
    }

    if (!startingPoint.trim()) {
      newErrors.startingPoint = 'Starting point is required';
    }

    const validDestinations = destinations.filter(d => d.trim());
    if (validDestinations.length === 0) {
      newErrors.destinations = 'At least one destination is required';
    }

    // Date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (start > end) {
      newErrors.dates = 'End date must be after start date';
    } else if (start < today) {
      newErrors.dates = 'Start date cannot be in the past';
    }

    // Participant validation
    const validEmails = participantEmails.filter(e => e.trim());
    if (validEmails.length === 0) {
      newErrors.participants = 'At least one participant is required';
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = validEmails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        newErrors.participants = 'All participant emails must be valid';
      }
    }

    setErrors(newErrors);

    // Check if any errors
    if (Object.values(newErrors).some(error => error !== '')) {
      if (Platform.OS === 'web') {
        alert('Please correct the errors in the form');
      } else {
        Alert.alert('Validation Error', 'Please correct the errors in the form');
      }
      return;
    }

    setLoading(true);
    try {
      console.log('Starting trip creation...');
      // Helper to format date as DD-MM-YYYY in local time
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
      };

      const tripData = {
        name: tripName.trim(),
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        startingPoint: startingPoint.trim(),
        destinations: destinations.filter(d => d.trim()).map(d => d.trim()),
        participants: participantEmails.filter(e => e.trim()).map(e => e.trim()),
        adminId: user?.uid || '',
        createdAt: serverTimestamp(),
        status: 'planning',
      };

      console.log('Trip data prepared:', tripData);

      // Create a timeout promise
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 10000)
      );

      // Race between addDoc and timeout
      await Promise.race([
        addDoc(collection(db, 'trips'), tripData),
        timeout
      ]);

      console.log('Trip created successfully in Firestore');

      if (Platform.OS === 'web') {
        alert('Trip created successfully!');
      } else {
        Alert.alert('Success', 'Trip created successfully!');
      }
      router.back();
    } catch (error: any) {
      console.error('Error creating trip:', error);
      const errorMessage = error.message || 'Failed to create trip';
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      {!isMobile ? (
        <View className="bg-blue-900 pt-6 pb-6 px-6 shadow-md">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 w-10 h-10 rounded-full items-center justify-center active:bg-white/30">
                <Text className="text-white text-xl font-bold pb-1">←</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold tracking-tight">New Trip</Text>
            </View>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={{ width: 200, height: 70 }}
              resizeMode="contain"
            />
          </View>
        </View>
      ) : (
        <View className="bg-blue-900 pt-3 pb-3 px-6 shadow-md">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 w-10 h-10 rounded-full items-center justify-center active:bg-white/30">
                <Text className="text-white text-xl font-bold pb-1">←</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold tracking-tight">New Trip</Text>
            </View>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          </View>
        </View>
      )}

      <ScrollView className="flex-1 p-6">
        {/* Trip Name */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Trip Name *</Text>
        <TextInput
          className={`bg-white p-4 rounded-xl mb-4 border ${errors.tripName ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
          placeholder="e.g., Summer Europe Tour"
          placeholderTextColor="#9ca3af"
          value={tripName}
          onChangeText={(text) => {
            setTripName(text);
            if (errors.tripName) setErrors({ ...errors, tripName: '' });
          }}
        />
        {errors.tripName && <Text className="text-red-500 text-sm -mt-3 mb-4 font-medium">{errors.tripName}</Text>}


        {/* Start Date */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Start Date *</Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={startDate.toISOString().split('T')[0]}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: `1px solid ${errors.dates ? '#ef4444' : '#e5e7eb'}`,
              fontSize: '16px',
              backgroundColor: 'white',
              marginBottom: '16px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          />
        ) : (
          <>
            <TouchableOpacity
              className={`bg-white p-4 rounded-xl mb-4 border ${errors.dates ? 'border-red-500' : 'border-slate-200'} shadow-sm`}
              onPress={() => setShowStartPicker(true)}
            >
              <Text className="text-slate-900 text-base">{startDate.toDateString()}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}
          </>
        )}

        {/* End Date */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">End Date *</Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={endDate.toISOString().split('T')[0]}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: `1px solid ${errors.dates ? '#ef4444' : '#e5e7eb'}`,
              fontSize: '16px',
              backgroundColor: 'white',
              marginBottom: '16px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          />
        ) : (
          <>
            <TouchableOpacity
              className={`bg-white p-4 rounded-xl mb-4 border ${errors.dates ? 'border-red-500' : 'border-slate-200'} shadow-sm`}
              onPress={() => setShowEndPicker(true)}
            >
              <Text className="text-slate-900 text-base">{endDate.toDateString()}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
            )}
          </>
        )}
        {errors.dates && <Text className="text-red-500 text-sm -mt-3 mb-4 font-medium">{errors.dates}</Text>}

        {/* Starting Point */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Starting Point *</Text>
        <TextInput
          className={`bg-white p-4 rounded-xl mb-4 border ${errors.startingPoint ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
          placeholder="e.g., New York, USA"
          placeholderTextColor="#9ca3af"
          value={startingPoint}
          onChangeText={(text) => {
            setStartingPoint(text);
            if (errors.startingPoint) setErrors({ ...errors, startingPoint: '' });
          }}
        />
        {errors.startingPoint && <Text className="text-red-500 text-sm -mt-3 mb-4 font-medium">{errors.startingPoint}</Text>}

        {/* Destinations */}
        <View className="flex-row justify-between items-center mb-3 mt-2">
          <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider">Destinations *</Text>
          <TouchableOpacity onPress={addDestination} className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 active:bg-blue-100">
            <Text className="text-blue-900 font-bold text-xs">+ ADD</Text>
          </TouchableOpacity>
        </View>
        {errors.destinations && <Text className="text-red-500 text-sm mb-3 font-medium">{errors.destinations}</Text>}
        {destinations.map((dest, index) => (
          <View key={index} className="flex-row mb-3">
            <TextInput
              className="flex-1 bg-white p-4 rounded-xl border border-slate-200 text-slate-900 text-base shadow-sm"
              placeholder={`Destination ${index + 1}`}
              placeholderTextColor="#9ca3af"
              value={dest}
              onChangeText={(value) => updateDestination(index, value)}
            />
            {destinations.length > 1 && (
              <TouchableOpacity
                onPress={() => removeDestination(index)}
                className="ml-3 bg-red-50 w-12 rounded-xl justify-center items-center border border-red-100 active:bg-red-100"
              >
                <Text className="text-red-500 font-bold text-xl">×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Participant Emails */}
        <View className="flex-row justify-between items-center mt-6 mb-3">
          <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider">Participants *</Text>
          <TouchableOpacity onPress={addParticipant} className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 active:bg-blue-100">
            <Text className="text-blue-900 font-bold text-xs">+ ADD</Text>
          </TouchableOpacity>
        </View>
        {errors.participants && <Text className="text-red-500 text-sm mb-3 font-medium">{errors.participants}</Text>}
        {participantEmails.map((email, index) => (
          <View key={index} className="flex-row mb-3">
            <TextInput
              className="flex-1 bg-white p-4 rounded-xl border border-slate-200 text-slate-900 text-base shadow-sm"
              placeholder="participant@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(value) => updateParticipant(index, value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {participantEmails.length > 1 && (
              <TouchableOpacity
                onPress={() => removeParticipant(index)}
                className="ml-3 bg-red-50 w-12 rounded-xl justify-center items-center border border-red-100 active:bg-red-100"
              >
                <Text className="text-red-500 font-bold text-xl">×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Submit Button */}
        <TouchableOpacity
          className={`mt-8 mb-12 p-4 rounded-xl shadow-lg active:bg-blue-800 ${loading ? 'bg-blue-500' : 'bg-blue-900'}`}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold text-lg tracking-wide">
            {loading ? 'CREATING...' : 'CREATE TRIP'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

