# Dashboard de Tráfego de Servidor (Tempo Real)


## Visão geral
Protótipo para capturar tráfego de/para um servidor específico e exibir janelas de 5s agregadas por cliente (IP) com drill-down por protocolos.


## Como rodar (local)
### Backend
1. Configure `SERVER_IP` em `backend/.env` ou exporte como variável de ambiente.
2. Instale dependências: `pip install -r backend/requirements.txt`.
3. Rode: `sudo uvicorn backend.app:app --host 0.0.0.0 --port 8000` (scapy requer privilégios para captura). Se não quiser captura ao vivo, execute sem sudo — o backend ainda servirá a API, mas sem sniffer.


### Frontend
1. `cd frontend && npm install`
2. `npm run dev`
3. Abra `http://localhost:3000`.


## Testes
- Gere tráfego HTTP: `python3 -m http.server 8080` no servidor alvo.
- Gere tráfego FTP: use `pyftpdlib` ou instale um servidor FTP.
- Use 5 máquinas clientes para criar requests. Alternativa: `tcpreplay` com .pcap.


## Observações
- Em produção, prefira usar `tshark` ou capturadores em modo kernel para performance.
- Para retenção a longo prazo, salve dados em Redis/InfluxDB.