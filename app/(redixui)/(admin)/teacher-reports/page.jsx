"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import appraisalServices from "@/lib/services/appraisalServices";

// A simple component to display a loading spinner or message
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-10">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    <p className="ml-4 text-lg">Loading Appraisals...</p>
  </div>
);

// A component to display an error message
const ErrorDisplay = ({ message }) => (
  <div className="text-red-600 bg-red-100 p-4 rounded-md shadow-sm">
    <p>
      <strong>An error occurred:</strong> {message}
    </p>
  </div>
);

const TeacherReportsPage = () => {
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { access_token } = useAuth(); // Get token from AuthContext

  useEffect(() => {
    // Don't fetch if there's no token. The auth context will handle loading state.
    if (!access_token) {
      setLoading(false);
      return;
    }

    const fetchAppraisals = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await appraisalServices.getAppraisals({}, access_token);
        if (response.success) {
          setAppraisals(response.data.data || []); // API returns data inside a data property
        } else {
          throw new Error(response.error || "Failed to fetch appraisals.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAppraisals();
  }, [access_token]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Teacher Appraisal Reports
      </h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appraisals.length > 0 ? (
              appraisals.map((appraisal) => (
                <tr key={appraisal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{appraisal.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appraisal.school_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appraisal.session_year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appraisal.status === 'submitted' ? 'bg-green-100 text-green-800' :
                        appraisal.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                      {appraisal.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  No appraisal reports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherReportsPage;