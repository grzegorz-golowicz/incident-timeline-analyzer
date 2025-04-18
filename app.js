const STORAGE_KEY = 'incident_timeline_entries';

function loadEntries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const arr = JSON.parse(data);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function parseCustomDate(str) {
  // Format: yyyy-mm-dd HH:mm:ss.SSS
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (!m) return NaN;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`).getTime();
}

function sortEntries(entries) {
  return entries.slice().sort((a, b) => {
    const tA = parseCustomDate(a.time);
    const tB = parseCustomDate(b.time);
    if (isNaN(tA) && isNaN(tB)) return 0;
    if (isNaN(tA)) return 1;
    if (isNaN(tB)) return -1;
    return tA - tB;
  });
}

function renderTimeline(entries) {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  if (!entries.length) {
    timeline.innerHTML = '<div class="text-slate-400 text-center mt-6">No entries yet.</div>';
    return;
  }
  entries.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'rounded-lg bg-slate-100 px-6 py-3 shadow flex flex-col gap-1 relative';
    const timeStr = entry.time ? formatTime(entry.time) : '[No time]';
    div.innerHTML = `
      <button class="delete-entry-btn absolute top-2 right-2 text-xs bg-red-500 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center" title="Delete entry" aria-label="Delete entry">&times;</button>
      <div class="font-mono text-slate-500 text-base mb-1">${timeStr}</div>
      <div class="text-slate-800 text-lg prose prose-slate max-w-none">${window.DOMPurify ? DOMPurify.sanitize(marked.parse(entry.fact || '')) : marked.parse(entry.fact || '')}</div>
    `;
    // Add delete handler
    const btn = div.querySelector('.delete-entry-btn');
    btn.addEventListener('click', () => {
      if (window.confirm('Delete this entry?')) {
        let entries = loadEntries();
        // Use time+fact as identifier
        entries = entries.filter(e => !(e.time === entry.time && e.fact === entry.fact));
        saveEntries(entries);
        renderTimeline(entries);
      }
    });
    timeline.appendChild(div);
  });
}

function formatTime(timeStr) {
  // Always show as yyyy-mm-dd HH:mm:ss.SSS (if possible)
  const m = timeStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}\.\d{3})$/);
  if (m) return `${m[1]} ${m[2]}`;
  // fallback: try to parse
  const t = parseCustomDate(timeStr);
  if (!isNaN(t)) {
    const d = new Date(t);
    const pad = n => n.toString().padStart(2, '0');
    const ms = d.getUTCMilliseconds().toString().padStart(3, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${ms}`;
  }
  return timeStr;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(tag) {
    const chars = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    };
    return chars[tag] || tag;
  });
}

