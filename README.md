# 🌍 Wanderlust Travel Companion

**Live App:** [https://wanderlust-travel-companion-git-main-saraths-projects-a1d83397.vercel.app/](https://wanderlust-travel-companion-git-main-saraths-projects-a1d83397.vercel.app/)

Wanderlust is a comprehensive travel planning application designed to make group trips seamless and enjoyable. From AI-powered itinerary generation to expense splitting and document management, Wanderlust handles all the logistics so you can focus on the adventure.

## ✨ Key Features

### 🤖 AI-Powered Planning
- **Smart Itineraries:** Generate detailed day-by-day itineraries based on your destination and dates using Gemini AI.
- **AI Chat Assistant:** Ask questions about local attractions, food, or weather directly within the app.

### 💰 Expense Management
- **Split Costs:** Easily record expenses and split them among trip participants.
- **Balances:** View real-time balances to see who owes whom.
- **Settle Up:** Mark debts as paid and track settlement status.

### 📂 Trip Vault
- **Document Storage:** Securely upload and store important travel documents (tickets, IDs, bookings).
- **Manage Files:** Rename and delete files as needed.
- **Quick Access:** Access your documents anytime, anywhere.

### 📅 Organization
- **Reminders:** Set local notifications for flights, check-ins, and activities.
- **Trip Details:** Keep track of dates, starting points, and destinations.
- **Collaborative:** Add participants to share the plan (future feature).

### 📱 Cross-Platform
- **Responsive Design:** Works beautifully on both Web and Mobile (iOS/Android).
- **Real-time Updates:** Data syncs instantly across devices using Firebase.

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo), TypeScript, NativeWind (Tailwind CSS)
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **AI:** Google Gemini API
- **Deployment:** Vercel (Web), EAS (Mobile)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/asarath94/wanderlust-travel_companion.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file with your API keys:
   ```env
   EXPO_PUBLIC_AI_API_KEY=your_gemini_api_key
   EXPO_PUBLIC_AI_MODEL=gemini-2.0-flash-exp
   ```

4. **Run the app**
   ```bash
   npx expo start
   ```

## 📄 License

This project is for educational and personal use.
