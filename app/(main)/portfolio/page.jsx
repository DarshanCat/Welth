"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Plus, Search, RefreshCw, Loader2,
  Trash2, X, ChevronUp, ChevronDown, BarChart2, PieChart, AlertTriangle,
} from "lucide-react";
import { PieChart as RPie, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import SentimentWidget from "./_components/sentiment-widget";

const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtDec = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const fmtN   = (n, d = 2) => Number(n ?? 0).toFixed(d);

const TYPE_CFG = {
  STOCK:       { color: "#60a5fa", label: "Stock",       bg: "rgba(96,165,250,.12)"  },
  MUTUAL_FUND: { color: "#a78bfa", label: "Mutual Fund", bg: "rgba(167,139,250,.12)" },
  ETF:         { color: "#34d399", label: "ETF",         bg: "rgba(52,211,153,.12)"  },
};
const PIE_COLORS = ["#60a5fa","#a78bfa","#34d399","#fbbf24","#f87171","#06b6d4","#ec4899","#84cc16","#f97316","#8b5cf6"];

// ── All NSE stocks grouped by sector ─────────────────────────────────────────
const NSE_STOCKS = {
  "🏦 Banking & Finance": [
    {symbol:"HDFCBANK",name:"HDFC Bank"},{symbol:"ICICIBANK",name:"ICICI Bank"},{symbol:"SBIN",name:"State Bank of India"},
    {symbol:"KOTAKBANK",name:"Kotak Mahindra Bank"},{symbol:"AXISBANK",name:"Axis Bank"},{symbol:"INDUSINDBK",name:"IndusInd Bank"},
    {symbol:"BANKBARODA",name:"Bank of Baroda"},{symbol:"PNB",name:"Punjab National Bank"},{symbol:"CANBK",name:"Canara Bank"},
    {symbol:"UNIONBANK",name:"Union Bank of India"},{symbol:"IDFCFIRSTB",name:"IDFC First Bank"},{symbol:"FEDERALBNK",name:"Federal Bank"},
    {symbol:"RBLBANK",name:"RBL Bank"},{symbol:"YESBANK",name:"Yes Bank"},{symbol:"BANDHANBNK",name:"Bandhan Bank"},
    {symbol:"BAJFINANCE",name:"Bajaj Finance"},{symbol:"BAJAJFINSV",name:"Bajaj Finserv"},{symbol:"HDFCLIFE",name:"HDFC Life Insurance"},
    {symbol:"SBILIFE",name:"SBI Life Insurance"},{symbol:"ICICIGI",name:"ICICI Lombard"},{symbol:"MUTHOOTFIN",name:"Muthoot Finance"},
    {symbol:"CHOLAFIN",name:"Cholamandalam"},{symbol:"RECLTD",name:"REC Ltd"},{symbol:"PFC",name:"Power Finance Corp"},
    {symbol:"SHRIRAMFIN",name:"Shriram Finance"},
  ],
  "💻 IT & Technology": [
    {symbol:"TCS",name:"Tata Consultancy"},{symbol:"INFY",name:"Infosys"},{symbol:"WIPRO",name:"Wipro"},
    {symbol:"HCLTECH",name:"HCL Technologies"},{symbol:"TECHM",name:"Tech Mahindra"},{symbol:"LTIM",name:"LTIMindtree"},
    {symbol:"MPHASIS",name:"Mphasis"},{symbol:"COFORGE",name:"Coforge"},{symbol:"PERSISTENT",name:"Persistent Systems"},
    {symbol:"OFSS",name:"Oracle Financial"},{symbol:"KPITTECH",name:"KPIT Technologies"},{symbol:"TATAELXSI",name:"Tata Elxsi"},
    {symbol:"CYIENT",name:"Cyient"},{symbol:"HAPPSTMNDS",name:"Happiest Minds"},{symbol:"TANLA",name:"Tanla Platforms"},
    {symbol:"NAUKRI",name:"Info Edge (Naukri)"},{symbol:"ZOMATO",name:"Zomato"},{symbol:"PAYTM",name:"Paytm"},
    {symbol:"POLICYBZR",name:"PolicyBazaar"},
  ],
  "⚡ Energy & Power": [
    {symbol:"RELIANCE",name:"Reliance Industries"},{symbol:"ONGC",name:"ONGC"},{symbol:"IOC",name:"Indian Oil"},
    {symbol:"BPCL",name:"Bharat Petroleum"},{symbol:"HINDPETRO",name:"Hindustan Petroleum"},{symbol:"GAIL",name:"GAIL India"},
    {symbol:"PETRONET",name:"Petronet LNG"},{symbol:"IGL",name:"Indraprastha Gas"},{symbol:"MGL",name:"Mahanagar Gas"},
    {symbol:"NTPC",name:"NTPC"},{symbol:"POWERGRID",name:"Power Grid Corp"},{symbol:"ADANIPOWER",name:"Adani Power"},
    {symbol:"ADANIGREEN",name:"Adani Green Energy"},{symbol:"TATAPOWER",name:"Tata Power"},{symbol:"TORNTPOWER",name:"Torrent Power"},
    {symbol:"SUZLON",name:"Suzlon Energy"},{symbol:"NHPC",name:"NHPC"},{symbol:"COALINDIA",name:"Coal India"},
  ],
  "🏭 Industrials": [
    {symbol:"LT",name:"Larsen & Toubro"},{symbol:"SIEMENS",name:"Siemens India"},{symbol:"ABB",name:"ABB India"},
    {symbol:"BHEL",name:"BHEL"},{symbol:"HAL",name:"Hindustan Aeronautics"},{symbol:"BEL",name:"Bharat Electronics"},
    {symbol:"CUMMINSIND",name:"Cummins India"},{symbol:"THERMAX",name:"Thermax"},{symbol:"CGPOWER",name:"CG Power"},
    {symbol:"VOLTAS",name:"Voltas"},{symbol:"BLUESTAR",name:"Blue Star"},{symbol:"HAVELLS",name:"Havells India"},
    {symbol:"POLYCAB",name:"Polycab India"},{symbol:"KEI",name:"KEI Industries"},
  ],
  "🏗️ Infra & Real Estate": [
    {symbol:"ADANIENT",name:"Adani Enterprises"},{symbol:"ADANIPORTS",name:"Adani Ports"},{symbol:"DLF",name:"DLF"},
    {symbol:"GODREJPROP",name:"Godrej Properties"},{symbol:"PRESTIGE",name:"Prestige Estates"},{symbol:"OBEROIRLTY",name:"Oberoi Realty"},
    {symbol:"BRIGADE",name:"Brigade Enterprises"},{symbol:"PHOENIXLTD",name:"Phoenix Mills"},{symbol:"SOBHA",name:"Sobha"},
    {symbol:"IRB",name:"IRB Infrastructure"},{symbol:"KNR",name:"KNR Constructions"},{symbol:"CONCOR",name:"Container Corp"},
    {symbol:"GMRINFRA",name:"GMR Airports"},
  ],
  "🚗 Auto & Ancillaries": [
    {symbol:"MARUTI",name:"Maruti Suzuki"},{symbol:"TATAMOTORS",name:"Tata Motors"},{symbol:"M&M",name:"Mahindra & Mahindra"},
    {symbol:"BAJAJ-AUTO",name:"Bajaj Auto"},{symbol:"HEROMOTOCO",name:"Hero MotoCorp"},{symbol:"EICHERMOT",name:"Eicher Motors"},
    {symbol:"TVSMOTORS",name:"TVS Motor"},{symbol:"ASHOKLEY",name:"Ashok Leyland"},{symbol:"BOSCHLTD",name:"Bosch India"},
    {symbol:"MOTHERSON",name:"Motherson Sumi"},{symbol:"BHARATFORG",name:"Bharat Forge"},{symbol:"APOLLOTYRE",name:"Apollo Tyres"},
    {symbol:"MRF",name:"MRF"},{symbol:"CEATLTD",name:"CEAT"},{symbol:"BALKRISIND",name:"Balkrishna Ind"},
    {symbol:"EXIDEIND",name:"Exide Industries"},
  ],
  "💊 Pharma & Healthcare": [
    {symbol:"SUNPHARMA",name:"Sun Pharma"},{symbol:"DRREDDY",name:"Dr. Reddys"},{symbol:"CIPLA",name:"Cipla"},
    {symbol:"DIVISLAB",name:"Divis Labs"},{symbol:"BIOCON",name:"Biocon"},{symbol:"LUPIN",name:"Lupin"},
    {symbol:"AUROPHARMA",name:"Aurobindo Pharma"},{symbol:"ALKEM",name:"Alkem Labs"},{symbol:"TORNTPHARM",name:"Torrent Pharma"},
    {symbol:"IPCALAB",name:"IPCA Labs"},{symbol:"ABBOTINDIA",name:"Abbott India"},{symbol:"APOLLOHOSP",name:"Apollo Hospitals"},
    {symbol:"FORTIS",name:"Fortis Healthcare"},{symbol:"MAXHEALTH",name:"Max Healthcare"},{symbol:"LALPATHLAB",name:"Dr. Lal PathLabs"},
  ],
  "🛒 FMCG & Consumer": [
    {symbol:"HINDUNILVR",name:"Hindustan Unilever"},{symbol:"ITC",name:"ITC"},{symbol:"NESTLEIND",name:"Nestle India"},
    {symbol:"BRITANNIA",name:"Britannia"},{symbol:"DABUR",name:"Dabur India"},{symbol:"MARICO",name:"Marico"},
    {symbol:"GODREJCP",name:"Godrej Consumer"},{symbol:"COLPAL",name:"Colgate India"},{symbol:"EMAMILTD",name:"Emami"},
    {symbol:"TATACONSUM",name:"Tata Consumer"},{symbol:"VBL",name:"Varun Beverages"},{symbol:"PIDILITIND",name:"Pidilite"},
    {symbol:"ASIANPAINT",name:"Asian Paints"},{symbol:"BERGEPAINT",name:"Berger Paints"},{symbol:"TITAN",name:"Titan"},
    {symbol:"TRENT",name:"Trent (Zudio)"},{symbol:"DMART",name:"DMart"},
  ],
  "⚙️ Metals & Mining": [
    {symbol:"TATASTEEL",name:"Tata Steel"},{symbol:"JSWSTEEL",name:"JSW Steel"},{symbol:"SAIL",name:"SAIL"},
    {symbol:"HINDALCO",name:"Hindalco"},{symbol:"NATIONALUM",name:"NALCO"},{symbol:"VEDL",name:"Vedanta"},
    {symbol:"HINDZINC",name:"Hindustan Zinc"},{symbol:"NMDC",name:"NMDC"},{symbol:"APLAPOLLO",name:"APL Apollo Tubes"},
    {symbol:"RATNAMANI",name:"Ratnamani Metals"},{symbol:"JINDALSTEL",name:"Jindal Steel"},
  ],
  "📡 Telecom & Media": [
    {symbol:"BHARTIARTL",name:"Bharti Airtel"},{symbol:"IDEA",name:"Vodafone Idea"},{symbol:"TATACOMM",name:"Tata Communications"},
    {symbol:"HFCL",name:"HFCL"},{symbol:"PVRINOX",name:"PVR INOX"},{symbol:"ZEEL",name:"Zee Entertainment"},
    {symbol:"SUNTV",name:"Sun TV"},{symbol:"IRCTC",name:"IRCTC"},
  ],
  "🌾 Chemicals & Agri": [
    {symbol:"UPL",name:"UPL"},{symbol:"PIIND",name:"PI Industries"},{symbol:"SRF",name:"SRF"},
    {symbol:"DEEPAKNTR",name:"Deepak Nitrite"},{symbol:"NAVINFLUOR",name:"Navin Fluorine"},{symbol:"ATUL",name:"Atul"},
    {symbol:"CLEAN",name:"Clean Science"},{symbol:"FINEORG",name:"Fine Organic"},{symbol:"COROMANDEL",name:"Coromandel"},
    {symbol:"CHAMBAL",name:"Chambal Fertilisers"},
  ],
};

const MF_LIST = {
  "🏆 Large Cap": [
    {symbol:"120503",name:"SBI Bluechip Fund - Direct"},{symbol:"119598",name:"Mirae Asset Large Cap - Direct"},
    {symbol:"112090",name:"Axis Bluechip Fund - Direct"},{symbol:"125494",name:"ICICI Pru Bluechip - Direct"},
    {symbol:"119551",name:"HDFC Top 100 - Direct"},{symbol:"119775",name:"Nippon India Large Cap - Direct"},
    {symbol:"118989",name:"Kotak Bluechip - Direct"},{symbol:"101206",name:"UTI Mastershare - Direct"},
  ],
  "📈 Flexi & Multi Cap": [
    {symbol:"122639",name:"Parag Parikh Flexi Cap - Direct"},{symbol:"120594",name:"Quant Flexi Cap - Direct"},
    {symbol:"119597",name:"HDFC Flexi Cap - Direct"},{symbol:"120847",name:"UTI Flexi Cap - Direct"},
    {symbol:"112089",name:"Axis Flexi Cap - Direct"},{symbol:"131594",name:"Motilal Oswal Flexi Cap - Direct"},
    {symbol:"101539",name:"SBI Magnum Multicap - Direct"},{symbol:"119786",name:"Kotak Multicap - Direct"},
  ],
  "🚀 Small & Mid Cap": [
    {symbol:"125497",name:"Quant Small Cap - Direct"},{symbol:"120828",name:"Nippon India Small Cap - Direct"},
    {symbol:"119587",name:"HDFC Mid-Cap Opportunities - Direct"},{symbol:"118784",name:"Axis Small Cap - Direct"},
    {symbol:"118778",name:"Kotak Small Cap - Direct"},{symbol:"119793",name:"DSP Midcap - Direct"},
    {symbol:"119801",name:"Mirae Asset Midcap - Direct"},{symbol:"119802",name:"Motilal Oswal Midcap - Direct"},
  ],
  "📊 Index Funds": [
    {symbol:"120716",name:"UTI Nifty 50 Index - Direct"},{symbol:"118825",name:"SBI Nifty Index - Direct"},
    {symbol:"119801",name:"ICICI Pru Nifty 50 Index - Direct"},{symbol:"131594",name:"UTI Nifty Next 50 - Direct"},
    {symbol:"119597",name:"Motilal Oswal Nifty Midcap 150"},{symbol:"120822",name:"HDFC Nifty Smallcap 250"},
  ],
  "💰 ELSS (Tax Saving)": [
    {symbol:"120503",name:"Quant ELSS Tax Saver - Direct"},{symbol:"112090",name:"Mirae Asset ELSS - Direct"},
    {symbol:"119598",name:"Canara Robeco ELSS - Direct"},{symbol:"120594",name:"Axis Long Term Equity - Direct"},
    {symbol:"118989",name:"HDFC ELSS Tax Saver - Direct"},{symbol:"125354",name:"Kotak ELSS Tax Saver - Direct"},
    {symbol:"101206",name:"Franklin India ELSS - Direct"},
  ],
  "🏦 Hybrid & Debt": [
    {symbol:"119775",name:"SBI Equity Hybrid - Direct"},{symbol:"119587",name:"HDFC Balanced Advantage - Direct"},
    {symbol:"118784",name:"ICICI Pru Balanced Advantage - Direct"},{symbol:"120828",name:"Kotak Equity Hybrid - Direct"},
    {symbol:"119793",name:"SBI Magnum Medium Duration - Direct"},{symbol:"118778",name:"HDFC Short Term Debt - Direct"},
    {symbol:"120847",name:"Aditya Birla SL Liquid - Direct"},
  ],
};

function GainBadge({ val, pct, size = "md" }) {
  const pos = val >= 0; const c = pos ? "#34d399" : "#f87171";
  const Icon = pos ? TrendingUp : TrendingDown;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <Icon size={size==="sm"?11:13} style={{color:c}}/>
      <span style={{color:c,fontWeight:700,fontSize:size==="sm"?".7rem":".78rem"}}>
        {pos?"+":""}{fmt(val)} ({pos?"+":""}{fmtN(pct)}%)
      </span>
    </div>
  );
}

