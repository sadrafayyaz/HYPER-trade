import api from "../api/api";

const authService = {
  async login(email, password) {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    return response.data;
  },

  async register(data) {
    const response = await api.post("/auth/register", data);

    return response.data;
  },
};

export default authService;