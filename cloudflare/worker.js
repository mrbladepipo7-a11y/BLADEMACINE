const corsHeaders = {
 "Access-Control-Allow-Origin": "*",
 "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
 "Access-Control-Allow-Headers": "Content-Type,Authorization",
 "Access-Control-Expose-Headers": "Content-Disposition,Content-Length",
 "Content-Type": "application/json; charset=utf-8"
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:corsHeaders});
const fail=(message,status=400)=>json({error:message},status);
const uuid=()=>crypto.randomUUID();
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function hashPassword(password,salt){const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations:100000,hash:"SHA-256"},key,256);return b64(bits)}
async function sha(s){return b64(await crypto.subtle.digest("SHA-256",enc.encode(s)))}
function emailValid(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=254}
function safeUrl(s){try{const u=new URL(s);return ["https:","http:"].includes(u.protocol)}catch{return false}}
async function body(req){try{return await req.json()}catch{return null}}
function admin(req,env){const h=req.headers.get("Authorization")||"";return h.startsWith("Bearer ")&&env.ADMIN_PASSWORD&&h.slice(7)===env.ADMIN_PASSWORD}
function cleanUser(r){return {id:r.id,firstName:r.first_name,lastName:r.last_name,email:r.email,status:r.status,createdAt:r.created_at}}

