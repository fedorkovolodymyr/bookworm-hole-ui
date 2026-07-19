import axios, { type AxiosInstance } from "axios";

export function createServerApiClient(accessToken?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: process.env.API_BASE_URL,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return instance;
}
