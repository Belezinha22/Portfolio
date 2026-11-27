import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const config=window.SUPABASE_CONFIG||{};
const configured=config.url?.startsWith('https://')&&!config.url.includes('SEU-PROJETO')&&config.publishableKey&&!config.publishableKey.includes('SUA_CHAVE');
const supabase=configured?createClient(config.url,config.publishableKey):null;
const grid=document.querySelector('#certificate-grid');
const certificateDialog=document.querySelector('#certificate-dialog');
const form=document.querySelector('#certificate-form');
const imageInput=form.elements.image;
const detailDialog=document.querySelector('#detail-dialog');
const loginDialog=document.querySelector('#login-dialog');
let certificates=[];
let activeFilter='todos';
let session=null;
let editingId=null;

function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function formatDate(value){if(!value)return '';const [year,month]=value.split('-');return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(new Date(Number(year),Number(month)-1,1)).replace('.','').toUpperCase()}
function imageUrl(path){return path&&supabase?supabase.storage.from('certificate-images').getPublicUrl(path).data.publicUrl:''}
function showError(id,message){document.querySelector(id).textContent=message}
function setSession(nextSession){
  const userId=nextSession?.user?.id;
  session=nextSession&&userId===config.adminUserId?nextSession:null;
  document.querySelector('#login-button').hidden=Boolean(session);
  document.querySelector('#add-certificate').hidden=!session;
  document.querySelector('#logout-button').hidden=!session;
}
async function loadCertificates(){
  if(!supabase){certificates=[];render();return}
  const {data,error}=await supabase.from('certificates').select('*').order('completed_month',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
  if(error){showError('#no-results','Não foi possível carregar os certificados. Verifique a configuração do Supabase.');return}
  certificates=data||[];render();
}
function render(){
  const query=document.querySelector('#search').value.trim().toLocaleLowerCase('pt-BR');
  const counts={todos:certificates.length,curso:0,evento:0,outro:0};certificates.forEach(item=>counts[item.category]=(counts[item.category]||0)+1);
  document.querySelector('#total-count').textContent=String(certificates.length).padStart(2,'0');
  document.querySelector('#all-count').textContent=String(counts.todos).padStart(2,'0');
  document.querySelector('#course-count').textContent=String(counts.curso).padStart(2,'0');
  document.querySelector('#event-count').textContent=String(counts.evento).padStart(2,'0');
  document.querySelector('#other-count').textContent=String(counts.outro).padStart(2,'0');
  document.querySelectorAll('.filter').forEach(button=>button.classList.toggle('active',button.dataset.filter===activeFilter));
  const shown=certificates.filter(item=>{
    const matchesFilter=activeFilter==='todos'||item.category===activeFilter;
    const haystack=`${item.title} ${item.institution} ${item.note||''}`.toLocaleLowerCase('pt-BR');
    return matchesFilter&&haystack.includes(query);
  });
  grid.innerHTML=shown.map(item=>{
    const category={curso:'Curso',evento:'Evento',outro:'Outro'}[item.category]||'Outro';
    const src=imageUrl(item.image_path);
    const isPdf=item.image_path?.toLowerCase().endsWith('.pdf');
    const visual=isPdf?`<div class="pdf-thumb"><span class="pdf-icon">PDF</span><strong>Certificado digital</strong><small>ABRIR DOCUMENTO ↗</small></div>`:src?`<img src="${escapeHTML(src)}" alt="Imagem do certificado ${escapeHTML(item.title)}">`:`<div class="cert-placeholder"><span class="mini-label">CERTIFICADO DE CONCLUSÃO</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.institution)}</small></div>`;
    const open=item.certificate_url?`<a class="cert-open" href="${escapeHTML(item.certificate_url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir certificado ${escapeHTML(item.title)}">↗</a>`:'';
    const actions=session?`<div class="admin-actions"><button type="button" data-edit="${item.id}">EDITAR</button><button type="button" data-remove="${item.id}">REMOVER</button></div>`:'';
    return `<article class="cert-card" data-detail="${item.id}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHTML(item.title)}"><div class="cert-visual">${visual}<span class="cert-category">${category}</span>${open}</div><div class="cert-info"><div><h3>${escapeHTML(item.title)}</h3><p class="cert-institution">${escapeHTML(item.institution)}</p></div>${item.completed_month?`<span class="cert-date">${formatDate(item.completed_month)}</span>`:''}</div>${item.note?`<p class="cert-note">“${escapeHTML(item.note)}”</p>`:''}${actions}</article>`;
  }).join('');
  document.querySelector('#empty-state').classList.toggle('visible',certificates.length===0);
  document.querySelector('#empty-state [data-open-modal]').hidden=!session;
  document.querySelector('#no-results').classList.toggle('visible',certificates.length>0&&shown.length===0);
}

async function showDetails(id){
  const item=certificates.find(certificate=>certificate.id===id);if(!item)return;
  const category={curso:'Curso',evento:'Evento',outro:'Outro'}[item.category]||'Outro';
  const src=imageUrl(item.image_path);
  const isPdf=item.image_path?.toLowerCase().endsWith('.pdf');
  const image=isPdf?`<div class="detail-pdf-wrap"><iframe class="detail-pdf" src="${escapeHTML(src)}#toolbar=1&navpanes=0" title="Certificado em PDF: ${escapeHTML(item.title)}"></iframe><a class="image-fullscreen" href="${escapeHTML(src)}" target="_blank" rel="noopener noreferrer">ABRIR PDF COMPLETO ↗</a></div>`:src?`<div class="detail-image-wrap"><img class="detail-image" src="${escapeHTML(src)}" alt="Imagem completa do certificado ${escapeHTML(item.title)}"><a class="image-fullscreen" href="${escapeHTML(src)}" target="_blank" rel="noopener noreferrer">ABRIR IMAGEM COMPLETA ↗</a></div>`:`<div class="detail-no-image"><span>IMAGEM NÃO DISPONÍVEL</span><strong>${escapeHTML(item.title)}</strong></div>`;
  document.querySelector('#detail-content').innerHTML=`${image}<section class="detail-info"><div class="eyebrow"><span class="eyebrow-line"></span> DETALHES DA CONQUISTA</div><span class="detail-category">${category}</span><h2>${escapeHTML(item.title)}</h2><dl><div><dt>INSTITUIÇÃO</dt><dd>${escapeHTML(item.institution)}</dd></div><div><dt>CONCLUSÃO</dt><dd>${item.completed_month?formatDate(item.completed_month):'Não informada'}</dd></div><div><dt>CATEGORIA</dt><dd>${category}</dd></div></dl>${item.note?`<p class="detail-note">“${escapeHTML(item.note)}”</p>`:''}${item.certificate_url?`<a class="submit-button detail-link" href="${escapeHTML(item.certificate_url)}" target="_blank" rel="noopener noreferrer">Abrir certificado online <span>↗</span></a>`:''}</section>`;
  if(!detailDialog.open)detailDialog.showModal();
}

function beginEdit(id){
  const item=certificates.find(certificate=>certificate.id===id);if(!item||!session)return;
  editingId=id;form.elements.title.value=item.title;form.elements.institution.value=item.institution;form.elements.category.value=item.category;form.elements.date.value=item.completed_month||'';form.elements.url.value=item.certificate_url||'';form.elements.note.value=item.note||'';imageInput.value='';
  document.querySelector('#certificate-form-title').innerHTML='Editar certificado<span class="period">.</span>';
  certificateDialog.showModal();
}

document.querySelector('#current-year').textContent=`— ${new Date().getFullYear()}`;
document.querySelectorAll('[data-open-modal]').forEach(button=>button.addEventListener('click',()=>{if(session){editingId=null;form.reset();document.querySelector('#certificate-form-title').innerHTML='Adicionar certificado<span class="period">.</span>';showError('#form-error','');certificateDialog.showModal()}}));
document.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',()=>certificateDialog.close()));
certificateDialog.addEventListener('click',event=>{if(event.target===certificateDialog)certificateDialog.close()});
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;render()}));
document.querySelector('#search').addEventListener('input',render);
grid.addEventListener('click',async event=>{
  const remove=event.target.closest('[data-remove]');
  if(remove){event.stopPropagation();if(!session)return;const item=certificates.find(c=>c.id===remove.dataset.remove);if(!item||!confirm(`Remover “${item.title}”?`))return;
    const {error}=await supabase.from('certificates').delete().eq('id',item.id);if(error){alert('Não foi possível remover o certificado.');return}
    if(item.image_path)await supabase.storage.from('certificate-images').remove([item.image_path]);await loadCertificates();return;
  }
  const edit=event.target.closest('[data-edit]');if(edit){event.stopPropagation();beginEdit(edit.dataset.edit);return}
  if(event.target.closest('.cert-open'))return;
  const card=event.target.closest('[data-detail]');if(card)showDetails(card.dataset.detail);
});
grid.addEventListener('keydown',event=>{const card=event.target.closest('[data-detail]');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showDetails(card.dataset.detail)}});
document.querySelector('[data-close-detail]').addEventListener('click',()=>detailDialog.close());
detailDialog.addEventListener('click',event=>{if(event.target===detailDialog)detailDialog.close()});

