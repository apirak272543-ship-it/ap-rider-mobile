export const AI_AGENT_KEYS = Object.freeze(['owner', 'chatgpt', 'manus']);

export const AI_AGENT_RESPONSIBILITIES = Object.freeze({
  owner: 'สั่งงาน อนุมัติ และตัดสินใจเผยแพร่',
  chatgpt: 'วิเคราะห์ปัญหา วางแผน ตรวจโค้ด และ review',
  manus: 'แก้ไฟล์ รันการทดสอบ เชื่อม GitHub และรายงานผล',
});

export function normalizeAgentKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return key || 'system';
}

export function createWorkspaceEnvelope({ source = 'owner', target = 'manus', messageType = 'instruction', body = '', threadId = null, taskId = null, metadata = {} } = {}) {
  return {
    protocol: 'ap-service-ai-workspace/v1',
    source_agent_key: normalizeAgentKey(source),
    target_agent_key: normalizeAgentKey(target),
    message_type: String(messageType || 'instruction'),
    body: String(body || ''),
    thread_id: threadId,
    task_id: taskId,
    metadata: { ...metadata, created_by: 'ai_workspace_adapter' },
  };
}

export function createAgentAdapter(agentKey) {
  const key = normalizeAgentKey(agentKey);
  return Object.freeze({
    key,
    responsibility: AI_AGENT_RESPONSIBILITIES[key] || 'ตัวแทน AI ที่เพิ่มภายหลัง',
    normalizeInbound(payload) {
      return createWorkspaceEnvelope({ source: payload?.source_agent_key || key, target: payload?.target_agent_key || 'owner', messageType: payload?.message_type || 'result', body: payload?.body || '', threadId: payload?.thread_id || null, taskId: payload?.task_id || null, metadata: payload?.metadata || {} });
    },
    describe() {
      return `${key}: ${AI_AGENT_RESPONSIBILITIES[key] || 'future agent adapter'}`;
    },
    async send() {
      throw new Error(`ยังไม่ได้ตั้งค่า connector สำหรับ ${key}; ใช้ manual inbox/outbox หรือเพิ่ม adapter credential ก่อน`);
    },
  });
}

export const AI_AGENT_ADAPTERS = Object.freeze(Object.fromEntries([...new Set([...AI_AGENT_KEYS, 'system'])].map(key => [key, createAgentAdapter(key)])));

if (typeof window !== 'undefined') {
  window.APServiceModuleServices = window.APServiceModuleServices || {};
  window.APServiceModuleServices.aiAgents = { AI_AGENT_KEYS, AI_AGENT_RESPONSIBILITIES, normalizeAgentKey, createWorkspaceEnvelope, createAgentAdapter, AI_AGENT_ADAPTERS };
}
