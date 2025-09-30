import React, { useEffect, useState, useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { 
  Chart, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend, BarController, ArcElement
} from 'chart.js'

// Registra os componentes necessários para os gráficos
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController, ArcElement)

const API_BASE_URL = 'http://localhost:8000'
const INTERVAL_MS = 5000 
const INITIAL_RETRY_DELAY_MS = 2000; 

// Mapeamento de Cores para Protocolos (Paleta profissional)
const PROTOCOL_COLORS = {
    'HTTP': { bg: 'rgba(78, 116, 222, 0.9)', border: '#4E74DE' },     
    'HTTPS': { bg: 'rgba(102, 179, 102, 0.9)', border: '#66B366' },  
    'FTP': { bg: 'rgba(255, 179, 71, 0.9)', border: '#FFB347' },     
    'SMTP': { bg: 'rgba(170, 100, 255, 0.9)', border: '#AA64FF' },   
    'SSH': { bg: 'rgba(255, 99, 132, 0.9)', border: '#FF6384' },     
    'DNS': { bg: 'rgba(54, 162, 235, 0.9)', border: '#36A2EB' },     
    'TCP': { bg: 'rgba(153, 153, 153, 0.9)', border: '#999999' },    
    'UDP': { bg: 'rgba(255, 205, 86, 0.9)', border: '#FFCD56' },     
    'Other': { bg: 'rgba(201, 203, 207, 0.9)', border: '#C9CBCE' },  
};

// --- UTILITÁRIO: Converte Bytes para formato legível (KB, MB) ---
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- Componente para o Modal de Drill Down ---
function ProtocolDrilldown({ protocols, clientIp, onClose }) {
  if (!protocols) return null;

  const labels = Object.keys(protocols);
  const dataValues = labels.map(label => protocols[label]);
  const totalBytes = dataValues.reduce((sum, bytes) => sum + bytes, 0);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Bytes por Protocolo',
        data: dataValues,
        backgroundColor: labels.map(label => (PROTOCOL_COLORS[label] || PROTOCOL_COLORS['Other']).bg),
        borderColor: labels.map(label => (PROTOCOL_COLORS[label] || PROTOCOL_COLORS['Other']).border),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Quebra de Tráfego: ${clientIp} (${formatBytes(totalBytes)} Total)`,
        color: '#1f2937',
        font: { size: 18, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${formatBytes(context.parsed.x)}`,
        }
      }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Bytes Transferidos', color: '#4b5563' }, 
        ticks: { beginAtZero: true, callback: (value) => formatBytes(value), color: '#4b5563' },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#4b5563' }
      }
    }
  };


  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl transform scale-100 transition-transform duration-300">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center">
            <span className="w-3 h-3 bg-indigo-600 rounded-full mr-3"></span> Análise Profunda do Cliente: <span className="ml-2 text-indigo-700">{clientIp}</span>
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-red-500 transition duration-150 p-1 text-3xl leading-none"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>
        <div className="h-96"> {/* Aumento de tamanho para 384px */}
          <Bar data={data} options={options} /> 
        </div>
        <p className="mt-8 text-sm text-gray-600 text-center">
          O gráfico mostra a proporção do tráfego de entrada e saída, detalhado por cada protocolo utilizado na janela.
        </p>
      </div>
    </div>
  );
}

// --- COMPONENTE KPI BAR (Novo) ---
function KpiBar({ totalIn, totalOut, clientCount }) {
    const totalTraffic = totalIn + totalOut;

    const data = [
        { label: 'Tráfego Total de Entrada', value: formatBytes(totalIn), color: 'border-blue-600', icon: '&#8595;' }, // Azul
        { label: 'Tráfego Total de Saída', value: formatBytes(totalOut), color: 'border-red-600', icon: '&#8593;' }, // Vermelho
        { label: 'Clientes Únicos Ativos', value: clientCount, color: 'border-indigo-600', icon: '&#128100;' }, // Índigo
        { label: 'Tráfego Total da Janela', value: formatBytes(totalTraffic), color: 'border-green-600', icon: '&#128200;' }, // Verde
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {data.map((item, index) => (
                <div 
                    key={index} 
                    className={`bg-white p-5 rounded-xl shadow-lg border-l-8 ${item.color} transition-shadow hover:shadow-2xl`}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-500">{item.label}</p>
                        <span className="text-2xl text-gray-600" dangerouslySetInnerHTML={{ __html: item.icon }} />
                    </div>
                    <p className="text-4xl font-extrabold text-gray-900 mt-2">{item.value}</p>
                </div>
            ))}
        </div>
    );
}


