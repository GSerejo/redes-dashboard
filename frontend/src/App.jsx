import React, { useEffect, useState, useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { 
  Chart, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend, BarController, ArcElement
} from 'chart.js'

// Registra os componentes necessários para os gráficos (Adicionando ArcElement para o Doughnut Chart)
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController, ArcElement)

// URL base da API
const API_BASE_URL = 'http://localhost:8000'
const INTERVAL_MS = 5000 // Frequência de atualização de dados

// Mapeamento de Cores para Protocolos
const PROTOCOL_COLORS = {
    'HTTP': { bg: 'rgba(75, 192, 192, 0.7)', border: 'rgba(75, 192, 192, 1)' },
    'HTTPS': { bg: 'rgba(255, 159, 64, 0.7)', border: 'rgba(255, 159, 64, 1)' },
    'FTP': { bg: 'rgba(153, 102, 255, 0.7)', border: 'rgba(153, 102, 255, 1)' },
    'SMTP': { bg: 'rgba(255, 205, 86, 0.7)', border: 'rgba(255, 205, 86, 1)' },
    'SSH': { bg: 'rgba(54, 162, 235, 0.7)', border: 'rgba(54, 162, 235, 1)' },
    'DNS': { bg: 'rgba(255, 99, 132, 0.7)', border: 'rgba(255, 99, 132, 1)' },
    'TCP': { bg: 'rgba(201, 203, 207, 0.7)', border: 'rgba(201, 203, 207, 1)' },
    'UDP': { bg: 'rgba(100, 149, 237, 0.7)', border: 'rgba(100, 149, 237, 1)' },
    'Other': { bg: 'rgba(180, 180, 180, 0.7)', border: 'rgba(180, 180, 180, 1)' },
};

