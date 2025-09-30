from scapy.all import sniff, IP

# Configure estas três variáveis (de acordo com o seu backend/app.py)
INTERFACE_NAME = 'VMware Network Adapter VMnet1' 
SERVER_IP = '192.168.61.15'
BPF_FILTER = f'host {SERVER_IP}'

def packet_callback(pkt):
    """Função chamada a cada pacote capturado."""
    if IP in pkt:
        # Imprime o IP de origem e destino para confirmar o que está sendo visto
        print(f"Pacote visto: {pkt[IP].src} -> {pkt[IP].dst} (Protocolo: {pkt[IP].proto})")
    else:
        print("Pacote não IP visto.")

print(f"Iniciando Sniffer na interface: {INTERFACE_NAME}")
print(f"Filtro BPF: {BPF_FILTER}")

# Tente capturar 10 pacotes
sniff(iface=INTERFACE_NAME, filter=BPF_FILTER, prn=packet_callback, count=10)
print("\nTeste concluído.")
