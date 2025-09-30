import time
import random
import threading

# Janela de tráfego: dict {timestamp: {client_ip: {in, out, protocols:{proto:valor}}}}
windows = {}
WINDOW_SIZE = 5  # segundos

def generate_fake_traffic(server_ip):
    while True:
        start = int(time.time() // WINDOW_SIZE * WINDOW_SIZE)
        if start not in windows:
            windows[start] = {}
        clients = windows[start]

        # Simula 5 clientes
        for i in range(1, 6):
            ip = f"192.168.0.{i}"
            if ip not in clients:
                clients[ip] = {"in": 0, "out": 0, "protocols": {}}

            inc = random.randint(10, 100)
            outc = random.randint(5, 50)
            proto = random.choice(["HTTP", "FTP", "TCP", "UDP"])

            clients[ip]["in"] += inc
            clients[ip]["out"] += outc
            clients[ip]["protocols"][proto] = clients[ip]["protocols"].get(proto, 0) + inc + outc

        time.sleep(1)


def start_capture(server_ip):
    t = threading.Thread(target=generate_fake_traffic, args=(server_ip,), daemon=True)
    t.start()


# 🔹 API usadas pelo main.py
def get_latest_window():
    if not windows:
        return None
    latest = max(windows.keys())
    return {"start": latest, "clients": windows[latest]}


def get_history(n=12):
    ordered = sorted(windows.keys(), reverse=True)[:n]
    return [{"start": ts, "clients": windows[ts]} for ts in ordered]


def get_drilldown(start, client):
    start = int(start)
    if start in windows and client in windows[start]:
        return {
            "start": start,
            "client": client,
            "protocols": windows[start][client]["protocols"],
        }
    return {"start": start, "client": client, "protocols": {}}
