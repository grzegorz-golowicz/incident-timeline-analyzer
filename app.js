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
