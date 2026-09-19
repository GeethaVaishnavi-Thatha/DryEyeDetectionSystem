# 👁️ Smart Dry Eye Detection System

> **AI-Based Real-Time Eye Health Monitoring Using Computer Vision**

![Theme](https://img.shields.io/badge/Theme-Healthcare%20AI-00f0ff?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-4.9-green?style=for-the-badge&logo=opencv&logoColor=white)
![Mediapipe](https://img.shields.io/badge/Mediapipe-0.10-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)

---

## 📖 Project Overview

The **Smart Dry Eye Detection System** is an advanced AI healthcare web application designed to combat digital eye strain and dry eye syndrome caused by excessive screen exposure. By leveraging state-of-the-art Computer Vision algorithms (OpenCV & Mediapipe Face Mesh), the system continuously monitors the user's eye landmarks in real time, tracks blinking frequency, calculates the Eye Aspect Ratio (EAR), and provides proactive health alerts.

---

## ✨ Key Features

1. **🏥 Home Page & About Section**: Premium neon healthcare design explaining Dry Eye Syndrome, the importance of blinking, and system benefits.
2. **📹 Real-Time Webcam Detection**: Live facial landmark tracking using OpenCV and Mediapipe Face Mesh.
3. **👁️ Blink Detection & EAR Calculation**: Real-time Eye Aspect Ratio (EAR) computation to accurately classify eye status (`Open`, `Closed`, `Dry Eye Risk`).
4. **⏱️ Screen Time & Fatigue Monitoring**: Continuous tracking of session duration with automated "Take Eye Rest" popups.
5. **📊 Dry Eye Risk Analysis**: Multi-factor AI analysis categorizing users into `Low Risk`, `Moderate Risk`, or `High Risk`.
6. **🚨 Intelligent Alert System**: Visual popup notifications, warning cards, and synthesized voice alerts (e.g., *"Please Blink More"*, *"Follow the 20-20-20 Rule"*).
7. **📈 Modern Analytics Dashboard**: Interactive charts, progress bars, and vital health indicators.
8. **💡 Health Recommendations**: Actionable tips to reduce eye fatigue and maintain hydration.
9. **🧘 Eye Exercise Page**: Guided, animated eye relaxation routines with built-in interactive timers.
10. **🌓 Dark/Light Mode**: Full support for both futuristic dark mode and clean medical light mode.
11. **📥 CSV Report Export**: Downloadable session analytics for medical review.

---

## 📂 Project Structure

```bash
├── backend/
│   ├── app.py                 # Flask REST API & Video Streaming Server
│   ├── requirements.txt       # Python Dependencies
│   ├── models/
│   │   └── ear_calc.py        # Eye Aspect Ratio & Risk Math Models
│   └── utils/
│       └── detector.py        # OpenCV & Mediapipe Face Mesh Wrapper
├── src/                       # React 19 Frontend Codebase
│   ├── App.tsx                # Main Application Entry & Routing
│   ├── index.css              # Tailwind CSS & Custom Neon Glassmorphism
│   └── main.tsx               # React DOM Mounting
├── templates/                 # Flask HTML Templates
├── static/                    # Flask Static Assets
├── assets/                    # Generated CSV Reports & Media Assets
└── README.md                  # System Documentation
```

---

## 🚀 Getting Started

### 1️⃣ Running the React Frontend (Standalone AI Simulation / API Client)
The frontend is built with Vite, React 19, and Tailwind CSS. It features a fully interactive AI Vision mode that works instantly in your browser.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 2️⃣ Running the Python Backend (Optional Live OpenCV Server)
If you wish to run the local Python Flask server for raw OpenCV video feeds:

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run Flask server
python app.py
```
The server will start on `http://localhost:5000`.

---

## 🔬 Mathematical Formulation: Eye Aspect Ratio (EAR)

The Eye Aspect Ratio is calculated using the Euclidean distances between 6 facial landmarks per eye:

$$\text{EAR} = \frac{||P_2 - P_6|| + ||P_3 - P_5||}{2 \cdot ||P_1 - P_4||}$$

When the user blinks, the EAR drops rapidly toward zero. A threshold of `0.21` is used to detect complete eye closures.

---

## 📜 License & Disclaimer
This project is developed for educational and preliminary screening purposes. It is not a replacement for professional medical diagnosis or ophthalmology consultation.
