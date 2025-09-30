Dashboard de Tráfego de Servidor (Tempo Real)
Visão Geral
Este é um projeto universitário que implementa um dashboard de monitoramento de tráfego de rede em tempo real. Ele captura pacotes de/para um servidor-alvo, agrega os dados em janelas de 5 segundos por IP de cliente e oferece um recurso de drill-down para visualizar a quebra de tráfego por protocolo (HTTP, FTP, TCP, etc.).

Arquitetura do Projeto
Backend (Python/FastAPI):

Utiliza Scapy para captura e processamento de pacotes.

Agrega dados em tempo real em janelas de 5 segundos.

Expõe uma API RESTful para servir os dados ao frontend.

Frontend (React/Vite):

Dashboard interativo que consome a API RESTful.

Utiliza Chart.js para renderizar gráficos de barras empilhados.

O gráfico é atualizado a cada 5 segundos.

Permite a análise de drill-down ao clicar nas barras do cliente.

Como Rodar Localmente
Certifique-se de estar usando ambientes virtuais (.venv) para o Python e o Node.js.

1. Configuração do Backend (Python/FastAPI)
O backend roda na porta 8000.

Instalação do Driver de Captura (Apenas Windows):

Para que a Scapy funcione no Windows, você DEVE instalar o driver Npcap.

Durante a instalação, marque obrigatoriamente a opção: "Install Npcap in WinPcap API-compatible Mode".

Definir o IP do Servidor-Alvo:

No arquivo backend/app.py, altere a variável SERVER_IP para o endereço IP local (LAN) da sua máquina (ex: 192.168.0.22) para monitorar o tráfego externo. Use 127.0.0.1 apenas para testes de loopback.

Instalar Dependências:

cd backend
pip install -r requirements.txt

Executar o Backend:

Devido à Scapy e à captura de pacotes, pode ser necessário rodar com privilégios.

# Execute a partir da pasta raiz do projeto!
# (Ex: C:\Users\user\project>)
sudo uvicorn backend.app:app --host 0.0.0.0 --port 8000

2. Configuração do Frontend (React/Vite)
O frontend geralmente roda na porta 5173 (Vite).

Instalar Dependências:

cd frontend
npm install

Executar o Frontend:

npm run dev

Abra o navegador em http://localhost:5173.

Geração de Tráfego (Testes de Carga)
Para popular o dashboard, gere tráfego ativo e direcional.

Serviços Necessários: Instale e rode um servidor HTTP (porta 80) e um servidor FTP (porta 21) na máquina alvo (SERVER_IP).

Geração de Carga:

Use pelo menos 5 máquinas (ou dispositivos móveis) para acessar simultaneamente os serviços.

Para gerar volume (e ver os gráficos se moverem), inicie o download de um arquivo grande (vários MB) via HTTP ou FTP a partir das máquinas clientes.

Teste de Drill Down: Clique nas barras do gráfico para confirmar se o modal de protocolos aparece, mostrando a distribuição do tráfego.

Observações Técnicas
Comunicação: O frontend (:5173) se comunica com o backend (:8000). O CORS foi configurado no FastAPI para permitir essa comunicação entre portas diferentes.

Performance de Captura: Em ambientes de alta performance, a Scapy em Python pode se tornar um gargalo. Em produção, ferramentas como tshark ou capturadores em modo kernel seriam preferíveis.

Retenção de Dados: Atualmente, os dados são armazenados apenas em memória (na lista windows). Para retenção a longo prazo, seria necessário integrar um banco de dados de série temporal (como InfluxDB) ou Redis.
