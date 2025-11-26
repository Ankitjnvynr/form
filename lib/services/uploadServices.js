import { conf } from "../conf";

/**
 * Upload a single admin asset
 *
 * endpoint:
 *   POST conf.apiBaseURL + "/admin/upload"
 *
 * @param {File} file
 * @param {string} folder
 * @param {string|null} oldFile
 * @param {string} token
 */
async function uploadSingleFile(file, folder, oldFile = null, token = null) {
    try {
        const form = new FormData();
        form.append("folder", folder);
        form.append("file", file);
        if (oldFile) form.append("old_file", oldFile);

        const response = await fetch(`${conf.apiBaseURL}/admin/upload`, {
            method: "POST",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: form,
        });

        const data = await response.json();
        console.log(data)
        if (!response.ok || data.status === false) {
            return {
                success: false,
                status: response.status,
                error: data.message || "Upload failed",
                data,
            };
        }

        return {
            success: true,
            status: response.status,
            data,
        };
    } catch (err) {
        return {
            success: false,
            status: 0,
            error: err.message,
        };
    }
}

/**
 * Bulk upload (one file at a time)
 */
async function uploadMultipleFiles(filesArray, folder, token) {
    const results = [];

    for (let file of filesArray) {
        const res = await uploadSingleFile(file, folder, null, token);
        results.push(res);
    }

    return results;
}

const uploadServices = {
    uploadSingleFile,
    uploadMultipleFiles,
};

export default uploadServices;
