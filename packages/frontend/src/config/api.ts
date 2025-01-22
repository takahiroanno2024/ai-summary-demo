export const getApiUrl = () => {
  const host = window.location.hostname;
  return `http://${host}:3001/api`;
};

export const API_URL = getApiUrl();