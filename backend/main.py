import os
import time
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from capture import start_capture, get_latest_window, get_history, get_drilldown

# 🔹 Lê do ambiente, se não existir usa localhost
SERVER_IP = os.getenv("SERVER_IP", "127.0.0.1")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Inicia a captura para o IP configurado
    start_capture(SERVER_IP)
    print(f"📡 Capturando tráfego para {SERVER_IP}")


# ---------------------------
# 🔹 Endpoints esperados pelo frontend
# ---------------------------

@app.get("/windows/latest")
def latest():
    """Retorna a última janela de tráfego"""
    data = get_latest_window()
    if not data:
        return {"start": int(time.time()), "clients": {}}
    return data


@app.get("/windows/history")
def history(n: int = Query(12, description="Quantidade de janelas")):
    """Retorna o histórico das últimas N janelas"""
    return get_history(n)


@app.get("/drilldown")
def drilldown(start: int, client: str):
    """Retorna o tráfego por protocolo de um cliente em uma janela específica"""
    return get_drilldown(start, client)
