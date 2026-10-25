import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth';
import { CompanyProvider } from './src/company-context';
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
          <CompanyProvider>
            <AppBody />
          </CompanyProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
