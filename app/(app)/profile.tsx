import { router } from 'expo-router';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { collection, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Text, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TouchableOpacity, View } from '../../components/ShadowView';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { useIsMobile } from '../../hooks/useResponsive';

export default function Profile() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    displayName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleUpdateName = async () => {
    if (!displayName.trim()) {
      setErrors({ ...errors, displayName: 'Name cannot be empty' });
      return;
    }

    setIsSavingName(true);
    try {
      if (user) {
        await updateProfile(user, { displayName: displayName.trim() });
        Alert.alert('Success', 'Name updated successfully!');
        setIsEditingName(false);
        setErrors({ ...errors, displayName: '' });
      }
    } catch (error: any) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name: ' + error.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    // Reset errors
    const newErrors = {
      displayName: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    // Validation
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== '')) {
      return;
    }

    setIsChangingPassword(true);
    try {
      if (!user || !user.email) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Error', 'New password is too weak');
      } else {
        Alert.alert('Error', 'Failed to change password: ' + error.message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      Alert.alert('Error', 'Please enter your password to confirm account deletion');
      return;
    }

    const confirmMessage = 'Are you sure you want to delete your account? This will permanently delete all your trips and data. This action cannot be undone.';
    
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(confirmMessage)
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Account',
            confirmMessage,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmed) return;

    setIsDeletingAccount(true);
    try {
      if (!user || !user.email) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, deleteConfirmPassword);
      await reauthenticateWithCredential(user, credential);

      // Delete user's trips (where they are admin)
      const tripsQuery = query(collection(db, 'trips'), where('adminId', '==', user.uid));
      const tripsSnapshot = await getDocs(tripsQuery);
      
      for (const tripDoc of tripsSnapshot.docs) {
        // Delete subcollections (expenses, itineraries, documents, reminders)
        const tripId = tripDoc.id;
        
        const expensesSnapshot = await getDocs(collection(db, `trips/${tripId}/expenses`));
        await Promise.all(expensesSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        const itinerariesSnapshot = await getDocs(collection(db, `trips/${tripId}/itineraries`));
        await Promise.all(itinerariesSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        const documentsSnapshot = await getDocs(collection(db, `trips/${tripId}/documents`));
        await Promise.all(documentsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        const remindersSnapshot = await getDocs(collection(db, `trips/${tripId}/reminders`));
        await Promise.all(remindersSnapshot.docs.map(doc => deleteDoc(doc.ref)));
        
        // Delete trip document
        await deleteDoc(tripDoc.ref);
      }

      // Delete user account
      await deleteUser(user);

      Alert.alert('Account Deleted', 'Your account has been permanently deleted');
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Password is incorrect');
      } else {
        Alert.alert('Error', 'Failed to delete account: ' + error.message);
      }
    } finally {
      setIsDeletingAccount(false);
      setDeleteConfirmPassword('');
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
                <Text className="text-white text-xl font-bold pb-1.5">←</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold tracking-tight">Profile</Text>
            </View>
            <Image 
              source={require('../../assets/images/logo.png')} 
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
                <Text className="text-white text-xl font-bold pb-1.5">←</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold tracking-tight">Profile</Text>
            </View>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          </View>
        </View>
      )}

      <KeyboardAwareScrollView 
        className="flex-1 p-6"
        enableOnAndroid={true}
        extraScrollHeight={160}
        extraHeight={200}
        enableAutomaticScroll={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Info */}
        <View className="bg-white p-6 rounded-xl mb-6 shadow-lg border border-slate-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider">Name</Text>
            {!isEditingName && (
              <TouchableOpacity onPress={() => setIsEditingName(true)}>
                <Text className="text-blue-900 font-bold text-sm">EDIT</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isEditingName ? (
            <>
              <TextInput
                className={`bg-white p-4 rounded-xl mb-2 border ${errors.displayName ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
                placeholder="Enter your name"
                placeholderTextColor="#64748b"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  if (errors.displayName) setErrors({ ...errors, displayName: '' });
                }}
              />
              {errors.displayName && <Text className="text-red-500 text-sm mb-3 font-medium">{errors.displayName}</Text>}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className={`flex-1 p-3 rounded-xl shadow-md active:bg-blue-800 ${isSavingName ? 'bg-blue-400' : 'bg-blue-900'}`}
                  onPress={handleUpdateName}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white text-center font-bold">SAVE</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 p-3 rounded-xl shadow-md bg-slate-200 active:bg-slate-300"
                  onPress={() => {
                    setIsEditingName(false);
                    setDisplayName(user?.displayName || '');
                    setErrors({ ...errors, displayName: '' });
                  }}
                  disabled={isSavingName}
                >
                  <Text className="text-slate-700 text-center font-bold">CANCEL</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text className="text-slate-900 text-lg font-semibold mb-4">
              {user?.displayName || 'Not set'}
            </Text>
          )}

          <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Email</Text>
          <Text className="text-slate-900 text-lg font-semibold">
            {user?.email || 'Not available'}
          </Text>
        </View>

        {/* Change Password Section */}
        <View className="bg-white p-6 rounded-xl mb-6 shadow-lg border border-slate-100">
          <Text className="text-slate-900 text-xl font-bold mb-6">Change Password</Text>

          <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Current Password *</Text>
          <TextInput
            className={`bg-white p-4 rounded-xl mb-4 border ${errors.currentPassword ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
            placeholder="Enter current password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
            }}
          />
          {errors.currentPassword && <Text className="text-red-500 text-sm mb-4 font-medium -mt-3">{errors.currentPassword}</Text>}

          <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">New Password *</Text>
          <TextInput
            className={`bg-white p-4 rounded-xl mb-4 border ${errors.newPassword ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
            placeholder="Enter new password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
            }}
          />
          {errors.newPassword && <Text className="text-red-500 text-sm mb-4 font-medium -mt-3">{errors.newPassword}</Text>}

          <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Confirm New Password *</Text>
          <TextInput
            className={`bg-white p-4 rounded-xl mb-4 border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-200'} text-slate-900 text-base shadow-sm`}
            placeholder="Confirm new password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
            }}
          />
          {errors.confirmPassword && <Text className="text-red-500 text-sm mb-4 font-medium -mt-3">{errors.confirmPassword}</Text>}

          <TouchableOpacity
            className={`p-4 rounded-xl shadow-lg active:bg-blue-800 ${isChangingPassword ? 'bg-blue-400' : 'bg-blue-900'}`}
            onPress={handleChangePassword}
            disabled={isChangingPassword}
          >
            {isChangingPassword ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg tracking-wide">CHANGE PASSWORD</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Delete Account Section */}
        <View className="bg-red-50 p-6 rounded-xl mb-12 shadow-lg border-2 border-red-300">
          <Text className="text-red-900 text-xl font-bold mb-3">⚠️ Danger Zone</Text>
          <Text className="text-red-700 mb-6 leading-6">
            Deleting your account will permanently remove all your trips, expenses, and data. This action cannot be undone.
          </Text>

          <Text className="text-slate-500 font-bold mb-2 text-xs uppercase tracking-wider">Enter Password to Confirm</Text>
          <TextInput
            className="bg-white p-4 rounded-xl mb-4 border border-red-300 shadow-sm text-slate-900 text-base"
            placeholder="Enter your password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={deleteConfirmPassword}
            onChangeText={setDeleteConfirmPassword}
          />

          <TouchableOpacity
            className={`p-4 rounded-xl shadow-lg active:bg-red-700 ${isDeletingAccount ? 'bg-red-400' : 'bg-red-600'}`}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg tracking-wide">DELETE ACCOUNT</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

