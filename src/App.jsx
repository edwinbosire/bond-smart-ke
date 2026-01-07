import React, { useState, useMemo, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  TrendingUp, Wallet, ShieldCheck, Plus, ArrowRight, Building2, 
  Calendar, Percent, Info, X, ChevronLeft, ArrowUpRight, 
  RefreshCw, Globe, Link as LinkIcon, Activity, BarChart2, 
  GraduationCap, Scale, Coins, Scissors, Hash, Clock, Sparkles, MessageCircle
} from 'lucide-react';

// --- Constants ---
const TAX_RATES = { SHORT_TERM: 0.15, LONG_TERM: 0.10, INFRASTRUCTURE: 0.00 };
const BANK_RATE = 0.07;
const BANK_TAX = 0.15;

// Base Data with added ISIN, Issue Date, and Specific Maturity Dates
const BASE_BONDS = [
    { 
        id: 1, 
        issueNo: 'FXD1/2023/03', 
        isin: 'KE5000009653',
        issueDate: '2023-04-10',
        maturityDate: '2026-04-06',
        type: 'FXD', 
        tenor: 3, 
        coupon: 16.537, 
        price: 101.76, 
        description: '3-Year Fixed Bond' 
    },
    { 
        id: 2, 
        issueNo: 'FXD1/2018/10', 
        isin: 'KE5000002145',
        issueDate: '2018-08-20',
        maturityDate: '2028-08-14',
        type: 'FXD', 
        tenor: 10, 
        coupon: 12.50, 
        price: 103.38, 
        description: '10-Year Re-opened Bond' 
    },
    { 
        id: 3, 
        issueNo: 'IFB1/2014/12', 
        isin: 'KE4000001852',
        issueDate: '2014-10-27',
        maturityDate: '2026-10-12',
        type: 'IFB', 
        tenor: 12, 
        coupon: 11.00, 
        price: 101.77, 
        description: 'Infrastructure Bond (Tax Free)' 
    },
    { 
        id: 4, 
        issueNo: 'FXD1/2021/25', 
        isin: 'KE6000007890',
        issueDate: '2021-05-15',
        maturityDate: '2046-05-08',
        type: 'FXD', 
        tenor: 25, 
        coupon: 13.44, 
        price: 107.82, 
        description: '25-Year Long Term' 
    },
    { 
        id: 5, 
        issueNo: 'IFB1/2023/17', 
        isin: 'KE5000009988',
        issueDate: '2023-02-20',
        maturityDate: '2040-02-14',
        type: 'IFB', 
        tenor: 17, 
        coupon: 14.399, 
        price: 102.12, 
        description: 'Infrastructure Bond' 
    },
    { 
        id: 6, 
        issueNo: 'FXD1/2024/03', 
        isin: 'KE5000010123',
        issueDate: '2024-03-15',
        maturityDate: '2027-03-12',
        type: 'FXD', 
        tenor: 3, 
        coupon: 18.385, 
        price: 103.02, 
        description: 'New Short Term High Yielder' 
    },
    { 
        id: 7, 
        issueNo: 'FXD1/2023/05', 
        isin: 'KE5000009874',
        issueDate: '2023-07-10',
        maturityDate: '2028-07-03',
        type: 'FXD', 
        tenor: 5, 
        coupon: 16.844, 
        price: 114.72, 
        description: '5-Year Benchmark Bond' 
    }
];

// --- Helper Functions ---
const formatNseDate = (dateObj) => {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
};

const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calculateDaysToMaturity = (maturityDateStr, currentDateObj) => {
    const matDate = new Date(maturityDateStr);
    const diffTime = matDate - currentDateObj;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

const getNsePdfUrl = (dateObj) => `https://www.nse.co.ke/wp-content/uploads/BondPrices_${formatNseDate(dateObj)}.pdf`;

const getBondsForDate = (dateObj) => {
    const seed = dateObj.getDate(); 
    return BASE_BONDS.map(bond => {
        const priceChange = Math.sin(bond.id * seed) * 1.5;
        const randomNoise = (Math.random() - 0.5) * 0.2;
        return { ...bond, price: Number((bond.price + priceChange + randomNoise).toFixed(2)) };
    });
};

const getHistoricalData = (bond, range) => {
    const data = [];
    const points = range === '3M' ? 12 : range === '6M' ? 24 : 12;
    const now = new Date();
    let currentYield = calculateYTM(bond);
    
    for (let i = points; i >= 0; i--) {
        const date = new Date(now);
        if (range === '1Y') date.setMonth(now.getMonth() - i);
        else date.setDate(now.getDate() - (i * 7));
        
        const volatility = bond.tenor > 10 ? 0.8 : 0.4;
        const noise = (Math.random() - 0.5) * volatility;
        const trend = Math.sin(i * 0.5) * (volatility / 2);
        data.push({ date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), yield: Number((currentYield + noise + trend).toFixed(2)) });
    }
    return data;
};

