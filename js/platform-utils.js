    (function() {
        const modal = document.getElementById('chart-modal');
        const modalCanvas = document.getElementById('chart-modal-canvas');
        const closeBtn = document.getElementById('chart-modal-close');
        let currentModalChart = null;

        // Verificar que los elementos existen antes de continuar
        if (!modal || !modalCanvas || !closeBtn) {
            console.warn('⚠️ Elementos del modal de gráficos no encontrados en el DOM');
            return;
        }

        // Función para abrir el modal con un gráfico
        function openChartModal(sourceCanvas) {
            if (!sourceCanvas) return;

            // Buscar la instancia de Chart.js asociada al canvas
            let chartInstance = null;
            
            // Método 1: Buscar en Chart.instances (Chart.js 3.x)
            if (window.Chart && Chart.instances) {
                for (let i = 0; i < Chart.instances.length; i++) {
                    if (Chart.instances[i].canvas === sourceCanvas) {
                        chartInstance = Chart.instances[i];
                        break;
                    }
                }
            }
            
            // Método 2: Buscar en la propiedad chart del canvas (si existe)
            if (!chartInstance && sourceCanvas.chart) {
                chartInstance = sourceCanvas.chart;
            }
            
            // Método 3: Usar Chart.getChart() si está disponible (Chart.js 3.x)
            if (!chartInstance && window.Chart && Chart.getChart) {
                chartInstance = Chart.getChart(sourceCanvas);
            }

            if (!chartInstance) {
                console.warn('No se encontró instancia de gráfico para el canvas');
                return;
            }

            const config = chartInstance.config;

            // Crear una copia profunda del config para el modal
            const modalConfig = {
                type: config.type,
                data: JSON.parse(JSON.stringify(config.data)),
                options: JSON.parse(JSON.stringify(config.options || {}))
            };

            // Ajustar tamaño y responsive
            if (!modalConfig.options) modalConfig.options = {};
            modalConfig.options.maintainAspectRatio = true;
            modalConfig.options.responsive = true;

            // Destruir gráfico anterior si existe
            if (currentModalChart) {
                currentModalChart.destroy();
                currentModalChart = null;
            }

            // Mostrar modal
            modal.classList.add('active');

            // Crear nuevo gráfico en el modal
            setTimeout(() => {
                const ctx = modalCanvas.getContext('2d');
                currentModalChart = new Chart(ctx, modalConfig);
            }, 100);
        }

        // Función para cerrar el modal
        function closeChartModal() {
            modal.classList.remove('active');
            if (currentModalChart) {
                currentModalChart.destroy();
                currentModalChart = null;
            }
        }

        // Event listeners
        closeBtn.addEventListener('click', closeChartModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeChartModal();
            }
        });

        // Cerrar con tecla ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeChartModal();
            }
        });

        // Agregar click listeners a todos los canvas de gráficos
        function initChartClickListeners() {
            // Buscar todos los canvas que contienen gráficos (id termina en 'chart' o contiene 'chart')
            const canvasElements = document.querySelectorAll('canvas[id*="chart"], canvas[id*="-gauge"]');
            
            canvasElements.forEach(canvas => {
                // Evitar duplicados
                if (canvas.hasAttribute('data-chart-modal-ready')) return;
                canvas.setAttribute('data-chart-modal-ready', 'true');
                
                // Buscar el contenedor más apropiado
                let container = canvas.closest('.chart-container');
                if (!container) {
                    container = canvas.closest('.metric-card, .stat-card, .chart-box');
                }
                
                // Si no hay contenedor, usar el canvas directamente
                const clickTarget = container || canvas;
                
                if (!clickTarget.classList.contains('chart-clickable')) {
                    clickTarget.classList.add('chart-clickable');
                    clickTarget.style.cursor = 'pointer';
                    
                    clickTarget.addEventListener('click', function(e) {
                        // Evitar abrir modal si se hace clic en botones dentro del contenedor
                        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                            return;
                        }
                        // Evitar si se hace clic en inputs o selects
                        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.closest('input, select')) {
                            return;
                        }
                        openChartModal(canvas);
                    });
                }
            });
        }

        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initChartClickListeners);
        } else {
            initChartClickListeners();
        }

        // Reinicializar cuando se cambien vistas o se creen nuevos gráficos
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    initChartClickListeners();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Event listeners para modal de retiros (con verificación de existencia)
        const closeWithdrawalBtn = document.getElementById('close-withdrawal-modal');
        const cancelWithdrawalBtn = document.getElementById('cancel-withdrawal-btn');
        const withdrawalForm = document.getElementById('withdrawal-form');
        const withdrawalModal = document.getElementById('withdrawal-modal');

        if (closeWithdrawalBtn && typeof closeWithdrawalModal !== 'undefined') {
            closeWithdrawalBtn.addEventListener('click', closeWithdrawalModal);
        }
        
        if (cancelWithdrawalBtn && typeof closeWithdrawalModal !== 'undefined') {
            cancelWithdrawalBtn.addEventListener('click', closeWithdrawalModal);
        }
        
        if (withdrawalForm) {
            withdrawalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (typeof saveWithdrawal !== 'undefined') {
                    await saveWithdrawal();
                }
            });
        }

        // Cerrar modal al hacer click fuera
        if (withdrawalModal && typeof closeWithdrawalModal !== 'undefined') {
            withdrawalModal.addEventListener('click', (e) => {
                if (e.target.id === 'withdrawal-modal') {
                    closeWithdrawalModal();
                }
            });
        }


        // Exponer función globalmente por si se necesita llamar manualmente
        window.openChartModal = openChartModal;
    })();

// =============================================
// MARKET SCANNER - NOTICIAS
// =============================================
console.log('📰 Inicializando Market Scanner...');

// API Configuration
const FINNHUB_API_KEY = 'd5qg241r01qhn30ffdq0d5qg241r01qhn30ffdqg';
const ALPHAVANTAGE_KEY = 'SU0HM9RG6FUID5Y7';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const EXCHANGERATE_BASE = 'https://api.exchangerate-api.com/v4/latest';
const ALPHAVANTAGE_BASE = 'https://www.alphavantage.co/query';

// Almacenar tasas de cambio base
let forexRates = {};
let lastForexUpdate = 0;

// Variables globales para filtros de fecha
let dateFilterFrom = null;
let dateFilterTo = null;

// Cache para reducir llamadas a la API
const cache = {
    data: {},
    timestamp: {},
    TTL: 60000, // 1 minuto (default)
    TTL_ALPHAVANTAGE: 300000 // 5 minutos para Alpha Vantage (límite 25/día)
};

// Datos de mercado (se actualizarán con API real)
let marketData = {
    indices: [],
    crypto: [],
    forex: [],
    commodities: []
};

let currentSector = 'indices';

