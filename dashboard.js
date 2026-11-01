const T=window.StudiaTools;
const form=document.getElementById("dashboardForm"),notice=document.getElementById("dashboardNotice"),wrap=document.getElementById("dashboardTableWrap"),rows=document.getElementById("dashboardRows"),empty=document.getElementById("dashboardEmpty");
const labels={planned:"დაგეგმილი",progress:"მიმდინარე",done:"შესრულებული"};
async function loadRows(){try{const d=await T.request("/api/dashboard");draw(d.rows||[])}catch(e){T.notice(notice,e.message,true)}}
function draw(items){
 rows.replaceChildren();wrap.classList.toggle("hidden",!items.length);empty.classList.toggle("hidden",!!items.length);
 const total=items.length,done=items.filter(x=>x.status==="done").length,progress=items.filter(x=>x.status==="progress").length,planned=items.filter(x=>x.status==="planned").length,pct=total?Math.round(done/total*100):0;
 document.getElementById("totalCount").textContent=total;document.getElementById("progressCount").textContent=progress;document.getElementById("doneCount").textContent=done;
 document.getElementById("progressFill").style.width=pct+"%";document.getElementById("progressLabel").textContent=pct+"% შესრულებულია";document.getElementById("remainingLabel").textContent=(total-done)+" დარჩენილი";
 items.forEach(item=>{const tr=document.createElement("tr"),subject=document.createElement("td"),goal=document.createElement("td"),status=document.createElement("td"),action=document.createElement("td"),pill=document.createElement("span"),del=document.createElement("button");
 subject.textContent=item.subject;goal.textContent=item.goal;pill.className="status-pill";pill.textContent=labels[item.status]||item.status;status.append(pill);del.className="row-delete";del.type="button";del.textContent="წაშლა";del.onclick=async()=>{if(!confirm("წავშალოთ ეს ჩანაწერი?"))return;try{await T.request("/api/dashboard/delete",{method:"POST",body:{id:item.id}});await loadRows()}catch(e){T.notice(notice,e.message,true)}};action.append(del);tr.append(subject,goal,status,action);rows.append(tr)});
}
form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form);try{await T.request("/api/dashboard",{method:"POST",body:{subject:f.get("subject").trim(),goal:f.get("goal").trim(),status:f.get("status")}});form.reset();T.notice(notice,"ჩანაწერი დაემატა.");await loadRows()}catch(err){T.notice(notice,err.message,true)}};
loadRows();
