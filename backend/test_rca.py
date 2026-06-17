from dotenv import load_dotenv
load_dotenv()

from agents.anomaly_detector import detect_anomalies
from agents.rca_agent import analyze_root_cause

initial_state = {
    "metrics": {},
    "anomalies": [],
    "root_cause": None,
    "fix_plan": None,
    "report": None,
    "requires_approval": False,
}

state = detect_anomalies(initial_state)
print("Step 1 - Anomalies found:", state["anomalies"])

state = analyze_root_cause(state)
print("\nStep 2 - Root cause analysis:")
print(state["root_cause"])