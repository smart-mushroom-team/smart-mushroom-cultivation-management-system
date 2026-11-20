// Firmware nút cảm biến phòng nấm (ESP32 + DHT11 + OLED 0.96" + cảm biến độ ẩm đất)
// Gửi nhiệt độ/độ ẩm tới Gateway: POST {API_URL} (mặc định /iot/telemetry), header X-Device-Key.
// Server trả 202 = đã nhận. Body JSON: {"temperature": 25.0, "humidity": 85.0, "soilMoisture": 42}
// (soilMoisture chỉ gửi khi SOIL_ENABLED = 1 và đọc được cảm biến đất)
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#if __has_include("config.h")
#include "config.h"
#else
#error "Chua co include/config.h: sao chep include/config.example.h thanh include/config.h roi dien Wi-Fi, API_URL, DEVICE_KEY"
#endif

// Cấp nguồn DHT11 từ một chân GPIO (không cần breadboard): chân GIỮA của DHT11 -> GPIO18 (D18).
// DHT11 chỉ tốn ~1-2,5 mA, một chân ESP32 cấp được dư. Nối chân giữa vào 3V3 thì để nguyên, chân 18 bật lên cũng vô hại.
// Đặt -1 trong config.h (#define DHT_POWER_PIN -1) để tắt tính năng này.
#ifndef DHT_POWER_PIN
#define DHT_POWER_PIN 18
#endif

// --------- trạng thái ---------
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
bool oledOk = false;

float lastTemp = NAN, lastHum = NAN;
int lastSoil = -1;              // % độ ẩm đất, -1 = chưa có
int lastHttpCode = 0;           // mã HTTP lần gửi gần nhất
unsigned long okCount = 0, failCount = 0;
unsigned long lastSendMs = 0, lastScreenMs = 0;
bool mistOn = false, fanOn = false;

// --------- tiện ích ---------
void blink(int times, int onMs = 80) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH); delay(onMs);
    digitalWrite(STATUS_LED_PIN, LOW);  delay(onMs);
  }
}

const char* explainHttp(int code) {
  switch (code) {
    case 202: return "OK - server da nhan du lieu";
    case 400: return "Sai loai thiet bi: khoa nay la CAMERA, can tao thiet bi loai 'Cam bien nhiet do, do am'";
    case 401: return "Sai DEVICE_KEY hoac thiet bi dang TAT tren web";
    case 404: return "Sai duong dan API_URL (phai ket thuc bang /iot/telemetry)";
    case 422: return "Du lieu bi tu choi (gia tri cam bien ngoai dai do)";
    case 502: case 503: case 504: return "Gateway chay nhung service monitoring chua san sang - doi 1 phut";
    case -1:  return "Khong ket noi duoc server: sai IP, server chua chay, hoac Firewall chan cong 8000";
    case -11: return "Het thoi gian cho server phan hoi";
    default:  return "Loi khac - xem log server";
  }
}

// --------- màn hình ---------
void showScreen() {
  if (!oledOk) return;
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);

  oled.setTextSize(1);
  oled.setCursor(0, 0);
  if (WiFi.status() == WL_CONNECTED) {
    oled.print("WiFi "); oled.print(WiFi.localIP());
  } else {
    oled.print("WiFi: dang ket noi...");
  }

  oled.setTextSize(2);
  oled.setCursor(0, 14);
  if (isnan(lastTemp)) oled.print("--.- C"); else { oled.print(lastTemp, 1); oled.print(" C"); }
  oled.setCursor(0, 32);
  if (isnan(lastHum)) oled.print("--.- %"); else { oled.print(lastHum, 1); oled.print(" %"); }

  oled.setTextSize(1);
  oled.setCursor(0, 50);
#if SOIL_ENABLED
  oled.print("Dat:"); if (lastSoil < 0) oled.print("--"); else oled.print(lastSoil); oled.print("% ");
#endif
  if (lastHttpCode == 0) oled.print("Chua gui");
  else if (lastHttpCode == 202) { oled.print("Gui OK x"); oled.print(okCount); }
  else { oled.print("Loi "); oled.print(lastHttpCode); }

#if RELAY_ENABLED
  oled.setCursor(98, 14); oled.print(mistOn ? "PHUN" : "");
  oled.setCursor(98, 32); oled.print(fanOn ? "QUAT" : "");
#endif
  oled.display();
}

// --------- Wi-Fi ---------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("\n[WiFi] Dang ket noi '%s'", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    Serial.print(".");
    delay(250);
  }
  digitalWrite(STATUS_LED_PIN, LOW);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] OK. IP cua ESP32: %s  RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] THAT BAI. Kiem tra ten/mat khau, Wi-Fi phai la 2.4 GHz. Se thu lai sau.");
  }
  showScreen();
}

// --------- cảm biến ---------
bool readDht(float& t, float& h) {
  for (int i = 0; i < 3; i++) {            // DHT11 thỉnh thoảng trả NaN: thử lại tối đa 3 lần
    t = dht.readTemperature();
    h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) return true;
    delay(1200);                            // DHT11 cần >= 1 giây giữa hai lần đọc
  }
  return false;
}

