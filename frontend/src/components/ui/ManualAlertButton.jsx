// components/ManualAlertButton.jsx
import React, { useState } from 'react';
import axios from 'axios';

const ManualAlertButton = ({ binId, fullness, threshold }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const isOverThreshold = fullness >= threshold;

    const handleSendAlert = async () => {
        setLoading(true);
        setResult(null);

        try {
            const response = await axios.post(`/api/v1/bins/${binId}/send-alert`);

            setResult({
                success: true,
                message: 'Alert sent successfully',
                details: `${response.data.data.successCount} notifications sent`
            });
        } catch (error) {
            setResult({
                success: false,
                message: 'Failed to send alert',
                details: error.response?.data?.message || 'An error occurred'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="manual-alert-container mb-3">
            <button
                className={`btn ${isOverThreshold ? 'btn-danger' : 'btn-warning'}`}
                onClick={handleSendAlert}
                disabled={loading}
            >
                {loading ? (
                    <span>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Sending...
          </span>
                ) : (
                    <span>
            <i className="fas fa-bell me-2"></i>
            Send Manual Alert
          </span>
                )}
            </button>

            {result && (
                <div className={`alert mt-2 ${result.success ? 'alert-success' : 'alert-danger'}`}>
                    <strong>{result.message}</strong>
                    {result.details && <div className="small mt-1">{result.details}</div>}
                </div>
            )}
        </div>
    );
};

export default ManualAlertButton;