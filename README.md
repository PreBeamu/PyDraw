# PyDraw

PSCP Project...
## 👥 Contributors

| Username | Student ID | Name |
|-----------|-------------|---------------------------|
| **PreBeamu** | 68070051 | นายทักษพงศ์ ใจยา |
| **Boy2580**  | 68070071 | นายธีรเมธ ปักโคทานัง |
| **1000Lam**  | 68070044 | นายณัฐพล นินนาท |

## 🚀 Features

- Real-time drawing and sketching on a web canvas.  
- Minimal setup: just run the app and open in your browser.  
- Organized in clear modules: `core`, `models`, `routes`, `sockets`, `static`, `templates`, `utils`.  
- Built with Python for backend logic and HTML/CSS/JavaScript for frontend interactivity.  
- Easy to extend: add new drawing tools, export options, or integrate with other services.

## 🛠️ Tech Stack

- **Backend**: Python (with Flask)  
- **Frontend**: HTML, CSS, JavaScript  
- **Architecture**:  
  - `app.py` — main application entry point  
  - `config.py` — configuration settings  
  - `requirements.txt` — dependencies list  
  - `core/`, `models/`, `routes/`, `sockets/`, `utils/` — modular structure for maintainability  
  - `static/`, `templates/` — frontend assets and HTML templates  

## ✅ Getting Started

### Prerequisites

- Python 3.6+  
- (Optional) Virtual environment  
- Browser (Chrome, Firefox, Edge, etc.)

### Installation & Run

```bash
# Clone the repo
git clone https://github.com/PreBeamu/PyDraw.git
cd PyDraw

# (Optional) Create and activate virtual environment
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
