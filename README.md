# Medical Waste Management System

> IoT-based real-time monitoring and management system for medical waste bins in healthcare facilities

[![CI Pipeline](https://github.com/[username]/medical-waste-management/workflows/CI%20Pipeline/badge.svg)](https://github.com/[username]/medical-waste-management/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

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

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/[username]/medical-waste-management.git
cd medical-waste-management
