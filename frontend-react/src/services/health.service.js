import { apiRequest } from "../config/api";

export async function getApiHealth() {
  return apiRequest("/health");
}

export async function getApiReady() {
  return apiRequest("/ready");
}