# -*- coding: utf-8 -*-
"""
Launcher for the Diabetes Risk Prediction API.
Run: python app.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
