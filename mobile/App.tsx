import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth';
import { RootNavigator } from './src/nav';
import { ThemeProvider, useAppTheme } from './src/theme-context';

const AppBody: React.FC = () => {
  const { theme } = useAppTheme();
  return (
    <>
      <RootNavigator />
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppBody />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
