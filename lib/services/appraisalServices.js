import { conf } from "../conf";
import apiRequest from "./apiRequest";

const appraisalServices = {
  // CREATE APPRAISAL (teacher only)
  createAppraisal(payload, token) {
    return apiRequest(
      "POST",
      `${conf.apiBaseURL}/admin/appraisals`,
      payload,
      token
    );
  },

  // UPDATE APPRAISAL (superadmin, school, or teacher depending on rules)
  updateAppraisal(payload, token) {
    // NOTE: backend expects { id: <appraisalId>, ...fields }
    return apiRequest(
      "PUT",
      `${conf.apiBaseURL}/admin/appraisals`,
      payload,
      token
    );
  },

  // DELETE APPRAISAL — SUPERADMIN ONLY — requires ?id=123
  deleteAppraisal(appraisalId, token) {
    return apiRequest(
      "DELETE",
      `${conf.apiBaseURL}/admin/appraisals?id=${appraisalId}`,
      null,
      token
    );
  },

  // GET ALL APPRAISALS (filters allowed)
  getAppraisals(filters = {}, token) {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(
      "GET",
      `${conf.apiBaseURL}/admin/appraisals?${params}`,
      null,
      token
    );
  },

  // GET SINGLE APPRAISAL — backend uses filtering by id
  getAppraisal(appraisalId, token) {
    return apiRequest(
      "GET",
      `${conf.apiBaseURL}/admin/appraisals?id=${appraisalId}`,
      null,
      token
    );
  }
};

export default appraisalServices;
