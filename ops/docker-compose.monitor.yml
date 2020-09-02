version: "3.7"

volumes:
  grafana:
  prometheus:

networks:
  default:

services:
  nginx:
    image: ${NGINX_IMAGE}
    environment:
      SUBDOMAINS: "grafana:3000"
    depends_on:
      - grafana

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    volumes:
      - ./grafana:/etc/grafana/provisioning
      - grafana:/var/lib/grafana
    depends_on:
      - prometheus
