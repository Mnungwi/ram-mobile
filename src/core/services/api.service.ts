import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import store from '../store/store';
import { clearCredentials, updateTokens } from '../store/auth.slice';

// Dynamically handle local server IP for emulators vs physical devices (using host machine's WiFi IP)
const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000/api`;
  }
  
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api'; // Android Emulator
  }
  return 'http://localhost:3000/api'; // iOS Simulator / Localhost
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Turns a relative media path (e.g. "/uploads/media/x.jpg") or bare filename
// into an absolute URL against the current API server, for <Image source={{uri}}>.
export const resolveMediaUrl = (pathOrFilename?: string | null): string | undefined => {
  if (!pathOrFilename) return undefined;
  if (/^https?:\/\//i.test(pathOrFilename)) return pathOrFilename;
  const origin = (apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '');
  const path = pathOrFilename.startsWith('/') ? pathOrFilename : `/uploads/media/${pathOrFilename}`;
  return `${origin}${path}`;
};

export const setCustomBaseUrl = async (url: string) => {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `http://${cleanUrl}`;
  }
  if (!cleanUrl.endsWith('/api') && !cleanUrl.includes('/api/')) {
    // If it doesn't end with /api, append it
    cleanUrl = cleanUrl.endsWith('/') ? `${cleanUrl}api` : `${cleanUrl}/api`;
  }
  apiClient.defaults.baseURL = cleanUrl;
  await SecureStore.setItemAsync('customServerUrl', cleanUrl);
  return cleanUrl;
};

export const getCustomBaseUrl = async () => {
  const custom = await SecureStore.getItemAsync('customServerUrl');
  if (custom) return custom;
  return getBaseUrl();
};

// Auto load custom server url on startup
SecureStore.getItemAsync('customServerUrl').then(url => {
  if (url) {
    apiClient.defaults.baseURL = url;
    console.log(`Loaded custom API base URL: ${url}`);
  }
});

// Request Interceptor: Attach current token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Attempt to load token from Redux, fallback to SecureStore
    let token = store.getState().auth.token;
    if (!token) {
      token = await SecureStore.getItemAsync('authToken');
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto refresh token on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh token logic on authentication routes
    if (originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let refreshToken = store.getState().auth.refreshToken;
        if (!refreshToken) {
          refreshToken = await SecureStore.getItemAsync('refreshToken');
        }

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call backend refresh route
        const res = await axios.post(`${getBaseUrl()}/auth/refresh`, { refreshToken });
        const { token: newAccessToken, refreshToken: newRefreshToken } = res.data.data || res.data;

        // Save new tokens
        store.dispatch(updateTokens({ token: newAccessToken, refreshToken: newRefreshToken }));
        await SecureStore.setItemAsync('authToken', newAccessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        isRefreshing = false;
        processQueue(null, newAccessToken);

        // Retry the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Session expired: Log user out
        store.dispatch(clearCredentials());
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('refreshToken');
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
