import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/core/store/store';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function TabsLayout() {
  const { isDark } = useAppTheme();
  const { permissions } = useSelector((state: RootState) => state.auth);

  // Permissions haven't loaded yet for this session (e.g. very first render) —
  // show every tab rather than flashing an empty tab bar.
  const hasPermission = (p: string) => permissions.length === 0 || permissions.includes(p);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
        },
        headerTitleStyle: {
          color: isDark ? '#ffffff' : '#0f172a',
          fontWeight: '700',
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarActiveTintColor: '#1a56db',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500'
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          )
        }}
      />
      
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarLabel: 'Projects',
          href: hasPermission('project:view') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="briefcase-outline" size={size} color={color} />
          )
        }}
      />

      <Tabs.Screen
        name="letters"
        options={{
          title: 'Correspondence',
          tabBarLabel: 'Letters',
          href: hasPermission('letter:view') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="email-multiple-outline" size={size} color={color} />
          )
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Project Map',
          tabBarLabel: 'Map',
          href: hasPermission('project:view') ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius-outline" size={size} color={color} />
          )
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
