'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import schoolServices from '@/lib/services/schoolServices';
import appraisalServices from '@/lib/services/appraisalServices';
import uploadServices from '@/lib/services/uploadServices';
import userServices from '@/lib/services/userServices'; // Assuming you have this service

const TeacherSelfAppraisalForm = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [schools, setSchools] = useState([]);
  const [appraisalId, setAppraisalId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const { access_token } = useAuth();
  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues, reset } = useForm();
  
  // Fetch schools for the dropdown
  useEffect(() => {
    const fetchSchools = async () => {
      if (access_token) {
        const response = await schoolServices.getSchoolDropdown(access_token);
        if (response.success && response.data.data) {
          setSchools(response.data.data);
        } else {
          setError("Failed to load schools.");
        }
      }
    };
    fetchSchools();
  }, [access_token]);

  // Watch for session year changes to fetch existing appraisal data
  const sessionYearWatcher = watch("session_year");

  useEffect(() => {
    const fetchExistingAppraisal = async () => {
      if (sessionYearWatcher && access_token) {
        try {
          // Assuming the backend filters by the logged-in user via token
          const response = await appraisalServices.getAppraisals({ session_year: sessionYearWatcher }, access_token);
          if (response.success && response.data.data.length > 0) {
            const existingData = response.data.data[0];
            reset(existingData); // Populate the entire form with existing data
            setAppraisalId(existingData.id);
          } else {
            // If no record found, reset form but keep session and school
            const currentSchool = getValues("school_name");
            reset({ session_year: sessionYearWatcher, school_name: currentSchool });
            setAppraisalId(null);
          }
        } catch (err) {
          setError("Failed to check for existing appraisal.");
        }
      }
    };
    fetchExistingAppraisal();
  }, [sessionYearWatcher, access_token, reset, getValues]);

  // Function to auto-fill user data
  const handleAutoFill = useCallback(async () => {
    const schoolName = getValues("school_name");
    const employeeCode = getValues("employeeCode");

    if (schoolName && employeeCode && access_token) {
      try {
        // Assuming userServices.getUsers can filter by school_name and employee_code
        const response = await userServices.getUsers({ school_name: schoolName, employee_code: employeeCode }, access_token);
        if (response.success && response.data.data.length > 0) {
          const user = response.data.data[0];
          setValue("fullName", user.name);
          setValue("email", user.email);
          setValue("designation", user.designation || "");
          // ... pre-fill other relevant fields from the user object
        }
      } catch (err) {
        console.error("Failed to fetch user details for auto-fill:", err);
      }
    }
  }, [getValues, setValue, access_token]);

  // Function to auto-save the form as a draft
  const handleAutoSave = useCallback(async () => {
    const sessionYear = getValues("session_year");
    if (!sessionYear) return; // Don't save without a session

    setIsSaving(true);
    setError(null);
    const formData = getValues();

    try {
      if (appraisalId) {
        // Update existing appraisal
        await appraisalServices.updateAppraisal({ ...formData, id: appraisalId }, access_token);
      } else {
        // Create new appraisal draft
        const response = await appraisalServices.createAppraisal({ session_year: sessionYear }, access_token);
        if (response.success && response.data.appraisal_id) {
          const newAppraisalId = response.data.appraisal_id;
          setAppraisalId(newAppraisalId);
          // Update with the rest of the form data
          await appraisalServices.updateAppraisal({ ...formData, id: newAppraisalId }, access_token);
        } else {
          throw new Error(response.error || "Failed to create draft appraisal.");
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [getValues, appraisalId, access_token]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    setError(null);
    try {
      let finalData = { ...data };

      // 1. Handle File Upload if a new signature is provided
      if (data.teacherSignature && data.teacherSignature[0]) {
        const file = data.teacherSignature[0];
        const uploadResponse = await uploadServices.uploadSingleFile(file, 'appraisal', null, access_token);
        
        if (uploadResponse.success) {
          // Replace file object with the uploaded filename string for the database
          finalData.teacherSignature = uploadResponse.data.uploaded_file;
        } else {
          throw new Error(uploadResponse.error || "Signature upload failed.");
        }
      } else {
        // If no new file, don't try to submit the old value (if any) as a file object
        delete finalData.teacherSignature;
      }

      // Final submission logic, likely an update call with status 'submitted'
      await appraisalServices.updateAppraisal({ ...finalData, id: appraisalId, status: 'submitted' }, access_token);
      alert("Form submitted successfully!");
    } catch (err) {
      setError(err.message);
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    "Personal Info",
    "Academic",
    "Classroom",
    "Performance",
    "Co-curricular",
    "Professional",
    "Strengths",
    "Improvement",
    "Contribution",
    "Goals",
    "Conduct",
    "Self-Rating",
    "Declaration",
    "Review"
  ];

  // Generate session year options based on the current year
  const currentYear = new Date().getFullYear();
  const sessionOptions = [
    `${currentYear - 1}-${currentYear}`, // e.g., 2023-2024
    `${currentYear}-${currentYear + 1}`  // e.g., 2024-2025
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
    

      {/* Main Content */}
      <main className="flex-grow  mx-auto ">
        <div className=" bg-white ">
         
          {/* Tab Navigation */}
          <div className="p-3 sm:p-6 border-b border-gray-200">
            {/* Mobile Tab Selector */}
            <div className="lg:hidden mb-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Select Section</span>
                </label>
                <select 
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(Number(e.target.value))}
                >
                  {tabs.map((tab, index) => (
                    <option key={index} value={index}>{index + 1}. {tab}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden lg:block">
              <div className="tabs tabs-boxed mb-6 overflow-x-auto bg-gray-200 p-1 rounded-lg">
                {tabs.map((tab, index) => (
                  <a 
                    key={index}
                    className={`tab text-xs px-2 py-1 rounded-md cursor-pointer ${activeTab === index ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-blue-100'}`}
                    onClick={() => setActiveTab(index)}
                  >
                    {index + 1}. {tab}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Session and School Selection */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Session Year</span>
                </label>
                <select 
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  {...register("session_year", { required: "Session year is required." })}>
                    <option value="">Select Session</option>
                    {sessionOptions.map(session => (
                      <option key={session} value={session}>{session}</option>
                    ))}
                </select>
                {errors.session_year && <span className="text-red-500 text-xs mt-1">{errors.session_year.message}</span>}
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">School Name</span>
                </label>
                <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("school_name", { required: "School is required." })}>
                  <option value="">Select a school</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.school_name}>{school.school_name}</option>
                  ))}
                </select>
                {errors.school_name && <span className="text-red-500 text-xs mt-1">{errors.school_name.message}</span>}
              </div>
            </div>
            {isSaving && <div className="text-sm text-blue-600 mt-2">Saving...</div>}
            {error && <div className="text-sm text-red-600 mt-2">Error: {error}</div>}
          </div>
          
          <div className="p-3 sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Personal Information */}
              {activeTab === 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">1. Personal Information</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Full Name</span>
                      </label>
                      <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("fullName", { required: true })} onBlur={handleAutoSave} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Employee Code</span>
                      </label>
                      <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("employeeCode", { required: true })} onBlur={handleAutoFill} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Designation</span>
                      </label>
                      <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("designation", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Department / Subject</span>
                      </label>
                      <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("department", { required: true })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Date of Birth</span>
                      </label>
                      <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("dateOfBirth", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Gender</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("gender", { required: true })}>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Contact Number</span>
                      </label>
                      <input type="tel" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("contactNumber", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Email ID</span>
                      </label>
                      <input type="email" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("email", { required: true })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Date of Joining</span>
                      </label>
                      <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("dateOfJoining", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Total Experience (years)</span>
                      </label>
                      <input type="number" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("totalExperience", { required: true })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Highest Qualification</span>
                      </label>
                      <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("highestQualification", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Professional Qualification</span>
                      </label>
                      <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("professionalQualification")} />
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Additional Certifications</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("additionalCertifications")}></textarea>
                  </div>
                </div>
              )}

              {/* Academic Responsibilities */}
              {activeTab === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">2. Academic Responsibilities</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Classes & Subjects Taught</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("classesSubjectsTaught", { required: true })}></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Teaching Hours per Week</span>
                      </label>
                      <input type="number" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("teachingHours", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Syllabus Completion (%)</span>
                      </label>
                      <input type="number" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("syllabusCompletion", { required: true })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Lesson Planning</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("lessonPlanning", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="regularly">Regularly</option>
                        <option value="sometimes">Sometimes</option>
                        <option value="rarely">Rarely</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Use of Teaching Aids</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("teachingAids", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="regularly">Regularly</option>
                        <option value="sometimes">Sometimes</option>
                        <option value="rarely">Rarely</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Teaching Methods Adopted</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("teachingMethods", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Student Engagement Techniques</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("studentEngagement", { required: true })}></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Homework Management</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("homeworkManagement", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Remedial Classes</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("remedialClasses", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="regularly">Regularly</option>
                        <option value="sometimes">Sometimes</option>
                        <option value="rarely">Rarely</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Slow Learner Support Plan</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("slowLearnerSupport", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Classroom Management */}
              {activeTab === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">3. Classroom Management</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Classroom Discipline</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("classroomDiscipline", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Seating Plan</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("seatingPlan", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="regularly-updated">Regularly Updated</option>
                        <option value="sometimes-updated">Sometimes Updated</option>
                        <option value="rarely-updated">Rarely Updated</option>
                        <option value="not-updated">Not Updated</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Classroom Cleanliness</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("classroomCleanliness", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Notice Board</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("noticeBoardMaintenance", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="regularly-maintained">Regularly Maintained</option>
                        <option value="sometimes-maintained">Sometimes Maintained</option>
                        <option value="rarely-maintained">Rarely Maintained</option>
                        <option value="not-maintained">Not Maintained</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Behaviour Handling</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("behaviourHandling", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Inclusiveness for Special Needs</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("inclusivenessSpecialNeeds", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">PTM Interactions</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("ptmInteractions", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Student Performance & Outcomes */}
              {activeTab === 3 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">4. Student Performance & Outcomes</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-xs sm:text-sm">Class Result (%)</span>
                    </label>
                    <input type="number" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("classResult", { required: true })} />
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Board Exam Performance</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("boardExamPerformance", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Olympiad Participation</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("olympiadParticipation", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Outstanding Students</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("outstandingStudents", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Remedial & Enrichment Results</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("remedialEnrichmentResults", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Co-curricular / Extra Responsibilities */}
              {activeTab === 4 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">5. Co-curricular Activities</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Exam Duties</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("examDuties", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="regularly-performed">Regularly Performed</option>
                        <option value="sometimes-performed">Sometimes Performed</option>
                        <option value="rarely-performed">Rarely Performed</option>
                        <option value="never-performed">Never Performed</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Discipline Duties</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("disciplineDuties", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="regularly-performed">Regularly Performed</option>
                        <option value="sometimes-performed">Sometimes Performed</option>
                        <option value="rarely-performed">Rarely Performed</option>
                        <option value="never-performed">Never Performed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Event Management</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("eventManagement", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">House/Club Activities</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("houseClubActivities", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Assembly Duties</span>
                    </label>
                    <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("assemblyDuties", { required: true })}>
                      <option value="">Select Option</option>
                      <option value="regularly-performed">Regularly Performed</option>
                      <option value="sometimes-performed">Sometimes Performed</option>
                      <option value="rarely-performed">Rarely Performed</option>
                      <option value="never-performed">Never Performed</option>
                    </select>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Competition Training</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("competitionTraining", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Committee Participation</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("committeeParticipation", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Professional Development */}
              {activeTab === 5 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">6. Professional Development</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Trainings Attended</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("trainingsAttended", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Workshops Conducted</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("workshopsConducted", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Courses Completed</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("coursesCompleted", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Academic Innovation</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("academicInnovation", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Research/Publications</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("researchPublications", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Personal Strengths & Skills */}
              {activeTab === 6 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">7. Personal Strengths & Skills</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Areas of Expertise</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("areasOfExpertise", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Leadership Qualities</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("leadershipQualities", { required: true })}></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Communication</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("communicationSkills", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Time Management</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("timeManagement", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Team Collaboration</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("teamCollaboration", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Creativity</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("creativity", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Technology Usage</span>
                    </label>
                    <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("technologyUsage", { required: true })}>
                      <option value="">Select Option</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="needs-improvement">Needs Improvement</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Areas of Improvement */}
              {activeTab === 7 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">8. Areas of Improvement</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Skills to Improve</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("skillsToImprove", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Training Required</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("trainingRequired", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Weaknesses Identified</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("weaknessesIdentified", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Support Expected from School</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("supportExpected", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Contribution to School */}
              {activeTab === 8 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">9. Contribution to School</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-xs sm:text-sm">Discipline Support</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("disciplineSupport", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">School Growth Contribution</span>
                    </label>
                      <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("schoolGrowthContribution", { required: true })}></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Student Relationship</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("studentRelationship", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Colleague Relationship</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("colleagueRelationship", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Teaching Innovations</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("teachingInnovations", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Extra Initiatives</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("extraInitiatives", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Goals for Next Year */}
              {activeTab === 9 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">10. Goals for Next Year</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-xs sm:text-sm">Academic Goals</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("academicGoals", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Professional Development Goals</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("professionalDevelopmentGoals", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Student Learning Goals</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("studentLearningGoals", { required: true })}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Personal Goals</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("personalGoals", { required: true })}></textarea>
                  </div>
                </div>
              )}

              {/* Code of Conduct Compliance */}
              {activeTab === 10 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">11. Code of Conduct Compliance</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Punctuality</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("punctuality", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Dress Code</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("dressCode", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="always-followed">Always Followed</option>
                        <option value="mostly-followed">Mostly Followed</option>
                        <option value="sometimes-followed">Sometimes Followed</option>
                        <option value="rarely-followed">Rarely Followed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Ethical Behaviour</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("ethicalBehaviour", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="average">Average</option>
                        <option value="needs-improvement">Needs Improvement</option>
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Confidentiality</span>
                      </label>
                      <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("confidentiality", { required: true })}>
                        <option value="">Select Option</option>
                        <option value="always-maintained">Always Maintained</option>
                        <option value="mostly-maintained">Mostly Maintained</option>
                        <option value="sometimes-maintained">Sometimes Maintained</option>
                        <option value="rarely-maintained">Rarely Maintained</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">School Policies Adherence</span>
                    </label>
                    <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("schoolPoliciesAdherence", { required: true })}>
                      <option value="">Select Option</option>
                      <option value="always-followed">Always Followed</option>
                      <option value="mostly-followed">Mostly Followed</option>
                      <option value="sometimes-followed">Sometimes Followed</option>
                      <option value="rarely-followed">Rarely Followed</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Overall Self-Rating */}
              {activeTab === 11 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">12. Overall Self-Rating (1-10)</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Teaching Quality</span>
                      </label>
                      <input type="number" min="1" max="10" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("teachingQualityRating", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Classroom Management</span>
                      </label>
                      <input type="number" min="1" max="10" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("classroomManagementRating", { required: true })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Communication</span>
                      </label>
                      <input type="number" min="1" max="10" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("communicationRating", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Co-curricular Involvement</span>
                      </label>
                      <input type="number" min="1" max="10" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("coCurricularRating", { required: true })} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Professional Development</span>
                      </label>
                      <input type="number" min="1" max="10" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("professionalDevelopmentRating", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Student Relationship</span>
                      </label>
                      <input type="number" min="1" max="10" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("studentRelationshipRating", { required: true })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher Declaration */}
              {activeTab === 12 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">13. Teacher Declaration</h2>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" {...register("declaration", { required: true })} />
                      <span className="label-text ml-2 text-xs sm:text-sm">I declare that all information provided is true to the best of my knowledge.</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Teacher Signature</span>
                      </label>
                      <input type="file" className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none" {...register("teacherSignature", { required: true })} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Date</span>
                      </label>
                      <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("declarationDate", { required: true })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Reporting Officer / Principal Review */}
              {activeTab === 13 && (
                <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">14. Review Section</h2>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Comments by HOD</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("hodComments")}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Comments by Vice Principal</span>
                    </label>
                      <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("vicePrincipalComments")}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Comments by Principal</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("principalComments")}></textarea>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Final Rating</span>
                    </label>
                    <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("finalRating")}>
                      <option value="">Select Rating</option>
                      <option value="outstanding">Outstanding</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="satisfactory">Satisfactory</option>
                      <option value="needs-improvement">Needs Improvement</option>
                    </select>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold text-sm">Recommendations</span>
                    </label>
                    <textarea className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-24" {...register("recommendations")}></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Principal Signature</span>
                      </label>
                      <input type="file" className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none" {...register("principalSignature")} />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-semibold text-sm">Date</span>
                      </label>
                      <input type="date" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" {...register("reviewDate")} />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
                <button 
                  type="button" 
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
                  disabled={activeTab === 0}
                >
                  Previous
                </button>
                
                <button 
                  type="button" 
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setActiveTab(Math.min(tabs.length - 1, activeTab + 1))}
                  disabled={activeTab === tabs.length - 1}
                >
                  Next
                </button>
              </div>
              
              {activeTab === tabs.length - 1 && (
                <div className="flex justify-center mt-8">
                  <button type="submit" className="w-full sm:w-auto px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Submit Form</button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      
    </div>
  );
};

export default TeacherSelfAppraisalForm;