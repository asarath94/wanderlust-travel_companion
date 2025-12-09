import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { auth } from '../../firebaseConfig';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    console.log('handleResetPassword called with email:', email);
    if (!email.trim()) {
      console.log('Email is empty');
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to send reset email...');
      await sendPasswordResetEmail(auth, email);
      console.log('Reset email sent successfully');
      
      if (Platform.OS === 'web') {
        window.alert('Password reset email sent! Check your inbox.');
        router.back();
      } else {
        Alert.alert(
          'Success', 
          'Password reset email sent! Check your inbox.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      if (Platform.OS === 'web') {
        window.alert(error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  return (
    <KeyboardAwareScrollView 
      enableOnAndroid={true}
      extraScrollHeight={20}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
      className="bg-slate-50"
      keyboardShouldPersistTaps="handled"
    >
      <View className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <Text className="text-3xl font-bold text-indigo-900 mb-2 text-center">Reset Password</Text>
        <Text className="text-slate-500 mb-8 text-center">Enter your email to receive a reset link</Text>
        
        <View className="mb-8">
          <Text className="text-slate-700 font-medium mb-2 ml-1">Email</Text>
          <TextInput
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity 
          className={`bg-blue-900 p-4 rounded-lg w-full items-center shadow-md mb-6 ${loading ? 'opacity-70' : ''}`}
          onPress={handleResetPassword}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} className="items-center">
          <Text className="text-slate-600 font-medium">Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}
