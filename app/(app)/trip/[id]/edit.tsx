import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebaseConfig';
import { useIsMobile } from '../../../../hooks/useResponsive';

export default function EditTrip() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startingPoint, setStartingPoint] = useState('');
  const [destinations, setDestinations] = useState(['']);
  const [participantEmails, setParticipantEmails] = useState([user?.email || '']);
  const [photosLink, setPhotosLink] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingTrip, setFetchingTrip] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errors, setErrors] = useState({
    tripName: false,
    startingPoint: false,
    destinations: false,
    dates: false,
  });

  useEffect(() => {
    fetchTripData();
  }, [id]);

  const fetchTripData = async () => {
    if (!id || typeof id !== 'string') return;
    
    setFetchingTrip(true);
    try {
      const tripDoc = await getDoc(doc(db, 'trips', id));
      if (tripDoc.exists()) {
        const data = tripDoc.data();
        
        // Check if user is admin
        if (data.adminId !== user?.uid) {
          Alert.alert('Error', 'Only the trip admin can edit trip details');
          router.back();
          return;
        }
        
        setIsAdmin(true);
        setTripName(data.name || '');
        setStartingPoint(data.startingPoint || '');
        setDestinations(data.destinations || ['']);
        setParticipantEmails(data.participants || [user?.email || '']);
        setPhotosLink(data.photosLink || '');
        
        // Parse dates from DD-MM-YYYY format
        if (data.startDate) {
          const [day, month, year] = data.startDate.split('-');
          setStartDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }
        if (data.endDate) {
          const [day, month, year] = data.endDate.split('-');
          setEndDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
      Alert.alert('Error', 'Failed to load trip data');
      router.back();
    } finally {
      setFetchingTrip(false);
    }
  };

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
    if (!id || typeof id !== 'string' || !isAdmin) return;

    // Reset errors
    setErrors({
      tripName: false,
      startingPoint: false,
      destinations: false,
      dates: false,
    });

    // Validation
    const newErrors = {
      tripName: !tripName.trim(),
      startingPoint: !startingPoint.trim(),
      destinations: destinations.filter(d => d.trim()).length === 0,
      dates: startDate >= endDate,
    };

    setErrors(newErrors);

    // Check if any errors
    if (Object.values(newErrors).some(error => error)) {
      Alert.alert('Error', 'Please fill in all required fields correctly');
      return;
    }

    setLoading(true);
    try {
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
        photosLink: photosLink.trim(),
      };

      await updateDoc(doc(db, 'trips', id), tripData);

      Alert.alert('Success', 'Trip updated successfully!');
      router.back();
    } catch (error: any) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingTrip) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      {!isMobile ? (
        <View className="bg-blue-900 pt-6 pb-6 px-6 shadow-md">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 w-10 h-10 rounded-full items-center justify-center active:bg-white/30">
                <Text className="text-white text-xl font-bold pb-0.5">←</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold tracking-tight">Edit Trip</Text>
            </View>
            <Image 
              source={require('../../../../assets/images/logo.png')} 
              style={{ width: 200, height: 70 }}
              resizeMode="contain"
            />
          </View>
        </View>
      ) : (
        <View className="bg-blue-900 pt-12 pb-3 px-6 shadow-md">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 w-10 h-10 rounded-full items-center justify-center active:bg-white/30">
                <Text className="text-white text-xl font-bold pb-0.5">←</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold tracking-tight">Edit Trip</Text>
            </View>
            <Image 
              source={require('../../../../assets/images/logo.png')} 
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
            if (errors.tripName) setErrors({ ...errors, tripName: false });
          }}
        />
        {errors.tripName && <Text className="text-red-500 text-sm -mt-3 mb-4 font-medium">Trip name is required</Text>}


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
        {errors.dates && <Text className="text-red-500 text-sm -mt-3 mb-4 font-medium">End date must be after start date</Text>}

        {/* Starting Point */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Starting Point *</Text>
        <TextInput
          className={`bg-white p-4 rounded-xl mb-4 border ${errors.startingPoint ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
          placeholder="e.g., New York, USA"
          placeholderTextColor="#9ca3af"
          value={startingPoint}
          onChangeText={(text) => {
            setStartingPoint(text);
            if (errors.startingPoint) setErrors({ ...errors, startingPoint: false });
          }}
        />
        {errors.startingPoint && <Text className="text-red-500 text-sm -mt-3 mb-4 font-medium">Starting point is required</Text>}

        {/* Destinations */}
        <View className="flex-row justify-between items-center mb-3 mt-2">
          <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider">Destinations *</Text>
          <TouchableOpacity onPress={addDestination} className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 active:bg-blue-100">
            <Text className="text-blue-900 font-bold text-xs">+ ADD</Text>
          </TouchableOpacity>
        </View>
        {errors.destinations && <Text className="text-red-500 text-sm mb-3 font-medium">At least one destination is required</Text>}
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

        {/* Photos Link */}
        <Text className="text-slate-500 font-bold mt-6 mb-2 text-xs uppercase tracking-wider">Google Drive Photos Link</Text>
        <TextInput
          className="bg-white p-4 rounded-xl border border-slate-200 text-slate-900 text-base shadow-sm"
          placeholder="https://drive.google.com/..."
          placeholderTextColor="#9ca3af"
          value={photosLink}
          onChangeText={setPhotosLink}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Submit Button */}
        <TouchableOpacity
          className={`mt-8 mb-12 p-4 rounded-xl shadow-lg active:bg-blue-800 ${loading ? 'bg-blue-500' : 'bg-blue-900'}`}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold text-lg tracking-wide">
            {loading ? 'UPDATING...' : 'UPDATE TRIP'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
