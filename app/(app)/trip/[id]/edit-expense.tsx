import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebaseConfig';
import { useIsMobile } from '../../../../hooks/useResponsive';

interface Trip {
  participants: string[];
  adminId: string;
}

interface Expense {
  amount: number;
  description: string;
  date: string;
  paidBy: string;
  splitAmong: string[];
  createdBy: string;
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

export default function EditExpense() {
  const { id, expenseId } = useLocalSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [canEdit, setCanEdit] = useState(false);

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
    fetchData();
  }, [id, expenseId]);

  const fetchData = async () => {
    if (!id || typeof id !== 'string' || !expenseId || typeof expenseId !== 'string') return;
    
    setLoading(true);
    try {
      // Fetch trip data
      const tripDoc = await getDoc(doc(db, 'trips', id));
      if (!tripDoc.exists()) {
        Alert.alert('Error', 'Trip not found');
        router.back();
        return;
      }
      
      const tripData = tripDoc.data() as Trip;
      setTrip(tripData);

      // Fetch expense data
      const expenseDoc = await getDoc(doc(db, `trips/${id}/expenses`, expenseId));
      if (!expenseDoc.exists()) {
        Alert.alert('Error', 'Expense not found');
        router.back();
        return;
      }

      const expenseData = expenseDoc.data() as Expense;
      setExpense(expenseData);

      // Check if user can edit (creator or trip admin)
      const isCreator = expenseData.createdBy === user?.uid;
      const isAdmin = tripData.adminId === user?.uid;
      
      if (!isCreator && !isAdmin) {
        Alert.alert('Error', 'You do not have permission to edit this expense');
        router.back();
        return;
      }
      
      setCanEdit(true);

      // Pre-populate form
      setAmount(expenseData.amount.toString());
      setDescription(expenseData.description);
      setPaidBy(expenseData.paidBy);
      setSplitAmong(expenseData.splitAmong);

      // Parse date from DD-MM-YYYY
      if (expenseData.date) {
        const [day, month, year] = expenseData.date.split('-');
        setDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load expense details');
      router.back();
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

  const handleUpdateExpense = async () => {
    if (!id || typeof id !== 'string' || !expenseId || typeof expenseId !== 'string' || !canEdit) return;

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
      Alert.alert('Validation Error', 'Please correct the errors in the form');
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
      };

      await updateDoc(doc(db, `trips/${id}/expenses`, expenseId), expenseData);
      
      Alert.alert('Success', 'Expense updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating expense:', error);
      Alert.alert('Error', 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!id || typeof id !== 'string' || !expenseId || typeof expenseId !== 'string' || !canEdit) return;

    confirmAction(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      async () => {
        setDeleting(true);
        try {
          await deleteDoc(doc(db, `trips/${id}/expenses`, expenseId));
          Alert.alert('Success', 'Expense deleted successfully');
          router.back();
        } catch (error) {
          console.error('Error deleting expense:', error);
          Alert.alert('Error', 'Failed to delete expense');
          setDeleting(false);
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

  if (!trip || !expense || !canEdit) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <Text className="text-slate-500">Unable to load expense</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-blue-600 px-6 py-3 rounded">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
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
              <Text className="text-white text-2xl font-bold tracking-tight">Edit Expense</Text>
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
              <Text className="text-white text-2xl font-bold tracking-tight">Edit Expense</Text>
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
          <input
            type="date"
            value={date.toISOString().split('T')[0]}
            onChange={(e) => setDate(new Date(e.target.value))}
            style={{
              width: '100%',
              padding: '16px',
              marginBottom: '16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              fontSize: '16px',
              backgroundColor: 'white',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          />
        ) : (
          <>
            <TouchableOpacity
              className="bg-white p-4 rounded-xl mb-4 border border-slate-200 shadow-sm"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-slate-900 text-base">{date.toLocaleDateString()}</Text>
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
        <View className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden shadow-sm">
          {trip?.participants.map((email) => (
            <TouchableOpacity
              key={email}
              className={`p-4 border-b border-slate-100 flex-row items-center justify-between active:bg-slate-50 ${paidBy === email ? 'bg-blue-50' : ''}`}
              onPress={() => setPaidBy(email)}
            >
              <Text className={`text-base ${paidBy === email ? 'text-blue-900 font-bold' : 'text-slate-700'}`}>
                {email === user?.email ? 'You' : email}
              </Text>
              {paidBy === email && <Text className="text-blue-900 font-bold">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Split Among */}
        <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Split Among</Text>
        <View className="bg-white rounded-xl border border-slate-200 mb-8 overflow-hidden shadow-sm">
          {trip?.participants.map((email) => (
            <TouchableOpacity
              key={email}
              className="p-4 border-b border-slate-100 flex-row items-center active:bg-slate-50"
              onPress={() => toggleSplitParticipant(email)}
            >
              <View className={`w-6 h-6 rounded-md border mr-3 items-center justify-center ${splitAmong.includes(email) ? 'bg-blue-700 border-blue-700' : 'border-slate-300 bg-slate-50'}`}>
                {splitAmong.includes(email) && <Text className="text-white text-xs font-bold">✓</Text>}
              </View>
              <Text className={`text-base ${splitAmong.includes(email) ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                {email === user?.email ? 'You' : email}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Update Button */}
        <TouchableOpacity
          className={`p-4 rounded-xl mb-4 shadow-lg active:bg-blue-800 ${submitting ? 'bg-blue-500' : 'bg-blue-900'}`}
          onPress={handleUpdateExpense}
          disabled={submitting || deleting}
        >
          <Text className="text-white text-center font-bold text-lg tracking-wide">
            {submitting ? 'UPDATING...' : 'UPDATE EXPENSE'}
          </Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          className={`p-4 rounded-xl mb-12 shadow-lg active:bg-red-700 ${deleting ? 'bg-red-400' : 'bg-red-600'}`}
          onPress={handleDeleteExpense}
          disabled={submitting || deleting}
        >
          <Text className="text-white text-center font-bold text-lg tracking-wide">
            {deleting ? 'DELETING...' : 'DELETE EXPENSE'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
