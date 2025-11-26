import { conf } from "../conf";
import apiRequest from "./apiRequest";

const inspectionServices = {

  // CREATE INSPECTION (superadmin or school)
  createInspection(payload, token) {
    return apiRequest(
      "POST",
      `${conf.apiBaseURL}/admin/inspections`,
      payload,
      token
    );
  },

  // UPDATE INSPECTION (superadmin or school)
  updateInspection(payload, token) {
    // Backend expects: { id: inspectionId, status, inspector_name, ... }
    return apiRequest(
      "PUT",
      `${conf.apiBaseURL}/admin/inspections`,
      payload,
      token
    );
  },

  // DELETE INSPECTION (superadmin only) — uses ?id=45
  deleteInspection(inspectionId, token) {
    return apiRequest(
      "DELETE",
      `${conf.apiBaseURL}/admin/inspections?id=${inspectionId}`,
      null,
      token
    );
  },

  // GET ALL INSPECTIONS
  getInspections(filters = {}, token) {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(
      "GET",
      `${conf.apiBaseURL}/admin/inspections?${params}`,
      null,
      token
    );
  },

  // GET SINGLE INSPECTION (via filter by id)
  getInspection(inspectionId, token) {
    return apiRequest(
      "GET",
      `${conf.apiBaseURL}/admin/inspections?id=${inspectionId}`,
      null,
      token
    );
  }
};

export default inspectionServices;
