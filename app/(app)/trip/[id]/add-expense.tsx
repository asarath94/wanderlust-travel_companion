import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebaseConfig';
import { useIsMobile } from '../../../../hooks/useResponsive';

interface Trip {
  participants: string[];
}

export default function AddExpense() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [paidBy, setPaidBy] = useState('');
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({
    amount: '',
    description: '',
  });

  useEffect(() => {
    fetchTripParticipants();
  }, [id]);

  const fetchTripParticipants = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const tripDoc = await getDoc(doc(db, 'trips', id));
      if (tripDoc.exists()) {
        const data = tripDoc.data() as Trip;
        setTrip(data);
        setPaidBy(user?.email || data.participants[0]);
        setSplitAmong(data.participants);
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
      Alert.alert('Error', 'Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };

  const toggleSplitParticipant = (email: string) => {
    if (splitAmong.includes(email)) {
      if (splitAmong.length > 1) {
        setSplitAmong(splitAmong.filter(p => p !== email));
      } else {
        Alert.alert('Error', 'At least one person must split the expense');
      }
    } else {
      setSplitAmong([...splitAmong, email]);
    }
  };

  const handleCreateExpense = async () => {
    // Reset errors
    const newErrors = {
      amount: '',
      description: '',
    };

    // Validation
    if (!amount || amount.trim() === '') {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(Number(amount))) {
      newErrors.amount = 'Amount must be a valid number';
    } else if (Number(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 3) {
      newErrors.description = 'Description must be at least 3 characters';
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

    setSubmitting(true);
    try {
      // Helper to format date as DD-MM-YYYY
      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
      };

      const expenseData = {
        amount: Number(amount),
        description: description.trim(),
        date: formatDate(date),
        paidBy,
        splitAmong,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, `trips/${id}/expenses`), expenseData);
      
      if (Platform.OS === 'web') {
        alert('Expense added successfully!');
      } else {
        Alert.alert('Success', 'Expense added successfully!');
      }
      router.back();
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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
                <Text className="text-white text-xl font-bold pb-1">←</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold tracking-tight">Add Expense</Text>
            </View>
            <Image 
              source={require('../../../../assets/images/logo.png')} 
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
              <Text className="text-white text-2xl font-bold tracking-tight">Add Expense</Text>
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
        {/* Amount */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Amount (₹) *</Text>
        <TextInput
          className={`bg-white p-4 rounded-xl mb-4 border ${errors.amount ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-xl font-bold shadow-sm`}
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            if (errors.amount) setErrors({ ...errors, amount: '' });
          }}
        />
        {errors.amount && <Text className="text-red-500 text-sm mb-4 font-medium -mt-3">{errors.amount}</Text>}

        {/* Description */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Description *</Text>
        <TextInput
          className={`bg-white p-4 rounded-xl mb-4 border ${errors.description ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
          placeholder="e.g., Dinner at Mario's"
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            if (errors.description) setErrors({ ...errors, description: '' });
          }}
        />
        {errors.description && <Text className="text-red-500 text-sm mb-4 font-medium -mt-3">{errors.description}</Text>}

        {/* Date */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Date</Text>
        {Platform.OS === 'web' ? (
          <View className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4">
            <input
              type="date"
              value={date.toISOString().split('T')[0]}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="w-full p-4 rounded-xl text-slate-900 text-base"
              style={{
                border: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity 
              className="bg-white p-4 rounded-xl mb-4 border border-slate-200 shadow-sm"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-slate-900 text-base">
                {date.toLocaleDateString('en-GB')}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </>
        )}

        {/* Paid By */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Paid By</Text>
        <View className="mb-4">
          {trip?.participants.map((email: string) => (
            <TouchableOpacity
              key={email}
              className={`p-4 mb-2 rounded-xl border ${paidBy === email ? 'bg-blue-50 border-blue-900' : 'bg-white border-slate-200'} shadow-sm active:bg-blue-100`}
              onPress={() => setPaidBy(email)}
            >
              <View className="flex-row justify-between items-center">
                <Text className={`text-base ${paidBy === email ? 'text-blue-900 font-bold' : 'text-slate-900'}`}>
                  {email}
                </Text>
                {paidBy === email && (
                  <View className="bg-blue-900 w-5 h-5 rounded-full items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Split Among */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Split Among</Text>
        <View className="mb-6">
          {trip?.participants.map((email: string) => (
            <TouchableOpacity
              key={email}
              className={`p-4 mb-2 rounded-xl border ${splitAmong.includes(email) ? 'bg-blue-50 border-blue-900' : 'bg-white border-slate-200'} shadow-sm active:bg-blue-100`}
              onPress={() => toggleSplitParticipant(email)}
            >
              <View className="flex-row justify-between items-center">
                <Text className={`text-base ${splitAmong.includes(email) ? 'text-blue-900 font-bold' : 'text-slate-900'}`}>
                  {email}
                </Text>
                {splitAmong.includes(email) && (
                  <View className="bg-blue-900 w-5 h-5 rounded-full items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`p-4 rounded-xl items-center shadow-lg ${submitting ? 'bg-slate-400' : 'bg-blue-900 active:bg-blue-800'}`}
          onPress={handleCreateExpense}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-lg">
            {submitting ? 'Adding Expense...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