// All student-only routes use the existing hashed session tokens and approved-user check.
async function student(req,env){
 const auth=req.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer "))return null;
 const tokenHash=await sha(auth.slice(7)),now=Math.floor(Date.now()/1000);
 return await env.DB.prepare("SELECT s.user_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='approved'").bind(tokenHash,now).first();
}
const allowedFiles=new Map([
 [".pdf","application/pdf"],[".doc","application/msword"],
 [".docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
 [".ppt","application/vnd.ms-powerpoint"],
 [".pptx","application/vnd.openxmlformats-officedocument.presentationml.presentation"],
 [".xls","application/vnd.ms-excel"],
 [".xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
 [".txt","text/plain; charset=utf-8"]
]);
function extOf(name){const i=String(name||"").lastIndexOf(".");return i>=0?String(name).slice(i).toLowerCase():""}
function safeFilename(name){return String(name||"material").replace(/[\\r\\n"]/g,"_").replace(/[^\w.\- ა-ჰ]/g,"_").slice(0,150)||"material"}
function fileResponse(bytes,type,name){
 const headers=new Headers({
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"Content-Type,Authorization",
  "Access-Control-Expose-Headers":"Content-Disposition,Content-Length",
  "Content-Type":type||"application/octet-stream",
  "Content-Disposition":'inline; filename="'+safeFilename(name)+'"',
  "X-Content-Type-Options":"nosniff",
  "Cache-Control":"private, no-store"
 });
 return new Response(bytes,{status:200,headers});
}
export default {async fetch(req,env){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
 const url=new URL(req.url),p=url.pathname;
 try{
  if(p==="/"||p==="")return json({status:"API is running"});
  if(p==="/api/health"&&req.method==="GET")return json({ok:true});

  // Registration and login — kept unchanged.
  if(p==="/api/register"&&req.method==="POST"){
   const b=await body(req);if(!b)return fail("მონაცემები არასწორია.");
   const firstName=String(b.firstName||"").trim(),lastName=String(b.lastName||"").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
   if(!firstName||!lastName||firstName.length>80||lastName.length>80)return fail("შეავსე სახელი და გვარი.");
   if(!emailValid(email))return fail("ელფოსტის მისამართი არასწორია.");
   if(password.length<10||password.length>128)return fail("პაროლი უნდა შეიცავდეს 10–128 სიმბოლოს.");
   const exists=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();if(exists)return fail("ამ ელფოსტით ანგარიში უკვე არსებობს. თუ უკვე დარეგისტრირდი, სცადე შესვლა.",409);
   const salt=uuid(),passwordHash=await hashPassword(password,salt);
   await env.DB.prepare("INSERT INTO users(id,first_name,last_name,email,password_hash,password_salt,status) VALUES(?,?,?,?,?,?,'pending')").bind(uuid(),firstName,lastName,email,passwordHash,salt).run();
   return json({message:"მოთხოვნა მიღებულია! დაელოდე ადმინის დადასტურებას."},201)
  }
  if(p==="/api/login"&&req.method==="POST"){
   const b=await body(req);if(!b)return fail("მონაცემები არასწორია.");
   const email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
   const u=await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
   if(!u||await hashPassword(password,u.password_salt)!==u.password_hash)return fail("ელფოსტა ან პაროლი არასწორია.",401);
   if(u.status!=="approved")return fail(u.status==="pending"?"ანგარიში ჯერ ადმინს არ დაუმტკიცებია.":"ამ ანგარიშზე წვდომა უარყოფილია.",403);
   const token=uuid()+uuid(),tokenHash=await sha(token),expires=Math.floor(Date.now()/1000)+60*60*24*14;
   await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").bind(tokenHash,u.id,expires).run();
   return json({token,name:u.first_name+" "+u.last_name})
  }

  if(p==="/api/materials"&&req.method==="GET"){
   const session=await student(req,env);if(!session)return fail("მასალების სანახავად ჯერ უნდა შეხვიდე დამტკიცებული ანგარიშით.",401);
   const rows=await env.DB.prepare("SELECT id,title,url,description,created_at FROM materials ORDER BY created_at DESC").all();
   return json({materials:rows.results||[]})
  }

  // Private uploaded files: only approved users can list or view them.
  if(p==="/api/files"&&req.method==="GET"){
   const session=await student(req,env);if(!session)return fail("მასალების სანახავად ჯერ უნდა შეხვიდე დამტკიცებული ანგარიშით.",401);
   const rows=await env.DB.prepare("SELECT id,title,description,original_name,content_type,size_bytes,created_at FROM study_files ORDER BY created_at DESC").all();
   return json({files:rows.results||[]});
  }
  if(p==="/api/file"&&req.method==="GET"){
   const session=await student(req,env);if(!session)return fail("ფაილის სანახავად საჭიროა დამტკიცებული ანგარიში.",401);
   const id=url.searchParams.get("id");if(!id||id.length>80)return fail("ფაილის ID არასწორია.");
   const meta=await env.DB.prepare("SELECT original_name,content_type,size_bytes FROM study_files WHERE id=?").bind(id).first();
   if(!meta)return fail("ფაილი ვერ მოიძებნა.",404);
   const parts=await env.DB.prepare("SELECT data FROM study_file_chunks WHERE file_id=? ORDER BY chunk_index").bind(id).all();
   const chunks=parts.results||[];const bytes=new Uint8Array(meta.size_bytes);let offset=0;
   for(const part of chunks){const chunk=part.data instanceof ArrayBuffer?new Uint8Array(part.data):new Uint8Array(part.data);bytes.set(chunk,offset);offset+=chunk.length}
   if(offset!==meta.size_bytes)return fail("ფაილის მონაცემები არასრულია.",500);
   return fileResponse(bytes,meta.content_type,meta.original_name);
  }

  if(p.startsWith("/api/admin/")){
   if(!admin(req,env))return fail("ადმინის პაროლი არასწორია.",401);
   if(p==="/api/admin/overview"&&req.method==="GET"){
    const [users,materials,files]=await Promise.all([
     env.DB.prepare("SELECT id,first_name,last_name,email,status,created_at FROM users ORDER BY created_at DESC").all(),
     env.DB.prepare("SELECT id,title,url,description,created_at FROM materials ORDER BY created_at DESC").all(),
     env.DB.prepare("SELECT id,title,description,original_name,content_type,size_bytes,created_at FROM study_files ORDER BY created_at DESC").all()
    ]);
    const us=users.results||[],ms=materials.results||[];
    return json({counts:{pending:us.filter(x=>x.status==="pending").length,approved:us.filter(x=>x.status==="approved").length,rejected:us.filter(x=>x.status==="rejected").length},requests:us.map(cleanUser),materials:ms,files:files.results||[]})
   }
   if(p==="/api/admin/status"&&req.method==="POST"){
    const b=await body(req);if(!b||!b.id||!["pending","approved","rejected"].includes(b.status))return fail("მონაცემები არასწორია.");
    const r=await env.DB.prepare("UPDATE users SET status=? WHERE id=?").bind(b.status,b.id).run();if(!r.meta.changes)return fail("მომხმარებელი ვერ მოიძებნა.",404);return json({ok:true})
   }
   if(p==="/api/admin/material-add"&&req.method==="POST"){
    const b=await body(req),title=String(b?.title||"").trim(),link=String(b?.url||"").trim(),description=String(b?.description||"").trim();
    if(!title||title.length>160||!safeUrl(link)||link.length>1000||description.length>500)return fail("შეამოწმე სათაური, ბმული და აღწერა.");
    await env.DB.prepare("INSERT INTO materials(id,title,url,description) VALUES(?,?,?,?)").bind(uuid(),title,link,description).run();return json({ok:true},201)
   }
   if(p==="/api/admin/material-delete"&&req.method==="POST"){
    const b=await body(req);if(!b?.id)return fail("მასალის ID აკლია.");await env.DB.prepare("DELETE FROM materials WHERE id=?").bind(b.id).run();return json({ok:true})
   }
   if(p==="/api/admin/file-upload"&&req.method==="POST"){
    const form=await req.formData(),file=form.get("file"),title=String(form.get("title")||"").trim(),description=String(form.get("description")||"").trim();
    if(!file||typeof file.arrayBuffer!=="function"||!file.size)return fail("აირჩიე ფაილი.");
    if(!title||title.length>160||description.length>500)return fail("შეამოწმე სათაური და აღწერა.");
    if(file.size>20*1024*1024)return fail("ფაილის მაქსიმალური ზომაა 20 MB.",413);
    const extension=extOf(file.name),contentType=allowedFiles.get(extension);
    if(!contentType)return fail("ამ ტიპის ფაილი დაშვებული არ არის.");
    const bytes=new Uint8Array(await file.arrayBuffer()),id=uuid();
    // Keep each D1 BLOB below 2 MB. Upload is stored privately in the existing D1 database.
    const chunkSize=1536*1024,statements=[];
    statements.push(env.DB.prepare("INSERT INTO study_files(id,title,description,object_key,original_name,content_type,size_bytes) VALUES(?,?,?,?,?,?,?)").bind(id,title,description,id,safeFilename(file.name),contentType,bytes.length));
    for(let offset=0,index=0;offset<bytes.length;offset+=chunkSize,index++){
     const chunk=bytes.slice(offset,Math.min(offset+chunkSize,bytes.length));
     statements.push(env.DB.prepare("INSERT INTO study_file_chunks(file_id,chunk_index,data) VALUES(?,?,?)").bind(id,index,chunk));
    }
    await env.DB.batch(statements);
    return json({ok:true,id},201);
   }
   if(p==="/api/admin/file-delete"&&req.method==="POST"){
    const b=await body(req);if(!b?.id)return fail("ფაილის ID აკლია.");
    await env.DB.prepare("DELETE FROM study_file_chunks WHERE file_id=?").bind(b.id).run();
    await env.DB.prepare("DELETE FROM study_files WHERE id=?").bind(b.id).run();
    return json({ok:true});
   }
   if(p==="/api/admin/quiz-add"&&req.method==="POST"){
    const b=await body(req),title=String(b?.title||"").trim(),description=String(b?.description||"").trim(),questions=b?.questions;
    if(!title||title.length>160||description.length>500||!Array.isArray(questions)||questions.length<1||questions.length>100)return fail("შეამოწმე ქვიზის სათაური და კითხვები.");
    for(const q of questions){
     if(!String(q?.question||"").trim()||String(q.question).length>1000||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some(o=>!String(o).trim()||String(o).length>300)||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>=q.options.length)return fail("ერთ-ერთ კითხვაში პასუხები ან სწორი პასუხის ინდექსი არასწორია.");
    }
    const id=uuid(),statements=[env.DB.prepare("INSERT INTO quizzes(id,title,description,published) VALUES(?,?,?,1)").bind(id,title,description)];
    questions.forEach((q,i)=>statements.push(env.DB.prepare("INSERT INTO quiz_questions(id,quiz_id,question,options_json,correct_index,position) VALUES(?,?,?,?,?,?)").bind(uuid(),id,String(q.question).trim(),JSON.stringify(q.options),q.correctIndex,i)));
    await env.DB.batch(statements);return json({ok:true,id},201);
   }
   return fail("ადმინის მისამართი ვერ მოიძებნა.",404)
  }

  // Quiz routes — correct answers remain server-side.
  if(p==="/api/quizzes"&&req.method==="GET"){
   const session=await student(req,env);if(!session)return fail("ქვიზების სანახავად ჯერ შედი დამტკიცებული ანგარიშით.",401);
   const rows=await env.DB.prepare("SELECT id,title,description FROM quizzes WHERE published=1 ORDER BY created_at DESC").all();
   return json({quizzes:rows.results||[]});
  }
  if(p==="/api/quiz"&&req.method==="GET"){
   const session=await student(req,env);if(!session)return fail("ქვიზის გასახსნელად საჭიროა დამტკიცებული ანგარიში.",401);
   const id=url.searchParams.get("id");if(!id)return fail("ქვიზის ID აკლია.");
   const quiz=await env.DB.prepare("SELECT id,title,description FROM quizzes WHERE id=? AND published=1").bind(id).first();if(!quiz)return fail("ქვიზი ვერ მოიძებნა.",404);
   const qs=await env.DB.prepare("SELECT id,question,options_json,position FROM quiz_questions WHERE quiz_id=? ORDER BY position").bind(id).all();
   return json({quiz:{...quiz,questions:(qs.results||[]).map(q=>({id:q.id,question:q.question,options:JSON.parse(q.options_json)}))}});
  }
  if(p==="/api/quiz/submit"&&req.method==="POST"){
   const session=await student(req,env);if(!session)return fail("პასუხების გასაგზავნად საჭიროა დამტკიცებული ანგარიში.",401);
   const b=await body(req);if(!b||!b.quizId||!Array.isArray(b.answers))return fail("პასუხები არასწორია.");
   const qs=await env.DB.prepare("SELECT id,correct_index FROM quiz_questions WHERE quiz_id=? ORDER BY position").bind(b.quizId).all(),questions=qs.results||[];
   if(!questions.length||b.answers.length!==questions.length)return fail("ქვიზის პასუხების რაოდენობა არ ემთხვევა კითხვებს.");
   let score=0;const answers=b.answers.map((a,i)=>{const n=Number(a);if(!Number.isInteger(n)||n<0||n>5)throw new Error("პასუხის ფორმატი არასწორია.");if(n===questions[i].correct_index)score++;return n});
   await env.DB.prepare("INSERT INTO quiz_attempts(id,quiz_id,user_id,score,total,answers_json) VALUES(?,?,?,?,?,?)").bind(uuid(),b.quizId,session.user_id,score,questions.length,JSON.stringify(answers)).run();
   return json({score,total:questions.length});
  }

  // Personal dashboard — every query is scoped to the authenticated user's ID.
  if(p==="/api/dashboard"&&req.method==="GET"){
   const session=await student(req,env);if(!session)return fail("დეშბორდისთვის ჯერ შედი დამტკიცებული ანგარიშით.",401);
   const rows=await env.DB.prepare("SELECT id,subject,goal,status,created_at FROM dashboard_rows WHERE user_id=? ORDER BY created_at DESC").bind(session.user_id).all();
   return json({rows:rows.results||[]});
  }
  if(p==="/api/dashboard"&&req.method==="POST"){
   const session=await student(req,env);if(!session)return fail("დეშბორდისთვის ჯერ შედი დამტკიცებული ანგარიშით.",401);
   const b=await body(req),subject=String(b?.subject||"").trim(),goal=String(b?.goal||"").trim(),status=String(b?.status||"planned");
   if(!subject||subject.length>100||!goal||goal.length>180||!["planned","progress","done"].includes(status))return fail("შეამოწმე საგანი, მიზანი და სტატუსი.");
   const id=uuid();await env.DB.prepare("INSERT INTO dashboard_rows(id,user_id,subject,goal,status) VALUES(?,?,?,?,?)").bind(id,session.user_id,subject,goal,status).run();
   return json({ok:true,id},201);
  }
  if(p==="/api/dashboard/delete"&&req.method==="POST"){
   const session=await student(req,env);if(!session)return fail("დეშბორდისთვის ჯერ შედი დამტკიცებული ანგარიშით.",401);
   const b=await body(req);if(!b?.id)return fail("ჩანაწერის ID აკლია.");
   await env.DB.prepare("DELETE FROM dashboard_rows WHERE id=? AND user_id=?").bind(b.id,session.user_id).run();
   return json({ok:true});
  }
  return fail("მისამართი ვერ მოიძებნა.",404);
 }catch(err){return fail(err.message||String(err),500)}
}};