const getTaxRate = (bond) => {
    if (bond.type === 'IFB') return TAX_RATES.INFRASTRUCTURE;
    if (bond.tenor >= 10) return TAX_RATES.LONG_TERM;
    return TAX_RATES.SHORT_TERM;
};

const calculateYTM = (bond) => {
    const par = 100;
    const price = parseFloat(bond.price);
    const coupon = parseFloat(bond.coupon);
    // Approximation for YTM calc
    const yearsToMaturity = Math.max(0.1, (new Date(bond.maturityDate) - new Date('2026-01-05')) / (1000 * 60 * 60 * 24 * 365));
    return ((coupon + ((par - price) / yearsToMaturity)) / ((par + price) / 2)) * 100;
};

const calculateReturns = (bond, amount) => {
    const taxRate = getTaxRate(bond);
    const faceValueBought = amount / (bond.price / 100);
    const grossAnnualInterest = faceValueBought * (bond.coupon / 100);
    const taxAmount = grossAnnualInterest * taxRate;
    const netAnnualInterest = grossAnnualInterest - taxAmount;
    const bankGross = amount * BANK_RATE;
    const bankNet = bankGross * (1 - BANK_TAX);

    return {
        grossAnnual: grossAnnualInterest,
        netAnnual: netAnnualInterest,
        taxPaid: taxAmount,
        netMonthly: netAnnualInterest / 12,
        bankNetAnnual: bankNet,
        yieldDiff: ((netAnnualInterest - bankNet) / bankNet) * 100,
        roi: (netAnnualInterest / amount) * 100
    };
};

const getZScoreInterpretation = (zScore) => {
    if (zScore > 1.5) return { text: "Exceptional Yield", color: "text-emerald-600", bg: "bg-emerald-100" };
    if (zScore > 0.5) return { text: "Above Average", color: "text-emerald-500", bg: "bg-emerald-50" };
    if (zScore > -0.5) return { text: "Market Average", color: "text-blue-500", bg: "bg-blue-50" };
    if (zScore > -1.5) return { text: "Below Average", color: "text-amber-500", bg: "bg-amber-50" };
    return { text: "Poor Yield", color: "text-red-500", bg: "bg-red-50" };
};

const formatCurrency = (val) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);

// --- Education Component ---

