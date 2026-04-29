# AI Verification Service

## Run

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The service exposes:
- `GET /health`
- `POST /verify-document`

It uses OCR (`pytesseract`) and lightweight PyTorch-based risk scoring for fraud and duplication signals.
