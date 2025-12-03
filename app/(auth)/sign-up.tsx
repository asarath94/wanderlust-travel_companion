import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: ''
  });

  const handleSignUp = async () => {
    // Reset errors
    setErrors({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: ''
    });

    let hasError = false;
    const newErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: ''
    };

    // Validation
    if (!name.trim()) {
      newErrors.name = 'Please enter your name';
      hasError = true;
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email';
      hasError = true;
    }

    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      hasError = true;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: name.trim()
      });

      router.replace('/(app)/dashboard');
    } catch (error: any) {
      setErrors({ ...newErrors, general: error.message });
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-50 p-6">
      <View className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <Text className="text-3xl font-bold text-indigo-900 mb-2 text-center">Create Account</Text>
        <Text className="text-gray-500 mb-8 text-center">Start planning your dream trips</Text>
        
        {errors.general ? (
          <View className="bg-red-50 p-3 rounded-lg mb-4 border border-red-200">
            <Text className="text-red-600 text-center">{errors.general}</Text>
          </View>
        ) : null}
        
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2 ml-1">Name</Text>
          <TextInput
            className={`w-full p-4 bg-gray-50 border rounded-lg text-gray-900 ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
            placeholder="Enter your name"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({...errors, name: ''});
            }}
            autoCapitalize="words"
          />
          {errors.name ? <Text className="text-red-500 text-sm mt-1 ml-1">{errors.name}</Text> : null}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2 ml-1">Email</Text>
          <TextInput
            className={`w-full p-4 bg-gray-50 border rounded-lg text-gray-900 ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({...errors, email: ''});
            }}
            autoCapitalize="none"
          />
          {errors.email ? <Text className="text-red-500 text-sm mt-1 ml-1">{errors.email}</Text> : null}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2 ml-1">Password</Text>
          <TextInput
            className={`w-full p-4 bg-gray-50 border rounded-lg text-gray-900 ${errors.password ? 'border-red-500' : 'border-gray-200'}`}
            placeholder="Choose a password (min 6 characters)"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({...errors, password: ''});
            }}
            secureTextEntry
          />
          {errors.password ? <Text className="text-red-500 text-sm mt-1 ml-1">{errors.password}</Text> : null}
        </View>

        <View className="mb-8">
          <Text className="text-gray-700 font-medium mb-2 ml-1">Confirm Password</Text>
          <TextInput
            className={`w-full p-4 bg-gray-50 border rounded-lg text-gray-900 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'}`}
            placeholder="Re-enter your password"
            placeholderTextColor="#9ca3af"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors({...errors, confirmPassword: ''});
            }}
            secureTextEntry
          />
          {errors.confirmPassword ? <Text className="text-red-500 text-sm mt-1 ml-1">{errors.confirmPassword}</Text> : null}
        </View>

        <TouchableOpacity 
          className="bg-indigo-700 p-4 rounded-lg w-full items-center shadow-md mb-6" 
          onPress={handleSignUp}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-lg">Sign Up</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-600">Already have an account? </Text>
          <Link href="/(auth)/login" className="text-indigo-700 font-bold">
            Login
          </Link>
        </View>
      </View>
    </View>
  );
}