// Función para hacer fetch con cache
async function fetchWithCache(url, cacheKey, useExtendedTTL = false) {
        const now = Date.now();
        const ttl = useExtendedTTL ? cache.TTL_ALPHAVANTAGE : cache.TTL;
        
        if (cache.data[cacheKey] && (now - cache.timestamp[cacheKey]) < ttl) {
            console.log(`📦 Cache hit: ${cacheKey}`);
            return cache.data[cacheKey];
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Silencioso para errores de API (límites excedidos, etc.)
                if (cache.data[cacheKey]) return cache.data[cacheKey];
                return null;
            }
            const data = await response.json();
            cache.data[cacheKey] = data;
            cache.timestamp[cacheKey] = now;
            console.log(`✅ API fetch: ${cacheKey}`);
            return data;
        } catch (error) {
            // Silencioso: devolver cache si existe
            return cache.data[cacheKey] || null;
        }
    }

    // Cargar datos de Crypto desde CoinGecko (GRATIS, sin API key)
    async function loadCryptoData() {
        try {
            const data = await fetchWithCache(
                `${COINGECKO_BASE}/simple/price?ids=bitcoin,ethereum,solana,ripple,cardano,dogecoin&vs_currencies=usd&include_24hr_change=true`,
                'crypto'
            );

            if (data) {
                marketData.crypto = [
                    { name: 'Bitcoin', symbol: 'BTC', price: data.bitcoin?.usd || 0, change: data.bitcoin?.usd_24h_change || 0 },
                    { name: 'Ethereum', symbol: 'ETH', price: data.ethereum?.usd || 0, change: data.ethereum?.usd_24h_change || 0 },
                    { name: 'Solana', symbol: 'SOL', price: data.solana?.usd || 0, change: data.solana?.usd_24h_change || 0 },
                    { name: 'XRP', symbol: 'XRP', price: data.ripple?.usd || 0, change: data.ripple?.usd_24h_change || 0 },
                    { name: 'Cardano', symbol: 'ADA', price: data.cardano?.usd || 0, change: data.cardano?.usd_24h_change || 0 },
                    { name: 'Dogecoin', symbol: 'DOGE', price: data.dogecoin?.usd || 0, change: data.dogecoin?.usd_24h_change || 0 }
                ];
                console.log('✅ Crypto data loaded:', marketData.crypto);
            }
        } catch (error) {
            console.error('❌ Error loading crypto:', error);
        }
    }

    // Cargar datos de Forex desde ExchangeRate-API (GRATIS)
    async function loadForexData() {
        try {
            // Obtener tasas actuales desde USD base
            const data = await fetchWithCache(
                `${EXCHANGERATE_BASE}/USD`,
                'forex_rates'
            );

            if (data && data.rates) {
                // Guardar las tasas para calcular pares cruzados
                const prevRates = {...forexRates};
                forexRates = data.rates;
                
                // Calcular pares principales
                const pairs = [
                    { name: 'EUR/USD', base: 'EUR', quote: 'USD' },
                    { name: 'GBP/USD', base: 'GBP', quote: 'USD' },
                    { name: 'USD/JPY', base: 'USD', quote: 'JPY' },
                    { name: 'USD/CHF', base: 'USD', quote: 'CHF' },
                    { name: 'AUD/USD', base: 'AUD', quote: 'USD' },
                    { name: 'USD/CAD', base: 'USD', quote: 'CAD' }
                ];

                marketData.forex = pairs.map(pair => {
                    let price;
                    if (pair.base === 'USD') {
                        price = forexRates[pair.quote];
                    } else if (pair.quote === 'USD') {
                        price = 1 / forexRates[pair.base];
                    } else {
                        price = forexRates[pair.quote] / forexRates[pair.base];
                    }

                    // Calcular cambio % comparando con tasas previas
                    let change = 0;
                    if (prevRates[pair.base] && prevRates[pair.quote]) {
                        let prevPrice;
                        if (pair.base === 'USD') {
                            prevPrice = prevRates[pair.quote];
                        } else if (pair.quote === 'USD') {
                            prevPrice = 1 / prevRates[pair.base];
                        } else {
                            prevPrice = prevRates[pair.quote] / prevRates[pair.base];
                        }
                        change = ((price - prevPrice) / prevPrice) * 100;
                    }

                    return {
                        name: pair.name,
                        symbol: pair.base + pair.quote,
                        price: price,
                        change: change || (Math.random() - 0.5) * 0.5 // Simulado si es primera carga
                    };
                });

                console.log('✅ Forex data loaded:', marketData.forex);
            }
        } catch (error) {
            console.error('❌ Error loading forex:', error);
            // Fallback a datos simulados
            marketData.forex = [
                { name: 'EUR/USD', symbol: 'EURUSD', price: 1.0435, change: 0.15 },
                { name: 'GBP/USD', symbol: 'GBPUSD', price: 1.2123, change: -0.22 },
                { name: 'USD/JPY', symbol: 'USDJPY', price: 157.45, change: 0.34 },
                { name: 'USD/CHF', symbol: 'USDCHF', price: 0.9134, change: 0.12 },
                { name: 'AUD/USD', symbol: 'AUDUSD', price: 0.6234, change: -0.18 },
                { name: 'USD/CAD', symbol: 'USDCAD', price: 1.4356, change: 0.08 }
            ];
        }
    }

    // Cargar datos de Índices desde Alpha Vantage (REAL)
    async function loadIndicesData() {
        try {
            // Usar ETFs que representan los índices principales
            const indices = [
                { name: 'S&P 500', symbol: 'SPY', multiplier: 10 },
                { name: 'Nasdaq 100', symbol: 'QQQ', multiplier: 50 },
                { name: 'Dow Jones', symbol: 'DIA', multiplier: 100 },
                { name: 'DAX 40', symbol: 'EWG', multiplier: 250 },
                { name: 'FTSE 100', symbol: 'EWU', multiplier: 250 },
                { name: 'Nikkei 225', symbol: 'EWJ', multiplier: 600 }
            ];

            marketData.indices = [];

            for (const index of indices) {
                try {
                    const data = await fetchWithCache(
                        `${ALPHAVANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${index.symbol}&apikey=${ALPHAVANTAGE_KEY}`,
                        `index_${index.symbol}`,
                        true // Cache extendido 5 min para Alpha Vantage
                    );

                    if (data && data['Global Quote'] && data['Global Quote']['05. price']) {
                        const quote = data['Global Quote'];
                        const etfPrice = parseFloat(quote['05. price']);
                        const indexPrice = etfPrice * index.multiplier;
                        const change = parseFloat(quote['10. change percent'].replace('%', ''));

                        marketData.indices.push({
                            name: index.name,
                            symbol: index.symbol,
                            price: indexPrice,
                            change: change
                        });
                    }
                } catch (error) {
                    console.error(`Error loading ${index.name}:`, error);
                }
            }

            console.log('✅ Indices data loaded (REAL):', marketData.indices);
        } catch (error) {
            console.error('❌ Error loading indices:', error);
        }
    }

    // Cargar datos de Commodities desde Alpha Vantage (REAL)
    async function loadCommoditiesData() {
        try {
            // Activos principales: Metales preciosos, energía e índices USA
            const assets = [
                { name: 'XAU/USD (Oro)', symbol: 'GLD', multiplier: 18.5, category: 'metal' },
                { name: 'XAG/USD (Plata)', symbol: 'SLV', multiplier: 25, category: 'metal' },
                { name: 'Gas Natural', symbol: 'UNG', multiplier: 3.5, category: 'energy' },
                { name: 'Petróleo WTI', symbol: 'USO', multiplier: 7.5, category: 'energy' },
                { name: 'US100 (Nasdaq)', symbol: 'QQQ', multiplier: 1, category: 'index' },
                { name: 'US500 (S&P 500)', symbol: 'SPY', multiplier: 1, category: 'index' },
                { name: 'US30 (Dow Jones)', symbol: 'DIA', multiplier: 1, category: 'index' },
                { name: 'DAX 40 (Alemania)', symbol: 'DAX', multiplier: 1, category: 'index' }
            ];

            marketData.commodities = [];

            for (const asset of assets) {
                try {
                    const data = await fetchWithCache(
                        `${ALPHAVANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${asset.symbol}&apikey=${ALPHAVANTAGE_KEY}`,
                        `asset_${asset.symbol}`,
                        true // Cache extendido 5 min para Alpha Vantage
                    );

                    if (data && data['Global Quote'] && data['Global Quote']['05. price']) {
                        const quote = data['Global Quote'];
                        const etfPrice = parseFloat(quote['05. price']);
                        const assetPrice = etfPrice * asset.multiplier;
                        const change = parseFloat(quote['10. change percent'].replace('%', ''));

                        marketData.commodities.push({
                            name: asset.name,
                            symbol: asset.symbol,
                            price: assetPrice,
                            change: change,
                            category: asset.category
                        });
                    }
                } catch (error) {
                    console.error(`Error loading ${asset.name}:`, error);
                }
            }

            console.log('✅ Assets data loaded (Metals, Energy, Indices):', marketData.commodities);
        } catch (error) {
            console.error('❌ Error loading assets:', error);
        }
    }

