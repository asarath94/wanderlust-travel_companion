import { ScrollView, Text, View } from 'react-native';
import { DayPlan } from '../services/aiService';

interface Props {
  itinerary: DayPlan[];
}

export default function ItineraryTimeline({ itinerary }: Props) {
  return (
    <ScrollView className="flex-1 p-4 bg-gray-50">
      {itinerary.map((day, dayIndex) => (
        <View key={dayIndex} className="mb-8">
          <View className="bg-blue-600 p-3 rounded-lg mb-4 shadow-sm">
            <Text className="text-white font-bold text-lg">Day {day.day} - {day.date}</Text>
          </View>

          <View className="ml-4 border-l-2 border-blue-200 pl-4 space-y-6">
            {day.activities.map((activity, actIndex) => (
              <View key={actIndex} className="relative pb-6">
                {/* Dot on the timeline */}
                <View className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500" />
                
                <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-blue-600 font-bold">{activity.time}</Text>
                    <Text className="text-gray-400 text-xs">{activity.location}</Text>
                  </View>
                  <Text className="text-gray-900 font-semibold text-base mb-1">{activity.title}</Text>
                  <Text className="text-gray-600 text-sm leading-5">{activity.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
      <View className="h-10" />
    </ScrollView>
  );
}
