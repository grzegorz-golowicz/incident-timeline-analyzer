# Incident Timeline Analyzer

A simple web application for logging, visualizing, and analyzing incident facts on a chronological timeline.

## Features
- Add timestamped incident entries with millisecond precision.
- Choose date/time via picker or enter manually in `yyyy-mm-dd HH:mm:ss.SSS` format.
- Markdown formatting for incident facts (using [Marked](https://github.com/markedjs/marked)).
- Sanitization via [DOMPurify](https://github.com/cure53/DOMPurify).
- Chronological sorting of entries.
- Export/import timeline as JSON.
- Clear timeline with confirmation.
- Optional AI-powered analysis (requires OpenAI API key).

## Tech Stack
- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript
- **Libraries:** Marked.js, DOMPurify
- **Storage:** Browser `localStorage`

## Getting Started
1. Clone this repository:
   ```bash
   git clone <repo-url>
   ```
2. Serve files over a local HTTP server (recommended):
   ```bash
   cd incident-timeline
   python3 -m http.server 8000
   ```
3. Open your browser at `http://localhost:8000`.

### Enable AI Analysis
1. Click **Analyze with AI**.
2. Enter your OpenAI API key.
3. Perform analysis on your timeline entries.

## Usage
- Add entries via the form.
- Use **Export Timeline** to download JSON.
- Use **Import Timeline** to load a saved JSON file.
- Use **Clear Timeline** to reset all entries.

## Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.

## License
This project is licensed under the MIT License.
