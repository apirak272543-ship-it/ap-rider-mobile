import { createWorkspaceEnvelope } from '../../services/ai-agents.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const q = selector => document.querySelector(selector);
const api = () => window.SupabaseSync;
const isAdmin = () => Boolean(window.Storage?.isAdmin?.());
const currentUserId = () => api()?.session?.()?.user?.id || null;
const labelAgent = key => ({ owner: 'เจ้าของโปรเจกต์', chatgpt: 'ChatGPT', manus: 'Manus', system: 'ระบบ' }[key] || key || 'ไม่ระบุ');
const labelStatus = status => ({ draft: 'ร่าง', queued: 'รอรับงาน', in_progress: 'กำลังทำ', blocked: 'ติดปัญหา', review: 'รอตรวจ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', completed: 'เสร็จแล้ว', cancelled: 'ยกเลิก' }[status] || status);
const labelType = type => ({ instruction: 'คำสั่ง', analysis: 'วิเคราะห์', plan: 'แผนงาน', question: 'คำถาม', result: 'ผลลัพธ์', review: 'ตรวจงาน', approval: 'อนุมัติ', system: 'ระบบ' }[type] || type);
const isoNow = () => new Date().toISOString();

const Workspace = {
  selectedThreadId: null,
  threads: [],
  agents: [],
  async request(path, options = {}) {
    if (!isAdmin()) throw new Error('เฉพาะ Admin เท่านั้นที่เข้าถึง AI Workspace ได้');
    const result = await api().request(path, options);
    return result;
  },
  async post(path, payload) {
    return this.request(path, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  },
  async patch(path, payload) {
    return this.request(path, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  },
  async recordEvent(type, payload = {}, ids = {}) {
    try {
      await this.post('ai_workspace_events', { thread_id: ids.threadId || this.selectedThreadId || null, task_id: ids.taskId || null, message_id: ids.messageId || null, event_type: type, actor_agent_key: 'owner', actor_user_id: currentUserId(), payload });
    } catch (error) { console.warn('บันทึก AI Workspace event ไม่สำเร็จ', error); }
  },
  ensureStyles() {
    if (q('#aiWorkspaceStyles')) return;
    const style = document.createElement('style'); style.id = 'aiWorkspaceStyles'; style.textContent = `
      #admin-ai-workspace .aiw-shell{display:grid;gap:14px}.aiw-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.aiw-header h2{margin:0;font-size:19px}.aiw-header p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.5}.aiw-actions{display:flex;gap:7px;flex-wrap:wrap}.aiw-grid{display:grid;grid-template-columns:minmax(210px,.7fr) minmax(340px,1.5fr) minmax(240px,.8fr);gap:12px;align-items:start}.aiw-card{border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 5px 16px rgba(4,55,50,.05);padding:12px;min-width:0}.aiw-card h3{font-size:14px;margin:0 0 9px}.aiw-card h4{font-size:12px;margin:14px 0 7px}.aiw-muted{color:var(--muted);font-size:11px;line-height:1.5}.aiw-thread{display:block;width:100%;text-align:left;border:1px solid #d9ebe7;background:#f8fdfb;color:var(--ink);border-radius:11px;padding:9px;margin-bottom:6px;cursor:pointer}.aiw-thread.active{border-color:#087d68;background:#eaf8f4;box-shadow:inset 3px 0 #087d68}.aiw-thread strong{display:block;font-size:12px;overflow-wrap:anywhere}.aiw-thread small{display:block;color:var(--muted);font-size:10px;margin-top:3px}.aiw-form{display:grid;gap:7px}.aiw-form input,.aiw-form textarea,.aiw-form select{width:100%;box-sizing:border-box;border:1px solid #cfe4df;border-radius:9px;padding:8px;font:inherit;font-size:12px;background:#fff}.aiw-form textarea{min-height:82px;resize:vertical}.aiw-timeline{max-height:430px;overflow:auto;display:grid;gap:7px}.aiw-message{border:1px solid #e0ece9;border-radius:10px;padding:9px;background:#fbfefd}.aiw-message.owner{border-left:3px solid #087d68}.aiw-message.chatgpt{border-left:3px solid #5b65b8}.aiw-message.manus{border-left:3px solid #c47c16}.aiw-message-head{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--muted)}.aiw-message-body{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:5px;font-size:12px;line-height:1.55}.aiw-task{border:1px solid #e1ece9;border-radius:10px;padding:9px;margin-bottom:7px}.aiw-task-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.aiw-task strong{font-size:12px;overflow-wrap:anywhere}.aiw-task p{margin:5px 0;color:var(--muted);font-size:11px;white-space:pre-wrap;line-height:1.45}.aiw-status{border:0;border-radius:999px;padding:4px 7px;background:#eef6f3;color:#176c5d;font-size:10px;font-weight:800}.aiw-artifact{padding:7px 0;border-bottom:1px solid #edf3f1;font-size:11px;overflow-wrap:anywhere}.aiw-artifact:last-child{border-bottom:0}.aiw-kv{display:grid;grid-template-columns:1fr 1fr;gap:7px}.aiw-kv div{padding:8px;border-radius:9px;background:#f5faf8}.aiw-kv small{display:block;color:var(--muted);font-size:9px}.aiw-kv b{display:block;margin-top:3px;font-size:13px}.aiw-empty{padding:18px 7px;text-align:center;color:var(--muted);font-size:11px}.aiw-warning{padding:10px;border-radius:10px;background:#fff7e5;color:#805c12;font-size:11px;line-height:1.5}.aiw-success{padding:10px;border-radius:10px;background:#eaf8f4;color:#176c5d;font-size:11px;line-height:1.5}@media(max-width:980px){.aiw-grid{grid-template-columns:1fr 1fr}.aiw-grid .aiw-main{grid-column:1/-1;grid-row:1}.aiw-grid .aiw-left{grid-column:1}.aiw-grid .aiw-right{grid-column:2}}@media(max-width:640px){.aiw-grid{grid-template-columns:1fr}.aiw-grid .aiw-main,.aiw-grid .aiw-left,.aiw-grid .aiw-right{grid-column:auto;grid-row:auto}.aiw-timeline{max-height:360px}}
    `; document.head.appendChild(style);
  },
  ensureSection() {
    const tabs = q('#adminTabs'); if (!tabs) return false;
    if (!q('#admin-ai-workspace')) {
      const host = tabs.nextElementSibling; if (!host) return false;
      host.insertAdjacentHTML('beforeend', `<section class="admin-section" id="admin-ai-workspace"><div class="aiw-shell"><div class="aiw-header"><div><h2>AI Collaboration Workspace</h2><p>ศูนย์กลางรับ–ส่งงานระหว่างเจ้าของโปรเจกต์, ChatGPT, Manus และ AI ตัวอื่นในอนาคต</p></div><div class="aiw-actions"><button type="button" class="btn btn-plain btn-small" onclick="refreshAIWorkspace()">รีเฟรช</button><button type="button" class="btn btn-main btn-small" onclick="openAIWorkspaceThreadForm()">สร้างงานใหม่</button></div></div><div class="aiw-warning">พื้นที่นี้เปิดเฉพาะ Admin และเป็น work log จริง การส่งข้อความอัตโนมัติไปยัง ChatGPT หรือ Manus จะทำผ่าน adapter/webhook ที่ได้รับอนุญาตเท่านั้น ระบบไม่เก็บ secret ในข้อความ</div><div class="aiw-grid"><div class="aiw-card aiw-left"><h3>บริบทงาน</h3><div id="aiwThreadList" class="aiw-muted">กำลังโหลด…</div><div id="aiwNewThreadForm" style="display:none;margin-top:10px"><form class="aiw-form" onsubmit="createAIWorkspaceThread(event)"><input id="aiwThreadTitle" required maxlength="160" placeholder="ชื่อบริบท เช่น แก้ระบบรูปภาพร้านค้า" /><textarea id="aiwThreadDescription" maxlength="3000" placeholder="รายละเอียดเป้าหมายของงาน"></textarea><div class="aiw-actions"><button class="btn btn-main btn-small" type="submit">สร้างบริบท</button><button class="btn btn-plain btn-small" type="button" onclick="closeAIWorkspaceThreadForm()">ยกเลิก</button></div></form></div></div><div class="aiw-card aiw-main"><div id="aiwWorkspaceMain"><div class="aiw-empty">เลือกบริบทงานเพื่อดูข้อความและรายการงาน</div></div></div><div class="aiw-card aiw-right"><h3>ตัวแทน AI</h3><div id="aiwAgentList" class="aiw-muted">กำลังโหลด…</div><div id="aiwAdapterStatus" style="margin-top:12px"></div></div></div></div></section>`);
    }
    if (!tabs.querySelector('[data-admin="ai-workspace"]')) tabs.insertAdjacentHTML('beforeend', '<button type="button" data-admin="ai-workspace">AI Workspace</button>');
    const button = tabs.querySelector('[data-admin="ai-workspace"]');
    if (button && !button.dataset.aiwBound) { button.dataset.aiwBound = 'true'; button.addEventListener('click', () => this.activate()); }
    this.ensureStyles(); return true;
  },
  activate() {
    if (!isAdmin()) return window.UI?.toast?.('เฉพาะ Admin เท่านั้นที่เข้าถึง AI Workspace ได้', 'error');
    const button = q('#adminTabs [data-admin="ai-workspace"]');
    q('#adminTabs')?.querySelectorAll('button[data-admin]').forEach(item => item.classList.toggle('active', item === button));
    document.querySelectorAll('#view-admin .admin-section').forEach(section => section.classList.toggle('active', section.id === 'admin-ai-workspace'));
    this.load().catch(error => window.UI?.toast?.(`โหลด AI Workspace ไม่สำเร็จ: ${error.message}`, 'error'));
  },
  async load() {
    this.ensureSection();
    const [threads, agents] = await Promise.all([
      this.request('ai_workspace_threads?select=id,title,description,status,created_at,updated_at&order=updated_at.desc&limit=60'),
      this.request('ai_workspace_agents?select=agent_key,display_name,agent_kind,responsibility,enabled,created_at,updated_at&order=agent_key.asc&limit=30'),
    ]);
    this.threads = Array.isArray(threads) ? threads : []; this.agents = Array.isArray(agents) ? agents : [];
    this.renderThreads(); this.renderAgents();
    if (this.selectedThreadId && !this.threads.some(item => item.id === this.selectedThreadId)) this.selectedThreadId = null;
    if (!this.selectedThreadId && this.threads[0]) this.selectedThreadId = this.threads[0].id;
    if (this.selectedThreadId) await this.loadThread(this.selectedThreadId); else this.renderMainEmpty();
  },
  renderThreads() {
    const host = q('#aiwThreadList'); if (!host) return;
    host.innerHTML = this.threads.length ? this.threads.map(thread => `<button type="button" class="aiw-thread ${thread.id === this.selectedThreadId ? 'active' : ''}" onclick="selectAIWorkspaceThread('${esc(thread.id)}')"><strong>${esc(thread.title)}</strong><small>${esc(thread.status)} · ${new Date(thread.updated_at || thread.created_at).toLocaleString('th-TH')}</small></button>`).join('') : '<div class="aiw-empty">ยังไม่มีบริบทงาน</div>';
  },
  renderAgents() {
    const host = q('#aiwAgentList'); if (!host) return;
    host.innerHTML = this.agents.length ? this.agents.map(agent => `<div class="aiw-artifact"><b>${esc(agent.display_name)}</b><br><small>${esc(agent.responsibility || 'ยังไม่ได้กำหนดหน้าที่')} · ${agent.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</small></div>`).join('') : '<div class="aiw-empty">ยังไม่มีตัวแทน</div>';
    const status = q('#aiwAdapterStatus'); if (status) status.innerHTML = '<div class="aiw-success"><b>Adapter contract พร้อม</b><br>ขณะนี้ใช้ manual inbox/outbox ในหน้าเว็บได้ทันที ส่วน webhook ภายนอกต้องตั้งค่า credential แยกก่อนเปิดใช้จริง</div>';
  },
  renderMainEmpty() { const host = q('#aiwWorkspaceMain'); if (host) host.innerHTML = '<div class="aiw-empty">ยังไม่มีงาน เลือก “สร้างงานใหม่” เพื่อเริ่มบริบทการทำงาน</div>'; },
  async loadThread(threadId) {
    this.selectedThreadId = threadId; this.renderThreads();
    const [threadRows, tasks, messages, artifacts, commits] = await Promise.all([
      this.request(`ai_workspace_threads?id=eq.${encodeURIComponent(threadId)}&select=id,title,description,status,created_at,updated_at&limit=1`),
      this.request(`ai_workspace_tasks?thread_id=eq.${encodeURIComponent(threadId)}&select=id,thread_id,title,description,status,owner_agent_key,commit_sha,created_at,updated_at,completed_at&order=updated_at.desc&limit=100`),
      this.request(`ai_workspace_messages?thread_id=eq.${encodeURIComponent(threadId)}&select=id,thread_id,sender_agent_key,recipient_agent_key,message_type,body,created_at&order=created_at.asc&limit=200`),
      this.request(`ai_workspace_artifacts?thread_id=eq.${encodeURIComponent(threadId)}&select=id,thread_id,artifact_kind,name,storage_path,external_url,mime_type,byte_size,created_at&order=created_at.desc&limit=100`),
      this.request(`ai_workspace_commits?thread_id=eq.${encodeURIComponent(threadId)}&select=id,thread_id,provider,repository,branch,commit_sha,commit_message,commit_url,created_at&order=created_at.desc&limit=100`),
    ]);
    const thread = threadRows?.[0] || this.threads.find(item => item.id === threadId); this.renderMain(thread, tasks || [], messages || [], artifacts || [], commits || []);
  },
  renderMain(thread, tasks, messages, artifacts, commits) {
    const host = q('#aiwWorkspaceMain'); if (!host) return;
    const taskOptions = ['draft','queued','in_progress','blocked','review','approved','rejected','completed','cancelled'];
    const agentOptions = this.agents.filter(item => item.enabled && item.agent_key !== 'system').map(item => `<option value="${esc(item.agent_key)}">${esc(item.display_name)}</option>`).join('');
    host.innerHTML = `<div class="aiw-header"><div><h3>${esc(thread?.title || 'บริบทงาน')}</h3><p class="aiw-muted">${esc(thread?.description || '')}</p></div><div class="aiw-actions"><button type="button" class="btn btn-plain btn-small" onclick="archiveAIWorkspaceThread('${esc(thread?.id || '')}')">เก็บบริบท</button></div></div><div class="aiw-card" style="margin-top:10px;padding:10px;background:#fbfefd"><div class="aiw-kv"><div><small>สถานะบริบท</small><b>${esc(thread?.status || 'open')}</b></div><div><small>ข้อความ</small><b>${messages.length}</b></div></div></div><h4>ข้อความสื่อสาร</h4><div class="aiw-timeline">${messages.length ? messages.map(message => `<article class="aiw-message ${esc(message.sender_agent_key)}"><div class="aiw-message-head"><span><b>${esc(labelAgent(message.sender_agent_key))}</b> → ${esc(labelAgent(message.recipient_agent_key))} · ${esc(labelType(message.message_type))}</span><time>${new Date(message.created_at).toLocaleString('th-TH')}</time></div><div class="aiw-message-body">${esc(message.body)}</div></article>`).join('') : '<div class="aiw-empty">ยังไม่มีข้อความในบริบทนี้</div>'}</div><form class="aiw-form" style="margin-top:10px" onsubmit="sendAIWorkspaceMessage(event)"><div class="aiw-kv"><select id="aiwRecipient"><option value="manus">ส่งให้ Manus</option><option value="chatgpt">ส่งให้ ChatGPT</option><option value="owner">ส่งให้เจ้าของโปรเจกต์</option></select><select id="aiwMessageType"><option value="instruction">คำสั่ง</option><option value="question">คำถาม</option><option value="review">ตรวจงาน</option><option value="approval">อนุมัติ</option></select></div><textarea id="aiwMessageBody" required maxlength="12000" placeholder="เขียนคำสั่งหรือผลวิเคราะห์ที่ต้องเก็บเป็นประวัติงาน"></textarea><button class="btn btn-main btn-small" type="submit">ส่งข้อความและบันทึกประวัติ</button></form><h4>รายการงาน</h4><div>${tasks.length ? tasks.map(task => `<div class="aiw-task"><div class="aiw-task-head"><strong>${esc(task.title)}</strong><select class="aiw-status" aria-label="สถานะงาน" onchange="updateAIWorkspaceTask('${esc(task.id)}', this.value)">${taskOptions.map(option => `<option value="${option}" ${option === task.status ? 'selected' : ''}>${labelStatus(option)}</option>`).join('')}</select></div><p>${esc(task.description || '')}</p><small class="aiw-muted">ผู้รับผิดชอบ: ${esc(labelAgent(task.owner_agent_key))}${task.commit_sha ? ` · commit ${esc(task.commit_sha)}` : ''}</small></div>`).join('') : '<div class="aiw-empty">ยังไม่มีรายการงาน</div>'}</div><form class="aiw-form" style="margin-top:8px" onsubmit="createAIWorkspaceTask(event)"><input id="aiwTaskTitle" required maxlength="160" placeholder="ชื่องานย่อย เช่น ตรวจไฟล์ Store Console" /><textarea id="aiwTaskDescription" maxlength="6000" placeholder="ขอบเขตงานและเกณฑ์ตรวจรับ"></textarea><div class="aiw-kv"><select id="aiwTaskOwner">${agentOptions}</select><select id="aiwTaskStatus"><option value="draft">ร่าง</option><option value="queued">รอรับงาน</option></select></div><button class="btn btn-plain btn-small" type="submit">เพิ่มรายการงาน</button></form><h4>ไฟล์และ Git commits</h4><div>${[...artifacts.map(item => `<div class="aiw-artifact"><b>ไฟล์/หลักฐาน:</b> ${esc(item.name)} ${item.external_url ? `· <a href="${esc(item.external_url)}" target="_blank" rel="noreferrer">เปิดลิงก์</a>` : ''}</div>`), ...commits.map(item => `<div class="aiw-artifact"><b>Git:</b> ${esc(item.repository)} · <code>${esc(item.commit_sha)}</code>${item.commit_url ? ` · <a href="${esc(item.commit_url)}" target="_blank" rel="noreferrer">เปิด commit</a>` : ''}</div>`)].join('') || '<div class="aiw-empty">ยังไม่มีไฟล์หรือ commit ที่ผูกกับงานนี้</div>'}</div><form class="aiw-form" style="margin-top:8px" onsubmit="addAIWorkspaceArtifact(event)"><div class="aiw-kv"><input id="aiwArtifactName" required maxlength="160" placeholder="ชื่อไฟล์/รายงาน/URL" /><input id="aiwArtifactUrl" type="url" placeholder="ลิงก์ภายนอก (ถ้ามี)" /></div><button class="btn btn-plain btn-small" type="submit">บันทึกหลักฐานภายนอก</button></form>`;
  },
  async createThread(event) {
    event.preventDefault(); const title = q('#aiwThreadTitle')?.value.trim(); const description = q('#aiwThreadDescription')?.value.trim() || ''; if (!title) return;
    const rows = await this.post('ai_workspace_threads', { title, description, status: 'open', created_by: currentUserId() }); const thread = rows?.[0]; if (!thread) throw new Error('สร้างบริบทงานไม่สำเร็จ');
    await this.recordEvent('thread_created', { title }); this.selectedThreadId = thread.id; closeAIWorkspaceThreadForm(); q('#aiwThreadTitle').value = ''; q('#aiwThreadDescription').value = ''; await this.load(); window.UI?.toast?.('สร้างบริบท AI Workspace แล้ว', 'success');
  },
  async createTask(event) {
    event.preventDefault(); if (!this.selectedThreadId) return; const title = q('#aiwTaskTitle')?.value.trim(); if (!title) return;
    const rows = await this.post('ai_workspace_tasks', { thread_id: this.selectedThreadId, title, description: q('#aiwTaskDescription')?.value.trim() || '', status: q('#aiwTaskStatus')?.value || 'draft', owner_agent_key: q('#aiwTaskOwner')?.value || 'manus', requested_by: currentUserId() });
    await this.recordEvent('task_created', { title }, { taskId: rows?.[0]?.id }); await this.loadThread(this.selectedThreadId); window.UI?.toast?.('เพิ่มรายการงานแล้ว', 'success');
  },
  async sendMessage(event) {
    event.preventDefault(); if (!this.selectedThreadId) return; const body = q('#aiwMessageBody')?.value.trim(); if (!body) return;
    const recipientAgentKey = q('#aiwRecipient')?.value || 'manus'; const messageType = q('#aiwMessageType')?.value || 'instruction'; const envelope = createWorkspaceEnvelope({ source: 'owner', target: recipientAgentKey, messageType, body, threadId: this.selectedThreadId, metadata: { source: 'admin_web_workspace' } });
    const rows = await this.post('ai_workspace_messages', { thread_id: this.selectedThreadId, sender_agent_key: envelope.source_agent_key, recipient_agent_key: envelope.target_agent_key, sender_user_id: currentUserId(), message_type: envelope.message_type, body: envelope.body, metadata: envelope.metadata });
    await this.recordEvent('message_sent', { recipient_agent_key: recipientAgentKey, message_type: messageType, protocol: envelope.protocol }, { messageId: rows?.[0]?.id }); q('#aiwMessageBody').value = ''; await this.loadThread(this.selectedThreadId); window.UI?.toast?.('ส่งข้อความและบันทึกประวัติแล้ว', 'success');
  },
  async updateTask(id, status) {
    const before = this.selectedThreadId; if (status === 'approved' && !isAdmin()) throw new Error('เฉพาะ Admin เท่านั้นที่อนุมัติได้');
    const payload = { status, approved_by: status === 'approved' ? currentUserId() : null, approved_at: status === 'approved' ? isoNow() : null, completed_at: status === 'completed' ? isoNow() : null };
    await this.patch(`ai_workspace_tasks?id=eq.${encodeURIComponent(id)}`, payload); await this.recordEvent('task_status_changed', { status }, { taskId: id }); await this.loadThread(before); window.UI?.toast?.(`เปลี่ยนสถานะเป็น ${labelStatus(status)} แล้ว`, 'success');
  },
  async addArtifact(event) {
    event.preventDefault(); if (!this.selectedThreadId) return; const name = q('#aiwArtifactName')?.value.trim(); const externalUrl = q('#aiwArtifactUrl')?.value.trim() || null; if (!name || !externalUrl) return window.UI?.toast?.('กรุณาระบุชื่อและลิงก์หลักฐาน', 'warning');
    await this.post('ai_workspace_artifacts', { thread_id: this.selectedThreadId, artifact_kind: 'url', name, external_url: externalUrl, created_by_agent_key: 'owner', created_by_user_id: currentUserId() }); await this.recordEvent('artifact_added', { name, external_url: externalUrl }); q('#aiwArtifactName').value = ''; q('#aiwArtifactUrl').value = ''; await this.loadThread(this.selectedThreadId); window.UI?.toast?.('บันทึกลิงก์หลักฐานแล้ว', 'success');
  },
  async archiveThread(id) { if (!id) return; if (!window.confirm('เก็บบริบทงานนี้หรือไม่')) return; await this.patch(`ai_workspace_threads?id=eq.${encodeURIComponent(id)}`, { status: 'archived' }); await this.recordEvent('thread_archived', {}, { threadId: id }); this.selectedThreadId = null; await this.load(); window.UI?.toast?.('เก็บบริบทงานแล้ว', 'success'); },
};

function selectAIWorkspaceThread(id) { Workspace.loadThread(id).catch(error => window.UI?.toast?.(`โหลดบริบทไม่สำเร็จ: ${error.message}`, 'error')); }
function refreshAIWorkspace() { Workspace.load().catch(error => window.UI?.toast?.(`รีเฟรช Workspace ไม่สำเร็จ: ${error.message}`, 'error')); }
function openAIWorkspaceThreadForm() { const form = q('#aiwNewThreadForm'); if (form) form.style.display = ''; }
function closeAIWorkspaceThreadForm() { const form = q('#aiwNewThreadForm'); if (form) form.style.display = 'none'; }
function createAIWorkspaceThread(event) { return Workspace.createThread(event).catch(error => window.UI?.toast?.(`สร้างบริบทไม่สำเร็จ: ${error.message}`, 'error')); }
function createAIWorkspaceTask(event) { return Workspace.createTask(event).catch(error => window.UI?.toast?.(`เพิ่มงานไม่สำเร็จ: ${error.message}`, 'error')); }
function sendAIWorkspaceMessage(event) { return Workspace.sendMessage(event).catch(error => window.UI?.toast?.(`ส่งข้อความไม่สำเร็จ: ${error.message}`, 'error')); }
function updateAIWorkspaceTask(id, status) { return Workspace.updateTask(id, status).catch(error => window.UI?.toast?.(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`, 'error')); }
function addAIWorkspaceArtifact(event) { return Workspace.addArtifact(event).catch(error => window.UI?.toast?.(`บันทึกหลักฐานไม่สำเร็จ: ${error.message}`, 'error')); }
function archiveAIWorkspaceThread(id) { return Workspace.archiveThread(id).catch(error => window.UI?.toast?.(`เก็บบริบทไม่สำเร็จ: ${error.message}`, 'error')); }

Object.assign(window, { Workspace, selectAIWorkspaceThread, refreshAIWorkspace, openAIWorkspaceThreadForm, closeAIWorkspaceThreadForm, createAIWorkspaceThread, createAIWorkspaceTask, sendAIWorkspaceMessage, updateAIWorkspaceTask, addAIWorkspaceArtifact, archiveAIWorkspaceThread });
window.APServiceModulePages = window.APServiceModulePages || {};
window.APServiceModulePages.adminAIWorkspace = Workspace;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Workspace.ensureSection()); else Workspace.ensureSection();