// --- NOVO COMPONENTE: Gráficos de Resumo de Protocolos (Donut) ---
function ProtocolSummaryCharts({ protocolsSummary }) {
    if (!protocolsSummary || Object.keys(protocolsSummary).length === 0) {
        return (
            <div className="p-6 text-center text-gray-500 bg-white rounded-xl shadow-lg mt-8">
                Aguardando tráfego para gerar o resumo dos protocolos...
            </div>
        );
    }

    const validProtocols = Object.entries(protocolsSummary).filter(([, bytes]) => bytes > 0);
    const totalBytes = validProtocols.reduce((sum, [, bytes]) => sum + bytes, 0);

    return (
        <section className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2 flex items-center">
                <span className="w-5 h-5 bg-indigo-600 rounded-sm mr-3 transform rotate-45"></span> Resumo de Tráfego por Protocolo
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {validProtocols.map(([protocol, bytes]) => {
                    const percentage = totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : 0;
                    const color = PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS['Other'];

                    const chartData = {
                        labels: [protocol, 'Outros'],
                        datasets: [{
                            data: [bytes, totalBytes - bytes],
                            backgroundColor: [color.border, '#e5e7eb'],
                            borderColor: [color.border, '#d1d5db'],
                            borderWidth: 1,
                        }]
                    };

                    const chartOptions = {
                        responsive: true,
                        cutout: '85%', 
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: () => `${protocol}: ${percentage}%`,
                                    title: () => `${formatBytes(bytes)}`,
                                }
                            }
                        }
                    };

                    return (
                        <div key={protocol} className="bg-white p-4 rounded-xl shadow-md flex flex-col items-center border border-gray-100 transition-shadow hover:shadow-xl">
                            <h3 className="text-sm font-semibold text-gray-700 truncate w-full text-center mb-3">
                                {protocol}
                            </h3>
                            <div className="relative h-20 w-20">
                                <Doughnut data={chartData} options={chartOptions} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-extrabold text-indigo-700">{percentage}%</span>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-500 font-medium">
                                {formatBytes(bytes)}
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
      setLoading(false); 
      setError(null);

    } catch (err) {
      console.error('Erro ao buscar dados da API:', err);
      
      if (!loading) {
          setError("Conexão com o Backend Interrompida. Verifique o servidor (porta 8000).");
      }
    }
  };
  
  // 1. Hook para buscar dados a cada 5 segundos (Operação Sustentada)
  useEffect(() => {
    if (loading) return; 
    
    const dataInterval = setInterval(fetchData, INTERVAL_MS);
    return () => clearInterval(dataInterval);
  }, [loading]); 

  // 2. Hook para Conexão Inicial e Retries (Lógica de retentativa para Failed to Fetch)
  useEffect(() => {
    if (!loading) return; 
    
    let timerId;

    const attemptInitialConnect = async () => {
        try {
            const latestResponse = await fetch(`${API_BASE_URL}/api/windows/latest`);
            if (!latestResponse.ok) {
                throw new Error(`Erro ${latestResponse.status} na API /latest`);
            }
            const latestData = await latestResponse.json();
            setLatest(latestData);
            setLoading(false); 
            setError(null);
        } catch (err) {
            timerId = setTimeout(attemptInitialConnect, INITIAL_RETRY_DELAY_MS);
            setError(`Tentando conectar ao backend... Re-tentando em ${INITIAL_RETRY_DELAY_MS / 1000} segundos.`);
        }
    };
    
    attemptInitialConnect(); 
    return () => clearTimeout(timerId); 
  }, [loading]); 

  // 3. Hook para o timer que se move a cada segundo
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); 
    return () => clearInterval(clockInterval);
  }, []); 


  const handleBarClick = async (evt, elements) => {
    if (!elements.length || !latest?.clients || selectedDrilldown) return;

    const idx = elements[0].index;
    const labels = Object.keys(latest.clients);
    const clientIp = labels[idx];
    
    try {
        const drilldownResponse = await fetch(`${API_BASE_URL}/api/drilldown?start=${latest.start}&client=${clientIp}`);
        if (!drilldownResponse.ok) {
            throw new Error(`Erro ao buscar drilldown: ${drilldownResponse.status}`);
        }
        const drilldownData = await drilldownResponse.json();
        setSelectedDrilldown({ ip: clientIp, protocols: drilldownData.protocols });

    } catch (err) {
        console.error('Erro no drilldown:', err);
        alert(`Não foi possível carregar os detalhes do cliente ${clientIp}.`);
    }
  };

  // Lógica para calcular a agregação TOTAL de protocolos
  const { protocolsSummary, totalInBytes, totalOutBytes } = useMemo(() => {
      if (!latest || !latest.clients) return { protocolsSummary: {}, totalInBytes: 0, totalOutBytes: 0 };
      
      const summary = {};
      let totalIn = 0;
      let totalOut = 0;
      
      Object.values(latest.clients).forEach(client => {
          totalIn += client.in || 0;
          totalOut += client.out || 0;

          Object.entries(client.protocols || {}).forEach(([protocol, bytes]) => {
              summary[protocol] = (summary[protocol] || 0) + bytes;
          });
      });
      return { protocolsSummary: summary, totalInBytes: totalIn, totalOutBytes: totalOut };
  }, [latest]);


  // Prepara os dados do gráfico principal
  const chartData = useMemo(() => {
    if (!latest || !latest.clients || Object.keys(latest.clients).length === 0) {
      return { labels: ['Nenhum Tráfego Registrado'], datasets: [] };
    }

    const labels = Object.keys(latest.clients);
    const inData = labels.map(ip => latest.clients[ip].in);
    const outData = labels.map(ip => latest.clients[ip].out);
    
    const rawData = {
      labels,
      datasets: [
        { 
            label: 'Tráfego de Entrada (In)', 
            data: inData, 
            stack: 'stack1',
            backgroundColor: '#36A2EB', // Azul
            borderColor: '#36A2EB',
            borderWidth: 1,
            borderRadius: 6,
        },
        { 
            label: 'Tráfego de Saída (Out)', 
            data: outData, 
            stack: 'stack1',
            backgroundColor: '#FF6384', // Vermelho
            borderColor: '#FF6384',
            borderWidth: 1,
            borderRadius: 6,
        }
      ]
    };
    return rawData;
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
                label: (context) => `${context.dataset.label}: ${formatBytes(context.parsed.y)}`,
            }
        },
        title: {
            display: true,
            text: `Volume de Tráfego por Cliente (Janela: ${new Date(latest?.start * 1000).toLocaleTimeString()})`,
            font: { size: 18, weight: 'bold' },
            color: '#1f2937'
        },
        legend: { position: 'top', labels: { color: '#1f2937' } },
    },
    scales: { 
        x: { 
            stacked: true, 
            title: { display: true, text: 'Endereço IP do Cliente', color: '#374151' },
            ticks: { font: { size: 11 }, color: '#4b5563' },
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }, 
        y: { 
            stacked: true,
            title: { display: true, text: 'Tráfego Transferido', color: '#374151' },
            beginAtZero: true,
            ticks: { color: '#4b5563', callback: (value) => formatBytes(value) },
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
        } 
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="p-6 bg-white rounded-xl shadow-lg flex flex-col items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg font-medium text-gray-600 mt-3">Conectando ao sistema de monitoramento...</span>
                {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
            </div>
        </div>
    );
  }

  if (error && !loading) {
    return (
        <div className="flex items-start justify-center min-h-screen bg-gray-50 p-10">
            <div className="p-8 bg-red-50 border border-red-400 text-red-700 rounded-xl shadow-xl max-w-4xl w-full">
                <h2 className="font-bold text-2xl mb-4 flex items-center">
                    <span className="text-3xl mr-2">&times;</span> Conexão Interrompida
                </h2>
                <p className="text-base mb-4">{error}</p>
                <p className="mt-4 text-sm font-semibold border-t pt-3 border-red-200">A aplicação está em modo de reconexão automática. Tente reiniciar o backend.</p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>Verifique se o seu backend (Uvicorn) está rodando em **`http://localhost:8000`**.</li>
                </ul>
            </div>
        </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen font-sans">
      
      {/* CABEÇALHO */}
      <header className="mb-8 bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-600">
        <div className="flex justify-between items-center flex-wrap">
            <h1 className="text-3xl font-extrabold text-gray-900">Dashboard de Monitoramento de Redes</h1>
            <p className="text-gray-500 text-sm mt-2 sm:mt-0">
                Análise em Tempo Real (5s) | 
                <span className="font-medium text-indigo-600 ml-1">Horário: {currentTime.toLocaleTimeString()}</span>
            </p>
        </div>
      </header>

      {/* KPI BAR */}
      <KpiBar 
          totalIn={totalInBytes} 
          totalOut={totalOutBytes} 
          clientCount={Object.keys(latest?.clients || {}).length} 
      />

      {/* GRÁFICO PRINCIPAL DE TRÁFEGO POR CLIENTE */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
        <div className="h-[450px] w-full"> {/* Gráfico Principal com tamanho aumentado */}
          <Bar data={chartData} options={chartOptions} />
        </div>
        
        {/* Instruções para o Drill Down */}
        {Object.keys(latest?.clients || {}).length > 0 && (
            <p className="mt-6 text-center text-sm text-indigo-600 font-bold border-t pt-3">
                <span className="bg-indigo-100 px-3 py-1 rounded-full hover:bg-indigo-200 transition-colors cursor-pointer">Clique em uma barra de cliente para o Drill Down (detalhe por protocolo)</span>
            </p>
        )}
        
        {/* Mensagem quando não há dados */}
        {Object.keys(latest?.clients || {}).length === 0 && (
            <div className="mt-6 text-center text-lg text-gray-500 bg-gray-50 p-4 rounded-lg">
                <p>Nenhum tráfego detectado na última janela ({new Date(latest.start * 1000).toLocaleTimeString()}).</p>
                <p className="text-sm mt-1">Gere tráfego HTTP, FTP, SSH, etc., para o IP do servidor-alvo.</p>
            </div>
        )}
      </div>

      {/* SEÇÃO NOVA COM GRÁFICOS DE PROTOCOLO PORCENTUAL */}
      <ProtocolSummaryCharts protocolsSummary={protocolsSummary} />

      <footer className="mt-10 text-center text-xs text-gray-400">
        Dashboard de Monitoramento de Redes | Desenvolvido com FastAPI (Python) e React
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
