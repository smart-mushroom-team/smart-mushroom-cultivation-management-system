
from locust import HttpUser, task, between

## locust -f tests/performance/locustfile.py --host http://localhost:8000
class MushroomUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def gateway_health(self):
        self.client.get(
            "/health",
            name="Gateway health"
        )

    @task(2)
    def identity_docs(self):
        self.client.get(
            "/api/identity/openapi.json",
            name="Identity OpenAPI"
        )

    @task(2)
    def core_docs(self):
        self.client.get(
            "/api/core/openapi.json",
            name="Core OpenAPI"
        )

    @task(2)
    def monitoring_docs(self):
        self.client.get(
            "/api/monitoring/openapi.json",
            name="Monitoring OpenAPI"
        )