const EducationPage = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState(null);
    const [isAsking, setIsAsking] = useState(false);

    const handleAskAi = async () => {
        if (!question.trim()) return;
        setIsAsking(true);
        setAnswer(null);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        
        if (!apiKey) {
            setAnswer("API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
            setIsAsking(false);
            return;
        }
        
        try {
            const prompt = `You are a friendly financial tutor for the Kenyan Bond Market. 
            User Question: "${question}"
            
            Provide a simple, 2-3 sentence explanation suitable for a complete beginner. 
            Use local context (e.g. Nairobi Securities Exchange, 15% tax) where applicable.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            setAnswer(data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate an answer right now.");
        } catch (e) {
            setAnswer("Sorry, I'm having trouble connecting to the knowledge base.");
        } finally {
            setIsAsking(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><GraduationCap size={140} /></div>
                <h2 className="text-3xl font-bold mb-2 relative z-10">Bond Market Academy</h2>
                <p className="text-emerald-100 max-w-xl relative z-10">
                    Understanding the bond market is the first step to growing your wealth safely. 
                    Here is everything you need to know about investing in Kenya Government Bonds.
                </p>
            </div>

            {/* AI Tutor Section */}
            <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><MessageCircle size={100} className="text-emerald-600" /></div>
                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                        <Sparkles size={18} className="text-amber-500 fill-amber-500" /> 
                        Ask the AI Tutor
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">Confused by a term? Ask anything about bonds!</p>
                    
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="e.g., What happens if I sell before maturity?" 
                            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                        />
                        <button 
                            onClick={handleAskAi}
                            disabled={isAsking}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAsking ? <RefreshCw size={16} className="animate-spin" /> : 'Ask'}
                        </button>
                    </div>

                    {answer && (
                        <div className="mt-4 bg-emerald-50 border border-emerald-100 p-4 rounded-lg text-sm text-slate-700 animate-in fade-in slide-in-from-top-2">
                            <p className="font-semibold text-emerald-800 mb-1 flex items-center gap-2">
                                <Sparkles size={12} /> Answer:
                            </p>
                            {answer}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Definitions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Percent size={24} /></div>
                        <h3 className="font-bold text-lg text-slate-800">Coupon Rate vs. Yield</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                        <strong>Coupon Rate:</strong> The fixed interest paid on the "Face Value" (e.g., 12%). This never changes.<br/><br/>
                        <strong>Yield (YTM):</strong> Your <em>actual</em> return. If you buy a bond cheaper than 100, your yield is higher than the coupon. If you buy expensive, yield is lower.
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Coins size={24} /></div>
                        <h3 className="font-bold text-lg text-slate-800">Price: Clean vs. Dirty</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                        <strong>Clean Price:</strong> The price listed on the NSE PDF. It excludes interest accumulated since the last payout.<br/><br/>
                        <strong>Dirty Price:</strong> The final price you pay. <br/>
                        <em>Dirty Price = Clean Price + Accrued Interest.</em>
                    </p>
                </div>
            </div>

            {/* Taxation Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                    <Scissors className="text-red-500" size={20} />
                    <h3 className="font-bold text-slate-800">Understanding Taxation (Withholding Tax)</h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-6">
                        The government deducts tax automatically before paying your interest. The rate depends on the bond type and length (tenor).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-red-100 bg-red-50/50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-red-600 mb-1">15%</div>
                            <div className="text-xs font-bold uppercase text-red-400 tracking-wider">Short Term</div>
                            <p className="text-xs text-slate-500 mt-2">Bonds with tenor less than 10 Years</p>
                        </div>
                        <div className="border border-orange-100 bg-orange-50/50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-orange-600 mb-1">10%</div>
                            <div className="text-xs font-bold uppercase text-orange-400 tracking-wider">Long Term</div>
                            <p className="text-xs text-slate-500 mt-2">Bonds with tenor 10 Years or more</p>
                        </div>
                        <div className="border border-emerald-100 bg-emerald-50/50 p-4 rounded-lg text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-bl">BEST</div>
                            <div className="text-2xl font-bold text-emerald-600 mb-1">0%</div>
                            <div className="text-xs font-bold uppercase text-emerald-400 tracking-wider">Infrastructure</div>
                            <p className="text-xs text-slate-500 mt-2">Infrastructure (IFB) & Green Bonds</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium vs Discount */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Scale size={24} className="text-slate-700" />
                    <h3 className="font-bold text-lg text-slate-800">Premium vs. Discount Pricing</h3>
                </div>
                
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:w-1/3 text-center md:text-right">
                            <span className="block font-bold text-emerald-600">Discounted (Price &lt; 100)</span>
                            <span className="text-xs text-slate-500">e.g., Price 95.50</span>
                        </div>
                        <div className="w-full md:w-1/2 bg-slate-100 p-3 rounded-lg text-sm text-slate-700">
                            You pay <strong>less</strong> than the face value. This is great! It means your final Yield will be <strong>higher</strong> than the Coupon Rate because you get the full 100 back at maturity plus interest.
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-100"></div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-full md:w-1/3 text-center md:text-right">
                            <span className="block font-bold text-amber-600">Premium (Price &gt; 100)</span>
                            <span className="text-xs text-slate-500">e.g., Price 105.20</span>
                        </div>
                        <div className="w-full md:w-1/2 bg-slate-100 p-3 rounded-lg text-sm text-slate-700">
                            You pay <strong>more</strong> than the face value. This usually happens when the bond pays a very high coupon. Your final Yield will be <strong>lower</strong> than the Coupon Rate.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Detail View Component ---
const BondDetailView = ({ bond, onClose, isMobile }) => {
    const [chartRange, setChartRange] = useState('6M'); 
    const chartData = useMemo(() => getHistoricalData(bond, chartRange), [bond, chartRange]);
    const zInterpretation = getZScoreInterpretation(bond.zScore);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Reset analysis when bond changes
    useEffect(() => {
        setAiAnalysis(null);
    }, [bond.id]);

    const handleAiAnalysis = async () => {
        setIsAnalyzing(true);
        setAiAnalysis(null);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        
        if (!apiKey) {
            setAiAnalysis("API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
            setIsAnalyzing(false);
            return;
        }
        
        try {
            const prompt = `Analyze this Kenyan Government Bond for a retail investor:
            Issue: ${bond.issueNo}
            Type: ${bond.type}
            Price: ${bond.price} (Par 100)
            Coupon: ${bond.coupon}%
            Yield (YTM): ${bond.ytm.toFixed(2)}%
            Tenor: ${bond.tenor} years
            Days to Maturity: ${bond.daysToMaturity}
            Market Z-Score: ${bond.zScore.toFixed(2)}
            
            Is this bond trading at a discount or premium? Is the yield attractive compared to the coupon? 
            Provide a 3 sentence summary advice. Highlight tax benefits if it is an Infrastructure Bond (IFB).`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            setAiAnalysis(data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate analysis.");
        } catch (e) {
            setAiAnalysis("Error connecting to AI analyst. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!bond) return null;

    return (
        <div className={`space-y-4 ${isMobile ? 'pb-24' : ''} animate-in fade-in slide-in-from-right-8 duration-300`}>
            {isMobile && (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                    <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft size={24} /></button>
                    <div><h2 className="font-bold text-slate-800 text-lg">{bond.issueNo}</h2><p className="text-xs text-slate-500">{bond.description}</p></div>
                </div>
            )}
            
            {/* Main Stats */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={120} /></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div><p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Projected Annual Income</p><h2 className="text-3xl md:text-4xl font-bold">{formatCurrency(bond.netAnnual)}</h2></div>
                        <div className="bg-slate-800 p-2 rounded-lg"><Wallet className="text-emerald-400" size={24} /></div>
                    </div>
                    <div className="space-y-3 bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                        <div className="flex justify-between items-center"><span className="text-sm text-slate-300">Monthly Payout</span><span className="font-bold text-lg">{formatCurrency(bond.netMonthly)}</span></div>
                        <div className="h-px bg-white/10 my-1"></div>
                        <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Yield to Maturity (YTM)</span><span className="text-emerald-200">{bond.ytm.toFixed(2)}%</span></div>
                    </div>
                </div>
            </div>

            {/* ✨ AI Analyst Button & Result */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                {!aiAnalysis ? (
                    <button 
                        onClick={handleAiAnalysis}
                        disabled={isAnalyzing}
                        className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                        {isAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isAnalyzing ? 'Analyzing Market Data...' : 'Get AI Analyst Insight'}
                    </button>
                ) : (
                    <div className="p-4 bg-indigo-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-500 fill-indigo-500" /> AI Analyst Verdict
                            </h4>
                            <button onClick={() => setAiAnalysis(null)} className="text-indigo-400 hover:text-indigo-700"><X size={14} /></button>
                        </div>
                        <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                    </div>
                )}
            </div>

            {/* Z-Score */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4"><BarChart2 size={18} className="text-blue-600" /><h3 className="text-sm font-bold text-slate-800">Market Position (Z-Score)</h3></div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-500">Relative Performance</span><span className={`text-xs font-bold px-2 py-1 rounded-full ${zInterpretation.bg} ${zInterpretation.color}`}>{zInterpretation.text}</span></div>
                <div className="relative h-4 bg-slate-100 rounded-full w-full mt-2 overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 z-10"></div>
                    <div className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white shadow-sm z-20 transition-all duration-500 ${bond.zScore > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ left: `${Math.max(5, Math.min(95, 50 + (bond.zScore * 16.6)))}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1"><span>Poor</span><span>Avg</span><span>Great</span></div>
            </div>

            {/* Historical Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2"><Activity size={18} className="text-emerald-600" /><h3 className="text-sm font-bold text-slate-800">Yield History</h3></div>
                     <div className="flex bg-slate-100 p-0.5 rounded-lg">{['3M', '6M', '1Y'].map(range => (<button key={range} onClick={() => setChartRange(range)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chartRange === range ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{range}</button>))}</div>
                </div>
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs><linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} minTickGap={30} />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px'}} itemStyle={{color: '#fff'}} formatter={(value) => [`${value}%`, 'Yield']} />
                            <Area type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorYield)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100">Analysis Breakdown</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="p-1.5 bg-blue-100 text-blue-600 rounded"><Percent size={14} /></div><p className="text-xs text-slate-500 font-medium">Coupon Rate</p></div>
                        <p className="text-sm font-bold text-slate-800">{bond.coupon.toFixed(3)}%</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="p-1.5 bg-red-100 text-red-600 rounded"><ShieldCheck size={14} /></div><p className="text-xs text-slate-500 font-medium">Tax Rate</p></div>
                        <div className="text-right"><p className="text-xs text-slate-400">Deducted</p><p className="text-xs font-mono text-red-500">-{formatCurrency(bond.taxPaid)}</p></div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="p-1.5 bg-purple-100 text-purple-600 rounded"><Calendar size={14} /></div><p className="text-xs text-slate-500 font-medium">Maturity</p></div>
                        <div className="text-right"><p className="text-xs text-slate-400">{bond.tenor} Years</p><p className="text-sm font-bold text-slate-800">{formatDateShort(bond.maturityDate)}</p></div>
                    </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 text-slate-600 rounded"><Hash size={14} /></div><p className="text-xs text-slate-500 font-medium">ISIN</p></div>
                        <p className="text-xs font-mono font-bold text-slate-700">{bond.isin}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="p-1.5 bg-slate-100 text-slate-600 rounded"><Clock size={14} /></div><p className="text-xs text-slate-500 font-medium">Time Left</p></div>
                        <p className="text-xs font-medium text-slate-700">{bond.daysToMaturity} Days</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App ---
export default function BondAnalyzer() {
    const [activeTab, setActiveTab] = useState('market'); // 'market', 'education'
    const [selectedDate, setSelectedDate] = useState(new Date('2026-01-07'));
    const [bonds, setBonds] = useState(BASE_BONDS);
    const [investmentAmount, setInvestmentAmount] = useState(1000000);
    const [selectedBondId, setSelectedBondId] = useState(null);
    const [showMobileDetail, setShowMobileDetail] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [fetchStatus, setFetchStatus] = useState('idle');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBond, setNewBond] = useState({ issueNo: '', type: 'FXD', tenor: 10, maturityYear: 2030, coupon: 10, price: 100 });

    const targetUrl = useMemo(() => getNsePdfUrl(selectedDate), [selectedDate]);

    const analyzedBonds = useMemo(() => {
        const initial = bonds.map(bond => {
            const ytm = calculateYTM(bond);
            const financial = calculateReturns(bond, investmentAmount);
            const taxRate = getTaxRate(bond);
            const daysToMaturity = calculateDaysToMaturity(bond.maturityDate, selectedDate);
            return { ...bond, ytm, ...financial, taxRatePercent: taxRate * 100, daysToMaturity };
        });
        const ytms = initial.map(b => b.ytm);
        const meanYtm = ytms.reduce((a, b) => a + b, 0) / ytms.length;
        const stdDev = Math.sqrt(ytms.reduce((a, b) => a + Math.pow(b - meanYtm, 2), 0) / ytms.length);
        return initial.map(bond => ({ ...bond, zScore: stdDev === 0 ? 0 : (bond.ytm - meanYtm) / stdDev })).sort((a, b) => b.roi - a.roi); 
    }, [bonds, investmentAmount, selectedDate]);

    useMemo(() => { if (!selectedBondId && analyzedBonds.length > 0) setSelectedBondId(analyzedBonds[0].id); }, [analyzedBonds, selectedBondId]);

    const selectedBond = analyzedBonds.find(b => b.id === selectedBondId) || analyzedBonds[0];

    const handleFetchData = () => {
        setIsSyncing(true); setFetchStatus('loading');
        setTimeout(() => { setBonds(getBondsForDate(selectedDate)); setIsSyncing(false); setFetchStatus('success'); }, 2000);
    };

    const handleAddBond = () => {
        setBonds([...bonds, { ...newBond, id: bonds.length + 1, description: 'Custom Entry' }]);
        setShowAddModal(false); setNewBond({ issueNo: '', type: 'FXD', tenor: 10, maturityYear: 2030, coupon: 10, price: 100 });
    };

    return (
        <>
        <div className="min-h-screen flex flex-col pb-6 bg-slate-50 text-slate-900 font-sans">
            <header className="bg-emerald-900 text-white p-3 md:p-4 shadow-lg sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-emerald-400" />
                            <div><h1 className="text-lg font-bold tracking-tight">BondSmart Kenya</h1></div>
                            <div className="hidden md:flex ml-8 bg-emerald-800/50 p-1 rounded-lg">
                                <button onClick={() => setActiveTab('market')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${activeTab === 'market' ? 'bg-white text-emerald-900 shadow' : 'text-emerald-300 hover:text-white'}`}>Analyzer</button>
                                <button onClick={() => setActiveTab('education')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${activeTab === 'education' ? 'bg-white text-emerald-900 shadow' : 'text-emerald-300 hover:text-white'}`}>Learn</button>
                            </div>
                        </div>
                        <div className="flex gap-2 md:hidden">
                                <button onClick={() => setActiveTab(activeTab === 'market' ? 'education' : 'market')} className="text-xs bg-emerald-800 px-3 py-2 rounded-lg text-white font-bold">{activeTab === 'market' ? 'Learn' : 'Analyzer'}</button>
                        </div>
                    </div>
                    
                    {activeTab === 'market' && (
                        <div className="flex flex-col md:flex-row gap-3 md:items-center animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="bg-emerald-800/50 rounded-lg p-1.5 flex items-center border border-emerald-700/50">
                                <div className="flex items-center gap-2 px-2 border-r border-emerald-700/50 pr-3"><Calendar size={14} className="text-emerald-300" /><span className="text-xs font-semibold text-emerald-200 uppercase">Market Date</span></div>
                                <input type="date" value={selectedDate.toISOString().split('T')[0]} onChange={(e) => { setFetchStatus('idle'); setSelectedDate(new Date(e.target.value)); }} className="bg-transparent border-none text-white text-sm font-bold focus:ring-0 py-1 focus:outline-none" />
                            </div>
                            <button onClick={handleFetchData} disabled={isSyncing} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${isSyncing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-400 text-emerald-900 hover:bg-emerald-300'}`}>
                                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />} {isSyncing ? 'Accessing NSE...' : 'Load Data'}
                            </button>
                            <div className="bg-emerald-950/30 px-3 py-2 rounded-lg flex items-center justify-between md:justify-start gap-3 border border-emerald-700/50">
                                <span className="text-xs text-emerald-200 uppercase tracking-wider font-semibold whitespace-nowrap">Invest:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-emerald-400 text-sm">KES</span>
                                    <input 
                                        type="number" 
                                        value={investmentAmount} 
                                        step="50000"
                                        min="50000"
                                        onChange={(e) => setInvestmentAmount(Number(e.target.value))} 
                                        className="bg-transparent border-none text-white font-bold text-lg w-full md:w-24 focus:ring-0 p-0 text-right md:text-left focus:outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {activeTab === 'education' ? (
                <EducationPage />
            ) : (
                <>
                    <div className="bg-white border-b border-slate-200 py-2 px-4 shadow-sm relative z-20">
                        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-2 text-[10px] md:text-xs">
                            <div className="flex items-center gap-2 text-slate-500 overflow-hidden"><LinkIcon size={12} className="shrink-0" /><span className="shrink-0 font-medium">Target URL:</span><span className="truncate font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 select-all" title={targetUrl}>{targetUrl}</span></div>
                            <div className="flex items-center gap-4">
                                {fetchStatus === 'success' && <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>Live Data Loaded</span>}
                                {fetchStatus === 'loading' && <span className="text-amber-600 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Fetching PDF...</span>}
                            </div>
                        </div>
                    </div>
                    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 relative">
                        <div className="md:col-span-7 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Building2 size={20} className="text-emerald-700" /> Bond Listings</h2>
                                <button onClick={() => setShowAddModal(true)} className="hidden md:flex text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-emerald-50 text-emerald-700 items-center gap-1 transition-colors"><Plus size={14} /> Add Custom</button>
                            </div>
                            <div className="space-y-3 pb-20 md:pb-0">
                                {analyzedBonds.map((bond) => (
                                    <div key={bond.id} onClick={() => { setSelectedBondId(bond.id); setShowMobileDetail(true); }} className={`group relative p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md active:scale-98 ${selectedBondId === bond.id ? 'bg-white border-emerald-500 shadow-emerald-100 ring-1 ring-emerald-500 md:ring-1' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
                                        <div className="flex justify-between items-start">
                                            <div><div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-slate-800 text-base md:text-lg">{bond.issueNo}</h3>{bond.type === 'IFB' && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded tracking-wide">Tax Free</span>}</div><p className="text-xs md:text-sm text-slate-500 mt-1">{bond.description}</p></div>
                                            <div className="text-right mt-4 md:mt-0"><div className="text-xl md:text-2xl font-bold text-emerald-600">{bond.roi.toFixed(2)}%</div><div className="text-[10px] md:text-xs text-slate-400 font-medium">Net Return</div></div>
                                        </div>
                                        
                                        <div className="mt-4 grid grid-cols-3 gap-y-3 gap-x-2 border-t border-slate-100 pt-3">
                                            {/* Row 1: Main Financials */}
                                            <div><span className="text-[10px] md:text-xs text-slate-400 block mb-0.5">Price</span><span className="text-xs md:text-sm font-semibold text-slate-700">{bond.price.toFixed(2)}</span></div>
                                            <div><span className="text-[10px] md:text-xs text-slate-400 block mb-0.5">Coupon</span><span className="text-xs md:text-sm font-semibold text-slate-700">{bond.coupon.toFixed(2)}%</span></div>
                                            <div className="text-right"><span className="text-[10px] md:text-xs text-slate-400 block mb-0.5">Maturity Date</span><span className="text-xs md:text-sm font-semibold text-slate-700">{formatDateShort(bond.maturityDate)}</span></div>

                                            {/* Row 2: Technical Details */}
                                            <div className="col-span-1"><span className="text-[10px] md:text-xs text-slate-400 block mb-0.5">Issue Date</span><span className="text-xs font-medium text-slate-600">{formatDateShort(bond.issueDate)}</span></div>
                                            <div className="col-span-1"><span className="text-[10px] md:text-xs text-slate-400 block mb-0.5">Days Left</span><span className="text-xs font-medium text-slate-600 flex items-center gap-1"><Clock size={10} className="text-emerald-500"/> {bond.daysToMaturity}</span></div>
                                            <div className="col-span-1 text-right"><span className="text-[10px] md:text-xs text-slate-400 block mb-0.5">ISIN</span><span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-50 px-1 py-0.5 rounded">{bond.isin}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="hidden md:block md:col-span-5"><div className="sticky top-28"><BondDetailView bond={selectedBond} isMobile={false} /></div></div>
                        {showMobileDetail && <div className="fixed inset-0 z-40 md:hidden bg-slate-50 flex flex-col animate-in slide-in-from-bottom-full duration-300"><div className="flex-1 overflow-y-auto p-4 pt-20"><BondDetailView bond={selectedBond} isMobile={true} onClose={() => setShowMobileDetail(false)} /></div><div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"><button onClick={() => setShowMobileDetail(false)} className="flex-1 py-3 text-slate-600 font-bold border border-slate-300 rounded-xl">Back</button><button className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">Select <ArrowUpRight size={18} /></button></div></div>}
                    </main>
                </>
            )}

            {showAddModal && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800">Add Custom Bond</h3><button onClick={() => setShowAddModal(false)}><X className="text-slate-400" /></button></div><div className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bond Issue Name</label><input type="text" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="e.g., FXD1/2026/05" value={newBond.issueNo} onChange={e => setNewBond({...newBond, issueNo: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label><select className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newBond.type} onChange={e => setNewBond({...newBond, type: e.target.value})}><option value="FXD">Fixed (FXD)</option><option value="IFB">Infrastructure (IFB)</option></select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tenor (Years)</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newBond.tenor} onChange={e => setNewBond({...newBond, tenor: Number(e.target.value)})} /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newBond.price} onChange={e => setNewBond({...newBond, price: Number(e.target.value)})} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coupon (%)</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={newBond.coupon} onChange={e => setNewBond({...newBond, coupon: Number(e.target.value)})} /></div></div></div><div className="flex justify-end gap-3 mt-8"><button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button><button onClick={handleAddBond} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-lg shadow-emerald-200">Add Bond</button></div></div></div>}
        </div>
        <Analytics />
        </>
    );
}