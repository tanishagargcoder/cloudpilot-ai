from dotenv import load_dotenv
load_dotenv()

from agents.anomaly_detector import detect_anomalies
from agents.rca_agent import analyze_root_cause
from agents.fix_agent import generate_fix

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
print("\nStep 2 - Root cause:")
print(state["root_cause"])

state = generate_fix(state)
print("\nStep 3 - Suggested fix:")
print(state["fix_plan"])
print("\nRequires approval:", state["requires_approval"])