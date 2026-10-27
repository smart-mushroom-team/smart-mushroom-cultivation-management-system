#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "config.h"

DHT dht(DHT_PIN, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
}

void loop() {
  float t = dht.readTemperature(), h = dht.readHumidity();
  if (!isnan(t) && !isnan(h) && WiFi.status() == WL_CONNECTED) {
    JsonDocument doc;
    doc["temperature"] = t;
    doc["humidity"] = h;
    String body; serializeJson(doc, body);
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Key", DEVICE_KEY);
    int code = http.POST(body);
    Serial.printf("POST %d\n", code);   // 202 = nhận thành công
    http.end();
  }
  delay(SEND_INTERVAL_MS);
}
