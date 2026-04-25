/**
 * metrics-worker.js
 * Web Worker que ejecuta calculateMetrics y calculateDayWinStats fuera del
 * hilo principal, evitando bloqueos en la UI durante el recálculo.
 *
 * Protocolo de mensajes (postMessage / onmessage):
 *   Input:  { id, type: 'calculate', operations, accounts, defaultCurrency, accountId }
 *   Output: { id, metrics, dayWinStats }
 *   Output (error): { id, error: string }
 */

/* ── Mapeo de divisas (igual que convertCurrency en platform-main.js) ── */
const CURRENCY_MAPPING = {
    USDT: 'USD', USDC: 'USD', DAI: 'USD', BUSD: 'USD', TUSD: 'USD'
};
const RATES = {
    USD_EUR: 0.92, EUR_USD: 1.09,
    USD_USDT: 1.0, USDT_USD: 1.0,
    USD_USDC: 1.0, USDC_USD: 1.0
};

function convertCurrency(amount, fromCurrency, toCurrency) {
    if (!fromCurrency || !toCurrency) return amount || 0;
    const from = (CURRENCY_MAPPING[fromCurrency.toUpperCase()] || fromCurrency.toUpperCase());
    const to   = (CURRENCY_MAPPING[toCurrency.toUpperCase()]   || toCurrency.toUpperCase());
    if (from === to) return amount || 0;
    const key = `${from}_${to}`;
    return RATES[key] ? (amount || 0) * RATES[key] : (amount || 0);
}

/* ── calculateMetrics ─────────────────────────────────────────────────── */
function calculateMetrics(operations, accountId, accounts, defaultCurrency) {
    let currentBalance = 0;
    let initialBalance = 0;
    let accountCurrency = defaultCurrency;
    let totalWin = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let breakevenTrades = 0;

    if (accountId !== 'all') {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            currentBalance  = account.balance;
            initialBalance  = account.initialBalance;
            accountCurrency = account.currency;
        }
    } else {
        accounts.forEach(account => {
            let accBalance        = account.balance;
            let accInitialBalance = account.initialBalance;
            if (account.currency !== defaultCurrency) {
                accBalance        = convertCurrency(accBalance,        account.currency, defaultCurrency);
                accInitialBalance = convertCurrency(accInitialBalance, account.currency, defaultCurrency);
            }
            currentBalance += accBalance;
            initialBalance += accInitialBalance;
        });
        accountCurrency = defaultCurrency;
    }

    // Agrupar por ID de trade
    const groupedOps = {};
    operations.forEach(op => {
        const opId = op.id;
        if (!groupedOps[opId]) {
            groupedOps[opId] = { id: opId, totalPL: 0, totalFees: 0, currency: op.currency };
        }
        groupedOps[opId].totalPL    += (op.pl || 0);
        groupedOps[opId].totalFees  += (op.fee || op.fees || op.commission || 0);
    });

    const uniqueTradeGroups = Object.values(groupedOps);

    uniqueTradeGroups.forEach(group => {
        let plInDefault = group.totalPL;
        if (group.currency !== defaultCurrency) {
            plInDefault = convertCurrency(group.totalPL, group.currency, defaultCurrency);
        }
        if (plInDefault > 0)       { totalWin  += plInDefault; winningTrades++;   }
        else if (plInDefault < 0)  { totalLoss += plInDefault; losingTrades++;    }
        else                       { breakevenTrades++; }
    });

    const totalTrades              = uniqueTradeGroups.length;
    const relevantTradesForWinRate = winningTrades + losingTrades;
    const winRate        = relevantTradesForWinRate > 0 ? (winningTrades / relevantTradesForWinRate) * 100 : 0;
    const profitFactor   = Math.abs(totalLoss) > 0 ? Math.abs(totalWin / totalLoss) : (totalWin > 0 ? Infinity : 0);

    let totalFeesInDefault = 0;
    uniqueTradeGroups.forEach(group => {
        let feesConverted = group.totalFees;
        if (group.currency !== defaultCurrency) {
            feesConverted = convertCurrency(group.totalFees, group.currency, defaultCurrency);
        }
        totalFeesInDefault += feesConverted;
    });

    const plBruto = totalWin + totalLoss;
    const plNeto  = plBruto - totalFeesInDefault;
    const avgPL   = totalTrades > 0 ? plBruto / totalTrades : 0;

    let stdDev = 0;
    if (totalTrades > 1) {
        const plValues = uniqueTradeGroups.map(group => {
            let pl = group.totalPL;
            if (group.currency !== defaultCurrency) {
                pl = convertCurrency(group.totalPL, group.currency, defaultCurrency);
            }
            return pl;
        });
        const variance = plValues.reduce((s, pl) => s + Math.pow(pl - avgPL, 2), 0) / totalTrades;
        stdDev = Math.sqrt(variance);
    }

    const avgWin  = winningTrades > 0 ? totalWin / winningTrades             : 0;
    const avgLoss = losingTrades  > 0 ? Math.abs(totalLoss / losingTrades)   : 0;

    return {
        currentBalance, initialBalance, accountCurrency,
        totalWin, totalLoss, totalFees: totalFeesInDefault,
        plBruto, plNeto,
        winningTrades, losingTrades, breakevenTrades, totalTrades,
        winRate, profitFactor,
        avgPL, stdDev, avgWin, avgLoss
    };
}

/* ── calculateDayWinStats ─────────────────────────────────────────────── */
function calculateDayWinStats(operations) {
    const dayTotals = {};
    operations.forEach(op => {
        const date = op.date;
        if (!dayTotals[date]) dayTotals[date] = 0;
        dayTotals[date] += op.pl || 0;
    });
    const days          = Object.values(dayTotals);
    const winningDays   = days.filter(pl => pl > 0).length;
    const losingDays    = days.filter(pl => pl < 0).length;
    const breakevenDays = days.filter(pl => pl === 0).length;
    const totalDays     = days.length;
    return {
        winningDays, losingDays, breakevenDays, totalDays,
        dayWinRate: totalDays > 0 ? (winningDays / totalDays) * 100 : 0
    };
}

/* ── Handler de mensajes ──────────────────────────────────────────────── */
self.onmessage = function (e) {
    const { id, type, operations, accounts, defaultCurrency, accountId } = e.data;
    if (type !== 'calculate') return;
    try {
        const metrics     = calculateMetrics(operations, accountId, accounts, defaultCurrency);
        const dayWinStats = calculateDayWinStats(operations);
        self.postMessage({ id, metrics, dayWinStats });
    } catch (err) {
        self.postMessage({ id, error: err.message });
    }
};