int readSoilPercent() {
#if SOIL_ENABLED
  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(SOIL_PIN); delay(5); }
  int raw = sum / 10;
  int pct = map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100);
  pct = constrain(pct, 0, 100);
  Serial.printf("[Dat] raw=%d -> %d%%\n", raw, pct);
  return pct;
#else
  return -1;
#endif
}

// --------- relay (tùy chọn) ---------
void setRelay(int pin, bool on) {
#if RELAY_ACTIVE_LOW
  digitalWrite(pin, on ? LOW : HIGH);
#else
  digitalWrite(pin, on ? HIGH : LOW);
#endif
}

void controlRelays(float t, float h) {
#if RELAY_ENABLED
  // Có vùng trễ (bật ở một ngưỡng, tắt ở ngưỡng khác) để relay không bật/tắt liên tục
  if (!mistOn && h < MIST_ON_BELOW) mistOn = true;
  else if (mistOn && h > MIST_OFF_ABOVE) mistOn = false;
  if (!fanOn && t > FAN_ON_ABOVE) fanOn = true;
  else if (fanOn && t < FAN_OFF_BELOW) fanOn = false;
  setRelay(RELAY_MIST_PIN, mistOn);
  setRelay(RELAY_FAN_PIN, fanOn);
  Serial.printf("[Relay] Phun suong: %s | Quat: %s\n", mistOn ? "BAT" : "tat", fanOn ? "BAT" : "tat");
#endif
}

// --------- gửi server ---------
int sendTelemetry(float t, float h, int soil) {
  JsonDocument doc;
  doc["temperature"] = round(t * 10) / 10.0;
  doc["humidity"] = round(h * 10) / 10.0;
  if (soil >= 0) doc["soilMoisture"] = soil;      // độ ẩm đất 0-100 (%), server lưu vào cột soil_moisture
  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.setTimeout(10000);
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int code = http.POST(body);
  String resp = (code > 0) ? http.getString() : "";
  http.end();

  Serial.printf("[HTTP] POST %s  body=%s\n", API_URL, body.c_str());
  Serial.printf("[HTTP] -> %d : %s\n", code, explainHttp(code));
  if (code > 0 && code != 202 && resp.length()) Serial.printf("[HTTP] server tra ve: %s\n", resp.c_str());
  return code;
}

void cycle() {
  float t, h;
  if (!readDht(t, h)) {
    Serial.println("[DHT11] Doc that bai: kiem tra day DATA -> GPIO4, VCC -> 3V3, GND -> GND");
    lastTemp = lastHum = NAN;
    blink(3);
    showScreen();
    return;
  }
  lastTemp = t; lastHum = h;
  lastSoil = readSoilPercent();
  Serial.printf("[DHT11] Nhiet do: %.1f C | Do am: %.1f %%\n", t, h);
  controlRelays(t, h);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Bo qua lan gui nay vi chua co Wi-Fi");
    showScreen();
    return;
  }
  lastHttpCode = sendTelemetry(t, h, lastSoil);
  if (lastHttpCode == 202) { okCount++; blink(1, 150); }
  else { failCount++; blink(3); }
  showScreen();
}

// --------- chương trình chính ---------
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== Mushroom sensor node (ESP32 + DHT11) ===");

  pinMode(STATUS_LED_PIN, OUTPUT);
#if RELAY_ENABLED
  pinMode(RELAY_MIST_PIN, OUTPUT);
  pinMode(RELAY_FAN_PIN, OUTPUT);
  setRelay(RELAY_MIST_PIN, false);
  setRelay(RELAY_FAN_PIN, false);
#endif
#if SOIL_ENABLED
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);   // đo được toàn dải 0 - 3.3 V
#endif

#if OLED_ENABLED
  Wire.begin(21, 22);                            // SDA = GPIO21, SCL = GPIO22
  oledOk = oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  Serial.println(oledOk ? "[OLED] OK" : "[OLED] Khong tim thay man hinh (kiem tra day SDA/SCL, thu dia chi 0x3D)");
#endif
  showScreen();

#if DHT_POWER_PIN >= 0
  pinMode(DHT_POWER_PIN, OUTPUT);
  digitalWrite(DHT_POWER_PIN, HIGH);         // cấp 3,3V cho DHT11
  Serial.printf("[DHT11] Cap nguon tu GPIO%d\n", DHT_POWER_PIN);
#endif
  dht.begin();
  connectWiFi();
  delay(2000);                                   // DHT11 cần ~2 giây sau khi cấp nguồn
  cycle();                                       // gửi ngay lần đầu, không chờ hết chu kỳ
  lastSendMs = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {           // mất Wi-Fi (router khởi động lại...) thì tự kết nối lại
    static unsigned long lastTry = 0;
    if (millis() - lastTry > 10000) { lastTry = millis(); connectWiFi(); }
  }
  if (millis() - lastSendMs >= SEND_INTERVAL_MS) {
    lastSendMs = millis();
    cycle();
  }
  if (millis() - lastScreenMs >= 2000) {         // vẽ lại màn hình để cập nhật trạng thái Wi-Fi
    lastScreenMs = millis();
    showScreen();
  }
  delay(20);
}
