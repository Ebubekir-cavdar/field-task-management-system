import React from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from './src/store/useAuthStore';

import { useThemeStore } from './src/store/useThemeStore';
import { lightTheme, darkTheme } from './src/theme';

// Ekran (Screen) Bileşenleri
import LoginRegisterScreen from './src/screens/LoginRegisterScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import TaskLogsScreen from './src/screens/TaskLogsScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';

// React Navigation için Native Stack Yönlendirici Örneği Oluşturulur
const Stack = createNativeStackNavigator();

/**
 * Mobil Uygulama Ana Giriş Bileşeni (App Component).
 * Kullanıcının oturum açıp açmadığını kontrol eder ve ekran navigasyonunu yönetir.
 */
export default function App() {
  // Zustand Auth Store'dan kullanıcı durumu çekilir
  const { user, isLoading } = useAuthStore();
  // Zustand Theme Store'dan karanlık mod durumu çekilir
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Yüklenme devam ediyorken Spinner gösterilir
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    // Tüm navigasyon yapısını kapsayan ana konteyner
    <NavigationContainer>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Ekranlar arası geçişi sağlayan Stack Navigator */}
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.card,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        {/* Şartlı Yönlendirme (Conditional Rendering):
            Oturum açmış bir kullanıcı (user) YOKSA Giriş/Kayıt ekranını göster.
            Kullanıcı VARSA Görev listesi ve detay ekranlarını aç. */}
        {!user ? (
          <Stack.Screen
            name="LoginRegister"
            component={LoginRegisterScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            {/* Görevlerim Ekranı (Ana Ekran) */}
            <Stack.Screen
              name="MyTasks"
              component={MyTasksScreen}
              options={{ headerShown: false }}
            />
            {/* Görev Detayı Ekranı */}
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ title: 'Görev Detayı' }}
            />
            {/* Görev Geçmiş Logları Ekranı */}
            <Stack.Screen
              name="TaskLogs"
              component={TaskLogsScreen}
              options={{ title: 'Görev Hareketleri' }}
            />
            {/* Yeni Görev Oluşturma Ekranı (Modal) */}
            <Stack.Screen
              name="CreateTask"
              component={CreateTaskScreen}
              options={{ title: 'Yeni Görev', presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Yüklenme Ekranı Stili
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