function HoldingCard({ h, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CFG[h.type]||TYPE_CFG.STOCK; const isUp = h.gain>=0;
  return (
    <div style={{background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,overflow:"hidden",marginBottom:10}}>
      <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setExpanded(v=>!v)}>
        <div style={{width:44,height:44,borderRadius:13,background:cfg.bg,border:`1px solid ${cfg.color}30`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:".6rem",fontWeight:800,color:cfg.color}}>{h.symbol.length>5?h.symbol.slice(0,4):h.symbol}</span>
          <span style={{fontSize:".5rem",color:cfg.color,opacity:.7}}>{h.exchange}</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
            <p style={{fontWeight:700,fontSize:".88rem",color:"#f1f5f9",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</p>
            <span style={{fontSize:".6rem",padding:"1px 6px",borderRadius:9999,background:cfg.bg,color:cfg.color,fontWeight:700,flexShrink:0}}>{cfg.label}</span>
          </div>
          <div style={{display:"flex",gap:10,fontSize:".72rem",color:"#64748b"}}>
            <span>{fmtN(h.quantity)} units</span>
            <span>Avg: {fmtDec(h.avgBuyPrice)}</span>
            {h.live&&<span style={{color:h.live.changePct>=0?"#34d399":"#f87171"}}>Day: {h.live.changePct>=0?"+":""}{fmtN(h.live.changePct)}%</span>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <p style={{fontWeight:800,color:"#f1f5f9",fontSize:".92rem",margin:0}}>{fmt(h.currentValue)}</p>
          <GainBadge val={h.gain} pct={h.gainPct} size="sm"/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <button onClick={(e)=>{e.stopPropagation();onDelete(h.id);}} style={{width:26,height:26,borderRadius:9999,background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Trash2 size={11} style={{color:"#f87171"}}/>
          </button>
          {expanded?<ChevronUp size={13} style={{color:"#64748b"}}/>:<ChevronDown size={13} style={{color:"#64748b"}}/>}
        </div>
      </div>
      {expanded&&(
        <div style={{padding:"0 14px 14px",borderTop:"1px solid rgba(255,255,255,.05)"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
            {[{label:"Invested",val:fmt(h.investedAmt),color:"#60a5fa"},{label:"Current",val:fmt(h.currentValue),color:isUp?"#34d399":"#f87171"},{label:"Live Price",val:fmtDec(h.currentPrice),color:"#fbbf24"},{label:"52W High",val:h.live?.high52?fmt(h.live.high52):"—",color:"#34d399"},{label:"52W Low",val:h.live?.low52?fmt(h.live.low52):"—",color:"#f87171"},{label:"P/L",val:`${isUp?"+":""}${fmtN(h.gainPct)}%`,color:isUp?"#34d399":"#f87171"}].map(s=>(
              <div key={s.label} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                <p style={{fontSize:".65rem",color:"#64748b",margin:0}}>{s.label}</p>
                <p style={{fontSize:".82rem",fontWeight:700,color:s.color,margin:"3px 0 0"}}>{s.val}</p>
              </div>
            ))}
          </div>
          {h.live&&(
            <div style={{marginTop:10,padding:"8px 10px",background:"rgba(255,255,255,.025)",borderRadius:10,display:"flex",gap:14,fontSize:".72rem"}}>
              <span style={{color:"#64748b"}}>Prev Close: <span style={{color:"#94a3b8"}}>{fmtDec(h.live.prevClose)}</span></span>
              <span style={{color:h.live.change>=0?"#34d399":"#f87171"}}>Day: {h.live.change>=0?"+":""}{fmtDec(h.live.change)}</span>
              {h.live.marketState&&<span style={{color:h.live.marketState==="REGULAR"?"#34d399":"#fbbf24"}}>Market: {h.live.marketState}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stock card in browse grid — shows live price ──────────────────────────────
function BrowseCard({ item, tab, onSelect }) {
  const [price, setPrice]   = useState(null);
  const [pLoading, setPLoad]= useState(false);

  useEffect(() => {
    // Only auto-fetch for visible items — using IntersectionObserver would be ideal
    // but for simplicity fetch on mount for first 20, rest on hover
  }, []);

  const fetchPrice = async () => {
    if (price || pLoading) return;
    setPLoad(true);
    try {
      const res = await fetch(`/api/portfolio/price?symbol=${item.symbol}&exchange=${tab==="MF"?"MF":"NSE"}&type=${tab==="MF"?"MUTUAL_FUND":"STOCK"}`);
      const d   = await res.json();
      if (!d.error) setPrice(d);
    } catch {}
    finally { setPLoad(false); }
  };

  const isUp = price?.changePct >= 0;

  return (
    <button
      onClick={() => onSelect(item, price)}
      onMouseEnter={fetchPrice}
      style={{textAlign:"left",padding:"10px 11px",borderRadius:11,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",cursor:"pointer",transition:"all .15s",position:"relative"}}
      onFocus={fetchPrice}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontWeight:700,fontSize:".78rem",color:"#e2e8f0",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {tab==="STOCK"?item.symbol:item.name.split(" ").slice(0,3).join(" ")}
          </p>
          <p style={{fontSize:".63rem",color:"#64748b",margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {tab==="STOCK"?item.name:item.sector}
          </p>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:6}}>
          {pLoading&&<Loader2 size={10} style={{color:"#475569",animation:"spin 1s linear infinite"}}/>}
          {price&&!pLoading&&(
            <>
              <p style={{fontSize:".75rem",fontWeight:800,color:"#f1f5f9",margin:0}}>{fmtDec(price.price)}</p>
              <p style={{fontSize:".62rem",fontWeight:700,color:isUp?"#34d399":"#f87171",margin:"1px 0 0"}}>
                {isUp?"+":""}{fmtN(price.changePct)}%
              </p>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Add modal ─────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }) {
  const [tab,       setTab]      = useState("STOCK");
  const [query,     setQuery]    = useState("");
  const [selected,  setSelected] = useState(null);
  const [sector,    setSector]   = useState(null);
  const [qty,       setQty]      = useState("");
  const [price,     setPrice]    = useState("");
  const [saving,    setSaving]   = useState(false);
  const [errMsg,    setErrMsg]   = useState("");
  const [priceLoad, setPriceLoad]= useState(false);

  const allStocks  = Object.entries(NSE_STOCKS).flatMap(([sec,items])=>items.map(i=>({...i,sector:sec})));
  const allMFs     = Object.entries(MF_LIST).flatMap(([sec,items])=>items.map(i=>({...i,sector:sec})));
  const sourceList = tab==="STOCK"?allStocks:allMFs;
  const sectors    = tab==="STOCK"?Object.keys(NSE_STOCKS):Object.keys(MF_LIST);

  const filtered = sourceList.filter(item=>{
    const matchS = !sector||item.sector===sector;
    const q = query.toLowerCase();
    return (!q||item.symbol.toLowerCase().includes(q)||item.name.toLowerCase().includes(q))&&matchS;
  });

  // When stock selected — fetch live price and auto-fill
  const handleSelect = async (item, cachedPrice) => {
    setSelected(item);
    setQuery("");
    setErrMsg("");
    if (cachedPrice?.price) {
      setPrice(String(cachedPrice.price));
      return;
    }
    setPriceLoad(true);
    try {
      const res = await fetch(`/api/portfolio/price?symbol=${item.symbol}&exchange=${tab==="MF"?"MF":"NSE"}&type=${tab==="MF"?"MUTUAL_FUND":"STOCK"}`);
      const d   = await res.json();
      if (d.price) setPrice(String(d.price));
    } catch {}
    finally { setPriceLoad(false); }
  };

  const handleAdd = async () => {
    if (!selected||!qty||!price) return;
    setSaving(true);
    setErrMsg("");
    try {
      const res = await fetch("/api/portfolio", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          symbol:      selected.symbol,
          name:        selected.name,
          type:        tab==="MF"?"MUTUAL_FUND":"STOCK",
          exchange:    tab==="MF"?"MF":"NSE",
          quantity:    qty,
          avgBuyPrice: price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to add. Please run: npx prisma migrate dev --name add_holdings");
        setSaving(false);
        return;
      }
      await onAdd();
      onClose();
    } catch (e) {
      setErrMsg("Network error. Please try again.");
      setSaving(false);
    }
  };

  const preview = selected&&qty&&price ? parseFloat(qty)*parseFloat(price) : null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"1rem"}}>
      <div style={{background:"#0a1628",border:"1px solid rgba(255,255,255,.1)",borderRadius:22,width:"100%",maxWidth:560,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"1rem 1.2rem .8rem",borderBottom:"1px solid rgba(255,255,255,.07)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <p style={{fontWeight:800,fontSize:"1rem",color:"#f1f5f9",margin:0}}>Add to Portfolio</p>
            <p style={{fontSize:".7rem",color:"#64748b",margin:"2px 0 0"}}>
              {Object.values(NSE_STOCKS).flat().length} NSE Stocks  ·  {Object.values(MF_LIST).flat().length} Mutual Funds  ·  Hover for live price
            </p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.07)",border:"none",borderRadius:9999,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <X size={13} style={{color:"#94a3b8"}}/>
          </button>
        </div>

        {/* Tab toggle */}
        <div style={{display:"flex",gap:4,padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
          {[{key:"STOCK",label:"📈 NSE Stocks"},{key:"MF",label:"🏦 Mutual Funds"}].map(t=>(
            <button key={t.key} onClick={()=>{setTab(t.key);setSector(null);setQuery("");setSelected(null);setErrMsg("");}}
              style={{flex:1,padding:"7px",borderRadius:10,background:tab===t.key?"rgba(96,165,250,.15)":"transparent",color:tab===t.key?"#60a5fa":"#64748b",fontWeight:tab===t.key?700:500,fontSize:".8rem",border:tab===t.key?"1px solid rgba(96,165,250,.3)":"1px solid transparent",cursor:"pointer"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {!selected&&(
          <div style={{padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
            <div style={{position:"relative"}}>
              <Search size={13} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#64748b"}}/>
              <input value={query} onChange={e=>{setQuery(e.target.value);setSector(null);}}
                placeholder={tab==="MF"?"Search fund name...":"Search symbol or company name..."}
                style={{width:"100%",padding:"8px 12px 8px 32px",borderRadius:9,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"#e2e8f0",fontSize:".8rem",outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
        )}

        {/* Sector chips */}
        {!selected&&!query&&(
          <div style={{padding:"6px 12px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",gap:5,overflowX:"auto",flexShrink:0}}>
            <button onClick={()=>setSector(null)}
              style={{padding:"4px 12px",borderRadius:9999,whiteSpace:"nowrap",fontSize:".7rem",fontWeight:sector===null?700:500,background:sector===null?"rgba(96,165,250,.18)":"rgba(255,255,255,.04)",border:sector===null?"1px solid rgba(96,165,250,.35)":"1px solid rgba(255,255,255,.08)",color:sector===null?"#60a5fa":"#64748b",cursor:"pointer"}}>
              All ({sourceList.length})
            </button>
            {sectors.map(s=>(
              <button key={s} onClick={()=>setSector(s)}
                style={{padding:"4px 12px",borderRadius:9999,whiteSpace:"nowrap",fontSize:".7rem",fontWeight:sector===s?700:500,background:sector===s?"rgba(96,165,250,.18)":"rgba(255,255,255,.04)",border:sector===s?"1px solid rgba(96,165,250,.35)":"1px solid rgba(255,255,255,.08)",color:sector===s?"#60a5fa":"#64748b",cursor:"pointer"}}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Browse grid */}
        {!selected&&(
          <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
            <p style={{fontSize:".68rem",color:"#475569",padding:"2px 6px 4px",margin:0}}>
              {filtered.length} {tab==="MF"?"funds":"stocks"}{sector?` in ${sector}`:""}{query?` for "${query}"`:""}
              <span style={{color:"#334155",marginLeft:8}}>· Hover a card to see live price</span>
            </p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
              {filtered.map((item,i)=>(
                <BrowseCard key={i} item={item} tab={tab} onSelect={handleSelect}/>
              ))}
            </div>
          </div>
        )}

        {/* Selected form */}
        {selected&&(
          <div style={{flex:1,padding:"1rem 1.2rem",overflowY:"auto"}}>
            <div style={{padding:"10px 12px",background:"rgba(96,165,250,.08)",border:"1px solid rgba(96,165,250,.25)",borderRadius:12,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <p style={{fontWeight:700,color:"#60a5fa",fontSize:".9rem",margin:0}}>{tab==="STOCK"?selected.symbol:selected.name.split(" ").slice(0,4).join(" ")}</p>
                <p style={{color:"#64748b",fontSize:".72rem",margin:"2px 0 0"}}>{tab==="STOCK"?selected.name:selected.sector} · {tab==="STOCK"?"NSE":"Mutual Fund"}</p>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer"}}><X size={14}/></button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:".72rem",color:"#64748b",display:"block",marginBottom:4}}>
                  {tab==="MF"?"Units purchased":"Qty (no. of shares)"}
                </label>
                <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="e.g. 10"
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"#e2e8f0",fontSize:".82rem",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:".72rem",color:"#64748b",display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  Buy Price (Rs.)
                  {priceLoad&&<Loader2 size={10} style={{color:"#60a5fa",animation:"spin 1s linear infinite"}}/>}
                  {price&&!priceLoad&&<span style={{color:"#34d399",fontSize:".65rem"}}>· live price filled</span>}
                </label>
                <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="e.g. 450.50"
                  style={{width:"100%",padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,.06)",border:`1px solid ${price?"rgba(52,211,153,.35)":"rgba(255,255,255,.1)"}`,color:"#e2e8f0",fontSize:".82rem",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            {preview&&(
              <div style={{padding:"8px 12px",background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.2)",borderRadius:9,fontSize:".78rem",color:"#34d399",marginBottom:12}}>
                Total Investment: <strong>{fmtDec(preview)}</strong>
              </div>
            )}

            {errMsg&&(
              <div style={{padding:"8px 12px",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",borderRadius:9,fontSize:".75rem",color:"#f87171",display:"flex",gap:8,alignItems:"flex-start"}}>
                <AlertTriangle size={13} style={{flexShrink:0,marginTop:1}}/>
                <span>{errMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
          <button onClick={handleAdd} disabled={!selected||!qty||!price||saving}
            style={{width:"100%",padding:"11px",borderRadius:11,background:selected&&qty&&price?"linear-gradient(135deg,#3b82f6,#2563eb)":"rgba(255,255,255,.06)",border:"none",color:selected&&qty&&price?"#fff":"#475569",fontWeight:700,fontSize:".85rem",cursor:!selected||!qty||!price?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {saving?<><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>Adding...</>:<><Plus size={14}/>Add to Portfolio</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tab,     setTab]     = useState("holdings");
  const [errMsg,  setErrMsg]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const r = await fetch("/api/portfolio");
      const d = await r.json();
      if (!r.ok) {
        setErrMsg(d.error || "Failed to load portfolio");
      } else {
        setData(d);
      }
    } catch { setErrMsg("Network error loading portfolio"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => { await load(); };

  const handleDelete = async (id) => {
    if (!confirm("Remove this holding?")) return;
    await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
    setData(d => d?{...d,holdings:d.holdings.filter(h=>h.id!==id)}:d);
  };

  const { holdings=[], summary={} } = data||{};
  const pieData = holdings.slice(0,8).map((h,i)=>({name:h.symbol,value:h.currentValue,color:PIE_COLORS[i%PIE_COLORS.length]}));
  const winners = [...holdings].filter(h=>h.gain>0).sort((a,b)=>b.gainPct-a.gainPct).slice(0,5);
  const losers  = [...holdings].filter(h=>h.gain<0).sort((a,b)=>a.gainPct-b.gainPct).slice(0,5);

  return (
    <div style={{minHeight:"100vh",padding:"1rem 1rem 6rem",maxWidth:960,margin:"0 auto"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,rgba(52,211,153,.2),rgba(16,185,129,.1))",border:"1px solid rgba(52,211,153,.4)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <TrendingUp size={20} style={{color:"#34d399"}}/>
          </div>
          <div>
            <h1 style={{fontSize:"1.5rem",fontWeight:800,color:"#f1f5f9",margin:0,lineHeight:1}}>Portfolio</h1>
            <p style={{fontSize:".72rem",color:"#64748b",margin:"3px 0 0"}}>
              {Object.values(NSE_STOCKS).flat().length} NSE stocks · {Object.values(MF_LIST).flat().length} Mutual Funds · Live prices
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={load} disabled={loading} style={{width:36,height:36,borderRadius:9999,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <RefreshCw size={14} style={{color:"#64748b",animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:9999,background:"linear-gradient(135deg,rgba(52,211,153,.18),rgba(16,185,129,.1))",border:"1px solid rgba(52,211,153,.4)",color:"#34d399",fontSize:".8rem",fontWeight:700,cursor:"pointer"}}>
            <Plus size={13}/> Add Holding
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errMsg&&(
        <div style={{padding:"10px 14px",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",borderRadius:12,marginBottom:16,display:"flex",alignItems:"flex-start",gap:10}}>
          <AlertTriangle size={16} style={{color:"#f87171",flexShrink:0,marginTop:1}}/>
          <div>
            <p style={{color:"#f87171",fontWeight:700,margin:0,fontSize:".85rem"}}>{errMsg}</p>
            {errMsg.includes("relation")||errMsg.includes("table")||errMsg.includes("Holding")?
              <p style={{color:"#64748b",fontSize:".78rem",margin:"4px 0 0"}}>
                Run this command in your project folder: <code style={{background:"rgba(255,255,255,.08)",padding:"1px 6px",borderRadius:4,color:"#fbbf24"}}>npx prisma migrate dev --name add_holdings</code>
              </p>:null}
          </div>
        </div>
      )}

      {loading&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:300,gap:14}}>
          <Loader2 size={24} style={{color:"#34d399",animation:"spin 1s linear infinite"}}/>
          <p style={{color:"#64748b",margin:0}}>Fetching live prices...</p>
        </div>
      )}

      {!loading&&!errMsg&&(
        <>
          {/* Summary cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
            {[
              {label:"Total Invested",val:fmt(summary.totalInvested),color:"#60a5fa",sub:`${summary.count||0} holdings`},
              {label:"Current Value",val:fmt(summary.totalValue),color:summary.totalGain>=0?"#34d399":"#f87171",sub:"Live prices"},
              {label:"Total P&L",val:(summary.totalGain>=0?"+":"")+fmt(summary.totalGain),color:summary.totalGain>=0?"#34d399":"#f87171",sub:`${summary.totalGain>=0?"+":""}${fmtN(summary.totalGainPct)}%`},
              {label:"Today Change",val:fmt(holdings.reduce((s,h)=>s+(h.live?.change??0)*h.quantity,0)),color:"#fbbf24",sub:"Across portfolio"},
            ].map(c=>(
              <div key={c.label} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"14px 16px"}}>
                <p style={{fontSize:".7rem",color:"#64748b",margin:0,textTransform:"uppercase",letterSpacing:".04em"}}>{c.label}</p>
                <p style={{fontSize:"1.1rem",fontWeight:800,color:c.color,margin:"6px 0 2px"}}>{c.val}</p>
                <p style={{fontSize:".68rem",color:"#475569",margin:0}}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:4,padding:4,borderRadius:16,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",marginBottom:18}}>
            {[{key:"holdings",label:"Holdings",icon:BarChart2},{key:"analysis",label:"Analysis",icon:PieChart}].map(t=>{
              const Icon=t.icon; const a=tab===t.key;
              return <button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,padding:"8px",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:".8rem",fontWeight:a?700:500,background:a?"rgba(52,211,153,.15)":"transparent",color:a?"#34d399":"#64748b",border:a?"1px solid rgba(52,211,153,.3)":"1px solid transparent",cursor:"pointer"}}><Icon size={13}/>{t.label}</button>;
            })}
          </div>

          {tab==="holdings"&&(
            holdings.length===0?(
              <div style={{textAlign:"center",padding:"4rem 1rem",background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",borderRadius:18}}>
                <TrendingUp size={40} style={{color:"#475569",margin:"0 auto 12px",display:"block"}}/>
                <p style={{color:"#64748b",margin:0,fontSize:".9rem",fontWeight:600}}>No holdings yet</p>
                <p style={{color:"#475569",fontSize:".78rem",margin:"6px 0 16px"}}>
                  Browse from {Object.values(NSE_STOCKS).flat().length} NSE stocks or {Object.values(MF_LIST).flat().length} mutual funds.
                </p>
                <button onClick={()=>setShowAdd(true)} style={{padding:"9px 22px",borderRadius:9999,background:"linear-gradient(135deg,rgba(52,211,153,.18),rgba(16,185,129,.1))",border:"1px solid rgba(52,211,153,.4)",color:"#34d399",fontWeight:700,fontSize:".85rem",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7}}>
                  <Plus size={14}/> Add First Holding
                </button>
              </div>
            ):holdings.map(h=><HoldingCard key={h.id} h={h} onDelete={handleDelete}/>)
          )}

          {tab==="analysis"&&holdings.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:14}}>
                <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"1rem",display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <p style={{fontSize:".78rem",fontWeight:700,color:"#f1f5f9",margin:"0 0 12px"}}>Allocation</p>
                  <ResponsiveContainer width={180} height={180}>
                    <RPie><Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>{pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#0f172a",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,fontSize:11}}/></RPie>
                  </ResponsiveContainer>
                </div>
                <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"1rem"}}>
                  <p style={{fontSize:".78rem",fontWeight:700,color:"#f1f5f9",margin:"0 0 12px"}}>By Allocation</p>
                  {pieData.map((p,i)=>{const pct=summary.totalValue?Math.round(p.value/summary.totalValue*100):0;return(
                    <div key={i} style={{marginBottom:9}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:".75rem",marginBottom:3}}><span style={{color:"#94a3b8"}}>{p.name}</span><span style={{color:p.color,fontWeight:700}}>{pct}%</span></div>
                      <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.07)"}}><div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:p.color}}/></div>
                    </div>
                  );})}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[{label:"🏆 Top Gainers",list:winners},{label:"📉 Top Losers",list:losers}].map(s=>(
                  <div key={s.label} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"1rem"}}>
                    <p style={{fontSize:".78rem",fontWeight:700,color:"#f1f5f9",margin:"0 0 10px"}}>{s.label}</p>
                    {s.list.length===0?<p style={{color:"#475569",fontSize:".75rem"}}>None</p>:s.list.map(h=>(
                      <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div><p style={{fontWeight:700,fontSize:".8rem",color:"#e2e8f0",margin:0}}>{h.symbol}</p><p style={{fontSize:".65rem",color:"#64748b",margin:0}}>{fmt(h.currentValue)}</p></div>
                        <GainBadge val={h.gain} pct={h.gainPct} size="sm"/>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"1rem"}}>
                <p style={{fontSize:".78rem",fontWeight:700,color:"#f1f5f9",margin:"0 0 12px"}}>Asset Class Breakdown</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {["STOCK","MUTUAL_FUND","ETF"].map(type=>{
                    const cfg=TYPE_CFG[type];const group=holdings.filter(h=>h.type===type);
                    const val=group.reduce((s,h)=>s+h.currentValue,0);const pct=summary.totalValue?Math.round(val/summary.totalValue*100):0;
                    return <div key={type} style={{background:cfg.bg,border:`1px solid ${cfg.color}30`,borderRadius:12,padding:"12px",textAlign:"center"}}><p style={{fontSize:".65rem",color:cfg.color,fontWeight:700,margin:0,textTransform:"uppercase"}}>{cfg.label}</p><p style={{fontSize:".95rem",fontWeight:800,color:cfg.color,margin:"5px 0 2px"}}>{pct}%</p><p style={{fontSize:".65rem",color:"#64748b",margin:0}}>{group.length} holdings</p></div>;
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <SentimentWidget />

      {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onAdd={handleAdd}/>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}