const uploadArea=form.querySelector('.upload-area');
['dragenter','dragover'].forEach(name=>uploadArea.addEventListener(name,event=>{event.preventDefault();uploadArea.classList.add('drag-over')}));
['dragleave','drop'].forEach(name=>uploadArea.addEventListener(name,event=>{event.preventDefault();uploadArea.classList.remove('drag-over')}));
uploadArea.addEventListener('drop',event=>{const file=event.dataTransfer.files[0];if(file&&(file.type.startsWith('image/')||file.type==='application/pdf')){try{const transfer=new DataTransfer();transfer.items.add(file);imageInput.files=transfer.files}catch{}}});

form.addEventListener('submit',async event=>{
  event.preventDefault();const error=document.querySelector('#form-error');error.textContent='';if(!session||!supabase)return;
  const data=new FormData(form);const file=imageInput.files[0];
  const isPdf=file?.type==='application/pdf';
  if(file&&(!file.type.startsWith('image/')&&!isPdf)){error.textContent='Escolha uma imagem ou um arquivo PDF.';return}
  if(file&&file.size>(isPdf?10:4)*1024*1024){error.textContent=isPdf?'O PDF precisa ter até 10 MB.':'A imagem precisa ter até 4 MB.';return}
  if(!data.get('url')&&!file&&!(editingId&&certificates.find(item=>item.id===editingId)?.image_path)){error.textContent='Adicione o link do certificado ou uma imagem/print.';return}
  const existing=editingId?certificates.find(item=>item.id===editingId):null;
  let imagePath=existing?.image_path||null;
  if(file){const safeName=file.name.toLowerCase().replace(/[^a-z0-9.-]/g,'-');imagePath=`${session.user.id}/${crypto.randomUUID()}-${safeName}`;
    const {error:uploadError}=await supabase.storage.from('certificate-images').upload(imagePath,file,{contentType:file.type,upsert:false});if(uploadError){error.textContent='Não foi possível enviar a imagem. Confira sua conexão e as políticas de acesso.';return}
  }
  const record={title:data.get('title').trim(),institution:data.get('institution').trim(),category:data.get('category'),completed_month:data.get('date')||null,certificate_url:data.get('url').trim()||null,note:data.get('note').trim()||null,image_path:imagePath};
  let result;
  if(existing)result=await supabase.from('certificates').update(record).eq('id',existing.id);
  else result=await supabase.from('certificates').insert(record);
  if(result.error){if(file)await supabase.storage.from('certificate-images').remove([imagePath]);error.textContent='Não foi possível salvar. Confirme se seu usuário está autorizado no Supabase.';return}
  if(file&&existing?.image_path)await supabase.storage.from('certificate-images').remove([existing.image_path]);
  form.reset();editingId=null;certificateDialog.close();activeFilter='todos';document.querySelector('#search').value='';await loadCertificates();
});

