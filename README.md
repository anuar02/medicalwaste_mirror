# Medical Waste Management System

> IoT-based real-time monitoring and management system for medical waste bins in healthcare facilities

## 📋 Overview

A comprehensive IoT solution for medical waste management that monitors smart waste bins, tracks collection vehicles, and provides real-time analytics through an intuitive web dashboard. Built for healthcare facilities to optimize waste collection, ensure compliance, and reduce operational costs.

**Live Demo:** https://app.medicalwaste.kz

## ✨ Features

- 🗑️ **Real-time Bin Monitoring** - Track fullness, weight, and temperature from IoT sensors
- 📍 **GPS Vehicle Tracking** - Monitor collection vehicle locations and optimize routes
- 📊 **Analytics Dashboard** - Visualize waste trends, collection efficiency, and department metrics
- 🔔 **Smart Alerts** - Automated notifications when bins reach capacity thresholds
- 👥 **Role-based Access** - Admin, Supervisor, and User roles with department-level permissions
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🔐 **Secure API** - JWT authentication and API key management for IoT devices

**Tech Stack:**
- **Frontend:** React 18, React Router, React Query, Tailwind CSS, Recharts
- **Backend:** Node.js, Express.js, Mongoose, JWT, Winston
- **Database:** MongoDB with GeoJSON indexing
- **IoT:** ESP32/ESP8266 microcontrollers
- **DevOps:** GitHub Actions, PM2, Nginx

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm or yarn

## WhatsApp OTP

Phone login supports SMS and WhatsApp OTP channels. WhatsApp OTP uses Twilio Verify with the WhatsApp channel.

Backend environment variables:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_OTP_FALLBACK_TO_SMS=false
```

The login start endpoint accepts `channel: "sms"` or `channel: "whatsapp"`:

```http
POST /api/auth/phone/start
```

```json
{
  "phoneNumber": "+77051234567",
  "channel": "whatsapp"
}
```
