import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth, useAppRole } from './auth';
import { useAppTheme } from './theme-context';

// Umumiy
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';

// Admin
import { HomeScreen } from './screens/admin/HomeScreen';
import { ClientsScreen } from './screens/admin/ClientsScreen';
import { OrdersScreen } from './screens/admin/OrdersScreen';
import { WaybillsScreen } from './screens/admin/WaybillsScreen';
import { DeliveriesScreen } from './screens/admin/DeliveriesScreen';
import { FinanceScreen } from './screens/admin/FinanceScreen';
import { ProductionHubScreen } from './screens/admin/ProductionHubScreen';
import { MaterialIntakeScreen } from './screens/admin/MaterialIntakeScreen';
import { ReadyProductsScreen } from './screens/admin/ReadyProductsScreen';
import { WarehouseScreen } from './screens/admin/WarehouseScreen';
import { CalculatorScreen } from './screens/admin/CalculatorScreen';
import { HrHubScreen } from './screens/admin/HrHubScreen';
import { EmployeesScreen } from './screens/admin/EmployeesScreen';
import { PayrollScreen } from './screens/admin/PayrollScreen';
import { BonusesScreen } from './screens/admin/BonusesScreen';

// Xodim
import { StaffHomeScreen } from './screens/staff/StaffHomeScreen';
import { CheckinScreen } from './screens/staff/CheckinScreen';
import { StatsScreen } from './screens/staff/StatsScreen';

// Haydovchi
import { DriverHomeScreen } from './screens/driver/DriverHomeScreen';
import { DriverMapScreen } from './screens/driver/DriverMapScreen';
import { DriverIncomeScreen } from './screens/driver/DriverIncomeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOpts = { headerShown: false } as const;

const useStackHeaderOpts = () => {
  const { colors } = useAppTheme();
  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.gold,
    headerTitleStyle: {
      color: colors.text,
      fontWeight: '800' as const,
      fontSize: 17,
      letterSpacing: 0.3,
    },
    headerTitleAlign: 'left' as const,
    headerTitleContainerStyle: { paddingLeft: 20 },
    headerLeftContainerStyle: { paddingLeft: 10 },
    headerBackTitle: '',
    headerShadowVisible: true,
    contentStyle: { backgroundColor: colors.bg },
  };
};

const HomeStack: React.FC = () => {
  const opts = useStackHeaderOpts();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Asosiy sahifa' }} />
      <Stack.Screen name="Clients" component={ClientsScreen} options={{ title: 'Mijozlar Bazasi' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Buyurtmalar' }} />
      <Stack.Screen name="Waybills" component={WaybillsScreen} options={{ title: 'Yuk Xatlari' }} />
      <Stack.Screen name="Deliveries" component={DeliveriesScreen} options={{ title: 'Yetkazib berish' }} />
      <Stack.Screen name="Finance" component={FinanceScreen} options={{ title: 'Moliya' }} />
    </Stack.Navigator>
  );
};

const ProfileStack: React.FC = () => {
  const opts = useStackHeaderOpts();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Stack.Navigator>
  );
};

const ProductionStack: React.FC = () => {
  const opts = useStackHeaderOpts();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="ProductionHub" component={ProductionHubScreen} options={{ title: 'Ishlab chiqarish' }} />
      <Stack.Screen
        name="MaterialIntake"
        component={MaterialIntakeScreen}
        options={{ title: 'Kirim Materiallari' }}
      />
      <Stack.Screen
        name="ReadyProducts"
        component={ReadyProductsScreen}
        options={{ title: 'Tayyor Mahsulotlar' }}
      />
      <Stack.Screen name="Warehouse" component={WarehouseScreen} options={{ title: 'Omborxona' }} />
      <Stack.Screen name="Calculator" component={CalculatorScreen} options={{ title: 'Kalkulyator' }} />
    </Stack.Navigator>
  );
};

const HrStack: React.FC = () => {
  const opts = useStackHeaderOpts();
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="HrHub" component={HrHubScreen} options={{ title: "HR bo'limi" }} />
      <Stack.Screen name="Employees" component={EmployeesScreen} options={{ title: 'Xodimlar' }} />
      <Stack.Screen name="Payroll" component={PayrollScreen} options={{ title: 'Ish haqi' }} />
      <Stack.Screen name="Bonuses" component={BonusesScreen} options={{ title: 'Bonuslar' }} />
    </Stack.Navigator>
  );
};

const TabIcon = (glyph: string, gold: string) => {
  const Icon = ({ focused }: { focused: boolean }) => (
  <View
    style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focused ? gold + '22' : 'transparent',
      borderWidth: focused ? 1 : 0,
      borderColor: gold + '55',
    }}
  >
    <Text style={{ fontSize: 18 }}>{glyph}</Text>
  </View>
  );
  return Icon;
};

const AdminTabs: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarLabel: 'Asosiy', tabBarIcon: TabIcon('🏠', colors.gold) }}
      />
      <Tab.Screen
        name="ProductionTab"
        component={ProductionStack}
        options={{ tabBarLabel: 'Ishlab chiq.', tabBarIcon: TabIcon('🏭', colors.gold) }}
      />
      <Tab.Screen
        name="HrTab"
        component={HrStack}
        options={{ tabBarLabel: "HR bo'limi", tabBarIcon: TabIcon('👥', colors.gold) }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profil', tabBarIcon: TabIcon('👤', colors.gold) }}
      />
    </Tab.Navigator>
  );
};

const StaffTabs: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      initialRouteName="StaffHome"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="StaffHome"
        component={StaffHomeScreen}
        options={{
          tabBarLabel: 'Asosiy',
          tabBarIcon: TabIcon('🏠', colors.gold),
        }}
      />
      <Tab.Screen
        name="Checkin"
        component={CheckinScreen}
        options={{
          tabBarLabel: 'Face ID',
          tabBarIcon: TabIcon('👁️', colors.gold),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Davomat',
          tabBarIcon: TabIcon('📅', colors.gold),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: TabIcon('👤', colors.gold),
        }}
      />
    </Tab.Navigator>
  );
};

const DriverTabs: React.FC = () => {
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      initialRouteName="DriverHome"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
      }}
    >
      <Tab.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{
          tabBarLabel: 'Asosiy',
          tabBarIcon: TabIcon('🏠', colors.gold),
        }}
      />
      <Tab.Screen
        name="DriverIncome"
        component={DriverIncomeScreen}
        options={{
          tabBarLabel: 'Yetkazish',
          tabBarIcon: TabIcon('📦', colors.gold),
        }}
      />
      <Tab.Screen
        name="DriverMap"
        component={DriverMapScreen}
        options={{
          tabBarLabel: 'Xarita',
          tabBarIcon: TabIcon('🗺️', colors.gold),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: TabIcon('👤', colors.gold),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { session, loading } = useAuth();
  const role = useAppRole();
  const { theme, colors } = useAppTheme();

  const navTheme = {
    ...(theme === 'light' ? DefaultTheme : DarkTheme),
    colors: {
      ...(theme === 'light' ? DefaultTheme.colors : DarkTheme.colors),
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.cardBorder,
      primary: colors.gold,
    },
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!session) {
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={screenOpts}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  const Target =
    role === 'admin' ? AdminTabs : role === 'driver' ? DriverTabs : StaffTabs;

  return (
    <NavigationContainer theme={navTheme}>
      <Target />
    </NavigationContainer>
  );
};
