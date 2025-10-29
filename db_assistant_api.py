import os
import sys
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Ensure localchat/ is importable for dynamic_database_config et al.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCALCHAT_DIR = os.path.join(BASE_DIR, "localchat")
if LOCALCHAT_DIR not in sys.path:
    sys.path.insert(0, LOCALCHAT_DIR)

from three_model_db_assistant import ThreeModelDBAssistant


app = FastAPI(title="ThreeModelDBAssistant API", version="1.0.0")

# Initialize assistant once at startup
assistant = ThreeModelDBAssistant(ollama_base_url=os.environ.get("OLLAMA_BASE_URL"))


def _build_list_preview(columns, rows, limit: int) -> str:
    try:
        from datetime import datetime, date
        try:
            from decimal import Decimal  # type: ignore
        except Exception:
            Decimal = None  # type: ignore
        def _norm(v):
            if v is None:
                return ""
            if Decimal is not None and isinstance(v, Decimal):
                return str(v)
            if isinstance(v, (datetime, date)):
                try:
                    return v.isoformat(sep=" ")
                except Exception:
                    return str(v)
            if isinstance(v, (list, tuple)):
                try:
                    return ", ".join(_norm(x) for x in v)
                except Exception:
                    return str(v)
            return str(v)
        out_lines = ["\nPreview (list):"]
        for idx, r in enumerate(rows[:limit], start=1):
            parts = []
            for i, val in enumerate(r[:min(30, len(r))]):
                col_name = columns[i] if i < len(columns) else f"col{i+1}"
                parts.append(f"{col_name}: { _norm(val) }")
            out_lines.append(f"- {idx}. " + "; ".join(parts))
        if len(rows) > limit:
            out_lines.append(f"\n... ({len(rows) - limit} more rows)")
        return "\n".join(out_lines)
    except Exception:
        return "(Preview unavailable)"


@app.get("/ask")
def ask(q: str = Query(..., description="Natural language question"), preview_rows: int = Query(20, ge=1, le=100)):
    try:
        preview_text = assistant.ask(q, show_sql=False, show_rows=preview_rows, include_json=False, json_only=False)
        download_link: Optional[str] = None
        try:
            is_truncated = len(assistant._last_rows) > preview_rows  # type: ignore[attr-defined]
        except Exception:
            is_truncated = False
        if is_truncated:
            export_path = assistant._export_full_results_to_excel()  # type: ignore[attr-defined]
            if export_path:
                filename = os.path.basename(export_path)
                download_link = f"/downloads/{filename}"
        return {"preview": preview_text, "download_link": download_link}
    except Exception:
        # Fallback path: avoid summarizer/LLM, render a plain list from raw SQL
        try:
            sql = assistant.generate_sql(q)
            cols, rows = assistant.execute_sql(sql)
            # Store full results for export
            assistant._last_columns, assistant._last_rows = cols[:], rows[:]  # type: ignore[attr-defined]
            preview_text = _build_list_preview(cols, rows, preview_rows)
            download_link: Optional[str] = None
            if len(rows) > preview_rows:
                export_path = assistant._export_full_results_to_excel()  # type: ignore[attr-defined]
                if export_path:
                    filename = os.path.basename(export_path)
                    download_link = f"/downloads/{filename}"
            return {"preview": preview_text, "download_link": download_link}
        except Exception as e2:
            return JSONResponse(status_code=500, content={"error": str(e2)})


class AskRequest(BaseModel):
    q: str
    preview_rows: Optional[int] = 20


@app.post("/ask")
def ask_post(payload: AskRequest):
    try:
        preview_rows = payload.preview_rows if payload.preview_rows is not None else 20
        if preview_rows < 1:
            preview_rows = 1
        if preview_rows > 100:
            preview_rows = 100
        preview_text = assistant.ask(payload.q, show_sql=False, show_rows=preview_rows, include_json=False, json_only=False)
        download_link: Optional[str] = None
        try:
            is_truncated = len(assistant._last_rows) > preview_rows  # type: ignore[attr-defined]
        except Exception:
            is_truncated = False
        if is_truncated:
            export_path = assistant._export_full_results_to_excel()  # type: ignore[attr-defined]
            if export_path:
                filename = os.path.basename(export_path)
                download_link = f"/downloads/{filename}"
        return {"preview": preview_text, "download_link": download_link}
    except Exception:
        # Fallback path without summarizer
        try:
            sql = assistant.generate_sql(payload.q)
            cols, rows = assistant.execute_sql(sql)
            assistant._last_columns, assistant._last_rows = cols[:], rows[:]  # type: ignore[attr-defined]
            preview_text = _build_list_preview(cols, rows, preview_rows)
            download_link: Optional[str] = None
            if len(rows) > preview_rows:
                export_path = assistant._export_full_results_to_excel()  # type: ignore[attr-defined]
                if export_path:
                    filename = os.path.basename(export_path)
                    download_link = f"/downloads/{filename}"
            return {"preview": preview_text, "download_link": download_link}
        except Exception as e2:
            return JSONResponse(status_code=500, content={"error": str(e2)})

class AskExplainRequest(BaseModel):
    q: str
    preview_rows: Optional[int] = 20


@app.get("/ask_explain")
def ask_explain(q: str = Query(..., description="Natural language question"), preview_rows: int = Query(20, ge=1, le=100)):
    try:
        result = assistant.ask_explained(q, show_rows=preview_rows)
        # Attach download link if truncated
        download_link: Optional[str] = None
        try:
            is_truncated = len(assistant._last_rows) > preview_rows  # type: ignore[attr-defined]
        except Exception:
            is_truncated = False
        if is_truncated:
            export_path = assistant._export_full_results_to_excel()  # type: ignore[attr-defined]
            if export_path:
                filename = os.path.basename(export_path)
                download_link = f"/downloads/{filename}"
        result["download_link"] = download_link
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/ask_explain")
def ask_explain_post(payload: AskExplainRequest):
    try:
        preview_rows = payload.preview_rows if payload.preview_rows is not None else 20
        if preview_rows < 1:
            preview_rows = 1
        if preview_rows > 100:
            preview_rows = 100
        result = assistant.ask_explained(payload.q, show_rows=preview_rows)
        download_link: Optional[str] = None
        try:
            is_truncated = len(assistant._last_rows) > preview_rows  # type: ignore[attr-defined]
        except Exception:
            is_truncated = False
        if is_truncated:
            export_path = assistant._export_full_results_to_excel()  # type: ignore[attr-defined]
            if export_path:
                filename = os.path.basename(export_path)
                download_link = f"/downloads/{filename}"
        result["download_link"] = download_link
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/downloads/{filename}")
def download_file(filename: str):
    # Only serve from exports directory
    exports_dir = os.path.join(os.getcwd(), "exports")
    file_path = os.path.join(exports_dir, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    # Let FileResponse infer media type; supports .xlsx and .csv
    return FileResponse(path=file_path, filename=filename)


