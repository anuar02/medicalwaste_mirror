// components/TelegramSettings.jsx
import React, { useState } from 'react';
import axios from 'axios';

const TelegramSettings = ({ user, onUpdate }) => {
    const [chatId, setChatId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const isConnected = user?.telegram?.active && user?.telegram?.chatId;
    const receiveNotifications = user?.notificationPreferences?.receiveAlerts;

    const handleConnect = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/v1/telegram/connect', { chatId });
            setSuccess('Telegram successfully connected!');
            onUpdate(response.data.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to connect Telegram');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/v1/telegram/disconnect');
            setSuccess('Telegram disconnected successfully');
            onUpdate(response.data.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to disconnect Telegram');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleNotifications = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/v1/telegram/toggle-notifications', {
                receiveAlerts: !receiveNotifications
            });
            setSuccess(`Notifications ${!receiveNotifications ? 'enabled' : 'disabled'} successfully`);
            onUpdate(response.data.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update notification settings');
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await axios.post('/api/v1/telegram/test-notification');
            setSuccess('Test notification sent! Check your Telegram.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send test notification');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                    <i className="fab fa-telegram-plane me-2 text-primary"></i>
                    Telegram Notifications
                </h5>
                {isConnected && (
                    <span className="badge bg-success">Connected</span>
                )}
            </div>

            <div className="card-body">
                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success" role="alert">
                        {success}
                    </div>
                )}

                {!isConnected ? (
                    <div>
                        <p>
                            Connect your Telegram account to receive waste bin alert notifications.
                        </p>

                        <div className="mb-4">
                            <h6>How to connect:</h6>
                            <ol className="ps-3">
                                <li>Open Telegram and search for <strong>@your_bot_name</strong></li>
                                <li>Start the bot by clicking "Start" or sending <code>/start</code></li>
                                <li>The bot will send you your Chat ID</li>
                                <li>Copy the Chat ID and paste it below</li>
                            </ol>
                        </div>

                        <form onSubmit={handleConnect}>
                            <div className="mb-3">
                                <label htmlFor="chatId" className="form-label">
                                    Telegram Chat ID
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="chatId"
                                    value={chatId}
                                    onChange={(e) => setChatId(e.target.value)}
                                    placeholder="Enter your Telegram Chat ID"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Connecting...' : 'Connect Telegram'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div>
                        <p>
                            Your Telegram account is connected and {receiveNotifications ? (
                            <span className="text-success">receiving notifications</span>
                        ) : (
                            <span className="text-danger">not receiving notifications</span>
                        )}.
                        </p>

                        <div className="d-flex flex-wrap gap-2 mt-3">
                            <button
                                className="btn btn-outline-primary"
                                onClick={handleTestNotification}
                                disabled={loading || !receiveNotifications}
                            >
                                Send Test Notification
                            </button>

                            <button
                                className={`btn ${receiveNotifications ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                onClick={handleToggleNotifications}
                                disabled={loading}
                            >
                                {receiveNotifications ? 'Disable Notifications' : 'Enable Notifications'}
                            </button>

                            <button
                                className="btn btn-outline-danger"
                                onClick={handleDisconnect}
                                disabled={loading}
                            >
                                Disconnect Telegram
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TelegramSettings;