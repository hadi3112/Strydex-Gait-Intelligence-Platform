# 🦿 Strydex Gait Intelligence Platform – Mobile Interface

An **Expo React Native** application for visualizing and monitoring real-time IMU and gait data from an **ESP32-based exoskeleton system** via **MQTT**.  
Built as part of the **Strydex Gait Intelligence Platform**, this app provides clinicians and researchers with live motion data, phase tracking, and progress visualization.

---

## 🚀 Features

- 📡 **MQTT Integration** — Real-time streaming from ESP32 (via `test.mosquitto.org` or custom broker).  
- ⚙️ **IMU Data Visualization** — Displays accelerometer and gyroscope readings in real time.  
- 💬 **Text Message Channel** — Displays general communication messages from device to app.  
- 📊 **Message Logging** — Keeps a live log of incoming MQTT messages with timestamps.  
- 🩺 **Physician-Oriented Dashboard** — Offers a clear, color-coded interface for monitoring session activity.  

---

## 🧠 Tech Stack

- **React Native (Expo SDK 54)**  
- **MQTT over WebSockets (react_native_mqtt, Paho Client)**  
- **AsyncStorage** for caching session data  
- **Firebase (optional)** for report uploads and data visualization (to be integrated)  
- **ESP32** as the hardware MQTT publisher  

---

## ⚙️ Installation & Local Setup

### **1️⃣ Prerequisites**

- [Node.js](https://nodejs.org/) ≥ 18  
- [npm](https://www.npmjs.com/) or [yarn](https://classic.yarnpkg.com/)  
- [Expo CLI](https://docs.expo.dev/get-started/installation/)  

```bash
npm install -g expo-cli
```

## 2️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/strydex-gait-intelligence-app.git
cd strydex-gait-intelligence-app
```

## 3️⃣ Install Dependencies

This will install React Native, Expo, MQTT libraries, and AsyncStorage.
```bash
npm install
```

## 4️⃣ Start the Development Server

```bash
npm start
```

or (preferred):

```bash
expo start
```


## 5️⃣ Run the App

You can run the app on theExpo Go App (install it on your Android/iOS first, its Free)
Scan the QR code from the terminal or Expo DevTools.

- 💻 Web Browser                       ---> npm run web
- 🧰 Android Emulator / iOS Simulator  ---> npm run android or npm run ios

## 🌐 MQTT Configuration

By default, the app connects to:

```yaml
Broker: test.mosquitto.org  
Port: 8080 (WebSocket)
Topics:
  - esp32/imu
  - esp32/text_message
```

To use a custom MQTT broker, modify the following lines in App.js:

```javascript
const brokerHost = 'test.mosquitto.org';
const brokerPort = 8080;
```

You can replace these with your own broker IP and port if running a local Mosquitto server.

## 📁 Project Structure

```perl
.
├── App.js                # Main app logic & UI
├── package.json          # Dependencies and scripts
├── package-lock.json
└── README.md             # Project documentation

```

#🧩 Troubleshooting

| Issue | Possible Fix |
|-------|---------------|
| **Connection failed to MQTT broker** | Ensure port `8080` supports WebSocket on your MQTT server |
| **Expo app stuck on "Connecting"** | Clear Expo cache: `expo start -c` |
| **Cannot find AsyncStorage** | Reinstall module: `npm install @react-native-async-storage/async-storage` |


