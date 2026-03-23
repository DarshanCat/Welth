import React from "react";
export default function Loading() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:16 }}>
      <div style={{ position:"relative" }}>
        <div style={{ width:60, height:60, borderRadius:"50%", border:"2px solid rgba(52,211,153,.1)", borderTop:"2px solid #34d399", animation:"spin .8s linear infinite" }}/>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>🔍</div>
      </div>
      <p style={{ color:"#64748b", fontSize:".82rem", fontWeight:600, margin:0 }}>Analysing your financial patterns…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}