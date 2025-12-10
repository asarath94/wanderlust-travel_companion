import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(app)/dashboard');
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-slate-50 p-6">
      <View className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <Text className="text-3xl font-bold text-indigo-900 mb-2 text-center">Welcome Back</Text>
        <Text className="text-slate-500 mb-8 text-center">Sign in to continue your journey</Text>
        
        <View className="mb-4">
          <Text className="text-slate-700 font-medium mb-2 ml-1">Email</Text>
          <TextInput
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View className="mb-8">
          <Text className="text-slate-700 font-medium mb-2 ml-1">Password</Text>
          <TextInput
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity className="self-end mt-2">
              <Text className="text-blue-900 font-medium text-sm">Forgot Password?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity 
          className="bg-blue-900 p-4 rounded-lg w-full items-center shadow-md mb-6" 
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-lg">Sign In</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-slate-600">Don't have an account? </Text>
          <Link href="/(auth)/sign-up" className="text-blue-900 font-bold">
            Sign Up
          </Link>
        </View>
      </View>
    </View>
  );
}

