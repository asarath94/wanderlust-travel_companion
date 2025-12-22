import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableWithoutFeedback } from 'react-native';
import { View, TouchableOpacity } from '../../components/ShadowView';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebaseConfig';
import { useIsMobile } from '../../hooks/useResponsive';

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  participants: string[];
  adminId: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showMenu, setShowMenu] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!user || !user.email) return;

    setLoading(true);

    // Query trips where user is a participant
    const participantQuery = query(
      collection(db, 'trips'),
      where('participants', 'array-contains', user.email)
    );

    const unsubscribe = onSnapshot(participantQuery, (querySnapshot) => {
      const fetchedTrips: Trip[] = [];
      querySnapshot.forEach((doc) => {
        fetchedTrips.push({ id: doc.id, ...doc.data() } as Trip);
      });

      // Sort client-side by start date
      fetchedTrips.sort((a, b) => {
        const [dayA, monthA, yearA] = a.startDate.split('-').map(Number);
        const [dayB, monthB, yearB] = b.startDate.split('-').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      });

      setTrips(fetchedTrips);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching trips:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/(auth)/login');
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrips = trips.filter(trip => {
    const [day, month, year] = trip.endDate.split('-').map(Number);
    const endDateObj = new Date(year, month - 1, day);
    return endDateObj >= today;
  });

  const pastTrips = trips.filter(trip => {
    const [day, month, year] = trip.endDate.split('-').map(Number);
    const endDateObj = new Date(year, month - 1, day);
    return endDateObj < today;
  });

  const displayTrips = activeTab === 'upcoming' ? upcomingTrips : pastTrips;

  return (
    <TouchableWithoutFeedback onPress={() => showMenu && setShowMenu(false)}>
      <View className="flex-1 bg-slate-50">
      {/* Header */}
      {/* Header */}
      {!isMobile ? (
        <View className="bg-blue-900 px-6 shadow-md justify-center" style={{ minHeight: 120 }}>
          <View className="flex-1 flex-row justify-between items-center">
            {/* Logo - Left */}
            <View style={{ width: 315, zIndex: 1 }}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={{ width: 315, height: 90, paddingTop: 5, paddingBottom: 5 }}
                resizeMode="contain"
              />
            </View>

            {/* Text - Absolutely Centered */}
            <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 0 }}>
              <Text style={{ fontFamily: 'Cinzel-SemiBold', fontSize: 32, color: 'white', letterSpacing: 2 }}>
                WANDERLUST
              </Text>
              <Text style={{ fontFamily: 'Montserrat-SemiBold', fontSize: 14, color: 'white', letterSpacing: 4, marginTop: 2 }}>
                TRAVEL COMPANION
              </Text>
            </View>

            {/* Buttons - Right */}
            <View className="flex-row items-center" style={{ zIndex: 1 }}>
              <TouchableOpacity onPress={() => router.push('/(app)/profile' as any)} className="bg-white/20 px-4 py-2 rounded-lg mr-3 active:bg-white/30">
                <Text className="text-white font-semibold">Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} className="bg-white/20 px-4 py-2 rounded-lg active:bg-white/30">
                <Text className="text-white font-semibold">Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={() => showMenu && setShowMenu(false)}>
          <View className="bg-blue-900 pt-12 pb-3 px-4 shadow-md z-50">
            <View className="flex-row items-center justify-between relative">
              {/* Left: Logo */}
              <View style={{ zIndex: 1 }}>
                <Image 
                  source={require('../../assets/images/logo.png')} 
                  style={{ width: 60, height: 60 }} 
                  resizeMode="contain"
                />
              </View>

              {/* Center: Text */}
              <View className="absolute left-0 right-0 items-center justify-center" style={{ zIndex: 0 }}>
                <Text style={{ fontFamily: 'Cinzel-SemiBold', fontSize: 20, color: 'white', letterSpacing: 1 }}>
                  WANDERLUST
                </Text>
                <Text style={{ fontFamily: 'Montserrat-SemiBold', fontSize: 10, color: 'white', letterSpacing: 2, marginTop: 2 }}>
                  TRAVEL COMPANION
                </Text>
              </View>

              {/* Right: Menu Button */}
              <TouchableOpacity onPress={() => setShowMenu(!showMenu)} className="p-2" style={{ zIndex: 1 }}>
                <Ionicons name="ellipsis-vertical" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Dropdown Menu */}
            {showMenu && (
              <View className="absolute right-4 top-16 bg-white rounded-lg shadow-xl py-2 z-50 min-w-[150px]">
                <TouchableOpacity 
                  onPress={() => { setShowMenu(false); router.push('/(app)/profile' as any); }} 
                  className="px-4 py-3 border-b border-slate-100 flex-row items-center"
                >
                  <Ionicons name="person-outline" size={18} color="#0f172a" style={{ marginRight: 8 }} />
                  <Text className="text-slate-900 font-medium">Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => { setShowMenu(false); handleLogout(); }} 
                  className="px-4 py-3 flex-row items-center"
                >
                  <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text className="text-red-500 font-medium">Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Tabs */}
      <View className="flex-row bg-white shadow-sm z-10">
        <TouchableOpacity
          className={`flex-1 py-4 border-b-2 ${activeTab === 'upcoming' ? 'border-blue-900' : 'border-transparent'}`}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text className={`text-center font-bold text-base ${activeTab === 'upcoming' ? 'text-blue-900' : 'text-slate-500'}`}>
            Upcoming ({upcomingTrips.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-4 border-b-2 ${activeTab === 'past' ? 'border-blue-900' : 'border-transparent'}`}
          onPress={() => setActiveTab('past')}
        >
          <Text className={`text-center font-bold text-base ${activeTab === 'past' ? 'text-blue-900' : 'text-slate-500'}`}>
            Past ({pastTrips.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4338ca" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
          {displayTrips.length === 0 ? (
          <View className="flex-1 justify-center items-center mt-20">
            <Text className="text-slate-400 text-xl font-medium mb-2">No {activeTab} trips</Text>
            <Text className="text-slate-500 text-center px-8">Create your first trip to start your adventure!</Text>
          </View>
          ) : (
            displayTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                className="bg-white p-6 rounded-xl mb-4 shadow-lg border border-slate-100 active:bg-slate-50"
                onPress={() => router.push(`/(app)/trip/${trip.id}` as any)}
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-xl font-bold text-slate-900 flex-1 mr-2">{trip.name}</Text>
                  {trip.adminId !== user?.uid && (
                    <View className="bg-blue-50 px-3 py-1 rounded-full">
                      <Text className="text-blue-900 text-xs font-bold">SHARED</Text>
                    </View>
                  )}
                </View>
                
                <Text className="text-slate-600 mb-3 font-medium">
                  {trip.startDate} - {trip.endDate}
                </Text>
                
                <View className="flex-row items-center">
                  <View className="bg-amber-100 px-3 py-1 rounded-md mr-2">
                    <Text className="text-amber-800 text-xs font-bold">
                      {trip.destinations.length} DESTINATION{trip.destinations.length !== 1 ? 'S' : ''}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-sm">
                    {trip.participants.length} participant{trip.participants.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-8 right-8 bg-blue-900 px-6 py-4 rounded-full shadow-xl flex-row items-center justify-center active:bg-blue-800"
        onPress={() => router.push('/(app)/new-trip' as any)}
        activeOpacity={0.8}
      >
        <Text className="text-white font-bold text-lg">+ Add new trip</Text>
      </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}
