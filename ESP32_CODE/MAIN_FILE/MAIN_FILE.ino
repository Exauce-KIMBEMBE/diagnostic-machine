#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>

// =====================================================
// CONFIGURATION GÉNÉRALE
// =====================================================

const char* API_URL =
  "https://diagnostic-machine-api.onrender.com/api/measurements";

constexpr int MACHINE_ID = 1;

const char* CONFIG_AP_SSID = "Diagnostic-Machine";
const char* CONFIG_AP_PASSWORD = "12345678";

constexpr unsigned long WIFI_CONNECTION_TIMEOUT = 20000;
constexpr unsigned long SEND_INTERVAL = 3000;
constexpr unsigned long WIFI_RETRY_INTERVAL = 30000;

// =====================================================
// CONFIGURATION DES TROIS PZEM
// =====================================================

// Ligne 1 logique : UART1
constexpr uint8_t L1_RX_PIN = 16;
constexpr uint8_t L1_TX_PIN = 17;
constexpr uint8_t L1_ADDRESS = 0x03;

// Ligne 2 logique : UART2
constexpr uint8_t L2_RX_PIN = 26;
constexpr uint8_t L2_TX_PIN = 27;
constexpr uint8_t L2_ADDRESS = 0x01;

// Ligne 3 logique : UART0
constexpr uint8_t L3_RX_PIN = 3;
constexpr uint8_t L3_TX_PIN = 1;
constexpr uint8_t L3_ADDRESS = 0x02;

// =====================================================
// CONFIGURATION DU YF-S201
// =====================================================

constexpr uint8_t FLOW_SENSOR_PIN = 25;

// Valeur à modifier lors de la calibration.
// Débit en L/min = fréquence en Hz / facteur.
constexpr float FLOW_CALIBRATION_FACTOR = 7.5f;

// =====================================================
// OBJETS UART ET PZEM
// =====================================================

HardwareSerial uartL1(1);
HardwareSerial uartL2(2);
HardwareSerial uartL3(0);

PZEM004Tv30 pzemL1(
  uartL1,
  L1_RX_PIN,
  L1_TX_PIN,
  L1_ADDRESS
);

PZEM004Tv30 pzemL2(
  uartL2,
  L2_RX_PIN,
  L2_TX_PIN,
  L2_ADDRESS
);

PZEM004Tv30 pzemL3(
  uartL3,
  L3_RX_PIN,
  L3_TX_PIN,
  L3_ADDRESS
);

WebServer webServer(80);
DNSServer dnsServer;
Preferences preferences;

// =====================================================
// STRUCTURE DES MESURES ÉLECTRIQUES
// =====================================================

struct ElectricalData {
  float voltage;
  float current;
  float power;
  float energy;
  float frequency;
  float powerFactor;
  bool valid;
};

// =====================================================
// VARIABLES GLOBALES
// =====================================================

String savedSsid;
String savedPassword;

bool configurationPortalActive = false;

unsigned long lastSendTime = 0;
unsigned long lastWiFiRetry = 0;
unsigned long lastFlowCalculationTime = 0;

volatile uint32_t flowPulseCount = 0;

float flowRateLMin = 0.0f;
float totalVolumeLiters = 0.0f;

// =====================================================
// INTERRUPTION DU DÉBITMÈTRE
// =====================================================

void IRAM_ATTR countFlowPulse() {
  flowPulseCount++;
}

// =====================================================
// PAGE DE CONFIGURATION WI-FI
// =====================================================

