import React, { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

// ENDEREÇO BASE DA API: Certifique-se de que sua API Python está rodando na porta 8000
const API_BASE_URL = 'http://localhost:8000'

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Componente Drilldown para substituir o alert (melhor prática!)
function ProtocolDrilldown({ protocols, onClose }) {
  if (!protocols) return null
  
  const protocolData = {
    labels: Object.keys(protocols),
    datasets: [{
      label: 'Volume de Tráfego (Bytes)',
      data: Object.values(protocols),
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
    }]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Quebra de Tráfego por Protocolo' },
    },
    indexAxis: 'y', // Gráfico horizontal para protocolos
  }

  return (
    <div className="drilldown-modal">
      <div className="modal-content">
        <h3 className="text-xl font-bold mb-4">Análise por Protocolo</h3>
        <div className="w-full h-80">
          <Bar data={protocolData} options={options} />
        </div>
        <button onClick={onClose} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}


export default function App() {
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [drilldownData, setDrilldownData] = useState(null) // Novo estado para o drilldown

  // Função centralizada para buscar dados da API
  const fetchData = async () => {
    try {
      // 1. Fetch Latest Data
      const latestResponse = await fetch(`${API_BASE_URL}/api/windows/latest`)
      if (!latestResponse.ok) throw new Error(`HTTP error! status: ${latestResponse.status} - Latest`)
      const latestData = await latestResponse.json()
      setLatest(latestData)

      // 2. Fetch History Data
      const historyResponse = await fetch(`${API_BASE_URL}/api/windows/history?n=12`)
      if (!historyResponse.ok) throw new Error(`HTTP error! status: ${historyResponse.status} - History`)
      const historyData = await historyResponse.json()
      setHistory(historyData)

      setLoading(false)
    } catch (err) {
      // O erro de JSON ocorrerá aqui se o backend não estiver acessível
      console.error('Falha na comunicação com o backend. Verifique se o uvicorn está rodando na porta 8000.', err)
      setLoading(false)
      // Mantenha o erro original do console para facilitar a depuração
    }
  }

  useEffect(() => {
    fetchData() // Chama a função na montagem
    const iv = setInterval(fetchData, 5000) // E a cada 5 segundos
    return () => clearInterval(iv)
  }, []) // Dependências vazias

  // Função para lidar com o clique (Drill Down)
  const handleBarClick = async (evt, elements) => {
    if (!elements.length || !latest?.clients) return
    const idx = elements[0].index
    const labels = Object.keys(latest.clients)
    const client = labels[idx]

    try {
      const response = await fetch(`${API_BASE_URL}/api/drilldown?start=${latest.start}&client=${client}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - Drilldown`)
      const data = await response.json()
      setDrilldownData(data.protocols) // Abre o modal
    } catch (err) {
      console.error('Erro no Drilldown:', err)
      alert('Erro ao buscar detalhes do protocolo. Verifique o console.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-xl font-medium text-gray-700">Conectando ao Backend...</div>
      </div>
    )
  }

  if (!latest || !latest.clients) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-100">
        <div className="p-8 bg-white shadow-xl rounded-lg border border-red-300">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erro de Conexão</h2>
          <p className="text-gray-700">Não foi possível carregar os dados. 🚨</p>
          <p className="text-sm mt-2">Certifique-se de que o backend Python (uvicorn) está rodando em **`http://localhost:8000`**.</p>
        </div>
      </div>
    )
  }

  // Preparação de dados para o gráfico principal
  const labels = Object.keys(latest.clients)
  const inData = labels.map(ip => latest.clients[ip].in)
  const outData = labels.map(ip => latest.clients[ip].out)

  const data = {
    labels,
    datasets: [
      { 
        label: 'Tráfego de Entrada (In)', 
        data: inData, 
        stack: 'stack1',
        backgroundColor: 'rgba(52, 211, 153, 0.8)', // Cor verde Tailwind
      },
      { 
        label: 'Tráfego de Saída (Out)', 
        data: outData, 
        stack: 'stack1',
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Cor azul Tailwind
      }
    ]
  }

  const options = {
    onClick: (evt, items) => handleBarClick(evt, items),
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      tooltip: { mode: 'index', intersect: false },
      legend: { position: 'top' },
      title: { display: true, text: `Volume de Tráfego por Cliente (Janela: ${new Date(latest.start * 1000).toLocaleTimeString()})` }
    },
    scales: { 
      x: { 
        stacked: true, 
        title: { display: true, text: 'Endereço IP do Cliente' }
      }, 
      y: { 
        stacked: true, 
        title: { display: true, text: 'Bytes Transferidos' }
      } 
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900">Monitoramento de Tráfego do Servidor</h1>
        <p className="text-xl text-gray-600 mt-2">Análise em Tempo Real (Atualização a cada 5s)</p>
      </header>

      {/* Gráfico Principal */}
      <div className="bg-white p-6 rounded-xl shadow-2xl transition duration-500 hover:shadow-3xl">
        <div style={{ height: '500px' }}>
          <Bar data={data} options={options} />
        </div>
      </div>

      {/* Histórico Simples */}
      <div className="mt-8 p-6 bg-gray-100 rounded-xl shadow-inner">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Últimas 12 Janelas de Tempo</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {history.map(window => (
            <li key={window.start} className="bg-white p-3 rounded-lg shadow-md text-sm">
              <span className="font-bold text-blue-600">{new Date(window.start * 1000).toLocaleTimeString()}</span>: {' '}
              Total Clientes: <span className="font-medium text-gray-800">{Object.keys(window.clients).length}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal de Drilldown (agora como componente) */}
      {drilldownData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <ProtocolDrilldown 
            protocols={drilldownData} 
            onClose={() => setDrilldownData(null)} 
          />
        </div>
      )}

      {/* Adicionei algumas classes para o CSS/Estilo do Modal */}
      <style>{`
        .drilldown-modal {
          width: 90%;
          max-width: 800px;
          background-color: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  )
}