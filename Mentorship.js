/* Externalized JS from Mentorship.html - navigation, chat, profile, persistence */
(function(){
  // Utilities
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const nowISO = () => new Date().toISOString();
  const fmtDate = iso => new Date(iso).toLocaleString();

  // Elements
  const tabs = qsa('.tab');
  const pages = qsa('.page');
  const recentList = qs('#recent-list');
  const statConvos = qs('#stat-convos');
  const statMessages = qs('#stat-messages');
  const messagesDiv = qs('#messages');
  const chatInput = qs('#chat-input');
  const sendBtn = qs('#send-btn');
  const clearChatBtn = qs('#clear-chat-btn');
  const saveChatBtn = qs('#save-chat-btn');
  const currentChatNameEl = qs('#current-chat-name');
  const newChatBtn = qs('#new-chat-btn');
  const qaChat = qs('#qa-chat');
  const qaProfile = qs('#qa-profile');
  const profileForm = qs('#profile-form');
  const saveProfileBtn = qs('#save-profile');
  const profileSavedMsg = qs('#profile-saved');
  const todayEl = qs('#today');
  const sidebarRecent = qs('#sidebar-recent');
  const mentorStyleEl = qs('#mentor-style');

  // Storage keys
  const KEY_CHATS = 'smp_chats_v1';
  const KEY_STYLE = 'smp_style_v1';
  const KEY_PROFILE = 'smp_profile_v1';
  const KEY_CURRENT = 'smp_current_v1';

  // In-memory app state
  let chats = []; // array of {id, name, createdAt, messages: [{role:'user'|'ai', text, ts}]}
  let currentChat = null;
  let profile = {};

  // --- Persistence ---
  function loadState(){
    try{
      const raw = localStorage.getItem(KEY_CHATS);
      chats = raw ? JSON.parse(raw) : [];
    }catch(e){ chats = []; }
    try{
      const rawp = localStorage.getItem(KEY_PROFILE);
      profile = rawp ? JSON.parse(rawp) : {};
    }catch(e){ profile = {}; }
    try{
      const cur = localStorage.getItem(KEY_CURRENT);
      currentChat = cur ? JSON.parse(cur) : null;
    }catch(e){ currentChat = null; }

    // load mentor style (if previously set)
    try{
      const style = localStorage.getItem(KEY_STYLE);
      if(style && mentorStyleEl) mentorStyleEl.value = style;
    }catch(e){}

    // If no current chat, create an untitled one
    if(!currentChat){
      currentChat = createNewChat('Untitled');
    }
  }

  function saveChats(){
    localStorage.setItem(KEY_CHATS, JSON.stringify(chats));
  }
  function saveProfile(){
    localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  }
  function saveCurrent(){
    localStorage.setItem(KEY_CURRENT, JSON.stringify(currentChat));
  }

  // --- Chat helpers ---
  function createNewChat(name){
    const chat = {
      id: 'c_' + Math.random().toString(36).slice(2,9),
      name: name || 'Untitled',
      createdAt: nowISO(),
      messages: []
    };
    // Do not automatically push to saved chats until user saves - but set as current
    currentChat = chat;
    saveCurrent();
    renderChat();
    updateStats();
    return chat;
  }

  function addMessage(chat, role, text){
    const msg = { role, text, ts: nowISO() };
    chat.messages.push(msg);
    saveCurrent();
    renderChat();
    updateStats();
  }

  function saveCurrentToList(){
    // If currentChat has id that exists in chats, overwrite; else push
    const idx = chats.findIndex(c => c.id === currentChat.id);
    if(idx >= 0){
      chats[idx] = currentChat;
    }else{
      // save a copy (so that currentChat can remain editable)
      chats.unshift(JSON.parse(JSON.stringify(currentChat)));
      // keep most recent first
      chats = chats.slice(0, 50); // cap
    }
    saveChats();
    saveCurrent();
    renderRecent();
    updateStats();
    alert('Conversation saved locally.');
  }

  function clearCurrentConversation(){
    currentChat.messages = [];
    currentChat.name = 'Untitled';
    currentChat.createdAt = nowISO();
    saveCurrent();
    renderChat();
    updateStats();
  }

  function loadChatById(id){
    const found = chats.find(c => c.id === id);
    if(found){
      // set current chat to a deep copy of saved to allow edits
      currentChat = JSON.parse(JSON.stringify(found));
      saveCurrent();
      renderChat();
    }
  }

  // --- Rendering ---
  function updateStats(){
    statConvos.textContent = chats.length;
    const totalMsgs = chats.reduce((s,c)=> s + (c.messages ? c.messages.length : 0), 0)
                      + (currentChat && currentChat.messages ? currentChat.messages.length : 0);
    statMessages.textContent = totalMsgs;
  }

  function renderRecent(){
    // Dashboard list (last 5)
    const recent = chats.slice(0,5);
    recentList.innerHTML = '';
    if(recent.length === 0){
      recentList.innerHTML = '<div style="color:var(--muted);padding:12px">No conversations yet — start a chat to save them.</div>';
    }else{
      recent.forEach(c => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `<div>
                            <div style="font-weight:700">${escapeHtml(c.name || 'Untitled')}</div>
                            <small>${fmtDate(c.createdAt)}</small>
                          </div>
                          <div class="small" style="text-align:right">${(c.messages||[]).length} msgs</div>`;
        item.addEventListener('click', () => {
          // when clicked, load into chat page
          loadChatById(c.id);
          showPage('chat');
        });
        recentList.appendChild(item);
      });
    }

    // Sidebar recent
    sidebarRecent.innerHTML = recent.length ? recent.map(c => `${escapeHtml(c.name || 'Untitled')} • ${fmtDate(c.createdAt)}`).join('<br>') : 'No recent chats';
  }

  function renderChat(){
    messagesDiv.innerHTML = '';
    currentChat = currentChat || createNewChat('Untitled');
    currentChat.name = currentChat.name || 'Untitled';
    currentChat.createdAt = currentChat.createdAt || nowISO();
    currentChat.messages = currentChat.messages || [];
    currentChat.messages.forEach(m => {
      const el = document.createElement('div');
      el.className = 'msg ' + (m.role === 'user' ? 'user' : 'ai');
      el.textContent = m.text;
      messagesDiv.appendChild(el);
    });
    currentChatNameEl.textContent = currentChat.name;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    updateStats();
  }

  // --- Navigation ---
  function showPage(name){
    pages.forEach(p => p.classList.toggle('active', p.id === name));
    tabs.forEach(t => {
      const target = t.getAttribute('data-target');
      const active = target === name;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    // smooth focus for chat
    if(name === 'chat'){
      setTimeout(()=>chatInput.focus(), 220);
    }
    // update URL hash
    try{ history.replaceState(null, '', '#'+name); }catch(e){}
  }

  // --- Chat AI simulation (improved persona-aware responses) ---
  function simulateAIAnswer(userText){
    // Build a richer, persona-aware reply using recent context and profile
    const t = userText.trim();
    const lower = t.toLowerCase();

    // collect recent messages as context (last 8)
    const context = (currentChat && currentChat.messages) ? currentChat.messages.slice(-8) : [];

    // determine intent via keywords
    const intents = [
      {k:['fund','raise','investor','seed','pre-seed','series'],id:'funding'},
      {k:['marketing','growth','users','acquisition','channels'],id:'marketing'},
      {k:['legal','contract','term','agreement','nda'],id:'legal'},
      {k:['team','hiring','onboard','hr'],id:'ops'},
      {k:['pricing','revenue','business model','pricing'],id:'pricing'},
      {k:['pitch','deck','investor email','pitch deck'],id:'pitch'}
    ];
    let intent = null;
    for(const it of intents){
      for(const w of it.k){ if(lower.includes(w)){ intent = it.id; break; } }
      if(intent) break;
    }

    // profile hints
    const pname = (profile && (profile.fullname || profile.startup)) ? (profile.fullname ? profile.fullname.split(' ')[0] : profile.startup) : '';
    const pstage = profile && profile.stage ? profile.stage : '';

    // style (tone)
    const style = mentorStyleEl && mentorStyleEl.value ? mentorStyleEl.value : (localStorage.getItem(KEY_STYLE) || 'balanced');

    // helper to add empathetic / direct openers
    function opener(){
      if(style === 'supportive'){
        return pname ? `Thanks ${pname}, I hear you — here’s a friendly breakdown:` : 'Thanks — I hear you. Here’s a friendly breakdown:';
      }
      if(style === 'direct'){
        return pname ? `${pname}, here’s a concise plan:` : 'Here’s a concise plan:';
      }
      if(style === 'investor'){
        return pname ? `${pname}, investor perspective — focus on signal to investors:` : 'Investor perspective — focus on signal to investors:';
      }
      return pname ? `Good question, ${pname}. Here are the key points:` : 'Good question — here are the key points:';
    }

    // core suggestions per intent
    const advice = {
      funding: [
        'Start with a 1-page summary, then a 10-slide deck: problem, solution, market size, traction, team, financials, and ask.',
        'Get 3 pilot customers and quantify metrics (MRR, conversion) before scaling outreach.'
      ],
      marketing: [
        'Pick 2 channels, run 3 experiments each week, measure CAC and retention for each.',
        'Create a 4-week content calendar targeting your top ICP segment.'
      ],
      legal: [
        'Use a simple contractor agreement and an IP assignment clause for early hires/contractors.',
        'Document incorporation and cap table basics; keep records of founder agreements.'
      ],
      ops: [
        'Define the first 3 hires and create onboarding checklists for them.',
        'Track weekly OKRs and run short retros to iterate operations.'
      ],
      pricing: [
        'Run a pricing pilot with 3 customers to test willingness to pay and adjust tiers.',
        'Focus on value metrics (time saved, revenue uplift) when presenting price.'
      ],
      pitch: [
        'I can draft a short investor email or a pitch deck outline — which do you prefer?',
        'Highlight traction, clear market, and an explicit ask (amount + use of funds).' 
      ],
      fallback: [
        'Clarify the one problem you are solving and who you are solving it for.',
        'Design a small experiment to validate assumptions in 2 weeks.'
      ]
    };

    // pick suggestion set
    const set = intent && advice[intent] ? advice[intent] : advice.fallback;

    // choose deterministic variant
    const pick = set[Math.abs(hashCode(lower)) % set.length];

    // build action items depending on style
    let actions = [];
    if(style === 'direct' || style === 'investor'){
      actions = [
        '1) One-sentence value prop',
        '2) Top metric to improve',
        '3) Next experiment (1-week)',
        '4) Decide success criteria'
      ];
    }else{
      actions = [
        '- Write a one-line value proposition',
        '- List top 3 assumptions',
        '- Run one small experiment to test an assumption'
      ];
    }

    // follow-up question
    let follow = '';
    if(intent === 'funding') follow = 'Do you have any traction metrics (revenue, users) I can use to draft a short pitch?';
    else if(intent === 'marketing') follow = 'Who is your ideal customer (one sentence)?';
    else if(intent === 'legal') follow = 'Do you have any existing contracts or IP concerns?';
    else follow = 'Can you share one key metric or constraint to make this more actionable?';

    // combine into final reply
    const lines = [];
    lines.push(opener());
    lines.push(pick + (pstage ? ` (Stage: ${pstage})` : ''));
    lines.push('Suggested next steps:');
    lines.push(actions.join('\n'));
    lines.push('Follow-up: ' + follow);
    // additional contextual note (templates can be generated on request)
    if(intent === 'funding') lines.push('(I can generate a sample pitch or investor email for you on request.)');
    if(intent === 'marketing') lines.push('(I can create a short GTM checklist or content plan for you on request.)');

    return lines.join('\n\n');
  }

  // simple string hash
  function hashCode(str){
    let h=0;
    for(let i=0;i<str.length;i++){h = ((h<<5)-h)+str.charCodeAt(i); h |= 0;}
    return h;
  }

  // send message flow (async, uses real AI when key available)
  async function sendMessage(){
    const text = chatInput.value.trim();
    if(!text) return;

    addMessage(currentChat, 'user', text);
    chatInput.value = '';

    // Show typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'msg ai';
    typingEl.innerHTML = '<em>Mentor is thinking</em> <span class="typing dots"><span></span><span></span><span></span></span>';
    messagesDiv.appendChild(typingEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
      const context = {
        profile: profile,
        history: (currentChat && currentChat.messages) ? currentChat.messages.slice(-6) : []
      };
      const style = mentorStyleEl ? mentorStyleEl.value : (localStorage.getItem(KEY_STYLE) || 'balanced');

      const aiResponse = await getAIMentorResponse(text, context, style);

      typingEl.remove();
      addMessage(currentChat, 'ai', aiResponse);
      saveCurrent();
      renderRecent();

    } catch (error) {
      typingEl.remove();
      console.error(' Mentor AI error:', error);
      addMessage(currentChat, 'ai', "I'm having trouble responding. Please try again.");
    }
  }

  // Async AI helper: tries OpenAI if API key is present (localStorage), otherwise falls back to local simulation
  async function getAIMentorResponse(userText, context = {}, style = 'balanced'){
    // Build a helpful system persona and include recent history
    const storedKey = localStorage.getItem('OPENAI_API_KEY') || localStorage.getItem('smp_openai_key') || null;
    // If no API key available, return local simulation
    if(!storedKey){
      // small delay to simulate thinking
      await new Promise(r => setTimeout(r, 400 + Math.abs(hashCode(userText)) % 800));
      return simulateAIAnswer(userText);
    }

    // Construct messages for the chat API
    const systemPrompt = `You are a startup mentor assistant. Tone: ${style}. Use profile and recent history to provide actionable, concise guidance. If asked, offer templates for emails or pitch decks. Be polite and constructive.`;
    const messages = [{ role: 'system', content: systemPrompt }];

    // include profile summary if available
    if(context.profile){
      messages.push({ role: 'system', content: 'Profile: ' + JSON.stringify(context.profile) });
    }

    // include history as alternating messages
    if(Array.isArray(context.history)){
      context.history.forEach(h => {
        const role = h.role === 'user' ? 'user' : 'assistant';
        messages.push({ role, content: h.text });
      });
    }

    // current user message
    messages.push({ role: 'user', content: userText });

    try{
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + storedKey
        },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages, temperature: 0.6, max_tokens: 600 })
      });
      const data = await resp.json();
      if(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content){
        return data.choices[0].message.content.trim();
      }
      // fallback to local
      return simulateAIAnswer(userText);
    }catch(err){
      console.error('AI request failed', err);
      return simulateAIAnswer(userText);
    }
  }

  // Simple enrichment: if reply mentions "pitch deck" or "email", offer "download" hint
  function enrichReplyWithLinks(reply){
    // We'll append a small suggestion pointing to resources page
    if(/pitch deck|investor|pitch/i.test(reply)){
      return reply + " (I can draft a sample pitch or investor email for you if you'd like.)";
    }
    if(/marketing|channels|growth/i.test(reply)){
      return reply + " (I can create a GTM checklist or content plan on request.)";
    }
    return reply;
  }

  // Escape html
  function escapeHtml(s){
    return String(s).replace(/[&<>\"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m];});
  }

  // --- Profile ---
  function loadProfileToForm(){
    qs('#fullname').value = profile.fullname || '';
    qs('#email').value = profile.email || '';
    qs('#role').value = profile.role || '';
    qs('#startup').value = profile.startup || '';
    qs('#stage').value = profile.stage || '';
    qs('#industry').value = profile.industry || '';
    qs('#description').value = profile.description || '';
    qs('#pref-funding').checked = !!(profile.prefs && profile.prefs.funding);
    qs('#pref-marketing').checked = !!(profile.prefs && profile.prefs.marketing);
    qs('#pref-legal').checked = !!(profile.prefs && profile.prefs.legal);
    qs('#pref-ops').checked = !!(profile.prefs && profile.prefs.ops);
  }

  function saveProfileFromForm(e){
    e && e.preventDefault();
    profile.fullname = qs('#fullname').value.trim();
    profile.email = qs('#email').value.trim();
    profile.role = qs('#role').value.trim();
    profile.startup = qs('#startup').value.trim();
    profile.stage = qs('#stage').value;
    profile.industry = qs('#industry').value.trim();
    profile.description = qs('#description').value.trim();
    profile.prefs = {
      funding: qs('#pref-funding').checked,
      marketing: qs('#pref-marketing').checked,
      legal: qs('#pref-legal').checked,
      ops: qs('#pref-ops').checked
    };
    saveProfile();
    profileSavedMsg.style.display = 'block';
    setTimeout(()=> profileSavedMsg.style.display = 'none', 2200);
  }

  // --- Events binding ---
  function bindEvents(){
    // tabs
    tabs.forEach(t => {
      t.addEventListener('click', ()=> showPage(t.getAttribute('data-target')));
    });

    // mentor style selection persistence
    if(mentorStyleEl){
      mentorStyleEl.addEventListener('change', ()=>{
        try{ localStorage.setItem(KEY_STYLE, mentorStyleEl.value); }catch(e){}
      });
    }

    // quick actions
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
      if(e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });

    clearChatBtn.addEventListener('click', ()=> {
      if(confirm('Clear the current conversation? This will not delete saved copies.')) clearCurrentConversation();
    });
    saveChatBtn.addEventListener('click', ()=> {
      const name = prompt('Name this conversation (optional):', currentChat.name || 'Untitled');
      if(name !== null){
        currentChat.name = name.trim() || 'Untitled';
        currentChat.createdAt = currentChat.createdAt || nowISO();
        saveCurrentToList();
        renderChat();
      }
    });

    newChatBtn.addEventListener('click', ()=> {
      createNewChat('Untitled');
      showPage('chat');
    });

    qaChat.addEventListener('click', ()=> showPage('chat'));
    qaProfile.addEventListener('click', ()=> showPage('profile'));
    document.getElementById('new-chat-btn').addEventListener('click', ()=> { createNewChat('Untitled'); showPage('chat'); });

    // profile
    saveProfileBtn.addEventListener('click', saveProfileFromForm);
    profileForm.addEventListener('submit', saveProfileFromForm);

    // navigation via hash (if present)
    window.addEventListener('hashchange', ()=> {
      const h = location.hash.replace('#','');
      if(h) showPage(h);
    });

  }

  // --- Startup init ---
  function init(){
    loadState();
    bindEvents();
    loadProfileToForm();
    renderRecent();
    renderChat();
    updateStats();
    todayEl.textContent = new Date().toLocaleDateString();
    // show page based on hash
    const h = location.hash.replace('#','');
    if(h && qsa('#' + h).length) showPage(h);
  }

  // small helper to safely set inner text of a message (we keep text content)
  function addMessage(chat, role, text){
    const msgObj = { role, text, ts: nowISO() };
    chat.messages.push(msgObj);
    // Render single message
    const el = document.createElement('div');
    el.className = 'msg ' + (role === 'user' ? 'user' : 'ai');
    el.textContent = text;
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Kick off
  init();
})();
