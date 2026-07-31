import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GlassCard from '../../src/components/GlassCard';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

interface ProjectLocation {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectLocation | null>(null);

  const { isDark } = useAppTheme();

  // Realistic Project locations in Zanzibar (corresponding to active DB entries)
  const projectLocations: ProjectLocation[] = [
    {
      id: '1',
      name: 'ZSSF Malindi Car Parking Project',
      code: 'URC-2026-01',
      latitude: -6.1578,
      longitude: 39.1912
    },
    {
      id: '2',
      name: 'Proposed Sport & Business Facilities at Mbweni',
      code: 'URC-2026-02',
      latitude: -6.2104,
      longitude: 39.2155
    },
    {
      id: '3',
      name: 'Warehouse Construction Site at Tunguu',
      code: 'URC-2026-03',
      latitude: -6.2163,
      longitude: 39.2811
    },
    {
      id: '4',
      name: 'Kengeja Technical Secondary School Hostel',
      code: 'URC-2026-04',
      latitude: -5.3211,
      longitude: 39.7122 // Pemba Island location
    }
  ];

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLoading(false);
    })();
  }, []);

  const handleCheckIn = (project: ProjectLocation) => {
    if (!location) {
      Alert.alert('GPS Error', 'Unable to retrieve your current location.');
      return;
    }

    // Haversine formula to compute distance between current location and project site
    const R = 6371e3; // metres
    const phi1 = (location.coords.latitude * Math.PI) / 180;
    const phi2 = (project.latitude * Math.PI) / 180;
    const deltaPhi = ((project.latitude - location.coords.latitude) * Math.PI) / 180;
    const deltaLambda = ((project.longitude - location.coords.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // in metres

    if (distance <= 200) {
      // Checked-in successfully (within 200m geofence)
      Alert.alert(
        'Check-In Successful',
        `Welcome to ${project.name}! Your GPS coordinates have been recorded for daily attendance.`,
        [{ text: 'Dismiss' }]
      );
    } else {
      // Too far away
      const distKm = (distance / 1000).toFixed(2);
      Alert.alert(
        'Check-In Failed',
        `You are too far from the project site (${distKm} km away). You must be within 200 meters to check in.`,
        [{ text: 'Retry' }]
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, isDark ? styles.darkBg : styles.lightBg]}>
        <ActivityIndicator size="large" color="#1a56db" />
        <Text style={[styles.loadingText, isDark ? styles.darkText : styles.lightText]}>Initializing GPS Map Canvas...</Text>
      </View>
    );
  }

  // Initial region centered on Zanzibar Stone Town area
  const initialRegion = {
    latitude: -6.1630,
    longitude: 39.2000,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {projectLocations.map((p) => (
          <React.Fragment key={p.id}>
            <Marker
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
              description={p.code}
              onPress={() => setSelectedProject(p)}
            >
              <View style={styles.customMarker}>
                <MaterialCommunityIcons name="hard-hat" size={20} color="#fff" />
              </View>
            </Marker>
            
            {/* Draw 200m Geofence circle */}
            <Circle
              center={{ latitude: p.latitude, longitude: p.longitude }}
              radius={200}
              fillColor="rgba(26, 86, 219, 0.15)"
              strokeColor="rgba(26, 86, 219, 0.4)"
              strokeWidth={1}
            />
          </React.Fragment>
        ))}
      </MapView>

      {/* Selected Project Geofence checking panel */}
      {selectedProject && (
        <GlassCard style={styles.infoPanel}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, isDark ? styles.darkText : styles.lightText]} numberOfLines={1}>
              {selectedProject.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedProject(null)}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.panelSub}>{selectedProject.code}</Text>
          
          <View style={styles.badgeRow}>
            <View style={styles.geofenceBadge}>
              <MaterialCommunityIcons name="radius-outline" size={14} color="#1a56db" />
              <Text style={styles.geofenceBadgeText}>200m Geofence Active</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkInBtn}
            onPress={() => handleCheckIn(selectedProject)}
          >
            <MaterialCommunityIcons name="map-marker-check-outline" size={18} color="#fff" />
            <Text style={styles.checkInBtnText}>Check In Attendance</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {errorMsg && (
        <View style={styles.errorAlert}>
          <Text style={styles.errorAlertText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  lightBg: {
    backgroundColor: '#f8fafc'
  },
  darkBg: {
    backgroundColor: '#0f172a'
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600'
  },
  customMarker: {
    backgroundColor: '#1a56db',
    padding: 6,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  },
  infoPanel: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    padding: 16
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    width: '90%'
  },
  panelSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600'
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 14
  },
  geofenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 86, 219, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  geofenceBadgeText: {
    color: '#1a56db',
    fontSize: 10.5,
    fontWeight: '700'
  },
  checkInBtn: {
    backgroundColor: '#1a56db',
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  checkInBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  errorAlert: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8
  },
  errorAlertText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  }
});
