# Relatório Técnico — Dashboard de Tráfego de Servidor em Tempo Real


## Arquitetura
O protótipo adota arquitetura modular: Sniffer -> Agregador em memória -> API REST (FastAPI) -> Frontend (React). O sniffer captura pacotes com filtro BPF para o `SERVER_IP` e envia eventos para o agregador. O agregador mantém janelas fixas de 5 segundos alinhadas ao tempo.


## Lógica de agregação
Cada janela tem a key `start