document.querySelector('#login-button').addEventListener('click',()=>{showError('#login-error','');loginDialog.showModal()});
document.querySelector('[data-close-login]').addEventListener('click',()=>loginDialog.close());
loginDialog.addEventListener('click',event=>{if(event.target===loginDialog)loginDialog.close()});
document.querySelector('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const data=new FormData(event.currentTarget);const error=document.querySelector('#login-error');error.textContent='';
  if(!supabase){error.textContent='O site ainda não foi conectado ao Supabase. Consulte HOSPEDAGEM.md.';return}
  const {data:result,error:authError}=await supabase.auth.signInWithPassword({email:data.get('email'),password:data.get('password')});
  if(authError){error.textContent='Email ou senha inválidos.';return}
  if(result.user.id!==config.adminUserId){await supabase.auth.signOut();error.textContent='Esta conta não tem permissão de administrador.';return}
  setSession(result);loginDialog.close();await loadCertificates();
});
document.querySelector('#logout-button').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut();setSession(null);await loadCertificates()});

if(supabase){
  supabase.auth.getSession().then(({data})=>{setSession(data.session);loadCertificates()});
  supabase.auth.onAuthStateChange((_event,nextSession)=>{setSession(nextSession);loadCertificates()});
}else{
  document.querySelector('#connection-warning').hidden=false;
  render();
}