// Calendario económico en español con detalles completos (VARIABLE GLOBAL)
// ACTUALIZADO con eventos REALES según calendarios de Investing.com y FXStreet
const economicEvents = [
    // LUNES 26 DE ENERO 2026
    { 
        time: '14:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Peticiones de bienes duraderos ex transporte', 
        importance: 'medium', 
        forecast: '0.3%', 
        previous: '0.2%',
        actual: '-',
        description: 'Mide el cambio en el valor total de nuevas órdenes de bienes duraderos excluyendo transporte, que es volátil.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Datos fuertes indican demanda manufacturera sólida' },
            { asset: 'S&P 500', direction: 'up', explanation: 'Señal de fortaleza en sector industrial' }
        ],
        interpretation: 'Indicador clave de la salud del sector manufacturero estadounidense.'
    },
    { 
        time: '14:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Peticiones de Bienes Duraderos Excluyendo Defensa', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-1.5%',
        actual: '-',
        description: 'Órdenes de bienes duraderos sin el componente de defensa para ver tendencia subyacente.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Mejora indica fortaleza manufacturera civil' },
            { asset: 'Industriales', direction: 'up', explanation: 'Beneficia a sectores industriales' }
        ],
        interpretation: 'Excluir defensa da una visión más clara de la demanda comercial.'
    },
    { 
        time: '14:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Peticiones de Bienes Duraderos Excluyendo Defensa y Aviación', 
        importance: 'medium', 
        forecast: '-', 
        previous: '0.5%',
        actual: '-',
        description: 'Versión más depurada excluyendo los dos componentes más volátiles.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Dato positivo muestra tendencia manufacturera sólida' },
            { asset: 'Dólar Index', direction: 'up', explanation: 'Fortalece perspectiva económica USA' }
        ],
        interpretation: 'Es la medida más limpia de la demanda manufacturera subyacente.'
    },
    { 
        time: '14:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Índice de actividad nacional de la Fed de Chicago', 
        importance: 'low', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Índice compuesto de 85 indicadores económicos mensuales. Valor de cero = crecimiento tendencial.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Lectura positiva indica economía sobre tendencia' }
        ],
        interpretation: 'Mide presiones inflacionarias y actividad económica general.'
    },
    { 
        time: '16:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Índice de negocios manufactureros de la Fed de Dallas', 
        importance: 'low', 
        forecast: '-', 
        previous: '-10.9',
        actual: '-',
        description: 'Encuesta a fabricantes de Texas sobre condiciones empresariales actuales.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Mejora en manufactura regional apoya al dólar' },
            { asset: 'Petróleo', direction: 'up', explanation: 'Texas es hub energético importante' }
        ],
        interpretation: 'Indicador regional pero Texas es economía clave en USA.'
    },
    { 
        time: '17:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Emisión de bonos a 3 meses', 
        importance: 'low', 
        forecast: '-', 
        previous: '3.59%',
        actual: '-',
        description: 'Tasa de rendimiento de bonos del Tesoro a 3 meses subastados.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Rendimientos altos atraen capital a dólar' },
            { asset: 'Bonos', direction: 'down', explanation: 'Rendimientos altos = precios bajos' }
        ],
        interpretation: 'Refleja expectativas de política monetaria a corto plazo.'
    },
    { 
        time: '17:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Emisión de bonos a 6 meses', 
        importance: 'low', 
        forecast: '-', 
        previous: '3.52%',
        actual: '-',
        description: 'Tasa de rendimiento de bonos del Tesoro a 6 meses subastados.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Tasas atractivas fortalecen dólar' }
        ],
        interpretation: 'Indica apetito por deuda estadounidense de corto plazo.'
    },
    { 
        time: '19:00',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Emisión de Notas del Tesoro a 2 años', 
        importance: 'low', 
        forecast: '-', 
        previous: '3.499%',
        actual: '-',
        description: 'Subasta de notas del Tesoro a 2 años. Demanda indica confianza en economía USA.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Fuerte demanda apoya al dólar' },
            { asset: 'Yields', direction: 'variable', explanation: 'Alta demanda puede bajar yields' }
        ],
        interpretation: 'Refleja expectativas de política de la Fed a mediano plazo.'
    },
    { 
        time: '22:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'PMI de Chicago', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-4.3%',
        actual: '-',
        description: 'Índice de actividad manufacturera en región de Chicago. >50 = expansión.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Lectura fuerte indica economía saludable' },
            { asset: 'Industriales', direction: 'up', explanation: 'Beneficia sector manufacturero' }
        ],
        interpretation: 'Chicago es hub industrial importante, precursor de ISM nacional.'
    },
    { 
        time: '18:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Discurso de Alberto G. Musalem, presidente de la Fed de St. Louis', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Miembro votante del FOMC comparte perspectiva sobre economía y política monetaria.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Comentarios hawkish fortalecen dólar' },
            { asset: 'Bonos', direction: 'variable', explanation: 'Afecta expectativas de tasas' }
        ],
        interpretation: 'Los mercados buscan pistas sobre futuras decisiones de política monetaria.'
    },
    { 
        time: '19:00',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Conteo Equipos Perforación Crudo USA Baker Hughes', 
        importance: 'low', 
        forecast: '-', 
        previous: '411',
        actual: '-',
        description: 'Número de plataformas petrolíferas activas en USA. Indicador de producción futura.',
        impact: [
            { asset: 'Petróleo', direction: 'down', explanation: 'Más plataformas = mayor oferta futura' },
            { asset: 'Energy Stocks', direction: 'up', explanation: 'Mayor actividad beneficia sector' }
        ],
        interpretation: 'Seguido de cerca por el mercado energético para anticipar cambios en producción.'
    },
    { 
        time: '21:30',
        date: '2026-01-26',
        countryCode: 'EUR', 
        event: 'Posiciones netas no comerciales COT del EUR', 
        importance: 'low', 
        forecast: '-', 
        previous: '-€111.7K',
        actual: '-',
        description: 'Reporte de posiciones de traders especulativos en futuros de EUR.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Posiciones largas extremas pueden indicar reversión' }
        ],
        interpretation: 'Herramienta de sentimiento de mercado para posicionamiento institucional.'
    },
    { 
        time: '21:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Posiciones netas no comerciales COT del Oro', 
        importance: 'low', 
        forecast: '-', 
        previous: '-$244.8K',
        actual: '-',
        description: 'Posiciones especulativas en futuros de oro.',
        impact: [
            { asset: 'Oro', direction: 'variable', explanation: 'Cambios grandes pueden anticipar movimientos' }
        ],
        interpretation: 'Indica sentimiento de grandes traders hacia el oro.'
    },
    { 
        time: '21:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Posiciones netas no comerciales COT del Petróleo', 
        importance: 'low', 
        forecast: '-', 
        previous: '78.8K',
        actual: '-',
        description: 'Posicionamiento especulativo en petróleo crudo.',
        impact: [
            { asset: 'Petróleo', direction: 'variable', explanation: 'Exceso de posiciones puede señalar reversión' }
        ],
        interpretation: 'Muestra optimismo o pesimismo institucional sobre precios del crudo.'
    },
    { 
        time: '21:30',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Posiciones netas no comerciales COT del S&P500', 
        importance: 'low', 
        forecast: '-', 
        previous: '-$81.8K',
        actual: '-',
        description: 'Posiciones especulativas en futuros del S&P 500.',
        impact: [
            { asset: 'S&P 500', direction: 'variable', explanation: 'Extremos pueden indicar puntos de giro' }
        ],
        interpretation: 'Refleja sentimiento institucional sobre mercado de acciones USA.'
    },
    { 
        time: '23:00',
        date: '2026-01-26',
        countryCode: 'USA', 
        event: 'Discurso de Michelle Bowman, miembro de la Fed', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Gobernadora de la Fed comparte perspectivas sobre economía y política monetaria.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Tono hawkish fortalece dólar' },
            { asset: 'Yields', direction: 'variable', explanation: 'Afecta expectativas de tasas' }
        ],
        interpretation: 'Los mercados analizan cada palabra para anticipar movimientos de la Fed.'
    },
    
    // MARTES 27 DE ENERO 2026
    { 
        time: '14:30',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Variación del empleo de ADP - Promedio de 4 semanas', 
        importance: 'medium', 
        forecast: '-', 
        previous: '8K',
        actual: '-',
        description: 'Promedio de 4 semanas del cambio en empleo privado según ADP.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Creación fuerte de empleo apoya dólar' },
            { asset: 'S&P 500', direction: 'up', explanation: 'Mercado laboral sólido = economía fuerte' }
        ],
        interpretation: 'Adelanto del NFP oficial. Dato fuerte es alcista para USD.'
    },
    { 
        time: '14:55',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Índice Redbook', 
        importance: 'low', 
        forecast: '-', 
        previous: '5.5%',
        actual: '-',
        description: 'Ventas minoristas en cadenas de tiendas, medición semanal.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Ventas fuertes indican consumo sólido' },
            { asset: 'Retail Stocks', direction: 'up', explanation: 'Beneficia sector minorista' }
        ],
        interpretation: 'Indicador de alta frecuencia del gasto del consumidor.'
    },
    { 
        time: '15:00',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Índice de Precio de vivienda S&P/Case-Shiller', 
        importance: 'medium', 
        forecast: '1.2%', 
        previous: '1.3%',
        actual: '-',
        description: 'Mide cambio mensual en precios de viviendas en 20 ciudades principales.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Precios al alza indican economía fuerte' },
            { asset: 'Construcción', direction: 'up', explanation: 'Sector inmobiliario saludable' },
            { asset: 'Bancos', direction: 'up', explanation: 'Más actividad hipotecaria' }
        ],
        interpretation: 'Indicador clave de salud del mercado inmobiliario estadounidense.'
    },
    { 
        time: '15:00',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Índice de precios de viviendas (MoM)', 
        importance: 'medium', 
        forecast: '0.3%', 
        previous: '0.4%',
        actual: '-',
        description: 'Variación mensual del índice de precios de viviendas.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Aumento indica fortaleza del sector' },
            { asset: 'REITs', direction: 'up', explanation: 'Beneficia al sector inmobiliario' }
        ],
        interpretation: 'Complemento mensual del índice Case-Shiller.'
    },
    { 
        time: '16:00',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Confianza del consumidor', 
        importance: 'high', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Encuesta del Conference Board sobre percepción económica de consumidores.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Alta confianza = mayor gasto futuro' },
            { asset: 'S&P 500', direction: 'up', explanation: 'Consumidores optimistas impulsan mercado' },
            { asset: 'Retail', direction: 'up', explanation: 'Beneficia sector minorista directamente' }
        ],
        interpretation: 'MUY IMPORTANTE. Consumo = ~70% de economía USA. Lectura superior es muy alcista.'
    },
    { 
        time: '16:00',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Índice manufacturero de la Fed de Richmond', 
        importance: 'low', 
        forecast: '-8', 
        previous: '-7',
        actual: '-',
        description: 'Encuesta a fabricantes de la región de Richmond sobre actividad manufacturera.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Mejora indica fortaleza regional' }
        ],
        interpretation: 'Indicador regional. Lectura menos negativa es positiva.'
    },
    { 
        time: '18:00',
        date: '2026-01-27',
        countryCode: 'EUR', 
        event: 'Discurso de Christine Lagarde, presidenta del BCE', 
        importance: 'high', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'La presidenta del BCE habla sobre política monetaria y perspectivas económicas.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Tono hawkish fortalece euro' },
            { asset: 'EUR/USD', direction: 'variable', explanation: 'Comentarios sobre tasas mueven el par' },
            { asset: 'DAX', direction: 'variable', explanation: 'Afecta mercados europeos' }
        ],
        interpretation: 'EVENTO CLAVE. Los mercados buscan pistas sobre futuras subidas/bajadas de tasas.'
    },
    { 
        time: '18:00',
        date: '2026-01-27',
        countryCode: 'EUR', 
        event: 'Discurso de Joachim Nagel, miembro del BCE', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Presidente del Bundesbank y miembro del Consejo del BCE habla sobre política monetaria.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Comentarios hawkish apoyan euro' }
        ],
        interpretation: 'Voz influyente en el BCE, especialmente en temas de inflación.'
    },
    { 
        time: '19:00',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Emisión de Notas del Tesoro a 5 años', 
        importance: 'low', 
        forecast: '-', 
        previous: '3.747%',
        actual: '-',
        description: 'Subasta de notas del Tesoro a 5 años.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Fuerte demanda apoya dólar' },
            { asset: 'Yields', direction: 'down', explanation: 'Alta demanda baja rendimientos' }
        ],
        interpretation: 'Muestra apetito por deuda USA de mediano plazo.'
    },
    { 
        time: '22:30',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'Reservas semanales de crudo del API', 
        importance: 'low', 
        forecast: '-', 
        previous: '-0.7M / 3.04M',
        actual: '-',
        description: 'Cambio semanal en reservas de petróleo crudo según American Petroleum Institute.',
        impact: [
            { asset: 'Petróleo', direction: 'down', explanation: 'Aumento de inventarios presiona precios' },
            { asset: 'CAD', direction: 'down', explanation: 'Petróleo débil afecta monedas exportadoras' }
        ],
        interpretation: 'Adelanto del reporte oficial EIA del miércoles.'
    },
    
    // MIÉRCOLES 28 DE ENERO 2026
    { 
        time: '00:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Masa monetaria M3 (Anual)', 
        importance: 'low', 
        forecast: '3%', 
        previous: '3%',
        actual: '-',
        description: 'Mide el cambio anual en la oferta total de dinero en la Eurozona.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Crecimiento controlado es positivo' },
            { asset: 'Inflación', direction: 'up', explanation: 'Más dinero puede generar presiones inflacionarias' }
        ],
        interpretation: 'El BCE monitorea M3 para evaluar liquidez y riesgos inflacionarios.'
    },
    { 
        time: '00:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Masa monetaria M3 (Mensual)', 
        importance: 'low', 
        forecast: '-', 
        previous: '2.9%',
        actual: '-',
        description: 'Cambio mensual en M3.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Crecimiento excesivo puede preocupar al BCE' }
        ],
        interpretation: 'Complemento mensual del dato anual.'
    },
    { 
        time: '00:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Préstamos Privados (Anual)', 
        importance: 'low', 
        forecast: '2.9%', 
        previous: '2.9%',
        actual: '-',
        description: 'Cambio anual en el total de préstamos al sector privado.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Crecimiento indica actividad económica' },
            { asset: 'Bancos EUR', direction: 'up', explanation: 'Mayor actividad crediticia' }
        ],
        interpretation: 'Indicador de demanda de crédito y actividad económica.'
    },
    { 
        time: '01:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Clima empresarial', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-0.56',
        actual: '-',
        description: 'Encuesta de confianza empresarial en la Eurozona.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Mejora en confianza fortalece euro' },
            { asset: 'STOXX 50', direction: 'up', explanation: 'Optimismo empresarial impulsa bolsas' }
        ],
        interpretation: 'Lectura superior indica mejores expectativas de negocios.'
    },
    { 
        time: '01:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Confianza del consumidor', 
        importance: 'medium', 
        forecast: '-12.4', 
        previous: '-12.4',
        actual: '-',
        description: 'Encuesta mensual de sentimiento del consumidor en la Eurozona.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Mejora indica mayor gasto futuro' },
            { asset: 'Retail EUR', direction: 'up', explanation: 'Beneficia sector minorista europeo' }
        ],
        interpretation: 'Lectura menos negativa o positiva es alcista para EUR.'
    },
    { 
        time: '01:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Confianza en el Sector Servicios', 
        importance: 'low', 
        forecast: '-', 
        previous: '5.6',
        actual: '-',
        description: 'Encuesta de confianza en el sector servicios europeo.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Servicios representan ~70% de economía europea' }
        ],
        interpretation: 'Indicador importante dado el peso de servicios en el PIB.'
    },
    { 
        time: '01:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Confianza Industrial', 
        importance: 'low', 
        forecast: '-', 
        previous: '-8',
        actual: '-',
        description: 'Confianza de fabricantes en la Eurozona.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Mejora indica fortaleza manufacturera' },
            { asset: 'Materiales EUR', direction: 'up', explanation: 'Beneficia sector industrial' }
        ],
        interpretation: 'Lectura menos negativa es positiva para EUR.'
    },
    { 
        time: '01:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Indicador de Sentimiento Económico (ESI)', 
        importance: 'medium', 
        forecast: '97.1', 
        previous: '96.7',
        actual: '-',
        description: 'Índice compuesto de confianza económica en la Eurozona. 100 = promedio histórico.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Lectura superior indica economía más fuerte' },
            { asset: 'EUR/USD', direction: 'up', explanation: 'Mejora en sentimiento apoya al euro' }
        ],
        interpretation: 'Indicador adelantado importante. >100 = optimismo, <100 = pesimismo.'
    },
    { 
        time: '03:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Discurso de Frank Elderson del BCE', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Miembro del Consejo Ejecutivo del BCE habla sobre política monetaria.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Comentarios sobre tasas mueven mercado' }
        ],
        interpretation: 'Los mercados buscan pistas sobre futura política del BCE.'
    },
    { 
        time: '05:00',
        date: '2026-01-28',
        countryCode: 'USA', 
        event: 'Solicitudes de hipotecas MBA', 
        importance: 'low', 
        forecast: '-', 
        previous: '14.1%',
        actual: '-',
        description: 'Cambio semanal en número de solicitudes de hipotecas.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Aumento indica sector inmobiliario saludable' },
            { asset: 'Construcción', direction: 'up', explanation: 'Más hipotecas = más ventas de viviendas' }
        ],
        interpretation: 'Indicador adelantado de actividad en el mercado inmobiliario.'
    },
    { 
        time: '16:30',
        date: '2026-01-28',
        countryCode: 'USA', 
        event: 'Cambio en reservas de petróleo EIA', 
        importance: 'medium', 
        forecast: '-', 
        previous: '3.602M',
        actual: '-',
        description: 'Cambio semanal en reservas de petróleo crudo según Energy Information Administration.',
        impact: [
            { asset: 'Petróleo', direction: 'down', explanation: 'Aumento de inventarios = mayor oferta' },
            { asset: 'CAD', direction: 'down', explanation: 'Petróleo débil afecta a Canadá' },
            { asset: 'Energy Stocks', direction: 'down', explanation: 'Presiona acciones energéticas' }
        ],
        interpretation: 'REPORTE CLAVE para mercado petrolero. Gran impacto en precios del crudo.'
    },
    { 
        time: '19:00',
        date: '2026-01-28',
        countryCode: 'EUR', 
        event: 'Discurso de Schnabel del BCE', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Isabel Schnabel, miembro del Consejo Ejecutivo del BCE, habla sobre política monetaria.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Voz influyente en decisiones del BCE' }
        ],
        interpretation: 'Schnabel es considerada hawkish, sus comentarios mueven mercado.'
    },
    { 
        time: '20:00',
        date: '2026-01-28',
        countryCode: 'USA', 
        event: 'Decisión de tipos de interés de la Fed', 
        importance: 'high', 
        forecast: '3.75%', 
        previous: '3.75%',
        actual: '-',
        description: 'La Reserva Federal anuncia su decisión sobre la tasa de interés de fondos federales.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Subida = USD fuerte, bajada = USD débil' },
            { asset: 'S&P 500', direction: 'variable', explanation: 'Subida presiona acciones' },
            { asset: 'Oro', direction: 'down', explanation: 'Tasas altas reducen atractivo del oro' },
            { asset: 'Bonos', direction: 'variable', explanation: 'Afecta toda la curva de rendimientos' }
        ],
        interpretation: '🔴 EVENTO MÁS IMPORTANTE DEL MES. Mueve todos los mercados globalmente.'
    },
    { 
        time: '20:00',
        date: '2026-01-28',
        countryCode: 'USA', 
        event: 'Declaración de política monetaria de la Fed', 
        importance: 'high', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Comunicado oficial de la Fed explicando su decisión y perspectivas.',
        impact: [
            { asset: 'Todos', direction: 'variable', explanation: 'Lenguaje hawkish/dovish mueve mercados' }
        ],
        interpretation: '🔴 Los mercados analizan cada palabra para anticipar futuras decisiones.'
    },
    { 
        time: '20:30',
        date: '2026-01-28',
        countryCode: 'USA', 
        event: 'Conferencia de prensa del FOMC', 
        importance: 'high', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Jerome Powell, presidente de la Fed, responde preguntas sobre la decisión.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Comentarios hawkish fortalecen dólar' },
            { asset: 'S&P 500', direction: 'variable', explanation: 'Afecta apetito por riesgo' },
            { asset: 'Volatilidad', direction: 'up', explanation: 'Puede generar movimientos bruscos' }
        ],
        interpretation: '🔴 EXTREMADAMENTE IMPORTANTE. Genera alta volatilidad en todos los mercados.'
    },
    
    // JUEVES 29 DE ENERO 2026
    { 
        time: '00:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Masa monetaria M3 (Anual)', 
        importance: 'low', 
        forecast: '3%', 
        previous: '3%',
        actual: '-',
        description: 'Dato final revisado de M3 anual.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Revisiones pueden afectar expectativas' }
        ],
        interpretation: 'Versión final del dato preliminar.'
    },
    { 
        time: '00:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Masa monetaria M3 (Mensual)', 
        importance: 'low', 
        forecast: '-', 
        previous: '2.9%',
        actual: '-',
        description: 'Dato final M3 mensual.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Generalmente poco impacto' }
        ],
        interpretation: 'Dato revisado, menor impacto que preliminar.'
    },
    { 
        time: '00:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Préstamos Privados (Anual)', 
        importance: 'low', 
        forecast: '2.9%', 
        previous: '2.9%',
        actual: '-',
        description: 'Dato final de préstamos al sector privado.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Revisiones menores rara vez impactan' }
        ],
        interpretation: 'Confirmación del dato preliminar.'
    },
    { 
        time: '01:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Clima empresarial', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-0.56',
        actual: '-',
        description: 'Dato final de confianza empresarial.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Revisiones pueden sorprender' }
        ],
        interpretation: 'Última lectura oficial del mes.'
    },
    { 
        time: '01:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Confianza del consumidor', 
        importance: 'medium', 
        forecast: '-12.4', 
        previous: '-12.4',
        actual: '-',
        description: 'Dato final de confianza del consumidor.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Confirmación del preliminar' }
        ],
        interpretation: 'Versión revisada, menos impacto que preliminar.'
    },
    { 
        time: '01:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Confianza en el Sector Servicios', 
        importance: 'low', 
        forecast: '-', 
        previous: '5.6',
        actual: '-',
        description: 'Dato final de confianza en servicios.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Generalmente sin impacto' }
        ],
        interpretation: 'Confirmación del dato preliminar.'
    },
    { 
        time: '01:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Confianza Industrial', 
        importance: 'low', 
        forecast: '-', 
        previous: '-8',
        actual: '-',
        description: 'Dato final de confianza industrial.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Poco impacto esperado' }
        ],
        interpretation: 'Última lectura oficial del periodo.'
    },
    { 
        time: '01:00',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Indicador de Sentimiento Económico (ESI)', 
        importance: 'medium', 
        forecast: '97.1', 
        previous: '96.7',
        actual: '-',
        description: 'Dato final del ESI.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Revisiones pueden generar movimiento' }
        ],
        interpretation: 'Confirmación del dato preliminar, puede haber sorpresas.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Balanza comercial', 
        importance: 'medium', 
        forecast: '-$44.6B', 
        previous: '-$29.4B',
        actual: '-',
        description: 'Diferencia entre exportaciones e importaciones de bienes y servicios.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Déficit menor de lo esperado fortalece USD' },
            { asset: 'Exportadoras', direction: 'up', explanation: 'Exportaciones altas benefician empresas' }
        ],
        interpretation: 'Déficit mayor = más dólares saliendo de USA = USD débil.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Balanza Comercial de Bienes', 
        importance: 'low', 
        forecast: '-', 
        previous: '-$59.1B',
        actual: '-',
        description: 'Balanza comercial excluyendo servicios.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Complementa dato total' }
        ],
        interpretation: 'Desglosa componente de bienes del dato total.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Costes Laborales Unitarios (Trimestral) (Q3)', 
        importance: 'medium', 
        forecast: '-1.9%', 
        previous: '-1.9%',
        actual: '-',
        description: 'Mide cambio en el costo del trabajo por unidad de producción.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'Aumento indica presiones inflacionarias' },
            { asset: 'Bonos', direction: 'down', explanation: 'Inflación presiona yields al alza' }
        ],
        interpretation: 'La Fed monitorea esto de cerca por presiones salariales.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Inventarios mayoristas', 
        importance: 'low', 
        forecast: '0.2%', 
        previous: '-',
        actual: '-',
        description: 'Cambio mensual en el valor total de inventarios mantenidos por mayoristas.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Aumento puede indicar ventas débiles' }
        ],
        interpretation: 'Inventarios altos pueden frenar producción futura.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Peticiones de desempleo continuadas', 
        importance: 'medium', 
        forecast: '-', 
        previous: '1.849M',
        actual: '-',
        description: 'Número de personas que continúan recibiendo beneficios de desempleo.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'Aumento indica debilidad en mercado laboral' },
            { asset: 'S&P 500', direction: 'down', explanation: 'Mercado laboral débil preocupa' }
        ],
        interpretation: 'Aumento persistente puede señalar deterioro económico.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Peticiones Iniciales de Desempleo - Media de 4 semanas', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Promedio de 4 semanas de peticiones iniciales de desempleo.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'Aumento indica deterioro laboral' }
        ],
        interpretation: 'Suaviza volatilidad semanal para ver tendencia real.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Peticiones semanales de subsidio por desempleo', 
        importance: 'high', 
        forecast: '205K', 
        previous: '200K',
        actual: '-',
        description: 'Número de personas que solicitaron beneficios de desempleo por primera vez la semana pasada.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'Aumento indica despidos crecientes' },
            { asset: 'S&P 500', direction: 'down', explanation: 'Mercado laboral débil = economía débil' },
            { asset: 'Oro', direction: 'up', explanation: 'Debilidad económica impulsa refugio' }
        ],
        interpretation: 'DATO SEMANAL MUY SEGUIDO. <220K = mercado laboral saludable.'
    },
    { 
        time: '14:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Productividad no Agrícola (Trimestral) (Q3)', 
        importance: 'medium', 
        forecast: '4.9%', 
        previous: '4.9%',
        actual: '-',
        description: 'Mide cambio en producción por hora trabajada en sector no agrícola.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Alta productividad = economía más eficiente' },
            { asset: 'S&P 500', direction: 'up', explanation: 'Más producción = más ganancias empresariales' }
        ],
        interpretation: 'Productividad creciente permite crecimiento sin inflación.'
    },
    { 
        time: '16:00',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Pedidos a Fábrica', 
        importance: 'medium', 
        forecast: '0.5%', 
        previous: '-1.3%',
        actual: '-',
        description: 'Cambio mensual en el valor total de nuevas órdenes de fabricación.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Aumento indica demanda manufacturera fuerte' },
            { asset: 'Industriales', direction: 'up', explanation: 'Más órdenes = más producción' }
        ],
        interpretation: 'Combina bienes duraderos y no duraderos. Indicador amplio de demanda.'
    },
    { 
        time: '16:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Cambio de Almacenamiento de Gas Natural (EIA)', 
        importance: 'low', 
        forecast: '-', 
        previous: '-120B',
        actual: '-',
        description: 'Cambio semanal en reservas de gas natural según EIA.',
        impact: [
            { asset: 'Gas Natural', direction: 'up', explanation: 'Caída de inventarios = precios al alza' },
            { asset: 'Energy', direction: 'variable', explanation: 'Afecta sector energético' }
        ],
        interpretation: 'Seguido por traders de commodities energéticas.'
    },
    { 
        time: '17:30',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Emisión de bonos a 4 semanas', 
        importance: 'low', 
        forecast: '-', 
        previous: '3.63%',
        actual: '-',
        description: 'Subasta de bonos del Tesoro a 4 semanas.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Afecta extremo corto de curva' }
        ],
        interpretation: 'Refleja condiciones de liquidez a muy corto plazo.'
    },
    { 
        time: '19:00',
        date: '2026-01-29',
        countryCode: 'USA', 
        event: 'Emisión de Notas del Tesoro a 7 años', 
        importance: 'low', 
        forecast: '-', 
        previous: '3.93%',
        actual: '-',
        description: 'Subasta de notas a 7 años.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Demanda fuerte apoya dólar' },
            { asset: 'Yields', direction: 'variable', explanation: 'Afecta parte media de curva' }
        ],
        interpretation: 'Completa ciclo de subastas de la semana.'
    },
    { 
        time: '16:30',
        date: '2026-01-29',
        countryCode: 'EUR', 
        event: 'Discurso de Piero Cipollone, miembro del BCE', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-',
        actual: '-',
        description: 'Miembro del Consejo Ejecutivo del BCE habla sobre política monetaria.',
        impact: [
            { asset: 'EUR', direction: 'variable', explanation: 'Comentarios sobre tasas mueven mercado' }
        ],
        interpretation: 'Los mercados buscan pistas sobre próximas decisiones del BCE.'
    },
    
    // VIERNES 30 DE ENERO 2026
    { 
        time: '11:00',
        date: '2026-01-30',
        countryCode: 'EUR', 
        event: 'Producto Interior Bruto s.a. (Anual) (Q4)', 
        importance: 'high', 
        forecast: '1.2%', 
        previous: '1.4%',
        actual: '-',
        description: 'Cambio anual en el PIB de la Eurozona. DATO MÁS IMPORTANTE de salud económica.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Crecimiento fuerte fortalece euro' },
            { asset: 'STOXX 50', direction: 'up', explanation: 'Economía saludable impulsa bolsas' },
            { asset: 'EUR/USD', direction: 'up', explanation: 'EUR fuerte empuja par al alza' }
        ],
        interpretation: '🔴 EXTREMADAMENTE IMPORTANTE. Crecimiento >pronóstico es muy alcista para EUR.'
    },
    { 
        time: '11:00',
        date: '2026-01-30',
        countryCode: 'EUR', 
        event: 'Producto Interior Bruto s.a. (Trimestral) (Q4)', 
        importance: 'high', 
        forecast: '0.3%', 
        previous: '0.3%',
        actual: '-',
        description: 'Cambio trimestral del PIB de la Eurozona.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Dato superior = economía acelerando' },
            { asset: 'EUR/USD', direction: 'up', explanation: 'Fortalece caso para mantener tasas' }
        ],
        interpretation: '🔴 MUY IMPORTANTE. Muestra tendencia reciente de crecimiento económico.'
    },
    { 
        time: '11:00',
        date: '2026-01-30',
        countryCode: 'EUR', 
        event: 'Tasa de desempleo', 
        importance: 'medium', 
        forecast: '6.3%', 
        previous: '6.3%',
        actual: '-',
        description: 'Porcentaje de población activa desempleada en la Eurozona.',
        impact: [
            { asset: 'EUR', direction: 'up', explanation: 'Tasa baja = mercado laboral saludable' },
            { asset: 'Consumo EUR', direction: 'up', explanation: 'Más empleos = más gasto' }
        ],
        interpretation: 'Tasa estable o cayendo es positiva para EUR.'
    },
    { 
        time: '14:30',
        date: '2026-01-30',
        countryCode: 'USA', 
        event: 'Índice de Precios de Producción (Anual)', 
        importance: 'high', 
        forecast: '-', 
        previous: '3%',
        actual: '-',
        description: 'Cambio anual en precios que productores cobran por bienes y servicios.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'PPI alto indica presiones inflacionarias' },
            { asset: 'Bonos', direction: 'down', explanation: 'Inflación presiona yields' },
            { asset: 'Oro', direction: 'up', explanation: 'Inflación alta impulsa oro' }
        ],
        interpretation: 'Indicador adelantado de IPC. PPI alto anticipa inflación al consumidor.'
    },
    { 
        time: '14:30',
        date: '2026-01-30',
        countryCode: 'USA', 
        event: 'Índice de Precios de Producción (Mensual)', 
        importance: 'high', 
        forecast: '0.2%', 
        previous: '0.2%',
        actual: '-',
        description: 'Cambio mensual del PPI.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'Aumento indica inflación' },
            { asset: 'Fed Policy', direction: 'hawkish', explanation: 'Puede forzar a Fed a subir tasas' }
        ],
        interpretation: 'DATO CLAVE. La Fed monitorea de cerca para decisiones de tasas.'
    },
    { 
        time: '14:30',
        date: '2026-01-30',
        countryCode: 'USA', 
        event: 'Índice de Precios de Producción Excluyendo Alimentación y Energía (Anual)', 
        importance: 'high', 
        forecast: '-', 
        previous: '3%',
        actual: '-',
        description: 'PPI Core anual - excluye componentes volátiles.',
        impact: [
            { asset: 'USD', direction: 'variable', explanation: 'Muestra presiones inflacionarias subyacentes' },
            { asset: 'Fed Policy', direction: 'variable', explanation: 'La Fed prefiere este dato al total' }
        ],
        interpretation: 'MÁS IMPORTANTE que el PPI total. Muestra inflación persistente.'
    },
    { 
        time: '14:30',
        date: '2026-01-30',
        countryCode: 'USA', 
        event: 'Índice de Precios de Producción excluyendo alimentación y energía (Mensual)', 
        importance: 'high', 
        forecast: '0.3%', 
        previous: '0%',
        actual: '-',
        description: 'PPI Core mensual.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'Aumento presiona a Fed a actuar' },
            { asset: 'Bonos', direction: 'down', explanation: 'Yields suben con inflación' }
        ],
        interpretation: 'CRÍTICO. Lectura >pronóstico es hawkish para política Fed.'
    },
    { 
        time: '22:45',
        date: '2026-01-30',
        countryCode: 'USA', 
        event: 'PMI de Chicago', 
        importance: 'medium', 
        forecast: '-', 
        previous: '-4.3%',
        actual: '-',
        description: 'Índice de gerentes de compras de Chicago. >50 = expansión.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Lectura >50 es positiva' },
            { asset: 'Industriales', direction: 'up', explanation: 'Fortaleza manufacturera' }
        ],
        interpretation: 'Indicador regional importante, precursor de ISM.'
    },
    { 
        time: '14:15',
        date: '2026-01-27',
        countryCode: 'USA', 
        event: 'ADP - Cambio de Empleo Privado', 
        importance: 'high', 
        forecast: '150K', 
        previous: '8K',
        actual: '-',
        description: 'Estimación de ADP del cambio mensual en empleos del sector privado (no incluye gobierno). Anticipa el reporte oficial de NFP.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Fuerte creación de empleo fortalece el dólar' },
            { asset: 'Oro', direction: 'down', explanation: 'Economía fuerte reduce demanda de refugio' },
            { asset: 'S&P 500', direction: 'up', explanation: 'Más empleo = más consumo = mejores ganancias' }
        ],
        interpretation: 'Considerado un anticipo del NFP del viernes. Lectura superior a expectativas es alcista para USD.'
    },
    { 
        time: '14:30',
        date: '2026-01-30',
        countryCode: 'USA', 
        event: 'Nóminas No Agrícolas (NFP)', 
        importance: 'high', 
        forecast: '200K', 
        previous: '200K',
        actual: '-',
        description: 'Cambio mensual en el número de empleados en USA excluyendo el sector agrícola. Es el indicador de empleo más importante del mundo.',
        impact: [
            { asset: 'USD', direction: 'up', explanation: 'Fuerte creación de empleo fortalece significativamente el USD' },
            { asset: 'Oro', direction: 'down', explanation: 'USD fuerte presiona al oro' },
            { asset: 'S&P 500', direction: 'up', explanation: 'Empleo fuerte = economía saludable' },
            { asset: 'Bonos', direction: 'down', explanation: 'Puede llevar a la FED a mantener tasas altas' }
        ],
        interpretation: '🔴 El evento económico MÁS IMPORTANTE del mes. Puede causar movimientos de 100+ pips en pares de USD. Lectura >200K es muy alcista para USD.'
    },
    { 
        time: '14:30',
        date: '2026-01-30',
        countryCode: 'USA', 
        event: 'Tasa de Desempleo', 
        importance: 'high', 
        forecast: '3.7%', 
        previous: '3.7%',
        actual: '-',
        description: 'Porcentaje de la fuerza laboral total que está desempleada y buscando activamente trabajo.',
        impact: [
            { asset: 'USD', direction: 'down', explanation: 'Desempleo más bajo fortalece USD (relación inversa)' },
            { asset: 'S&P 500', direction: 'up', explanation: 'Bajo desempleo indica economía fuerte' }
        ],
        interpretation: 'Se publica junto con NFP. Una caída en desempleo es alcista para USD. Desempleo ~4% se considera pleno empleo.'
    }
];

    // Inicializar
    async function initMarketScanner() {
        console.log('🚀 Cargando datos del Market Scanner...');
        
        // Cargar datos en paralelo
        await Promise.all([
            loadCryptoData(),
            loadForexData(),
            loadIndicesData(),
            loadCommoditiesData()
        ]);
        
        // Renderizar UI
        renderMarketOverview('indices');
        renderEconomicCalendar();
        updateSentimentAnalysis();
        setupEventListeners();
        
        console.log('✅ Market Scanner inicializado');
    }

    // Función para refrescar datos
    async function refreshMarketData() {
        console.log('🔄 Refrescando datos del mercado...');
        
        // Limpiar cache para forzar nueva carga
        cache.data = {};
        cache.timestamp = {};
        
        // Recargar todos los datos
        await Promise.all([
            loadCryptoData(),
            loadForexData(),
            loadIndicesData(),
            loadCommoditiesData()
        ]);
        
        // Re-renderizar vista actual
        renderMarketOverview(currentSector);
        updateSentimentAnalysis();
        
        console.log('✅ Datos actualizados');
    }

    // Renderizar visión general del mercado
    function renderMarketOverview(sector) {
        const container = document.getElementById('market-cards');
        if (!container) return;

        const data = marketData[sector] || [];
        
        container.innerHTML = data.map(item => {
            const isPositive = item.change >= 0;
            const changeClass = isPositive ? 'text-green' : 'text-red';
            const cardClass = isPositive ? 'positive' : 'negative';
            const arrow = isPositive ? '↑' : '↓';
            
            return `
                <div class="market-card ${cardClass}">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="text-xs text-text-secondary">${item.symbol}</p>
                            <p class="font-semibold text-sm">${item.name}</p>
                        </div>
                    </div>
                    <p class="text-2xl font-bold mb-1">${formatMarketPrice(item.price, sector)}</p>
                    <p class="${changeClass} text-sm font-semibold">
                        ${arrow} ${Math.abs(item.change).toFixed(2)}%
                    </p>
                </div>
            `;
        }).join('');
    }

    // Formatear precios según sector
    function formatMarketPrice(price, sector) {
        if (sector === 'crypto' && price > 1000) {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (sector === 'crypto') {
            return `$${price.toFixed(4)}`;
        } else if (sector === 'forex') {
            return price.toFixed(4);
        } else {
            return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    // Renderizar calendario económico
// Renderizar calendario económico (FUNCIÓN GLOBAL)
function renderEconomicCalendar() {
    const container = document.getElementById('economic-calendar');
    if (!container) return;

    const countryFlags = {
        'USA': 'us',
        'EUR': 'eu',
        'GBP': 'gb',
        'JPY': 'jp',
        'CAD': 'ca',
        'CHN': 'cn',
        'AUD': 'au',
        'DEU': 'de',
        'CHE': 'ch'
    };

    container.innerHTML = economicEvents.map((event, index) => {
        const importanceClass = `event-importance-${event.importance}`;
        const importanceText = event.importance === 'high' ? 'Alta' : event.importance === 'medium' ? 'Media' : 'Baja';
        const flagCode = countryFlags[event.countryCode] || 'un';
        const flagUrl = `https://flagcdn.com/48x36/${flagCode}.png`;
        
        // Formatear fecha
        const eventDate = new Date(event.date);
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        const formattedDate = eventDate.toLocaleDateString('es-ES', options);
        
        // Determinar si es hoy
        const today = new Date();
        const isToday = eventDate.toDateString() === today.toDateString();
        const dateLabel = isToday ? 'HOY' : formattedDate;
        
        return `
            <div class="economic-event-card p-4 bg-surface-light rounded-lg border-l-4 ${importanceClass}" 
                 data-country="${event.countryCode}" 
                 data-date="${event.date}"
                 data-importance="${event.importance}"
                 onclick="openEconomicEventModal(${index})">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                        <img src="${flagUrl}" alt="${event.countryCode}" class="w-12 h-9 object-cover rounded shadow-sm" onerror="this.style.display='none'" />
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs font-bold px-2 py-1 rounded ${isToday ? 'bg-primary text-background' : 'bg-surface text-text-secondary'}">
                                    <i class="fas fa-calendar-day"></i> ${dateLabel}
                                </span>
                                <span class="text-sm font-bold text-primary">${event.time}</span>
                            </div>
                            <span class="text-xs px-2 py-0.5 rounded ${event.importance === 'high' ? 'bg-red text-white' : event.importance === 'medium' ? 'bg-yellow-600 text-white' : 'bg-gray-500 text-white'}">
                                <i class="fas fa-circle text-xs"></i> ${importanceText}
                            </span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-text-secondary text-sm"></i>
                </div>
                <p class="font-semibold text-sm mb-2">${event.event}</p>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div>
                        <span class="text-text-secondary">Actual:</span>
                        <span class="ml-1 font-bold ${event.actual !== '-' ? 'text-primary' : ''}">${event.actual || '-'}</span>
                    </div>
                    <div>
                        <span class="text-text-secondary">Pronóstico:</span>
                        <span class="ml-1 font-semibold text-white">${event.forecast}</span>
                    </div>
                    <div>
                        <span class="text-text-secondary">Anterior:</span>
                        <span class="ml-1 text-text-secondary">${event.previous}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

    // Renderizar noticias con imágenes
    // Actualizar análisis de sentimiento
    function updateSentimentAnalysis() {
        let marketsUp = 0;
        let marketsDown = 0;

        Object.values(marketData).flat().forEach(item => {
            if (item.change > 0) marketsUp++;
            else if (item.change < 0) marketsDown++;
        });

        const total = marketsUp + marketsDown;
        const upPercentage = (marketsUp / total) * 100;

        // Actualizar indicadores
        const marketsUpEl = document.getElementById('markets-up');
        const marketsDownEl = document.getElementById('markets-down');
        if (marketsUpEl) marketsUpEl.textContent = marketsUp;
        if (marketsDownEl) marketsDownEl.textContent = marketsDown;

        // Determinar sentimiento
        const sentimentEl = document.getElementById('sentiment-indicator');
        const sentimentLabel = document.getElementById('sentiment-label');
        
        if (!sentimentEl || !sentimentLabel) return;
        
        if (upPercentage >= 70) {
            sentimentEl.textContent = '😄';
            sentimentLabel.textContent = 'Muy Positivo';
            sentimentLabel.className = 'text-2xl font-bold text-green';
        } else if (upPercentage >= 55) {
            sentimentEl.textContent = '🙂';
            sentimentLabel.textContent = 'Positivo';
            sentimentLabel.className = 'text-2xl font-bold text-green';
        } else if (upPercentage >= 45) {
            sentimentEl.textContent = '😐';
            sentimentLabel.textContent = 'Neutral';
            sentimentLabel.className = 'text-2xl font-bold text-white';
        } else if (upPercentage >= 30) {
            sentimentEl.textContent = '😟';
            sentimentLabel.textContent = 'Negativo';
            sentimentLabel.className = 'text-2xl font-bold text-red';
        } else {
            sentimentEl.textContent = '😨';
            sentimentLabel.textContent = 'Muy Negativo';
            sentimentLabel.className = 'text-2xl font-bold text-red';
        }
    }

    // Event listeners
    function setupEventListeners() {
        // Tabs de sectores
        document.querySelectorAll('.market-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const sector = this.dataset.sector;
                currentSector = sector;
                renderMarketOverview(sector);
            });
        });

        // Filtro de sector general
        const sectorFilter = document.getElementById('market-sector-filter');
        if (sectorFilter) {
            sectorFilter.addEventListener('change', function() {
                const sector = this.value;
                if (sector !== 'all') {
                    document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
                    const targetTab = document.querySelector(`.market-tab[data-sector="${sector}"]`);
                    if (targetTab) {
                        targetTab.classList.add('active');
                        renderMarketOverview(sector);
                    }
                }
            });
        }

        // Filtro de noticias
        const newsFilter = document.getElementById('news-sector-filter');
        if (newsFilter) {
            newsFilter.addEventListener('change', function() {
                renderLatestNews(this.value);
            });
        }

        // Toggle dropdown de países
        const countryFilterBtn = document.getElementById('calendar-country-filter-btn');
        const countryDropdown = document.getElementById('calendar-country-dropdown');
        if (countryFilterBtn && countryDropdown) {
            countryFilterBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                countryDropdown.classList.toggle('hidden');
                // Cerrar dropdown de importancia
                const importanceDropdown = document.getElementById('calendar-importance-dropdown');
                if (importanceDropdown) importanceDropdown.classList.add('hidden');
            });
        }
        
        // Toggle dropdown de importancia
        const importanceFilterBtn = document.getElementById('calendar-importance-filter-btn');
        const importanceDropdown = document.getElementById('calendar-importance-dropdown');
        if (importanceFilterBtn && importanceDropdown) {
            importanceFilterBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                importanceDropdown.classList.toggle('hidden');
                // Cerrar dropdown de países
                if (countryDropdown) countryDropdown.classList.add('hidden');
            });
        }
        
        // Cerrar dropdowns al hacer click fuera
        document.addEventListener('click', function() {
            if (countryDropdown) countryDropdown.classList.add('hidden');
            if (importanceDropdown) importanceDropdown.classList.add('hidden');
        });
        
        // Prevenir cierre al hacer click dentro del dropdown
        if (countryDropdown) {
            countryDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        if (importanceDropdown) {
            importanceDropdown.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        
        // Manejar checkbox "Todos" de países
        const countryCheckboxes = document.querySelectorAll('.country-filter-checkbox');
        const allCountryCheckbox = document.querySelector('.country-filter-checkbox[value="all"]');
        countryCheckboxes.forEach(checkbox => {
            if (checkbox.value !== 'all') {
                checkbox.addEventListener('change', function() {
                    if (this.checked && allCountryCheckbox) {
                        allCountryCheckbox.checked = false;
                    }
                    updateCountryFilterCount();
                });
            } else {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        countryCheckboxes.forEach(cb => {
                            if (cb.value !== 'all') cb.checked = false;
                        });
                    }
                    updateCountryFilterCount();
                });
            }
        });
        
        // Manejar checkbox "Todas" de importancia
        const importanceCheckboxes = document.querySelectorAll('.importance-filter-checkbox');
        const allImportanceCheckbox = document.querySelector('.importance-filter-checkbox[value="all"]');
        importanceCheckboxes.forEach(checkbox => {
            if (checkbox.value !== 'all') {
                checkbox.addEventListener('change', function() {
                    if (this.checked && allImportanceCheckbox) {
                        allImportanceCheckbox.checked = false;
                    }
                    updateImportanceFilterCount();
                });
            } else {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        importanceCheckboxes.forEach(cb => {
                            if (cb.value !== 'all') cb.checked = false;
                        });
                    }
                    updateImportanceFilterCount();
                });
            }
        });

        // Botón de actualizar
        const refreshBtn = document.getElementById('refresh-market-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async function() {
                const icon = this.querySelector('i');
                icon.classList.add('fa-spin');
                
                try {
                    await refreshMarketData();
                    showNotification('Datos actualizados correctamente', 'success');
                } catch (error) {
                    console.error('Error al actualizar:', error);
                    showNotification('Error al actualizar datos', 'error');
                } finally {
                    icon.classList.remove('fa-spin');
                }
            });
        }
    }

    // Inicializar cuando se carga la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMarketScanner);
    } else {
        initMarketScanner();
    }

    console.log('✅ Market Scanner inicializado');

// FUNCIONES GLOBALES PARA MODALES
// =============================================

// Variables globales para filtros
let selectedCountries = [];
let selectedImportances = [];

// Actualizar contador de países seleccionados
function updateCountryFilterCount() {
    const checkboxes = document.querySelectorAll('.country-filter-checkbox:not([value="all"]):checked');
    const count = checkboxes.length;
    const countElement = document.getElementById('selected-countries-count');
    if (countElement) {
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Actualizar contador de importancias seleccionadas
function updateImportanceFilterCount() {
    const checkboxes = document.querySelectorAll('.importance-filter-checkbox:not([value="all"]):checked');
    const count = checkboxes.length;
    const countElement = document.getElementById('selected-importance-count');
    if (countElement) {
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

// Limpiar filtros de países
function clearCountryFilters() {
    const checkboxes = document.querySelectorAll('.country-filter-checkbox');
    const allCheckbox = document.querySelector('.country-filter-checkbox[value="all"]');
    
    checkboxes.forEach(cb => {
        if (cb.value !== 'all') cb.checked = false;
    });
    
    if (allCheckbox) allCheckbox.checked = true;
    updateCountryFilterCount();
    applyCountryFilters();
}

// Aplicar filtros de países
function applyCountryFilters() {
    const checkboxes = document.querySelectorAll('.country-filter-checkbox:not([value="all"])');
    const allCheckbox = document.querySelector('.country-filter-checkbox[value="all"]');
    
    selectedCountries = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selectedCountries.push(cb.value);
    });
    
    // Aplicar filtro visual
    const events = document.querySelectorAll('#economic-calendar > .economic-event-card');
    events.forEach(event => {
        const eventCountry = event.dataset.country;
        const eventImportance = event.dataset.importance;
        
        // Verificar si pasa filtro de país
        const passesCountry = allCheckbox?.checked || selectedCountries.length === 0 || selectedCountries.includes(eventCountry);
        
        // Verificar si pasa filtro de importancia
        const passesImportance = selectedImportances.length === 0 || selectedImportances.includes(eventImportance);
        
        // Mostrar solo si pasa ambos filtros
        event.style.display = (passesCountry && passesImportance) ? 'block' : 'none';
    });
    
    // Cerrar dropdown
    const dropdown = document.getElementById('calendar-country-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    
    // Mensaje de confirmación
    const count = selectedCountries.length;
    if (count > 0) {
        showNotification(`Filtrando ${count} país${count > 1 ? 'es' : ''}`, 'success');
    }
}

// Limpiar filtros de importancia
function clearImportanceFilters() {
    const checkboxes = document.querySelectorAll('.importance-filter-checkbox');
    const allCheckbox = document.querySelector('.importance-filter-checkbox[value="all"]');
    
    checkboxes.forEach(cb => {
        if (cb.value !== 'all') cb.checked = false;
    });
    
    if (allCheckbox) allCheckbox.checked = true;
    updateImportanceFilterCount();
    applyImportanceFilters();
}

// Aplicar filtros de importancia
function applyImportanceFilters() {
    const checkboxes = document.querySelectorAll('.importance-filter-checkbox:not([value="all"])');
    const allCheckbox = document.querySelector('.importance-filter-checkbox[value="all"]');
    
    selectedImportances = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selectedImportances.push(cb.value);
    });
    
    // Aplicar filtro visual
    const events = document.querySelectorAll('#economic-calendar > .economic-event-card');
    events.forEach(event => {
        const eventCountry = event.dataset.country;
        const eventImportance = event.dataset.importance;
        
        // Verificar si pasa filtro de país
        const countryCheckboxes = document.querySelectorAll('.country-filter-checkbox:not([value="all"])');
        const allCountryCheckbox = document.querySelector('.country-filter-checkbox[value="all"]');
        const activeCountries = Array.from(countryCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        const passesCountry = allCountryCheckbox?.checked || activeCountries.length === 0 || activeCountries.includes(eventCountry);
        
        // Verificar si pasa filtro de importancia
        const passesImportance = allCheckbox?.checked || selectedImportances.length === 0 || selectedImportances.includes(eventImportance);
        
        // Mostrar solo si pasa ambos filtros
        event.style.display = (passesCountry && passesImportance) ? 'block' : 'none';
    });
    
    // Cerrar dropdown
    const dropdown = document.getElementById('calendar-importance-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    
    // Mensaje de confirmación
    const importanceNames = { high: 'Alta', medium: 'Media', low: 'Baja' };
    if (selectedImportances.length > 0) {
        const names = selectedImportances.map(i => importanceNames[i]).join(', ');
        showNotification(`Filtrando: ${names}`, 'success');
    }
}

// Abrir modal de filtro de fechas
function openDateFilterModal() {
    document.getElementById('calendar-date-filter-modal').style.display = 'flex';
    const today = new Date().toISOString().split('T')[0];
    if (!document.getElementById('calendar-date-from').value) {
        document.getElementById('calendar-date-from').value = today;
    }
    if (!document.getElementById('calendar-date-to').value) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        document.getElementById('calendar-date-to').value = nextWeek.toISOString().split('T')[0];
    }
}

// Cerrar modal de filtro de fechas
function closeDateFilterModal() {
    document.getElementById('calendar-date-filter-modal').style.display = 'none';
}

// Establecer filtro rápido
function setDateFilter(type) {
    const today = new Date();
    let from, to;
    
    if (type === 'today') {
        from = to = today;
    } else if (type === 'week') {
        from = today;
        to = new Date(today);
        to.setDate(to.getDate() + 7);
    } else if (type === 'month') {
        from = today;
        to = new Date(today);
        to.setMonth(to.getMonth() + 1);
    }
    
    document.getElementById('calendar-date-from').value = from.toISOString().split('T')[0];
    document.getElementById('calendar-date-to').value = to.toISOString().split('T')[0];
    
    applyDateFilter();
}

// Aplicar filtro de fechas
function applyDateFilter() {
    const dateFrom = document.getElementById('calendar-date-from').value;
    const dateTo = document.getElementById('calendar-date-to').value;
    
    const events = document.querySelectorAll('#economic-calendar > .economic-event-card');
    events.forEach(event => {
        if (!dateFrom || !dateTo) {
            event.style.display = 'block';
            return;
        }
        
        const eventDate = event.dataset.date;
        if (eventDate >= dateFrom && eventDate <= dateTo) {
            event.style.display = 'block';
        } else {
            event.style.display = 'none';
        }
    });
    
    closeDateFilterModal();
    showNotification('Filtro de fechas aplicado', 'success');
}

// Limpiar filtro de fechas
function clearDateFilter() {
    document.getElementById('calendar-date-from').value = '';
    document.getElementById('calendar-date-to').value = '';
    
    const events = document.querySelectorAll('#economic-calendar > .economic-event-card');
    events.forEach(event => {
        event.style.display = 'block';
    });
    
    closeDateFilterModal();
    showNotification('Filtro de fechas eliminado', 'success');
}

// Cerrar modal de evento económico
function closeEconomicEventModal() {
    document.getElementById('economic-event-modal').style.display = 'none';
}

// Abrir modal de evento económico
function openEconomicEventModal(index) {
    const event = economicEvents[index];
    const modal = document.getElementById('economic-event-modal');
    
    const countryNames = {
        'USA': 'Estados Unidos',
        'EUR': 'Eurozona',
        'GBP': 'Reino Unido',
        'JPY': 'Japón',
        'CAD': 'Canadá',
        'CHN': 'China',
        'AUD': 'Australia',
        'DEU': 'Alemania',
        'CHE': 'Suiza'
    };
    
    document.getElementById('event-modal-title').textContent = event.event;
    document.getElementById('event-modal-country-code').textContent = event.countryCode;
    document.getElementById('event-modal-country').textContent = countryNames[event.countryCode] || event.countryCode;
    document.getElementById('event-modal-time').textContent = event.time;
    document.getElementById('event-modal-date').textContent = event.date || 'Hoy';
    document.getElementById('event-modal-description').textContent = event.description;
    document.getElementById('event-modal-actual').textContent = event.actual || '-';
    document.getElementById('event-modal-forecast').textContent = event.forecast;
    document.getElementById('event-modal-previous').textContent = event.previous;
    document.getElementById('event-modal-interpretation').textContent = event.interpretation;
    
    const badge = document.getElementById('event-modal-importance-badge');
    if (event.importance === 'high') {
        badge.className = 'px-3 py-1 rounded text-sm font-bold bg-red text-white';
        badge.innerHTML = '<i class="fas fa-circle text-xs"></i> Alta Importancia';
    } else if (event.importance === 'medium') {
        badge.className = 'px-3 py-1 rounded text-sm font-bold bg-yellow-600 text-white';
        badge.innerHTML = '<i class="fas fa-circle text-xs"></i> Media Importancia';
    } else {
        badge.className = 'px-3 py-1 rounded text-sm font-bold bg-gray-500 text-white';
        badge.innerHTML = '<i class="fas fa-circle text-xs"></i> Baja Importancia';
    }
    
    const impactContainer = document.getElementById('event-modal-impact');
    impactContainer.innerHTML = event.impact.map(imp => {
        const icon = imp.direction === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
        const colorClass = imp.direction === 'up' ? 'text-green' : 'text-red';
        const directionText = imp.direction === 'up' ? 'ALCISTA' : 'BAJISTA';
        const bgClass = imp.direction === 'up' ? 'border-green' : 'border-red';
        
        return `
            <div class="flex items-start gap-3 p-3 bg-surface rounded-lg border-l-4 ${bgClass}">
                <div><i class="fas ${icon} text-2xl ${colorClass}"></i></div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold">${imp.asset}</span>
                        <span class="text-xs px-2 py-0.5 rounded ${colorClass} font-bold">${directionText}</span>
                    </div>
                    <p class="text-sm text-text-secondary">${imp.explanation}</p>
                </div>
            </div>
        `;
    }).join('');
    
    modal.style.display = 'flex';
}

// Event listener para botón de filtro de fechas
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const filterBtn = document.getElementById('calendar-date-filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', openDateFilterModal);
        }
        
        // Dashboard date filter
        const dashboardFilterBtn = document.getElementById('new-dashboard-date-filter-btn');
        if (dashboardFilterBtn) {
            dashboardFilterBtn.addEventListener('click', openDateFilterModal);
        }
        
        // Analytics date filter
        const analyticsFilterBtn = document.getElementById('analytics-date-filter-btn');
        if (analyticsFilterBtn) {
            analyticsFilterBtn.addEventListener('click', openDateFilterModal);
        }
        
        // Renderizar calendario al cargar
        if (typeof renderEconomicCalendar === 'function') {
            renderEconomicCalendar();
        }
    });
} else {
    const filterBtn = document.getElementById('calendar-date-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', openDateFilterModal);
    }
    
    // Dashboard date filter
    const dashboardFilterBtn = document.getElementById('new-dashboard-date-filter-btn');
    if (dashboardFilterBtn) {
        dashboardFilterBtn.addEventListener('click', openDateFilterModal);
    }
    
    // Analytics date filter
    const analyticsFilterBtn = document.getElementById('analytics-date-filter-btn');
    if (analyticsFilterBtn) {
        analyticsFilterBtn.addEventListener('click', openDateFilterModal);
    }
    
    // Renderizar calendario inmediatamente
    if (typeof renderEconomicCalendar === 'function') {
        renderEconomicCalendar();
    }
}

console.log('✅ Funciones globales del calendario cargadas');

