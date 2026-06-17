from dotenv import load_dotenv
load_dotenv()

from agents.anomaly_detector import detect_anomalies
from agents.rca_agent import analyze_root_cause
from agents.fix_agent import generate_fix
from agents.report_writer import write_report

initial_state = {
    "metrics": {},
    "anomalies": [],
    "root_cause": None,
    "fix_plan": None,
    "report": None,
    "requires_approval": False,
}

state = detect_anomalies(initial_state)
print("Step 1 - Anomalies:", len(state["anomalies"]), "found")

state = analyze_root_cause(state)
print("Step 2 - Root cause generated")

state = generate_fix(state)
print("Step 3 - Fix plan generated, requires_approval:", state["requires_approval"])

state = write_report(state)
print("Step 4 - Report:")
print(state["report"])
print("\nCheck your Slack channel now!")