import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sendChatMessage } from '../services/aiService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

interface Props {
  tripContext: any;
  onGenerateItinerary: () => void;
  isGenerating: boolean;
}

export default function AIChat({ tripContext, onGenerateItinerary, isGenerating }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi! I'm your AI travel assistant. I can help you plan your trip to ${tripContext.destinations.join(', ')}. Ask me anything or click "Generate Itinerary" to get a full plan!`,
      sender: 'ai',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    try {
      const responseText = await sendChatMessage(messages, userMsg.text, tripContext);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't process that. Please check your internet or API key.",
        sender: 'ai',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View className={`mb-4 max-w-[80%] ${item.sender === 'user' ? 'self-end' : 'self-start'}`}>
      <View
        className={`p-3 rounded-2xl ${
          item.sender === 'user' ? 'bg-blue-600 rounded-tr-none' : 'bg-gray-200 rounded-tl-none'
        }`}
      >
        <Text className={`${item.sender === 'user' ? 'text-white' : 'text-gray-900'}`}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior="padding" 
      className="flex-1 bg-white"
      keyboardVerticalOffset={150}
    >
      {/* Generate Button at Top */}
      <View className="px-0 pt-8 pb-4 bg-white">
        <TouchableOpacity
          className={`w-full py-4 flex-row justify-center items-center ${
            isGenerating ? 'bg-gray-100' : 'bg-purple-100'
          }`}
          onPress={onGenerateItinerary}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#9333ea" className="mr-2" />
          ) : (
            <Text className="text-xl mr-2">✨</Text>
          )}
          <Text className={`font-bold ${isGenerating ? 'text-gray-500' : 'text-purple-700'}`}>
            {isGenerating ? 'Planning your trip...' : 'Generate Full Itinerary'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        className="flex-1"
      />

      {/* Input Area Area */}
      <View className="p-4 border-t border-b border-gray-100 bg-white">
        {/* Input Area */}
        <View className="flex-row items-center">
          <TextInput
            className="flex-1 bg-gray-100 p-3 rounded-full mr-2 border border-gray-200"
            placeholder="Ask about weather, food..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            className={`w-12 h-12 rounded-full items-center justify-center ${
              sending || !inputText.trim() ? 'bg-gray-300' : 'bg-blue-600'
            }`}
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
