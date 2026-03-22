import{getAuth as We,sendPasswordResetEmail as Ue,signOut as Ge,onAuthStateChanged as Ve,signInWithEmailAndPassword as Ye,createUserWithEmailAndPassword as Ke,updateProfile as Qe,GoogleAuthProvider as Xe,signInWithPopup as Ze}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import{initializeApp as Je}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import{getFirestore as et,enableIndexedDbPersistence as tt,setDoc as pe,doc as E,serverTimestamp as k,getDoc as me,updateDoc as P,query as J,collection as B,where as $,getDocs as ee,deleteDoc as U,addDoc as te,Timestamp as F}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";import{isSupported as at,getMessaging as st,getToken as ve,deleteToken as it,onMessage as nt}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))t(a);new MutationObserver(a=>{for(const n of a)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&t(o)}).observe(document,{childList:!0,subtree:!0});function i(a){const n={};return a.integrity&&(n.integrity=a.integrity),a.referrerPolicy&&(n.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?n.credentials="include":a.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function t(a){if(a.ep)return;a.ep=!0;const n=i(a);fetch(a.href,n)}})();const ot="modulepreload",dt=function(e){return"/"+e},oe={},A=function(s,i,t){let a=Promise.resolve();if(i&&i.length>0){let r=function(l){return Promise.all(l.map(u=>Promise.resolve(u).then(p=>({status:"fulfilled",value:p}),p=>({status:"rejected",reason:p}))))};document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),d=o?.nonce||o?.getAttribute("nonce");a=r(i.map(l=>{if(l=dt(l),l in oe)return;oe[l]=!0;const u=l.endsWith(".css"),p=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${p}`))return;const c=document.createElement("link");if(c.rel=u?"stylesheet":ot,u||(c.as="script"),c.crossOrigin="",c.href=l,d&&c.setAttribute("nonce",d),document.head.appendChild(c),u)return new Promise((v,f)=>{c.addEventListener("load",v),c.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${l}`)))})}))}function n(o){const d=new Event("vite:preloadError",{cancelable:!0});if(d.payload=o,window.dispatchEvent(d),!d.defaultPrevented)throw o}return a.then(o=>{for(const d of o||[])d.status==="rejected"&&n(d.reason);return s().catch(n)})},rt={apiKey:"AIzaSyCwKJw72RXUzvvBLdxI3WlfCoWvFPmvv3Y",authDomain:"student-planner-95ed4.firebaseapp.com",projectId:"student-planner-95ed4",storageBucket:"student-planner-95ed4.firebasestorage.app",messagingSenderId:"224841353755",appId:"1:224841353755:web:0defe4eccd9a222a9646be",measurementId:"G-GK068Y52DV"},fe="BMzrmWa2Z1MhacOyQOh--xfHnUNYjOmVPHZqd9ajR-e9PsOz2j6QkC7FX-XHYg4uOKZ7I-AGY2-IdRoc9-sF1pM",ae=Je(rt),N=We(ae),h=et(ae);tt(h).catch(e=>{e.code==="failed-precondition"?console.warn("Firestore persistence: multiple tabs open."):e.code==="unimplemented"&&console.warn("Firestore persistence: not supported in this browser.")});let j=null;at().then(e=>{e&&(j=st(ae))});async function lt(){const e=new Xe,i=(await Ze(N,e)).user,t=E(h,"users",i.uid);return(await me(t)).exists()||await pe(t,{uid:i.uid,displayName:i.displayName||"Student",email:i.email,photoURL:i.photoURL||null,theme:"dark",weekStartDay:"monday",notificationEnabled:!1,reminderSettings:{defaultMinutesBefore:30},studyGoals:"",subjectsGrouped:!0,createdAt:k(),updatedAt:k()}),i}async function ct(e,s,i){const a=(await Ke(N,e,s)).user;return await Qe(a,{displayName:i}),await pe(E(h,"users",a.uid),{uid:a.uid,displayName:i,email:a.email,photoURL:a.photoURL||null,theme:"dark",weekStartDay:"monday",notificationEnabled:!1,reminderSettings:{defaultMinutesBefore:30},studyGoals:"",subjectsGrouped:!0,createdAt:k(),updatedAt:k()}),a}async function ut(e,s){return(await Ye(N,e,s)).user}async function pt(){await Ge(N)}async function ge(e){await Ue(N,e)}function mt(e){return Ve(N,e)}async function ye(e){const s=await me(E(h,"users",e));return s.exists()?s.data():null}async function q(e,s){await P(E(h,"users",e),{...s,updatedAt:k()})}async function be(e,{name:s,color:i,order:t=0}){return te(B(h,"subjects"),{userId:e,name:s,color:i||"#6c63ff",order:t,createdAt:k(),updatedAt:k()})}async function _(e){const s=J(B(h,"subjects"),$("userId","==",e));return(await ee(s)).docs.map(a=>({id:a.id,...a.data()})).sort((a,n)=>{if(a.order!==n.order)return(a.order||0)-(n.order||0);const o=a.createdAt?.toMillis?a.createdAt.toMillis():Date.now(),d=n.createdAt?.toMillis?n.createdAt.toMillis():Date.now();return o-d})}async function he(e,s){await P(E(h,"subjects",e),{...s,updatedAt:k()})}async function we(e){await U(E(h,"subjects",e))}async function ke(e,{subjectId:s,name:i,order:t=0}){return te(B(h,"topics"),{userId:e,subjectId:s,name:i,order:t,createdAt:k(),updatedAt:k()})}async function G(e,s=null){const i=[$("userId","==",e)];s&&i.push($("subjectId","==",s));const t=J(B(h,"topics"),...i);return(await ee(t)).docs.map(o=>({id:o.id,...o.data()})).sort((o,d)=>{if(o.order!==d.order)return(o.order||0)-(d.order||0);const r=o.createdAt?.toMillis?o.createdAt.toMillis():Date.now(),l=d.createdAt?.toMillis?d.createdAt.toMillis():Date.now();return r-l})}async function xe(e,s){await P(E(h,"topics",e),{...s,updatedAt:k()})}async function De(e){await U(E(h,"topics",e))}async function Ee(e,s){const{subjectId:i=null,topicId:t=null,title:a,description:n="",priority:o="medium",dueDate:d=null,reminderTime:r=null}=s;return te(B(h,"tasks"),{userId:e,subjectId:i,topicId:t,title:a,description:n,priority:o,dueDate:d?F.fromDate(new Date(d)):null,reminderTime:r?F.fromDate(new Date(r)):null,isCompleted:!1,completedAt:null,reminderSent:!1,snoozedUntil:null,createdAt:k(),updatedAt:k()})}async function R(e,s={}){const i=[$("userId","==",e)];s.subjectId&&i.push($("subjectId","==",s.subjectId)),s.topicId&&i.push($("topicId","==",s.topicId)),s.isCompleted!==void 0&&i.push($("isCompleted","==",s.isCompleted)),s.priority&&i.push($("priority","==",s.priority));const t=J(B(h,"tasks"),...i);return(await ee(t)).docs.map(o=>({id:o.id,...o.data()})).sort((o,d)=>{const r=o.createdAt?.toMillis?o.createdAt.toMillis():Date.now();return(d.createdAt?.toMillis?d.createdAt.toMillis():Date.now())-r})}async function Se(e,s){const i={...s,updatedAt:k()};s.dueDate&&(i.dueDate=F.fromDate(new Date(s.dueDate))),s.reminderTime&&(i.reminderTime=F.fromDate(new Date(s.reminderTime))),await P(E(h,"tasks",e),i)}async function Le(e){await P(E(h,"tasks",e),{isCompleted:!0,completedAt:k(),updatedAt:k()})}async function Te(e){await P(E(h,"tasks",e),{isCompleted:!1,completedAt:null,reminderSent:!1,updatedAt:k()})}async function vt(e,s=15){const i=new Date(Date.now()+s*60*1e3);await P(E(h,"tasks",e),{snoozedUntil:F.fromDate(i),reminderSent:!1,updatedAt:k()})}async function $e(e){await U(E(h,"tasks",e))}async function Ce(e,s){const{setDoc:i}=await A(async()=>{const{setDoc:t}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");return{setDoc:t}},[]);await i(E(h,"users",e,"fcmTokens",s),{token:s,createdAt:k(),platform:navigator.platform||"unknown"})}async function je(e,s){await U(E(h,"users",e,"fcmTokens",s))}const Q=Object.freeze(Object.defineProperty({__proto__:null,completeTask:Le,createSubject:be,createTask:Ee,createTopic:ke,deleteSubject:we,deleteTask:$e,deleteTopic:De,getSubjects:_,getTasks:R,getTopics:G,getUserProfile:ye,removeFcmToken:je,reopenTask:Te,saveFcmToken:Ce,snoozeTask:vt,updateSubject:he,updateTask:Se,updateTopic:xe,updateUserProfile:q},Symbol.toStringTag,{value:"Module"}));function ft(e="monday"){const s=new Date,a=(s.getDay()-(e==="sunday"?0:1)+7)%7,n=new Date(s);n.setDate(s.getDate()-a),n.setHours(0,0,0,0);const o=new Date(n);return o.setDate(n.getDate()+6),o.setHours(23,59,59,999),{weekStart:n,weekEnd:o}}function de(e,s,i){if(!e)return!1;const t=e.toDate?e.toDate():new Date(e);return t>=s&&t<=i}async function Ie(e,s="monday",i=[]){const[t]=await Promise.all([R(e)]),{weekStart:a,weekEnd:n}=ft(s),o=t.filter(y=>de(y.dueDate,a,n)||de(y.completedAt,a,n)),d=o.filter(y=>y.isCompleted),r=o.length,l=r>0?Math.round(d.length/r*100):0,u=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];s==="sunday"&&u.unshift(u.pop());const p=new Array(7).fill(0),c=new Array(7).fill(0);o.forEach(y=>{const L=y.dueDate?y.dueDate.toDate?y.dueDate.toDate():new Date(y.dueDate):null;if(!L)return;const I=Math.floor((L-a)/(1e3*60*60*24));I>=0&&I<7&&(c[I]++,y.isCompleted&&p[I]++)});const v=i.map(y=>{const L=o.filter(Y=>Y.subjectId===y.id),I=L.filter(Y=>Y.isCompleted).length;return{id:y.id,name:y.name,color:y.color,total:L.length,completed:I,rate:L.length>0?Math.round(I/L.length*100):0}}),f=new Date,m=t.filter(y=>y.isCompleted||!y.dueDate?!1:(y.dueDate.toDate?y.dueDate.toDate():new Date(y.dueDate))<f),w=gt(t),S=new Date;S.setHours(0,0,0,0);const V=new Date(S);V.setDate(S.getDate()+1);const ze=t.filter(y=>{if(y.isCompleted||!y.dueDate)return!1;const L=y.dueDate.toDate?y.dueDate.toDate():new Date(y.dueDate);return L>=S&&L<V});return{weekStart:a,weekEnd:n,total:r,completed:d.length,completionRate:l,pending:r-d.length,overdue:m.length,overdueList:m,dailyLabels:u,dailyCompleted:p,dailyTotal:c,subjectBreakdown:v,streak:w,todayTasks:ze,allTasks:t}}function gt(e){const s=e.filter(n=>n.isCompleted&&n.completedAt).map(n=>{const o=n.completedAt.toDate?n.completedAt.toDate():new Date(n.completedAt);return`${o.getFullYear()}-${o.getMonth()}-${o.getDate()}`}),i=[...new Set(s)].sort().reverse();if(i.length===0)return 0;let t=0,a=new Date;a.setHours(0,0,0,0);for(let n=0;n<365;n++){const o=`${a.getFullYear()}-${a.getMonth()}-${a.getDate()}`;if(i.includes(o))t++,a.setDate(a.getDate()-1);else break}return t}function yt(e){return{labels:e.dailyLabels,datasets:[{label:"Completed",data:e.dailyCompleted,backgroundColor:"rgba(108, 99, 255, 0.8)",borderRadius:6,borderSkipped:!1},{label:"Total",data:e.dailyTotal,backgroundColor:"rgba(108, 99, 255, 0.2)",borderRadius:6,borderSkipped:!1}]}}function bt(e){const s=e.subjectBreakdown.map(a=>a.name),i=e.subjectBreakdown.map(a=>a.completed||.001),t=e.subjectBreakdown.map(a=>a.color);return{labels:s,datasets:[{data:i,backgroundColor:t,borderColor:"rgba(15, 15, 26, 0.5)",borderWidth:2,hoverOffset:8}]}}function Ae(e){return{labels:e.dailyLabels,datasets:[{label:"Tasks Completed",data:e.dailyCompleted,borderColor:"#6c63ff",backgroundColor:"rgba(108, 99, 255, 0.15)",tension:.4,fill:!0,pointBackgroundColor:"#6c63ff",pointRadius:5,pointHoverRadius:8}]}}let O=null,re=null;function b(e,s="info",i=3e3){O&&(O.remove(),clearTimeout(re));const t={success:"✓",error:"✕",info:"ℹ",warning:"⚠"},a=document.createElement("div");a.className=`snackbar snackbar-${s}`,a.innerHTML=`
    <span class="snackbar-icon">${t[s]||t.info}</span>
    <span class="snackbar-message">${e}</span>
    <button class="snackbar-dismiss" aria-label="Dismiss">✕</button>
  `,a.querySelector(".snackbar-dismiss").addEventListener("click",()=>{a.classList.add("snackbar-exit"),setTimeout(()=>a.remove(),250),O=null}),document.body.appendChild(a),window.lucide&&window.lucide.createIcons(),O=a,requestAnimationFrame(()=>a.classList.add("snackbar-enter")),re=setTimeout(()=>{a.isConnected&&(a.classList.add("snackbar-exit"),setTimeout(()=>a.remove(),250),O=null)},i)}function se(e,s,i="Confirm",t=!1){return new Promise(a=>{const n=document.createElement("div");n.className="modal-backdrop centered",n.innerHTML=`
      <div class="modal-box confirm-dialog" style="max-width:360px">
        <div class="confirm-dialog-icon" style="color:${t?"var(--error)":"var(--accent)"}">
          <i data-lucide="${t?"alert-triangle":"help-circle"}" style="width:48px;height:48px"></i>
        </div>
        <h3 class="confirm-dialog-title">${e}</h3>
        <p class="confirm-dialog-message">${s}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn ${t?"btn-danger":"btn-primary"}" id="confirm-ok">${i}</button>
        </div>
      </div>
    `;const o=d=>{n.classList.add("modal-exit"),setTimeout(()=>n.remove(),200),a(d)};n.querySelector("#confirm-cancel").addEventListener("click",()=>o(!1)),n.querySelector("#confirm-ok").addEventListener("click",()=>o(!0)),n.addEventListener("click",d=>{d.target===n&&o(!1)}),document.body.appendChild(n),window.lucide&&window.lucide.createIcons()})}let C=null;async function ht(e,s,i){C&&(C.destroy(),C=null),e.innerHTML=`
    <div class="page-header">
      <div>
        <div class="text-muted text-sm">${kt()}</div>
        <h1 class="page-title" style="font-size:var(--font-size-2xl)">${i?.displayName||"Student"}</h1>
      </div>
    </div>
    <div id="dash-loading" class="animate-pulse text-muted text-sm mb-md">Loading your day…</div>
    <div id="dash-content" class="hidden">
      <!-- Quick Add Task -->
      <div class="quick-add-container mb-md">
        <div class="quick-add-input-wrapper">
          <input type="text" id="quick-add-input" class="form-input" placeholder="Quick add task (Press Enter)..." style="border-radius:24px;padding-right:48px;" />
          <button id="quick-add-btn" class="quick-add-submit" aria-label="Add task"><i data-lucide="arrow-right" style="width:20px;height:20px"></i></button>
        </div>
      </div>

      <div class="stats-row mb-md" id="dash-stats"></div>

      <!-- Weekly chart -->
      <div class="chart-container mb-md stagger-item" style="animation-delay:160ms">
        <div class="chart-title">This Week's Progress</div>
        <canvas id="dash-chart" height="140"></canvas>
      </div>

      <!-- Today's tasks -->
      <div class="section-header mb-sm">
        <div class="section-title">Today's Tasks</div>
        <button class="btn btn-sm btn-ghost ripple" id="btn-see-all-tasks">See all</button>
      </div>
      <div id="today-tasks-list"></div>

      <!-- Subject summary -->
      <div id="dash-subjects-section"></div>
    </div>
  `,document.getElementById("btn-see-all-tasks")?.addEventListener("click",()=>T("tasks"));const t=document.getElementById("quick-add-input"),a=document.getElementById("quick-add-btn"),n=async()=>{const r=t.value.trim();if(!r)return;t.disabled=!0,a.disabled=!0;const l=new Date;l.setHours(12,0,0,0);try{const{createTask:u}=await A(async()=>{const{createTask:p}=await Promise.resolve().then(()=>Q);return{createTask:p}},void 0);await u(s,{title:r,priority:"medium",dueDate:l.toISOString()}),b("Task added to Today","success"),t.value="",t.disabled=!1,a.disabled=!1,t.focus(),await X(s,i)}catch{b("Failed to add task","error"),t.disabled=!1,a.disabled=!1,t.focus()}};t?.addEventListener("keypress",r=>{r.key==="Enter"&&n()}),a?.addEventListener("click",n),await X(s,i,!0);const o=document.getElementById("dash-loading");o&&o.remove();const d=document.getElementById("dash-content");d&&d.classList.remove("hidden")}async function X(e,s,i=!1){let t=[],a=null;try{t=await _(e),a=await Ie(e,s?.weekStartDay||"monday",t)}catch(u){b("Failed to load dashboard data","error"),console.error("Dashboard load error:",u);return}const n=document.getElementById("dash-stats");n&&(n.innerHTML=`
      <div class="stat-card ${i?"stagger-item":""}" style="animation-delay:0ms">
        <div class="stat-number">${a.completed}</div>
        <div class="stat-label">Done this week</div>
      </div>
      <div class="stat-card ${i?"stagger-item":""}" style="animation-delay:40ms">
        <div class="stat-number">${a.completionRate}%</div>
        <div class="stat-label">Completion rate</div>
      </div>
      <div class="stat-card ${i?"stagger-item":""}" style="animation-delay:80ms">
        <div class="stat-number">${a.streak}</div>
        <div class="stat-label">Day streak <i data-lucide="flame" style="width:14px;height:14px;display:inline-block;vertical-align:middle;color:#ff9f43"></i></div>
      </div>
      <div class="stat-card ${i?"stagger-item":""}" style="animation-delay:120ms">
        <div class="stat-number" style="${a.overdue>0?"color:var(--error)":""}">${a.overdue}</div>
        <div class="stat-label">Overdue</div>
      </div>
    `);const o=document.getElementById("dash-chart"),d=Ae(a);C?(C.data.labels=d.labels,C.data.datasets[0].data=d.datasets[0].data,C.update()):o&&window.Chart&&(C=new Chart(o,{type:"line",data:d,options:H("Tasks Completed")}));const r=document.getElementById("today-tasks-list");r&&(r.innerHTML="",a.todayTasks.length===0?r.innerHTML=`
        <div class="empty-state ${i?"stagger-item":""}" style="padding:var(--space-xl);animation-delay:200ms">
          <div class="empty-icon"><i data-lucide="sparkles"></i></div>
          <div class="empty-title">All clear today!</div>
          <div class="empty-desc">No tasks due today. Add one above.</div>
        </div>`:a.todayTasks.forEach((u,p)=>{const c=wt(u,e,()=>X(e,s));i&&(c.classList.add("stagger-item"),c.style.animationDelay=`${200+p*40}ms`),r.appendChild(c)}));const l=document.getElementById("dash-subjects-section");if(l)if(t.length>0){const u={};a.subjectBreakdown.forEach(c=>{u[c.id]=c});let p=`
        <div class="section-header mb-sm" style="margin-top:var(--space-md)">
          <div class="section-title">Subjects</div>
          <button class="btn btn-sm btn-ghost ripple" id="btn-see-subjects">Manage</button>
        </div>
        <div class="subjects-grid" id="subject-summary-grid">
      `;t.slice(0,4).forEach((c,v)=>{const f=u[c.id]||{total:0,completed:0,rate:0};p+=`
          <div class="subject-card ${i?"stagger-item":""}" style="--subject-color:${c.color}; animation-delay:${250+v*40}ms" onclick="window._navTopic('${c.id}', '${x(c.name)}')">
            <div class="subject-name">${x(c.name)}</div>
            <div class="subject-stats">${f.completed}/${f.total} tasks</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${f.rate}%"></div></div>
          </div>
        `}),p+="</div>",l.innerHTML=p,document.getElementById("btn-see-subjects")?.addEventListener("click",()=>T("subjects"))}else l.innerHTML="";window.lucide&&window.lucide.createIcons()}window._navTopic=(e,s)=>T("topics",{subjectId:e,subjectName:s});function wt(e,s,i){const t=document.createElement("div"),a=e.isCompleted,n=e.priority||"medium",o=e.dueDate?.toDate?e.dueDate.toDate():e.dueDate?new Date(e.dueDate):null,d=o&&o<new Date&&!a;return t.className=`task-card priority-${n}${a?" completed":""}`,t.innerHTML=`
    <div class="task-body" style="flex:1;">
      <div class="task-title" style="word-break:break-word;">${x(e.title)}</div>
      <div class="task-meta" style="margin-top:4px;">
        <span class="badge badge-${n}">${n}</span>
        ${o?`<span class="task-due${d?" overdue":""}" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${Pe(o)}</span>`:""}
      </div>
    </div>
    <div class="task-actions" style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
      <button class="btn btn-sm ${a?"btn-secondary":"btn-primary"} task-check-btn" style="min-width:80px; justify-content:center; padding: 6px 12px;">
        <i data-lucide="${a?"rotate-ccw":"check"}" style="width:14px;height:14px;margin-right:4px;"></i> ${a?"Undo":"Done"}
      </button>
      <button class="btn btn-sm btn-danger task-delete-btn" style="padding: 6px 12px;" aria-label="Delete">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
      </button>
    </div>
  `,t.querySelector(".task-check-btn").addEventListener("click",async r=>{r.stopPropagation();const{completeTask:l,reopenTask:u}=await A(async()=>{const{completeTask:p,reopenTask:c}=await Promise.resolve().then(()=>Q);return{completeTask:p,reopenTask:c}},void 0);a?await u(e.id):await l(e.id),i()}),t.querySelector(".task-delete-btn").addEventListener("click",async r=>{if(r.stopPropagation(),!confirm(`Delete "${e.title}"?`))return;const{deleteTask:l}=await A(async()=>{const{deleteTask:u}=await Promise.resolve().then(()=>Q);return{deleteTask:u}},void 0);await l(e.id),i()}),t}function H(e=""){return{responsive:!0,maintainAspectRatio:!0,plugins:{legend:{display:!1},tooltip:{backgroundColor:"#1a1a2e",titleColor:"#f0f0ff",bodyColor:"#a0a0c0",borderColor:"rgba(108,99,255,0.3)",borderWidth:1}},scales:{x:{grid:{color:"rgba(255,255,255,0.05)"},ticks:{color:"#5a5a80"}},y:{grid:{color:"rgba(255,255,255,0.05)"},ticks:{color:"#5a5a80",stepSize:1},beginAtZero:!0}}}}function kt(){const e=new Date().getHours();return e<12?"Good morning,":e<17?"Good afternoon,":"Good evening,"}function x(e=""){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Pe(e){const s=new Date,i=new Date(e);if(i.toDateString()===s.toDateString())return"Today";const t=new Date(s);return t.setDate(s.getDate()+1),i.toDateString()===t.toDateString()?"Tomorrow":i.toLocaleDateString("en-US",{month:"short",day:"numeric"})}const le=["#6c63ff","#ff6b81","#ffa502","#2ed573","#1e90ff","#ff6348","#7bed9f","#eccc68"];async function W(e,s,i){e.innerHTML=`
    <div class="page-header">
      <h1 class="page-title">Subjects</h1>
      <button class="btn btn-primary btn-sm ripple" id="btn-add-subject" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="plus" style="width:16px;height:16px"></i> Add</button>
    </div>
    <div id="subjects-loading" class="animate-pulse text-muted text-sm">Loading…</div>
    <div id="subjects-list" class="hidden"></div>
  `,document.getElementById("btn-add-subject")?.addEventListener("click",()=>Me(s,null,()=>W(e,s,i))),await xt(e,s,i)}async function xt(e,s,i){try{const[t,a,n]=await Promise.all([_(s),G(s),R(s)]);document.getElementById("subjects-loading")?.remove();const o=document.getElementById("subjects-list");if(!o)return;if(o.classList.remove("hidden"),o.innerHTML="",t.length===0){o.innerHTML=`
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="book"></i></div>
          <div class="empty-title">No subjects yet</div>
          <div class="empty-desc">Tap "+ Add" to create your first subject.</div>
        </div>`;return}t.forEach((d,r)=>{const l=a.filter(f=>f.subjectId===d.id),u=n.filter(f=>f.subjectId===d.id),p=u.filter(f=>f.isCompleted).length,c=u.length>0?Math.round(p/u.length*100):0,v=document.createElement("div");v.className="subject-card mb-sm clickable stagger-item",v.style.setProperty("--subject-color",d.color),v.style.animationDelay=`${r*60}ms`,v.innerHTML=`
        <div class="flex justify-between items-center mb-sm">
          <div class="subject-name">${x(d.name)}</div>
          <div class="flex gap-sm">
            <button class="btn-icon btn-edit ripple" style="width:34px;height:34px" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
            <button class="btn-icon btn-delete ripple" style="width:34px;height:34px" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
          </div>
        </div>
        <div class="subject-stats">${l.length} topic${l.length!==1?"s":""} · ${p}/${u.length} tasks done</div>
        <div class="progress-bar mt-sm"><div class="progress-fill" style="width:${c}%"></div></div>
      `,v.addEventListener("click",f=>{f.target.closest(".btn-edit")||f.target.closest(".btn-delete")||T("topics",{subjectId:d.id,subjectName:d.name})}),v.querySelector(".btn-edit").addEventListener("click",f=>{f.stopPropagation(),Me(s,d,()=>W(e,s,i))}),v.querySelector(".btn-delete").addEventListener("click",async f=>{if(f.stopPropagation(),!!await se("Delete Subject",`Delete "${d.name}" and all its topics? Tasks will remain.`,"Delete",!0))try{await we(d.id),b(`"${d.name}" deleted`,"success"),W(e,s,i)}catch(w){b("Failed to delete subject","error"),console.error("Delete subject error:",w)}}),o.appendChild(v)})}catch(t){b("Failed to load subjects","error"),console.error("Load subjects error:",t),document.getElementById("subjects-loading")?.remove();const a=document.getElementById("subjects-list");a&&(a.classList.remove("hidden"),a.innerHTML=`
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="alert-triangle"></i></div>
          <div class="empty-title">Something went wrong</div>
          <div class="empty-desc">Error: ${t.message||"Please check your connection."}</div>
        </div>`)}}async function Me(e,s,i){const t=!!s,a=s?.color||le[0];let n=[];try{n=await _(e)}catch{}const o=document.createElement("div");o.className="modal-backdrop",o.innerHTML=`
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${t?"Edit Subject":"New Subject"}</h3>
      <div class="form-group">
        <label class="form-label">Subject Name</label>
        <input class="form-input" id="sub-name-input" value="${x(s?.name||"")}" placeholder="e.g. Mathematics" />
      </div>
      <div id="sub-modal-err" class="form-error hidden"></div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-row" id="color-row"></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="sub-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="sub-save">
          <span id="sub-save-text">${t?"Save":"Create"}</span>
          <span id="sub-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `;const d=o.querySelector("#color-row");let r=a;le.forEach(l=>{const u=document.createElement("button");u.className="color-swatch"+(l===a?" selected":""),u.style.background=l,u.title=l,u.addEventListener("click",()=>{d.querySelectorAll(".color-swatch").forEach(p=>p.classList.remove("selected")),u.classList.add("selected"),r=l}),d.appendChild(u)}),o.querySelector("#sub-cancel").addEventListener("click",()=>o.remove()),o.addEventListener("click",l=>{l.target===o&&o.remove()}),o.querySelector("#sub-save").addEventListener("click",async()=>{const l=o.querySelector("#sub-name-input").value.trim(),u=o.querySelector("#sub-modal-err"),p=o.querySelector("#sub-save"),c=o.querySelector("#sub-save-text"),v=o.querySelector("#sub-save-spinner");if(!l){u.textContent="Subject name is required.",u.classList.remove("hidden");return}if(n.some(m=>m.name.toLowerCase()===l.toLowerCase()&&(!t||m.id!==s.id))){u.textContent=`A subject named "${l}" already exists.`,u.classList.remove("hidden");return}u.classList.add("hidden"),p.disabled=!0,c.textContent=t?"Saving…":"Creating…",v.classList.remove("hidden");try{t?(await he(s.id,{name:l,color:r}),b("Subject updated!","success")):(await be(e,{name:l,color:r}),b(`"${l}" created!`,"success")),o.remove(),i()}catch(m){p.disabled=!1,c.textContent=t?"Save":"Create",v.classList.add("hidden"),u.textContent="Failed to save. Please try again.",u.classList.remove("hidden"),b("Failed to save subject","error"),console.error("Save subject error:",m)}}),document.body.appendChild(o),setTimeout(()=>o.querySelector("#sub-name-input")?.focus(),150)}async function qe(e,s,i,t){if(!i){T("subjects");return}e.innerHTML=`
    <div class="page-header">
      <div class="flex items-center gap-sm">
        <button class="btn-icon ripple" id="btn-back-subjects" style="background:none;border:none;color:var(--text-primary)"><i data-lucide="arrow-left"></i></button>
        <div>
          <div class="text-muted text-sm">Subject</div>
          <h2 class="page-title" style="font-size:var(--font-size-xl)">${x(t||"Topics")}</h2>
        </div>
      </div>
      <button class="btn btn-primary btn-sm ripple" id="btn-add-topic" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="plus" style="width:16px;height:16px"></i> Topic</button>
    </div>
    <div id="topics-loading" class="animate-pulse text-muted text-sm">Loading…</div>
    <div id="topics-list" class="hidden"></div>
  `,document.getElementById("btn-back-subjects")?.addEventListener("click",()=>T("subjects")),document.getElementById("btn-add-topic")?.addEventListener("click",()=>Be(s,i,null,()=>qe(e,s,i,t))),await Z(e,s,i,t)}async function Z(e,s,i,t){try{const[a,n]=await Promise.all([G(s,i),R(s,{subjectId:i})]);document.getElementById("topics-loading")?.remove();const o=document.getElementById("topics-list");if(!o)return;if(o.classList.remove("hidden"),o.innerHTML="",a.length===0){o.innerHTML=`
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="folder"></i></div>
          <div class="empty-title">No topics yet</div>
          <div class="empty-desc">Tap "+ Topic" to create topics under this subject.</div>
        </div>`;return}a.forEach((d,r)=>{const l=n.filter(f=>f.topicId===d.id),u=l.filter(f=>f.isCompleted).length,p=l.length>0?Math.round(u/l.length*100):0,c=l.length>0&&u===l.length,v=document.createElement("div");v.className="card mb-sm stagger-item",v.style.animationDelay=`${r*40}ms`,v.innerHTML=`
        <div class="flex justify-between items-center mb-sm">
          <div class="flex items-center gap-sm">
            <span style="color:var(--accent)">
              <i data-lucide="${c?"check-circle":"file-text"}" style="width:20px;height:20px"></i>
            </span>
            <div class="font-bold">${x(d.name)}</div>
          </div>
          <div class="flex gap-sm">
            <button class="btn-icon btn-edit ripple" style="width:34px;height:34px" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
            <button class="btn-icon btn-delete ripple" style="width:34px;height:34px" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
          </div>
        </div>
        <div class="text-muted text-sm mb-sm">${u}/${l.length} tasks completed</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p}%"></div></div>
      `,v.querySelector(".btn-edit").addEventListener("click",()=>Be(s,i,d,()=>Z(e,s,i,t))),v.querySelector(".btn-delete").addEventListener("click",async()=>{if(await se("Delete Topic",`Delete topic "${d.name}"?`,"Delete",!0))try{await De(d.id),b("Topic deleted","success"),Z(e,s,i,t)}catch(m){b("Failed to delete topic","error"),console.error("Delete topic error:",m)}}),o.appendChild(v)})}catch(a){b("Failed to load topics","error"),console.error("Load topics error:",a),document.getElementById("topics-loading")?.remove();const n=document.getElementById("topics-list");n&&(n.classList.remove("hidden"),n.innerHTML=`
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="alert-triangle"></i></div>
          <div class="empty-title">Something went wrong</div>
          <div class="empty-desc">Please try again.</div>
        </div>`)}}function Be(e,s,i,t){const a=!!i,n=document.createElement("div");n.className="modal-backdrop",n.innerHTML=`
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${a?"Edit Topic":"New Topic"}</h3>
      <div class="form-group">
        <label class="form-label">Topic Name</label>
        <input class="form-input" id="topic-name-input" value="${x(i?.name||"")}" placeholder="e.g. Chapter 3 - Trigonometry" />
      </div>
      <div id="topic-modal-err" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="topic-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="topic-save">
          <span id="topic-save-text">${a?"Save":"Create"}</span>
          <span id="topic-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `,n.querySelector("#topic-cancel").addEventListener("click",()=>n.remove()),n.addEventListener("click",o=>{o.target===n&&n.remove()}),n.querySelector("#topic-save").addEventListener("click",async()=>{const o=n.querySelector("#topic-name-input").value.trim(),d=n.querySelector("#topic-modal-err"),r=n.querySelector("#topic-save"),l=n.querySelector("#topic-save-text"),u=n.querySelector("#topic-save-spinner");if(!o){d.textContent="Topic name is required.",d.classList.remove("hidden");return}d.classList.add("hidden"),r.disabled=!0,l.textContent=a?"Saving…":"Creating…",u.classList.remove("hidden");try{a?(await xe(i.id,{name:o}),b("Topic updated","success")):(await ke(e,{subjectId:s,name:o}),b("Topic created","success")),n.remove(),t()}catch(p){r.disabled=!1,l.textContent=a?"Save":"Create",u.classList.add("hidden"),d.textContent="Failed to save topic. Try again.",d.classList.remove("hidden"),b("Failed to save topic","error"),console.error("Save topic error:",p)}}),document.body.appendChild(n),setTimeout(()=>n.querySelector("#topic-name-input")?.focus(),150)}const Dt=["high","medium","low"];async function Ne(e,s,i){e.innerHTML=`
    <div class="page-header">
      <h1 class="page-title">All Tasks</h1>
    </div>
    <!-- Filter chips -->
    <div class="filter-bar" id="task-filters">
      <button class="filter-chip active ripple" data-filter="all">All</button>
      <button class="filter-chip ripple" data-filter="today">Today</button>
      <button class="filter-chip ripple" data-filter="pending">Pending</button>
      <button class="filter-chip ripple" data-filter="completed">Completed</button>
      <button class="filter-chip ripple" data-filter="overdue">Overdue</button>
      <button class="filter-chip ripple" data-filter="high"><span class="priority-dot" style="background:var(--error)"></span> High</button>
      <button class="filter-chip ripple" data-filter="medium"><span class="priority-dot" style="background:var(--warning)"></span> Medium</button>
      <button class="filter-chip ripple" data-filter="low"><span class="priority-dot" style="background:var(--success)"></span> Low</button>
    </div>
    <!-- Sort -->
    <div class="flex justify-between items-center mb-md">
      <span class="text-muted text-sm" id="task-count">Loading…</span>
      <select class="form-select" id="task-sort" style="width:auto;padding:8px 36px 8px 12px;font-size:13px">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="due">Due date</option>
        <option value="priority">Priority</option>
      </select>
    </div>
    <div id="tasks-list"></div>
  `;let t="all",a="newest",n=[];const o=async()=>{try{n=await R(s),d()}catch(r){b("Failed to load tasks","error"),console.error("Load tasks error:",r)}},d=()=>{const r=new Date,l=new Date;l.setHours(0,0,0,0);const u=new Date(l);u.setDate(l.getDate()+1);let p=[...n];t==="today"?p=p.filter(m=>{if(!m.dueDate)return!1;const w=m.dueDate.toDate?m.dueDate.toDate():new Date(m.dueDate);return w>=l&&w<u}):t==="pending"?p=p.filter(m=>!m.isCompleted):t==="completed"?p=p.filter(m=>m.isCompleted):t==="overdue"?p=p.filter(m=>m.isCompleted||!m.dueDate?!1:(m.dueDate.toDate?m.dueDate.toDate():new Date(m.dueDate))<r):["high","medium","low"].includes(t)&&(p=p.filter(m=>m.priority===t));const c={high:0,medium:1,low:2};a==="newest"?p.sort((m,w)=>M(w.createdAt)-M(m.createdAt)):a==="oldest"?p.sort((m,w)=>M(m.createdAt)-M(w.createdAt)):a==="due"?p.sort((m,w)=>M(m.dueDate)-M(w.dueDate)):a==="priority"&&p.sort((m,w)=>(c[m.priority]||1)-(c[w.priority]||1));const v=document.getElementById("task-count");v&&(v.textContent=`${p.length} task${p.length!==1?"s":""}`);const f=document.getElementById("tasks-list");if(f){if(f.innerHTML="",p.length===0){f.innerHTML='<div class="empty-state"><div class="empty-icon"><i data-lucide="party-popper"></i></div><div class="empty-title">Nothing here</div><div class="empty-desc">No tasks match this filter.</div></div>';return}p.forEach((m,w)=>{const S=Et(m,s,o);S.classList.add("stagger-item"),S.style.animationDelay=`${w*40}ms`,f.appendChild(S)})}};document.getElementById("task-filters")?.addEventListener("click",r=>{const l=r.target.closest(".filter-chip");l&&(document.querySelectorAll(".filter-chip").forEach(u=>u.classList.remove("active")),l.classList.add("active"),t=l.dataset.filter,d())}),document.getElementById("task-sort")?.addEventListener("change",r=>{a=r.target.value,d()}),await o()}function Et(e,s,i){const t=document.createElement("div"),a=e.isCompleted,n=e.priority||"medium",o=e.dueDate?.toDate?e.dueDate.toDate():e.dueDate?new Date(e.dueDate):null,d=o&&o<new Date&&!a;return t.className=`task-card priority-${n}${a?" completed":""}`,t.style.marginBottom="10px",t.innerHTML=`
    <div class="task-body" style="flex:1;">
      <div class="task-title" style="word-break:break-word;">${x(e.title)}</div>
      ${e.description?`<div class="text-muted text-sm" style="margin:2px 0 4px">${x(e.description)}</div>`:""}
      <div class="task-meta" style="margin-top:4px;">
        <span class="badge badge-${n}">${n}</span>
        ${o?`<span class="task-due${d?" overdue":""}" style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${Pe(o)}</span>`:""}
        ${e.reminderTime?'<span style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="bell" style="width:12px;height:12px"></i> Reminder set</span>':""}
      </div>
    </div>
    <div class="task-actions" style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
      <button class="btn btn-sm ${a?"btn-secondary":"btn-primary"} btn-check ripple" style="min-width:85px; justify-content:center; padding: 6px 12px;">
        <i data-lucide="${a?"rotate-ccw":"check"}" style="width:14px;height:14px;margin-right:4px;"></i> ${a?"Undo":"Done"}
      </button>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-sm btn-secondary btn-edit ripple" style="padding: 6px 12px;" aria-label="Edit">
          <i data-lucide="pencil" style="width:14px;height:14px"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-del ripple" style="padding: 6px 12px;" aria-label="Delete">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i>
        </button>
      </div>
    </div>
  `,t.querySelector(".btn-check").addEventListener("click",async r=>{r.stopPropagation();try{a?(await Te(e.id),b("Task reopened","info")):(t.classList.add("task-completing"),await Le(e.id),b("Task completed! 🎉","success")),setTimeout(()=>i(),a?0:400)}catch(l){b("Failed to update task","error"),console.error("Task check error:",l)}}),t.querySelector(".btn-edit").addEventListener("click",r=>{r.stopPropagation(),_e(s,null,i,e)}),t.querySelector(".btn-del").addEventListener("click",async r=>{if(r.stopPropagation(),!!await se("Delete Task",`Delete "${e.title}"?`,"Delete",!0))try{await $e(e.id),b("Task deleted","success"),i()}catch(u){b("Failed to delete task","error"),console.error("Delete task error:",u)}}),t}async function _e(e,s,i,t=null){const a=!!t,[n,o]=await Promise.all([_(e),G(e)]),d=c=>c?(c.toDate?c.toDate():new Date(c)).toISOString().slice(0,16):"",r=document.createElement("div");r.className="modal-backdrop",r.innerHTML=`
    <div class="drawer" style="max-width:480px;margin:0 auto">
      <div class="drawer-handle"></div>
      <h3 class="modal-title">${a?"Edit Task":"New Task"}</h3>

      <div class="form-group">
        <label class="form-label">Task Title *</label>
        <input class="form-input" id="task-title" value="${x(t?.title||"")}" placeholder="What do you need to do?" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="task-desc" placeholder="Optional details…">${x(t?.description||"")}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <select class="form-select" id="task-subject">
            <option value="">— None —</option>
            ${n.map(c=>`<option value="${c.id}" ${t?.subjectId===c.id?"selected":""}>${x(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="task-priority">
            ${Dt.map(c=>`<option value="${c}" ${(t?.priority||"medium")===c?"selected":""}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Topic</label>
        <select class="form-select" id="task-topic">
          <option value="">— None —</option>
          ${o.map(c=>`<option value="${c.id}" data-sub="${c.subjectId}" ${t?.topicId===c.id?"selected":""}>${x(c.name)}</option>`).join("")}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Due Date</label>
          <input class="form-input" type="datetime-local" id="task-due" value="${d(t?.dueDate)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Reminder</label>
          <input class="form-input" type="datetime-local" id="task-reminder" value="${d(t?.reminderTime)}" />
        </div>
      </div>
      <div id="task-modal-err" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary ripple" id="task-cancel">Cancel</button>
        <button class="btn btn-primary ripple" id="task-save">
          <span id="task-save-text">${a?"Save":"Create Task"}</span>
          <span id="task-save-spinner" class="btn-spinner hidden"></span>
        </button>
      </div>
    </div>
  `;const l=r.querySelector("#task-subject"),u=r.querySelector("#task-topic"),p=()=>{const c=l.value;u.querySelectorAll("option[data-sub]").forEach(v=>{v.hidden=c?v.dataset.sub!==c:!1}),u.selectedOptions[0]?.hidden&&(u.value="")};l.addEventListener("change",p),p(),r.querySelector("#task-cancel").addEventListener("click",()=>r.remove()),r.addEventListener("click",c=>{c.target===r&&r.remove()}),r.querySelector("#task-save").addEventListener("click",async()=>{const c=r.querySelector("#task-title").value.trim(),v=r.querySelector("#task-modal-err"),f=r.querySelector("#task-save"),m=r.querySelector("#task-save-text"),w=r.querySelector("#task-save-spinner");if(!c){v.textContent="Task title is required.",v.classList.remove("hidden");return}v.classList.add("hidden"),f.disabled=!0,m.textContent=a?"Saving…":"Creating…",w.classList.remove("hidden");const S={title:c,description:r.querySelector("#task-desc").value.trim(),subjectId:r.querySelector("#task-subject").value||null,topicId:r.querySelector("#task-topic").value||null,priority:r.querySelector("#task-priority").value||"medium",dueDate:r.querySelector("#task-due").value||null,reminderTime:r.querySelector("#task-reminder").value||null};try{a?(await Se(t.id,S),b("Task updated!","success")):(await Ee(e,S),b("Task created!","success")),r.remove(),i()}catch{f.disabled=!1,m.textContent=a?"Save":"Create Task",w.classList.add("hidden"),v.textContent="Failed to save task. Try again.",v.classList.remove("hidden"),b("Failed to save task","error")}}),document.body.appendChild(r),setTimeout(()=>r.querySelector("#task-title")?.focus(),150)}function M(e){return e?(e.toDate?e.toDate():new Date(e)).getTime():0}const Oe=Object.freeze(Object.defineProperty({__proto__:null,openTaskModal:_e,renderTasks:Ne},Symbol.toStringTag,{value:"Module"}));async function St(e,s,i){e.innerHTML=`
    <div class="page-header">
      <h1 class="page-title">Analytics</h1>
    </div>
    <div id="analytics-loading" class="animate-pulse text-muted text-sm">Crunching the numbers…</div>
    <div id="analytics-content" class="hidden"></div>
  `;const t=await _(s),a=await Ie(s,i?.weekStartDay||"monday",t);document.getElementById("analytics-loading")?.remove();const n=document.getElementById("analytics-content");if(!n||(n.classList.remove("hidden"),n.innerHTML=`
    <div class="streak-banner mb-md">
      <div class="streak-icon"><i data-lucide="flame" style="width:24px;height:24px;color:#ff9f43"></i></div>
      <div>
        <div class="streak-count">${a.streak} day${a.streak!==1?"s":""}</div>
        <div class="text-muted text-sm">Study streak</div>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="stats-row mb-md">
      <div class="stat-card">
        <div class="stat-number">${a.completed}</div>
        <div class="stat-label">Done this week</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${a.completionRate}%</div>
        <div class="stat-label">Completion</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${a.pending}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="${a.overdue>0?"color:var(--error)":""}">${a.overdue}</div>
        <div class="stat-label">Overdue</div>
      </div>
    </div>

    <!-- Weekly line chart -->
    <div class="chart-container mb-md">
      <div class="chart-title">Weekly Completion Trend</div>
      <canvas id="chart-weekly" height="160"></canvas>
    </div>

    <!-- Daily bar chart -->
    <div class="chart-container mb-md">
      <div class="chart-title">Daily Tasks This Week</div>
      <canvas id="chart-daily" height="160"></canvas>
    </div>

    <!-- Subject doughnut -->
    ${t.length>0?`
    <div class="chart-container mb-md">
      <div class="chart-title">Subject Distribution</div>
      <div style="max-width:260px;margin:0 auto">
        <canvas id="chart-subjects" height="260"></canvas>
      </div>
      <div id="subject-legend" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:center"></div>
    </div>
    `:""}

    <!-- Per-subject progress -->
    ${a.subjectBreakdown.length>0?`
    <div class="card mb-md">
      <div class="chart-title mb-md">Subject Progress</div>
      ${a.subjectBreakdown.map(l=>`
        <div style="margin-bottom:14px">
          <div class="flex justify-between mb-sm">
            <span class="font-bold text-sm">${ce(l.name)}</span>
            <span class="text-muted text-sm">${l.completed}/${l.total} · ${l.rate}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${l.rate}%;background:${l.color}"></div>
          </div>
        </div>
      `).join("")}
    </div>
    `:""}
  `,!window.Chart))return;const o=document.getElementById("chart-weekly");o&&new Chart(o,{type:"line",data:Ae(a),options:{...H(),plugins:{...H().plugins,legend:{display:!1}}}});const d=document.getElementById("chart-daily");d&&new Chart(d,{type:"bar",data:yt(a),options:{...H(),plugins:{...H().plugins,legend:{display:!0,labels:{color:"#a0a0c0",font:{size:12}}}}}});const r=document.getElementById("chart-subjects");if(r&&a.subjectBreakdown.length>0){const l=bt(a);new Chart(r,{type:"doughnut",data:l,options:{responsive:!0,plugins:{legend:{display:!1},tooltip:{backgroundColor:"#1a1a2e",titleColor:"#f0f0ff",bodyColor:"#a0a0c0"}},cutout:"65%"}});const u=document.getElementById("subject-legend");u&&a.subjectBreakdown.forEach(p=>{const c=document.createElement("div");c.style.cssText="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)",c.innerHTML=`<span style="width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0"></span>${ce(p.name)}`,u.appendChild(c)})}}function ce(e=""){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}async function Lt(e){if(!j)return console.warn("FCM messaging not supported in this browser/context."),!1;if(!("Notification"in window))return console.warn("Notifications not supported."),!1;if(await Notification.requestPermission()!=="granted")return console.warn("Notification permission denied."),!1;try{const i=await navigator.serviceWorker.ready,t=await ve(j,{vapidKey:fe,serviceWorkerRegistration:i});if(t)return await Ce(e,t),console.log("FCM token saved:",t.substring(0,20)+"..."),t}catch(i){console.error("FCM token error:",i)}return!1}async function Tt(e){if(j)try{const s=await ve(j,{vapidKey:fe});s&&(await it(j),await je(e,s))}catch(s){console.error("Error removing FCM token:",s)}}function $t(e){if(j)return nt(j,s=>{e(s)})}function Ct(){return"Notification"in window&&"serviceWorker"in navigator&&"PushManager"in window}function jt(){return"Notification"in window?Notification.permission:"unsupported"}function It(e,s,i=null){const t=document.createElement("div");t.className="toast-notification",t.innerHTML=`
    <div class="toast-icon">🔔</div>
    <div class="toast-content">
      <div class="toast-title">${e}</div>
      <div class="toast-body">${s}</div>
    </div>
    <button class="toast-close" aria-label="Close">✕</button>
  `,t.querySelector(".toast-close").addEventListener("click",()=>t.remove()),i&&t.addEventListener("click",i),document.body.appendChild(t),setTimeout(()=>t.classList.add("fade-out"),4500),setTimeout(()=>t.remove(),5e3)}async function He(e,s,i,t){const a=i||{},n=Ct(),o=jt();e.innerHTML=`
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
    </div>

    <!-- Profile card -->
    <div class="card mb-md" style="text-align:center;padding:var(--space-xl) var(--space-md)">
      <div style="margin-bottom:var(--space-sm);color:var(--accent)"><i data-lucide="user-circle-2" style="width:52px;height:52px"></i></div>
      <div style="font-size:var(--font-size-xl);font-weight:700">${x(a.displayName||"Student")}</div>
      <div class="text-muted text-sm">${x(a.email||"")}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:var(--space-md)" id="btn-edit-profile">Edit Profile</button>
    </div>

    <!-- Appearance -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Appearance</div>
    <div class="settings-list mb-md">
      <div class="settings-item">
        <span class="settings-item-icon"><i data-lucide="moon" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Dark Mode</span>
        <label class="toggle">
          <input type="checkbox" id="toggle-theme" ${a.theme!=="light"?"checked":""} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Planner Preferences -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Planner</div>
    <div class="settings-list mb-md">
      <div class="settings-item">
        <span class="settings-item-icon"><i data-lucide="calendar" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Week starts on</span>
        <select class="form-select" id="sel-week-start" style="width:auto;padding:6px 32px 6px 10px;font-size:13px;border-radius:8px">
          <option value="monday" ${a.weekStartDay==="monday"?"selected":""}>Monday</option>
          <option value="sunday" ${a.weekStartDay==="sunday"?"selected":""}>Sunday</option>
        </select>
      </div>
        <div class="flex items-center gap-sm w-full justify-between">
          <span class="settings-item-icon"><i data-lucide="target" style="width:18px;height:18px"></i></span>
          <span class="settings-item-label" style="flex:1">Study Goal</span>
        </div>
        <input class="form-input" id="input-goals" style="font-size:13px" placeholder="e.g. Study 3 hours daily" value="${x(a.studyGoals||"")}" />
      </div>
    </div>

    <!-- Notifications -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Notifications</div>
    <div class="settings-list mb-md">
      <div class="settings-item">
        <span class="settings-item-icon"><i data-lucide="bell" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Push Notifications</span>
        <label class="toggle">
          <input type="checkbox" id="toggle-notif" ${a.notificationEnabled?"checked":""} ${n?"":"disabled"} />
          <span class="toggle-slider"></span>
        </label>
      </div>
      ${n?"":`
      <div class="settings-item" style="cursor:default">
        <span class="settings-item-icon"><i data-lucide="info" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label text-muted text-sm">Install app to Home Screen for notifications (iOS 16.4+)</span>
      </div>`}
      ${n&&o==="denied"?`
      <div class="settings-item" style="cursor:default">
        <span class="settings-item-icon"><i data-lucide="alert-triangle" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label text-muted text-sm">Notifications blocked in browser settings. Please allow manually.</span>
      </div>`:""}
    </div>

    <!-- Account -->
    <div class="text-muted text-sm font-bold mb-sm" style="text-transform:uppercase;letter-spacing:.5px">Account</div>
    <div class="settings-list mb-md">
      <div class="settings-item" id="btn-change-pw">
        <span class="settings-item-icon"><i data-lucide="key-round" style="width:18px;height:18px"></i></span>
        <span class="settings-item-label">Change Password</span>
        <span class="settings-item-arrow" style="display:flex;align-items:center"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></span>
      </div>
      <div class="settings-item" id="btn-logout" style="color:var(--error)">
        <span class="settings-item-icon"><i data-lucide="log-out" style="width:18px;height:18px;color:var(--error)"></i></span>
        <span class="settings-item-label" style="color:var(--error)">Sign Out</span>
      </div>
    </div>

    <div class="text-center text-muted text-sm" style="margin:var(--space-xl) 0 var(--space-md)">
      StudyFlow v1.0.0 · Built with Firebase + Vercel
    </div>
    <div id="settings-msg" class="form-error hidden" style="text-align:center;margin-bottom:var(--space-md)"></div>
    <button class="btn btn-primary btn-full" id="btn-save-settings">Save Changes</button>
  `,document.getElementById("toggle-theme")?.addEventListener("change",async d=>{const r=d.target.checked?"dark":"light";Re(r),t.profile={...t.profile,theme:r},await q(s,{theme:r})}),document.getElementById("toggle-notif")?.addEventListener("change",async d=>{if(d.target.checked){const l=!!await Lt(s);d.target.checked=l,t.profile={...t.profile,notificationEnabled:l},await q(s,{notificationEnabled:l})}else await Tt(s),t.profile={...t.profile,notificationEnabled:!1},await q(s,{notificationEnabled:!1})}),document.getElementById("btn-save-settings")?.addEventListener("click",async()=>{const d=document.getElementById("sel-week-start")?.value||"monday",r=document.getElementById("input-goals")?.value?.trim()||"";await q(s,{weekStartDay:d,studyGoals:r}),t.profile={...t.profile,weekStartDay:d,studyGoals:r};const l=document.getElementById("settings-msg");l&&(l.innerHTML='<span style="display:inline-flex;align-items:center;gap:4px"><i data-lucide="check" style="width:16px;height:16px"></i> Settings saved!</span>',l.style.color="var(--success)",l.classList.remove("hidden"),window.lucide&&window.lucide.createIcons(),setTimeout(()=>l.classList.add("hidden"),3e3))}),document.getElementById("btn-edit-profile")?.addEventListener("click",()=>At(s,i,t)),document.getElementById("btn-change-pw")?.addEventListener("click",async()=>{if(i?.email)try{await ge(i.email),b("Password reset email sent! Check your inbox.","success",5e3)}catch{b("Failed to send reset email.","error")}}),document.getElementById("btn-logout")?.addEventListener("click",async()=>{await showConfirmDialog("Sign Out","Are you sure you want to sign out of StudyFlow?","Sign Out",!0)&&await pt()})}function At(e,s,i){const t=document.createElement("div");t.className="modal-backdrop centered",t.innerHTML=`
    <div class="modal-box" style="max-width:400px">
      <h3 class="modal-title">Edit Profile</h3>
      <div class="form-group">
        <label class="form-label">Display Name</label>
        <input class="form-input" id="profile-name" value="${x(s?.displayName||"")}" placeholder="Your name" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="profile-cancel">Cancel</button>
        <button class="btn btn-primary" id="profile-save">Save</button>
      </div>
    </div>
  `,t.querySelector("#profile-cancel").addEventListener("click",()=>t.remove()),t.querySelector("#profile-save").addEventListener("click",async()=>{const a=t.querySelector("#profile-name").value.trim();if(!a)return;await q(e,{displayName:a}),i.profile={...i.profile,displayName:a},t.remove();const{renderSettings:n}=await A(async()=>{const{renderSettings:d}=await Promise.resolve().then(()=>Pt);return{renderSettings:d}},void 0),o=document.getElementById("main-content");o&&n(o,e,i.profile,i)}),document.body.appendChild(t),setTimeout(()=>t.querySelector("#profile-name")?.focus(),100)}const Pt=Object.freeze(Object.defineProperty({__proto__:null,renderSettings:He},Symbol.toStringTag,{value:"Module"})),D={user:null,profile:null,currentPage:"dashboard",selectedSubjectId:null,selectedSubjectName:null},g=e=>document.getElementById(e);function ie(...e){e.forEach(s=>g(s)?.classList.remove("hidden"))}function ne(...e){e.forEach(s=>g(s)?.classList.add("hidden"))}function Fe(){ne("page-auth","page-app"),ie("page-landing")}function ue(){ne("page-landing","page-app"),ie("page-auth")}function Mt(){ne("page-landing","page-auth"),ie("page-app")}function Re(e="dark"){document.documentElement.setAttribute("data-theme",e)}function qt(){document.querySelectorAll(".ripple").forEach(e=>{e.dataset.rippleInit||(e.dataset.rippleInit="true",e.addEventListener("click",function(s){const i=this.getBoundingClientRect(),t=Math.max(i.width,i.height),a=document.createElement("span"),n=t*2;a.style.width=a.style.height=`${n}px`,a.style.left=`${s.clientX-i.left-t}px`,a.style.top=`${s.clientY-i.top-t}px`,a.classList.add("ripple-pulse"),this.appendChild(a),setTimeout(()=>a.remove(),600)}))})}async function T(e,s={}){D.currentPage=e,s.subjectId&&(D.selectedSubjectId=s.subjectId),s.subjectName&&(D.selectedSubjectName=s.subjectName),document.querySelectorAll(".nav-item").forEach(n=>{n.classList.toggle("active",n.dataset.page===e)});const i=g("main-content");if(!i)return;i.innerHTML="";const t=D.user?.uid,a=D.profile;switch(i.classList.remove("fadeSlideUp"),i.offsetWidth,i.classList.add("fadeSlideUp"),e){case"dashboard":await ht(i,t,a);break;case"subjects":await W(i,t,a);break;case"topics":await qe(i,t,s.subjectId||D.selectedSubjectId,s.subjectName||D.selectedSubjectName);break;case"tasks":await Ne(i,t);break;case"analytics":await St(i,t,a);break;case"settings":await He(i,t,a,D);break}qt(),window.lucide&&window.lucide.createIcons()}function Bt(){g("form-login")?.addEventListener("submit",async i=>{i.preventDefault();const t=g("login-error");t.classList.add("hidden");const a=g("btn-login");a.textContent="Signing in…",a.disabled=!0;try{const n=await ut(g("login-email").value.trim(),g("login-password").value);await z(n)}catch(n){t.textContent=K(n.code),t.classList.remove("hidden"),a.textContent="Sign In",a.disabled=!1}}),g("form-signup")?.addEventListener("submit",async i=>{i.preventDefault();const t=g("signup-error");t.classList.add("hidden");const a=g("btn-signup");a.textContent="Creating…",a.disabled=!0;try{const n=await ct(g("signup-email").value.trim(),g("signup-password").value,g("signup-name").value.trim()||"Student");await z(n)}catch(n){t.textContent=K(n.code),t.classList.remove("hidden"),a.textContent="Create Account",a.disabled=!1}}),g("form-forgot")?.addEventListener("submit",async i=>{i.preventDefault();const t=g("forgot-msg");try{await ge(g("forgot-email").value.trim()),t.style.color="var(--success)",t.textContent="✓ Reset link sent! Check your inbox.",t.classList.remove("hidden")}catch(a){t.style.color="var(--error)",t.textContent=K(a.code),t.classList.remove("hidden")}});const e=async()=>{try{const i=await lt();await z(i)}catch(i){console.error("Google Auth Error:",i)}};g("btn-google-login")?.addEventListener("click",e),g("btn-google-signup")?.addEventListener("click",e);const s=i=>{["auth-login","auth-signup","auth-forgot"].forEach(t=>document.getElementById(t)?.classList.toggle("hidden",t!==i))};g("link-to-signup")?.addEventListener("click",i=>{i.preventDefault(),s("auth-signup")}),g("link-to-login")?.addEventListener("click",i=>{i.preventDefault(),s("auth-login")}),g("link-forgot-pw")?.addEventListener("click",i=>{i.preventDefault(),s("auth-forgot")}),g("link-back-to-login")?.addEventListener("click",i=>{i.preventDefault(),s("auth-login")}),document.querySelectorAll(".auth-close-btn").forEach(i=>{i.addEventListener("click",()=>Fe())})}function Nt(){g("btn-get-started")?.addEventListener("click",()=>{ue(),document.getElementById("auth-signup")?.classList.remove("hidden"),document.getElementById("auth-login")?.classList.add("hidden"),document.getElementById("auth-forgot")?.classList.add("hidden")}),g("btn-landing-login")?.addEventListener("click",()=>{ue(),document.getElementById("auth-login")?.classList.remove("hidden"),document.getElementById("auth-signup")?.classList.add("hidden"),document.getElementById("auth-forgot")?.classList.add("hidden")})}function _t(){document.querySelectorAll(".nav-item[data-page]").forEach(e=>{e.addEventListener("click",()=>T(e.dataset.page))})}function Ot(){g("fab-add-task")?.addEventListener("click",async()=>{const{openTaskModal:e}=await A(async()=>{const{openTaskModal:s}=await Promise.resolve().then(()=>Oe);return{openTaskModal:s}},void 0);e(D.user.uid,D.profile,()=>{(D.currentPage==="tasks"||D.currentPage==="dashboard")&&T(D.currentPage)})})}function Ht(){const e=/iphone|ipad|ipod/i.test(navigator.userAgent),s=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===!0;e&&!s&&(localStorage.getItem("sf_install_dismissed")||setTimeout(()=>{const t=g("install-prompt");t&&t.classList.remove("hidden")},3e4)),g("install-prompt-close")?.addEventListener("click",()=>{g("install-prompt")?.classList.add("hidden"),localStorage.setItem("sf_install_dismissed","1")}),window.addEventListener("beforeinstallprompt",i=>{i.preventDefault();const t=g("install-prompt");t&&(t.querySelector(".install-prompt-desc").textContent="Install StudyFlow for the best experience",t.classList.remove("hidden"),t.addEventListener("click",()=>i.prompt(),{once:!0}))})}function Ft(){try{$t(e=>{const s=e.notification?.title||"StudyFlow",i=e.notification?.body||"You have a reminder.";It(s,i)})}catch{}}function K(e){return{"auth/user-not-found":"No account found with that email.","auth/wrong-password":"Incorrect password. Try again.","auth/email-already-in-use":"That email is already registered.","auth/invalid-email":"Please enter a valid email address.","auth/weak-password":"Password must be at least 6 characters.","auth/too-many-requests":"Too many attempts. Please try again later.","auth/network-request-failed":"Network error. Check your connection."}[e]||`Error: ${e}`}async function z(e){D.user=e;const s=await ye(e.uid);if(D.profile=s,Re(s?.theme||"dark"),Mt(),_t(),Ot(),Ft(),new URLSearchParams(window.location.search).get("action")==="add-task"){const{openTaskModal:t}=await A(async()=>{const{openTaskModal:a}=await Promise.resolve().then(()=>Oe);return{openTaskModal:a}},void 0);t(e.uid,s,()=>T("tasks"))}await T("dashboard")}function Rt(){Nt(),Bt(),Ht(),mt(async e=>{e?await z(e):(D.user=null,D.profile=null,Fe())})}Rt();