String buildConfigurationPage(
  const String& message = ""
) {
  String options = "";

  int networkCount = WiFi.scanNetworks();

  if (networkCount <= 0) {
    options =
      "<option value=''>Aucun réseau détecté</option>";
  } else {
    for (int i = 0; i < networkCount; i++) {
      String ssid = WiFi.SSID(i);
      int signal = WiFi.RSSI(i);

      options += "<option value='";
      options += ssid;
      options += "'>";

      options += ssid;
      options += " (";
      options += String(signal);
      options += " dBm)";

      options += "</option>";
    }
  }

  String html = R"rawliteral(
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Configuration Wi-Fi</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #08111f;
      color: #ffffff;
    }

    .card {
      width: 100%;
      max-width: 430px;
      padding: 28px;
      border-radius: 18px;
      background: #111c2e;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
    }

    h1 {
      margin-top: 0;
      font-size: 25px;
    }

    p {
      color: #aebbd0;
      line-height: 1.5;
    }

    label {
      display: block;
      margin-top: 18px;
      margin-bottom: 7px;
      font-weight: bold;
    }

    select,
    input,
    button {
      width: 100%;
      min-height: 46px;
      border-radius: 10px;
      border: 1px solid #35445d;
      padding: 10px 12px;
      font-size: 16px;
    }

    select,
    input {
      background: #0a1424;
      color: white;
    }

    button {
      margin-top: 22px;
      border: none;
      background: #35a7ff;
      color: white;
      font-weight: bold;
      cursor: pointer;
    }

    .message {
      margin-top: 14px;
      padding: 11px;
      border-radius: 8px;
      background: #17263d;
      color: #d8e7ff;
    }

    .small {
      margin-top: 18px;
      font-size: 13px;
      color: #8494ad;
    }
  </style>
</head>

<body>
  <div class="card">
    <h1>Diagnostic Machine</h1>

    <p>
      Sélectionne le réseau Wi-Fi auquel l'ESP32
      doit se connecter.
    </p>
)rawliteral";

  if (message.length() > 0) {
    html += "<div class='message'>";
    html += message;
    html += "</div>";
  }

  html += R"rawliteral(
    <form action="/save" method="POST">
      <label for="ssid">Réseau Wi-Fi</label>

      <select id="ssid" name="ssid" required>
)rawliteral";

  html += options;

  html += R"rawliteral(
      </select>

      <label for="password">
        Mot de passe Wi-Fi
      </label>

      <input
        id="password"
        name="password"
        type="password"
        placeholder="Mot de passe"
      >

      <button type="submit">
        Enregistrer et connecter
      </button>
    </form>

    <div class="small">
      Réseau de configuration : Diagnostic-Machine
    </div>
  </div>
</body>
</html>
)rawliteral";

  return html;
}

// =====================================================
// MÉMOIRE WI-FI
// =====================================================

void loadWiFiCredentials() {
  preferences.begin("wifi-config", true);

  savedSsid =
    preferences.getString("ssid", "");

  savedPassword =
    preferences.getString("password", "");

  preferences.end();
}

void saveWiFiCredentials(
  const String& ssid,
  const String& password
) {
  preferences.begin("wifi-config", false);

  preferences.putString("ssid", ssid);
  preferences.putString("password", password);

  preferences.end();

  savedSsid = ssid;
  savedPassword = password;
}

// =====================================================
// CONNEXION WI-FI
// =====================================================

bool connectToSavedWiFi() {
  if (savedSsid.length() == 0) {
    return false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);

  delay(300);

  WiFi.begin(
    savedSsid.c_str(),
    savedPassword.c_str()
  );

  unsigned long startTime = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startTime < WIFI_CONNECTION_TIMEOUT
  ) {
    delay(250);
  }

  return WiFi.status() == WL_CONNECTED;
}

// =====================================================
// PORTAIL DE CONFIGURATION
// =====================================================

void redirectToPortal() {
  webServer.sendHeader(
    "Location",
    "http://192.168.4.1/",
    true
  );

  webServer.send(302, "text/plain", "");
}

void handlePortalHome() {
  webServer.send(
    200,
    "text/html; charset=utf-8",
    buildConfigurationPage()
  );
}

