const API_URL = "http://localhost:3000/api";

const marketService = {
  async prices() {
    const response = await fetch(`${API_URL}/market/prices`);

    if (!response.ok) {
      throw new Error("Failed to fetch market prices");
    }

    const result = await response.json();

    return result.data;
  },
};

export default marketService;