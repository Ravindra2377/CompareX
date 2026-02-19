import axios from 'axios';
import Constants from 'expo-constants';

const getApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8080`;
  }
  return 'http://localhost:8080';
};

export const API_URL = getApiUrl();
export const SCRAPER_API_URL = `${API_URL}/compare`;

const api = axios.create({
  baseURL: API_URL,
});

export default api;
