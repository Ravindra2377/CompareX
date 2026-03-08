import axios from 'axios';
import Constants from 'expo-constants';

const getApiUrl = () => {
  return 'https://comparex-8ztd.onrender.com';
};

export const API_URL = getApiUrl();
export const SCRAPER_API_URL = `${API_URL}/compare`;

const api = axios.create({
  baseURL: API_URL,
});

export default api;
