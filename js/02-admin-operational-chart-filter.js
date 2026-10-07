// Externalized from Untitled-1.html; original script order preserved.
(function(){
    if(window.__LERESSAE_OPERATIONAL_CHART_V2__) return;
    window.__LERESSAE_OPERATIONAL_CHART_V2__ = true;
    window.__ADMIN_CHART_PERIOD__ = window.__ADMIN_CHART_PERIOD__ || '7d';
    window.__ADMIN_CHART_CUSTOM_FROM__ = window.__ADMIN_CHART_CUSTOM_FROM__ || '';
    window.__ADMIN_CHART_CUSTOM_TO__ = window.__ADMIN_CHART_CUSTOM_TO__ || '';


    function rowDate(row){
        const raw = row?.created_at || row?.tanggal_masuk || row?.date || row?.timestamp || row?.tanggal || '';
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    }


    function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }


    function endOfDay(d){ const x=new Date(d); x.setHours(23,59,59,999); return x; }


    function getRange(){
        const p=window.__ADMIN_CHART_PERIOD__ || '7d';
        const now=new Date();
        if(p==='1d') return {start:startOfDay(now), end:endOfDay(now)};
        if(p==='30d') return {start:new Date(now.getFullYear(),now.getMonth(),1), end:endOfDay(new Date(now.getFullYear(),now.getMonth()+1,0))};
        if(p==='custom'){
            const from=window.__ADMIN_CHART_CUSTOM_FROM__;
            const to=window.__ADMIN_CHART_CUSTOM_TO__;
            if(from && to){
                const start=new Date(from+'T00:00:00');
                const end=new Date(to+'T23:59:59.999');
                if(start<=end) return {start,end};
            }
        }
        const today=startOfDay(now);
        const day=today.getDay();
        const mondayOffset=day===0 ? -6 : 1-day;
        const start=new Date(today); start.setDate(start.getDate()+mondayOffset);
        const end=new Date(start); end.setDate(end.getDate()+6);
        return {start,end:endOfDay(end)};
    }
    window.filterAdminOperationalRecords=function(records){
        const rows=Array.isArray(records)?records:[];
        const range=getRange();
        return rows.filter(row=>{ const d=rowDate(row); return d && d>=range.start && d<=range.end; });
    };
    window.buildAdminOperationalLineData=function(records){
        const rows=Array.isArray(records)?records:[];
        const p=window.__ADMIN_CHART_PERIOD__ || '7d';
        const range=getRange();
        const result=[];
        if(p==='1d'){
            for(let h=0;h<24;h++){
                const count=rows.filter(row=>{const d=rowDate(row); return d && d>=range.start && d<=range.end && d.getHours()===h;}).length;
                result.push({label:String(h).padStart(2,'0'),fullLabel:String(h).padStart(2,'0')+':00',value:count});
            }
            return result;
        }
        const days=Math.max(1,Math.floor((range.end-range.start)/86400000)+1);
        for(let i=0;i<days;i++){
            const d=new Date(range.start); d.setDate(d.getDate()+i);
            const next=new Date(d); next.setDate(next.getDate()+1);
            const count=rows.filter(row=>{const rd=rowDate(row); return rd && rd>=d && rd<next;}).length;
            const label=p==='7d' ? d.toLocaleDateString('id-ID',{weekday:'short'}) : d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
            result.push({label,fullLabel:d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}),value:count});
        }
        return result;
    };
    window.buildAdminOperationalStatusData=function(records){
        const rows=Array.isArray(records)?records:[];
        const data=[
            {label:'Sedang Diproses',value:rows.filter(r=>typeof getServiceDisplayStatus==='function' ? getServiceDisplayStatus(r.status)==='Sedang Diproses' : String(r.status||'').toLowerCase()!=='selesai').length},
            {label:'Selesai',value:rows.filter(r=>typeof getServiceDisplayStatus==='function' ? getServiceDisplayStatus(r.status)==='Selesai' : String(r.status||'').toLowerCase()==='selesai').length}
        ];
        return data;
    };
    window.buildAdminOperationalHistogramData=function(lineData){
        const rows=Array.isArray(lineData)?lineData:[];
        const values=rows.map(x=>Math.max(0,Number(x.value||0)));
        if(!values.length) return [];
        const max=Math.max(...values);
        if(max===0) return [{label:'0',value:values.length}];
        const binCount=Math.min(6,Math.max(3,Math.ceil(Math.sqrt(values.length))));
        const width=Math.max(1,Math.ceil(max/binCount));
        const bins=[];
        for(let start=0;start<=max;start+=width){
            const end=Math.min(max,start+width-1);
            const count=values.filter(v=>v>=start && v<=end).length;
            bins.push({label:start===end?String(start):`${start}-${end}`,value:count});
            if(end===max) break;
        }
        return bins;
    };
    window.buildAdminOperationalItemData=function(records){
        const rows=Array.isArray(records)?records:[];
        const counts=new Map();
        rows.forEach(row=>{
            const name=String(row.item_name||row.nama_barang||row.barang||row.jenis_barang||row.type||'Tidak diketahui').trim() || 'Tidak diketahui';
            counts.set(name,(counts.get(name)||0)+1);
        });
        return Array.from(counts.entries()).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value || a.label.localeCompare(b.label,'id')).slice(0,5);
    };
    window.renderAdminOperationalHistogramChart=function(data){
        const rows=Array.isArray(data)?data:[];
        if(!rows.length || rows.every(x=>Number(x.value||0)===0)) return '<div class="chart-empty">Belum ada data volume servis pada periode yang dipilih.</div>';
        const max=Math.max(1,...rows.map(x=>Number(x.value||0)));
        const bars=rows.map(x=>{
            const value=Number(x.value||0);
            const height=Math.max(4,(value/max)*100);
            return `<div class="histogram-bar" style="--bar-height:${height.toFixed(2)}%" data-count="${value}" title="${escapeHtml(x.label)}: ${value} hari/periode"></div>`;
        }).join('');
        const labels=rows.map(x=>`<span>${escapeHtml(x.label)}</span>`).join('');
        return `<div class="histogram-wrap"><span class="histogram-note">Frekuensi periode</span><div class="histogram-axis">${bars}</div><div class="histogram-labels">${labels}</div></div>`;
    };
    window.renderAdminOperationalItemChart=function(data){
        const rows=Array.isArray(data)?data:[];
        if(!rows.length) return '<div class="chart-empty">Belum ada data jenis barang pada periode yang dipilih.</div>';
        const max=Math.max(1,...rows.map(x=>Number(x.value||0)));
        const html=rows.map(x=>{
            const value=Number(x.value||0);
            const width=Math.max(2,(value/max)*100);
            return `<div class="item-row"><span class="item-label" title="${escapeHtml(x.label)}">${escapeHtml(x.label)}</span><div class="item-track"><div class="item-fill" style="width:${width.toFixed(2)}%"></div></div><span class="item-value">${value}</span></div>`;
        }).join('');
        return `<div class="item-chart">${html}</div>`;
    };
    window.renderAdminOperationalLineChart=function(data){
        const rows=Array.isArray(data)?data:[];
        if(!rows.length || rows.every(x=>Number(x.value||0)===0)) return '<div class="chart-empty">Belum ada data servis pada periode yang dipilih.</div>';
        const W=760,H=260,pad={l:38,r:18,t:18,b:38};
        const innerW=W-pad.l-pad.r, innerH=H-pad.t-pad.b;
        const max=Math.max(1,...rows.map(x=>Number(x.value||0)));
        const points=rows.map((x,i)=>{const px=pad.l+(rows.length===1?innerW/2:(i/(rows.length-1))*innerW); const py=pad.t+innerH-(Number(x.value||0)/max)*innerH; return {x:px,y:py,value:Number(x.value||0),label:x.label,fullLabel:x.fullLabel};});
        const line=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
        const area=line+' L '+points[points.length-1].x.toFixed(2)+' '+(pad.t+innerH)+' L '+points[0].x.toFixed(2)+' '+(pad.t+innerH)+' Z';
        const grid=[0,.25,.5,.75,1].map(v=>{const y=pad.t+innerH-v*innerH; const value=Math.round(max*v); return `<line class="line-chart-grid" x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}"/><text class="line-chart-axis" x="${pad.l-8}" y="${y+4}" text-anchor="end">${value}</text>`;}).join('');
        const step=Math.max(1,Math.ceil(points.length/7));
        const labels=points.map((p,i)=> (i%step===0 || i===points.length-1) ? `<text class="line-chart-axis" x="${p.x}" y="${H-12}" text-anchor="middle">${escapeHtml(p.label)}</text>` : '').join('');
        const dots=points.map(p=>`<circle class="line-chart-point" cx="${p.x}" cy="${p.y}" r="4"><title>${escapeHtml(p.fullLabel||p.label)}: ${p.value} servis</title></circle>`).join('');
        return `<div class="line-chart-wrap"><svg class="line-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik tren jumlah servis">${grid}<path class="line-chart-area" d="${area}"/><path class="line-chart-line" d="${line}"/>${dots}${labels}</svg></div>`;
    };
    window.renderAdminOperationalPieChart=function(data){
        const rows=Array.isArray(data)?data:[];
        const total=rows.reduce((s,x)=>s+Number(x.value||0),0);
        if(!total) return '<div class="chart-empty">Belum ada data status servis pada periode yang dipilih.</div>';
        const colors=['#0284c7','#16a34a','#f59e0b','#7c3aed','#ef4444','#0f766e'];
        let cursor=0;
        const segments=rows.filter(x=>Number(x.value||0)>0).map((x,i)=>{const start=cursor; cursor+=(Number(x.value||0)/total)*100; return `${colors[i%colors.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;}).join(', ');
        const legend=rows.map((x,i)=>{const value=Number(x.value||0); const pct=((value/total)*100).toFixed(1); return `<div class="pie-legend-item"><span class="pie-dot" style="background:${colors[i%colors.length]}"></span><span>${escapeHtml(x.label)}</span><strong>${value} (${pct}%)</strong></div>`;}).join('');
        return `<div class="pie-layout"><div class="pie-chart" style="background:conic-gradient(${segments})"><div class="pie-center"><strong>${total}</strong><span>Total Servis</span></div></div><div class="pie-legend">${legend}</div></div>`;
    };
    window.setAdminOperationalPeriod=function(period){
        window.__ADMIN_CHART_PERIOD__=['1d','7d','30d','custom'].includes(period)?period:'7d';
        if(window.__ADMIN_CHART_PERIOD__!=='custom'){
            window.__ADMIN_CHART_CUSTOM_FROM__='';
            window.__ADMIN_CHART_CUSTOM_TO__='';
        }
        if(typeof window.showAdminPage==='function') window.showAdminPage('dashboard',{fromFilter:true});
        else if(typeof window.renderAdminDashboard==='function') window.renderAdminDashboard();
    };
    document.addEventListener('change',function(e){
        const select=e.target.closest('#adminChartPeriodSelect');
        if(select){ window.setAdminOperationalPeriod(select.value); return; }
        if(e.target && e.target.id==='adminChartDateFrom'){
            window.__ADMIN_CHART_CUSTOM_FROM__=e.target.value||'';
            window.__ADMIN_CHART_PERIOD__='custom';
            if(typeof window.showAdminPage==='function') window.showAdminPage('dashboard',{fromFilter:true});
        }
        if(e.target && e.target.id==='adminChartDateTo'){
            window.__ADMIN_CHART_CUSTOM_TO__=e.target.value||'';
            window.__ADMIN_CHART_PERIOD__='custom';
            if(typeof window.showAdminPage==='function') window.showAdminPage('dashboard',{fromFilter:true});
        }
    });
    setTimeout(function(){
        try {
            // Jangan pernah memaksa sesi aktif kembali ke Dashboard saat browser di-refresh.
            if(typeof window.isAdminLoggedIn==='function' && window.isAdminLoggedIn() && typeof window.showAdminPage==='function') {
                const allowedAdminPages=['dashboard','services','running','completed','customers','technicians','stock','locations','media','news','reports','settings'];
                const savedAdminPage=typeof window.getSavedRolePage==='function' ? window.getSavedRolePage('admin') : '';
                const targetAdminPage=allowedAdminPages.includes(savedAdminPage) ? savedAdminPage : 'dashboard';
                window.showAdminPage(targetAdminPage,{fromFilter:true});
            }
        } catch(error) { console.warn('Render grafik operasional awal gagal:', error); }
    }, 0);
})();