// Export/Import functionality
function downloadTimeline() {
  const entries = loadEntries();
  const blob = new Blob([JSON.stringify(entries, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'incident-timeline.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

function triggerImport() {
  document.getElementById('import-file').value = '';
  document.getElementById('import-file').click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data)) throw new Error('Not an array');
      // Optionally validate structure
      saveEntries(data);
      renderTimeline(sortEntries(data));
    } catch (err) {
      alert('Invalid JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Form submission
window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('entry-form');
  const timeInput = document.getElementById('time');
  const errorDiv = document.getElementById('time-error');
  renderTimeline(sortEntries(loadEntries()));

  // Picker sync logic
  const pickerDt = document.getElementById('picker-dt');
  const pickerMs = document.getElementById('picker-ms');

  function pad(n, l=2) { return n.toString().padStart(l, '0'); }
  function toTimeField(dtVal, msVal) {
    if (!dtVal) return '';
    // dtVal: '2025-04-16T14:30:15' or '2025-04-16T14:30'
    const [date, time] = dtVal.split('T');
    if (!date || !time) return '';
    const [h, m, s] = time.split(':');
    const sec = s || '00';
    return `${date} ${pad(h)}:${pad(m)}:${pad(sec)}.${pad(msVal,3)}`;
  }
  function fromTimeField(val) {
    // returns {dt, ms} or null
    const m = val.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
    if (!m) return null;
    return {
      dt: `${m[1]}T${m[2]}:${m[3]}:${m[4]}`,
      ms: m[5]
    };
  }
  pickerDt.addEventListener('change', () => {
    timeInput.value = toTimeField(pickerDt.value, pickerMs.value);
  });
  pickerMs.addEventListener('input', () => {
    timeInput.value = toTimeField(pickerDt.value, pickerMs.value);
  });
  timeInput.addEventListener('input', () => {
    const parsed = fromTimeField(timeInput.value);
    if (parsed) {
      pickerDt.value = parsed.dt;
      pickerMs.value = parsed.ms;
    }
  });
  // On form reset, also reset pickers
  document.getElementById('entry-form').addEventListener('reset', () => {
    pickerDt.value = '';
    pickerMs.value = '0';
  });
  // On page load, set pickers to match time field if possible
  const parsed = fromTimeField(timeInput.value);
  if (parsed) {
    pickerDt.value = parsed.dt;
    pickerMs.value = parsed.ms;
  }

  document.getElementById('export-btn').addEventListener('click', downloadTimeline);
  document.getElementById('import-btn').addEventListener('click', triggerImport);
  document.getElementById('import-file').addEventListener('change', handleImportFile);
  console.log('Attaching clear button handler');
  document.getElementById('clear-btn').addEventListener('click', function() {
    console.log('Clear button clicked!');
    if (window.confirm('Are you sure you want to clear the entire timeline? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      renderTimeline([]);
      document.getElementById('entry-form').reset();
      document.getElementById('time').focus();
      alert('Timeline cleared!');
      console.log('Timeline cleared, reloading page for sync.');
      window.location.reload();
    }
  });

  // AI foldable toggle setup
  const analyzeBtn = document.getElementById('analyze-ai-btn');
  const aiFoldable = document.getElementById('ai-foldable');
  const aiChevron = document.getElementById('ai-chevron');
  const aiGenerateBtn = document.getElementById('ai-generate');
  const aiResult = document.getElementById('ai-result');
  const aiAction = document.getElementById('ai-action');
  const aiKeyInput = document.getElementById('openai-key');

  // Prompts for each action
  const aiPrompts = {
    'quick-summary': 'Give me a quick summary of this incident timeline.',
    'analyze-what-happened': 'Analyze what happened in this incident timeline.',
    'short-explanation-manager': 'Write a short, non-technical explanation for a manager about this incident timeline.',
    'description-documentation': 'Write a detailed description suitable for documentation of this incident timeline.'
  };

  if (aiGenerateBtn && aiResult && aiAction && aiKeyInput) {
    aiGenerateBtn.addEventListener('click', async () => {
      const key = aiKeyInput.value.trim();
      if (!key) {
        aiResult.textContent = 'Please enter your OpenAI API key.';
        return;
      }
      const action = aiAction.value;
      const prompt = aiPrompts[action] || 'Summarize this incident timeline.';
      // Get timeline facts
      const entries = sortEntries(loadEntries());
      if (!entries.length) {
        aiResult.textContent = 'Timeline is empty.';
        return;
      }
      const timelineText = entries.map(e => `- ${e.time}: ${e.fact}`).join('\n');
      const fullPrompt = `${prompt}\n\nTimeline:\n${timelineText}`;
      aiResult.textContent = 'Generating...';
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert incident analyst.' },
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: 512,
            temperature: 0.7
          })
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          aiResult.textContent = error.error?.message || 'OpenAI API error.';
          return;
        }
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || 'No response.';
        aiResult.innerHTML = marked.parse(text);
        // Expand container to fit new content
        if (aiFoldable.classList.contains('open')) {
          aiFoldable.style.maxHeight = aiFoldable.scrollHeight + 'px';
        }
      } catch (err) {
        aiResult.textContent = 'Error: ' + err.message;
      }
    });
  }

  if (analyzeBtn && aiFoldable && aiChevron) {
    analyzeBtn.setAttribute('aria-expanded', 'false');
    analyzeBtn.addEventListener('click', () => {
      const isOpen = aiFoldable.classList.toggle('open');
      aiChevron.classList.toggle('rotated', isOpen);
      // Expand/collapse using inline styles
      if (isOpen) {
        aiFoldable.style.maxHeight = aiFoldable.scrollHeight + 'px';
        aiFoldable.style.paddingBottom = '1rem';
      } else {
        aiFoldable.style.maxHeight = '0';
        aiFoldable.style.paddingBottom = '0';
      }
      analyzeBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const time = timeInput.value.trim();
    const fact = document.getElementById('fact').value.trim();
    const valid = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/.test(time);
    if (!valid) {
      errorDiv.style.display = 'block';
      timeInput.focus();
      return;
    } else {
      errorDiv.style.display = 'none';
    }
    if (!fact) return;
    const newEntry = { time, fact };
    let entries = loadEntries();
    entries.push(newEntry);
    entries = sortEntries(entries);
    saveEntries(entries);
    renderTimeline(entries);
    // Reset form
    form.reset();
    timeInput.focus();
  });
});
