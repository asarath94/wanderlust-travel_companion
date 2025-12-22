const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// 1. Force Metro to see .css files
config.resolver.sourceExts.push("css");

// 2. CRITICAL: Windows-compatible Ignore Pattern
// This ensures Metro processes NativeWind and Interop packages on Windows.
config.resolver.transformIgnorePatterns = [
  "node_modules[\\\\/](?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop)",
];

module.exports = withNativeWind(config, { input: "./global.css" });