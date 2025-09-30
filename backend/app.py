import threading
import time
from typing import Dict, Any, List, Optional 

# Tenta importar Scapy. Se falhar, define sniff como None e avisa o usuário.
try:
    from scapy.all import sniff, IP, TCP, UDP
    SNIFF_AVAILABLE = True
except ImportError:
    print("AVISO: Scapy não encontrada. Instale 'scapy' (e Npcap no Windows) para captura de pacotes.")
    SNIFF_AVAILABLE = False
    
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# --- CONFIGURAÇÃO ---
# IP DA MÁQUINA DE CAPTURA/ALVO.
SERVER_IP = '192.168.61.15'  
WINDOW_SIZE = 5  # Tamanho da janela de tempo em segundos

INTERFACE_NAME: str | None = 'VMware Network Adapter VMnet1' 

# --- ESTRUTURAS DE DADOS GLOBAIS ---
# Armazena as janelas de tempo agregadas
windows: List[Dict[str, Any]] = []
# Lock para garantir segurança de thread ao acessar 'windows'
lock = threading.Lock()

# --- FUNÇÕES DE LÓGICA DE REDE ---

def detect_protocol(pkt) -> str:
    """Detecta o protocolo de alto nível com base na porta."""
    # Mapeamento de portas para protocolos (TCP e UDP)
    port_map = {
        80: 'HTTP',    # Web
        443: 'HTTPS',  # Web Segura
        21: 'FTP',     # File Transfer Protocol
        25: 'SMTP',    # Simple Mail Transfer Protocol
        22: 'SSH',     # Secure Shell
        53: 'DNS',     # Domain Name System (pode ser TCP ou UDP)
    }

    protocol = 'Other'
    dport = None
    sport = None

    if IP in pkt:
        # Tenta pegar a porta de destino/origem
        if TCP in pkt:
            dport = pkt[TCP].dport
            sport = pkt[TCP].sport
            protocol = 'TCP'
        elif UDP in pkt:
            dport = pkt[UDP].dport
            sport = pkt[UDP].sport
            protocol = 'UDP'

    # Verifica se a porta corresponde a um protocolo conhecido no mapa
    # Verifica a porta de destino OU a porta de origem (já que o servidor é o alvo)
    if dport in port_map:
        return port_map[dport]
    if sport in port_map and sport != 80 and sport != 443:
        # Se for DNS ou SSH, a porta de origem também pode indicar o protocolo
        return port_map[sport]

    # Mantém a classificação de TCP/UDP se não for um protocolo conhecido
    return protocol

def new_window(ts: int) -> Dict[str, Any]:
    """Cria uma nova estrutura de janela de tempo."""
    return {'start': ts, 'data': {}}

def process_packet(pkt):
    """Callback da Scapy para processar cada pacote."""
    if IP not in pkt:
        return

    # Extrai informações básicas do IP
    src = pkt[IP].src
    dst = pkt[IP].dst
    total_len = len(pkt)
    
    direction = None
    client_ip = None

    # Determina a direção e o IP do cliente.
    # Assumimos que o servidor-alvo (SERVER_IP) está sendo espelhado.
    if src == SERVER_IP and dst != SERVER_IP:
        # Tráfego de SAÍDA do servidor para um cliente
        direction = 'out'
        client_ip = dst
    elif dst == SERVER_IP and src != SERVER_IP:
        # Tráfego de ENTRADA de um cliente para o servidor
        direction = 'in'
        client_ip = src
    else:
        # Pacotes entre outros hosts ou pacotes internos que não nos interessam
        return
        
    proto = detect_protocol(pkt)
    window_ts = int(time.time() // WINDOW_SIZE * WINDOW_SIZE)

    with lock:
        # 1. Gerenciamento de Janelas (Cria nova janela se necessário)
        if not windows or windows[-1]['start'] != window_ts:
            windows.append(new_window(window_ts))
        
        win = windows[-1]

        # 2. Inicialização da entrada do cliente, se for a primeira vez na janela
        if client_ip not in win['data']:
            win['data'][client_ip] = {'in': 0, 'out': 0, 'protocols': {}}
        
        entry = win['data'][client_ip]

        # 3. Agregação de Bytes e Protocolo
        entry[direction] += total_len
        entry['protocols'][proto] = entry['protocols'].get(proto, 0) + total_len

# --- FUNÇÕES DE THREADS EM BACKGROUND ---

def window_rotator():
    """Mantém a lista 'windows' limpa, removendo janelas antigas."""
    while True:
        # Espera o tamanho de uma janela
        time.sleep(WINDOW_SIZE)
        with lock:
            # Mantém apenas as últimas 15 janelas
            if len(windows) > 15:
                windows[:] = windows[-15:]

def start_sniffer():
    """Inicia a captura de pacotes com Scapy."""
    if not SNIFF_AVAILABLE:
        print('Scapy não disponível — desabilitando sniffer. Instale scapy para captura ao vivo.')
        return

    # O filtro BPF garante que capturamos apenas o tráfego de/para o SERVER_IP
    bpf = f'host {SERVER_IP}'
    
    print(f'Sniffer iniciado. Monitorando o IP: {SERVER_IP}.')
    if INTERFACE_NAME:
        print(f'Usando Interface: {INTERFACE_NAME}')
    else:
        print('AVISO: Nenhuma interface especificada (pode falhar em ambientes com VM).')
    
    try:
        # store=False para não guardar pacotes na memória
        # Passa o nome da interface para garantir a captura na rede correta
        sniff(prn=process_packet, filter=bpf, store=False, iface=INTERFACE_NAME)
    except Exception as e:
        print(f'ERRO CRÍTICO no sniffer Scapy: {e}')
        print('Verifique se o Npcap está instalado corretamente e se você tem permissões (sudo/admin).')


# --- CONFIGURAÇÃO E ROTAS DA API ---

app = FastAPI()

# Configuração de CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost:5173",  # Permitir acesso do seu frontend React/Vite
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get('/api/windows/latest')
async def get_latest_window():
    """Retorna os dados da janela de tempo mais recente."""
    with lock:
        if not windows:
            # Retorna uma estrutura vazia se não houver dados
            return {"start": int(time.time() // WINDOW_SIZE * WINDOW_SIZE), "clients": {}}
        w = windows[-1]
        
        # Mapeia os dados para o formato JSON desejado
        clients = {
            ip: {"in": v['in'], "out": v['out']} 
            for ip, v in w['data'].items()
        }
        return {"start": w['start'], "clients": clients}


@app.get('/api/drilldown')
async def drilldown(start: int, client: str):
    """Retorna a quebra de protocolos para um cliente em uma janela específica."""
    with lock:
        for w in windows:
            if w['start'] == start:
                if client in w['data']:
                    # Retorna os protocolos específicos
                    return {"start": start, "client": client, "protocols": dict(w['data'][client]['protocols'])}
                raise HTTPException(status_code=404, detail='Client not found in window')
        raise HTTPException(status_code=404, detail='Window not found')

# --- INICIALIZAÇÃO ---

# Inicia as threads de background
if SNIFF_AVAILABLE:
    threading.Thread(target=start_sniffer, daemon=True).start()
threading.Thread(target=window_rotator, daemon=True).start()

# Observação: execute com uvicorn: uvicorn backend.app:app --host 0.0.0.0 --port 8000
