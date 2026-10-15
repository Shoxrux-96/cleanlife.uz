import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, useAppRole } from './auth';
import { colors } from './theme';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
// Admin ekranlari
import { HomeScreen } from './screens/admin/HomeScreen';
import { OrdersScreen } from './screens/admin/OrdersScreen';
import { StoreScreen } from './screens/admin/StoreScreen';
import { FinanceScreen } from './screens/admin/FinanceScreen';
import { MoreScreen } from './screens/admin/MoreScreen';
import { ClientsScreen } from './screens/admin/ClientsScreen';
import { DeliveriesScreen } from './screens/admin/DeliveriesScreen';
import { EmployeesScreen } from './screens/admin/EmployeesScreen';
import { WaybillsScreen } from './screens/admin/WaybillsScreen';
import { PayrollScreen } from './screens/admin/PayrollScreen';
import { BonusesScreen } from './screens/admin/BonusesScreen';
import { WarehouseScreen } from './screens/admin/WarehouseScreen';
import { CalculatorScreen } from './screens/admin/CalculatorScreen';
import { AttendanceScreen } from './screens/admin/AttendanceScreen';
import { SiteCmsScreen } from './screens/admin/SiteCmsScreen';
import { SiteMessagesScreen } from './screens/admin/SiteMessagesScreen';
import { SiteContactScreen } from './screens/admin/SiteContactScreen';
import { SitePortfolioScreen } from './screens/admin/SitePortfolioScreen';
import { SiteSliderScreen } from './screens/admin/SiteSliderScreen';
// Haydovchi ekranlari
import { DriverHomeScreen } from './screens/driver/DriverHomeScreen';
import { DriverMapScreen } from './screens/driver/DriverMapScreen';
import { DriverIncomeScreen } from './screens/driver/DriverIncomeScreen';
// Xodim ekranlari
import { StaffHomeScreen } from './screens/staff/StaffHomeScreen';
import { CheckinScreen } from './screens/staff/CheckinScreen';
import { StatsScreen } from './screens/staff/StatsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.cardBorder, primary: colors.gold },
};

const tabOpts = {
  headerShown: false,
  lazy: true,
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
  tabBarActiveTintColor: colors.gold,
  tabBarInactiveTintColor: colors.muted,
};

const AdminTabs: React.FC = () => (
  <Tab.Navigator screenOptions={tabOpts}>
    <Tab.Screen name="Asosiy" component={HomeScreen} options={{ tabBarLabel: 'Asosiy' }} />
    <Tab.Screen name="Buyurtmalar" component={OrdersScreen} options={{ tabBarLabel: 'Buyurtma' }} />
    <Tab.Screen name="Ombor" component={StoreScreen} options={{ tabBarLabel: 'Ombor' }} />
    <Tab.Screen name="Moliya" component={FinanceScreen} options={{ tabBarLabel: 'Moliya' }} />
    <Tab.Screen name="Boshqa" component={MoreScreen} options={{ tabBarLabel: 'Boshqa' }} />
  </Tab.Navigator>
);

const DriverTabs: React.FC = () => (
  <Tab.Navigator screenOptions={tabOpts}>
    <Tab.Screen name="DriverHome" component={DriverHomeScreen} options={{ tabBarLabel: 'Bosh sahifa' }} />
    <Tab.Screen name="DriverMap" component={DriverMapScreen} options={{ tabBarLabel: 'Xarita' }} />
    <Tab.Screen name="DriverIncome" component={DriverIncomeScreen} options={{ tabBarLabel: 'Daromad' }} />
    <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
  </Tab.Navigator>
);

const StaffTabs: React.FC = () => (
  <Tab.Navigator screenOptions={tabOpts}>
    <Tab.Screen name="StaffHome" component={StaffHomeScreen} options={{ tabBarLabel: 'Bosh sahifa' }} />
    <Tab.Screen name="FaceID" component={CheckinScreen} options={{ tabBarLabel: 'Face ID' }} />
    <Tab.Screen name="Hisobot" component={StatsScreen} options={{ tabBarLabel: 'Hisobot' }} />
    <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
  </Tab.Navigator>
);

const Main: React.FC = () => {
  const role = useAppRole();
  if (role === 'admin') return <AdminTabs />;
  if (role === 'driver') return <DriverTabs />;
  return <StaffTabs />;
};

export const RootNavigator: React.FC = () => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : session.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminMain" component={AdminTabs} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            <Stack.Screen name="Deliveries" component={DeliveriesScreen} />
            <Stack.Screen name="Employees" component={EmployeesScreen} />
            <Stack.Screen name="Waybills" component={WaybillsScreen} />
            <Stack.Screen name="Payroll" component={PayrollScreen} />
            <Stack.Screen name="Bonuses" component={BonusesScreen} />
            <Stack.Screen name="Warehouse" component={WarehouseScreen} />
            <Stack.Screen name="Calculator" component={CalculatorScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="SiteCms" component={SiteCmsScreen} />
            <Stack.Screen name="SiteMessages" component={SiteMessagesScreen} />
            <Stack.Screen name="SiteContact" component={SiteContactScreen} />
            <Stack.Screen name="SitePortfolio" component={SitePortfolioScreen} />
            <Stack.Screen name="SiteSlider" component={SiteSliderScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="StaffMain" component={Main} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