void handleSaveWiFi() {
  if (!webServer.hasArg("ssid")) {
    webServer.send(
      400,
      "text/html; charset=utf-8",
      buildConfigurationPage(
        "Le nom du réseau est obligatoire."
      )
    );

    return;
  }

  String newSsid =
    webServer.arg("ssid");

  String newPassword =
    webServer.arg("password");

  newSsid.trim();

  if (newSsid.length() == 0) {
    webServer.send(
      400,
      "text/html; charset=utf-8",
      buildConfigurationPage(
        "Le réseau sélectionné est invalide."
      )
    );

    return;
  }

  saveWiFiCredentials(
    newSsid,
    newPassword
  );

  String successPage = R"rawliteral(
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Configuration enregistrée</title>

  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #08111f;
      color: white;
    }

    .card {
      max-width: 430px;
      padding: 28px;
      border-radius: 18px;
      background: #111c2e;
      text-align: center;
    }
  </style>
</head>

<body>
  <div class="card">
    <h2>Configuration enregistrée</h2>

    <p>
      L'ESP32 va redémarrer et tenter de se
      connecter au Wi-Fi.
    </p>
  </div>
</body>
</html>
)rawliteral";

  webServer.send(
    200,
    "text/html; charset=utf-8",
    successPage
  );

  delay(1500);
  ESP.restart();
}

void startConfigurationPortal() {
  configurationPortalActive = true;

  WiFi.mode(WIFI_AP_STA);

  WiFi.softAP(
    CONFIG_AP_SSID,
    CONFIG_AP_PASSWORD
  );

  delay(300);

  dnsServer.start(
    53,
    "*",
    WiFi.softAPIP()
  );

  webServer.on(
    "/",
    HTTP_GET,
    handlePortalHome
  );

  webServer.on(
    "/save",
    HTTP_POST,
    handleSaveWiFi
  );

  webServer.on(
    "/generate_204",
    HTTP_ANY,
    redirectToPortal
  );

  webServer.on(
    "/gen_204",
    HTTP_ANY,
    redirectToPortal
  );

  webServer.on(
    "/hotspot-detect.html",
    HTTP_ANY,
    redirectToPortal
  );

  webServer.on(
    "/connecttest.txt",
    HTTP_ANY,
    redirectToPortal
  );

  webServer.on(
    "/ncsi.txt",
    HTTP_ANY,
    redirectToPortal
  );

  webServer.onNotFound(
    redirectToPortal
  );

  webServer.begin();
}

void processConfigurationPortal() {
  if (!configurationPortalActive) {
    return;
  }

  dnsServer.processNextRequest();
  webServer.handleClient();
}

// =====================================================
// CALCUL DU DÉBIT
// =====================================================

void updateFlowMeasurement() {
  unsigned long currentTime = millis();

  unsigned long elapsedTime =
    currentTime - lastFlowCalculationTime;

  if (elapsedTime < 1000) {
    return;
  }

  noInterrupts();

  uint32_t pulses = flowPulseCount;
  flowPulseCount = 0;

  interrupts();

  float elapsedSeconds =
    elapsedTime / 1000.0f;

  float frequencyHz =
    pulses / elapsedSeconds;

  flowRateLMin =
    frequencyHz / FLOW_CALIBRATION_FACTOR;

  float intervalVolume =
    flowRateLMin * (elapsedSeconds / 60.0f);

  totalVolumeLiters += intervalVolume;

  lastFlowCalculationTime = currentTime;
}

// =====================================================
// LECTURE D’UN PZEM
// =====================================================

ElectricalData readPzem(
  PZEM004Tv30& pzem
) {
  ElectricalData data;

  data.voltage = pzem.voltage();
  data.current = pzem.current();
  data.power = pzem.power();
  data.energy = pzem.energy();
  data.frequency = pzem.frequency();
  data.powerFactor = pzem.pf();

  data.valid =
    !isnan(data.voltage) &&
    !isnan(data.current) &&
    !isnan(data.power) &&
    !isnan(data.energy) &&
    !isnan(data.frequency) &&
    !isnan(data.powerFactor);

  if (!data.valid) {
    data.voltage = 0.0f;
    data.current = 0.0f;
    data.power = 0.0f;
    data.energy = 0.0f;
    data.frequency = 0.0f;
    data.powerFactor = 0.0f;
  }

  return data;
}

