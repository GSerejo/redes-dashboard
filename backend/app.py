import threading
import time
from collections import defaultdict

# --- Imports FastAPI e CORS ---
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# --- Imports Scapy (se estiver usando) ---
# Importamos sniff e pacotes de rede aqui. Se a Scapy não estiver instalada,
# as funções de captura devem ser desabilitadas.
try:
    from scapy.all import sniff, IP, TCP, UDP
    sniff_available = True
except ImportError:
    sniff_available = False
    print("ALERTA: Scapy não encontrada. A captura de pacotes está desabilitada.")

# --------------------------------------------------------------------------
# --- CONFIGURAÇÕES GLOBAIS ---
# --------------------------------------------------------------------------

# O IP do servidor-alvo que você está monitorando.
# IMPORTANTE: Para simulação, use o IP da sua máquina na rede local (ex: 192.168.1.5).
# Se usar '127.0.0.1', apenas o tráfego gerado na própria máquina será capturado.
SERVER_IP = '192.168.0.22' # IP Padrão para iniciar. TROQUE ESTE IP!
WINDOW_SIZE = 5  # Janela de tempo em segundos
lock = threading.Lock()
windows = []
# --------------------------------------------------------------------------


# Inicializa o FastAPI
app = FastAPI()

# Configuração do CORS (CRÍTICO para a comunicação Frontend <-> Backend)
# Permite requisições do seu frontend rodando na porta 5173
origins = [
    "http://localhost:5173",  
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# --- FUNÇÕES DE PROCESSAMENTO E AGREGAÇÃO (LÓGICA CORE) ---
# --------------------------------------------------------------------------

def new_window(timestamp):
    """Cria uma nova estrutura de janela de tempo."""
    # Estrutura: {'ip': {'in': bytes, 'out': bytes, 'protocols': {'HTTP': bytes, ...}}}
    return {'start': timestamp, 'data': defaultdict(lambda: {'in': 0, 'out': 0, 'protocols': defaultdict(int)})}

def detect_protocol(pkt):
    """Detecta o protocolo de transporte e aplicação (ex: HTTP/FTP)."""
    if IP in pkt:
        # Tenta identificar o protocolo de aplicação
        if TCP in pkt:
            dport = pkt[TCP].dport
            sport = pkt[TCP].sport
            if dport == 80 or sport == 80: return 'HTTP'
            if dport == 21 or sport == 21: return 'FTP'
            return 'TCP'
        elif UDP in pkt:
            # Poderia adicionar detecção DNS/DHCP aqui
            return 'UDP'
        # Adicione outros protocolos aqui (ICMP, etc.)
        return IP.name
    return 'Unknown'


def process_packet(pkt):
    """Processa um único pacote de rede."""
    if not IP in pkt:
        return # Ignora pacotes que não são IP

    src = pkt[IP].src
    dst = pkt[IP].dst
    total_len = len(pkt) # pkt.len é o tamanho total do pacote

    direction = None
    client_ip = None

    # 1. Determina direção e cliente
    if src == SERVER_IP and dst != SERVER_IP:
        direction = 'out'
        client_ip = dst
    elif dst == SERVER_IP and src != SERVER_IP:
        direction = 'in'
        client_ip = src
    else:
        return # Pacote não se comunica com o SERVER_IP

    proto = detect_protocol(pkt)
    
    # 2. Determina a janela de tempo (arredonda para baixo para o múltiplo de WINDOW_SIZE)
    window_ts = int(time.time() // WINDOW_SIZE * WINDOW_SIZE)

    # 3. Agrega os dados
    try:
        with lock:
            # Cria uma nova janela se for a primeira ou se o timestamp mudou
            if not windows or windows[-1]['start'] != window_ts:
                windows.append(new_window(window_ts))

            win = windows[-1]
            entry = win['data'][client_ip]
            
            # Atualiza contadores
            entry[direction] += total_len
            entry['protocols'][proto] += total_len
    except Exception as e:
        # Não travar a captura, apenas logar o erro
        print(f'process_packet error: {e}')


def window_rotator():
    """Mantém a lista 'windows' limpa, removendo janelas antigas."""
    MAX_WINDOWS = 100
    while True:
        with lock:
            if len(windows) > MAX_WINDOWS:
                windows[:] = windows[-MAX_WINDOWS:]  # Mantém apenas as N mais recentes
        time.sleep(WINDOW_SIZE * 2) # Verifica a cada 10 segundos


def start_sniffer():
    """Inicia o sniffer de pacotes."""
    if not sniff_available:
        return
    # Filtro BPF para capturar tráfego de/para o SERVER_IP
    bpf = f'host {SERVER_IP}'
    print(f"Sniffer iniciado. Monitorando o IP: {SERVER_IP}. (Use Ctrl+C para parar)")
    # store=False para não guardar pacotes na memória
    sniff(prn=process_packet, filter=bpf, store=False)

# --------------------------------------------------------------------------
# --- ENDPOINTS FASTAPI (SUAS ROTAS) ---
# --------------------------------------------------------------------------

@app.get('/api/windows/latest')
async def get_latest_window():
    with lock:
        if not windows:
            # Se não houver dados, retorna um 204 ou um objeto vazio esperado pelo frontend
            return {"start": int(time.time()), "clients": {}}
        
        # Envia a última janela
        w = windows[-1]
        clients = {}
        for ip, v in w['data'].items():
            # Converte defaultdict em dict para serialização JSON
            clients[ip] = {"in": v['in'], "out": v['out'], "protocols": dict(v['protocols'])}
        return {"start": w['start'], "clients": clients}


@app.get('/api/windows/history')
async def get_history(n: int = 12):
    """Retorna o histórico das últimas N janelas."""
    with lock:
        res = []
        # Pega as últimas 'n' janelas
        for w in list(windows)[-n:]:
            # CORREÇÃO DE SINTAXE AQUI: Trocado 'out': v['out'} por 'out': v['out']}
            clients = {ip: {"in": v['in'], 'out': v['out']} for ip,v in w['data'].items()}
            res.append({"start": w['start'], "clients": clients})
        return res


@app.get('/api/drilldown')
async def drilldown(start: int, client: str):
    """Retorna o detalhe de protocolo para um cliente em uma janela específica."""
    with lock:
        # Busca a janela pelo timestamp 'start'
        for w in windows:
            if w['start'] == start:
                if client in w['data']:
                    # Retorna os protocolos do cliente
                    return {"start": start, "client": client, "protocols": dict(w['data'][client]['protocols'])}
                # Caso a janela exista, mas o cliente não
                raise HTTPException(status_code=404, detail=f'Client {client} not found in window {start}')
        # Caso a janela não exista
        raise HTTPException(status_code=404, detail=f'Window {start} not found')


# --------------------------------------------------------------------------
# --- INÍCIO DO PROGRAMA ---
# --------------------------------------------------------------------------
# Inicia as threads em background
threading.Thread(target=window_rotator, daemon=True).start()
threading.Thread(target=start_sniffer, daemon=True).start()

# O Uvicorn irá servir o 'app' FastAPI

