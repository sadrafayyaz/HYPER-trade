import api from "../api/api";

const dashboardService = {

  async summary() {

    const { data } = await api.get("/dashboard/summary");

    return data.data;

  }

};

export default dashboardService;