// Componente para o Modal de Drill Down
function ProtocolDrilldown({ protocols, clientIp, onClose }) {
  if (!protocols) return null;

  const labels = Object.keys(protocols);
  const dataValues = labels.map(label => protocols[label]);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Bytes por Protocolo',
        data: dataValues,
        backgroundColor: labels.map(label => (PROTOCOL_COLORS[label] || PROTOCOL_COLORS['Other']).bg),
        borderColor: labels.map(label => (PROTOCOL_COLORS[label] || PROTOCOL_COLORS['Other']).border),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Quebra de Tráfego por Protocolo para ${clientIp}`,
      },
      tooltip: {
        callbacks: {
          // Converte bytes para KB no tooltip
          label: (context) => `${context.label}: ${(context.parsed.x / 1024).toFixed(2)} KB`,
        }
      }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Bytes Transferidos (KB)' }, 
        ticks: { beginAtZero: true, callback: (value) => (value / 1024).toFixed(0) + ' KB' } 
      },
    }
  };


  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Detalhes do Cliente: {clientIp}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition duration-150"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="h-64">
          <Bar data={data} options={options} /> 
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Esta análise mostra o volume total de bytes transferidos pelo cliente **{clientIp}** nesta janela, discriminado por protocolo.
        </p>
      </div>
    </div>
  );
}


// NOVO COMPONENTE: Gráficos de Resumo de Protocolos
function ProtocolSummaryCharts({ protocolsSummary }) {
    if (!protocolsSummary || Object.keys(protocolsSummary).length === 0) {
        return (
            <div className="p-4 text-center text-gray-500 bg-gray-100 rounded-lg">
                Gerando resumo dos protocolos...
            </div>
        );
    }

    const totalBytes = Object.values(protocolsSummary).reduce((sum, bytes) => sum + bytes, 0);

    return (
        <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
                Distribuição de Tráfego por Protocolo na Rede
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {Object.entries(protocolsSummary).map(([protocol, bytes]) => {
                    const percentage = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : 0;
                    const color = PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS['Other'];

                    const chartData = {
                        labels: [protocol, 'Outros'],
                        datasets: [{
                            data: [bytes, totalBytes - bytes],
                            backgroundColor: [color.bg, '#e5e7eb'],
                            borderColor: [color.border, '#d1d5db'],
                            borderWidth: 1,
                        }]
                    };

                    const chartOptions = {
                        responsive: true,
                        cutout: '80%', // Deixa o gráfico mais fino (Donut)
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: () => `${protocol}: ${percentage}%`,
                                    title: () => `${(bytes / 1024).toFixed(2)} KB`,
                                }
                            }
                        }
                    };

                    return (
                        <div key={protocol} className="bg-white p-4 rounded-xl shadow-md flex flex-col items-center">
                            <h3 className="text-md font-semibold text-gray-700 truncate w-full text-center mb-2">{protocol}</h3>
                            <div className="relative h-24 w-24">
                                <Doughnut data={chartData} options={chartOptions} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold text-gray-800">{percentage}%</span>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                Total: {(bytes / 1024).toFixed(2)} KB
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default function App() {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDrilldown, setSelectedDrilldown] = useState(null); 
  const [currentTime, setCurrentTime] = useState(new Date()); 

  const fetchData = async () => {
    try {
      const latestResponse = await fetch(`${API_BASE_URL}/api/windows/latest`);
      if (!latestResponse.ok) {
        throw new Error(`Erro ${latestResponse.status} na API /latest`);
      }
      const latestData = await latestResponse.json();
      setLatest(latestData);
      setError(null);

    } catch (err) {
      console.error('Erro ao buscar dados da API:', err);
      setError("Não foi possível conectar ao backend (http://localhost:8000). Verifique se o Uvicorn está rodando e se o Npcap está instalado para a captura de pacotes.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Hook para buscar dados a cada 5 segundos
  useEffect(() => {
    fetchData(); 
    const dataInterval = setInterval(fetchData, INTERVAL_MS);
    return () => clearInterval(dataInterval);
  }, []);

  // 2. Hook para o timer que se move a cada segundo
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); 
    return () => clearInterval(clockInterval);
  }, []); 


  const handleBarClick = async (evt, elements) => {
    // Retorna se não houver elementos clicados ou se um modal já estiver aberto
    if (!elements.length || !latest?.clients || selectedDrilldown) return;

    const idx = elements[0].index;
    const labels = Object.keys(latest.clients);
    const clientIp = labels[idx];
    
    try {
        // Chamada de API para obter os detalhes do protocolo daquele cliente e janela
        const drilldownResponse = await fetch(`${API_BASE_URL}/api/drilldown?start=${latest.start}&client=${clientIp}`);
        if (!drilldownResponse.ok) {
            throw new Error(`Erro ao buscar drilldown: ${drilldownResponse.status}`);
        }
        const drilldownData = await drilldownResponse.json();
        // Define o estado para abrir o modal
        setSelectedDrilldown({ ip: clientIp, protocols: drilldownData.protocols });

    } catch (err) {
        console.error('Erro no drilldown:', err);
    }
  };

  // Lógica para calcular a agregação TOTAL de protocolos (USADA NO NOVO COMPONENTE)
  const protocolsSummary = useMemo(() => {
      if (!latest || !latest.clients) return {};
      
      const summary = {};
      
      // Itera sobre todos os clientes na janela atual
      Object.values(latest.clients).forEach(client => {
          // Itera sobre os protocolos de cada cliente
          Object.entries(client.protocols || {}).forEach(([protocol, bytes]) => {
              summary[protocol] = (summary[protocol] || 0) + bytes;
          });
      });
      return summary;
  }, [latest]);


  // Prepara os dados do gráfico principal
  const chartData = useMemo(() => {
    if (!latest || !latest.clients || Object.keys(latest.clients).length === 0) {
      return { labels: ['Nenhum Tráfego Registrado'], datasets: [] };
    }

    const labels = Object.keys(latest.clients);
    const inData = labels.map(ip => latest.clients[ip].in);
    const outData = labels.map(ip => latest.clients[ip].out);
    
    const convertToKB = (bytes) => (bytes / 1024).toFixed(2); 

    return {
      labels,
      datasets: [
        { 
            label: 'Tráfego de Entrada (In)', 
            data: inData.map(convertToKB), 
            stack: 'stack1',
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            borderRadius: 6,
        },
        { 
            label: 'Tráfego de Saída (Out)', 
            data: outData.map(convertToKB), 
            stack: 'stack1',
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            borderRadius: 6,
        }
      ]
    };
  }, [latest]);

  const chartOptions = {
    onClick: handleBarClick,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
        tooltip: { 
            mode: 'index', 
            intersect: false, 
            callbacks: {
                label: (context) => `${context.dataset.label}: ${context.parsed.y} KB`,
            }
        },
        title: {
            display: true,
            text: `Volume de Tráfego por Cliente (Atualizado: ${new Date(latest?.start * 1000).toLocaleTimeString()} | Horário Atual: ${currentTime.toLocaleTimeString()})`,
            font: { size: 16, weight: 'bold' }
        },
        legend: { position: 'top' },
    },
    scales: { 
        x: { 
            stacked: true, 
            title: { display: true, text: 'Endereço IP do Cliente' },
            ticks: { font: { size: 10 } }
        }, 
        y: { 
            stacked: true,
            title: { display: true, text: 'Tráfego Transferido (KB)' },
            beginAtZero: true
        } 
    }
  };

  if (loading) {
    return <div className="p-5 text-lg font-medium text-gray-600">Conectando ao sistema de monitoramento...</div>;
  }

  if (error) {
    return (
        <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-3xl">
            <h2 className="font-bold text-xl mb-2">Erro de Conexão ou Configuração</h2>
            <p className="text-sm">{error}</p>
            <p className="mt-4 text-sm font-semibold">Passos para Solução:</p>
            <ul className="list-disc list-inside text-sm mt-1">
                <li>Verifique se o seu backend (Uvicorn) está rodando em **`http://localhost:8000`**.</li>
                <li>Confirme se você instalou o **Npcap** (com o modo compatível com WinPcap) para a Scapy funcionar no Windows.</li>
                <li>Verifique se o **`SERVER_IP`** no `backend/app.py` é o IP local correto da sua máquina.</li>
            </ul>
        </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Dashboard de Monitoramento de Redes</h1>
        <p className="text-gray-500 mt-1">Análise em Tempo Real (Atualização a cada {INTERVAL_MS / 1000}s)</p>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div className="h-[400px] w-full">
          <Bar data={chartData} options={chartOptions} />
        </div>
        
        {/* Instruções para o Drill Down */}
        {Object.keys(latest?.clients || {}).length > 0 && (
            <p className="mt-4 text-center text-sm text-indigo-600 font-medium">
                Clique em uma barra de cliente para ver a quebra de tráfego por protocolo (Drill Down).
            </p>
        )}
        
        {/* Mensagem quando não há dados */}
        {Object.keys(latest?.clients || {}).length === 0 && (
            <div className="mt-4 text-center text-lg text-gray-500">
                <p>Nenhum tráfego detectado na última janela ({new Date(latest.start * 1000).toLocaleTimeString()}).</p>
                <p className="text-sm mt-1">Verifique se o Npcap está instalado e se o tráfego está sendo gerado.</p>
            </div>
        )}
      </div>

      {/* SEÇÃO NOVA COM GRÁFICOS DE PROTOCOLO PORCENTUAL */}
      <ProtocolSummaryCharts protocolsSummary={protocolsSummary} />

      <footer className="mt-10 text-center text-sm text-gray-400">
        Dashboard de Monitoramento de Redes | Desenvolvido com FastAPI e React
      </footer>

      {/* Modal de Drilldown é ONDE OS PROTOCOLOS SÃO MOSTRADOS DETALHADAMENTE */}
      {selectedDrilldown && (
        <ProtocolDrilldown 
          protocols={selectedDrilldown.protocols} 
          clientIp={selectedDrilldown.ip} 
          onClose={() => setSelectedDrilldown(null)} 
        />
      )}
    </div>
  )
}