// =====================================================
// AJOUT D’UNE LIGNE DANS LE JSON
// =====================================================

void addLineToJson(
  JsonObject line,
  const ElectricalData& data
) {
  line["voltage"] = data.voltage;
  line["current"] = data.current;
  line["power"] = data.power;
  line["energy"] = data.energy;
  line["frequency"] = data.frequency;
  line["powerFactor"] = data.powerFactor;
  line["valid"] = data.valid;
}

// =====================================================
// ENVOI DES MESURES AU SERVEUR
// =====================================================

bool sendMeasurements(
  const ElectricalData& line1,
  const ElectricalData& line2,
  const ElectricalData& line3
) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  WiFiClientSecure secureClient;
  secureClient.setInsecure();

  HTTPClient http;

  if (!http.begin(secureClient, API_URL)) {
    return false;
  }

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  http.setTimeout(15000);

  JsonDocument document;

  document["machineId"] = MACHINE_ID;

  JsonObject lines =
    document["lines"].to<JsonObject>();

  JsonObject jsonL1 =
    lines["L1"].to<JsonObject>();

  JsonObject jsonL2 =
    lines["L2"].to<JsonObject>();

  JsonObject jsonL3 =
    lines["L3"].to<JsonObject>();

  addLineToJson(jsonL1, line1);
  addLineToJson(jsonL2, line2);
  addLineToJson(jsonL3, line3);

  // Température ajoutée plus tard.
  document["temperature"] = 0.0f;

  // Débit instantané du YF-S201.
  document["flow"] = flowRateLMin;

  String jsonBody;
  serializeJson(document, jsonBody);

  int responseCode =
    http.POST(jsonBody);

  http.end();

  return (
    responseCode >= 200 &&
    responseCode < 300
  );
}

// =====================================================
// SETUP
// =====================================================

void setup() {
  /*
   * Pas de Serial.begin(), car UART0 est utilisé
   * par le troisième PZEM.
   */

  pinMode(
    LED_BUILTIN,
    OUTPUT
  );

  digitalWrite(
    LED_BUILTIN,
    LOW
  );

  // Initialisation du débitmètre.
  pinMode(
    FLOW_SENSOR_PIN,
    INPUT_PULLUP
  );

  attachInterrupt(
    digitalPinToInterrupt(FLOW_SENSOR_PIN),
    countFlowPulse,
    FALLING
  );

  lastFlowCalculationTime = millis();

  loadWiFiCredentials();

  bool connected =
    connectToSavedWiFi();

  if (!connected) {
    startConfigurationPortal();
  }

  delay(1000);
}

// =====================================================
// LOOP
// =====================================================

void loop() {
  processConfigurationPortal();

  updateFlowMeasurement();

  if (configurationPortalActive) {
    delay(2);
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(
      LED_BUILTIN,
      LOW
    );

    if (
      millis() - lastWiFiRetry >=
      WIFI_RETRY_INTERVAL
    ) {
      lastWiFiRetry = millis();

      bool reconnected =
        connectToSavedWiFi();

      if (!reconnected) {
        startConfigurationPortal();
      }
    }

    delay(50);
    return;
  }

  if (
    millis() - lastSendTime <
    SEND_INTERVAL
  ) {
    delay(20);
    return;
  }

  lastSendTime = millis();

  ElectricalData line1 =
    readPzem(pzemL1);

  delay(150);

  ElectricalData line2 =
    readPzem(pzemL2);

  delay(150);

  ElectricalData line3 =
    readPzem(pzemL3);

  delay(150);

  bool sent = sendMeasurements(
    line1,
    line2,
    line3
  );

  digitalWrite(
    LED_BUILTIN,
    sent ? HIGH : LOW
  );
}
